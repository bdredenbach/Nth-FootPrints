import {placeDescription} from './place-details.js';
import {proximityKm} from './nearby-memories.js';
import {hasLocation} from './atlas.js';
// Prototype provider. Replace this one endpoint with a dedicated Photon service before wider distribution.
export const SEARCH_ENDPOINT='https://photon.komoot.io/api/';
const MAX_RESPONSE=256*1024;
const clean=(value,max=160)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
const copy=value=>value.map(r=>({...r,position:{...r.position},...(r.placeSource?{placeSource:{...r.placeSource}}:{})}));
export function samePlacePoint(a,b){return !!a&&!!b&&Math.abs(a.lat-b.lat)<.000001&&Math.abs(((a.lng-b.lng+540)%360)-180)<.000001;}
export function placeResults(payload,{limit=5}={}){
 limit=Math.min(20,Math.max(1,Number.isInteger(limit)?limit:5));
 if(!payload||!Array.isArray(payload.features))throw Error('Search returned unreadable results. Try again later.');
 const results=[],seen=new Set();
 for(const feature of payload.features.slice(0,200)){
  const xy=feature?.geometry?.coordinates,p=feature?.properties;
  if(feature?.geometry?.type!=='Point'||!Array.isArray(xy)||!p||typeof p!=='object')continue;
  const [lng,lat]=xy;if(typeof lat!=='number'||!Number.isFinite(lat)||Math.abs(lat)>90||typeof lng!=='number'||!Number.isFinite(lng)||Math.abs(lng)>180)continue;
  const street=[clean(p.housenumber,40),clean(p.street)].filter(Boolean).join(' ');
  const components=[street,clean(p.district),clean(p.city)||clean(p.locality),clean(p.county),clean(p.state),clean(p.postcode,40),clean(p.country)];
  const unique=components.filter((v,i,all)=>v&&all.findIndex(x=>x.toLowerCase()===v.toLowerCase())===i);
  const address=unique.join(', ').slice(0,500),name=clean(p.name)||street||clean(p.city)||clean(p.locality)||clean(p.country);
  if(!name&&!address)continue;
  const key=typeof p.osm_type==='string'&&/^[NWR]$/.test(p.osm_type)&&/^[0-9]+$/.test(String(p.osm_id))?p.osm_type+p.osm_id:`${name.toLowerCase()}|${lat.toFixed(6)}|${lng.toFixed(6)}`;
  if(seen.has(key))continue;seen.add(key);
  const osmType={N:'node',W:'way',R:'relation'}[p.osm_type],osmId=String(p.osm_id??''),source=osmType&&/^[1-9][0-9]{0,19}$/.test(osmId)&&(typeof p.osm_id!=='number'||Number.isSafeInteger(p.osm_id))?{provider:'openstreetmap',type:osmType,id:osmId}:null,description=placeDescription(p);
  results.push({name:name||address.slice(0,160),address,position:{lat,lng:lng===180?-180:lng},...(source?{placeSource:source}:{}),...(description?{description}:{})});
  if(results.length===limit)break;
 }
 return results;
}
async function readResults(response,limit=5){
 const declared=Number(response.headers?.get('Content-Length'));
 if(declared>MAX_RESPONSE)throw Error('Search returned too much data. Try a more specific address.');
 let text='';
 if(response.body?.getReader){
  const reader=response.body.getReader(),decoder=new TextDecoder();let size=0;
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>MAX_RESPONSE){await reader.cancel();throw Error('Search returned too much data. Try a more specific address.');}text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();}
  finally{reader.releaseLock();}
 }else{text=await response.text();if(new TextEncoder().encode(text).length>MAX_RESPONSE)throw Error('Search returned too much data. Try a more specific address.');}
 try{return placeResults(JSON.parse(text),{limit});}catch(error){if(error instanceof SyntaxError)throw Error('Search returned unreadable results. Try again later.');throw error;}
}
export function createPlaceSearch({fetcher=globalThis.fetch,network=globalThis.navigator,now=Date.now,timeoutMs=12000,minInterval=1500,onState=()=>{},messages={}}={}){
 const chooseMessage=messages.choose??'Choose a result to preview it on the map.',offlineMessage=messages.offline??'Offline. Choose a spot manually or enter coordinates in the editor.';
 let token=0,active=null,busy=false,results=[],status='',nextAllowed=0,sortMode='closest';const cache=new Map();
 const ordered=()=>results.slice().sort((a,b)=>sortMode==='name'?a.name.localeCompare(b.name):((a.km??Infinity)-(b.km??Infinity))||0).slice(0,5);
 const distances=(rows,near)=>rows.map(r=>({...r,...(near?{km:proximityKm(near,r.position)}:{})}));
 function emit(){onState({busy,results:copy(ordered()),status});}
 function cancel(){token++;active?.abort();active=null;busy=false;results=[];status='';emit();}
 return {cancel,sort(mode){sortMode=mode==='name'?'name':'closest';emit();},result:index=>Number.isInteger(index)&&index>=0&&index<ordered().length?copy([ordered()[index]])[0]:null,
  async search(raw,{near=null,sort='closest'}={}){
   cancel();sortMode=sort==='name'?'name':'closest';near=hasLocation(near)?{lat:near.lat,lng:near.lng}:null;const request=token,query=clean(raw,1000);
   if(query.length<3||query.length>200){status='Enter 3–200 characters, including a town or city.';emit();return;}
   if(network?.onLine===false){status=offlineMessage;emit();return;}
   const key=query.toLocaleLowerCase()+(near?`|${near.lat.toFixed(3)},${near.lng.toFixed(3)}`:''),saved=cache.get(key);
   if(saved&&saved.until>now()){results=distances(copy(saved.results),near);status=results.length?chooseMessage:'No places found. Try adding the town, city or street.';emit();return;}
   if(now()<nextAllowed){status=`Please wait ${Math.max(1,Math.ceil((nextAllowed-now())/1000))} seconds before searching again.`;emit();return;}
   nextAllowed=now()+minInterval;busy=true;status='Searching for places…';emit();
   const controller=new AbortController();active=controller;let timedOut=false,timer,aborted;
   const interrupted=new Promise((_,reject)=>{aborted=()=>reject(Object.assign(Error('Search cancelled.'),{name:'AbortError'}));controller.signal.addEventListener('abort',aborted,{once:true});});
   timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
   try{
    const url=new URL(SEARCH_ENDPOINT);url.searchParams.set('q',query);url.searchParams.set('limit',near?'20':'5');url.searchParams.set('lang','en');if(near){url.searchParams.set('lat',near.lat.toFixed(3));url.searchParams.set('lon',near.lng.toFixed(3));url.searchParams.set('zoom','12');url.searchParams.set('location_bias_scale','0.1');}
    const perform=async()=>{
     const response=await fetcher(url.href,{signal:controller.signal,mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',headers:{Accept:'application/json'}});
     if(response.status===429){
      if(request!==token)throw Object.assign(Error('Search cancelled.'),{name:'AbortError'});
      const value=response.headers?.get('Retry-After'),seconds=value&&/^\d+$/.test(value)?Number(value):value?(Date.parse(value)-now())/1000:60;
      nextAllowed=now()+Math.min(300,Math.max(2,Number.isFinite(seconds)?seconds:60))*1000;
      throw Error('Search is busy. Please wait a little before trying again, or choose a spot manually.');
     }
     if(!response.ok)throw Error('Place search is unavailable right now. Try again later or choose a spot manually.');
     return readResults(response,near?20:5);
    };
    const found=await Promise.race([perform(),interrupted]);if(request!==token)return;
    results=distances(found,near);cache.delete(key);cache.set(key,{results:copy(found),until:now()+5*60*1000});while(cache.size>10)cache.delete(cache.keys().next().value);
    status=results.length?chooseMessage:'No places found. Try adding the town, city or street.';
   }catch(error){if(request!==token)return;results=[];status=timedOut?'Search timed out. Try again or choose a spot manually.':error.name==='AbortError'?'Search cancelled.':error instanceof TypeError?'Could not connect to place search. Check your connection or choose a spot manually.':error.message;}
   finally{clearTimeout(timer);controller.signal.removeEventListener('abort',aborted);if(request===token){active=null;busy=false;emit();}}
  }
 };
}
