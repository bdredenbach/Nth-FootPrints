// Explicit, cancellable downloads from the public-domain USGS Topo service.
// The interactive OSM tile service is never used for package downloads.
export const OFFLINE_SOURCE='https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile';
export const OFFLINE_CREDIT='Map services and data available from U.S. Geological Survey, National Geospatial Program.';
// Bound each decoded network image; saved area count and total size follow device capacity.
export const MAP_LIMITS=Object.freeze({tileBytes:512*1024});
const LAT_LIMIT=85.05112878;
const check=signal=>{if(signal?.aborted)throw Error('CANCELLED');};
export function planOfflineArea(center,radiusKm=5,maxZoom=15){
 if(!Number.isFinite(center?.lat)||Math.abs(center.lat)>80||!Number.isFinite(center?.lng)||Math.abs(center.lng)>180||![2,5,10].includes(radiusKm)||![13,15].includes(maxZoom))throw Error('Choose a valid location, area size and detail level.');
 const dy=radiusKm/111.195,dx=dy/Math.cos(center.lat*Math.PI/180);
 const bounds={south:Math.max(-LAT_LIMIT,center.lat-dy),north:Math.min(LAT_LIMIT,center.lat+dy),west:center.lng-dx,east:center.lng+dx};
 const tiles=[],keys=new Set();
 for(let z=0;z<=maxZoom;z++){
  const n=2**z,x=lng=>Math.floor((lng+180)/360*n),y=lat=>Math.max(0,Math.min(n-1,Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n)));
  for(let tx=x(bounds.west);tx<=x(bounds.east);tx++)for(let ty=y(bounds.north);ty<=y(bounds.south);ty++){
   const wrapped=((tx%n)+n)%n,key=`${z}/${wrapped}/${ty}`;
   if(!keys.has(key)){keys.add(key);tiles.push({z,x:wrapped,y:ty,key});}
  }
 }
 return {center:{lat:center.lat,lng:center.lng},bounds,radiusKm,maxZoom,tiles};
}
export function tileURL({z,x,y}){return `${OFFLINE_SOURCE}/${z}/${y}/${x}`;}
export async function readMapTile(response,signal){
 check(signal);if(response.status===404||response.status===204){await response.body?.cancel?.().catch(()=>{});return null;}
 if(!response.ok)throw Error(`Map service returned ${response.status}. Try again later.`);
 if(Number(response.headers.get('content-length'))>MAP_LIMITS.tileBytes)throw Error('Map tile is too large.');
 let bytes;
 if(response.body?.getReader){
  const reader=response.body.getReader(),parts=[];let size=0;
  try{while(true){check(signal);const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAP_LIMITS.tileBytes)throw Error('Map tile is too large.');parts.push(value);}}
  finally{await reader.cancel().catch(()=>{});}
  bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
 }else{bytes=new Uint8Array(await response.arrayBuffer());}
 check(signal);
 if(bytes.length>MAP_LIMITS.tileBytes||bytes.length<32)throw Error('Map service returned an invalid image.');
 const png=[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b),jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(!png&&!jpeg)throw Error('Map service returned an invalid image.');
 const blob=new Blob([bytes],{type:png?'image/png':'image/jpeg'});
 if(globalThis.createImageBitmap){const image=await createImageBitmap(blob);const valid=image.width===256&&image.height===256;image.close();if(!valid)throw Error('Map service returned an invalid tile size.');}
 check(signal);return blob;
}
export function pointInOfflineArea(area,point){
 const b=area?.bounds;if(!b||![b.south,b.north,b.west,b.east,point?.lat,point?.lng].every(Number.isFinite))return false;
 const middle=(b.west+b.east)/2,lng=point.lng+360*Math.round((middle-point.lng)/360);
 return point.lat>=b.south&&point.lat<=b.north&&lng>=b.west&&lng<=b.east;
}
export function createOfflineStore({indexedDB=globalThis.indexedDB}={}){
 let database=null,opening=null;const complete=new Map();
 function open(){
  if(opening)return opening;
  opening=new Promise((resolve,reject)=>{
   if(!indexedDB){reject(Error('Offline map storage is unavailable.'));return;}
   const request=indexedDB.open('nth-footprints-offline-maps',1);
   request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore('areas',{keyPath:'id'});const tiles=db.createObjectStore('tiles',{keyPath:['areaId','key']});tiles.createIndex('key','key');tiles.createIndex('area','areaId');};
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{database=request.result;database.onversionchange=()=>database.close();
    // A process kill can leave staged tiles. Never expose them as a ready area.
    const tx=database.transaction(['areas','tiles'],'readwrite');
    tx.objectStore('areas').getAll().onsuccess=e=>{for(const area of e.target.result)complete.set(area.id,area);const cursor=tx.objectStore('tiles').openKeyCursor();cursor.onsuccess=e=>{const c=e.target.result;if(c){if(!complete.has(c.primaryKey[0]))tx.objectStore('tiles').delete(c.primaryKey);c.continue();}};};
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
   };
  });return opening;
 }
 async function run(stores,mode,work){await open();return new Promise((resolve,reject)=>{const tx=database.transaction(stores,mode);let value;try{work(tx,result=>{value=result;});}catch(error){tx.abort();reject(error);return;}tx.oncomplete=()=>resolve(value);tx.onabort=tx.onerror=()=>reject(tx.error??Error('Offline map storage could not finish.'));});}
 return {
  ready:open,
  list:()=>run(['areas'],'readonly',(tx,set)=>{tx.objectStore('areas').getAll().onsuccess=e=>set(e.target.result);}),
  put:(id,key,blob)=>run(['tiles'],'readwrite',tx=>tx.objectStore('tiles').put({areaId:id,key,blob})),
  async commit(area){await run(['areas','tiles'],'readwrite',tx=>{const count=tx.objectStore('tiles').index('area').count(area.id);count.onsuccess=()=>{if(count.result!==area.count){tx.abort();return;}tx.objectStore('areas').put(area);};});complete.set(area.id,area);},
  async remove(id){await run(['areas','tiles'],'readwrite',tx=>{tx.objectStore('areas').delete(id);const cursor=tx.objectStore('tiles').index('area').openCursor(id);cursor.onsuccess=e=>{const c=e.target.result;if(c){c.delete();c.continue();}};});complete.delete(id);},
  tile:(key,{point}={})=>run(['tiles'],'readonly',(tx,set)=>{const request=tx.objectStore('tiles').index('key').openCursor(key);request.onsuccess=()=>{const c=request.result;if(!c){set(null);return;}if(complete.has(c.value.areaId)&&(!point||pointInOfflineArea(complete.get(c.value.areaId),point)))set(c.value.blob);else c.continue();};})
 };
}
const delay=(ms,signal)=>new Promise((resolve,reject)=>{check(signal);const cancel=()=>{clearTimeout(timer);reject(Error('CANCELLED'));};const timer=setTimeout(()=>{signal?.removeEventListener('abort',cancel);resolve();},ms);signal?.addEventListener('abort',cancel,{once:true});});
export function createOfflineMaps({store=createOfflineStore(),fetcher=globalThis.fetch,network=globalThis.navigator,wait=delay,uuid=()=>crypto.randomUUID(),storage=globalThis.navigator?.storage}={}){
 let controller=null,phase='idle',areas=[],preferred=false;const listeners=new Set();
 const notify=extra=>{const state={phase,areas:areas.slice(),preferred,...extra};for(const fn of listeners)fn(state);};
 const idle=()=>{if(phase!=='idle')throw Error('Finish the current map operation first.');};
 const api={
  get phase(){return phase;},get areas(){return areas.slice();},get preferred(){return preferred;},
  subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
  setPreferred(value){preferred=!!value;notify();},
  async ready(){await store.ready();areas=await store.list();notify();},
  tile:(key,options)=>store.tile(key,options),
  cancel(){if(phase==='downloading'){controller.abort();return true;}return false;},
  async download(plan,name){
   idle();if(network?.onLine===false)throw Error('Connect to the internet to download a map.');
   // Recompute rather than trusting a caller-supplied tile list or URL.
   plan=planOfflineArea(plan.center,plan.radiusKm,plan.maxZoom);
   controller=new AbortController();const signal=controller.signal;phase='downloading';notify({done:0,total:plan.tiles.length,bytes:0});
   const id=uuid();let bytes=0,done=0,saved=0,missing=0,availableMaxZoom=0;
   try{
    areas=await store.list();check(signal);
    await storage?.persist?.().catch(()=>false);check(signal);
    const estimate=await storage?.estimate?.().catch(()=>null);check(signal);
    if(Number.isFinite(estimate?.quota)&&Number.isFinite(estimate?.usage)&&estimate.quota<=estimate.usage)throw Error('Device storage is full. Free space or remove a saved map.');
    for(const tile of plan.tiles){
     check(signal);const request=new AbortController(),abort=()=>request.abort();signal.addEventListener('abort',abort,{once:true});
     const timer=setTimeout(()=>request.abort(),20000);let blob;
     try{blob=await readMapTile(await fetcher(tileURL(tile),{signal:request.signal,credentials:'omit',referrerPolicy:'no-referrer',redirect:'error'}),request.signal);}
     catch(error){check(signal);if(request.signal.aborted)throw Error('Map download timed out. Try again when your connection improves.');throw error;}
     finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
     check(signal);
     if(blob){await store.put(id,tile.key,blob);check(signal);bytes+=blob.size;saved++;availableMaxZoom=Math.max(availableMaxZoom,tile.z);}else missing++;
     done++;notify({done,total:plan.tiles.length,bytes,saved,missing});
     if(done<plan.tiles.length)await wait(120,signal);
    }
    check(signal);if(!saved)throw Error('No offline map coverage is available for this area. Your earlier downloads are unchanged.');phase='committing';notify({done,total:done,bytes,saved,missing});
    const area={id,name:String(name||'Saved area').trim().slice(0,100)||'Saved area',center:plan.center,bounds:plan.bounds,radiusKm:plan.radiusKm,maxZoom:plan.maxZoom,availableMaxZoom,count:saved,requestedCount:done,missingCount:missing,bytes,createdAt:new Date().toISOString(),source:'USGSTopo'};
    await store.commit(area);areas.push(area);preferred=true;notify();return area;
   }catch(error){try{await store.remove(id);}catch{throw Error('Download could not finish. Reopen the app to clear its incomplete map files.');}if(signal.aborted)throw Error('CANCELLED');if(error?.name==='QuotaExceededError')throw Error('Device storage is full. Free space or remove a saved map.');throw error;}
   finally{controller=null;phase='idle';notify();}
  },
  async remove(id){idle();if(!areas.some(a=>a.id===id))return;phase='removing';notify();try{await store.remove(id);areas=areas.filter(a=>a.id!==id);if(!areas.length)preferred=false;}finally{phase='idle';notify();}}
 };
 return api;
}
