import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createNavigation,navigationRoute,bindNativeBack} from '../dist/navigation.js';
import {createWidgetLaunch} from '../dist/widget.js';
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture(options={}){
 const handlers=new Set(),stack=[],pending=[];let position=-1,roots=0;
 const history={
  replaceState(state){stack[position<0?++position:position]=structuredClone(state);},
  pushState(state){stack.splice(++position);stack.push(structuredClone(state));},
  back(){this.go(-1);},
  go(delta){const next=position+delta;if(next<0||next>=stack.length)return;position=next;const state=structuredClone(stack[position]);pending.push(()=>{for(const handler of handlers)void handler({state});});}
 };
 const applied=[];
 const nav=createNavigation({history,events:{addEventListener(_,f){handlers.add(f);},removeEventListener(_,f){handlers.delete(f);}},session:'test',apply:(next,previous)=>{applied.push(structuredClone(next));return options.apply?.(next,previous);},canLeave:options.canLeave,onRoot:()=>roots++,onError:error=>{throw Error(error);}});
 nav.start(options.initial);
 async function flush(){while(pending.length){pending.shift()();await turn();}await nav.idle();}
 return {nav,history,stack,pending,handlers,applied,flush,get position(){return position;},get roots(){return roots;}};
}
test('secondary tabs share a journal parent and restore the selected tab on Forward',async()=>{
 const f=fixture();await f.nav.view('map');await f.nav.view('favorites');assert.equal(f.stack.length,2);
 f.nav.back();await f.flush();assert.deepEqual(f.nav.route(),{view:'journal',dialogs:[]});
 f.history.go(1);await f.flush();assert.equal(f.nav.route().view,'favorites');
 const direct=fixture({initial:'map'});assert.equal(direct.stack[0].route.view,'journal');direct.nav.back();await direct.flush();assert.equal(direct.nav.route().view,'journal');
});
test('nested Back unwinds picker, editor, footprint, then map; Forward restores each route',async()=>{
 const f=fixture();await f.nav.view('map');
 f.nav.opened({id:'details',recordId:'memory-1'});f.nav.opened({id:'editor',recordId:'memory-1'});f.nav.opened({id:'pin-picker'});
 for(const top of ['editor','details',undefined]){f.nav.back();f.nav.back();await f.flush();assert.equal(f.nav.route().dialogs.at(-1)?.id,top);}
 assert.equal(f.nav.route().view,'map');f.nav.back();await f.flush();assert.equal(f.nav.route().view,'journal');assert.equal(f.roots,0);
 f.nav.back();assert.equal(f.roots,1);
 f.history.go(4);await f.flush();assert.deepEqual(f.nav.route().dialogs.map(d=>d.id),['details','editor','pin-picker']);
});
test('history restoration does not create extra entries when dialogs show again',async()=>{
 let f;f=fixture({apply:next=>{for(const dialog of next.dialogs)f.nav.opened(dialog);}});
 f.nav.opened({id:'settings'});f.nav.back();await f.flush();f.history.go(1);await f.flush();assert.equal(f.stack.length,2);assert.equal(f.position,1);
});
test('rejected editor departure preserves the draft for both local Back and browser Back',async()=>{
 let allow=false,prompts=0;const f=fixture({canLeave:(old,next)=>{if(old.dialogs.some(d=>d.id==='editor')&&!next.dialogs.some(d=>d.id==='editor')){prompts++;return allow;}return true;}});
 f.nav.opened({id:'editor',recordId:null});f.nav.back();assert.equal(f.position,1);assert.equal(prompts,1);
 f.history.back();await f.flush();assert.equal(f.position,1);assert.equal(f.applied.length,0);assert.equal(f.nav.busy,false);
 allow=true;f.nav.back();await f.flush();assert.equal(prompts,3);assert.equal(f.position,0);assert.equal(f.nav.route().dialogs.length,0);
});
test('browser skips across nested routes are guarded and bounced to the original entry',async()=>{
 const f=fixture({canLeave:()=>false});f.nav.opened({id:'details',recordId:'one'});f.nav.opened({id:'editor',recordId:'one'});f.nav.opened({id:'pin-picker'});
 f.history.go(-3);await f.flush();assert.equal(f.position,3);assert.equal(f.nav.route().dialogs.at(-1).id,'pin-picker');
});
test('rapid browser Back waits for asynchronous rendering and finishes at the latest route',async()=>{
 const gate=deferred();let active=0,max=0;
 const f=fixture({apply:async()=>{active++;max=Math.max(max,active);await gate.promise;active--;}});
 f.nav.opened({id:'details',recordId:'one'});f.nav.opened({id:'editor',recordId:'one'});f.nav.opened({id:'pin-picker'});
 f.history.back();f.pending.shift()();await turn();assert.equal(f.nav.busy,true);
 f.history.back();f.pending.shift()();f.history.back();f.pending.shift()();await turn();assert.equal(max,1);
 gate.resolve();await f.flush();assert.deepEqual(f.nav.route(),{view:'journal',dialogs:[]});assert.equal(max,1);
});
test('removed records can prune a restored route without trapping Android Back',async()=>{
 let f;f=fixture({apply:next=>{if(next.dialogs.length)f.nav.replaceRoute({view:next.view,dialogs:[]});}});
 f.nav.opened({id:'details',recordId:'deleted'});f.nav.back();await f.flush();f.history.go(1);await f.flush();assert.equal(f.nav.route().dialogs.length,0);f.nav.back();assert.equal(f.roots,1);
});
test('native listener uses the shared controller and returns a removable handle',async()=>{
 let callback,backs=0,removed=false;const handle={remove:async()=>{removed=true;}};
 assert.equal(await bindNativeBack({plugin:{addListener:async(name,fn)=>{assert.equal(name,'backButton');callback=fn;return handle;}},navigation:{back:()=>backs++}}),handle);
 callback();assert.equal(backs,1);await handle.remove();assert.equal(removed,true);
 const errors=[];await bindNativeBack({plugin:{addListener:async()=>{throw Error('missing');}},onError:e=>errors.push(e)});assert.match(errors[0],/on-screen controls/);
});
test('navigation descriptors reject invalid identities and orphaned position pickers',()=>{
 assert.deepEqual(navigationRoute({view:'unknown',dialogs:[{id:'pin-picker'}]}),{view:'journal',dialogs:[]});
 assert.equal(navigationRoute({dialogs:[{id:'details',recordId:'../unsafe'}]}).dialogs.length,0);
 assert.equal(navigationRoute({dialogs:[{id:'editor'},{id:'pin-picker'},{id:'pin-picker'}]}).dialogs.length,2);
});
const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
function guardFixture(){
 const nodes={editor:{open:true},favorite:{checked:false},'place-form':{entries:[['title','Original'],['lat','43']]}},messages=[];let accepts=false,cancellations=0;
 const c=vm.createContext({$:id=>nodes[id],FormData:class{constructor(form){this.form=form;}entries(){return this.form.entries;}},toolsUI:{canClose:()=>true},batchUI:{canClose:()=>true},exportsUI:{canClose:()=>true},draftPhoto:'photo-a',draftPhotos:['photo-a'],draftCover:0,draftAudio:null,draftArt:null,draftBaseline:null,draftRecovered:false,pendingMedia:0,micPending:false,cameraPending:false,locationPending:false,recording:null,editorSaving:false,restoreCommit:false,exportCommit:false,transferRunning:false,toast:m=>messages.push(m),confirm:()=>accepts,cancelTransfer:()=>cancellations++});
 vm.runInContext(app.slice(app.indexOf('function editorSnapshot()'),app.indexOf('function applyView(')),c);c.draftBaseline=c.editorSnapshot();
 return {c,nodes,messages,accept(){accepts=true;},get cancellations(){return cancellations;}};
}
const editor={view:'journal',dialogs:[{id:'details',recordId:'one'},{id:'editor',recordId:'one'}]},details={view:'journal',dialogs:[{id:'details',recordId:'one'}]},backup={view:'journal',dialogs:[{id:'backup'}]},root={view:'journal',dialogs:[]};
test('actual editor guard detects text, favorites, media, cover and pending device work',()=>{
 for(const mutate of [f=>f.nodes['place-form'].entries[0][1]='Changed',f=>f.nodes.favorite.checked=true,f=>f.c.draftPhotos.push('photo-b'),f=>f.c.draftAudio='audio',f=>f.c.draftCover=1,f=>f.c.cameraPending=true,f=>f.c.locationPending=true,f=>f.c.recording={state:'recording'}]){
  const f=guardFixture();assert.equal(f.c.editorDirty(),false);mutate(f);assert.equal(f.c.editorDirty(),true);assert.equal(f.c.canLeaveNavigation(editor,details),false);f.accept();assert.equal(f.c.canLeaveNavigation(editor,details),true);
 }
});
test('closing the position picker preserves the dirty editor; saving blocks editor departure',()=>{
 const f=guardFixture();f.c.draftAudio='changed';assert.equal(f.c.canLeaveNavigation({...editor,dialogs:[...editor.dialogs,{id:'pin-picker'}]},editor),true);
 f.c.editorSaving=true;f.accept();assert.equal(f.c.canLeaveNavigation(editor,details),false);assert.match(f.messages.at(-1),/Saving/);
});
test('actual transfer guard waits for file/database commits and requests safe cancellation',()=>{
 const f=guardFixture();for(const key of ['restoreCommit','exportCommit']){f.c[key]=true;assert.equal(f.c.canLeaveNavigation(backup,root),false);assert.equal(f.cancellations,0);f.c[key]=false;}
 f.c.transferRunning=true;assert.equal(f.c.canLeaveNavigation(backup,root),false);assert.equal(f.cancellations,1);f.c.transferRunning=false;assert.equal(f.c.canLeaveNavigation(backup,root),true);
});
test('app restoration reopens a footprint after editing and drops deleted history targets',async()=>{
 const nodes={details:{open:true,scrollTop:55},editor:{open:true}},calls=[];
 const c=vm.createContext({navigationRoute,records:[{id:'one'}],navigation:{replaceRoute:r=>calls.push(['pruned',r])},view:'journal',detailId:'one',editId:'one',$:id=>nodes[id],closeRaw:id=>{nodes[id].open=false;calls.push(['closed',id]);},openDetail:async id=>calls.push(['detail',id]),toast:m=>calls.push(['toast',m])});
 vm.runInContext(app.slice(app.indexOf('async function applyNavigation('),app.indexOf('async function openDetail(')),c);
 await c.applyNavigation(details,editor);assert.deepEqual(calls,[['closed','editor'],['detail','one']]);assert.equal(nodes.details.scrollTop,55);
 calls.length=0;c.records=[];await c.applyNavigation(details,root);assert.equal(calls[0][0],'pruned');assert.equal(calls[0][1].dialogs.length,0);assert.ok(calls.some(c=>c[0]==='toast'));assert.ok(!calls.some(c=>c[0]==='detail'));
});
test('widget launch reports asynchronous navigation failures without an unhandled rejection',async()=>{
 const errors=[];const launch=createWidgetLaunch({plugin:{addListener:async()=>({remove(){}}),takeLaunchAction:async()=>({action:'open',id:'one'})},openFootprint:async()=>{throw Error('render failed');},onError:e=>errors.push(e)});
 await launch.start();await turn();assert.match(errors[0],/Could not open/);await launch.stop();
});
test('saving holds the editor until persistence finishes, then returns to its parent without prompting',async()=>{
 const gate=deferred(),calls=[],nodes={'editor-error':{},'save-place':{},favorite:{checked:false},'place-form':{}};
 const c=vm.createContext({$:id=>nodes[id],editVisitId:null,detailId:null,detailVisitId:null,INITIAL_VISIT:'initial',writeVisit:(old,r)=>r,parseTags:()=>[],editorSaving:false,micPending:false,pendingMedia:0,locationPending:false,cameraPending:false,recording:null,FormData:class{get(name){return name==='title'?'Updated':'';}},validateRecord:r=>r,editId:'one',draftSource:null,draftPhoto:null,draftPhotos:[],draftCover:0,draftAudio:null,draftArt:null,changeJournal:async transform=>{calls.push(transform([{id:'one',title:'Old'}]));await gate.promise;},editorSnapshot:()=>({saved:true}),draftBaseline:null,close:(id,options)=>calls.push([id,options.force]),filtered:()=>[{id:'one'}],deckIndex:0,render(){},toast(){}});
 c.saveEditorRecord=transform=>c.changeJournal(transform);c.scheduleDraft=()=>{};c.selectedDraftTrips=()=>[];
 vm.runInContext(app.slice(app.indexOf('async function savePlace('),app.indexOf('const tick=')),c);
 const saving=c.savePlace({preventDefault(){}});assert.equal(c.editorSaving,true);assert.equal(nodes['place-form'].inert,true);assert.equal(calls.length,1);assert.equal(calls[0][0].title,'Updated');await c.savePlace({preventDefault(){}});assert.equal(calls.length,1);
 gate.resolve();await saving;assert.equal(c.editorSaving,false);assert.deepEqual(calls[1],['editor',true]);assert.equal(c.draftBaseline.saved,true);assert.equal(nodes['save-place'].disabled,false);assert.equal(nodes['place-form'].inert,false);
});

test('Back safely cancels an offline download and waits for commit or removal',()=>{
 const f=guardFixture(),route={view:'map',dialogs:[{id:'offline-maps'}]};let cancellations=0;
 f.c.offlineMaps={phase:'downloading',cancel(){cancellations++;}};
 assert.equal(f.c.canLeaveNavigation(route,root),false);assert.equal(cancellations,1);assert.match(f.messages.at(-1),/map download safely/);
 for(const phase of ['committing','removing']){f.c.offlineMaps.phase=phase;assert.equal(f.c.canLeaveNavigation(route,root),false);}
 f.c.offlineMaps.phase='idle';assert.equal(f.c.canLeaveNavigation(route,root),true);
});
