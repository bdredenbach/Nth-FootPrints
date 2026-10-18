import {GEOAPIFY_API_KEY} from './places-config.js';
import {createPlaceDetailsClient,detailsId,placeDescription} from './place-details.js';
import {validatePlaceSource} from './place-source.js';
import {samePlacePoint} from './place-search.js';
import {hasLocation} from './atlas.js';
const ENDPOINT='https://api.geoapify.com/v1/geocode/reverse';
const clean=(v,max=500)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
function sourceOf(p){const raw=p.datasource?.raw??{},type={n:'node',w:'way',r:'relation',node:'node',way:'way',relation:'relation'}[raw.osm_type];try{if(typeof raw.osm_id==='number'&&!Number.isSafeInteger(raw.osm_id))return null;return validatePlaceSource({provider:'openstreetmap',type,id:String(raw.osm_id)});}catch{try{return validatePlaceSource({provider:'geoapify',id:p.place_id});}catch{return null;}}}
export function spotAddress(payload){
 const p=payload?.results?.[0]??payload?.features?.[0]?.properties;if(!p||typeof p!=='object')return {address:'',place:null};
 const street=[clean(p.housenumber,40),clean(p.street,160)].filter(Boolean).join(' '),address=clean(p.formatted)||[street,clean(p.city??p.town??p.village,160),clean(p.state,100),clean(p.postcode,40),clean(p.country,80)].filter(Boolean).join(', ').slice(0,500);
 const source=sourceOf(p),name=clean(p.name,160),distance=typeof p.distance==='number'&&Number.isFinite(p.distance)&&p.distance>=0?p.distance:Infinity;
 // A postal address is useful even where no named place has been identified.
 // Only a mapped amenity at/very close to the pin, or a containing named building,
 // can supply a story. Streets/cities and distant neighbours cannot.
 const identified=source&&name&&(p.result_type==='amenity'&&distance<=10||p.result_type==='building'&&distance===0);
 return {address,place:identified?{title:name,lat:p.lat,lng:p.lon,placeSource:source,detailsId:detailsId(p.place_id),description:placeDescription(p)}:null};
}
export function createSpotAddressLookup({fetcher=globalThis.fetch,network=globalThis.navigator,storage,apiKey=GEOAPIFY_API_KEY,now=Date.now,timeoutMs=10000,minInterval=1000,wait=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const cache=new Map();let queue=Promise.resolve(),last=0,budget={day:'',count:0};try{const b=JSON.parse(storage?.getItem('nth-spot-address-budget-v1')??'null');if(typeof b?.day==='string'&&Number.isInteger(b.count)&&b.count>=0)budget=b;}catch{}
 return {lookup(point,{isCurrent=()=>true}={}){
  if(!hasLocation(point))return Promise.reject(Error('Choose valid coordinates first.'));const key=`${point.lat.toFixed(6)},${point.lng.toFixed(6)}`,hit=cache.get(key);if(hit&&now()-hit.at<86400000)return Promise.resolve(structuredClone(hit.value));
  const current=()=>{if(!isCurrent())throw Object.assign(Error('Address lookup cancelled.'),{name:'AbortError'});};
  const result=queue.then(async()=>{current();if(network?.onLine===false)throw Error('Offline. You can enter the address and story manually.');if(!apiKey)throw Error('Address lookup is unavailable.');await wait(Math.max(0,last+minInterval-now()));current();const day=new Date(now()).toISOString().slice(0,10);if(budget.day!==day)budget={day,count:0};if(budget.count>=100)throw Error('Address lookup is paused for today.');budget.count++;try{storage?.setItem('nth-spot-address-budget-v1',JSON.stringify(budget));}catch{}last=now();
   const abort=new AbortController();let timer;const timedOut=new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('Address lookup timed out.'));},timeoutMs);});
   try{const url=new URL(ENDPOINT);for(const [k,v]of Object.entries({lat:point.lat,lon:point.lng,format:'json',lang:'en',limit:1,apiKey}))url.searchParams.set(k,String(v));const response=await Promise.race([fetcher(url.href,{signal:abort.signal,credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',headers:{Accept:'application/json'}}),timedOut]);if(!response.ok)throw Error('Address lookup is unavailable right now.');if(Number(response.headers?.get?.('content-length'))>65536)throw Error('Address response was too large.');
    const read=async()=>{if(!response.body?.getReader){const text=await response.text();if(new TextEncoder().encode(text).length>65536)throw Error('Address response was too large.');return text;}const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,text='';try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>65536){await reader.cancel();throw Error('Address response was too large.');}text+=decoder.decode(next.value,{stream:true});}return text+decoder.decode();}finally{reader.releaseLock();}};
    const text=await Promise.race([read(),timedOut]),value=spotAddress(JSON.parse(text));cache.set(key,{at:now(),value});while(cache.size>50)cache.delete(cache.keys().next().value);return structuredClone(value);
   }finally{clearTimeout(timer);}
  });queue=result.catch(()=>{});return result;
 }};
}
export function createChosenSpotClient({address=createSpotAddressLookup(),details=createPlaceDetailsClient()}={}){
 return {async lookup(point,{selected=null,needAddress=true,needStory=true,isCurrent=()=>true,onResult=()=>{}}={}){
  let failed=false,found=null;const tasks=[];
  const publish=value=>{if(isCurrent())onResult(value);};
  const describe=async place=>{if(!needStory||!place||!isCurrent())return;const description=await details.description(place);publish({notes:description});};
  if(selected?.placeSource)tasks.push(describe({...selected,lat:point.lat,lng:point.lng,description:selected.description??''}).catch(()=>{failed=true;}));
  if(needAddress||needStory&&!selected)tasks.push((async()=>{const reverse=await address.lookup(point,{isCurrent});found=reverse;if(needAddress)publish({address:reverse.address});if(!selected)await describe(reverse.place);})().catch(()=>{failed=true;}));
  await Promise.all(tasks);return {failed,identified:!!(selected?.placeSource||found?.place)};
 }};
}
export function createSpotAutofill({getState,write,lookup,onStatus=()=>{}}){
 let generation=0,lastChoice='';const owned=new Map(),versions=new Map();
 const fields=['title','address','notes'];
 function edit(field){if(fields.includes(field)){versions.set(field,(versions.get(field)??0)+1);owned.delete(field);}}
 return {edit,reset(){generation++;owned.clear();versions.clear();lastChoice='';},cancel(){generation++;},
  async choose(point,selected=null,{includeDetails=true}={}){
   const token=++generation;if(!includeDetails||!hasLocation(point))return;point={lat:point.lat,lng:point.lng};const state=getState(),initial={...state,values:{...state.values}},expected=new Map(fields.map(field=>[field,versions.get(field)??0])),expectedValues=new Map(fields.map(field=>[field,initial.values[field]??''])),eligible=new Set(fields.filter(field=>!initial.values[field]?.trim()||owned.has(field)&&owned.get(field)===initial.values[field]));
   const current=()=>{const s=getState();return token===generation&&s.open&&!s.saving&&s.session===initial.session&&s.positionVersion===initial.positionVersion&&samePlacePoint(s.point,point);};
   const put=(field,value)=>{if(!value||!eligible.has(field)||!current()||(versions.get(field)??0)!==expected.get(field)||getState().values[field]!==expectedValues.get(field))return;write(field,value);expectedValues.set(field,value);owned.set(field,value);};
   if(!current())return;selected=selected&&samePlacePoint(selected.position,point)?selected:null;
   const choice=JSON.stringify(selected?.placeSource??{name:selected?.name??'',lat:point.lat,lng:point.lng});if(lastChoice&&lastChoice!==choice)for(const field of fields)if(owned.has(field)&&owned.get(field)===getState().values[field]){write(field,'');expectedValues.set(field,'');owned.delete(field);}lastChoice=choice;
   if(selected){put('title',selected.name);put('address',selected.address);put('notes',placeDescription({description:selected.description}));}
   const values=getState().values,needAddress=eligible.has('address')&&!values.address?.trim(),needStory=eligible.has('notes')&&!values.notes?.trim();
   if(!current()||!needAddress&&!needStory)return;onStatus('Looking up the address and available place description… You can keep editing.');
   const applied=new Set(),offered=new Set();try{const result=await lookup(point,{selected,needAddress,needStory,isCurrent:current,onResult:part=>{for(const field of ['address','notes'])if(part[field]){offered.add(field);const before=getState().values[field];put(field,part[field]);if(getState().values[field]!==before)applied.add(field);}}});if(!current())return;onStatus(applied.size?`${[applied.has('address')?'Address':'',applied.has('notes')?'place description':''].filter(Boolean).join(' and ')} filled.${result?.failed?' Some details could not load.':''} Review before saving.`:offered.size?'Location kept. Your address and story edits were kept.':result?.failed?'Location kept. Some details could not load; you can enter the address and story manually.':'Location kept. No additional mapped address or description was available; existing text was kept.');}
   catch{if(current())onStatus('Location kept. Details could not load; you can enter the address and story manually.');}
  }
 };
}
