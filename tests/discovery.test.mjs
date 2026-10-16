import test from 'node:test';
import assert from 'node:assert/strict';
import {DISCOVERY_GROUPS,discoveryQuery,normalizeDiscovery,discoveryFilters,createDiscoveryClient,placePrefill,DISCOVERY_ENDPOINT,GEOAPIFY_FILTERS,MAX_DISCOVERY} from '../dist/discovery.js';
import {validateRecord,makeBackup,parseBackup,VERSION} from '../dist/model.js';
import {validatePlaceSource,placeSourceURL,samePlaceSource} from '../dist/place-source.js';
import {writeVisit,visitView} from '../dist/visits.js';
import {IDBFactory} from 'fake-indexeddb';
import {createDraftStore,createDraftRecovery} from '../dist/drafts.js';
const center={lat:42,lng:-73},params={center,groupId:'food',filterId:'',radius:2000};
const node=(id=1,tags={},point={lat:42.001,lon:-73})=>({type:'node',id,...point,tags:{amenity:'restaurant',name:'A good lunch',...tags}});
const payload=(elements=[node()])=>({type:'FeatureCollection',features:elements.map(e=>({type:'Feature',geometry:{type:'Point',coordinates:[e.type==='node'?e.lon:e.center?.lon,e.type==='node'?e.lat:e.center?.lat]},properties:{categories:[],datasource:{raw:{...e.tags,osm_type:e.type,osm_id:e.id}}}}))});
const source={provider:'openstreetmap',type:'node',id:'1'};
const response=(value,status=200,headers={})=>({ok:status===200,status,headers:{get:k=>headers[k]??null},text:async()=>JSON.stringify(value)});
const clock='2026-10-16T12:00:00Z';
const record=(patch={})=>validateRecord({id:'saved',title:'Saved',category:'Food & Drink',favorite:false,rating:0,visited:'2026-10-16',lat:42,lng:-73,photos:[],coverIndex:0,updatedAt:clock,...patch});

test('all screenshot groups and 38 subcategories have bounded whitelist-only queries',()=>{
 assert.deepEqual(DISCOVERY_GROUPS.map(g=>g.label),['Food & Drink','Things to do','Shopping','Services','Other']);assert.equal(DISCOVERY_GROUPS.flatMap(g=>g.filters).length,38);
 for(const group of DISCOVERY_GROUPS)for(const filter of [{id:''},...group.filters]){const q=discoveryQuery({...params,groupId:group.id,filterId:filter.id,center:{lat:42.123456,lng:-73.234567}});const body=JSON.parse(q);assert.deepEqual(body.filter,{type:'circle',lat:42.123,lon:-73.235,radius:2000});assert.equal(body.limit,500);assert.deepEqual(body.bias,{type:'proximity',lat:42.123,lon:-73.235});assert.ok(body.categories.length>0);assert.ok(body.categories.every(c=>/^[a-z_.]+$/.test(c)));assert.ok(q.length<8000);}
 for(const bad of [{center:{lat:NaN,lng:1}},{radius:100000},{groupId:'food];out;'},{filterId:'unknown'}])assert.throws(()=>discoveryQuery({...params,...bad}));
});
test('normalization accepts nodes and mapped area centers, preserves zero, sorts distances and bounds output',()=>{
 const input=payload([node(1),node(2,{name:'Closer'},{lat:42.0001,lon:-73}),{type:'way',id:3,center:{lat:42.002,lon:-73},tags:{amenity:'cafe',name:'Area cafe'}},node(4,{}, {lat:90,lon:180}),node(0),node(5,{}, {lat:NaN,lon:2})]);const out=normalizeDiscovery(input,params);assert.deepEqual(out.items.map(p=>p.id),['osm-node-2','osm-node-1','osm-way-3']);assert.equal(out.items[2].approximate,true);assert.deepEqual(input.features[0].geometry.coordinates,[-73,42.001]);assert.equal(normalizeDiscovery(payload([node(1,{}, {lat:0,lon:0})]),{...params,center:{lat:0,lng:0}}).items[0].lat,0);
 const capped=normalizeDiscovery(payload(Array.from({length:505},(_,i)=>node(i+1,{name:'Place '+i}, {lat:42+i*.000001,lon:-73}))),params);assert.equal(capped.limited,true);assert.ok(capped.items.length<=500);
});
test('tag filters cover every group and Other excludes matching named businesses from the four groups',()=>{
 const examples=[['food','restaurants',{amenity:'restaurant'}],['food','brunch',{amenity:'cafe',cuisine:'breakfast'}],['food','delivery',{amenity:'restaurant',delivery:'yes'}],['things','libraries',{amenity:'library'}],['things','music',{live_music:'yes'}],['shopping','beauty',{shop:'cosmetics'}],['services','salons',{shop:'beauty'}],['services','health',{healthcare:'clinic'}],['services','charging',{amenity:'charging_station'}]];
 for(const [group,filter,tags]of examples)assert.ok(discoveryFilters(tags,group).includes(filter),group+filter);
 const others=normalizeDiscovery(payload([node(),node(2,{amenity:'community_centre',name:'Community hall'}),node(3,{amenity:'school',name:'School'})]),{...params,groupId:'other'});assert.deepEqual(others.items.map(p=>p.title),['Community hall','School']);
 assert.equal(normalizeDiscovery(payload([node(2,{amenity:'cafe'})]),{...params,filterId:'bars'}).items.length,0);
});
test('private/disused places, invalid geometry, duplicate source IDs and duplicate named nearby representations are excluded',()=>{
 const rows=normalizeDiscovery(payload([node(),node(),node(2),node(3,{access:'private'}),node(4,{disused:'yes'}),{type:'relation',id:6,tags:{amenity:'restaurant'}},node(7,{name:'Other branch'},{lat:42.004,lon:-73})]),params);assert.equal(rows.items.length,2);assert.equal(rows.items[1].title,'Other branch');
 assert.throws(()=>normalizeDiscovery({error:'provider error'},params),/unreadable/);assert.throws(()=>normalizeDiscovery({},params),/unreadable/);
});
test('untrusted text stays bounded; dangerous URLs are dropped; source links have a fixed host',()=>{
 const p=normalizeDiscovery(payload([node(1,{name:'<img src=x onerror=alert(1)>',website:'javascript:alert(1)',phone:'1'.repeat(200),description:'x'.repeat(5000),'addr:country':'US'})]),params).items[0];assert.ok(p.title.startsWith('<img'));assert.equal(p.url,'');assert.equal(p.phone.length,80);assert.equal(p.description.length,1200);assert.equal(p.country,'United States');assert.equal(placeSourceURL(p.placeSource),'https://www.openstreetmap.org/node/1');assert.throws(()=>validatePlaceSource({...source,id:'1/evil'}));assert.throws(()=>validatePlaceSource({...source,provider:'unknown'}));assert.equal(samePlaceSource(source,{...source}),true);
});
test('client uses one POST with no journal content, caches results, and recomputes distance for nearby centers',async()=>{
 let calls=0;const client=createDiscoveryClient({apiKey:'test-project-key',fetch:async(url,options)=>{calls++;assert.equal(url,DISCOVERY_ENDPOINT);assert.equal(options.method,'POST');assert.equal(options.credentials,'omit');assert.equal(options.headers['X-API-Key'],'test-project-key');assert.equal(options.headers['Content-Type'],'application/json');assert.ok(JSON.parse(options.body).filter);assert.ok(!options.body.includes('A good lunch'));assert.ok(!url.includes('apiKey'));return response(payload());},network:{onLine:true}});const first=await client.search(params);const cached=await client.search({...params,center:{lat:42.0002,lng:-73}});assert.equal(calls,1);assert.equal(first.cached,false);assert.equal(cached.cached,true);assert.ok(cached.items[0].km<first.items[0].km);first.items[0].title='mutated';assert.equal((await client.search(params)).items[0].title,'A good lunch');
});
test('cancelled and stale responses never become cached place results',async()=>{
 let release,calls=0;const client=createDiscoveryClient({fetch:async()=>{calls++;if(calls===1)return await new Promise(r=>release=r);return response(payload([node(2,{amenity:'cafe',name:'New query'})]));},wait:async()=>{},network:{onLine:true}});const old=client.search(params);await Promise.resolve();const next=client.search({...params,filterId:'coffee'});release(response(payload()));await assert.rejects(old,/CANCELLED/);assert.equal((await next).items[0].title,'New query');
});
test('rate limits and response size errors are explicit without automatic retries; offline never fetches',async()=>{
 let calls=0;const waits=[];const c=createDiscoveryClient({fetch:async()=>{calls++;return response({},429,{'retry-after':'10'});},wait:async ms=>waits.push(ms),now:()=>1000,network:{onLine:true}});await assert.rejects(c.search(params),/busy/);assert.equal(calls,1);await assert.rejects(c.search(params),/busy/);assert.equal(calls,2);assert.equal(waits[0],10000);
 const offline=createDiscoveryClient({fetch:async()=>{throw Error('should not fetch');},network:{onLine:false}});await assert.rejects(offline.search(params),/needs internet/);
 const big=createDiscoveryClient({fetch:async()=>response({},200,{'content-length':3000000}),network:{onLine:true}});await assert.rejects(big.search(params),/too much place data/);
});
test('source and new categories round trip v7, old formats still load, and edits/return visits retain source identity',()=>{
 assert.equal(VERSION,7);const p=record({placeSource:source}),fresh=makeBackup([p]);assert.deepEqual(parseBackup(JSON.stringify(fresh)).records,[p]);for(const v of [1,2,3,4,5,6]){const old={...fresh,formatVersion:v,records:[{...p,category:'Travel'}]};delete old.records[0].placeSource;if(v===1){delete old.records[0].photos;delete old.records[0].coverIndex;}if(v<3){delete old.journeys;delete old.records[0].tripIds;}assert.equal(parseBackup(JSON.stringify(old)).records[0].category,'Travel');}
 assert.throws(()=>parseBackup(JSON.stringify({...fresh,formatVersion:5})),/version 6/);const returned=writeVisit(p,{...p,notes:'Return',updatedAt:'2026-10-17T12:00:00Z'},'new',{newId:()=> 'return'});assert.deepEqual(visitView(returned,'return').placeSource,source);
 const pref=placePrefill(normalizeDiscovery(payload(),params).items[0]);assert.equal(pref.notes,'');assert.equal('visited'in pref,false);assert.equal('photos'in pref,false);assert.deepEqual(pref.placeSource,{...source,via:'geoapify'});
});
test('a prefilled place draft retains its source across restart and older drafts remain readable',async()=>{
 const factory=new IDBFactory(),db=await new Promise((resolve,reject)=>{const r=factory.open('drafts',1);r.onupgradeneeded=()=>r.result.createObjectStore('journal');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}),store=createDraftStore(db),first=createDraftRecovery({store,uuid:()=> 'draft-1'});first.begin();const values={title:'Cafe',category:'Food & Drink',visited:'2026-10-16',rating:'0',address:'',notes:'',phone:'',url:'',lat:'42',lng:'-73',tags:'',country:'',region:''};await first.flush({values,placeSource:source,favorite:false,photos:[],coverIndex:0,audio:null});const second=createDraftRecovery({store});const loaded=await second.hydrate(await second.load());assert.equal(loaded.version,6);assert.deepEqual(loaded.placeSource,source);assert.equal(loaded.values.category,'Food & Drink');db.close();
});


test('prototype daily request budget persists without storing areas and cache hits remain available',async()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};let calls=0,instant=Date.parse('2026-10-16T12:00:00Z');const options={storage,now:()=>instant,wait:async()=>{},network:{onLine:true},fetch:async()=>{calls++;return response(payload());}};
 const client=createDiscoveryClient(options);for(let i=0;i<50;i++)await client.search({...params,center:{lat:42+i*.001,lng:-73}});assert.equal(calls,50);await assert.rejects(client.search({...params,groupId:'services'}),/50 successful/);assert.equal(calls,50);assert.equal((await client.search({...params,center:{lat:42.049,lng:-73}})).cached,true);const fresh=createDiscoveryClient(options);await assert.rejects(fresh.search(params),/50 successful/);const stored=[...values.values()].join('');assert.ok(!stored.includes('latitude'));assert.ok(!stored.includes('42.049'));instant+=86400000;await fresh.search(params);assert.equal(calls,51);
});


test('failed searches do not spend successful-search allowance; backoff and separate safety cap persist',async()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};let instant=Date.parse(clock),calls=0;const waits=[];
 const client=createDiscoveryClient({storage,now:()=>instant,wait:async ms=>{waits.push(ms);instant+=ms;},network:{onLine:true},fetch:async()=>{calls++;return calls<=3?response({},504):response(payload());}});
 for(let i=0;i<3;i++)await assert.rejects(client.search(params),/could not load/);
 assert.equal(JSON.parse(values.get('nth-geoapify-budget-v1')).successes,0);assert.deepEqual(waits,[5000,10000]);
 await client.search(params);assert.equal(JSON.parse(values.get('nth-geoapify-budget-v1')).successes,1);assert.equal(JSON.parse(values.get('nth-geoapify-budget-v1')).attempts,4);
 values.set('nth-geoapify-budget-v1',JSON.stringify({day:'2026-10-16',successes:1,attempts:100,bytes:1}));const blocked=createDiscoveryClient({storage,now:()=>instant,fetch:async()=>{throw Error('must not fetch');}});await assert.rejects(blocked.search(params),/safety limit/);
});
test('loaded groups survive beyond freshness window and answer complete subtype/smaller radius without more requests',async()=>{
 let instant=Date.parse(clock),calls=0;const client=createDiscoveryClient({now:()=>instant,wait:async()=>{},network:{onLine:true},fetch:async()=>{calls++;return response(payload([node(1),node(2,{amenity:'cafe',name:'Coffee'})]));}});
 await client.search(params);assert.equal((await client.search({...params,filterId:'coffee',radius:1000})).items.length,1);assert.equal(calls,1);
 instant+=3600000;assert.equal(client.cached(params).items.length,2);assert.equal(calls,1);await client.search(params,{force:true});assert.equal(calls,2);
});
test('truncated broad searches cannot hide missing subtype results and a failed forced refresh retains the good cache',async()=>{
 let fail=false,calls=0;const client=createDiscoveryClient({wait:async()=>{},fetch:async()=>{calls++;if(fail)return response({},503);return response(payload(Array.from({length:501},(_,i)=>node(i+1,{name:'Restaurant '+i},{lat:42+i*.000001,lon:-73}))));}});
 await client.search(params);assert.equal(client.cached({...params,filterId:'coffee'}),null);fail=true;await assert.rejects(client.search(params,{force:true}),/busy/);assert.equal(client.cached(params).items.length,500);assert.equal(calls,2);
});
test('Overpass allowances do not consume the new Geoapify allowance',async()=>{
 const values=new Map([['nth-discovery-budget-v1',JSON.stringify({day:'2026-10-16',requests:50,bytes:4000})],['nth-discovery-budget-v2',JSON.stringify({day:'2026-10-16',successes:50,attempts:100,bytes:5000000})]]),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const c=createDiscoveryClient({storage,now:()=>Date.parse(clock),fetch:async()=>response(payload())});await c.search(params);const b=JSON.parse(values.get('nth-geoapify-budget-v1'));assert.equal(b.successes,1);assert.equal(b.attempts,1);assert.ok(b.bytes<4000);
});
