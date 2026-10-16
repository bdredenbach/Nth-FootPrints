import {proximityKm} from './nearby-memories.js';
import {hasLocation} from './atlas.js';
import {validatePlaceSource} from './place-source.js';
export const DISCOVERY_ENDPOINT='https://overpass-api.de/api/interpreter';
export const MAX_DISCOVERY=600;
const f=(id,label,icon,selectors)=>({id,label,icon,selectors});
// Query fragments are fixed source, never interpolated from a text search.
export const DISCOVERY_GROUPS=[
 {id:'food',label:'Food & Drink',icon:'food',filters:[
  f('restaurants','Restaurants','food',['[amenity=restaurant]','[amenity=food_court]']),f('bars','Bars','drink',['[amenity~"^(bar|pub|biergarten)$"]']),f('coffee','Coffee','coffee',['[amenity=cafe]']),f('brunch','Brunch','food',['[amenity~"^(restaurant|cafe|fast_food)$"][cuisine~"(^|;)(breakfast|brunch)(;|$)"]','[amenity~"^(restaurant|cafe)$"][breakfast~"^(yes|only)$"]']),f('dessert','Dessert','dessert',['[amenity=ice_cream]','[shop~"^(bakery|pastry|confectionery|chocolate|ice_cream)$"]']),f('takeout','Takeout','bag',['[amenity~"^(restaurant|cafe|fast_food|food_court)$"][takeaway~"^(yes|only)$"]','[amenity=fast_food]']),f('delivery','Delivery','truck',['[amenity~"^(restaurant|cafe|fast_food)$"][delivery~"^(yes|only)$"]'])]},
 {id:'things',label:'Things to do',icon:'spark',filters:[
  f('parks','Parks','tree',['[leisure~"^(park|garden|nature_reserve)$"]']),f('gyms','Gyms','gym',['[leisure~"^(fitness_centre|sports_centre)$"]']),f('art','Art','art',['[tourism~"^(gallery|artwork)$"]','[amenity=arts_centre]']),f('attractions','Attractions','spark',['[tourism~"^(attraction|zoo|theme_park|viewpoint|aquarium)$"]']),f('nightlife','Nightlife','drink',['[amenity=nightclub]']),f('music','Live music','music',['[amenity=music_venue]','[live_music=yes]','[theatre:type=concert_hall]']),f('movies','Movies','movie',['[amenity=cinema]']),f('museums','Museums','museum',['[tourism=museum]']),f('libraries','Libraries','book',['[amenity=library]'])]},
 {id:'shopping',label:'Shopping',icon:'cart',filters:[
  f('groceries','Groceries','cart',['[shop~"^(supermarket|greengrocer|grocery|deli|butcher)$"]']),f('beauty','Beauty supplies','beauty',['[shop~"^(cosmetics|perfumery)$"]']),f('dealers','Car dealers','car',['[shop=car]']),f('garden','Home & garden','home',['[shop~"^(garden_centre|doityourself|hardware|furniture|houseware)$"]']),f('apparel','Apparel','shirt',['[shop~"^(clothes|shoes|fashion|boutique)$"]']),f('centers','Shopping centers','shop',['[shop~"^(mall|department_store)$"]']),f('electronics','Electronics','screen',['[shop~"^(electronics|computer|mobile_phone)$"]']),f('sports','Sporting goods','ball',['[shop~"^(sports|outdoor|bicycle)$"]']),f('convenience','Convenience stores','shop',['[shop=convenience]'])],extra:['[shop][shop!~"^(hairdresser|beauty|car_repair|car_parts|laundry|dry_cleaning|bakery|pastry|confectionery|chocolate|ice_cream)$"]']},
 {id:'services',label:'Services',icon:'service',filters:[
  f('hotels','Hotels','bed',['[tourism~"^(hotel|motel|hostel|guest_house|apartment)$"]']),f('atms','ATMs','cash',['[amenity=atm]','[amenity=bank]']),f('salons','Beauty salons','beauty',['[shop~"^(hairdresser|beauty)$"]']),f('rental','Car rental','car',['[amenity=car_rental]']),f('repair','Car repair','repair',['[shop~"^(car_repair|car_parts)$"]','[amenity=vehicle_inspection]']),f('wash','Car wash','car',['[amenity=car_wash]']),f('dryclean','Dry cleaning','shirt',['[shop~"^(dry_cleaning|laundry)$"]']),f('charging','Charging stations','bolt',['[amenity=charging_station]']),f('gas','Gas','fuel',['[amenity=fuel]']),f('health','Hospitals & clinics','health',['[amenity~"^(hospital|clinic|doctors|dentist)$"]','[healthcare~"^(hospital|clinic|doctor|dentist|physiotherapist)$"]']),f('mail','Mail & shipping','mail',['[amenity~"^(post_office|post_box|parcel_locker)$"]','[shop=shipping]']),f('parking','Parking','parking',['[amenity=parking]']),f('pharmacy','Pharmacies','health',['[amenity=pharmacy]'])]},
 {id:'other',label:'Other',icon:'footprint',filters:[],extra:['[amenity~"^(community_centre|social_centre|townhall|place_of_worship|marketplace|drinking_water|toilets)$"]','[historic~"^(monument|memorial|ruins|castle)$"]','[tourism=information]','[amenity][name]','[leisure][name]','[tourism][name]','[historic][name]']}
];
export const discoveryGroup=id=>DISCOVERY_GROUPS.find(g=>g.id===id);
const clean=(v,max=160)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
function countryName(value){const code=clean(value,80);try{return /^[A-Z]{2}$/.test(code)?new Intl.DisplayNames(undefined,{type:'region'}).of(code):code;}catch{return code;}}
export function safePlaceURL(value){const text=clean(value,2048);try{const url=new URL(text);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';}}
function matchesSelector(tags,selector){
 return selector.match(/\[[^\]]+\]/g)?.every(fragment=>{const m=fragment.match(/^\[([a-z_:]+)(!?~|=)?(?:"([^"]*)"|([^\]]*))?\]$/);if(!m)return false;const [,key,op,quoted,plain]=m,val=tags[key];if(!op)return typeof val==='string'&&!!val;if(op==='=')return val===(quoted??plain);const test=new RegExp(quoted??plain).test(typeof val==='string'?val:'');return op==='!~'?!test:test;})??false;
}
export function discoveryFilters(tags,groupId){const group=discoveryGroup(groupId);return group?.filters.filter(f=>f.selectors.some(s=>matchesSelector(tags,s))).map(f=>f.id)??[];}
export function discoveryQuery({center,groupId='food',filterId='',radius=2000}){
 const group=discoveryGroup(groupId);if(!hasLocation(center)||!group||![1000,2000,5000].includes(radius))throw Error('Choose a valid place area and category.');
 const filter=filterId?group.filters.find(f=>f.id===filterId):null;if(filterId&&!filter)throw Error('Choose an available place type.');
 const selectors=filter?filter.selectors:[...group.filters.flatMap(f=>f.selectors),...(group.extra??[])];
 const lat=center.lat.toFixed(3),lng=center.lng.toFixed(3);
 return `[out:json][timeout:15][maxsize:16777216];(${[...new Set(selectors)].map(s=>`nwr${s.replace(/\[([a-z_:]+)/g,'["$1"')}(around:${radius},${lat},${lng});`).join('')});out center ${MAX_DISCOVERY+1};`;
}
export function normalizeDiscovery(payload,{center,groupId='food',filterId='',radius=2000}={}){
 const group=discoveryGroup(groupId);if(!group||!hasLocation(center)||!Array.isArray(payload?.elements))throw Error('The places service returned unreadable results.');if(payload.remark)throw Error('The places service could not complete this area. Try a smaller area or retry later.');
 const seen=new Set(),rows=[];let limited=payload.elements.length>MAX_DISCOVERY;
 for(const element of payload.elements.slice(0,MAX_DISCOVERY)){
  if(!['node','way','relation'].includes(element?.type)||!Number.isSafeInteger(element.id)||element.id<1||!element.tags||typeof element.tags!=='object')continue;
  const source=validatePlaceSource({provider:'openstreetmap',type:element.type,id:String(element.id)}),key=source.type+'/'+source.id;if(seen.has(key))continue;
  const t=element.tags,point={lat:element.type==='node'?element.lat:element.center?.lat,lng:element.type==='node'?element.lon:element.center?.lon};if(!hasLocation(point)||['private','no'].includes(t.access)||t.disused==='yes'||t.abandoned==='yes')continue;
  if(groupId==='other'&&DISCOVERY_GROUPS.filter(g=>g.id!=='other').some(g=>g.filters.some(f=>f.selectors.some(sel=>matchesSelector(t,sel)))||(g.extra??[]).some(sel=>matchesSelector(t,sel))))continue;
  const kinds=discoveryFilters(t,groupId),extra=(group.extra??[]).some(s=>matchesSelector(t,s));if(filterId?!kinds.includes(filterId):!kinds.length&&!extra)continue;
  const km=proximityKm(center,point);if(km>radius/1000)continue;
  const type=group.filters.find(f=>kinds.includes(f.id)),kind=type?.label||(clean(t.shop??t.amenity??t.tourism??t.historic).replaceAll('_',' ')||group.label);
  const name=clean(t.name)||clean(t['name:en'])||clean(t.brand),title=name||kind;
  const address=[clean(t['addr:full'],500)||[clean(t['addr:housenumber'],40),clean(t['addr:street'],160)].filter(Boolean).join(' '),clean(t['addr:city']??t['addr:town']??t['addr:village']),clean(t['addr:state']),clean(t['addr:postcode'],40),clean(t['addr:country'],80)].filter(Boolean).join(', ').slice(0,500);
  const row={id:`osm-${element.type}-${element.id}`,title,category:group.label,kind,kinds,lat:point.lat,lng:point.lng,km,address,phone:clean(t['contact:phone']??t.phone,80),url:safePlaceURL(t['contact:website']??t.website),country:countryName(t['addr:country']),region:clean(t['addr:state'],100),description:clean(t.description,1200),hours:clean(t.opening_hours,400),cuisine:clean(t.cuisine,160).replaceAll(';',', '),brand:clean(t.brand,160),placeSource:source,approximate:element.type!=='node'};
  if(name&&rows.some(p=>p.title.toLocaleLowerCase()===name.toLocaleLowerCase()&&proximityKm(p,row)<.025))continue;
  seen.add(key);rows.push(row);
 }
 rows.sort((a,b)=>a.km-b.km||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));return {items:rows,limited};
}
export function placePrefill(place){return {title:place.title,category:place.category,address:place.address,lat:place.lat,lng:place.lng,phone:place.phone,url:place.url,country:place.country,region:place.region,notes:'',placeSource:validatePlaceSource(place.placeSource)};}
const cancelError=()=>Error('CANCELLED');
function delay(ms,signal){return new Promise((resolve,reject)=>{const timer=setTimeout(done,ms);function done(){signal.removeEventListener('abort',abort);resolve();}function abort(){clearTimeout(timer);reject(cancelError());}signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();});}
async function boundedJSON(response,remaining=2*1024*1024,onBytes=()=>{}){
 const max=Math.min(2*1024*1024,remaining);if(Number(response.headers?.get?.('content-length'))>max){await response.body?.cancel?.();throw Error('This area has too much place data. Choose a smaller area.');}
 if(!response.body?.getReader){const text=await response.text();onBytes(new TextEncoder().encode(text).length);if(new TextEncoder().encode(text).length>max)throw Error('This area has too much place data. Choose a smaller area.');return {payload:JSON.parse(text),bytes:new TextEncoder().encode(text).length};}
 const reader=response.body.getReader(),parts=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('This area has too much place data. Choose a smaller area.');}parts.push(value);}}finally{reader.releaseLock();onBytes(size);}
 const bytes=new Uint8Array(size);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length;}return {payload:JSON.parse(new TextDecoder().decode(bytes)),bytes:size};
}
export function createDiscoveryClient({fetch=globalThis.fetch,now=Date.now,wait=delay,network=globalThis.navigator,storage}={}){
 if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
 let active=null,generation=0,nextAllowed=0,failures=0;const cache=new Map();let budget={day:'',successes:0,attempts:0,bytes:0};
 const day=()=>{const d=new Date(now());return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);};
 try{const saved=JSON.parse(storage?.getItem('nth-discovery-budget-v2')??'null');if(saved?.day===day()&&['successes','attempts','bytes'].every(k=>Number.isInteger(saved[k])&&saved[k]>=0))budget=saved;else {const old=JSON.parse(storage?.getItem('nth-discovery-budget-v1')??'null');if(old?.day===day()){budget={day:day(),successes:0,attempts:Math.max(0,Number(old.requests)||0),bytes:Math.max(0,Number(old.bytes)||0)};}}}catch{}
 function saveBudget(){try{storage?.setItem('nth-discovery-budget-v2',JSON.stringify(budget));}catch{}}
 function allowance(){if(budget.day!==day())budget={day:day(),successes:0,attempts:0,bytes:0};if(budget.successes>=50)throw Error('Today’s 50 successful Places searches are used. Loaded categories are still available. Try new areas tomorrow.');if(budget.attempts>=100||budget.bytes>=5*1024*1024)throw Error('Places has reached today’s service safety limit. Loaded categories are still available. Try new searches tomorrow.');}
 function cached(params,{fresh=false}={}){
  const query=discoveryQuery(params);let hit=cache.get(query);
  // A complete broad result can answer narrower types/radii locally. A truncated
  // result cannot promise that a missing subtype is absent from the area.
  if(!hit)hit=[...cache.values()].reverse().find(h=>!h.result.limited&&h.params.groupId===params.groupId&&!h.params.filterId&&h.params.center.lat.toFixed(3)===params.center.lat.toFixed(3)&&h.params.center.lng.toFixed(3)===params.center.lng.toFixed(3)&&h.params.radius>=params.radius);
  if(!hit||fresh&&now()-hit.at>=1800000)return null;
  const result=structuredClone(hit.result);result.items=result.items.filter(p=>!params.filterId||p.kinds.includes(params.filterId)).map(p=>({...p,km:proximityKm(params.center,p)})).filter(p=>p.km<=params.radius/1000).sort((a,b)=>a.km-b.km||a.title.localeCompare(b.title));return {...result,cached:true,loadedAt:hit.at};
 }

 function cancel(){generation++;active?.abort();active=null;}
 return {cancel,cached,async search(params,{force=false}={}){
  const query=discoveryQuery(params);cancel();const token=generation,hit=!force&&cached(params,{fresh:true});if(hit)return hit;
  if(network?.onLine===false)throw Error('Places discovery needs internet. Saved footprints and downloaded maps are still available.');
  allowance();const abort=new AbortController();active=abort;let timer;
  try{
   const remaining=Math.max(0,nextAllowed-now());if(remaining>0)await wait(remaining,abort.signal);if(abort.signal.aborted)throw cancelError();nextAllowed=now()+3000;allowance();budget.attempts++;saveBudget();
   timer=setTimeout(()=>abort.abort('timeout'),45000);
   const response=await fetch(DISCOVERY_ENDPOINT,{method:'POST',body:new URLSearchParams({data:query}),signal:abort.signal,credentials:'omit',referrerPolicy:'strict-origin-when-cross-origin'});
   if(!response.ok){if(response.status===429||response.status===503){const retry=response.headers?.get?.('retry-after'),seconds=/^\d+$/.test(retry??'')?Number(retry):Math.max(0,(Date.parse(retry)-now())/1000)||30;nextAllowed=now()+Math.min(300,Math.max(3,seconds))*1000;throw Error('Places is busy. Wait a little, then tap Refresh.');}throw Error('Places could not load. Check your connection and tap Refresh.');}
   const body=await boundedJSON(response,5*1024*1024-budget.bytes,n=>{budget.bytes+=n;saveBudget();});const payload=body.payload;if(token!==generation||abort.signal.aborted)throw cancelError();const result=normalizeDiscovery(payload,params);budget.successes++;failures=0;saveBudget();cache.set(query,{at:now(),result,params:structuredClone(params)});while(cache.size>30)cache.delete(cache.keys().next().value);return {...structuredClone(result),cached:false,loadedAt:now()};
  }catch(error){if(token!==generation||abort.signal.reason!=='timeout'&&abort.signal.aborted)throw cancelError();failures++;nextAllowed=Math.max(nextAllowed,now()+Math.min(120000,5000*2**Math.min(failures-1,5)));if(abort.signal.reason==='timeout')throw Error('Places took too long to respond. Try a smaller area or tap Refresh.');if(error instanceof SyntaxError)throw Error('Places returned unreadable data. Tap Refresh later.');if(error instanceof TypeError)throw Error('Places could not connect. Check your internet connection and tap Refresh.');throw error;}finally{clearTimeout(timer);if(token===generation)active=null;}
 }};
}
