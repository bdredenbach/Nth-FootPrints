import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateRecord,makeBackup,parseBackup,validateSettings,filterRecords,mergeRecords,VERSION} from '../dist/model.js';
import {writeVisit,visitsOf,visitView} from '../dist/visits.js';
import {parseTags,normalizeTags,validateLabels,mergeJournalPreferences,scopeRecords,anniversaryMemories,calendarMonth,explorationStats,flattenVisits} from '../dist/journal-tools.js';
import {preparePhotoBatch,applyPhotoBatch} from '../dist/batch-import.js';
import {nearbyCandidates,createNearbyMemories} from '../dist/nearby-memories.js';
import {gpsExif,jpegWithGps,privacyLines,buildPhotoPdf,tripBookVisits,wrapLines,fileStem} from '../dist/export-media.js';
import {readPhotoMetadata} from '../dist/geotags.js';
import {createDeviceAccess} from '../dist/device.js';
const first='2025-10-15T12:00:00.000Z',now='2026-10-15T12:00:00.000Z',later='2026-10-16T12:00:00.000Z';
const image='data:image/png;base64,AQID',other='data:image/jpeg;base64,BAUG';
const place=(patch={})=>validateRecord({id:'one',title:'Our beach',category:'Nature',favorite:true,rating:5,visited:'2025-10-15',notes:'An older visit',lat:43,lng:-71,photos:[image],coverIndex:0,tripIds:['trip-1'],updatedAt:first,...patch});
const repeat=(r=place(),patch={})=>writeVisit(r,{...r,visited:'2026-10-15',notes:'A recent return',rating:2,photos:[other],updatedAt:now,...patch},'new',{newId:()=> 'visit-2'});
const trip={id:'trip-1',title:'Our trip',notes:'',coverId:null,createdAt:first,updatedAt:first};
test('place tags normalize case, copy values and reject empty, oversized or malformed labels',()=>{
 assert.deepEqual(parseTags(' Family, Beach , family, '),['Family','Beach']);assert.deepEqual(normalizeTags(['Été','été']),['Été']);for(const value of [null,[''],['a,b'],['x'.repeat(41)],Array(31).fill('tag')])assert.throws(()=>normalizeTags(value));assert.throws(()=>validateLabels({country:'x'.repeat(81)}));assert.throws(()=>validateLabels({region:1}));
});
test('shared tags/country/region survive return editing without becoming visit-only fields',()=>{
 const r=repeat(place({tags:['Family'],country:'Canada',region:'Ontario'}));assert.deepEqual(r.tags,['Family']);assert.equal(r.country,'Canada');assert.equal(r.visits[0].country,undefined);const edited=writeVisit(r,{...visitView(r,'visit-2'),tags:['Lake'],country:'United States',region:'Maine',updatedAt:later},'visit-2');assert.equal(edited.country,'United States');assert.deepEqual(edited.tags,['Lake']);assert.equal(edited.notes,r.notes);assert.equal(edited.photos[0],image);
});
test('anniversaries include each historical visit and exclude same-year, future and removed visits',()=>{
 const r=repeat(place(),{visited:'2024-10-15'});const rows=anniversaryMemories([r],'2026-10-15');assert.deepEqual(rows.map(x=>x.years),[1,2]);assert.equal(anniversaryMemories([repeat()],'2026-10-15').length,1);assert.equal(anniversaryMemories([place({visited:'2027-10-15'})],'2026-10-15').length,0);assert.throws(()=>anniversaryMemories([],'2026-02-30'));
});
test('leap day memories stay on leap day and calendar grids use Monday starts with correct month lengths',()=>{
 const r=place({visited:'2024-02-29'});assert.equal(anniversaryMemories([r],'2028-02-29').length,1);assert.equal(anniversaryMemories([r],'2026-02-28').length,0);assert.equal(calendarMonth('2024-02').days.length,29);assert.equal(calendarMonth('2026-02').days.length,28);assert.equal(calendarMonth('2026-06').offset,0);assert.throws(()=>calendarMonth('2026-13'));assert.equal(calendarMonth('0004-02').days.length,29);
});
test('tag, trip, country, region, search and favorites filters compose without changing saved visits',()=>{
 const r=repeat(place({tags:['Family'],country:'Canada',region:'Ontario'}),{tripIds:['trip-2']});
 const scoped=scopeRecords([r],{tag:'family',country:'canada',region:'ontario',tripId:'trip-1'});
 assert.equal(scoped.length,1);assert.equal(scoped[0].visited,'2025-10-15');assert.equal(scoped[0].photo,image);assert.deepEqual(scoped[0].matchingVisitIds,['initial']);
 assert.equal(filterRecords(scoped,{query:'older',favorites:true}).length,1);assert.equal(filterRecords(scoped,{query:'recent'}).length,0);assert.equal(scopeRecords([r],{tag:'missing'}).length,0);assert.equal(scopeRecords([r],{tripId:'absent'}).length,0);assert.equal(scopeRecords([r],{country:'elsewhere'}).length,0);assert.equal(scopeRecords([r],{region:'elsewhere'}).length,0);
 assert.equal(r.visits.length,1);assert.equal(r.photo,image);assert.deepEqual(r.tags,['Family']);
});
const retiredFilters=[{id:'old-filter',title:'Old saved filter',rule:{tag:'Family',category:'Nature'},updatedAt:first}];
test('retired saved filters are omitted from loaded settings and new backups without changing labels, visits or originals',()=>{
 const r=repeat(place({tags:['Family'],country:'Canada',region:'Ontario'})),settings={theme:'night',memories:false,collections:retiredFilters};
 assert.deepEqual(validateSettings(settings),{theme:'night',memories:false});assert.equal(settings.collections,retiredFilters);
 const backup=makeBackup([r],settings,[trip]);assert.equal(backup.formatVersion,7);assert.equal('collections'in backup.settings,false);
 const restored=parseBackup(JSON.stringify(backup));assert.deepEqual(restored.records,[r]);assert.deepEqual(restored.settings,{theme:'night',memories:false});assert.equal(restored.records[0].visits[0].photo,other);
 for(const formatVersion of [1,2,3,4])assert.throws(()=>parseBackup(JSON.stringify({...backup,formatVersion})));assert.throws(()=>validateSettings({memories:'true'}));
});
test('versions 5–7 restore old saved-filter settings without reviving them or losing journal contents',()=>{
 const r=repeat(place({tags:['Family'],country:'Canada',region:'Ontario'})),before=structuredClone(r);
 for(const formatVersion of [5,6,7])for(const collections of [retiredFilters,[],null,{obsolete:'ignored'}]){
  const restored=parseBackup(JSON.stringify({app:'nth-footprints',formatVersion,records:[r],journeys:[trip],settings:{theme:'night',memories:false,collections}}));
  assert.deepEqual(restored.records,[r]);assert.deepEqual(restored.settings,{theme:'night',memories:false});assert.equal(restored.journeys[0].id,trip.id);assert.equal('collections'in makeBackup(restored.records,restored.settings,restored.journeys).settings,false);
 }
 assert.deepEqual(r,before);
});
test('restore appearance choice stays independent of retired settings and device permissions',()=>{
 const current={theme:'night',memories:false,collections:retiredFilters},incoming={theme:'paper',memories:true,collections:retiredFilters,nearbyEnabled:true};
 assert.deepEqual(mergeJournalPreferences(current,incoming,false),{theme:'night',memories:false});assert.deepEqual(mergeJournalPreferences(current,incoming,true),{theme:'paper',memories:true});assert.deepEqual(mergeJournalPreferences(current,{theme:'paper'},true),{theme:'paper',memories:false});assert.deepEqual(validateSettings({theme:'paper'}),{theme:'paper'});
});
test('format 4 backups remain readable and older place restores keep newer labels/visits',()=>{
 const original=place(),raw={app:'nth-footprints',formatVersion:4,records:[original],settings:{theme:'paper'},journeys:[trip]};assert.equal(parseBackup(JSON.stringify(raw)).records[0].id,'one');const newer=repeat(place({tags:['New'],country:'Canada',updatedAt:now}));assert.equal(mergeRecords([newer],[original]).records[0].tags[0],'New');
});
test('exploration counts unique places, all active visits/photos/days, case-insensitive labels and milestones',()=>{
 const r=repeat(place({country:'Canada',region:'Ontario'})),b=place({id:'two',country:'canada',region:'ontario',photos:[]}),c=place({id:'three',country:'',region:'',lat:null,lng:null,photos:[]});const s=explorationStats([r,b,c]);assert.equal(s.places,3);assert.equal(s.visits,4);assert.equal(s.photos,2);assert.equal(s.countries.length,1);assert.equal(s.countries[0].count,2);assert.equal(s.regions.length,1);assert.equal(s.unlabelled,1);assert.equal(s.located,2);assert.equal(s.milestones.find(m=>m.label==='A place revisited').reached,true);assert.equal(flattenVisits([r],{query:'older'}).length,1);
});
const fixture=(name,type)=>{const bytes=readFileSync(new URL('fixtures/'+name,import.meta.url));return new File([bytes],name,{type});};const read=async file=>'data:'+file.type+';base64,'+Buffer.from(await file.arrayBuffer()).toString('base64');
test('batch import groups real photo dates/GPS locally and keeps each original byte string',async()=>{
 const files=[fixture('photo-gps.jpg','image/jpeg'),fixture('photo-gps.png','image/png'),fixture('photo-gps.webp','image/webp')],progress=[];const batch=await preparePhotoBatch(files,{read,today:()=> '2026-10-15',onProgress:(done,total)=>progress.push([done,total])});assert.equal(batch.groups.length,1);assert.equal(batch.groups[0].visited,'2026-09-22');assert.equal(batch.groups[0].photos.length,3);assert.ok(batch.groups[0].lat>45);assert.equal(batch.groups[0].dateSource,'Photo date');assert.deepEqual(progress.at(-1),[3,3]);assert.equal(batch.groups[0].photos[0],await read(files[0]));
});
test('batch review never invents GPS or a capture date and supports one-photo groups',async()=>{
 const a=fixture('no-gps.jpg','image/jpeg'),b=new File([Uint8Array.from([1,2,3])],'unknown.gif',{type:'image/gif'});const result=await preparePhotoBatch([a,b],{read,today:()=> '2026-10-15'});assert.equal(result.groups.length,2);assert.ok(result.groups.every(g=>g.lat===null&&g.lng===null&&g.visited==='2026-10-15'));assert.match(result.groups[0].dateSource,/proposed/);const separate=await preparePhotoBatch([fixture('photo-gps.jpg','image/jpeg'),fixture('photo-gps.png','image/png')],{read,today:()=> '2026-10-15',grouping:'individual'});assert.equal(separate.groups.length,2);
});
test('batch duplicate detection includes existing visit galleries and repeated files',async()=>{
 const file=fixture('photo-gps.jpg','image/jpeg'),photo=await read(file),r=repeat(place(),{photos:[photo]});const out=await preparePhotoBatch([file,file],{records:[r],read,today:()=> '2026-10-15'});assert.equal(out.groups.length,0);assert.equal(out.duplicates,2);
});
test('batch limits/type checks and cancellation fail before writing any records',async()=>{
 const f=fixture('photo-gps.jpg','image/jpeg');await assert.rejects(preparePhotoBatch(Array(61).fill(f),{read,today:()=> '2026-10-15'}),/60/);await assert.rejects(preparePhotoBatch([{size:81*1024*1024}],{}),/80 MB/);await assert.rejects(preparePhotoBatch([new File(['x'],'bad.svg',{type:'image/svg+xml'})],{read,today:()=> '2026-10-15'}),/JPG/);const abort=new AbortController();await assert.rejects(preparePhotoBatch([f,f],{read:async file=>{abort.abort();return read(file);},today:()=> '2026-10-15',signal:abort.signal}),/CANCELLED/);
});
test('reviewed batches add new places or returns atomically and preserve existing stories/media',()=>{
 let i=0;const r=place({tags:['Family'],country:'Canada'}),group={selected:true,title:'New lake',visited:'2026-10-15',category:'Nature',notes:'Imported visit',lat:43,lng:-71,photos:[other],tags:['Trip'],country:'',region:'',tripId:'trip-1'};const applied=applyPhotoBatch([r],[{...group,targetId:'one'},group],{journeys:[trip],now,uuid:()=> 'new-'+(++i)});assert.equal(applied.returns,1);assert.equal(applied.added,1);assert.equal(applied.records.length,2);assert.equal(applied.records[0].notes,r.notes);assert.equal(applied.records[0].photos[0],image);assert.deepEqual(applied.records[0].tags,['Family','Trip']);assert.equal(applied.records[0].country,'Canada');assert.equal(applied.records[0].visits[0].notes,'Imported visit');assert.equal(r.visits,undefined);
 assert.throws(()=>applyPhotoBatch([r],[group,{...group,title:''}],{journeys:[trip],uuid:()=> 'id-'+(++i)}));assert.equal(r.visits,undefined);assert.throws(()=>applyPhotoBatch([r],[{...group,targetId:'gone'}],{journeys:[trip]}),/removed/);assert.throws(()=>applyPhotoBatch([r],[group],{journeys:[]}),/trip was removed/);
});
test('GPS JPEG copies replace old APP1 metadata, handle hemispheres/zero/bounds and leave originals intact',()=>{
 const original=readFileSync(new URL('fixtures/photo-gps.jpg',import.meta.url)),before=Buffer.from(original);for(const [lat,lng]of [[43,-71],[-33.987654,151.234567],[0,0],[90,180],[-90,-180]]){const copy=jpegWithGps(original,lat,lng,'2026-10-15'),meta=readPhotoMetadata(copy);assert.equal(meta.status,'found');assert.ok(Math.abs(meta.location.lat-lat)<1e-7);assert.ok(Math.abs(meta.location.lng-lng)<1e-7);assert.equal(meta.takenOn,null);assert.equal(Buffer.from(copy).toString('latin1').split('Exif\0\0').length-1,1);}assert.deepEqual(original,before);for(const p of [[91,0],[0,181],[NaN,0]])assert.throws(()=>gpsExif(...p));assert.throws(()=>jpegWithGps(new Uint8Array([1,2]),0,0));
});
test('export location privacy is explicit and exact coordinates/address never appear in the default or area lines',()=>{
 const r=place({address:'Private exact address',country:'Canada',region:'Ontario'});assert.deepEqual(privacyLines(r),['2025-10-15']);assert.deepEqual(privacyLines(r,{includeDate:false}),[]);assert.deepEqual(privacyLines(r,{location:'area'}),['2025-10-15','Ontario, Canada']);assert.ok(privacyLines(r,{location:'exact'}).includes('43.000000, -71.000000'));assert.ok(privacyLines(r,{location:'exact'}).includes('Private exact address'));assert.throws(()=>privacyLines(r,{location:'guess'}));assert.equal(fileStem('Beach / #1 🏖'),'Beach-1');
});
test('PDF builder has byte-accurate object offsets, valid page/image references and no original photo metadata',async()=>{
 const jpeg=new Uint8Array([255,216,255,217]),blob=buildPhotoPdf([{bytes:jpeg,width:1200,height:1697},{bytes:jpeg,width:1200,height:1697}]),bytes=new Uint8Array(await blob.arrayBuffer()),text=Buffer.from(bytes).toString('latin1');assert.equal(blob.type,'application/pdf');assert.match(text,/\/Count 2/);assert.match(text,/\/MediaBox \[0 0 595.28 841.89\]/);const xref=Number(/startxref\n(\d+)/.exec(text)[1]);assert.equal(text.slice(xref,xref+4),'xref');const offsets=[...text.slice(xref).matchAll(/(\d{10}) 00000 n/g)].map(m=>Number(m[1]));offsets.forEach((offset,i)=>assert.equal(text.slice(offset,offset+String(i+1).length+6),(i+1)+' 0 obj'));assert.throws(()=>buildPhotoPdf([]));assert.throws(()=>buildPhotoPdf([{bytes:new Uint8Array([0]),width:1,height:1}]));
});
test('trip books include only matching active visits and wrap long Unicode words/newlines without dropping text',()=>{
 const r=repeat(place(),{tripIds:['other']});const rows=tripBookVisits([r],'trip-1');assert.equal(rows.length,1);assert.equal(rows[0].visited,'2025-10-15');const ctx={measureText:s=>({width:Array.from(s).length*10})},lines=wrapLines(ctx,'Hello world\n\n😀😀😀😀😀',35);assert.equal(lines.join('').replaceAll(' ',''),'Helloworld😀😀😀😀😀');assert.ok(lines.every(s=>Array.from(s).length<=3));
});
const position=(lat=43,lng=-71,accuracy=10)=>({coords:{latitude:lat,longitude:lng,accuracy}});
test('nearby memories require a previous visit, valid accuracy, radius and an expired cooldown',()=>{
 const r=repeat(),options={today:'2026-10-15',now:100000,radius:500};assert.equal(nearbyCandidates([r],position(),options).length,1);assert.equal(nearbyCandidates([place({visited:'2026-10-15'})],position(),options).length,0);assert.equal(nearbyCandidates([r],position(50),options).length,0);assert.equal(nearbyCandidates([r],position(43,-71,2000),options).length,0);assert.equal(nearbyCandidates([r],position(),{...options,cooldowns:{one:200000}}).length,0);assert.equal(nearbyCandidates([r],position(NaN),options).length,0);
});
const localStore=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),map};};
test('nearby watchers are off by default, opt in explicitly, stop on pause, resume without prompting and enforce cooldowns',async()=>{
 let callback,requests=[],stops=0,instant=100000;const matches=[],storage=localStore(),nearby=createNearbyMemories({getRecords:()=>[repeat()],today:()=> '2026-10-15',storage,now:()=>instant,onMatch:m=>matches.push(m),watch:async(fn,err,options)=>{callback=fn;requests.push(options.request);return async()=>{stops++;}}});await nearby.resume();assert.equal(requests.length,0);await nearby.enable(500);assert.deepEqual(requests,[true]);callback(position());assert.equal(matches.length,1);instant+=31000;callback(position());assert.equal(matches.length,1);await nearby.pause();assert.equal(stops,1);callback(position());assert.equal(matches.length,1);await nearby.resume();assert.deepEqual(requests,[true,false]);await nearby.disable();assert.equal(stops,2);assert.equal(nearby.state.enabled,false);assert.ok(![...storage.map.values()].join('').includes('latitude'));
});
test('late watch startup after pause/disable is removed and cannot show stale reminders',async()=>{
 let resolve,callback,stops=0;const matches=[],nearby=createNearbyMemories({getRecords:()=>[place()],today:()=> '2026-10-15',storage:localStore(),onMatch:m=>matches.push(m),watch:fn=>{callback=fn;return new Promise(r=>{resolve=r;});}});const starting=nearby.enable();await Promise.resolve();await nearby.pause();resolve(async()=>{stops++});await starting;callback(position());assert.equal(stops,1);assert.equal(matches.length,0);await nearby.disable();
});
test('nearby permission failures and storage errors do not leave a running watch',async()=>{
 const denied=createNearbyMemories({watch:async()=>{throw Error('Permission denied');},getRecords:()=>[],today:()=> '2026-10-15',storage:localStore()});await denied.enable();assert.equal(denied.state.enabled,false);assert.match(denied.state.status,/Permission denied/);let stopped=0;const storage=localStore(),n=createNearbyMemories({watch:async()=>async()=>{stopped++},getRecords:()=>[],today:()=> '2026-10-15',storage});await n.enable();storage.setItem=()=>{throw Error('storage')};await n.disable();assert.equal(stopped,1);assert.equal(n.state.enabled,false);
});
test('native device watches use bounded intervals, check permission before restart and clear the exact watch',async()=>{
 const calls=[];let allowed='prompt';const device=createDeviceAccess({native:true,plugins:{Geolocation:{checkPermissions:async()=>({location:allowed}),requestPermissions:async()=>{calls.push('permission');allowed='granted';return {location:allowed}},watchPosition:async(options,fn)=>{calls.push(options);fn(position());return 'watch-id'},clearWatch:async value=>calls.push(value)}}});await assert.rejects(device.watchPositions(()=>{},()=>{}),/Enable nearby/);const stop=await device.watchPositions(()=>{},()=>{},{request:true});assert.equal(calls[0],'permission');assert.equal(calls[1].interval,60000);assert.equal(calls[1].enableHighAccuracy,false);await stop();assert.deepEqual(calls.at(-1),{id:'watch-id'});
});

test('overlapping native/browser pause events clear a location watch only once',async()=>{
 let stops=0,release;const gate=new Promise(resolve=>release=resolve),nearby=createNearbyMemories({getRecords:()=>[],today:()=> '2026-10-15',storage:localStore(),watch:async()=>async()=>{stops++;await gate;}});await nearby.enable();const a=nearby.pause(),b=nearby.pause();await Promise.resolve();assert.equal(stops,1);release();await Promise.all([a,b]);assert.equal(nearby.state.watching,false);await nearby.disable();assert.equal(stops,1);
});

test('quick foreground resume waits for a pending location-watch stop and starts one replacement',async()=>{
 let watches=0,stops=0,release;const gate=new Promise(resolve=>release=resolve),nearby=createNearbyMemories({getRecords:()=>[],today:()=> '2026-10-15',storage:localStore(),watch:async()=>{watches++;return async()=>{stops++;if(stops===1)await gate;}}});await nearby.enable();const paused=nearby.pause();await Promise.resolve();const resumed=nearby.resume();assert.equal(watches,1);release();await Promise.all([paused,resumed]);assert.equal(watches,2);assert.equal(nearby.state.watching,true);await nearby.disable();assert.equal(stops,2);
});
