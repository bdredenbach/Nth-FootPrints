import {validateJourneys,reconcileJourneys} from '../dist/journeys.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {validateRecord,makeBackup,parseBackup,backupRecord,MAX_PHOTOS,VERSION} from '../dist/model.js';
import {photosOf,coverOf,selectPhoto,addPhotos,replacePhoto,removePhoto,readGalleryFiles,createPhotoViewer,bindPhotoSwipe,horizontalStep} from '../dist/gallery.js';
import {preparePhotoExport} from '../dist/photo-export.js';
import {widgetRecord} from '../dist/widget.js';
const image=(type='png',data='AQID')=>`data:image/${type};base64,${data}`;
const a=image(),b=image('jpeg','BAUG'),c=image('webp','BwgJ');
const place=(extra={})=>({id:'place',title:'A place',category:'Travel',visited:'2026-10-15',rating:4,favorite:false,lat:43,lng:-74,address:'Here',notes:'Memory',phone:'',url:'',updatedAt:'2026-10-15T15:00:00Z',photo:a,audio:null,sampleArt:null,...extra});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('legacy single photos become galleries on append, retaining cover, coordinates and original bytes',()=>{
 const original=place(),copy=structuredClone(original);const next=addPhotos(original,[b,c,b]);
 assert.deepEqual(photosOf(next),[a,b,c]);assert.equal(next.photo,a);assert.equal(next.coverIndex,0);assert.equal(next.lat,43);assert.equal(next.lng,-74);assert.equal(next.visited,original.visited);assert.deepEqual(original,copy);
 assert.deepEqual(photosOf(place({photo:null})),[]);assert.equal(coverOf(original),0);
});
test('gallery validation derives the cover and rejects malformed lists, images and indices',()=>{
 assert.equal(validateRecord(place({photos:[a,b],coverIndex:1})).photo,b);
 for(const bad of [{photos:null},{photos:['https://example.com/a.png']},{photos:[null]},{photos:[a],coverIndex:1},{photos:[a],coverIndex:-1},{photos:[a],coverIndex:0.5},{photos:Array(MAX_PHOTOS+1).fill(a)}])assert.throws(()=>validateRecord(place(bad)));
 assert.equal(validateRecord(place({photos:[],coverIndex:0})).photo,null);
});
test('version 2 backup stores each gallery photo once and restores every byte and cover choice',async()=>{
 const photos=['photo-gps.jpg','photo-gps.png','photo-gps.webp'].map((name,i)=>`data:image/${['jpeg','png','webp'][i]};base64,${fs.readFileSync(new URL('fixtures/'+name,import.meta.url)).toString('base64')}`);
 const original=validateRecord(place({photos,coverIndex:2})),backup=makeBackup([original]);
 assert.equal(backup.formatVersion,VERSION);assert.equal('photo' in backup.records[0],false);
 const restored=parseBackup(JSON.stringify(backup)).records[0];assert.deepEqual(restored,original);
 assert.equal(widgetRecord([restored]).source,photos[2]);
 const exported=preparePhotoExport(restored);assert.equal(exported.mimeType,'image/webp');assert.deepEqual(Buffer.from(await exported.blob.arrayBuffer()),fs.readFileSync(new URL('fixtures/photo-gps.webp',import.meta.url)));
});
test('earlier version 1 backups remain readable and gallery data cannot be mislabeled as version 1',()=>{
 const r=place(),old={app:'nth-footprints',formatVersion:1,settings:{theme:'paper'},records:[r]};
 assert.deepEqual(parseBackup(JSON.stringify(old)).records,[r]);assert.equal('photos'in backupRecord(r),false);
 assert.throws(()=>parseBackup(JSON.stringify({...old,records:[addPhotos(r,[b])]})),/version 2/);
});
test('editing or removing the selected photo leaves its other photos intact',()=>{
 const r=selectPhoto(addPhotos(place(),[b,c]),1),copy=structuredClone(r);
 const replacement=replacePhoto(r,image('gif','CgsM'));assert.deepEqual(replacement.photos,[a,image('gif','CgsM'),c]);assert.equal(replacement.coverIndex,1);
 const removed=removePhoto(r);assert.deepEqual(removed.photos,[a,c]);assert.equal(removed.photo,c);assert.equal(removed.coverIndex,1);assert.deepEqual(r,copy);
 assert.equal(removePhoto(place()).photo,null);assert.equal(removePhoto(place()).coverIndex,0);
 assert.equal(replacePhoto(r,c).coverIndex,2);assert.deepEqual(replacePhoto(r,c).photos,r.photos);
});
test('multi-file reads preserve order, report progress and reject a batch without partial journal writes',async()=>{
 const files=[{name:'a',type:'image/png',size:3},{name:'b',type:'image/jpeg',size:3}],progress=[];
 const read=file=>Promise.resolve(file.name==='a'?a:b);const results=await readGalleryFiles(files,{read,onProgress:(done,total)=>progress.push([done,total])});
 assert.deepEqual(results,[a,b]);assert.deepEqual(progress,[[0,2],[1,2],[1,2],[2,2]]);
 await assert.rejects(readGalleryFiles([...files,{type:'image/svg+xml',size:1}],{read}),/JPG/);
 await assert.rejects(readGalleryFiles([{type:'image/png',size:21*1024*1024}],{read}),/20 MB/);
 await assert.rejects(readGalleryFiles(Array(MAX_PHOTOS+1).fill(files[0]),{read}),/up to/);
});
test('closing a detail page during an image read cancels the batch before any attachment is returned',async()=>{
 const wait=deferred(),abort=new AbortController();const pending=readGalleryFiles([{type:'image/png',size:3}],{read:()=>wait.promise,signal:abort.signal});abort.abort();wait.resolve(a);await assert.rejects(pending,/CANCELLED/);
});
test('rapid left/right selections finish on the last viewed cover, coalescing intermediate writes',async()=>{
 const wait=deferred(),saved=[],shown=[];const viewer=createPhotoViewer({record:addPhotos(place(),[b,c]),save:async photo=>{saved.push(photo);if(saved.length===1)await wait.promise;},onChange:state=>shown.push(state.index)});
 const pending=viewer.move(1);viewer.move(1);viewer.move(-1);wait.resolve();await pending;
 assert.equal(viewer.getIndex(),1);assert.deepEqual(saved,[b,b]);assert.deepEqual(shown,[0,1,2,1]);
});
test('a rejected cover write rolls back to the last saved photo and reports the failure',async()=>{
 const errors=[];let fail=false;const viewer=createPhotoViewer({record:addPhotos(place(),[b,c]),save:async()=>{if(fail)throw Error('Out of storage');},onError:message=>errors.push(message)});
 await viewer.move(1);fail=true;await viewer.move(1);assert.equal(viewer.getIndex(),1);assert.deepEqual(errors,['Out of storage']);
});
test('a pending cover remains committed after closing, with no callbacks into the closed page',async()=>{
 const wait=deferred(),shown=[];let saved;
 const viewer=createPhotoViewer({record:addPhotos(place(),[b]),save:async value=>{await wait.promise;saved=value;},onChange:value=>shown.push(value.index)});
 const pending=viewer.move(1);viewer.destroy();const count=shown.length;wait.resolve();await pending;assert.equal(saved,b);assert.equal(shown.length,count);assert.equal(viewer.move(-1),undefined);
});
test('horizontal photo gestures ignore vertical scrolling, diagonal drags and short taps',()=>{
 assert.equal(horizontalStep(-80,3),1);assert.equal(horizontalStep(80,3),-1);assert.equal(horizontalStep(10,60),0);assert.equal(horizontalStep(50,50),0);assert.equal(horizontalStep(10,2),0);
 const handlers={},moves=[],el={addEventListener:(e,f)=>handlers[e]=f,removeEventListener:(e)=>delete handlers[e],setPointerCapture(){},hasPointerCapture:()=>false};
 const cleanup=bindPhotoSwipe(el,{move:step=>moves.push(step)}),target={closest:()=>null};
 const event=(x,y)=>({pointerId:1,clientX:x,clientY:y,target,preventDefault(){}});
 handlers.pointerdown(event(100,100));handlers.pointermove(event(20,101));handlers.lostpointercapture({...event(20,101),target:{}});handlers.pointerup(event(20,101));assert.deepEqual(moves,[1]);
 handlers.pointerdown(event(10,10));handlers.pointercancel(event(80,10));handlers.pointerup(event(80,10));assert.deepEqual(moves,[1]);cleanup();assert.deepEqual(handlers,{});
});
test('serialized record changes preserve a gallery selection alongside favorite and settings edits',async()=>{
 const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),first=deferred();let calls=0;
 const context=vm.createContext({journeys:[],records:[addPhotos(place(),[b])],settings:{theme:'paper'},commit:async(rows,settings)=>{if(++calls===1)await first.promise;context.records=rows;context.settings=settings;}});
 vm.runInContext(app.slice(app.indexOf('let journalWrites='),app.indexOf('const widgetPlugin=')),context);
 const photo=context.changeJournal(rows=>rows.map(r=>selectPhoto(r,1))),favorite=context.changeJournal(rows=>rows.map(r=>({...r,favorite:true}))),theme=context.changeJournal(rows=>rows,()=>({theme:'night'}));
 first.resolve();await Promise.all([photo,favorite,theme]);assert.equal(context.records[0].photo,b);assert.equal(context.records[0].favorite,true);assert.equal(context.settings.theme,'night');
});
test('detail UI places upload after coordinates, navigates the actual image, and persists the chosen cover',async()=>{
 const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),r=addPhotos(place(),[b]);
 const ids=['details','details-content','detail-carousel','detail-image','gallery-count','gallery-thumbs','photo-position','photo-previous','photo-next','gallery-files','gallery-status'];
 const nodes=Object.fromEntries(ids.map(id=>[id,{open:id==='details',src:a,textContent:'',innerHTML:'',dataset:{},getAttribute(name){return this[name];},addEventListener(){},removeEventListener(){}}]));
 const buttons=[0,1].map(i=>({dataset:{photoIndex:String(i)},setAttribute(name,value){this[name]=value;}}));
 const context=vm.createContext({$:id=>nodes[id],records:[r],detailRevision:0,detailId:null,detailViewer:null,detailCleanup:null,detailUpload:null,galleryWrites:Promise.resolve(),journalWrites:Promise.resolve(),MAX_PHOTOS,photosOf,coverOf,selectPhoto,createPhotoViewer,bindPhotoSwipe,document:{querySelectorAll:()=>buttons},toast(){},art:r=>r.photo,photoAlt:()=>'',esc:s=>s??'',date:s=>s,icon:()=>'',isDemo:()=>false,directions:()=>'',show(){nodes.details.open=true;},matchMedia:()=>({matches:true}),changeJournal:async transform=>{context.records=transform(context.records);}});
 vm.runInContext(app.slice(app.indexOf('async function openDetail('),app.indexOf('function refreshDraft()')),context);
 await context.openDetail('place');const html=nodes['details-content'].innerHTML;
 assert.ok(html.indexOf('43.000000°')<html.indexOf('Upload more photos'));assert.match(html,/id="gallery-files" type="file" multiple/);
 nodes['photo-next'].onclick();await context.galleryWrites;
 assert.equal(nodes['detail-image'].src,b);assert.equal(nodes['photo-position'].textContent,'2 / 2');assert.equal(context.records[0].photo,b);assert.equal(context.records[0].lat,43);assert.equal(buttons[1]['aria-pressed'],'true');
 await context.openDetail('place');assert.equal(nodes['detail-image'].src,b);
});
