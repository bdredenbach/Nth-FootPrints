import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {mapPosition,distanceKm,distanceLabel,nearestPlaces,createNearbyLookup,createPositionPicker} from '../dist/location-tools.js';
import {hasLocation} from '../dist/atlas.js';
import {filterRecords} from '../dist/model.js';
import {RELEASES,APP_VERSION} from '../dist/releases.js';
const point=(lat,lng)=>({lat,lng});
const place=(id,lat,lng,category='Travel')=>({id,title:id,lat,lng,category,visited:'2026-10-15'});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const fix=(lat,lng)=>({coords:{latitude:lat,longitude:lng,accuracy:8}});
test('distance calculation handles zero, date line, antipodes and invalid locations',()=>{
 assert.equal(distanceKm(point(0,0),point(0,0)),0);
 assert.ok(Math.abs(distanceKm(point(0,0),point(0,1))-111.195)<.01);
 assert.ok(distanceKm(point(0,179.9),point(0,-179.9))<23);
 assert.ok(Math.abs(distanceKm(point(0,0),point(0,180))-20015.114)<.01);
 assert.equal(distanceKm(point(null,0),point(0,0)),null);
 assert.deepEqual(mapPosition(point(43,286)),point(43,-74));
 assert.deepEqual(mapPosition(point(0,-541)),point(0,179));
 assert.equal(mapPosition(point(91,0)),null);assert.equal(mapPosition(point(0,Infinity)),null);
 assert.equal(distanceLabel(.12),'120 m');assert.match(distanceLabel(12.5),/12.5 km/);
});
test('nearest saved places preserve records, obey filters and keep missing locations separate',()=>{
 const records=[place('far',0,2),place('missing',null,null),place('near',0,0,'Nature'),place('same',0,0)],before=structuredClone(records);
 const ranked=nearestPlaces(records,point(0,0));assert.deepEqual(ranked.map(p=>p.record.id),['near','same','far']);assert.deepEqual(records,before);
 assert.deepEqual(nearestPlaces(filterRecords(records,{category:'Nature'}),point(0,0)).map(p=>p.record.id),['near']);
 assert.deepEqual(nearestPlaces(records,point(null,null)),[]);
});
test('nearby lookup is explicit and reports accuracy without writing footprint coordinates',async()=>{
 const d=deferred(),changes=[],statuses=[],busy=[];let calls=0;
 const lookup=createNearbyLookup({locate:()=>{calls++;return d.promise;},onChange:v=>changes.push(v),onStatus:v=>statuses.push(v),onBusy:v=>busy.push(v)});
 assert.equal(calls,0);const pending=lookup.refresh();assert.equal(calls,1);assert.deepEqual(changes,[]);
 d.resolve(fix(0,0));await pending;assert.deepEqual(changes,[point(0,0)]);assert.match(statuses.at(-1),/straight-line.*8 m/);assert.deepEqual(busy,[true,false]);
 lookup.clear();assert.equal(lookup.getOrigin(),null);assert.equal(changes.at(-1),null);
});
test('clearing, closing a view or starting a newer nearby request rejects late results',async()=>{
 const first=deferred(),second=deferred(),changes=[];let calls=0;
 const lookup=createNearbyLookup({locate:()=>++calls===1?first.promise:second.promise,onChange:v=>changes.push(v)});
 const a=lookup.refresh(),b=lookup.refresh();second.resolve(fix(1,2));await b;first.resolve(fix(3,4));await a;assert.deepEqual(changes,[point(1,2)]);
 for(const action of ['clear','cancel']){
  const d=deferred(),updates=[],busy=[];const l=createNearbyLookup({locate:()=>d.promise,onChange:v=>updates.push(v),onBusy:v=>busy.push(v)});
  const pending=l.refresh();l[action]();d.resolve(fix(5,6));await pending;
  assert.deepEqual(updates,action==='clear'?[null]:[]);assert.equal(busy.at(-1),false);
 }
});
test('nearby permission errors leave the last successful origin intact and permit retry',async()=>{
 let fail=false;const statuses=[],busy=[];const lookup=createNearbyLookup({locate:async()=>{if(fail)throw Error('denied');return fix(3,4);},onStatus:v=>statuses.push(v),onBusy:v=>busy.push(v)});
 await lookup.refresh();fail=true;await lookup.refresh();assert.deepEqual(lookup.getOrigin(),point(3,4));assert.match(statuses.at(-1),/Allow Location access/);assert.equal(busy.at(-1),false);
});
function pickerFixture(initial=null,{online=true,delayed=false}={}){
 const changes=[],statuses=[],handlers={},frames=[],network={onLine:online};let map,tiles;
 const events={addEventListener:(n,f)=>handlers[n]=f,removeEventListener:(n,f)=>{if(handlers[n]===f)delete handlers[n];}};
 const L={
  map(){return map={handlers:{},layers:new Set(),center:null,zoom:2,removed:false,
   setView(p,z){this.center=point(p[0],p[1]);this.zoom=z;return this;},getCenter(){return this.center;},getZoom(){return this.zoom;},
   on(n,f){this.handlers[n]=f;return this;},hasLayer(l){return this.layers.has(l);},removeLayer(l){this.layers.delete(l);},invalidateSize(){},remove(){this.removed=true;this.layers.clear();}
  };},
  tileLayer(url,options){return tiles={url,options,handlers:{},redraws:0,on(n,f){this.handlers[n]=f;return this;},addTo(m){m.layers.add(this);return this;},redraw(){this.redraws++;}};}
 };
 const picker=createPositionPicker({container:{replaceChildren(){}},L,initial,events,network,frame:f=>delayed?frames.push(f):f(),onChange:p=>changes.push(p),onStatus:s=>statuses.push(s)});
 return {picker,map,tiles,network,handlers,frames,changes,statuses};
}
test('map picker starts at saved coordinates and returns detached draft values only',()=>{
 const original=point(43,-74),f=pickerFixture(original);assert.equal(f.map.zoom,15);assert.deepEqual(f.picker.getPosition(),original);
 const returned=f.picker.getPosition();returned.lat=9;assert.equal(f.picker.getPosition().lat,43);
 f.map.handlers.click({latlng:point(45,286)});assert.deepEqual(f.picker.getPosition(),point(45,-74));assert.deepEqual(original,point(43,-74));
 assert.match(f.tiles.options.attribution,/OpenStreetMap/);f.picker.destroy();assert.equal(f.picker.getPosition(),null);assert.equal(f.map.removed,true);assert.deepEqual(f.handlers,{});
});
test('unlocated draft requires a tap or map movement; keyboard panning can select its center',()=>{
 const f=pickerFixture();assert.equal(f.picker.getPosition(),null);f.map.handlers.moveend();assert.equal(f.picker.getPosition(),null);
 f.map.center=point(0,0);f.map.handlers.movestart();f.map.handlers.moveend();assert.deepEqual(f.picker.getPosition(),point(0,0));
 f.picker.setPosition(point(4,5));assert.deepEqual(f.map.center,point(4,5));assert.equal(f.picker.setPosition(point(91,0)),false);
});
test('picker supports offline coordinate adjustment, retry and cleanup of delayed callbacks',()=>{
 const f=pickerFixture(null,{online:false});assert.equal(f.map.hasLayer(f.tiles),false);assert.equal(f.statuses.at(-1).state,'offline');
 f.picker.setPosition(point(1,2));assert.deepEqual(f.picker.getPosition(),point(1,2));f.network.onLine=true;f.handlers.online();assert.equal(f.map.hasLayer(f.tiles),true);
 f.tiles.handlers.tileerror();f.tiles.handlers.load();assert.equal(f.statuses.at(-1).state,'error');f.picker.retry();f.tiles.handlers.load();assert.equal(f.statuses.at(-1).state,'ready');
 f.network.onLine=false;f.handlers.offline();assert.equal(f.map.hasLayer(f.tiles),false);
 f.picker.destroy();const count=f.statuses.length;f.tiles.handlers.tileerror();assert.equal(f.statuses.length,count);assert.equal(f.picker.setPosition(point(1,2)),false);
 const d=pickerFixture(null,{delayed:true});d.picker.destroy();d.frames[0]();assert.equal(d.map.hasLayer(d.tiles),false);
});
const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
function editorFixture(){
 const ids=['lat','lng','use-location','location-status','editor','pin-picker','picker-locate','picker-error','apply-position','position-coordinates','position-map','picker-status','picker-retry'];
 const nodes=Object.fromEntries(ids.map(id=>[id,{value:'',open:['editor','pin-picker'].includes(id),textContent:'',disabled:false,close(){this.open=false;}}]));
 let change;const context=vm.createContext({$:id=>nodes[id],picker:null,pickerRequest:0,gpsRequestVersion:0,locationPending:false,syncSave(){},hasLocation,window:{L:{}},show(){},device:{},createPositionPicker:options=>{change=options.onChange;return {getPosition:()=>point(43,-74),setPosition(p){change(p);},destroy(){}};}});
 vm.runInContext(app.slice(app.indexOf('function draftPosition()'),app.indexOf('function renderReleases()')),context);
 return {context,nodes,change:()=>change};
}
test('app applies a chosen pin to the editor draft, leaves title alone and requires normal save',()=>{
 const f=editorFixture();f.nodes.lat.value='';f.nodes.lng.value='';assert.equal(f.context.draftPosition(),null);
 f.nodes.lat.value='0';f.nodes.lng.value='0';assert.equal(f.context.draftPosition().lat,0);
 f.context.openPicker();f.context.applyPicker();assert.equal(f.nodes.lat.value,'43.000000');assert.equal(f.nodes.lng.value,'-74.000000');assert.match(f.nodes['location-status'].textContent,/Save the footprint/);assert.equal(f.nodes['pin-picker'].open,false);assert.ok(f.context.gpsRequestVersion>0);
});
test('picker GPS cannot overwrite a newer manual selection or a closed picker',async()=>{
 for(const action of ['move','close']){
  const f=editorFixture(),d=deferred();f.context.device.currentPosition=()=>d.promise;f.context.openPicker();const pending=f.context.locatePicker();
  if(action==='move')f.change()(point(2,3));else {f.nodes['pin-picker'].open=false;f.context.closePicker();}
  d.resolve(fix(9,9));await pending;assert.equal(f.nodes.lat.value,'');assert.equal(f.nodes['picker-locate'].disabled,false);
  assert.notEqual(f.nodes['picker-error'].textContent,'GPS accuracy about 8 m. Adjust the map if needed.');
 }
});
test('release history is chronological, matches the app package and describes shipped features',()=>{
 const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 assert.equal(APP_VERSION,pkg.version);assert.equal(RELEASES.at(-1).version,APP_VERSION);assert.equal(new Set(RELEASES.map(r=>r.version)).size,RELEASES.length);
 for(let i=1;i<RELEASES.length;i++){
  assert.ok(RELEASES[i].date>=RELEASES[i-1].date);
  assert.ok(RELEASES[i].version.localeCompare(RELEASES[i-1].version,undefined,{numeric:true})>0);
 }
 assert.match(RELEASES.at(-1).summary,/location on the map/);
 const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');assert.match(html,/What’s in this version\?/);assert.doesNotMatch(html,/What’s in this first version\?/);
});
test('map list renders distance order, missing-location actions and selected footprint together',()=>{
 const ids=['atlas-count','fit-places','map-list','map-selection'],nodes=Object.fromEntries(ids.map(id=>[id,{}]));
 const context=vm.createContext({$:id=>nodes[id],mapId:'far',nearbyOrigin:point(0,0),nearestPlaces,distanceLabel,hasLocation,esc:s=>String(s??''),art:()=>'',directions:()=>'',icon:()=>''});
 vm.runInContext(app.slice(app.indexOf('function renderMapList('),app.indexOf('function renderMap(')),context);
 context.renderMapList([place('far',0,2),place('missing',null,null),place('near',0,0)]);
 const html=nodes['map-list'].innerHTML;assert.ok(html.indexOf('data-map="near"')<html.indexOf('data-map="far"'));assert.ok(html.indexOf('data-map="far"')<html.indexOf('data-edit="missing"'));
 assert.match(html,/0 m away/);assert.match(nodes['atlas-count'].textContent,/2 pinned places · 1 without/);assert.equal(nodes['map-selection'].hidden,false);assert.match(nodes['map-selection'].innerHTML,/far/);
 context.nearbyOrigin=null;context.renderMapList([place('far',0,2),place('near',0,0)]);assert.doesNotMatch(nodes['map-list'].innerHTML,/ away/);assert.ok(nodes['map-list'].innerHTML.indexOf('data-map="far"')<nodes['map-list'].innerHTML.indexOf('data-map="near"'));
});
test('version dialog renders oldest to newest and marks only the current release',()=>{
 const nodes={'release-version':{},'release-history':{}};const context=vm.createContext({$:id=>nodes[id],APP_VERSION,RELEASES,esc:s=>s,date:s=>s});
 vm.runInContext(app.slice(app.indexOf('function renderReleases()'),app.indexOf('function asDataURL(')),context);context.renderReleases();
 const html=nodes['release-history'].innerHTML;assert.ok(html.indexOf('Version 0.2.2')<html.indexOf('Version 0.3.1'));assert.equal((html.match(/release-current/g)||[]).length,1);assert.match(nodes['release-version'].textContent,/0.3.1/);
});
