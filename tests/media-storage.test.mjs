import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {openJournalDatabase,createJournalStorage} from '../dist/journal-storage.js';
import {registerMedia,mediaInfo,dataBlob,crc32,knownMedia,visitMedia} from '../dist/media-store.js';
import {validateRecord,parseBackup,makeBackup} from '../dist/model.js';
import {preparePhotoExport} from '../dist/photo-export.js';
import {prepareJournalArchive,inspectJournalArchive,restoreJournalArchive} from '../dist/journal-archive.js';
import {createDraftStore,createDraftRecovery} from '../dist/drafts.js';
const photo='data:image/jpeg;base64,AQID',audio='data:audio/webm;base64,BAUG';
const record=()=>validateRecord({id:'place',title:'Our place 🌲',category:'Other',visited:'2026-10-17',rating:0,favorite:false,lat:0,lng:0,photos:[photo],coverIndex:0,audio,updatedAt:'2026-10-17T04:00:00Z'});
const read=(db,key='state')=>new Promise(resolve=>{const r=db.transaction('journal').objectStore('journal').get(key);r.onsuccess=()=>resolve(r.result);});
async function fixture(){const db=await openJournalDatabase(new IDBFactory());return {db,store:createJournalStorage(db)};}
async function archive(records=[record()]){const stream=await prepareJournalArchive(records,{theme:'night'},[]),parts=[];for await(const p of stream.chunks())parts.push(p);const blob=new Blob(parts);assert.equal(blob.size,stream.size);return {stream,blob};}
test('original media is content-addressed, deduplicated and trusted only after registration',async()=>{
 assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);const blob=dataBlob(photo),a=await registerMedia(blob),b=await registerMedia(blob);assert.equal(a,b);assert.equal(knownMedia(a,'image'),true);assert.equal(knownMedia('blob:unregistered','image'),false);assert.equal(mediaInfo(a).size,3);assert.deepEqual(new Uint8Array(await preparePhotoExport({...record(),photo:a}).blob.arrayBuffer()),new Uint8Array([1,2,3]));await assert.rejects(registerMedia(blob,{key:'nth-media:'+'0'.repeat(64)}),/checksum/);
});
test('legacy journals migrate atomically to binary originals and small metadata, retaining dates, GPS, return visits and bytes',async()=>{
 const {db,store}=await fixture(),old={records:[record()],journeys:[],settings:{theme:'night'}};await new Promise(resolve=>{const t=db.transaction('journal','readwrite');t.objectStore('journal').put(old,'state');t.oncomplete=resolve;});const loaded=await store.read(),disk=await read(db);assert.equal(disk.storageVersion,2);assert.match(disk.records[0].photos[0],/^nth-media:/);assert.ok(!JSON.stringify(disk).includes('base64'));assert.equal(knownMedia(loaded.records[0].photo,'image'),false);const canonical=validateRecord(loaded.records[0]);assert.equal(knownMedia(canonical.photo,'image'),true);assert.deepEqual(new Uint8Array(await dataBlob(canonical.photo).arrayBuffer()),new Uint8Array([1,2,3]));assert.equal(canonical.lat,0);assert.equal(canonical.lng,0);assert.equal((await store.read()).records[0].photos[0],canonical.photo);db.close();
});
test('journal media and recovery draft cleanup commit together; failed transactions preserve previous journal',async()=>{
 const {db,store}=await fixture();await store.write([record()],{theme:'paper'},null,[]);const before=await read(db);await assert.rejects(store.write([{...record(),photo:'invalid',photos:['invalid']}],{theme:'night'},null,[]));assert.deepEqual(await read(db),before);const draft=createDraftStore(db);await new Promise(resolve=>{const t=db.transaction('journal','readwrite');t.objectStore('journal').put({id:'draft'},'editor-draft');t.oncomplete=resolve;});await store.write([record()],{theme:'night'},'draft',[]);assert.equal(await draft.read(),null);db.close();
});
test('ZIP64 archive round trip preserves originals and labels, deduplicates attachments and restores only after verification',async()=>{
 const first=record(),second={...record(),id:'other',title:'Another place',country:'Canada',region:'Ontario'},built=await archive([first,second]);assert.equal(built.stream.manifest.media.length,2);const preview=await inspectJournalArchive(built.blob);assert.equal(preview.records.length,2);const {db,store}=await fixture();await store.write([first],{theme:'paper'},null,[]);const staged=await restoreJournalArchive(preview,{stage:(b,k)=>store.stage(b,k)});assert.equal((await read(db)).records.length,1);await store.write(staged.records,staged.settings,null,staged.journeys);const restored=await store.read();assert.equal(restored.records.length,2);assert.equal(restored.records[1].country,'Canada');assert.equal(restored.records[1].region,'Ontario');assert.deepEqual(new Uint8Array(await dataBlob(restored.records[0].photos[0]).arrayBuffer()),new Uint8Array([1,2,3]));assert.equal(restored.records[0].photos[0],restored.records[1].photos[0]);db.close();
});
test('damaged/truncated archives and cancelled staging never publish partial journal data; orphan cleanup keeps live originals',async()=>{
 const {blob}=await archive(),bytes=new Uint8Array(await blob.arrayBuffer());await assert.rejects(inspectJournalArchive(blob.slice(0,blob.size-10)));const preview=await inspectJournalArchive(blob),{db,store}=await fixture();await store.write([record()],{},null,[]);const before=await read(db),controller=new AbortController();await assert.rejects(restoreJournalArchive(preview,{signal:controller.signal,stage:async(b,k)=>{const v=await store.stage(b,k);controller.abort();return v;}}),/CANCELLED/);assert.deepEqual(await read(db),before);await store.releaseStage();assert.equal((await store.read()).records.length,1);
 const mediaName=preview.manifest.media[0].path;bytes[preview.entries.get(mediaName).dataStart]^=1;const bad=await inspectJournalArchive(new Blob([bytes]));await assert.rejects(restoreJournalArchive(bad,{stage:(b,k)=>store.stage(b,k)}),/damaged|checksum/);assert.deepEqual(await read(db),before);db.close();
});
test('old JSON backups remain readable independently of runtime media URLs',()=>{const old=JSON.stringify(makeBackup([record()]));assert.equal(parseBackup(old).records[0].photo,photo);});
test('metadata-only edits do not rewrite existing original media',async()=>{
 const {db,store}=await fixture();await store.write([record()],{},null,[]);let mediaWrites=0;const transact=db.transaction.bind(db);db.transaction=(...args)=>{const tx=transact(...args),object=tx.objectStore.bind(tx);tx.objectStore=name=>{const s=object(name);if(name==='media'){const put=s.put.bind(s);s.put=(...values)=>{mediaWrites++;return put(...values);};}return s;};return tx;};await store.write([{...record(),notes:'Only the note changed'}],{},null,[]);assert.equal(mediaWrites,0);assert.equal((await read(db)).records[0].notes,'Only the note changed');db.close();
});
test('split compatibility volumes join in numeric order and reject missing, duplicate or mixed parts',async()=>{
 const {saveArchiveParts,joinBackupParts}=await import('../dist/backup-parts.js'),stream=await prepareJournalArchive([record()],{},[]),files=[];let active;
 const plugin={begin:async o=>{active={...o,pieces:[]};return {id:'part'};},append:async({data})=>active.pieces.push(Uint8Array.from(atob(data),c=>c.charCodeAt(0))),finish:async()=>{const f=new Blob(active.pieces);Object.defineProperty(f,'name',{value:active.name});files.push(f);return {name:active.name,bytes:f.size};},abort:async()=>{}};
 await saveArchiveParts(stream,'journal-test',{plugin,partSize:300});assert.ok(files.length>1);const joined=joinBackupParts(files.slice().reverse());assert.equal(joined.size,stream.size);assert.equal((await inspectJournalArchive(joined)).records.length,1);assert.throws(()=>joinBackupParts(files.slice(1)),/Choose all/);assert.throws(()=>joinBackupParts([files[0],files[0]]),/Choose all/);assert.throws(()=>joinBackupParts([files[0],Object.assign(new Blob(),{name:'unrelated.nthbackup'})]),/only the parts/);
});
test('external legacy JSON cannot borrow runtime-only media URLs',async()=>{
 const url=await registerMedia(dataBlob(photo));await assert.rejects(async()=>parseBackup(JSON.stringify({...makeBackup([record()]),records:[{...record(),photos:[url],photo:url}]})),/Legacy JSON/);
});

test('a failed binary migration leaves the complete old journal readable and retries safely',async()=>{
 const {db,store}=await fixture(),legacy={records:[record()],settings:{theme:'night'},journeys:[]};await new Promise(resolve=>{const t=db.transaction('journal','readwrite');t.objectStore('journal').put(legacy,'state');t.oncomplete=resolve;});const native=db.transaction.bind(db);let fail=true;db.transaction=(names,mode,...rest)=>{const tx=native(names,mode,...rest);if(mode==='readwrite'&&fail){fail=false;queueMicrotask(()=>tx.abort());}return tx;};const usable=await store.read();assert.match(usable.storageWarning,/existing journal is intact/);assert.deepEqual(await read(db),legacy);assert.equal(usable.records[0].title,legacy.records[0].title);await store.read();assert.equal((await read(db)).storageVersion,2);db.close();
});
test('staged originals survive unrelated metadata saves, then interrupted-restore cleanup removes only unpublished media',async()=>{
 const {db,store}=await fixture();await store.write([record()],{},null,[]);const unused=await registerMedia(new Blob([new Uint8Array([99,98,97])],{type:'image/png'})),key=mediaInfo(unused).key;await store.stage(dataBlob(unused),key);await store.write([{...record(),notes:'Changed while media is staged'}],{},null,[]);const keyExists=()=>new Promise(resolve=>{const q=db.transaction('media').objectStore('media').getKey(key);q.onsuccess=()=>resolve(q.result);});assert.equal(await keyExists(),key);await store.releaseStage();assert.equal(await keyExists(),undefined);assert.equal((await store.read()).records[0].notes,'Changed while media is staged');db.close();
});

test('selected file originals and restored slices are detached before storage; restore replaces older file-linked copies',async()=>{
 const fs=await import('node:fs'),fsp=await import('node:fs/promises'),os=await import('node:os'),path=await import('node:path');const dir=await fsp.mkdtemp(path.join(os.tmpdir(),'nth-original-'));const file=path.join(dir,'original.jpg'),bytes=Buffer.from([31,32,33,34,35]);
 try{
  await fsp.writeFile(file,bytes);const input=await fs.openAsBlob(file,{type:'image/jpeg'}),url=await registerMedia(input);await fsp.unlink(file);assert.deepEqual(Buffer.from(await dataBlob(url).arrayBuffer()),bytes);
  const {db,store}=await fixture();await store.write([{...record(),photos:[url],audio:null}],{},null,[]);const key=mediaInfo(url).key;await fsp.writeFile(file,bytes);const external=await fs.openAsBlob(file,{type:'image/jpeg'});await new Promise(resolve=>{const t=db.transaction('media','readwrite');t.objectStore('media').put({blob:new Blob([new Uint8Array(5)],{type:'image/jpeg'}),crc:0},key);t.oncomplete=resolve;});await store.stage(external,key);const disk=await new Promise(resolve=>{const q=db.transaction('media').objectStore('media').get(key);q.onsuccess=()=>resolve(q.result);});assert.deepEqual(Buffer.from(await disk.blob.arrayBuffer()),bytes);await fsp.unlink(file);const loaded=await store.read(),archive=await prepareJournalArchive(loaded.records,{},[]);let count=0;for await(const b of archive.chunks())count+=b.length;assert.equal(count,archive.size);assert.deepEqual(Buffer.from(await dataBlob(loaded.records[0].photos[0]).arrayBuffer()),bytes);db.close();
 }finally{await fsp.rm(dir,{recursive:true,force:true});}
});

test('photo staging scopes protect independent reviews and restore staging; discard only removes unused originals',async()=>{
 const {db,store}=await fixture();await store.write([record()],{},null,[]);
 const a=store.createMediaStage(),b=store.createMediaStage(),blob=new Blob(['shared review original'],{type:'image/png'}),url=await a.read(blob),key=mediaInfo(url).key;
 await b.read(blob);await store.stage(dataBlob(record().photo),mediaInfo(await registerMedia(dataBlob(record().photo))).key);await store.releaseStage();await a.release();await store.collect();
 const keys=()=>new Promise(resolve=>{const q=db.transaction('media').objectStore('media').getAllKeys();q.onsuccess=()=>resolve(q.result);});
 assert.ok((await keys()).includes(key));assert.ok(mediaInfo(url));await b.release();assert.ok(!(await keys()).includes(key));assert.equal(mediaInfo(url),null);assert.equal((await store.read()).records[0].title,record().title);await b.release();db.close();
});

test('batches over 80 MiB stage originals sequentially, publish small metadata atomically and retain original bytes',async()=>{
 const {preparePhotoBatch,applyPhotoBatch}=await import('../dist/batch-import.js'),{readFileSync}=await import('node:fs');
 const {db,store}=await fixture();await store.write([record()],{},null,[]);const before=await read(db),scope=store.createMediaStage(),jpeg=readFileSync(new URL('fixtures/photo-gps.jpg',import.meta.url)),files=Array.from({length:6},(_,i)=>new File([jpeg,new Uint8Array(16*1024*1024-jpeg.length-1),Uint8Array.of(i)],`large-${i}.jpg`,{type:'image/jpeg'})),progress=[];
 const batch=await preparePhotoBatch(files,{records:(await store.read()).records,read:f=>scope.read(f),today:()=> '2026-10-17',grouping:'together',onProgress:(done,total,info)=>progress.push({done,total,...info})});
 assert.deepEqual(await read(db),before);assert.equal(batch.sources.length,6);assert.equal(progress.at(-1).bytes,96*1024*1024);assert.equal(progress.at(-1).bytes,progress.at(-1).totalBytes);assert.equal(progress.at(-1).done,6);
 const repeated=store.createMediaStage(),duplicates=await preparePhotoBatch([files[0],files[0]],{read:f=>repeated.read(f),today:()=> '2026-10-17'});assert.equal(duplicates.duplicates,1);await repeated.release();assert.ok(mediaInfo(batch.sources[0].photo));
 await store.write(applyPhotoBatch((await store.read()).records,batch.groups,{uuid:()=> 'large-place'}).records,{},null,[]);await scope.release();const disk=await read(db);assert.ok(JSON.stringify(disk).length<10000);const saved=(await store.read()).records.find(r=>r.id==='large-place');assert.equal(saved.photos.length,6);
 for(let i=0;i<6;i++){const original=dataBlob(saved.photos[i]);assert.equal(original.size,files[i].size);assert.deepEqual(new Uint8Array(await original.slice(-1).arrayBuffer()),Uint8Array.of(i));assert.deepEqual(new Uint8Array(await original.slice(0,jpeg.length).arrayBuffer()),new Uint8Array(jpeg));}
 const cancel=store.createMediaStage(),controller=new AbortController(),snapshot=await read(db);await assert.rejects(preparePhotoBatch([new File(['cancel-only'],'cancel.png',{type:'image/png'})],{read:async f=>{const src=await cancel.read(f);controller.abort();return src;},today:()=> '2026-10-17',signal:controller.signal}),/CANCELLED/);await cancel.release();assert.deepEqual(await read(db),snapshot);db.close();
});

test('failed photo staging preserves the saved journal and releases partial review data',async()=>{
 const {db,store}=await fixture();await store.write([record()],{},null,[]);const before=await read(db),scope=store.createMediaStage();await scope.read(new Blob(['temporary'],{type:'image/png'}));const original=db.transaction.bind(db);let fail=true;db.transaction=(names,mode,...rest)=>{const tx=original(names,mode,...rest);if(mode==='readwrite'&&fail){fail=false;queueMicrotask(()=>tx.abort());}return tx;};await assert.rejects(scope.read(new Blob(['quota failure'],{type:'image/png'})));await scope.release();assert.deepEqual(await read(db),before);const keys=await new Promise(resolve=>{const q=db.transaction('media').objectStore('media').getAllKeys();q.onsuccess=()=>resolve(q.result);});assert.equal(keys.length,2);db.close();
});

test('discarding an import does not revoke an identical original already held by an unsaved editor',async()=>{
 const {db,store}=await fixture();await store.write([record()],{},null,[]);const blob=new Blob(['an unsaved editor attachment'],{type:'image/png'}),editorURL=await registerMedia(blob),scope=store.createMediaStage();await scope.read(blob);await scope.release();assert.ok(knownMedia(editorURL,'image'));assert.equal(await dataBlob(editorURL).text(),await blob.text());db.close();
});
