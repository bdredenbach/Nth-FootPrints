import {GEOAPIFY_API_KEY} from './places-config.js';
import {createDiscoveryStore} from './discovery-store.js';
import {samePlaceSource,validatePlaceSource} from './place-source.js';
export const DETAILS_ENDPOINT='https://api.geoapify.com/v2/place-details';
export const detailsId=value=>typeof value==='string'&&/^[a-f0-9]{2,2048}$/i.test(value)?value:'';
export function placeDescription(properties={}){
 const raw=properties.datasource?.raw??{};
 for(const value of [properties.description_international?.en,properties.description,raw['description:en'],raw.description,properties.heritage?.description])if(typeof value==='string'&&value.trim())return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,1200);
 return '';
}
export function descriptionFromDetails(payload,place){
 if(payload?.type!=='FeatureCollection'||!Array.isArray(payload.features))throw Error('Place details could not be read.');
 const expected=validatePlaceSource(place.placeSource),id=detailsId(place.detailsId)||(expected.provider==='geoapify'?expected.id:'');
 for(const f of payload.features.slice(0,50)){
  const p=f?.properties;if(f?.type!=='Feature'||!p)continue;const raw=p.datasource?.raw??{},type={n:'node',w:'way',r:'relation',node:'node',way:'way',relation:'relation'}[raw.osm_type];
  const match=id&&p.place_id===id||samePlaceSource(expected,{provider:'openstreetmap',type,id:String(raw.osm_id??'')});
  if(match)return placeDescription(p);
 }
 // A coordinate lookup may return a neighbouring building. Never borrow its description.
 return '';
}
export function createPlaceDetailsClient({fetch=globalThis.fetch,network=globalThis.navigator,now=Date.now,apiKey=GEOAPIFY_API_KEY,storage,cacheStore=createDiscoveryStore({name:'nth-place-details',maxEntries:200,maxBytes:1024*1024})}={}){
 if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
 const cache=new Map(),pending=new Map(),failures=new Map();let active=0,budget={day:'',attempts:0};
 try{const b=JSON.parse(storage?.getItem('nth-place-details-budget-v1'));if(b&&typeof b.day==='string'&&Number.isInteger(b.attempts)&&b.attempts>=0)budget=b;}catch{}
 const ready=Promise.resolve().then(()=>cacheStore.load()).then(saved=>{for(const e of saved.entries??[])if(typeof e?.id==='string'&&e.id.length<2100&&Number.isFinite(e.at)&&e.at<=now()+300000&&typeof e.description==='string'&&e.description.length<=1200)cache.set(e.id,{...e,description:placeDescription({description:e.description})});}).catch(()=>{});
 const keyOf=p=>{const s=validatePlaceSource(p.placeSource);return `${s.provider}:${s.type??''}:${s.id}`;};
 async function lookup(place){
  if(place.description)return placeDescription({description:place.description});await ready;const key=keyOf(place),hit=cache.get(key);if(hit&&now()-hit.at<30*86400000)return hit.description;
  if(network?.onLine===false)return hit?.description??'';if(!apiKey)throw Error('Place descriptions are not configured.');
  const day=new Date(now()).toISOString().slice(0,10);if(budget.day!==day)budget={day,attempts:0};if(budget.attempts>=100||active>=2)throw Error('Description lookup is temporarily unavailable. You can still save this place.');
  const source=validatePlaceSource(place.placeSource),id=detailsId(place.detailsId)||(source.provider==='geoapify'?source.id:'');const url=new URL(DETAILS_ENDPOINT);if(id)url.searchParams.set('id',id);else{if(!Number.isFinite(place.lat)||!Number.isFinite(place.lng))return '';url.searchParams.set('lat',place.lat);url.searchParams.set('lon',place.lng);}url.searchParams.set('features','details');url.searchParams.set('lang','en');
  budget.attempts++;try{storage?.setItem('nth-place-details-budget-v1',JSON.stringify(budget));}catch{}active++;
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
  try{
   const response=await fetch(url.href,{headers:{'X-API-Key':apiKey},credentials:'omit',referrerPolicy:'no-referrer',signal:abort.signal});if(!response.ok)throw Error('Description could not load. You can still save this place.');
   if(Number(response.headers?.get?.('content-length'))>2*1024*1024)throw Error('Place details are too large.');
   let text;if(response.body?.getReader){const reader=response.body.getReader(),parts=[];let n=0;try{while(true){const r=await reader.read();if(r.done)break;n+=r.value.length;if(n>2*1024*1024){await reader.cancel();throw Error('Place details are too large.');}parts.push(r.value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(n);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length;}text=new TextDecoder().decode(bytes);}else{text=await response.text();if(new TextEncoder().encode(text).length>2*1024*1024)throw Error('Place details are too large.');}
   const description=descriptionFromDetails(JSON.parse(text),place),entry={id:key,at:now(),usedAt:now(),description};cache.set(key,entry);while(cache.size>200)cache.delete(cache.keys().next().value);await cacheStore.put(entry,null).catch(()=>{});return description;
  }finally{clearTimeout(timer);active--;}
 }
 return {ready,description(place){const key=keyOf(place);if(pending.has(key))return pending.get(key);const failed=failures.get(key);if(failed&&now()-failed.at<30000)return Promise.reject(failed.error);const promise=lookup(place).catch(error=>{failures.set(key,{at:now(),error});while(failures.size>200)failures.delete(failures.keys().next().value);throw error;}).finally(()=>pending.delete(key));pending.set(key,promise);return promise;}};
}
