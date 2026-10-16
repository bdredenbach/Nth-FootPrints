import test from 'node:test';
import assert from 'node:assert/strict';
import {COUNTRIES,countryCode,countryName,regionsFor,canonicalRegion,mergePlaceLabels,countryOptions} from '../dist/geography.js';
import {createRegionLookup,regionLabels} from '../dist/region-lookup.js';
const point={lat:40.7128,lng:-74.006},payload={results:[{country_code:'us',country:'United States of America',state:'New York',state_code:'NY'}]};
const store=()=>{const rows=new Map();return {getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,v),rows};};
const setup=options=>createRegionLookup({apiKey:'test-key',network:{onLine:true},minInterval:0,wait:async()=>{},...options});
test('country presets and U.S./Canadian subdivisions resolve aliases without dropping custom saved labels',()=>{
 assert.equal(COUNTRIES.length,249);assert.equal(new Set(COUNTRIES.map(c=>c.code)).size,249);for(const c of ['USA','US','United States of America','United States'])assert.equal(countryCode(c),'US');assert.equal(countryCode('Canada'),'CA');assert.equal(countryCode('UK'),'GB');assert.equal(countryName('ca'),'Canada');assert.equal(regionsFor('Canada').length,13);assert.ok(regionsFor('USA').includes('Massachusetts'));assert.ok(regionsFor('USA').includes('Puerto Rico'));assert.equal(canonicalRegion('Canada','Québec'),'Quebec');assert.equal(canonicalRegion('United States','','US-MA'),'Massachusetts');assert.match(countryOptions('<custom>'),/value="&lt;custom&gt;"/);assert.ok(regionsFor('Elsewhere').length===0);
});
test('region results validate and normalize known labels, while auto-fill preserves entered labels and mismatched countries',()=>{
 assert.deepEqual(regionLabels(payload),{country:'United States',region:'New York'});assert.deepEqual(regionLabels({results:[{country_code:'ca',state:'Québec',state_code:'CA-QC'}]}),{country:'Canada',region:'Quebec'});assert.deepEqual(mergePlaceLabels({country:'Canada',region:'Ontario'},regionLabels(payload)),{country:'Canada',region:'Ontario'});assert.deepEqual(mergePlaceLabels({country:'Canada',region:''},regionLabels(payload)),{country:'Canada',region:''});assert.deepEqual(mergePlaceLabels({country:'',region:'My area'},regionLabels(payload)),{country:'United States',region:'My area'});assert.throws(()=>regionLabels({results:[]}),/No country/);
});
test('region lookup coalesces matching requests, sends only coordinates, caches across reload and works offline from cache',async()=>{
 const storage=store();let calls=0;const service=setup({storage,fetcher:async(url,options)=>{calls++;const q=new URL(url);assert.equal(q.hostname,'api.geoapify.com');assert.equal(q.searchParams.get('type'),'state');assert.equal(q.searchParams.get('lat'),String(point.lat));assert.equal(q.searchParams.get('limit'),'1');assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');return new Response(JSON.stringify(payload));}});
 const [a,b]=await Promise.all([service.lookup(point),service.lookup(point)]);assert.deepEqual(a,b);assert.notEqual(a,b);assert.equal(calls,1);const restored=setup({storage,network:{onLine:false},fetcher:()=>{throw Error('No network expected');}});assert.deepEqual(await restored.lookup(point),a);assert.equal([...storage.rows.values()].join('').includes('test-key'),false);
});
test('queued work cancels before network/credit use if its editor/review is gone',async()=>{
 let calls=0;const storage=store(),service=setup({storage,fetcher:async()=>{calls++;return new Response(JSON.stringify(payload));}});await assert.rejects(service.lookup(point,{isCurrent:()=>false}),{name:'AbortError'});assert.equal(calls,0);assert.equal(storage.rows.size,0);await service.lookup(point);assert.equal(calls,1);
});
test('offline, invalid, failed, oversized and timed-out lookups remain recoverable with no invented labels',async()=>{
 await assert.rejects(setup({network:{onLine:false}}).lookup(point),/Offline/);await assert.rejects(setup({}).lookup({lat:null,lng:0}),/valid coordinates/);
 for(const fetcher of [async()=>new Response('',{status:429}),async()=>new Response('bad-json'),async()=>new Response('x'.repeat(65537)),()=>new Promise(()=>{})]){const service=setup({timeoutMs:10,fetcher});await assert.rejects(service.lookup(point));}
 const storage=store();storage.setItem('nth-region-usage-v1',JSON.stringify({day:'2026-10-16',count:100}));let calls=0;await assert.rejects(setup({storage,now:()=>Date.parse('2026-10-16T12:00:00Z'),fetcher:async()=>{calls++;return new Response(JSON.stringify(payload));}}).lookup(point),/paused/);assert.equal(calls,0);
});
