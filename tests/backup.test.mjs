import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBackup,parseBackup,mergeRecords,filterRecords,validateRecord} from '../dist/model.js';
const record=(extra={})=>({id:'memory-1',title:'Café & <sunset>',address:'A place near home',notes:'A voice and a view.\nSecond line.',category:'Travel',visited:'2026-10-15',rating:5,favorite:true,lat:0,lng:0,phone:'+1 555 1234',url:'https://example.com',updatedAt:'2026-10-15T12:00:00.000Z',photo:'data:image/png;base64,iVBORw0KGgo=',audio:'data:audio/webm;base64,AQIDBA==',sampleArt:null,...extra});
test('portable backup preserves original media, Unicode, zero coordinates, IDs and preferences',()=>{const original=record();const parsed=parseBackup(JSON.stringify(makeBackup([original],{theme:'night'})));assert.deepEqual(parsed.records,[original]);assert.deepEqual(parsed.settings,{theme:'night'});});
test('incompatible apps, unsupported versions and malformed files are rejected',()=>{const valid=makeBackup([record()]);assert.throws(()=>parseBackup('{broken'),/readable/);assert.throws(()=>parseBackup(JSON.stringify({...valid,app:'nth-reader'})),/other Nth apps/);assert.throws(()=>parseBackup(JSON.stringify({...valid,formatVersion:9})),/version/);assert.throws(()=>parseBackup(JSON.stringify({...valid,records:[record(),record()]})),/duplicate/);});
test('invalid attachments, links, dates and coordinate pairs fail before merge',()=>{for(const extra of [{photo:'data:image/svg+xml;base64,PHN2Zz4='},{audio:'https://example.com/a.mp3'},{photo:'data:image/png;base64,AA='},{url:'javascript:alert(1)'},{lat:null,lng:0},{lat:91,lng:0},{visited:'2026-02-30'},{rating:6}])assert.throws(()=>parseBackup(JSON.stringify({app:'nth-footprints',formatVersion:1,settings:{theme:'paper'},records:[{...record(),...extra}]})));});
test('restore merges newer revisions, retains newer local memories and leaves unrelated entries',()=>{const existing=[record(),record({id:'local-only',title:'Local'})];const old=record({updatedAt:'2026-10-14T12:00:00Z',title:'Older'});const newer=record({updatedAt:'2026-10-16T12:00:00Z',title:'Newer'});const original=structuredClone(existing);assert.deepEqual(mergeRecords(existing,[old]),{records:existing,added:0,updated:0,kept:1});const next=mergeRecords(existing,[newer,record({id:'new-place'})]);assert.equal(next.added,1);assert.equal(next.updated,1);assert.equal(next.records.length,3);assert.equal(next.records.find(r=>r.id==='memory-1').title,'Newer');assert.deepEqual(existing,original);assert.equal(mergeRecords(next.records,next.records).kept,3);});
test('search, category, favorites and sorting compose without mutating the journal',()=>{const a=record(),b=record({id:'b',title:'Forest walk',notes:'Moss and rain',category:'Nature',favorite:false,rating:3,visited:'2026-10-16'});const rows=[a,b];assert.deepEqual(filterRecords(rows,{query:'MOSS',category:'Nature'}),[b]);assert.deepEqual(filterRecords(rows,{favorites:true}),[a]);assert.deepEqual(filterRecords(rows,{sort:'newest'}),[b,a]);assert.deepEqual(filterRecords(rows,{sort:'rating'}),[a,b]);assert.deepEqual(rows,[a,b]);});
test('HTML-like journal text remains text in the data model',()=>{const r=record({notes:'<img src=x onerror=alert(1)>',title:'<b>A place</b>'});assert.equal(validateRecord(r).notes,r.notes);});

test('a personal footprint clears untouched starters and preserves edited examples', async()=>{
 const {SAMPLE_TIMESTAMP,withoutStarterSamples}=await import('../dist/model.js');
 const starter=record({id:'demo-coast',updatedAt:SAMPLE_TIMESTAMP});
 const edited=record({id:'demo-city',updatedAt:'2026-10-15T15:00:00Z',notes:'My own note'});
 const own=record({id:'my-place'});const before=[starter,edited,own],copy=structuredClone(before);
 assert.deepEqual(withoutStarterSamples(before),[edited,own]);assert.deepEqual(before,copy);
 assert.deepEqual(withoutStarterSamples([starter,edited]),[starter,edited]);
});
test('starter cleanup preserves unrelated records even if their title or art matches',async()=>{
 const {SAMPLE_TIMESTAMP,withoutStarterSamples}=await import('../dist/model.js');
 const own=record({id:'demo-my-own-place',title:'Cannon Beach',sampleArt:'coast',updatedAt:SAMPLE_TIMESTAMP});
 assert.deepEqual(withoutStarterSamples([own]),[own]);assert.deepEqual(withoutStarterSamples([]),[]);
});
test('restored personal backups clear untouched starters without changing attached media',async()=>{
 const {SAMPLE_TIMESTAMP,withoutStarterSamples}=await import('../dist/model.js');
 const starter=record({id:'demo-coast',updatedAt:SAMPLE_TIMESTAMP});const own=record({id:'personal-memory'});
 const restored=parseBackup(JSON.stringify(makeBackup([own]))).records;
 const cleaned=withoutStarterSamples(mergeRecords([starter],restored).records);
 assert.deepEqual(cleaned,[own]);assert.equal(cleaned[0].photo,own.photo);assert.equal(cleaned[0].audio,own.audio);
});
