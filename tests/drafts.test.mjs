import {createJournalStorage} from '../dist/journal-storage.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {IDBFactory} from 'fake-indexeddb';
import {createDraftStore,createDraftRecovery,clearDraftInTransaction,validateDraft,draftBlob,bindDraftLifecycle,DRAFT_KEY,DRAFT_FIELDS} from '../dist/drafts.js';
const image='data:image/jpeg;base64,AQID',other='data:image/png;base64,BAUG',audio='data:audio/webm;base64,BwgJ';
const snapshot=(extra={})=>({editId:null,baseUpdatedAt:null,values:{title:'',category:'Travel',visited:'2026-10-15',rating:'0',address:'',notes:'Unfinished note',phone:'',url:'',lat:'43.',lng:''},favorite:false,photos:[image,other],coverIndex:1,audio,art:null,camera:null,...extra});
const asData=async blob=>`data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;
const turn=()=>new Promise(r=>setImmediate(r));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function fixture(){
 const indexedDB=new IDBFactory();const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('nth-footprints',1);r.onupgradeneeded=()=>{r.result.createObjectStore('journal');r.result.createObjectStore('media');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 const store=createDraftStore(db),states=[];let uuid=0;
 const controller=()=>createDraftRecovery({store,read:asData,uuid:()=>`id-${++uuid}`,delay:10000,onState:s=>states.push(s)});
 const keys=()=>new Promise(resolve=>{const r=db.transaction('journal').objectStore('journal').getAllKeys();r.onsuccess=()=>resolve(r.result);});
 return {indexedDB,db,store,states,controller,keys};
}
const camera={token:'camera-1',startedAt:'2026-10-15T20:00:00Z'};
const restored={pluginId:'Camera',methodName:'getPhoto',success:true,data:{webPath:'https://localhost/_capacitor_file_/returned.jpg'}};
const photoBlob=new Blob([Uint8Array.from([10,11,12])],{type:'image/jpeg'});
async function waiting(){const f=await fixture(),r=f.controller();r.begin('draft-1');await r.flush(snapshot({camera}));r.release();const reboot=f.controller();await reboot.load();return {...f,r:reboot};}

test('drafts preserve partial and empty fields without requiring a complete saved footprint',async()=>{
 const f=await fixture(),r=f.controller();r.begin('draft-1');await r.flush(snapshot());const meta=await f.store.read();assert.equal(validateDraft(meta).values.lat,'43.');assert.equal(meta.values.title,'');assert.equal(meta.values.lng,'');assert.ok(f.states.some(s=>s.state==='saved'));
 for(const invalid of [{...meta,version:9},{...meta,photos:['outside-the-draft']},{...meta,coverIndex:8},{...meta,values:{...meta.values,title:'x'.repeat(161)}}])assert.throws(()=>validateDraft(invalid));
});
test('gallery, selected photo, favorite, text and completed audio survive controller recreation',async()=>{
 const f=await fixture(),r=f.controller();r.begin('draft-1');await r.flush(snapshot({favorite:true}));r.release();
 const reboot=f.controller(),meta=await reboot.load(),data=await reboot.hydrate(meta);assert.deepEqual(data.photos,[image,other]);assert.equal(data.coverIndex,1);assert.equal(data.audio,audio);assert.equal(data.favorite,true);assert.equal(data.values.notes,'Unfinished note');
});
test('typing changes only metadata and reuses original persisted media blobs',async()=>{
 const f=await fixture(),r=f.controller();r.begin('draft-1');await r.flush(snapshot());const before=await f.store.read(),keys=await f.keys();
 await r.flush(snapshot({values:{...snapshot().values,title:'Typed title'}}));const after=await f.store.read();assert.deepEqual(after.photos,before.photos);assert.equal(after.audio,before.audio);assert.deepEqual(await f.keys(),keys);
});
test('photo removal replaces metadata and deletes only unreferenced draft media',async()=>{
 const f=await fixture(),r=f.controller();r.begin('draft-1');await r.flush(snapshot());const before=await f.store.read();await r.flush(snapshot({photos:[other],coverIndex:0,audio:null}));
 assert.equal(await f.store.media(before.photos[0]),null);assert.ok(await f.store.media(before.photos[1]));assert.equal(await f.store.media(before.audio),null);assert.equal((await f.store.read()).photos[0],before.photos[1]);
});
test('a failed autosave keeps the previous draft intact and retry writes previously failed media',async()=>{
 const f=await fixture(),r=f.controller();r.begin('draft-1');await r.flush(snapshot({photos:[image],coverIndex:0}));const before=await f.store.read(),write=f.store.write;let fail=true;
 f.store.write=(...args)=>fail?Promise.reject(Error('disk full')):write(...args);
 await assert.rejects(r.flush(snapshot()),/disk full/);assert.deepEqual(await f.store.read(),before);assert.equal(f.states.at(-1).state,'error');
 fail=false;await r.flush(snapshot());assert.deepEqual((await r.hydrate(await f.store.read())).photos,[image,other]);
});
test('writes coalesce while persistence is running and retain the newest input',async()=>{
 const f=await fixture(),r=f.controller(),gate=deferred(),write=f.store.write;let calls=0;
 f.store.write=async(...args)=>{if(++calls===1)await gate.promise;await write(...args);};r.begin('draft-1');const pending=r.flush(snapshot());await turn();
 r.schedule(snapshot({values:{...snapshot().values,title:'Middle'}}));r.schedule(snapshot({values:{...snapshot().values,title:'Newest'}}));gate.resolve();await pending;await r.flush();assert.equal((await f.store.read()).values.title,'Newest');assert.equal(calls,2);r.release();
});
test('freeze drains pending changes and prevents later schedules from racing a journal save',async()=>{
 const f=await fixture(),r=f.controller();r.begin('draft-1');r.schedule(snapshot());const id=await r.freeze();assert.equal(id,'draft-1');const before=await f.store.read();r.schedule(snapshot({photos:[],coverIndex:0}));await r.flush();assert.deepEqual(await f.store.read(),before);r.release();
});
function journalWrite(db,state,id,{abort=false}={}){return new Promise((resolve,reject)=>{const tx=db.transaction('journal','readwrite'),store=tx.objectStore('journal');store.put(state,'state');clearDraftInTransaction(store,id);tx.oncomplete=resolve;tx.onabort=()=>reject(Error('Aborted'));if(abort)tx.abort();});}
const journalRead=db=>new Promise(resolve=>{const r=db.transaction('journal').objectStore('journal').get('state');r.onsuccess=()=>resolve(r.result);});
test('journal save and draft removal commit atomically, including returned camera media',async()=>{
 const f=await waiting();await f.r.receiveCamera(restored,async()=>photoBlob);await journalWrite(f.db,{records:[{id:'saved'}]},'draft-1');
 assert.equal(await f.store.read(),null);assert.equal(await f.store.result('draft-1'),null);assert.ok(!(await f.keys()).some(k=>String(k).startsWith('draft-media:')));assert.equal((await journalRead(f.db)).records[0].id,'saved');
});
test('an aborted journal save keeps both the prior journal and the full recovery draft',async()=>{
 const f=await fixture(),r=f.controller();await journalWrite(f.db,{records:[{id:'original'}]},null);r.begin('draft-1');await r.flush(snapshot());
 await assert.rejects(journalWrite(f.db,{records:[{id:'changed'}]},'draft-1',{abort:true}));assert.equal((await journalRead(f.db)).records[0].id,'original');assert.deepEqual((await r.hydrate(await f.store.read())).photos,[image,other]);
});
test('late autosaves cannot recreate a draft after it was saved or explicitly discarded',async()=>{
 for(const saved of [false,true]){const f=await fixture(),r=f.controller();r.begin('draft-1');await r.flush(snapshot());const old=await f.store.read();if(saved)await journalWrite(f.db,{records:[]},'draft-1');else await f.store.clear('draft-1');await assert.rejects(f.store.write(old));assert.equal(await f.store.read(),null);}
});
test('discard waits for an in-flight autosave, removes draft blobs and preserves the journal',async()=>{
 const f=await fixture(),r=f.controller(),gate=deferred(),write=f.store.write;await journalWrite(f.db,{records:[{id:'kept'}]},null);
 f.store.write=async(...args)=>{await gate.promise;await write(...args);};r.begin('draft-1');const writing=r.flush(snapshot());await turn();const discard=r.discard();gate.resolve();await Promise.all([writing,discard]);assert.equal(await f.store.read(),null);assert.equal(r.id,null);assert.equal((await journalRead(f.db)).records[0].id,'kept');
});
test('a new editor cannot overwrite a different unresolved recovery draft',async()=>{
 const f=await fixture(),a=f.controller(),b=f.controller();a.begin('draft-a');await a.flush(snapshot());b.begin('draft-b');await assert.rejects(b.flush(snapshot({photos:[],coverIndex:0})));assert.equal((await f.store.read()).id,'draft-a');
});
test('recovered camera bytes are saved independently and never silently rewrite draft coordinates',async()=>{
 const f=await waiting();assert.equal(await f.r.receiveCamera(restored,async()=>photoBlob),true);const result=await f.store.result('draft-1');assert.equal(await result.blob.text(),await photoBlob.text());assert.equal((await f.store.read()).values.lat,'43.');assert.equal((await f.store.read()).photos.length,2);
 const reboot=f.controller();await reboot.load();assert.equal((await reboot.result('draft-1')).blob.size,photoBlob.size);
});
test('a persisted camera descriptor can retry after another process restart',async()=>{
 const f=await waiting();await f.store.putResult('draft-1',camera.token,{photo:restored.data});const reboot=f.controller();await reboot.load();let readPath;
 assert.equal(await reboot.readReturned('draft-1',async photo=>{readPath=photo.webPath;return photoBlob;}),true);assert.equal(readPath,restored.data.webPath);assert.ok((await f.store.result('draft-1')).blob);
});
test('duplicate and unrelated restored events are ignored without opening another photo',async()=>{
 const f=await waiting();let reads=0;const read=async()=>{reads++;return photoBlob;};
 for(const event of [{...restored,pluginId:'Other'},{...restored,methodName:'pickImages'}])assert.equal(await f.r.receiveCamera(event,read),false);
 assert.equal(await f.r.receiveCamera(restored,read),true);assert.equal(await f.r.receiveCamera(restored,read),false);assert.equal(reads,1);
});
test('late camera completion cannot revive a discarded draft or attach to a newer capture',async()=>{
 for(const action of ['discard','new-camera']){const f=await waiting(),gate=deferred();const pending=f.r.receiveCamera(restored,()=>gate.promise);await turn();
  if(action==='discard')await f.r.discardFound('draft-1');else{const meta=await f.store.read();await f.store.write({...meta,camera:{...camera,token:'camera-new'}});}
  gate.resolve(photoBlob);assert.equal(await pending,false);assert.equal(await f.store.result('draft-1'),null);
 }
});
test('camera cancellation keeps the original draft photo and location',async()=>{
 const f=await waiting(),before=await f.store.read();await f.r.receiveCamera({...restored,success:false,error:{message:'cancelled'}},async()=>{throw Error('must not open');});assert.equal((await f.store.result('draft-1')).cancelled,true);assert.deepEqual(await f.store.read(),before);
});
test('unreadable returned camera media retains a retryable descriptor and the original draft',async()=>{
 const f=await waiting();assert.equal(await f.r.receiveCamera(restored,async()=>{throw Error('temporary read failure');}),false);assert.ok((await f.store.result('draft-1')).photo);assert.equal(f.states.at(-1).state,'camera-error');assert.equal(await f.r.readReturned('draft-1',async()=>photoBlob),true);
});
test('draft attachments reject unsupported MIME types and broken encodings',()=>{
 assert.equal(draftBlob(image,'image').size,3);for(const src of ['https://remote.example/photo','data:image/svg+xml;base64,AQID','data:image/jpeg;base64,ABC','data:text/plain;base64,AQID'])assert.throws(()=>draftBlob(src,'image'));
});
test('lifecycle wiring checkpoints before backgrounding and forwards native restored camera events',async()=>{
 const document={hidden:false,handlers:{},addEventListener(n,fn){this.handlers[n]=fn;},removeEventListener(n){delete this.handlers[n];}},events={handlers:{},addEventListener(n,fn){this.handlers[n]=fn;},removeEventListener(n){delete this.handlers[n];}},native={};let pauses=0,restoredEvent,removed=0;
 const handle=await bindDraftLifecycle({document,events,plugin:{addListener:async(name,fn)=>{native[name]=fn;return {remove:async()=>removed++};}},onPause:()=>pauses++,onRestored:event=>restoredEvent=event});
 document.handlers.visibilitychange();assert.equal(pauses,0);document.hidden=true;document.handlers.visibilitychange();events.handlers.pagehide();native.pause();assert.equal(pauses,3);native.appRestoredResult(restored);assert.equal(restoredEvent,restored);await handle.remove();assert.equal(removed,2);assert.deepEqual(document.handlers,{});
});
test('actual journal writer uses the same transaction to remove its saved draft',async()=>{
 const f=await fixture(),r=f.controller();r.begin('draft-1');await r.flush(snapshot());
 const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),c=vm.createContext({journeys:[],db:f.db,journalStorage:createJournalStorage(f.db),clearDraftInTransaction});
 vm.runInContext(app.slice(app.indexOf('function dbPut('),app.indexOf('async function commit(')),c);await c.dbPut([{id:'kept',title:'Kept',category:'Other',visited:'2026-10-17',rating:0,favorite:false,lat:null,lng:null,updatedAt:'2026-10-17T04:00:00Z'}],{theme:'paper'},'draft-1');assert.equal(await f.store.read(),null);assert.equal((await journalRead(f.db)).records[0].id,'kept');
});

test('an unreadable draft can be discarded without deleting the journal or a replacement valid draft',async()=>{
 const f=await fixture();await journalWrite(f.db,{records:[{id:'saved'}]},null);await new Promise(resolve=>{const tx=f.db.transaction('journal','readwrite');tx.objectStore('journal').put({version:999,id:''},DRAFT_KEY);tx.oncomplete=resolve;});await f.store.clearUnreadable();assert.equal(await f.store.read(),null);assert.equal((await journalRead(f.db)).records[0].id,'saved');
 const r=f.controller();r.begin('valid-draft');await r.flush(snapshot());await assert.rejects(f.store.clearUnreadable());assert.equal((await f.store.read()).id,'valid-draft');
});

test('reverting to a clean editor removes stale autosaved text and still permits later editing',async()=>{
 const f=await fixture(),r=f.controller();r.begin('draft-1');await r.flush(snapshot());r.clean();await r.flush();assert.equal(await f.store.read(),null);assert.ok(!(await f.keys()).some(k=>String(k).startsWith('draft-media:')));
 await r.flush(snapshot({values:{...snapshot().values,title:'New text after reverting'}}));assert.equal((await f.store.read()).values.title,'New text after reverting');assert.deepEqual((await r.hydrate(await f.store.read())).photos,[image,other]);r.release();
});
