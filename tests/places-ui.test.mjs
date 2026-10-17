import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createPlacesUI} from '../dist/places-ui.js';
import {createPlaceSearch} from '../dist/place-search.js';
const turn=()=>new Promise(r=>setImmediate(r));
const point={lat:42.52,lng:-70.9};
const place={id:'poi',title:'Courtyard Cafe',address:'10 Main Street, Salem, Massachusetts, United States',lat:42.525,lng:-70.9,km:.56,category:'Food & Drink',kind:'Cafe',description:'A quiet courtyard.',placeSource:{provider:'openstreetmap',type:'node',id:'123'}};
function fixture({saved=false,trips=true,description=async()=>place.description,locate=async()=>{throw Error('Location unavailable');},listings=[place]}={}){
 const nodes=new Map(),calls=[],drafts=[],statuses=[],queries=[];let results=[],cancelled=0,explored=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,value:id==='places-radius'?'2000':'',hidden:false,open:false,isConnected:true,textContent:'',innerHTML:'',setAttribute(){},replaceChildren(){},focus(){},scrollIntoView(){}});return nodes.get(id);};
 const document={hidden:false,getElementById:node,querySelector:s=>s==='.places-type-picker'?node('types'):null,querySelectorAll:()=>[],createElement:()=>node('created')};
 const journeys=trips?[{id:'trip',title:'Weekend <away>',updatedAt:'2026-10-17T12:00:00Z'},{id:'deleted',title:'Old trip',updatedAt:'2026-10-17T12:00:00Z',deleted:true}]:[];
 const client={ready:Promise.resolve(),cancel(){cancelled++;},recent:()=>[],last:()=>null,search:async(params,options)=>{calls.push(structuredClone({params,options}));return {items:listings.map(p=>({...p})),limited:false,loadedAt:1,retained:true,area:params,areaLabel:'Salem'};}};
 let emit;
 const ui=createPlacesUI({document,events:{},network:{onLine:true},Observer:null,locate,getRecords:()=>saved?[{...place,id:'saved'}]:[],getJourneys:()=>journeys,icon:()=>'',client,details:{description},onPreview:()=>{node('place-preview').open=true;},onSave:(p,id)=>drafts.push({prefill:p,id}),onSaved:()=>{},onStatus:s=>statuses.push(s),onExplore:async()=>{explored++;ui.closePreview();node('place-preview').open=false;},searchFactory:({onState})=>{emit=onState;return {cancel:()=>{results=[];emit({busy:false,results:[],status:''});},search:async(text,options)=>{queries.push({text,options});results=[{name:'Salem',address:'Massachusetts, United States',position:point}];emit({busy:false,results,status:'Choose an area'});},result:i=>results[i]};}});
 ui.wire();ui.setActive(true);
 const click=(id,data)=>node(id).onclick({target:{closest:()=>({dataset:data})}});
 async function choose(){node('places-query').value='Salem';await node('places-query-form').onsubmit({preventDefault(){}});click('places-query-results',{areaResult:'0'});await turn();}
 return {ui,node,calls,drafts,statuses,journeys,choose,click,queries,get explored(){return explored;},get cancelled(){return cancelled;}};
}
test('choosing an area uses selected type and radius, clears text filter and requests discovery only after selection',async()=>{
 const f=fixture();await turn();f.node('places-radius').value='5000';f.click('places-types',{discoveryFilter:'coffee'});f.node('places-filter').oninput({target:{value:'old filter'}});assert.equal(f.calls.length,0);await f.choose();assert.equal(f.calls.length,1);assert.deepEqual(f.calls[0].params,{center:point,groupId:'food',filterId:'coffee',radius:5000});assert.equal(f.node('places-filter').value,'');assert.match(f.node('places-area').textContent,/Salem.*Massachusetts.*5 km/);assert.match(f.node('places-results').innerHTML,/Courtyard Cafe/);
});
test('explore around here changes center while retaining category and radius without writes',async()=>{
 const f=fixture();await f.choose();f.click('places-results',{discoveryPlace:'poi'});await turn();await f.node('explore-discovered-place').onclick();await turn();assert.equal(f.explored,1);assert.deepEqual(f.calls.at(-1).params.center,{lat:place.lat,lng:place.lng});assert.equal(f.calls.at(-1).params.radius,2000);assert.equal(f.calls.at(-1).params.groupId,'food');assert.equal(f.drafts.length,0);
});
test('trip action opens a source-prefilled draft, excludes deleted journeys and does not save a visit directly',async()=>{
 const f=fixture();await f.choose();f.click('places-results',{discoveryPlace:'poi'});await turn();assert.match(f.node('place-preview-content').innerHTML,/Weekend &lt;away&gt;/);assert.ok(!f.node('place-preview-content').innerHTML.includes('Old trip'));f.node('discovery-trip').value='trip';f.node('discovery-trip').onchange();assert.equal(f.node('add-discovered-trip').disabled,false);f.node('add-discovered-trip').onclick();await turn();assert.equal(f.drafts.length,1);assert.deepEqual(f.drafts[0].prefill.tripIds,['trip']);assert.equal(f.drafts[0].prefill.notes,place.description);assert.deepEqual(f.drafts[0].prefill.placeSource,place.placeSource);assert.equal(f.drafts[0].id,undefined);
});
test('a saved source opens a return visit; deleted trip choices and closed previews cannot create late drafts',async()=>{
 const f=fixture({saved:true});await f.choose();f.click('places-results',{discoveryPlace:'poi'});await turn();f.node('discovery-trip').value='trip';f.node('add-discovered-trip').onclick();await turn();assert.equal(f.drafts[0].id,'saved');assert.deepEqual(f.drafts[0].prefill.tripIds,['trip']);f.journeys[0].deleted=true;f.node('add-discovered-trip').onclick();await turn();assert.equal(f.drafts.length,1);assert.match(f.statuses[0],/no longer available/);
 let resolve;const slow=fixture({description:()=>new Promise(r=>resolve=r)});await slow.choose();slow.click('places-results',{discoveryPlace:'poi'});const pending=slow.node('keep-discovered-place').onclick();slow.ui.closePreview();resolve('Late description');await pending;assert.equal(slow.drafts.length,0);
});
test('editor receives trip membership for both new places and return visits before draft capture',async()=>{
 const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');const start=source.indexOf('async function openEditor('),end=source.indexOf('\nfunction draftPosition()',start);const fn=source.slice(start,end);
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',hidden:false,open:false,checked:false,textContent:'',innerHTML:'',reset(){}});return nodes.get(id);};
 let trips,opened,checkpointed=0;const record={id:'saved',title:'Saved title',tripIds:['earlier'],updatedAt:'2026-10-17T12:00:00Z'};
 const context=vm.createContext({$:get,draftClosing:Promise.resolve(),draftsReady:true,recoveryFound:null,detailRevision:0,galleryWrites:Promise.resolve(),journalWrites:Promise.resolve(),storageReady:true,storageBusy:false,records:[record],editorSession:0,photoReadVersion:0,gpsRequestVersion:0,locationPending:false,pendingPhotoMetadata:null,editVisitId:null,draftSource:null,baseDraftUpdatedAt:null,draftRecovered:false,draftSaved:false,cameraIntent:null,editId:null,draftPhoto:null,draftAudio:null,draftArt:null,draftPhotos:[],draftCover:0,regionRequest:0,regionLabelVersion:0,editorAutoLabels:null,journeyFilter:'earlier',draftBaseline:null,syncSave(){},today:()=> '2026-10-17',photosOf:()=>[],coverOf:()=>0,countryOptions:()=>'',categoryChoices:()=>['Food & Drink'],esc:s=>s,renderEditorTrips:ids=>trips=Array.from(ids),refreshDraft(){},editorSnapshot:()=>({}),syncRegionFields(){},draftRecovery:{begin(){}},show:id=>opened=id,scheduleDraft(){},checkpointDraft:async()=>checkpointed++,fillEditorRegion(){}});
 vm.runInContext(fn,context);const prefill={...place,tripIds:['trip']};await context.openEditor(null,null,null,prefill);assert.deepEqual(trips,['trip']);assert.equal(get('editor-trips').open,true);assert.equal(opened,'editor');assert.equal(get('editor-title').textContent,'A new footprint.');await context.openEditor('saved',null,'new',prefill);assert.deepEqual(trips,['trip']);assert.equal(get('title').value,'Saved title');assert.equal(get('notes').value,'');assert.equal(context.editId,'saved');assert.equal(checkpointed,2);assert.deepEqual(record.tripIds,['earlier']);
});
test('Places search has area-specific feedback while existing editor search defaults remain unchanged',async()=>{
 let state;const search=createPlaceSearch({network:{onLine:false},messages:{offline:'Area search needs internet.'},onState:s=>state=s});await search.search('Salem');assert.equal(state.status,'Area search needs internet.');const old=createPlaceSearch({network:{onLine:false},onState:s=>state=s});await old.search('Salem');assert.match(state.status,/enter coordinates in the editor/);
});

test('Search requests device location before sending a query and uses it without moving the chosen discovery area',async()=>{
 let resolve;const f=fixture({locate:()=>new Promise(r=>resolve=r)});await turn();f.node('places-query').value='Dunkin';const pending=f.node('places-query-form').onsubmit({preventDefault(){}});assert.equal(f.queries.length,0);assert.match(f.node('places-query-status').textContent,/Finding your location/);resolve({coords:{latitude:point.lat,longitude:point.lng}});await pending;assert.deepEqual(f.queries[0].options.near,point);assert.equal(f.queries[0].options.sort,'closest');assert.equal(f.calls.length,0);
});
test('native permission pause preserves search intent and waits for foreground before requesting results',async()=>{
 let resolve;const f=fixture({locate:()=>new Promise(r=>resolve=r)});await turn();f.node('places-query').value='Dunkin';const pending=f.node('places-query-form').onsubmit({preventDefault(){}});f.ui.syncVisibility(false,true);resolve({coords:{latitude:point.lat,longitude:point.lng}});await pending;assert.equal(f.queries.length,0);f.ui.syncVisibility(true,false);await turn();assert.equal(f.queries.length,1);assert.deepEqual(f.queries[0].options.near,point);
});
test('editing, cancelling and leaving Places discard pending location results',async()=>{
 for(const cancel of [f=>f.node('places-query').oninput(),f=>f.node('places-query-cancel').onclick(),f=>f.ui.setActive(false)]){
  let resolve;const f=fixture({locate:()=>new Promise(r=>resolve=r)});await turn();f.node('places-query').value='Dunkin';const pending=f.node('places-query-form').onsubmit({preventDefault(){}});cancel(f);resolve({coords:{latitude:point.lat,longitude:point.lng}});await pending;assert.equal(f.queries.length,0);
 }
});
test('denied location uses the current area if available and otherwise leaves suggestions usable',async()=>{
 const f=fixture();await turn();f.node('places-query').value='Dunkin';await f.node('places-query-form').onsubmit({preventDefault(){}});assert.equal(f.queries[0].options.near,null);assert.match(f.node('places-query-status').textContent,/Location unavailable/);assert.match(f.node('places-query-results').innerHTML,/Salem/);
 const saved=fixture({saved:true});await turn();saved.node('places-query').value='Dunkin';await saved.node('places-query-form').onsubmit({preventDefault(){}});assert.deepEqual(saved.queries[0].options.near,{lat:place.lat,lng:place.lng});
});
test('closest and name sort reorder nearby listings locally using device distance',async()=>{
 const f=fixture({locate:async()=>({coords:{latitude:point.lat,longitude:point.lng}}),listings:[{...place,id:'far',title:'A far cafe',lat:42.529,km:.1},{...place,id:'near',title:'Z near cafe',lat:42.521,km:9}]});await f.choose();let html=f.node('places-results').innerHTML;assert.ok(html.indexOf('Z near')<html.indexOf('A far'));assert.match(html,/from you/);const calls=f.calls.length;f.node('places-sort').value='name';f.node('places-sort').onchange();html=f.node('places-results').innerHTML;assert.ok(html.indexOf('A far')<html.indexOf('Z near'));assert.equal(f.calls.length,calls);
});
