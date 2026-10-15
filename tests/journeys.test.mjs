import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {IDBFactory} from 'fake-indexeddb';
import {activeJourneys,recordJourneyIds,validateJourney,validateJourneys,journeyRecords,journeySummary,setJourneyMembership,reconcileJourneys,mergeJourneys,checkJourneyLinks} from '../dist/journeys.js';
import {makeBackup,parseBackup,mergeRecords,validateRecord,filterRecords,withoutStarterSamples} from '../dist/model.js';
import {createDraftStore,createDraftRecovery,clearDraftInTransaction} from '../dist/drafts.js';
const old='2026-10-14T12:00:00.000Z',now='2026-10-15T12:00:00.000Z';
const trip=(changes={})=>validateJourney({id:'trip-1',title:'Our weekend',notes:'The coast',createdAt:old,updatedAt:old,...changes});
const place=(changes={})=>validateRecord({id:'stop-1',title:'The beach',category:'Nature',favorite:true,rating:5,visited:'2026-10-14',lat:0,lng:0,notes:'A lovely day',updatedAt:old,tripIds:['trip-1'],...changes});
test('journey validation bounds and copies metadata and memberships',()=>{
 assert.equal(trip({title:'  Weekend  '}).title,'Weekend');const ids=['trip-1'];assert.notEqual(recordJourneyIds(ids),ids);
 for(const patch of [{title:''},{title:'x'.repeat(161)},{notes:'x'.repeat(2001)},{id:'invalid id'},{createdAt:'bad'},{coverId:'bad id'},{deleted:'yes'}])assert.throws(()=>trip(patch));
 for(const value of [null,'trip-1',['trip-1','trip-1'],['bad id'],Array.from({length:21},(_,i)=>'trip-'+i)])assert.throws(()=>recordJourneyIds(value));
 assert.throws(()=>validateJourneys([trip(),trip()]));assert.throws(()=>validateJourneys(Array(1001).fill(trip())));
});
test('trip summary has chronological stops, automatic date range, real geotags and a selected cover',()=>{
 const a=place(),b=place({id:'stop-2',visited:'2026-10-10',lat:null,lng:null,photo:'data:image/png;base64,AQID'}),c=place({id:'other',tripIds:[]});
 const s=journeySummary(trip({coverId:'stop-1'}),[a,b,c]);assert.deepEqual(s.places.map(r=>r.id),['stop-2','stop-1']);assert.equal(s.cover,a);assert.equal(s.start,'2026-10-10');assert.equal(s.end,'2026-10-14');assert.equal(s.located,1);
 assert.equal(journeySummary(trip(),[a,b]).cover,b);assert.equal(journeySummary(trip(),[]).cover,null);assert.equal(journeySummary(trip(),[]).start,null);
});
test('membership changes touch only affected records and retain photos and other journeys',()=>{
 const a=place({tripIds:['trip-1','trip-2'],photo:'data:image/png;base64,AQID'}),b=place({id:'stop-2',tripIds:['trip-2']}),untouched=place({id:'stop-3',tripIds:[]});
 const rows=setJourneyMembership([a,b,untouched],'trip-1',['stop-2'],now);assert.deepEqual(rows[0].tripIds,['trip-2']);assert.deepEqual(rows[1].tripIds,['trip-2','trip-1']);assert.equal(rows[0].photo,a.photo);assert.equal(rows[0].updatedAt,now);assert.equal(rows[2],untouched);
 assert.throws(()=>setJourneyMembership([place({tripIds:Array.from({length:20},(_,i)=>'j'+i)})],'extra',['stop-1']));
});
test('removing a trip clears membership and cover without deleting any memories',()=>{
 const rows=[place(),place({id:'stop-2',tripIds:['trip-1','trip-2']})];const result=reconcileJourneys(rows,[trip({deleted:true,coverId:'stop-1'}),trip({id:'trip-2'})],now);
 assert.equal(result.records.length,2);assert.deepEqual(result.records[0].tripIds,[]);assert.deepEqual(result.records[1].tripIds,['trip-2']);assert.equal(result.journeys[0].coverId,null);assert.equal(activeJourneys(result.journeys).length,1);
});
test('a deleted or removed cover is repaired and the next photo is used',()=>{
 const first=place(),next=place({id:'stop-2',photo:'data:image/png;base64,AQID'}),j=trip({coverId:first.id});
 const result=reconcileJourneys([next],[j],now);assert.equal(result.journeys[0].coverId,null);assert.equal(journeySummary(result.journeys[0],result.records).cover.id,next.id);
 const removed=reconcileJourneys([{...first,tripIds:[]},next],[j],now);assert.equal(removed.journeys[0].coverId,null);assert.equal(removed.records[0].id,first.id);
});
test('backup format 3 round trips trip covers, memberships, tombstones, galleries and settings',()=>{
 const records=[place({photos:['data:image/png;base64,AQID','data:image/jpeg;base64,BAUG'],coverIndex:1,tripIds:['trip-1','trip-2']})],journeys=[trip({coverId:'stop-1'}),trip({id:'trip-2'}),trip({id:'removed',deleted:true})];
 const backup=makeBackup(records,{theme:'night'},journeys);assert.equal(backup.formatVersion,3);assert.equal('photo'in backup.records[0],false);
 const restored=parseBackup(JSON.stringify(backup));assert.deepEqual(restored.records,records);assert.deepEqual(restored.journeys,journeys);assert.equal(restored.settings.theme,'night');
});
test('legacy backups import with no trips; incompatible old-schema trip data is rejected',()=>{
 const r=place();delete r.tripIds;
 for(const formatVersion of [1,2]){const b={app:'nth-footprints',formatVersion,records:[r],settings:{theme:'paper'}};assert.deepEqual(parseBackup(JSON.stringify(b)).journeys,[]);assert.throws(()=>parseBackup(JSON.stringify({...b,journeys:[trip()]})),/version 3/);assert.throws(()=>parseBackup(JSON.stringify({...b,records:[place()]})),/version 3/);}
});
test('a malformed backup cannot silently drop trip links or invalid covers',()=>{
 assert.throws(()=>makeBackup([place()],{},[]),/missing journey/);assert.throws(()=>makeBackup([place()],{},[trip({coverId:'absent'})]),/cover/);
 const b=makeBackup([place()],{},[trip()]);b.journeys=[];assert.throws(()=>parseBackup(JSON.stringify(b)),/missing journey/);
 b.journeys=[trip({deleted:true})];assert.throws(()=>parseBackup(JSON.stringify(b)),/missing journey/);
});
test('restoring an older backup cannot resurrect a removed journey or its memberships',()=>{
 const deleted=trip({deleted:true,updatedAt:now}),saved=[place({tripIds:[],updatedAt:now})];const merged=mergeRecords(saved,[place()]).records,trips=mergeJourneys([deleted],[trip()]);
 const repaired=reconcileJourneys(merged,trips);assert.deepEqual(repaired.records[0].tripIds,[]);assert.equal(activeJourneys(repaired.journeys).length,0);
 assert.equal(mergeJourneys([trip({updatedAt:now})],[deleted])[0].deleted,true);assert.equal(mergeJourneys([deleted],[trip({updatedAt:now})])[0].deleted,true);
});
test('newer trip edits merge independently of newer footprint edits',()=>{
 const trips=mergeJourneys([trip()],[trip({title:'A longer trip',updatedAt:now})]);assert.equal(trips[0].title,'A longer trip');assert.equal(mergeJourneys(trips,[trip()])[0].title,'A longer trip');
 const repaired=reconcileJourneys([place({updatedAt:now})],trips);assert.equal(repaired.records[0].updatedAt,now);checkJourneyLinks(repaired.records,repaired.journeys);
});
test('trip filtering composes with search, categories, favorites and map location eligibility',()=>{
 const a=place(),b=place({id:'b',favorite:false,title:'Market',category:'Dining'}),c=place({id:'c',tripIds:[]});const members=journeyRecords([a,b,c],'trip-1');
 assert.deepEqual(filterRecords(members,{favorites:true}).map(r=>r.id),[a.id]);assert.deepEqual(filterRecords(members,{query:'market',category:'Dining'}).map(r=>r.id),[b.id]);assert.equal(filterRecords(members,{query:'market',category:'Nature'}).length,0);
});
async function journal(){const idb=new IDBFactory();return new Promise((resolve,reject)=>{const request=idb.open('journey-test',1);request.onupgradeneeded=()=>request.result.createObjectStore('journal');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
test('real journal transaction persists memberships, trip metadata and draft cleanup atomically',async()=>{
 const db=await journal(),c=vm.createContext({db,journeys:[],clearDraftInTransaction});vm.runInContext(source.slice(source.indexOf('function dbPut('),source.indexOf('async function commit(')),c);
 await c.dbPut([place()],{theme:'night'},'draft-id',[trip({coverId:'stop-1'})]);const state=await new Promise((resolve,reject)=>{const r=db.transaction('journal').objectStore('journal').get('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});assert.equal(state.records[0].tripIds[0],state.journeys[0].id);assert.equal(state.journeys[0].coverId,state.records[0].id);db.close();
});
test('failed trip persistence leaves both in-memory records and journeys intact; queued edits still run',async()=>{
 let fail=true,writes=0;const initial=place(),initialTrip=trip();const c=vm.createContext({journeys:[initialTrip],records:[initial],settings:{theme:'paper'},storageReady:true,withoutStarterSamples,validateJourneys,reconcileJourneys,dbPut:async()=>{writes++;if(fail)throw Error('Disk full');},applyTheme(){},render(){},widgetSync:{refresh(){}}});
 vm.runInContext(source.slice(source.indexOf('async function commit('),source.indexOf('const widgetPlugin=')),c);
 await assert.rejects(c.changeJournal(rows=>setJourneyMembership(rows,'trip-1',[]),undefined,{journeys:rows=>rows.map(j=>({...j,title:'Changed'}))}),/Disk full/);assert.equal(c.records[0],initial);assert.equal(c.journeys[0].title,'Our weekend');
 fail=false;await c.changeJournal(rows=>setJourneyMembership(rows,'trip-1',[]),undefined,{journeys:rows=>rows.map(j=>({...j,title:'Saved'}))});assert.equal(c.records[0].tripIds.length,0);assert.equal(c.journeys[0].title,'Saved');assert.equal(writes,2);
});
test('trip selections survive a recovery draft, including recovery of older draft metadata',async()=>{
 const db=await journal(),store=createDraftStore(db),r=createDraftRecovery({store,uuid:()=> 'draft-1',read:async blob=>'data:'+blob.type+';base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64')});r.begin();
 const values={title:'An unfinished stop',category:'Travel',visited:'2026-10-15',rating:'0',address:'',notes:'',phone:'',url:'',lat:'',lng:''};await r.flush({values,favorite:false,tripIds:['trip-1'],photos:[],coverIndex:0,audio:null});const draft=await store.read();assert.equal(draft.version,2);assert.deepEqual((await r.hydrate(draft)).tripIds,['trip-1']);
 const legacy={...draft,version:1};delete legacy.tripIds;assert.deepEqual((await r.hydrate(legacy)).tripIds,[]);db.close();
});
