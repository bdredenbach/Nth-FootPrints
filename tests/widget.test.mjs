import {placeView,latestVisited} from '../dist/visits.js';
import {validateJourneys,reconcileJourneys} from '../dist/journeys.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {widgetRecord,widgetThumbnail,createWidgetSync,createWidgetLaunch,createWidgetPreferences} from '../dist/widget.js';
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
 const context=vm.createContext({journeys:[],validateJourneys,reconcileJourneys,withoutStarterSamples:r=>r,storageReady:true,settings:{theme:'paper'},records:[],dbPut:async()=>{if(fail)throw Error('disk');},applyTheme(){},render(){},widgetSync:{refresh:r=>calls.push(r)}});
 vm.runInContext(app.slice(app.indexOf('async function commit('),app.indexOf('const widgetPlugin=')),context);
 await assert.rejects(context.commit([place('lost')]),/disk/);assert.deepEqual(calls,[]);
 fail=false;await context.commit([place('saved')]);assert.equal(calls[0][0].id,'saved');
});

test('independent widgets mirror latest and unique pinned footprints only, without changing originals',async()=>{
 const records=[place('latest',undefined,'new-image'),place('old','2026-10-01','old-image'),place('unused','2026-09-01','unused-image')],before=structuredClone(records),calls=[],decoded=[];
 const sync=createWidgetSync({plugin:{getWidgets:async()=>({widgets:[{widgetId:10,recordId:'old'},{widgetId:20,recordId:null},{widgetId:30,recordId:'old'}]}),updateSnapshot:async s=>calls.push(s)},thumbnail:async s=>{decoded.push(s);return 'preview:'+s;}});
 await sync.refresh(records);assert.deepEqual(decoded,['new-image','old-image']);assert.deepEqual(calls[0].records.map(r=>r.id),['latest','old']);assert.equal(calls[0].record.id,'latest');assert.equal(calls[0].count,3);assert.deepEqual(records,before);
});
test('pinned footprints remain chosen when newer visits arrive and cover changes refresh only changed previews',async()=>{
 const calls=[],decoded=[];const sync=createWidgetSync({plugin:{getWidgets:async()=>({widgets:[{widgetId:1,recordId:'pinned'}]}),updateSnapshot:async s=>calls.push(s)},thumbnail:async s=>{decoded.push(s);return 'preview:'+s;}});
 const pin=place('pinned','2026-09-01','original');await sync.refresh([pin]);await sync.refresh([pin,place('new',undefined,'new')]);await sync.refresh([{...pin,photo:'cover-2'},place('new',undefined,'new')]);
 assert.equal(calls[1].record.id,'new');assert.equal(calls[1].records.find(r=>r.id==='pinned').thumbnail,'preview:original');assert.equal(calls[2].records.find(r=>r.id==='pinned').thumbnail,'preview:cover-2');assert.deepEqual(decoded,['original','new','cover-2']);
});
test('deletion clears a pinned preview without substituting latest, and restore makes the same ID available',async()=>{
 const calls=[];const pin=place('pinned','2026-09-01','image'),latest=place('latest');const sync=createWidgetSync({plugin:{getWidgets:async()=>({widgets:[{widgetId:1,recordId:'pinned'}]}),updateSnapshot:async s=>calls.push(s)},thumbnail:async()=> 'preview'});
 await sync.refresh([pin,latest]);await sync.refresh([latest]);assert.deepEqual(calls[1].records.map(r=>r.id),['latest']);await sync.refresh([]);assert.deepEqual(calls[2],{count:0,record:null,records:[]});await sync.refresh([pin]);assert.equal(calls[3].records[0].id,'pinned');
});
test('changing a selection during preview generation leaves the newest configuration snapshot last',async()=>{
 const gate=deferred(),calls=[];let recordId='first';const sync=createWidgetSync({plugin:{getWidgets:async()=>({widgets:[{widgetId:1,recordId}]}),updateSnapshot:async s=>calls.push(s)},thumbnail:async src=>src==='slow'?gate.promise:'preview'});
 const records=[place('latest'),place('first','2026-01-01','slow'),place('second','2026-01-02','fast')];const saving=sync.refresh(records);await new Promise(r=>setImmediate(r));recordId='second';sync.refresh(records);gate.resolve('stale');await saving;
 assert.equal(calls.length,1);assert.deepEqual(calls[0].records.map(r=>r.id),['latest','second']);
});
test('failed pinned photos use a placeholder, retry later, and a widget-list error does not overwrite native state',async()=>{
 let fail=true,listFails=false;const calls=[];const sync=createWidgetSync({plugin:{getWidgets:async()=>{if(listFails)throw Error('failed');return {widgets:[{widgetId:1,recordId:'pin'}]};},updateSnapshot:async s=>calls.push(s)},thumbnail:async()=>{if(fail)throw Error('photo');return 'preview';}});
 const records=[place('pin',undefined,'image')];await sync.refresh(records);assert.equal(calls[0].records[0].thumbnail,null);fail=false;await sync.refresh(records);assert.equal(calls[1].records[0].thumbnail,'preview');listFails=true;assert.equal(await sync.refresh([]),false);assert.equal(calls.length,2);
});
test('preferences save the targeted instance and can independently return it to latest mode',async()=>{
 const configs=[{widgetId:1,recordId:'old'},{widgetId:2,recordId:'other'}],calls=[],states=[];
 const prefs=createWidgetPreferences({plugin:{getWidgets:async()=>({widgets:structuredClone(configs)}),setSelection:async({widgetId,recordId})=>{configs.find(w=>w.widgetId===widgetId).recordId=recordId;calls.push(widgetId);}},refresh:async()=>calls.push('refresh'),onState:s=>states.push(s)});
 await prefs.load(2);assert.equal(states.at(-1).focusId,2);await prefs.select(2,'new');assert.equal(configs[0].recordId,'old');assert.equal(configs[1].recordId,'new');await prefs.select(2,'');assert.equal(configs[1].recordId,null);assert.deepEqual(calls,[2,'refresh',2,'refresh']);assert.equal(states.at(-1).busy,false);
});
test('preferences wait for durable selection before refreshing and reject overlapping saves',async()=>{
 const gate=deferred(),calls=[];const prefs=createWidgetPreferences({plugin:{getWidgets:async()=>({widgets:[{widgetId:1,recordId:null}]}),setSelection:async args=>{calls.push(args);await gate.promise;}},refresh:async()=>calls.push('refresh')});
 const saved=prefs.select(1,'one');await prefs.select(1,'two');assert.equal(calls.length,1);gate.resolve();await saved;assert.equal(calls[1],'refresh');
});
test('preferences reload after a rejected native save and report preview refresh failure accurately',async()=>{
 const states=[],messages=[];let fail=true;const prefs=createWidgetPreferences({plugin:{getWidgets:async()=>({widgets:[{widgetId:1,recordId:'original'}]}),setSelection:async()=>{if(fail)throw Error('That widget has been removed.');}},refresh:async()=>false,onState:s=>states.push(s),onStatus:s=>messages.push(s)});
 await prefs.select(1,'changed');assert.equal(states.at(-1).widgets[0].recordId,'original');assert.match(messages[0],/removed/);fail=false;await prefs.select(1,'changed');assert.match(messages.at(-1),/Preview could not refresh/);
});
test('widget configuration waits behind an open editor and only accepts a positive numeric instance ID',async()=>{
 let event,action={action:'configure',widgetId:21},blocked=true;const opened=[];
 const launch=createWidgetLaunch({plugin:{addListener:async(_,fn)=>{event=fn;},takeLaunchAction:async()=>action},canOpen:()=>!blocked,configureWidget:id=>opened.push(id)});
 await launch.start();assert.deepEqual(opened,[]);blocked=false;launch.flush();assert.deepEqual(opened,[21]);for(const widgetId of [-1,0,'21',1.5]){action={action:'configure',widgetId};await event();}assert.deepEqual(opened,[21]);
});
test('preferences identify a removed widget and keep loading errors retryable',async()=>{
 let fail=true;const messages=[],states=[];const prefs=createWidgetPreferences({plugin:{getWidgets:async()=>{if(fail)throw Error('unavailable');return {widgets:[]};}},onStatus:s=>messages.push(s),onState:s=>states.push(s)});
 await prefs.load(12);assert.equal(states.at(-1).busy,false);assert.match(messages[0],/Could not load/);fail=false;await prefs.load(12);assert.match(messages.at(-1),/removed/);
});
test('actual preferences controls escape footprint labels, show missing selections and save the correct widget',()=>{
 const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),buttons=[],saved=[],nodes={'widget-list':{innerHTML:'',querySelectorAll:()=>buttons},'widget-choice-4':{value:'safe',closest:()=>({scrollIntoView(){}}),focus(){}}};
 const context=vm.createContext({$:id=>nodes[id],placeView,latestVisited,records:[place('safe'),{...place('other'),title:'<img src=x onerror=bad>'}],esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),date:s=>s,widgetPreferences:{select:(...args)=>saved.push(args)}});
 buttons.push({dataset:{widgetSave:'4'}});vm.runInContext(app.slice(app.indexOf('function renderWidgetPreferences('),app.indexOf('async function pinWidget(')),context);
 context.renderWidgetPreferences({widgets:[{widgetId:4,recordId:'gone'}],busy:false,focusId:null});assert.match(nodes['widget-list'].innerHTML,/Footprint no longer in journal/);assert.match(nodes['widget-list'].innerHTML,/&lt;img/);assert.doesNotMatch(nodes['widget-list'].innerHTML,/<img/);buttons[0].onclick();assert.deepEqual(saved,[[4,'safe']]);nodes['widget-choice-4'].value='deleted';buttons[0].onclick();assert.equal(saved.length,1);
});
test('configure shortcut can focus existing Preferences while other widget actions remain queued',async()=>{
 const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),opened=[];let event,action={action:'configure',widgetId:5},dialog={id:'settings'};
 const c=vm.createContext({createWidgetLaunch,widgetPlugin:{addListener:async(_,fn)=>{event=fn;},takeLaunchAction:async()=>action},storageReady:true,draftsReady:true,recoveryFound:null,navigation:{busy:false,applying:false},document:{querySelector:()=>dialog},openPreferences:id=>opened.push(id),toast(){}});
 vm.runInContext(app.slice(app.indexOf('const widgetLaunch='),app.indexOf('const widgetPreferences='))+'\nglobalThis.launch=widgetLaunch;',c);
 await c.launch.start();assert.deepEqual(opened,[5]);action={action:'configure',widgetId:6};dialog={id:'editor'};await event();assert.deepEqual(opened,[5]);dialog=null;c.launch.flush();assert.deepEqual(opened,[5,6]);c.openEditor=()=>opened.push('new');c.recoveryFound={id:'unfinished'};action={action:'new'};await event();assert.deepEqual(opened,[5,6]);c.recoveryFound=null;c.launch.flush();assert.deepEqual(opened,[5,6,'new']);
});
