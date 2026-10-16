import test from 'node:test';
import assert from 'node:assert/strict';
import {discoveryQuery,normalizeDiscovery,createDiscoveryClient,placePrefill} from '../dist/discovery.js';
import {samePlaceSource,validatePlaceSource,placeSourceCredit,placeSourceURL} from '../dist/place-source.js';
import {makeBackup,parseBackup,validateRecord} from '../dist/model.js';
import {validateDraft} from '../dist/drafts.js';
const params={center:{lat:0,lng:0},groupId:'food',filterId:'',radius:1000};
const feature=(patch={},raw={})=>({type:'Feature',geometry:{type:'Point',coordinates:[0,0]},properties:{name:'A mapped cafe',place_id:'ab12cd34',categories:['catering','catering.cafe'],datasource:{raw:{osm_id:123,osm_type:'n',amenity:'cafe',...raw}},...patch}});
const payload=(...features)=>({type:'FeatureCollection',features});
const response=(data,status=200)=>({ok:status===200,status,headers:{get:()=>null},text:async()=>JSON.stringify(data)});

test('Geoapify normalization retains enriched metadata, numeric address fields and stable OSM identity',()=>{
 const input=feature({address_line2:'60 Sample Street, Test City',country:'United States',state:'New York',contact:{phone:'+1 555 0100'},website:'https://example.test/cafe',opening_hours:'Mo-Fr 09:00-17:00',catering:{cuisine:['coffee','cake']},description:'A mapped description'}, {osm_type:'w',osm_id:456});
 const p=normalizeDiscovery(payload(input),params).items[0];assert.equal(p.title,'A mapped cafe');assert.equal(p.lat,0);assert.equal(p.lng,0);assert.equal(p.address,'60 Sample Street, Test City');assert.equal(p.phone,'+1 555 0100');assert.equal(p.country,'United States');assert.equal(p.region,'New York');assert.equal(p.cuisine,'coffee, cake');assert.equal(p.hours,'Mo-Fr 09:00-17:00');assert.deepEqual(p.placeSource,{provider:'openstreetmap',type:'way',id:'456',via:'geoapify'});assert.equal(p.approximate,true);
 const fallback=normalizeDiscovery(payload(feature({address_line2:undefined,housenumber:60,street:'Sample Street',country_code:'us'})),params).items[0];assert.match(fallback.address,/60/);assert.equal(fallback.country,'United States');assert.equal(input.properties.datasource.raw.osm_id,456);
});
test('Geoapify categories work without raw OSM tags and validated opaque IDs preserve source attribution',()=>{
 const p=normalizeDiscovery(payload(feature({datasource:undefined})),params).items[0];assert.equal(p.kind,'Coffee');assert.deepEqual(p.placeSource,{provider:'geoapify',id:'ab12cd34'});assert.equal(placeSourceURL(p.placeSource),'https://www.openstreetmap.org/copyright');assert.match(placeSourceCredit(p.placeSource),/Powered by Geoapify/);assert.deepEqual(placePrefill(p).placeSource,p.placeSource);
 for(const id of ['../secret','https://example.test','a'.repeat(2049),'not-a-geo-id'])assert.throws(()=>validatePlaceSource({provider:'geoapify',id}));
 assert.equal(normalizeDiscovery(payload(feature({datasource:undefined,place_id:'bad/path'})),params).items.length,0);
});
test('brunch, delivery and live music depend on mapped tags rather than invented category capabilities',()=>{
 const plain=feature({categories:['catering','catering.restaurant']},{amenity:'restaurant'});
 for(const filterId of ['brunch','delivery'])assert.equal(normalizeDiscovery(payload(plain),{...params,filterId}).items.length,0);
 assert.equal(normalizeDiscovery(payload(feature({}, {cuisine:'breakfast',delivery:'yes'})),{...params,filterId:'brunch'}).items.length,1);
 assert.equal(normalizeDiscovery(payload(feature({}, {delivery:'only'})),{...params,filterId:'delivery'}).items.length,1);
 assert.equal(normalizeDiscovery(payload(feature({categories:['entertainment.culture.theatre']},{amenity:'theatre'})),{...params,groupId:'things',filterId:'music'}).items.length,0);
 assert.equal(normalizeDiscovery(payload(feature({}, {live_music:'yes'})),{...params,groupId:'things',filterId:'music'}).items.length,1);
});
test('provider switch recognizes previously saved Overpass identities and backup v7 keeps credits with backward compatibility',()=>{
 const source={provider:'openstreetmap',type:'node',id:'123',via:'geoapify'};assert.ok(samePlaceSource(source,{provider:'openstreetmap',type:'node',id:'123'}));assert.ok(!samePlaceSource(source,{provider:'openstreetmap',type:'way',id:'123'}));
 const record=validateRecord({id:'saved',title:'Cafe',category:'Food & Drink',favorite:false,rating:0,visited:'2026-10-16',lat:0,lng:0,photos:[],coverIndex:0,updatedAt:'2026-10-16T12:00:00Z',placeSource:source});const backup=makeBackup([record]);assert.equal(backup.formatVersion,7);assert.deepEqual(parseBackup(JSON.stringify(backup)).records[0].placeSource,source);assert.throws(()=>parseBackup(JSON.stringify({...backup,formatVersion:6})),/version 7/);
 const legacy=structuredClone(backup);legacy.formatVersion=6;delete legacy.records[0].placeSource.via;assert.equal(parseBackup(JSON.stringify(legacy)).records[0].placeSource.provider,'openstreetmap');
 const opaque={...backup,records:[{...record,placeSource:{provider:'geoapify',id:'ab1234'}}]};assert.equal(parseBackup(JSON.stringify(opaque)).records[0].placeSource.provider,'geoapify');assert.throws(()=>parseBackup(JSON.stringify({...opaque,formatVersion:6})),/version 7/);
});
test('Geoapify attribution survives recovery metadata and source links never include the API key',()=>{
 const values={title:'Cafe',category:'Food & Drink',visited:'2026-10-16',rating:'0',address:'',notes:'',phone:'',url:'',lat:'0',lng:'0',tags:'',country:'',region:''};const source={provider:'openstreetmap',type:'node',id:'123',via:'geoapify'};
 const draft={version:6,id:'draft',editId:null,values,favorite:false,photos:[],coverIndex:0,savedAt:'2026-10-16T12:00:00Z',placeSource:source};assert.deepEqual(validateDraft(draft).placeSource,source);assert.equal(placeSourceURL(source),'https://www.openstreetmap.org/node/123');assert.equal(placeSourceCredit({provider:'openstreetmap',type:'node',id:'123'}),'© OpenStreetMap contributors');
});
test('authorization and quota errors preserve cached results and do not spend successful-search allowance',async()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};let status=200;const client=createDiscoveryClient({storage,apiKey:'test-key',wait:async()=>{},fetch:async(url,options)=>{assert.equal(url,'https://api.geoapify.com/v2/places');assert.equal(options.headers['X-API-Key'],'test-key');assert.ok(!options.body.includes('test-key'));return response(payload(feature()),status);}});await client.search(params);
 for(const [code,message]of [[401,/authorize/],[403,/authorize/],[402,/quota/],[429,/quota/]]){status=code;await assert.rejects(client.search(params,{force:true}),message);assert.equal(client.cached(params).items.length,1);}
 const budget=JSON.parse(values.get('nth-geoapify-budget-v1'));assert.equal(budget.successes,1);assert.equal(budget.attempts,5);
});
test('missing keys never send a request and search bodies are fixed-category approximate-area requests',async()=>{
 let calls=0;const c=createDiscoveryClient({apiKey:'',fetch:async()=>{calls++;}});await assert.rejects(c.search(params),/not configured/);assert.equal(calls,0);
 const body=JSON.parse(discoveryQuery({...params,center:{lat:40.700123,lng:-74.000123},filterId:'coffee'}));assert.deepEqual(body.categories,['catering.cafe']);assert.equal(body.filter.lat,40.7);assert.equal(body.filter.lon,-74);assert.equal(body.limit,500);assert.ok(!JSON.stringify(body).includes('apiKey'));
});
