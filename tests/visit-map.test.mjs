import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createVisitMap} from '../dist/visit-map.js';
import {hasLocation} from '../dist/atlas.js';
import {visitById,visitView} from '../dist/visits.js';

test('visit preview waits for visibility, pauses when covered or hidden, and destroys pending observers',()=>{
 let notify,options,disconnected=0,destroyed=0;const updates=[],visible=[],listeners={};
 const document={hidden:false,addEventListener:(n,f)=>listeners[n]=f,removeEventListener:n=>delete listeners[n]};
 class Observer{constructor(fn){notify=fn;}observe(){}disconnect(){disconnected++;}}
 const record={id:'zero',lat:0,lng:0},before=structuredClone(record);
 const preview=createVisitMap({container:{},record,document,Observer,makeAtlas:opts=>{options=opts;return {update:rows=>updates.push(rows),setVisible:v=>visible.push(v),destroy:()=>destroyed++};}});
 assert.equal(updates.length,0);notify([{isIntersecting:true}]);assert.equal(updates.length,1);assert.equal(options.preview,true);
 preview.setVisible(false);assert.equal(visible.at(-1),false);preview.update({...record,lat:42,lng:-73});assert.equal(updates.length,1);
 preview.setVisible(true);assert.equal(updates.at(-1)[0].lat,42);document.hidden=true;listeners.visibilitychange();assert.equal(visible.at(-1),false);
 document.hidden=false;listeners.visibilitychange();assert.equal(visible.at(-1),true);notify([{isIntersecting:false}]);assert.equal(visible.at(-1),false);
 preview.destroy();notify([{isIntersecting:true}]);assert.equal(destroyed,1);assert.equal(disconnected,1);assert.deepEqual(listeners,{});assert.deepEqual(record,before);
});

test('visit map handoff closes nested dialogs, clears excluding filters and focuses the selected visit without writes',async()=>{
 const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),record={id:'one',title:'One',visited:'2024-01-01',lat:0,lng:0,photos:[],coverIndex:0,tripIds:[],notes:'',rating:0,visits:[{id:'return',visited:'2026-01-01',lat:42,lng:-73,photos:[],coverIndex:0,tripIds:[],notes:'',rating:0}]},before=structuredClone(record);
 let dialogs=[{id:'journeys'},{id:'details'}],blocked=false;const calls=[],search={value:'exclude this place'};
 const context=vm.createContext({records:[record],visitById,visitView,hasLocation,galleryWrites:Promise.resolve(),journalWrites:Promise.resolve(),query:'exclude',category:'Nature',journeyFilter:'other',tagFilter:'other',collectionFilter:'other',explorationCountry:'other',explorationRegion:'other',mapId:null,mapVisit:null,$:id=>id==='search'?search:{scrollIntoView:()=>calls.push('scroll')},navigation:{route:()=>({dialogs}),idle:()=>Promise.resolve()},close:id=>{calls.push(id);if(!blocked)dialogs.pop();},setView:async v=>calls.push(v),render:()=>calls.push('render'),atlas:{select:(id,opts)=>calls.push([id,opts.focus])}});
 vm.runInContext(app.slice(app.indexOf('async function showVisitOnMap('),app.indexOf('async function openDetail(')),context);
 await context.showVisitOnMap('one','return');assert.deepEqual(calls,['details','journeys','map','render',['one',true],'scroll']);assert.equal(context.mapVisit.visitId,'return');assert.equal(context.query,'');assert.equal(search.value,'');assert.deepEqual(record,before);
 calls.length=0;dialogs=[{id:'journeys'},{id:'details'}];blocked=true;await context.showVisitOnMap('one','return');assert.deepEqual(calls,['details']);assert.equal(dialogs.length,2);
});
