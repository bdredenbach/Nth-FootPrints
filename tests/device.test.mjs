import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createDeviceAccess,cameraCancelled} from '../dist/device.js';
const fix={coords:{latitude:45.89,longitude:-123.96,accuracy:8}};

test('native camera explicitly opens camera and reads returned photo bytes',async()=>{
 let options,path;
 const device=createDeviceAccess({native:true,plugins:{Camera:{getPhoto:async o=>{options=o;return {webPath:'https://localhost/_capacitor_file_/photo.jpg'};}}},fetchPhoto:async p=>{path=p;return new Response(new Blob(['photo'],{type:'image/jpeg'}));}});
 const blob=await device.takePhoto();
 assert.equal(options.source,'CAMERA');assert.equal(options.resultType,'uri');assert.equal(options.saveToGallery,false);
 assert.match(path,/_capacitor_file_/);assert.equal(await blob.text(),'photo');assert.equal(blob.type,'image/jpeg');
});
test('native location requests permission and accepts Android approximate access',async()=>{
 let requested,options;
 const device=createDeviceAccess({native:true,plugins:{Geolocation:{checkPermissions:async()=>({location:'prompt',coarseLocation:'prompt'}),requestPermissions:async p=>{requested=p;return {location:'denied',coarseLocation:'granted'};},getCurrentPosition:async o=>{options=o;return fix;}}}});
 assert.deepEqual(await device.currentPosition(),fix);assert.deepEqual(requested,{permissions:['location']});assert.deepEqual(options,{enableHighAccuracy:true,timeout:20000,maximumAge:0});
});
test('denied location never requests a fix or substitutes browser coordinates',async()=>{
 let queried=false;
 const device=createDeviceAccess({native:true,plugins:{Geolocation:{checkPermissions:async()=>({location:'denied'}),requestPermissions:async()=>({location:'denied'}),getCurrentPosition:async()=>{queried=true;return fix;}}},geolocation:{getCurrentPosition:()=>{queried=true;}}});
 await assert.rejects(device.currentPosition(),/not granted/);assert.equal(queried,false);
});
test('browser GPS fallback and invalid native coordinates',async()=>{
 const browser=createDeviceAccess({geolocation:{getCurrentPosition:(ok,err,options)=>{assert.equal(options.maximumAge,0);ok(fix);}}});
 assert.equal(await browser.currentPosition(),fix);
 const native=createDeviceAccess({native:true,plugins:{Geolocation:{checkPermissions:async()=>({location:'granted'}),getCurrentPosition:async()=>({coords:{latitude:999,longitude:0,accuracy:1}})}}});
 await assert.rejects(native.currentPosition(),/valid location/);
});
test('cancelled camera remains distinguishable from denied access or broken photo reads',async()=>{
 assert.equal(cameraCancelled(Error('User cancelled photos app')),true);assert.equal(cameraCancelled(Error('Permission denied')),false);
 const device=createDeviceAccess({native:true,plugins:{Camera:{getPhoto:async()=>({webPath:'missing'})}},fetchPhoto:async()=>new Response('',{status:404})});
 await assert.rejects(device.takePhoto(),/could not be opened/);
});

// Run the actual editor capture/location functions with device and DOM boundaries stubbed.
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const captureFunctions=app.slice(app.indexOf('async function finishCameraPhoto('),app.indexOf('async function toggleFavorite('));
function editor(device){
 const nodes=Object.fromEntries(['editor','editor-error','photo-geotag','lat','lng','location-status','use-location','camera-file'].map(id=>[id,{open:id==='editor',value:id==='lat'?'1':id==='lng'?'2':'',textContent:'',disabled:false}]));
 const context=vm.createContext({device,cameraCancelled,fillEditorRegion:async()=>{},checkpointDraft:async()=>{},checkpointCamera:()=>Promise.resolve(),cameraIntent:null,draftRecovery:null,$:id=>nodes[id],editorSession:1,gpsRequestVersion:0,locationPending:false,cameraPending:false,draftPhoto:'old-photo',pendingPhotoMetadata:null,syncSave:()=>{},attach:async file=>{if(!file)return false;context.draftPhoto=file;return true;}});
 vm.runInContext(captureFunctions,context);return {context,nodes};
}
test('capture attaches first, clears stale coordinates, then fills fresh GPS',async()=>{
 let state;
 state=editor({native:true,takePhoto:async()=>'new-photo',currentPosition:async()=>{assert.equal(state.context.draftPhoto,'new-photo');assert.equal(state.nodes.lat.value,'');assert.equal(state.nodes.lng.value,'');return fix;}});
 await state.context.takePhoto();assert.equal(state.nodes.lat.value,'45.890000');assert.equal(state.nodes.lng.value,'-123.960000');assert.match(state.nodes['location-status'].textContent,/8 m accuracy/);assert.equal(state.context.cameraPending,false);
});
test('camera cancellation keeps previous photo and coordinates without GPS',async()=>{
 let queried=false;const {context,nodes}=editor({native:true,takePhoto:async()=>{throw Error('User cancelled photos app');},currentPosition:async()=>{queried=true;return fix;}});
 await context.takePhoto();assert.equal(context.draftPhoto,'old-photo');assert.equal(nodes.lat.value,'1');assert.equal(queried,false);assert.equal(nodes['editor-error'].textContent,'');
});
test('GPS denial keeps captured photo and leaves no stale pin',async()=>{
 const {context,nodes}=editor({native:true,takePhoto:async()=>'new-photo',currentPosition:async()=>{throw Error('denied');}});
 await context.takePhoto();assert.equal(context.draftPhoto,'new-photo');assert.equal(nodes.lat.value,'');assert.equal(nodes.lng.value,'');assert.match(nodes['location-status'].textContent,/photo is attached/);assert.equal(context.locationPending,false);
});
test('closing/reopening editor discards an old camera result',async()=>{
 let resolve;const {context}=editor({native:true,takePhoto:()=>new Promise(r=>{resolve=r;}),currentPosition:async()=>{throw Error('must not request GPS');}});
 const pending=context.takePhoto();await new Promise(r=>setImmediate(r));context.editorSession++;resolve('late-photo');await pending;assert.equal(context.draftPhoto,'old-photo');
});
test('GPS result cannot overwrite newer manual coordinates',async()=>{
 let resolve;const {context,nodes}=editor({currentPosition:()=>new Promise(r=>{resolve=r;})});
 const pending=context.useLocation();context.gpsRequestVersion++;nodes.lat.value='60';nodes.lng.value='10';resolve(fix);await pending;assert.equal(nodes.lat.value,'60');assert.equal(nodes.lng.value,'10');
});

test('native camera stays closed when its before-launch draft checkpoint fails',async()=>{
 let launched=false;const f=editor({native:true,takePhoto:async()=>{launched=true;}});f.context.checkpointCamera=async()=>{throw Error('The recovery draft could not be saved before opening the camera.');};await f.context.takePhoto();assert.equal(launched,false);assert.match(f.nodes['editor-error'].textContent,/recovery draft could not be saved/);
});
test('restored camera attaches its photo with empty coordinates and never requests later device GPS',async()=>{
 let queried=false;const f=editor({currentPosition:async()=>{queried=true;return fix;}});await f.context.finishCameraPhoto('returned-photo',1,{restored:true});assert.equal(f.context.draftPhoto,'returned-photo');assert.equal(f.nodes.lat.value,'');assert.equal(f.nodes.lng.value,'');assert.equal(queried,false);assert.match(f.nodes['location-status'].textContent,/photo recovered/);
});

test('search location uses a recent approximate fix without prompting again for an existing grant',async()=>{
 let prompts=0,options;const device=createDeviceAccess({native:true,plugins:{Geolocation:{checkPermissions:async()=>({coarseLocation:'granted',location:'denied'}),requestPermissions:async()=>{prompts++;},getCurrentPosition:async o=>{options=o;return fix;}}}});assert.deepEqual(await device.currentPosition({maximumAge:60000,enableHighAccuracy:false}),fix);assert.equal(prompts,0);assert.deepEqual(options,{enableHighAccuracy:false,timeout:20000,maximumAge:60000});
});

test('startup native access requests permission only, accepts approximate, and never obtains or watches a position',async()=>{let prompts=0,positions=0;const d=createDeviceAccess({native:true,plugins:{Geolocation:{checkPermissions:async()=>({location:'prompt',coarseLocation:'prompt'}),requestPermissions:async options=>{prompts++;assert.deepEqual(options,{permissions:['location']});return {location:'denied',coarseLocation:'granted'};},getCurrentPosition:async()=>{positions++;return fix;},watchPosition:async()=>{positions++;}}}});assert.deepEqual(await d.requestLocationPermission(),{state:'granted'});assert.equal(prompts,1);assert.equal(positions,0);});
test('startup access reuses a native grant and handles denial, services off and unavailable web access',async()=>{let prompts=0;const granted=createDeviceAccess({native:true,plugins:{Geolocation:{checkPermissions:async()=>({location:'granted'}),requestPermissions:async()=>prompts++}}});assert.deepEqual(await granted.requestLocationPermission(),{state:'granted'});assert.equal(prompts,0);const denied=createDeviceAccess({native:true,plugins:{Geolocation:{checkPermissions:async()=>({location:'denied'}),requestPermissions:async()=>({location:'denied',coarseLocation:'denied'})}}});assert.deepEqual(await denied.requestLocationPermission(),{state:'denied'});const disabled=createDeviceAccess({native:true,plugins:{Geolocation:{checkPermissions:async()=>{throw Error('Location services are disabled');}}}});await assert.rejects(disabled.requestLocationPermission(),/quick settings/);assert.deepEqual(await createDeviceAccess().requestLocationPermission(),{state:'unavailable'});});
test('browser startup permission respects existing decisions and discards the fix used for its permission prompt',async()=>{let positions=0;const geo={getCurrentPosition(ok){positions++;ok(fix);}};for(const state of ['granted','denied']){const d=createDeviceAccess({geolocation:geo,permissions:{query:async()=>({state})}});assert.deepEqual(await d.requestLocationPermission(),{state});}assert.equal(positions,0);const d=createDeviceAccess({geolocation:geo,permissions:{query:async()=>({state:'prompt'})}});assert.deepEqual(await d.requestLocationPermission(),{state:'granted'});assert.equal(positions,1);});
