import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {IDBFactory} from 'fake-indexeddb';
import {validateRecord,makeBackup,parseBackup,mergeRecords,filterRecords,withoutStarterSamples,VERSION} from '../dist/model.js';
import {visitsOf,visitById,visitView,placeView,latestVisited,journeyIdsOf,writeVisit,changeVisit,removeVisit,validateVisit,MAX_VISITS,INITIAL_VISIT} from '../dist/visits.js';
import {journeySummary,setJourneyMembership,reconcileJourneys,validateJourneys,checkJourneyLinks} from '../dist/journeys.js';
import {addPhotos,selectPhoto,photosOf} from '../dist/gallery.js';
import {widgetRecord} from '../dist/widget.js';
import {navigationRoute} from '../dist/navigation.js';
import {createDraftRecovery,createDraftStore,validateDraft,clearDraftInTransaction} from '../dist/drafts.js';
const first='2026-10-01T12:00:00.000Z',second='2026-10-15T12:00:00.000Z',third='2026-10-16T12:00:00.000Z';
const image='data:image/png;base64,AQID',other='data:image/jpeg;base64,BAUG',audio='data:audio/ogg;base64,AQID';
const place=(patch={})=>validateRecord({id:'home',title:'Our beach',category:'Nature',favorite:true,rating:4,visited:'2026-10-01',notes:'First sunny day',lat:43,lng:-71,photos:[image],coverIndex:0,audio,tripIds:['trip-a'],updatedAt:first,...patch});
const trip=(id='trip-a')=>({id,title:id,notes:'',coverId:null,createdAt:first,updatedAt:first});
const returns=(r=place(),patch={})=>writeVisit(r,{...r,visited:'2026-10-15',notes:'A windy return',photos:[other],coverIndex:0,photo:other,audio:null,rating:5,tripIds:['trip-b'],lat:44,lng:-72,updatedAt:second,...patch},'new',{newId:()=> 'return-1'});
test('legacy footprints expose one visit without rewriting or copying their saved media',()=>{
 const r=place(),v=visitsOf(r);assert.equal(v.length,1);assert.equal(v[0].id,INITIAL_VISIT);assert.equal(v[0].photo,r.photo);assert.equal(r.visits,undefined);assert.equal(latestVisited(r),r.visited);assert.equal(visitView(r,'initial').notes,r.notes);
});
test('a return keeps the original fields/media, one place identity and separate trip, audio, rating and coordinates',()=>{
 const r=place(),next=returns(r);assert.equal(next.id,r.id);assert.equal(next.photo,image);assert.equal(next.notes,r.notes);assert.equal(next.audio,audio);assert.equal(next.visited,r.visited);assert.equal(next.lat,43);assert.equal(next.visits[0].lat,44);assert.equal(next.visits[0].notes,'A windy return');assert.equal(next.visits[0].audio,null);assert.equal(next.visits[0].rating,5);assert.deepEqual(next.visits[0].tripIds,['trip-b']);assert.equal(visitsOf(next).length,2);assert.equal(latestVisited(next),'2026-10-15');assert.equal(next.firstVisitUpdatedAt,r.updatedAt);assert.equal(r.visits,undefined);
});
test('notes or gallery edits affect only the chosen visit and shared place metadata remains editable',()=>{
 const r=returns(),edited=writeVisit(r,{...visitView(r,'return-1'),title:'Our coast',notes:'Edited return',updatedAt:third},'return-1');assert.equal(edited.title,'Our coast');assert.equal(edited.notes,r.notes);assert.equal(edited.photos[0],image);assert.equal(edited.visits[0].notes,'Edited return');
 const added=changeVisit(edited,'return-1',v=>addPhotos(v,[image]));assert.deepEqual(added.visits[0].photos,[other,image]);assert.deepEqual(added.photos,[image]);
 const original=writeVisit(added,{...visitView(added,'initial'),notes:'Edited first',updatedAt:third},'initial');assert.equal(original.notes,'Edited first');assert.equal(original.visits[0].notes,'Edited return');assert.equal(original.firstVisitUpdatedAt,third);
});
test('visit selection changes the displayed story and photos, and explicit cover selection is independent of latest date',()=>{
 const r=returns();assert.equal(visitView(r,'initial').photo,image);assert.equal(visitView(r,'return-1').photo,other);assert.equal(placeView(r).photo,other);assert.equal(placeView(r).visited,'2026-10-15');
 const chosen=changeVisit(r,'initial',v=>selectPhoto(v,0),{main:true,now:third});assert.equal(placeView(chosen).photo,image);assert.equal(placeView(chosen).visited,'2026-10-15');assert.equal(visitView(chosen,'return-1').photo,other);
});
test('visit validation rejects duplicate/reserved IDs, invalid dates/media, bad covers and nested visit collections',()=>{
 const r=returns(),v=r.visits[0];for(const patch of [{id:'initial'},{id:'new'},{id:'bad id'},{visited:'2026-02-30'},{rating:9},{lat:null},{photos:['https://example.com/image']},{coverIndex:5},{updatedAt:'bad'},{createdAt:'bad'},{visits:[]},{deleted:'yes'},{deleted:true}])assert.throws(()=>validateVisit({...v,...patch}));
 for(const patch of [{visits:[v,v]},{visits:null},{mainVisitId:'missing'},{firstVisitUpdatedAt:'bad'},{firstVisitDeleted:'yes'},{firstVisitDeleted:true}])assert.throws(()=>validateRecord({...r,...patch}));
 assert.throws(()=>writeVisit(r,visitView(r,'initial'),'missing'));
});
test('the visit limit counts removed entries, so it cannot be bypassed by repeated deletions',()=>{
 let r=place({photo:null,photos:[],audio:null});const visit={...r,id:'v',createdAt:first};r=validateRecord({...r,visits:Array.from({length:MAX_VISITS-1},(_,i)=>({...visit,id:'v-'+i,deleted:true}))});assert.throws(()=>writeVisit(r,r,'new'),/200/);assert.throws(()=>validateRecord({...r,visits:[...r.visits,{...visit,id:'extra'}]}),/200/);
});
test('removing a return clears its media and membership, retains the place/other visit and repairs the cover',()=>{
 const r=removeVisit(returns(),'return-1',third);assert.equal(visitsOf(r).length,1);assert.equal(r.id,'home');assert.equal(r.photo,image);assert.equal(r.visits[0].deleted,true);assert.deepEqual(r.visits[0].photos,[]);assert.equal(r.visits[0].audio,null);assert.equal(r.mainVisitId,undefined);assert.equal(placeView(r).photo,image);assert.deepEqual(journeyIdsOf(r),['trip-a']);assert.throws(()=>writeVisit(r,r,'return-1'));
});
test('the original visit can be removed without deleting the place, and remaining visit galleries remain editable',()=>{
 const r=removeVisit(returns(),'initial',third);assert.equal(r.firstVisitDeleted,true);assert.equal(r.photo,null);assert.equal(r.audio,null);assert.deepEqual(r.photos,[]);assert.equal(visitsOf(r)[0].id,'return-1');assert.equal(placeView(r).photo,other);assert.equal(r.lat,43);
 const edited=changeVisit(r,'return-1',v=>addPhotos(v,[image]),{main:true});assert.equal(edited.visits[0].photos.length,2);assert.equal(placeView(edited).photo,other);assert.throws(()=>removeVisit(edited,'return-1'),/Keep at least one/);
});
test('trip dates and covers use the visits belonging to that trip, while retaining unique place counts',()=>{
 const r=returns();const a=journeySummary(trip('trip-a'),[r]),b=journeySummary(trip('trip-b'),[r]);assert.equal(a.count,1);assert.equal(a.start,'2026-10-01');assert.equal(a.end,'2026-10-01');assert.equal(a.cover.photo,image);assert.equal(b.start,'2026-10-15');assert.equal(b.cover.photo,other);
 const more=writeVisit(r,{...visitView(r,'return-1'),visited:'2026-10-16',updatedAt:third},'new',{newId:()=> 'return-2'});const both=journeySummary(trip('trip-b'),[more]);assert.equal(both.count,1);assert.equal(both.places[0].visitCount,2);assert.equal(both.start,'2026-10-15');assert.equal(both.end,'2026-10-16');
});
test('trip manager adds to the latest visit, and removal clears that trip across all active visits',()=>{
 let r=setJourneyMembership([returns()],'trip-c',['home'],third)[0];assert.deepEqual(r.tripIds,['trip-a']);assert.deepEqual(r.visits[0].tripIds,['trip-b','trip-c']);assert.equal(r.visits[0].updatedAt,third);
 r=writeVisit(r,{...visitView(r,'initial'),tripIds:['trip-a','trip-c'],updatedAt:third},'initial');r=setJourneyMembership([r],'trip-c',[],third)[0];assert.ok(visitsOf(r).every(v=>!v.tripIds.includes('trip-c')));assert.equal(r.visits[0].photo,other);
});
test('deleting a trip reconciles all visit memberships and its cover without losing visits or images',()=>{
 const r=returns(),repaired=reconcileJourneys([r],[{...trip('trip-a'),deleted:true,coverId:'home'},trip('trip-b')],third);assert.deepEqual(repaired.records[0].tripIds,[]);assert.equal(repaired.records[0].visits[0].photo,other);assert.equal(repaired.journeys[0].coverId,null);checkJourneyLinks(repaired.records,repaired.journeys);
 assert.throws(()=>makeBackup([r],{},[trip('trip-a')]),/missing journey/);
});
test('format 4 stores each image once and restores every visit, original, marker, selection and trip',()=>{
 const r=returns(),rows=[trip('trip-a'),trip('trip-b')],backup=makeBackup([r],{theme:'night'},rows);assert.equal(backup.formatVersion,4);assert.equal('photo'in backup.records[0],false);assert.equal('photo'in backup.records[0].visits[0],false);const raw=JSON.stringify(backup);assert.equal(raw.split(image).length-1,1);assert.equal(raw.split(other).length-1,1);
 const parsed=parseBackup(raw);assert.deepEqual(parsed.records,[r]);assert.equal(parsed.settings.theme,'night');const removed=removeVisit(r,'return-1',third);assert.deepEqual(parseBackup(JSON.stringify(makeBackup([removed],{},rows))).records,[removed]);
});
test('all earlier backup versions restore as one-visit places; old schemas cannot silently drop visit data',()=>{
 const r=place();for(const formatVersion of [1,2,3]){const old={app:'nth-footprints',formatVersion,records:[{...r}],settings:{theme:'paper'},...(formatVersion===3?{journeys:[trip()]}:{})};if(formatVersion===1){delete old.records[0].photos;delete old.records[0].coverIndex;}if(formatVersion<3)delete old.records[0].tripIds;assert.equal(visitsOf(parseBackup(JSON.stringify(old)).records[0]).length,1);
 const bad={...old,records:[returns()]};assert.throws(()=>parseBackup(JSON.stringify(bad)));
 }
});
test('restore merges independent visits even when the incoming place metadata is older',()=>{
 const a=returns(),b=writeVisit(place(),{...place(),notes:'Different return',visited:'2026-10-16',updatedAt:third},'new',{newId:()=> 'return-2'});const merged=mergeRecords([b],[a]);assert.equal(merged.updated,1);assert.equal(visitsOf(merged.records[0]).length,3);assert.equal(merged.records[0].visits.find(v=>v.id==='return-1').photo,other);assert.equal(mergeRecords(merged.records,[a]).kept,1);
});
test('newer first-visit edits survive restoring a newer unrelated return, and shared place edits merge normally',()=>{
 const a=writeVisit(returns(),{...place(),notes:'Updated first',updatedAt:third},'initial');const b=writeVisit(returns(),{...visitView(returns(),'return-1'),title:'Renamed beach',notes:'Updated return',updatedAt:'2026-10-17T12:00:00.000Z'},'return-1');const merged=mergeRecords([a],[b]).records[0];assert.equal(merged.notes,'Updated first');assert.equal(merged.visits[0].notes,'Updated return');assert.equal(merged.title,'Renamed beach');
});
test('restoring an older backup never revives removed visits, including the first visit and timestamp ties',()=>{
 const old=returns(),removed=removeVisit(old,'return-1',third),again=mergeRecords([removed],[old]).records[0];assert.equal(visitsOf(again).length,1);assert.equal(again.visits[0].deleted,true);
 const firstRemoved=removeVisit(old,'initial',third);assert.equal(mergeRecords([firstRemoved],[old]).records[0].firstVisitDeleted,true);
 const tied={...old,updatedAt:third,visits:old.visits.map(v=>({...v,updatedAt:third}))};assert.equal(mergeRecords([removed],[tied]).records[0].visits[0].deleted,true);assert.equal(mergeRecords([tied],[removed]).records[0].visits[0].deleted,true);
});
test('sort, historical-note search, map location fallback and widget source follow visit history',()=>{
 const r=returns(),later=place({id:'elsewhere',visited:'2026-10-10',tripIds:[]});assert.equal(filterRecords([later,r])[0].id,'home');assert.equal(filterRecords([r],{query:'windy'})[0].id,'home');assert.equal(filterRecords([r],{query:'first sunny'})[0].id,'home');assert.equal(widgetRecord([later,r]).source,other);assert.equal(widgetRecord([later,r]).visited,'2026-10-15');
 const noLocation=returns(place({lat:null,lng:null}));assert.equal(placeView(noLocation).lat,44);assert.equal(placeView(noLocation).lng,-72);
});
test('same-date return visits remain distinct and sorting is stable when the first visit is edited',()=>{
 const r=returns(place({visited:'2026-10-15'}));assert.equal(visitsOf(r).length,2);assert.equal(visitsOf(r)[0].id,'return-1');const edited=writeVisit(r,{...place({visited:'2026-10-15'}),updatedAt:third},'initial');assert.equal(visitsOf(edited)[0].id,'return-1');
});
test('history preserves the intended visit editor and rejects malformed visit references',()=>{
 const route=visitId=>navigationRoute({view:'journal',dialogs:[{id:'details',recordId:'home'},{id:'editor',recordId:'home',visitId}]});assert.equal(route('new').dialogs[1].visitId,'new');assert.equal(route('return-1').dialogs[1].visitId,'return-1');assert.equal(route('bad id').dialogs.length,1);assert.equal(navigationRoute({dialogs:[{id:'editor',recordId:null,visitId:'new'}]}).dialogs.length,0);
});
async function dbOpen(){return new Promise((resolve,reject)=>{const q=new IDBFactory().open('visits',1);q.onupgradeneeded=()=>q.result.createObjectStore('journal');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}
test('visit editor drafts retain their mode, media and trips through restart and reject missing-parent metadata',async()=>{
 let seq=0;const db=await dbOpen(),store=createDraftStore(db),r=createDraftRecovery({store,uuid:()=> 'draft-'+(++seq),read:async blob=>'data:'+blob.type+';base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64')});r.begin();
 const values={title:'Our beach',category:'Nature',visited:'2026-10-15',rating:'5',address:'',notes:'Unfinished return',phone:'',url:'',lat:'44',lng:'-72'};
 for(const visitId of ['new','initial','return-1']){await r.flush({editId:'home',visitId,baseUpdatedAt:first,values,favorite:true,tripIds:['trip-b'],photos:[other],coverIndex:0,audio});const meta=await store.read();assert.equal(meta.version,3);const loaded=await r.hydrate(meta);assert.equal(loaded.visitId,visitId);assert.deepEqual(loaded.photos,[other]);assert.equal(loaded.audio,audio);assert.deepEqual(loaded.tripIds,['trip-b']);}
 const old=await store.read();for(const version of [1,2]){const legacy={...old,version};delete legacy.visitId;assert.equal((await r.hydrate(legacy)).visitId,undefined);}assert.throws(()=>validateDraft({...old,editId:null}));db.close();
});
test('a failed atomic journal write cannot partially add a return visit or clear its recovery draft',async()=>{
 const db=await dbOpen(),store=createDraftStore(db),r=createDraftRecovery({store,uuid:()=> 'draft-visit'});r.begin();await r.flush({editId:'home',visitId:'new',values:{title:'Our beach',category:'Nature',visited:'2026-10-15',rating:'0',address:'',notes:'Unsaved',phone:'',url:'',lat:'',lng:''},favorite:false,photos:[],coverIndex:0});
 const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),original=place(),ctx=vm.createContext({db,records:[original],journeys:[trip()],settings:{theme:'paper'},storageReady:true,withoutStarterSamples,validateJourneys,reconcileJourneys,clearDraftInTransaction,applyTheme(){},render(){},widgetSync:{refresh(){}}});vm.runInContext(source.slice(source.indexOf('function dbPut('),source.indexOf('const widgetPlugin=')),ctx);
 const actual=ctx.dbPut;ctx.dbPut=async()=>{throw Error('Disk full');};await assert.rejects(ctx.changeJournal(rows=>rows.map(v=>returns(v,{tripIds:['trip-a']})),undefined,{clearDraftId:'draft-visit'}),/Disk full/);assert.equal(ctx.records[0],original);assert.equal((await store.read()).visitId,'new');
 ctx.dbPut=actual;await ctx.changeJournal(rows=>rows.map(v=>returns(v,{tripIds:['trip-a']})),undefined,{clearDraftId:'draft-visit'});assert.equal(visitsOf(ctx.records[0]).length,2);assert.equal(await store.read(),null);db.close();
});

test('trip search includes earlier member visits, latest sorting uses the date range end and a known place pin survives missing visit GPS',()=>{
 const r=returns(place(),{lat:null,lng:null});const more=writeVisit(r,{...visitView(r,'return-1'),notes:'Calm return',visited:'2026-10-16',updatedAt:third},'new',{newId:()=> 'return-2'}),summary=journeySummary(trip('trip-b'),[more]);assert.equal(summary.located,1);assert.equal(summary.places[0].lat,43);assert.equal(filterRecords(summary.places,{query:'windy'}).length,1);assert.equal(latestVisited(summary.places[0]),'2026-10-16');
});

test('conflicting removals that leave no active visits reject the restore before any journal mutation',()=>{
 const original=returns(),left=removeVisit(original,'initial',third),right=removeVisit(original,'return-1',third);assert.throws(()=>mergeRecords([left],[right]),/Keep at least one visit/);assert.equal(visitsOf(left).length,1);assert.equal(visitsOf(right).length,1);assert.equal(left.visits[0].deleted,undefined);
});
