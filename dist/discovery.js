import {proximityKm} from './nearby-memories.js';
import {hasLocation} from './atlas.js';
import {validatePlaceSource} from './place-source.js';
import {createDiscoveryStore,trimSavedSearches} from './discovery-store.js';
import {detailsId,placeDescription} from './place-details.js';
import {GEOAPIFY_API_KEY} from './places-config.js';
export const DISCOVERY_ENDPOINT='https://api.geoapify.com/v2/places';
export const MAX_DISCOVERY=500;
const f=(id,label,icon,selectors)=>({id,label,icon,selectors});
// OSM tag rules supplement Geoapify categories, including brunch/delivery tags.
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
const clean=(value,max=160)=>{const v=typeof value==='number'&&Number.isFinite(value)?String(value):value;return typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';};
function countryName(value){const code=clean(value,80);try{return /^[A-Z]{2}$/.test(code)?new Intl.DisplayNames(undefined,{type:'region'}).of(code):code;}catch{return code;}}
export function safePlaceURL(value){const text=clean(value,2048);try{const url=new URL(text);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';}}
function matchesSelector(tags,selector){
 return selector.match(/\[[^\]]+\]/g)?.every(fragment=>{const m=fragment.match(/^\[([a-z_:]+)(!?~|=)?(?:"([^"]*)"|([^\]]*))?\]$/);if(!m)return false;const [,key,op,quoted,plain]=m,val=tags[key];if(!op)return typeof val==='string'&&!!val;if(op==='=')return val===(quoted??plain);const test=new RegExp(quoted??plain).test(typeof val==='string'?val:'');return op==='!~'?!test:test;})??false;
}
export function discoveryFilters(tags,groupId){const group=discoveryGroup(groupId);return group?.filters.filter(f=>f.selectors.some(s=>matchesSelector(tags,s))).map(f=>f.id)??[];}
// Categories are a fixed whitelist from Geoapify's published category reference.
export const GEOAPIFY_FILTERS={
 food:{restaurants:['catering.restaurant','catering.food_court'],bars:['catering.bar','catering.pub','catering.biergarten','catering.taproom'],coffee:['catering.cafe'],brunch:['catering.restaurant','catering.cafe','catering.fast_food'],dessert:['catering.ice_cream','catering.cafe.dessert','catering.cafe.cake','catering.cafe.ice_cream','catering.cafe.donut','commercial.food_and_drink.bakery','commercial.food_and_drink.confectionery','commercial.food_and_drink.chocolate','commercial.food_and_drink.ice_cream'],takeout:['catering.fast_food','catering.restaurant','catering.cafe','catering.food_court'],delivery:['catering.restaurant','catering.cafe','catering.fast_food']},
 things:{parks:['leisure.park'],gyms:['sport.fitness','sport.sports_centre'],art:['entertainment.culture.gallery','entertainment.culture.arts_centre','tourism.attraction.artwork'],attractions:['tourism.attraction','tourism.sights','entertainment.zoo','entertainment.theme_park','entertainment.aquarium'],nightlife:['adult.nightclub'],music:['entertainment.culture.theatre','activity.events_venue','catering.bar','catering.pub'],movies:['entertainment.cinema'],museums:['entertainment.museum'],libraries:['education.library']},
 shopping:{groceries:['commercial.supermarket','commercial.food_and_drink'],beauty:['commercial.health_and_beauty.cosmetics'],dealers:['commercial.vehicle'],garden:['commercial.garden','commercial.houseware_and_hardware','commercial.furniture_and_interior'],apparel:['commercial.clothing'],centers:['commercial.shopping_mall','commercial.department_store'],electronics:['commercial.elektronics'],sports:['commercial.outdoor_and_sport'],convenience:['commercial.convenience']},
 services:{hotels:['accommodation'],atms:['service.financial.atm','service.financial.bank'],salons:['service.beauty'],rental:['rental.car'],repair:['service.vehicle.repair'],wash:['service.vehicle.car_wash'],dryclean:['service.cleaning'],charging:['service.vehicle.charging_station'],gas:['service.vehicle.fuel'],health:['healthcare.hospital','healthcare.clinic_or_praxis','healthcare.dentist'],mail:['service.post'],parking:['parking'],pharmacy:['healthcare.pharmacy','commercial.health_and_beauty.pharmacy']},other:{}
};
const GROUP_CATEGORIES={food:['catering',...GEOAPIFY_FILTERS.food.dessert],things:['leisure.park','sport.fitness','sport.sports_centre','entertainment','tourism.attraction','tourism.sights','education.library','adult.nightclub','activity.events_venue'],shopping:['commercial'],services:['accommodation','service','healthcare','rental.car','parking'],other:['activity.community_center','amenity','religion','heritage','education','office','tourism.information']};
const categoryMatch=(categories,wanted)=>categories.some(c=>wanted.some(w=>c===w||c.startsWith(w+'.')));
function kindsFor(tags,categories,groupId){return discoveryGroup(groupId).filters.filter(f=>f.selectors.some(s=>matchesSelector(tags,s))||(!['brunch','delivery','music'].includes(f.id)&&(f.id!=='takeout'?categoryMatch(categories,GEOAPIFY_FILTERS[groupId][f.id]):categoryMatch(categories,['catering.fast_food'])))).map(f=>f.id);}
export function discoveryQuery({center,groupId='food',filterId='',radius=2000}){
 const group=discoveryGroup(groupId);if(!hasLocation(center)||!group||![1000,2000,5000].includes(radius))throw Error('Choose a valid place area and category.');
 if(filterId&&!group.filters.some(f=>f.id===filterId))throw Error('Choose an available place type.');
 const lat=Number(center.lat.toFixed(3)),lon=Number(center.lng.toFixed(3));
 return JSON.stringify({categories:[...new Set(filterId?GEOAPIFY_FILTERS[groupId][filterId]:GROUP_CATEGORIES[groupId])],filter:{type:'circle',lat,lon,radius},bias:{type:'proximity',lat,lon},limit:MAX_DISCOVERY});
}
function sourceOf(p,t){
 const type={n:'node',w:'way',r:'relation',node:'node',way:'way',relation:'relation'}[t.osm_type],id=t.osm_id;
 if(type&&typeof id==='string'&&/^[1-9][0-9]{0,19}$/.test(id))return validatePlaceSource({provider:'openstreetmap',type,id,via:'geoapify'});
 try{return validatePlaceSource({provider:'geoapify',id:p.place_id});}catch{return null;}
}
export function normalizeDiscovery(payload,{center,groupId='food',filterId='',radius=2000}={}){
 const group=discoveryGroup(groupId);if(!group||!hasLocation(center)||payload?.type!=='FeatureCollection'||!Array.isArray(payload.features))throw Error('The places service returned unreadable results.');
 const seen=new Set(),rows=[];const limited=payload.features.length>=MAX_DISCOVERY;
 for(const feature of payload.features.slice(0,MAX_DISCOVERY)){
  if(feature?.type!=='Feature'||feature.geometry?.type!=='Point'||!feature.properties||!Array.isArray(feature.geometry.coordinates))continue;
  const p=feature.properties,raw=p.datasource?.raw,t={};if(raw&&typeof raw==='object')for(const [k,v]of Object.entries(raw).slice(0,250)){if(typeof v==='string'||typeof v==='number'&&Number.isFinite(v)&&(!k.startsWith('osm_')||Number.isSafeInteger(v)))t[k]=String(v);}
  const source=sourceOf(p,t);if(!source)continue;const key=source.provider+'/'+(source.type??'place')+'/'+source.id;if(seen.has(key))continue;
  const point={lat:feature.geometry.coordinates[1],lng:feature.geometry.coordinates[0]},categories=Array.isArray(p.categories)?p.categories.filter(v=>typeof v==='string').slice(0,100):[];
  if(!hasLocation(point)||['private','no'].includes(t.access)||t.disused==='yes'||t.abandoned==='yes')continue;
  const kinds=kindsFor(t,categories,groupId),extra=(group.extra??[]).some(sel=>matchesSelector(t,sel));
  if(groupId==='other'&&DISCOVERY_GROUPS.filter(g=>g.id!=='other').some(g=>kindsFor(t,categories,g.id).length||categoryMatch(categories,GROUP_CATEGORIES[g.id])))continue;
  if(filterId?!kinds.includes(filterId):!kinds.length&&!extra&&!categoryMatch(categories,GROUP_CATEGORIES[groupId]))continue;
  const km=proximityKm(center,point);if(km>radius/1000)continue;
  const kind=group.filters.find(f=>kinds.includes(f.id))?.label||clean(t.shop??t.amenity??t.tourism??categories.at(-1)??group.label).replaceAll('_',' ').split('.').at(-1);
  const name=clean(p.name)||clean(t.name)||clean(t['name:en'])||clean(t.brand),title=name||kind;
  const address=clean(p.address_line2,500)||[clean(p.housenumber??t['addr:housenumber'],40),clean(p.street??t['addr:street']),clean(p.city??t['addr:city']),clean(p.state??t['addr:state']),clean(p.postcode??t['addr:postcode'],40),clean(p.country??t['addr:country'],80)].filter(Boolean).join(', ').slice(0,500)||clean(p.formatted,500);
  const row={id:source.provider==='openstreetmap'?`osm-${source.type}-${source.id}`:`geo-place-${source.id}`,title,category:group.label,kind,kinds,locality:clean(p.city??p.town??p.village,160),lat:point.lat,lng:point.lng,km,address,phone:clean(p.contact?.phone??p.phone??t['contact:phone']??t.phone,80),url:safePlaceURL(p.website)||safePlaceURL(t['contact:website']??t.website),country:countryName(p.country??String(p.country_code??t['addr:country']??'').toUpperCase()),region:clean(p.state??t['addr:state'],100),detailsId:detailsId(p.place_id),description:placeDescription(p),hours:clean(p.opening_hours??t.opening_hours,400),cuisine:clean(Array.isArray(p.catering?.cuisine)?p.catering.cuisine.filter(v=>typeof v==='string').slice(0,20).join(';'):p.catering?.cuisine??t.cuisine,160).replaceAll(';',', '),brand:clean(p.brand??t.brand,160),placeSource:source,approximate:source.type!=='node'};
  if(name&&rows.some(r=>r.title.toLocaleLowerCase()===name.toLocaleLowerCase()&&proximityKm(r,row)<.025))continue;
  seen.add(key);rows.push(row);
 }
 rows.sort((a,b)=>a.km-b.km||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));return {items:rows,limited};
}
export function placePrefill(place){return {title:place.title,category:place.category,address:place.address,lat:place.lat,lng:place.lng,phone:place.phone,url:place.url,country:place.country,region:place.region,notes:placeDescription({description:place.description}),placeSource:validatePlaceSource(place.placeSource)};}
const cancelError=()=>Error('CANCELLED');
function delay(ms,signal){return new Promise((resolve,reject)=>{const timer=setTimeout(done,ms);function done(){signal.removeEventListener('abort',abort);resolve();}function abort(){clearTimeout(timer);reject(cancelError());}signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();});}
async function boundedJSON(response,remaining=2*1024*1024,onBytes=()=>{}){
 const max=Math.min(2*1024*1024,remaining);if(Number(response.headers?.get?.('content-length'))>max){await response.body?.cancel?.();throw Error('This area has too much place data. Choose a smaller area.');}
 if(!response.body?.getReader){const text=await response.text();onBytes(new TextEncoder().encode(text).length);if(new TextEncoder().encode(text).length>max)throw Error('This area has too much place data. Choose a smaller area.');return {payload:JSON.parse(text),bytes:new TextEncoder().encode(text).length};}
 const reader=response.body.getReader(),parts=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('This area has too much place data. Choose a smaller area.');}parts.push(value);}}finally{reader.releaseLock();onBytes(size);}
 const bytes=new Uint8Array(size);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length;}return {payload:JSON.parse(new TextDecoder().decode(bytes)),bytes:size};
}
export function createDiscoveryClient({fetch=globalThis.fetch,now=Date.now,wait=delay,network=globalThis.navigator,storage,apiKey=GEOAPIFY_API_KEY,cacheStore=createDiscoveryStore()}={}){
 if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
 let active=null,generation=0,nextAllowed=0,failures=0;const cache=new Map();let lastParams=null,storeAvailable=false;let budget={day:'',successes:0,attempts:0,bytes:0};
 const day=()=>{const d=new Date(now());return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);};
 try{const saved=JSON.parse(storage?.getItem('nth-geoapify-budget-v1')??'null');if(saved?.day===day()&&['successes','attempts','bytes'].every(k=>Number.isInteger(saved[k])&&saved[k]>=0))budget=saved;}catch{}
 function saveBudget(){try{storage?.setItem('nth-geoapify-budget-v1',JSON.stringify(budget));}catch{}}
 function allowance(){if(budget.day!==day())budget={day:day(),successes:0,attempts:0,bytes:0};if(budget.successes>=50)throw Error('Today’s 50 successful Places searches are used. Loaded categories are still available. Try new areas tomorrow.');if(budget.attempts>=100||budget.bytes>=50*1024*1024)throw Error('Places has reached today’s service safety limit. Loaded categories are still available. Try new searches tomorrow.');}
 const cacheKey=params=>{discoveryQuery(params);return JSON.stringify(['geoapify-v1',params.groupId??'food',params.filterId??'',Number(params.center.lat.toFixed(3)),Number(params.center.lng.toFixed(3)),params.radius??2000]);};
 const canonical=params=>{discoveryQuery(params);return {center:{lat:params.center.lat,lng:params.center.lng},groupId:params.groupId??'food',filterId:params.filterId??'',radius:params.radius??2000};};
 function validateEntry(value){
  try{
   if(value?.revision!==1||value.id!==cacheKey(value.params)||!Number.isFinite(value.at)||value.at<0||value.at>now()+300000||!Number.isFinite(value.usedAt)||value.usedAt>now()+300000||!Array.isArray(value.result?.items)||value.result.items.length>MAX_DISCOVERY||typeof value.result.limited!=='boolean')return null;
   const params=canonical(value.params),group=discoveryGroup(params.groupId),ids=new Set(),items=[];
   for(const row of value.result.items){
    if(!row||!hasLocation(row)||typeof row.title!=='string'||!Array.isArray(row.kinds)||row.kinds.some(k=>!group.filters.some(f=>f.id===k))||proximityKm(params.center,row)>params.radius/1000+.001)return null;
    const source=validatePlaceSource(row.placeSource),id=source.provider==='openstreetmap'?`osm-${source.type}-${source.id}`:`geo-place-${source.id}`;if(row.id!==id||ids.has(id))return null;ids.add(id);
    const r={id,lat:row.lat,lng:row.lng,placeSource:source,category:group.label,kinds:[...new Set(row.kinds)],km:proximityKm(params.center,row),approximate:!!row.approximate};
    for(const [field,max]of Object.entries({title:160,kind:160,locality:160,address:500,phone:80,country:80,region:100,description:1200,hours:400,cuisine:160,brand:160}))r[field]=clean(row[field],max);r.url=safePlaceURL(row.url);r.detailsId=detailsId(row.detailsId);items.push(r);
   }
   return {revision:1,id:value.id,params,result:{items,limited:value.result.limited},label:clean(value.label,160),at:value.at,usedAt:value.usedAt,retained:true};
  }catch{return null;}
 }
 const ready=Promise.resolve().then(()=>cacheStore.load()).then(saved=>{storeAvailable=!!saved.available;for(const raw of saved.entries??[]){const entry=validateEntry(raw);if(entry)cache.set(entry.id,entry);}const trim=trimSavedSearches(cache.values());for(const id of trim.remove)cache.delete(id);try{if(saved.last)lastParams=canonical(saved.last);}catch{};}).catch(()=>{});
 function cached(params){
  params=canonical(params);let hit=cache.get(cacheKey(params)),area=params,nearby=false;
  if(hit)area={...params,center:{...hit.params.center}};
  if(!hit){
   const compatible=[...cache.values()].filter(h=>h.params.groupId===params.groupId&&(h.params.filterId===params.filterId||!h.params.filterId&&!h.result.limited));
   const same=compatible.filter(h=>h.params.radius===params.radius&&proximityKm(h.params.center,params.center)<=.1).sort((a,b)=>proximityKm(a.params.center,params.center)-proximityKm(b.params.center,params.center)||b.at-a.at);
   if(same.length){hit=same[0];area={...params,center:{...hit.params.center}};nearby=true;}
   else hit=compatible.filter(h=>!h.result.limited&&h.params.radius>params.radius&&proximityKm(h.params.center,params.center)*1000+params.radius<=h.params.radius).sort((a,b)=>a.params.radius-b.params.radius||b.at-a.at)[0];
  }
  if(!hit)return null;
  const result=structuredClone(hit.result);result.items=result.items.filter(p=>!params.filterId||p.kinds.includes(params.filterId)).map(p=>({...p,km:proximityKm(area.center,p)})).filter(p=>p.km<=area.radius/1000).sort((a,b)=>a.km-b.km||a.title.localeCompare(b.title));
  return {...result,cached:true,loadedAt:hit.at,area,nearby,retained:!!hit.retained,cacheId:hit.id,areaLabel:hit.label};
 }
 async function retain(entry,params){
  entry.usedAt=Math.max(now(),...[...cache.values()].map(e=>e.usedAt+1));cache.delete(entry.id);cache.set(entry.id,entry);lastParams=canonical(params);const trim=trimSavedSearches(cache.values());for(const id of trim.remove)cache.delete(id);
  try{const result=await cacheStore.put({...entry,retained:undefined},lastParams);entry.retained=!!result.saved;storeAvailable=!!result.saved;for(const id of result.removed??[])cache.delete(id);}catch{entry.retained=false;storeAvailable=false;}
 }
 function recent(){return [...cache.values()].reverse().sort((a,b)=>b.usedAt-a.usedAt||b.at-a.at).map(e=>({id:e.id,params:structuredClone(e.params),at:e.at,count:e.result.items.length,label:e.label,retained:!!e.retained}));}

 function cancel(){generation++;active?.abort();active=null;}
 return {cancel,cached,ready,recent,get storageAvailable(){return storeAvailable;},last(){return lastParams?cached(lastParams):null;},async recall(id){await ready;const entry=cache.get(id);if(!entry)return null;return this.search(entry.params);},async clear(){cancel();await ready;cache.clear();lastParams=null;const cleared=await cacheStore.clear().catch(()=>false);storeAvailable=!!cleared;return cleared;},async search(params,{force=false}={}){
  const query=discoveryQuery(params);params=canonical(params);cancel();const token=generation;await ready;if(token!==generation)throw cancelError();const hit=!force&&cached(params);if(hit){await retain(cache.get(hit.cacheId),hit.area);if(token!==generation)throw cancelError();return {...hit,retained:!!cache.get(hit.cacheId)?.retained};}
  if(network?.onLine===false)throw Error('Places discovery needs internet. Saved footprints and downloaded maps are still available.');
  if(typeof apiKey!=='string'||!apiKey.trim())throw Error('The Geoapify Places key is not configured. Your saved footprints are still available.');
  allowance();const abort=new AbortController();active=abort;let timer;
  try{
   const remaining=Math.max(0,nextAllowed-now());if(remaining>0)await wait(remaining,abort.signal);if(abort.signal.aborted)throw cancelError();nextAllowed=now()+3000;allowance();budget.attempts++;saveBudget();
   timer=setTimeout(()=>abort.abort('timeout'),45000);
   const response=await fetch(DISCOVERY_ENDPOINT,{method:'POST',body:query,headers:{'Content-Type':'application/json','X-API-Key':apiKey},signal:abort.signal,credentials:'omit',referrerPolicy:'no-referrer'});
   if(!response.ok){if(response.status===402)throw Error('Geoapify’s project quota or billing limit was reached. Loaded categories are still available.');if(response.status===400)throw Error('Geoapify could not search this place category. Try another type or refresh later.');if(response.status===401||response.status===403)throw Error('Geoapify could not authorize this Places key. Check its project and allowed origins.');if(response.status===429||response.status===503){const retry=response.headers?.get?.('retry-after'),seconds=/^\d+$/.test(retry??'')?Number(retry):Math.max(0,(Date.parse(retry)-now())/1000)||30;nextAllowed=now()+Math.min(300,Math.max(3,seconds))*1000;throw Error('Geoapify is busy or its quota is reached. Wait, then tap Refresh.');}throw Error('Places could not load. Check your connection and tap Refresh.');}
   const body=await boundedJSON(response,50*1024*1024-budget.bytes,n=>{budget.bytes+=n;saveBudget();});const payload=body.payload;if(token!==generation||abort.signal.aborted)throw cancelError();const result=normalizeDiscovery(payload,params);budget.successes++;failures=0;saveBudget();const locality=result.items.find(p=>p.locality),entry={revision:1,id:cacheKey(params),at:now(),usedAt:now(),result,params:structuredClone(params),label:locality?[locality.locality,locality.region].filter(Boolean).join(', '):[params.center.lat.toFixed(3)+'°',params.center.lng.toFixed(3)+'°'].join(', '),retained:false};cache.set(entry.id,entry);await retain(entry,params);if(token!==generation)throw cancelError();return {...structuredClone(result),cached:false,loadedAt:entry.at,area:params,areaLabel:entry.label,retained:entry.retained};
  }catch(error){if(token!==generation||abort.signal.reason!=='timeout'&&abort.signal.aborted)throw cancelError();failures++;nextAllowed=Math.max(nextAllowed,now()+Math.min(120000,5000*2**Math.min(failures-1,5)));if(abort.signal.reason==='timeout')throw Error('Places took too long to respond. Try a smaller area or tap Refresh.');if(error instanceof SyntaxError)throw Error('Places returned unreadable data. Tap Refresh later.');if(error instanceof TypeError)throw Error('Places could not connect. Check your internet connection and tap Refresh.');throw error;}finally{clearTimeout(timer);if(token===generation)active=null;}
 }};
}
