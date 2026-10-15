import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {widgetRecord,widgetThumbnail,createWidgetSync,createWidgetLaunch} from '../dist/widget.js';
const place=(id,visited='2026-10-15',photo=null)=>({id,title:id,visited,updatedAt:'2026-10-15T12:00:00Z',photo,category:'Travel',address:'',notes:''});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('widget uses the latest visit, keeps the full journal count and leaves source records intact',async()=>{
 const records=[place('old','2026-10-01'),place('new','2026-10-15','original')],before=structuredClone(records),calls=[];
 const sync=createWidgetSync({plugin:{updateSnapshot:async v=>calls.push(v)},thumbnail:async()=> 'small'});
 await sync.refresh(records);
 assert.deepEqual(calls,[{count:2,record:{id:'new',title:'new',visited:'2026-10-15',sample:false,thumbnail:'small'}}]);
 assert.deepEqual(records,before);assert.equal(widgetRecord([]),null);
});
test('a new snapshot supersedes unfinished thumbnail work and deletions clear the old widget',async()=>{
 const photo=deferred(),calls=[];const sync=createWidgetSync({plugin:{updateSnapshot:async v=>calls.push(v)},thumbnail:()=>photo.promise});
 const pending=sync.refresh([place('deleted',undefined,'large')]);sync.refresh([]);photo.resolve('small');await pending;
 assert.deepEqual(calls,[{count:0,record:null}]);
});
test('serialized native writes finish with the newest committed journal, not a late old snapshot',async()=>{
 const first=deferred(),calls=[];const sync=createWidgetSync({plugin:{updateSnapshot:async v=>{calls.push(v);if(calls.length===1)await first.promise;}}});
 const pending=sync.refresh([place('first')]);sync.refresh([place('second')]);first.resolve();await pending;
 assert.deepEqual(calls.map(v=>v.record.id),['first','second']);
});
test('preview failure replaces the previous record, retries later, and widget failure never rejects a save',async()=>{
 let failPreview=true,failNative=false;const calls=[],statuses=[];
 const sync=createWidgetSync({plugin:{updateSnapshot:async v=>{if(failNative)throw Error('disk');calls.push(v);}},thumbnail:async()=>{if(failPreview)throw Error('decode');return 'small';},onStatus:s=>statuses.push(s)});
 const records=[place('photo',undefined,'original')];await sync.refresh(records);assert.equal(calls[0].record.thumbnail,null);
 failPreview=false;await sync.refresh(records);assert.equal(calls[1].record.thumbnail,'small');
 failNative=true;await assert.doesNotReject(sync.refresh([]));assert.match(statuses.at(-1),/journal is saved/);
 failNative=false;await sync.refresh([]);assert.equal(calls.at(-1).count,0);
});
test('unchanged photos reuse their bounded preview; sample illustrations remain labeled',async()=>{
 let decodes=0;const calls=[];const sync=createWidgetSync({plugin:{updateSnapshot:async v=>calls.push(v)},thumbnail:async s=>{decodes++;return s;}});
 const record={...place('sample'),sampleArt:'coast'};await sync.refresh([record]);await sync.refresh([{...record,title:'edited'}]);
 assert.equal(decodes,1);assert.equal(calls[0].record.sample,true);assert.equal(calls[1].record.title,'edited');
 assert.equal(calls[0].record.thumbnail,'assets/coast.svg');
 assert.equal(createWidgetSync().available,false);await createWidgetSync().refresh([record]);
});
test('thumbnail drawing crops within a fixed size and never encodes an original-size bitmap',async()=>{
 let canvas,draw,format;
 class ImageClass{naturalWidth=1200;naturalHeight=2400;set src(value){this.source=value;queueMicrotask(()=>this.onload());}}
 const result=await widgetThumbnail('original',{ImageClass,document:{createElement(){return canvas={getContext(){return {fillRect(){},drawImage(...args){draw=args;}};},toDataURL(...args){format=args;return 'preview';}};}}});
 assert.equal(result,'preview');assert.equal(canvas.width,384);assert.equal(canvas.height,240);assert.equal(draw[3],384);assert.equal(draw[4],768);assert.equal(draw[2],-264);assert.deepEqual(format,['image/jpeg',.8]);
 assert.equal(await widgetThumbnail(null),null);
});
function launchFixture(initial={action:'open',id:'saved'}){
 let event,available=initial,blocked=false;const opened=[],errors=[];
 const plugin={addListener:async(name,fn)=>{assert.equal(name,'launchAvailable');event=fn;return {remove:async()=>{event=null;}};},takeLaunchAction:async()=>{const next=available;available={};return next;}};
 const controller=createWidgetLaunch({plugin,canOpen:()=>!blocked,openFootprint:id=>opened.push(id),newFootprint:()=>opened.push('new'),openJournal:()=>opened.push('journal'),onError:m=>errors.push(m)});
 return {controller,opened,errors,block:v=>blocked=v,fire:async action=>{available=action;await event();}};
}
test('cold and warm widget launches consume one action each and repeated startup does not replay it',async()=>{
 const f=launchFixture();await f.controller.start();await f.controller.start();assert.deepEqual(f.opened,['saved']);
 await f.fire({action:'new'});await f.fire({action:'journal'});assert.deepEqual(f.opened,['saved','new','journal']);
 await f.fire({action:'open',id:'../invalid'});await f.fire({action:'delete',id:'saved'});assert.equal(f.opened.length,3);
});
test('widget shortcuts wait for an open editor/transfer to close, keeping its unsaved state intact',async()=>{
 const f=launchFixture();f.block(true);await f.controller.start();assert.deepEqual(f.opened,[]);
 f.controller.flush();assert.deepEqual(f.opened,[]);f.block(false);f.controller.flush();f.controller.flush();assert.deepEqual(f.opened,['saved']);
 f.block(true);await f.fire({action:'new'});await f.fire({action:'open',id:'latest'});f.block(false);f.controller.flush();assert.deepEqual(f.opened,['saved','latest']);
});
test('a widget request racing native action consumption is drained once the first read ends',async()=>{
 const first=deferred(),opened=[];let listener,calls=0;
 const plugin={addListener:async(n,fn)=>{listener=fn;},takeLaunchAction:()=>++calls===1?first.promise:Promise.resolve({action:'new'})};
 const controller=createWidgetLaunch({plugin,openFootprint:id=>opened.push(id),newFootprint:()=>opened.push('new')});
 const startup=controller.start();await Promise.resolve();await listener();first.resolve({action:'open',id:'saved'});await startup;
 assert.deepEqual(opened,['saved','new']);
});
test('app mirrors only completed journal writes; a failed database transaction never changes the widget',async()=>{
 const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');const calls=[];let fail=true;
 const context=vm.createContext({withoutStarterSamples:r=>r,storageReady:true,settings:{theme:'paper'},records:[],dbPut:async()=>{if(fail)throw Error('disk');},applyTheme(){},render(){},widgetSync:{refresh:r=>calls.push(r)}});
 vm.runInContext(app.slice(app.indexOf('async function commit('),app.indexOf('const widgetPlugin=')),context);
 await assert.rejects(context.commit([place('lost')]),/disk/);assert.deepEqual(calls,[]);
 fail=false;await context.commit([place('saved')]);assert.equal(calls[0][0].id,'saved');
});
