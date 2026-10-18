import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createPlaceDetailsClient,descriptionFromDetails,placeDescription} from '../dist/place-details.js';
import {createDiscoveryStore} from '../dist/discovery-store.js';
import {normalizeDiscovery,placePrefill} from '../dist/discovery.js';
const place={title:'Cafe',detailsId:'abcd12',description:'',lat:42,lng:-71,placeSource:{provider:'openstreetmap',type:'node',id:'123'}};
const feature=(p={})=>({type:'Feature',properties:{place_id:'abcd12',description:'A quiet cafe with a courtyard.',datasource:{raw:{osm_type:'n',osm_id:123}},...p}});
const body=(f=feature())=>({type:'FeatureCollection',features:[f]});
const response=(value,status=200)=>({ok:status===200,status,headers:{get:()=>null},text:async()=>JSON.stringify(value)});
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};};
const store=()=>createDiscoveryStore({indexedDB:new IDBFactory(),name:'details'});
test('mapped descriptions use English/local data, remain bounded plain text and only match the selected place',()=>{
 assert.equal(placeDescription({description:'Default',description_international:{en:'English'}}),'English');assert.equal(placeDescription({datasource:{raw:{'description:en':'Mapped text'}}}),'Mapped text');assert.equal(placeDescription({description:'x'.repeat(1300)}).length,1200);
 assert.equal(descriptionFromDetails(body(),place),'A quiet cafe with a courtyard.');assert.equal(descriptionFromDetails(body(feature({place_id:'different',datasource:{raw:{osm_type:'n',osm_id:999}}})),place),'');assert.throws(()=>descriptionFromDetails({},place));assert.equal(placePrefill({...place,description:'A quiet cafe.'}).notes,'A quiet cafe.');assert.equal(placePrefill(place).notes,'');
});
test('details IDs and descriptions survive discovery normalization and cached-result validation',async()=>{
 const f={...feature(),geometry:{type:'Point',coordinates:[-71,42]},properties:{...feature().properties,name:'Cafe',categories:['catering.cafe']}};const normalized=normalizeDiscovery(body(f),{center:{lat:42,lng:-71},groupId:'food',radius:1000}).items[0];assert.equal(normalized.detailsId,'abcd12');assert.equal(normalized.description,'A quiet cafe with a courtyard.');
});
test('one on-demand lookup is shared, cached across reopening and usable offline without consuming a search',async()=>{
 let calls=0,finish;const cacheStore=store(),storage=memory();const client=createPlaceDetailsClient({apiKey:'test',cacheStore,storage,fetch:async(url,options)=>{calls++;assert.equal(new URL(url).searchParams.get('id'),'abcd12');assert.equal(options.headers['X-API-Key'],'test');return new Promise(r=>finish=()=>r(response(body())));}});
 const a=client.description(place),b=client.description(place);assert.equal(a,b);while(!finish)await new Promise(r=>setImmediate(r));finish();assert.equal(await a,'A quiet cafe with a courtyard.');assert.equal(await client.description(place),await a);assert.equal(calls,1);
 const reopened=createPlaceDetailsClient({apiKey:'test',cacheStore,storage,network:{onLine:false},fetch:()=>assert.fail('offline cache made a request')});assert.equal(await reopened.description(place),await a);
});
test('missing descriptions are retained, failures do not block saving and immediate retries do not spend another request',async()=>{
 let calls=0;const client=createPlaceDetailsClient({apiKey:'test',cacheStore:store(),storage:memory(),fetch:async()=>{calls++;return response(body(feature({description:undefined})));}});assert.equal(await client.description(place),'');assert.equal(await client.description(place),'');assert.equal(calls,1);
 const failed=createPlaceDetailsClient({apiKey:'test',cacheStore:store(),storage:memory(),fetch:async()=>{calls++;return response({},429);}});await assert.rejects(failed.description(place));await assert.rejects(failed.description(place));assert.equal(calls,2);assert.equal(placePrefill(place).notes,'');
});
test('OSM identity lookup rejects a neighbouring place and oversized results are bounded',async()=>{
 const old={...place,detailsId:''};const client=createPlaceDetailsClient({apiKey:'test',cacheStore:store(),storage:memory(),fetch:async url=>{assert.equal(new URL(url).searchParams.get('osm_id'),'123');assert.equal(new URL(url).searchParams.get('osm_type'),'n');assert.equal(new URL(url).searchParams.get('lat'),null);return response(body(feature({place_id:'other',datasource:{raw:{osm_type:'n',osm_id:999}}})));}});assert.equal(await client.description(old),'');
 const big=createPlaceDetailsClient({apiKey:'test',cacheStore:store(),storage:memory(),fetch:async()=>response({description:'x'.repeat(2*1024*1024)})});await assert.rejects(big.description(place),/too large/);
});
