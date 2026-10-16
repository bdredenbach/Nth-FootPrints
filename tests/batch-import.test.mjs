import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {preparePhotoBatch,proposePhotoGroups,groupBatchAtLocation,applyPhotoBatch,batchCoordinates} from '../dist/batch-import.js';
// Mutate the actual TIFF rationals/date, exercising the production metadata reader.
function photo(name,{seconds=12.5,date='2026:09:22',gps=true}={}){
 const bytes=Buffer.from(readFileSync(new URL('fixtures/photo-gps.jpg',import.meta.url))),start=bytes.indexOf(Buffer.from('Exif\0\0'))+6;
 const at=bytes.indexOf(Buffer.from('2026:09:22'));assert.ok(at>0);bytes.write(date,at,'ascii');
 const count=bytes.readUInt16BE(start+8);let offset;
 for(let i=0;i<count;i++){const p=start+10+i*12;if(bytes.readUInt16BE(p)===0x8825){offset=bytes.readUInt32BE(p+8);if(!gps)bytes.writeUInt16BE(0xffff,p);}}
 const pos=start+offset;for(let i=0;i<bytes.readUInt16BE(pos);i++){const p=pos+2+i*12;if(bytes.readUInt16BE(p)===2){const rational=start+bytes.readUInt32BE(p+8)+16;bytes.writeUInt32BE(Math.round(seconds*10000),rational);bytes.writeUInt32BE(10000,rational+4);}}
 // A harmless trailing identifier makes unique originals, even at identical coordinates.
 return new File([bytes,name],name+'.jpg',{type:'image/jpeg'});
}
const read=async f=>'data:image/jpeg;base64,'+Buffer.from(await f.arrayBuffer()).toString('base64');
const prepare=(files,grouping='place')=>preparePhotoBatch(files,{read,today:()=> '2026-10-16',grouping});
test('strict GPS matching separates nearby photos while 100m grouping retains detected coordinates for every original',async()=>{
 const files=[photo('one'),photo('same'),photo('jitter',{seconds:12.5001}),photo('near',{seconds:13.5}),photo('far',{seconds:17}),photo('other-day',{date:'2026:09:23'}),photo('no-gps',{gps:false}),photo('no-gps-2',{gps:false})];
 const strict=await prepare(files,'same'),near=await prepare(files);
 assert.deepEqual(strict.groups.map(g=>g.photos.length),[3,1,1,1,1,1]);assert.deepEqual(near.groups.map(g=>g.photos.length),[4,1,1,1,1]);
 assert.notDeepEqual(near.groups[0].photoMetadata[0].location,near.groups[0].photoMetadata[3].location);
 assert.equal(near.groups[0].photos[3],await read(files[3]));assert.equal(near.groups.at(-1).lat,null);
 assert.match(batchCoordinates(near.groups[0]),/^45\./);assert.equal(batchCoordinates(null),'No photo GPS');
});
test('automatic grouping never invents missing photo dates, and uses first-photo distance instead of chaining nearby points',async()=>{
 const out=await prepare([photo('a'),photo('b',{seconds:15}),photo('c',{seconds:17.5}),photo('nodate',{date:'0000:00:00'}),photo('nodate2',{date:'0000:00:00'})]);assert.deepEqual(out.groups.map(g=>g.photos.length),[2,1,1,1]);assert.equal(out.groups.at(-1).metadataDate,null);
});
test('explicit shared location preserves originals, stories, tags, dates and unchecked visits; undo inputs remain unmodified',async()=>{
 const batch=await prepare([photo('a'),photo('b',{seconds:17}),photo('no',{gps:false}),photo('tomorrow',{date:'2026:09:23'}),photo('skip',{seconds:30})],'individual'),groups=batch.groups;
 groups[2].visited=groups[0].visited;groups[0].notes='First';groups[1].notes='Second';groups[0].tags=['Family'];groups[1].tags=['Trip'];groups.at(-1).selected=false;
 const snapshot=structuredClone(groups),merged=groupBatchAtLocation(groups,groups[0].id);assert.deepEqual(groups,snapshot);
 assert.equal(merged.length,3);assert.equal(merged[1].photos.length,3);assert.equal(merged[1].notes,'First\n\nSecond');assert.deepEqual(merged[1].tags,['Family','Trip']);assert.equal(merged[1].photoMetadata[2].location,null);assert.equal(merged[2].visited,'2026-09-23');assert.equal(merged[2].lat,groups[0].lat);assert.equal(merged[0],groups.at(-1));
 let n=0;const saved=applyPhotoBatch([],merged,{uuid:()=> 'saved-'+ ++n});assert.equal(saved.added,2);assert.equal(saved.records[0].photos[2],await read(photo('no',{gps:false})));
});
test('shared location rejects ambiguous destinations and invalid reference coordinates atomically',async()=>{
 const {groups}=await prepare([photo('a'),photo('b',{seconds:17})]);const before=structuredClone(groups);groups[1].targetId='existing';assert.throws(()=>groupBatchAtLocation(groups,groups[0].id),/different destinations/);groups[1].targetId='';assert.deepEqual(groups,before);groups[0].lat=91;assert.throws(()=>groupBatchAtLocation(groups,groups[0].id),/valid latitude/);groups[0].lat=null;assert.throws(()=>groupBatchAtLocation(groups,groups[0].id),/valid latitude/);
});
test('automatic and manual grouping respect the 30-photo gallery limit and repeated manual grouping keeps IDs unique',async()=>{
 const files=Array.from({length:60},(_,i)=>photo('photo-'+i)),auto=await prepare(files,'same');assert.deepEqual(auto.groups.map(g=>g.photos.length),[30,30]);
 const individual=await prepare(files,'individual'),merged=groupBatchAtLocation(individual.groups,individual.groups[0].id);assert.deepEqual(merged.map(g=>g.photos.length),[30,30]);
 const again=groupBatchAtLocation(merged,merged[0].id);assert.equal(new Set(again.map(g=>g.id)).size,again.length);assert.equal(again.flatMap(g=>g.photos).length,60);
});

test('one-footprint mode combines the missing-GPS photos shown in the reported workflow',async()=>{
 const files=Array.from({length:6},(_,i)=>photo('shop-'+i,{gps:false})),automatic=await prepare(files,'same'),together=await prepare(files,'together');
 assert.equal(automatic.groups.length,6);assert.equal(together.groups.length,1);const g=together.groups[0];assert.equal(g.singleFootprint,true);assert.equal(g.targetId,'');assert.equal(g.lat,null);assert.equal(g.lng,null);assert.equal(g.photos.length,6);assert.ok(g.photoMetadata.every(p=>p.location===null));
 const saved=applyPhotoBatch([],together.groups,{uuid:()=> 'single-footprint'});assert.equal(saved.added,1);assert.equal(saved.returns,0);assert.equal(saved.records.length,1);assert.equal(saved.records[0].visits,undefined);assert.deepEqual(saved.records[0].photos,await Promise.all(files.map(read)));
});
test('explicit one-footprint mode spans dates and proposes the first detected date/GPS without changing originals',async()=>{
 const files=[photo('unknown',{gps:false,date:'0000:00:00'}),photo('dated',{gps:false,date:'2026:09:23'}),photo('located',{date:'2026:09:24',seconds:17})],out=await prepare(files,'together'),g=out.groups[0];
 assert.equal(g.visited,'2026-09-23');assert.deepEqual(g.photoMetadata.map(p=>p.takenOn),[null,'2026-09-23','2026-09-24']);assert.equal(g.lat,out.sources[2].location.lat);assert.match(g.locationSource,/located.jpg/);assert.equal(g.photoMetadata[0].location,null);assert.equal(g.photos[0],await read(files[0]));
 const noMetadata=await prepare([photo('empty-a',{gps:false,date:'0000:00:00'}),photo('empty-b',{gps:false,date:'0000:00:00'})],'together');assert.equal(noMetadata.groups.length,1);assert.equal(noMetadata.groups[0].visited,'2026-10-16');assert.equal(noMetadata.groups[0].lat,null);assert.equal(noMetadata.groups[0].lng,null);
});
test('review regrouping reuses selected originals, and does not mutate an edited previous review or source metadata',async()=>{
 const {groups,sources}=await prepare([photo('a',{gps:false}),photo('b',{gps:false}),photo('c',{date:'2026:09:23'})],'individual');groups[0].title='An edited title';groups[0].notes='Unsaved story';const before=structuredClone(groups),original=structuredClone(sources);
 const single=proposePhotoGroups(sources,{grouping:'together',today:()=> '2026-10-16'});assert.equal(single.length,1);assert.equal(single[0].photos.length,3);assert.equal(single[0].title,'a');assert.deepEqual(groups,before);assert.deepEqual(sources,original);
 assert.equal(proposePhotoGroups(sources,{grouping:'individual',today:()=> '2026-10-16'}).length,3);
});
test('one footprint never silently splits or drops photos at the 30-photo limit',async()=>{
 const files=Array.from({length:31},(_,i)=>photo('limit-'+i,{gps:false}));assert.equal((await prepare(files.slice(0,30),'together')).groups[0].photos.length,30);await assert.rejects(prepare(files,'together'),/up to 30/);
 const individual=await prepare(files,'individual'),before=structuredClone(individual.groups);assert.throws(()=>proposePhotoGroups(individual.sources,{grouping:'together',today:()=> '2026-10-16'}),/up to 30/);assert.deepEqual(individual.groups,before);
});
test('one-footprint mode keeps duplicate protection and remains cancellable before saving',async()=>{
 const a=photo('a'),b=photo('b'),source=await read(a),saved=applyPhotoBatch([],[{...(await prepare([a],'together')).groups[0]}],{uuid:()=> 'existing'}).records;
 const out=await preparePhotoBatch([a,b,b],{records:saved,read,today:()=> '2026-10-16',grouping:'together'});assert.equal(out.duplicates,2);assert.equal(out.groups.length,1);assert.deepEqual(out.groups[0].photos,[await read(b)]);assert.equal(saved[0].photo,source);
 const abort=new AbortController();await assert.rejects(preparePhotoBatch([a,b],{read:async f=>{abort.abort();return read(f);},today:()=> '2026-10-16',grouping:'together',signal:abort.signal}),/CANCELLED/);assert.equal(saved.length,1);
});
