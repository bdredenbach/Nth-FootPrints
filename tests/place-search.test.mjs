import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createPlaceSearch,placeResults,samePlacePoint,SEARCH_ENDPOINT} from '../dist/place-search.js';
import {hasLocation} from '../dist/atlas.js';
const feature=(name='Cafe',coordinates=[-74,43],properties={})=>({type:'Feature',geometry:{type:'Point',coordinates},properties:{name,street:'Main Street',housenumber:'10',city:'Little Falls',state:'New York',country:'United States',...properties}});
const payload=(...features)=>({type:'FeatureCollection',features});
const response=data=>new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const turn=()=>new Promise(r=>setImmediate(r));
function fixture(options={}){const calls=[],states=[];let time=10000;const controller=createPlaceSearch({fetcher:async(...args)=>{calls.push(args);return response(payload(feature()));},network:{onLine:true},now:()=>time,onState:s=>states.push(s),...options});return {controller,calls,states,advance:delta=>{time+=delta;}};}
test('address normalization preserves coordinate order, formats context, deduplicates and limits results',()=>{
 const rows=placeResults(payload(feature(),feature(),feature('Different',[12,45]),...Array.from({length:10},(_,i)=>feature('Place '+i,[i,0]))));
 assert.equal(rows.length,5);assert.deepEqual(rows[0].position,{lat:43,lng:-74});assert.equal(rows[0].address,'10 Main Street, Little Falls, New York, United States');
 assert.equal(placeResults(payload(feature('One',[180,0])))[0].position.lng,-180);assert.equal(samePlacePoint({lat:0,lng:180},{lat:0,lng:-180}),true);
 const duplicates=placeResults(payload(feature('Cafe',[-74,43],{osm_type:'N',osm_id:123}),feature('Other name',[-75,44],{osm_type:'N',osm_id:123})));assert.equal(duplicates.length,1);
});
test('invalid coordinates, non-point geometries and unnamed unusable data are discarded',()=>{
 const invalid=[null,{},feature('Bad',[null,0]),feature('Bad',['1',0]),feature('Bad',[0,91]),feature('Bad',[181,0]),feature('Bad',[0,NaN]),{...feature(),geometry:{type:'Polygon',coordinates:[]}},feature('',[0,0],{street:'',housenumber:'',city:'',state:'',country:''})];
 assert.deepEqual(placeResults(payload(...invalid)),[]);assert.throws(()=>placeResults({wrong:[]}),/unreadable/);
 const house=placeResults(payload(feature('',[0,0])))[0];assert.equal(house.name,'10 Main Street');assert.equal(house.position.lat,0);
});
test('provider text is bounded and normalized without treating HTML as executable markup',()=>{
 const r=placeResults(payload(feature(' <img src=x>\n'+ 'x'.repeat(200),[0,0],{street:'x'.repeat(1000),country:'y'.repeat(1000)})))[0];assert.equal(r.name.length,160);assert.ok(r.address.length<=500);assert.ok(r.name.includes('<img'));assert.ok(!r.name.includes('\n'));
});
test('requests are explicit, limited to five and omit credentials, location bias and journal content',async()=>{
 const f=fixture();assert.equal(f.calls.length,0);await f.controller.search('  Cafe & tea,  Little Falls  ');
 assert.equal(f.calls.length,1);const [url,options]=f.calls[0],u=new URL(url);assert.equal(u.origin+u.pathname,SEARCH_ENDPOINT);assert.equal(u.searchParams.get('q'),'Cafe & tea, Little Falls');assert.equal(u.searchParams.get('limit'),'5');assert.equal(u.searchParams.get('lat'),null);assert.equal(u.searchParams.get('lon'),null);assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.redirect,'error');assert.equal(f.states.at(-1).busy,false);assert.equal(f.states.at(-1).results[0].name,'Cafe');
 const detached=f.controller.result(0);detached.position.lat=99;assert.equal(f.controller.result(0).position.lat,43);assert.equal(f.controller.result(-1),null);
});
test('empty, short, overlong and offline searches issue no network request',async()=>{
 const f=fixture();for(const q of ['', 'NY','x'.repeat(201)])await f.controller.search(q);assert.equal(f.calls.length,0);assert.match(f.states.at(-1).status,/3–200/);
 const offline=fixture({network:{onLine:false}});await offline.controller.search('New York');assert.equal(offline.calls.length,0);assert.match(offline.states.at(-1).status,/Offline/);
});
test('successful queries use a short-lived memory cache and different requests obey the interval',async()=>{
 const f=fixture();await f.controller.search('Cafe NYC');await f.controller.search('cafe nyc');assert.equal(f.calls.length,1);await f.controller.search('Other NYC');assert.equal(f.calls.length,1);assert.match(f.states.at(-1).status,/wait/);
 f.advance(1500);await f.controller.search('Other NYC');assert.equal(f.calls.length,2);f.advance(5*60*1000+1);await f.controller.search('Cafe NYC');assert.equal(f.calls.length,3);
});
test('cache is bounded and stale query data does not accumulate without limit',async()=>{
 const f=fixture();for(let i=0;i<11;i++){await f.controller.search('Cafe '+i);f.advance(1500);}await f.controller.search('Cafe 0');assert.equal(f.calls.length,12);
});
test('editing or closing cancels pending work and ignores a late successful response',async()=>{
 const gate=deferred(),states=[];let signal;
 const f=fixture({fetcher:async(_,options)=>{signal=options.signal;return gate.promise;},onState:s=>states.push(s)});const pending=f.controller.search('Cafe NYC');f.controller.cancel();assert.equal(signal.aborted,true);gate.resolve(response(payload(feature('Late'))));await pending;await turn();assert.equal(states.at(-1).results.length,0);assert.equal(states.at(-1).busy,false);assert.equal(f.controller.result(0),null);
});
test('a newer search wins even when an older response finishes last',async()=>{
 const gate=deferred();let calls=0;const f=fixture({minInterval:0,fetcher:async()=>++calls===1?gate.promise:response(payload(feature('New')))});
 const old=f.controller.search('Old query');await f.controller.search('New query');gate.resolve(response(payload(feature('Old'))));await old;assert.equal(f.states.at(-1).results[0].name,'New');
});
test('HTTP throttling respects Retry-After without automatic retries or stale cooldown changes',async()=>{
 let calls=0;const f=fixture({fetcher:async()=>{calls++;return new Response('',{status:429,headers:{'Retry-After':'30'}});}});await f.controller.search('Cafe NYC');assert.match(f.states.at(-1).status,/busy/);f.advance(2000);await f.controller.search('Other NYC');assert.equal(calls,1);assert.match(f.states.at(-1).status,/28 seconds/);f.advance(28000);await f.controller.search('Other NYC');assert.equal(calls,2);
 const gate=deferred();let n=0;const g=fixture({minInterval:0,fetcher:async()=>++n===1?gate.promise:response(payload(feature()))});const old=g.controller.search('Old query');await g.controller.search('New query');gate.resolve(new Response('',{status:429,headers:{'Retry-After':'300'}}));await old;await g.controller.search('Third query');assert.equal(n,3);
});
test('timeouts finish a search even if the transport ignores abort, leaving manual selection available',async()=>{
 const f=fixture({fetcher:()=>new Promise(()=>{}),timeoutMs:10});await f.controller.search('Cafe NYC');assert.equal(f.states.at(-1).busy,false);assert.match(f.states.at(-1).status,/timed out/);
});
test('unavailable, malformed and oversized responses produce a retryable message',async()=>{
 for(const make of [()=>new Response('',{status:503}),()=>new Response('<html>no</html>'),()=>response({features:'not-array'}),()=>new Response('x',{headers:{'Content-Length':'999999'}}),()=>new Response('x'.repeat(256*1024+1)),()=>{throw new TypeError('network');}]){
  const f=fixture({fetcher:async()=>make()});await f.controller.search('Cafe NYC');assert.equal(f.states.at(-1).busy,false);assert.deepEqual(f.states.at(-1).results,[]);assert.match(f.states.at(-1).status,/unavailable|unreadable|too much|connect/);
 }
 const empty=fixture({fetcher:async()=>response(payload())});await empty.controller.search('Nothing here');assert.match(empty.states.at(-1).status,/No places found/);
});
const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
function editorFixture(){
 const ids=['lat','lng','title','address','use-location','location-status','editor','pin-picker','picker-locate','picker-error','apply-position','position-coordinates','position-map','picker-status','picker-retry','place-query','picker-fill-details','picker-place','picker-details-option','place-search-button','place-search-cancel','place-search-status','place-results'];
 const nodes=Object.fromEntries(ids.map(id=>[id,{value:'',checked:true,open:['editor','pin-picker'].includes(id),innerHTML:'',textContent:'',disabled:false,querySelectorAll:()=>[],scrollIntoView(){},focus(){},blur(){}}]));let change,point=null,cancelled=0;const found={name:'A cafe',address:'10 Main Street',position:{lat:43,lng:-74}};
 const c=vm.createContext({$:id=>nodes[id],close:id=>{nodes[id].open=false;},picker:null,pickerPlace:null,pickerRequest:0,gpsRequestVersion:0,locationPending:false,syncSave(){},hasLocation,samePlacePoint,window:{L:{}},show(){},device:{},placeSearch:{cancel(){cancelled++;},result:()=>structuredClone(found)},esc:s=>String(s).replaceAll('<','&lt;'),offlineMaps:undefined,createPositionPicker:options=>{change=options.onChange;change(point);return {getPosition:()=>point,setPosition(p){point={...p};change(point);return true;},destroy(){}};}});
 vm.runInContext(app.slice(app.indexOf('function draftPosition()'),app.indexOf('function renderReleases()')),c);
 return {c,nodes,found,move:p=>{point=p;change(p);},get cancelled(){return cancelled;}};
}
test('actual picker previews a search result without writing editor fields, then applies only empty details',()=>{
 const f=editorFixture();f.c.openPicker();f.c.previewPlace(0);assert.equal(f.nodes.lat.value,'');assert.equal(f.nodes.title.value,'');assert.equal(f.nodes.address.value,'');assert.match(f.nodes['picker-place'].textContent,/A cafe/);f.c.applyPicker();assert.equal(f.nodes.lat.value,'43.000000');assert.equal(f.nodes.lng.value,'-74.000000');assert.equal(f.nodes.title.value,'A cafe');assert.equal(f.nodes.address.value,'10 Main Street');assert.equal(f.nodes['pin-picker'].open,false);
});
test('search selection never overwrites existing text, and optional detail filling can be disabled',()=>{
 const f=editorFixture();f.nodes.title.value='My title';f.nodes.address.value='My address';f.c.openPicker();f.c.previewPlace(0);f.c.applyPicker();assert.equal(f.nodes.title.value,'My title');assert.equal(f.nodes.address.value,'My address');
 const g=editorFixture();g.c.openPicker();g.c.previewPlace(0);g.nodes['picker-fill-details'].checked=false;g.c.applyPicker();assert.equal(g.nodes.title.value,'');assert.equal(g.nodes.address.value,'');assert.equal(g.nodes.lat.value,'43.000000');
});
test('moving away from a result clears its name/address association before applying a manual spot',()=>{
 const f=editorFixture();f.c.openPicker();f.c.previewPlace(0);f.move({lat:44,lng:-75});assert.equal(f.c.pickerPlace,null);assert.equal(f.nodes['picker-details-option'].hidden,true);f.c.applyPicker();assert.equal(f.nodes.lat.value,'44.000000');assert.equal(f.nodes.title.value,'');assert.equal(f.nodes.address.value,'');
});
test('closing the picker cancels search and discards its result without altering the editor',()=>{
 const f=editorFixture();f.c.openPicker();f.c.previewPlace(0);const count=f.cancelled;f.nodes['pin-picker'].open=false;f.c.closePicker();assert.equal(f.cancelled,count+1);assert.equal(f.c.pickerPlace,null);assert.equal(f.nodes.lat.value,'');assert.equal(f.nodes.title.value,'');
});
test('result labels are escaped when the actual UI renders provider text',()=>{
 const f=editorFixture();f.c.renderPlaceSearch({busy:false,status:'Done',results:[{name:'<img onerror=bad>',address:'<script>bad</script>',position:{lat:0,lng:0}}]});assert.doesNotMatch(f.nodes['place-results'].innerHTML,/<img|<script/);assert.match(f.nodes['place-results'].innerHTML,/&lt;img/);
});
