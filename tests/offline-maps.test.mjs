import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planOfflineArea,tileURL,readMapTile,createOfflineMaps,MAP_LIMITS,OFFLINE_SOURCE} from '../dist/offline-maps.js';
import {createMapBackground,createLocalTileLayer} from '../dist/map-background.js';
import {navigationRoute} from '../dist/navigation.js';
const center={lat:43.04,lng:-74.85};
const png=new Uint8Array(64);png.set([137,80,78,71,13,10,26,10]);
const image=()=>new Response(png,{headers:{'Content-Type':'image/png'}});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const tick=()=>new Promise(r=>setImmediate(r));
function memoryStore(){const areas=new Map(),tiles=new Map();return {areas,tiles,ready:async()=>{},list:async()=>[...areas.values()],put:async(id,key,blob)=>tiles.set(id+'|'+key,blob),commit:async area=>areas.set(area.id,area),remove:async id=>{areas.delete(id);for(const key of tiles.keys())if(key.startsWith(id+'|'))tiles.delete(key);},tile:async key=>{for(const [id,value]of tiles)if(id.endsWith('|'+key)&&areas.has(id.split('|')[0]))return value;return null;}};}
function fixture(options={}){const store=memoryStore(),calls=[],states=[];let count=0;const maps=createOfflineMaps({store,fetcher:async(url,opts)=>{calls.push({url,opts});return image();},wait:async()=>{},uuid:()=>String(++count),network:{onLine:true},storage:null,...options});maps.subscribe(s=>states.push(s));return {store,calls,states,maps};}
test('offline area planning covers the requested square at every zoom and respects its cap',()=>{
 const plan=planOfflineArea(center,5,15);assert.ok(plan.tiles.length>50&&plan.tiles.length<600);assert.equal(new Set(plan.tiles.map(t=>t.key)).size,plan.tiles.length);
 assert.equal(plan.tiles[0].key,'0/0/0');assert.equal(plan.tiles.at(-1).z,15);assert.ok(plan.bounds.west<center.lng&&plan.bounds.east>center.lng);
 assert.ok(planOfflineArea(center,2,13).tiles.length<plan.tiles.length);
 for(const input of [{lat:81,lng:0},{lat:NaN,lng:1},{lat:1,lng:181}])assert.throws(()=>planOfflineArea(input),/valid location/);
 assert.throws(()=>planOfflineArea(center,100,19),/valid location/);assert.throws(()=>planOfflineArea({lat:75,lng:0},10,15),/too many tiles/);
});
test('date-line packages wrap tile x coordinates and never duplicate a tile',()=>{
 const plan=planOfflineArea({lat:0,lng:179.999},5,15);for(const t of plan.tiles){assert.ok(t.x>=0&&t.x<2**t.z);assert.ok(t.y>=0&&t.y<2**t.z);}
 const high=plan.tiles.filter(t=>t.z===15);assert.ok(high.some(t=>t.x===0));assert.ok(high.some(t=>t.x===32767));
});
test('downloads target only USGS and use ArcGIS z/y/x order',()=>{
 assert.equal(tileURL({z:3,x:4,y:5}),`${OFFLINE_SOURCE}/3/5/4`);assert.doesNotMatch(OFFLINE_SOURCE,/openstreetmap/);
});
test('complete downloads commit exact bytes, progress and metadata only after all tiles',async()=>{
 const f=fixture();await f.maps.ready();const plan=planOfflineArea(center,2,13),area=await f.maps.download(plan,'Little Falls');
 assert.equal(area.count,plan.tiles.length);assert.equal(area.bytes,plan.tiles.length*png.length);assert.equal(f.maps.phase,'idle');assert.equal(f.maps.preferred,true);
 assert.equal(f.store.tiles.size,area.count);assert.equal(f.store.areas.size,1);assert.equal(f.states.at(-1).areas.length,1);
 assert.ok(f.states.some(s=>s.phase==='committing'));assert.ok(f.states.filter(s=>s.phase==='downloading').every(s=>!s.areas.length));
 for(const call of f.calls){assert.ok(call.url.startsWith(OFFLINE_SOURCE));assert.equal(call.opts.credentials,'omit');assert.equal(call.opts.referrerPolicy,'no-referrer');}
 const blob=await f.maps.tile('0/0/0');assert.deepEqual(new Uint8Array(await blob.arrayBuffer()),png);
});
test('cancellation during a network response cleans partial tiles and never announces completion',async()=>{
 const gate=deferred();let count=0;const f=fixture({fetcher:async()=>++count===2?gate.promise:image()});
 const pending=f.maps.download(planOfflineArea(center,2,13),'Cancelled');await tick();assert.equal(f.store.tiles.size,1);assert.equal(f.maps.cancel(),true);gate.resolve(image());
 await assert.rejects(pending,/CANCELLED/);assert.equal(f.store.tiles.size,0);assert.equal(f.maps.areas.length,0);assert.equal(f.maps.phase,'idle');
});
test('late cancellation after a tile write still removes that staged tile',async()=>{
 const f=fixture(),gate=deferred(),put=f.store.put;f.store.put=async(...args)=>{await put(...args);await gate.promise;};
 const pending=f.maps.download(planOfflineArea(center,2,13),'Cancelled');await tick();f.maps.cancel();gate.resolve();await assert.rejects(pending,/CANCELLED/);assert.equal(f.store.tiles.size,0);
});
test('commit and removal are protected from cancellation and overlapping operations',async()=>{
 const f=fixture(),gate=deferred(),commit=f.store.commit;f.store.commit=async a=>{await gate.promise;return commit(a);};
 const pending=f.maps.download(planOfflineArea(center,2,13),'Saved');await tick();assert.equal(f.maps.phase,'committing');assert.equal(f.maps.cancel(),false);
 await assert.rejects(f.maps.download(planOfflineArea(center,2,13),'Other'),/Finish the current/);gate.resolve();const area=await pending;await f.maps.remove(area.id);assert.equal(f.store.tiles.size,0);assert.equal(f.maps.preferred,false);
});
test('HTTP, non-image, and quota failures remove staged packages without affecting earlier areas',async()=>{
 for(const fail of [()=>new Response('busy',{status:503}),()=>new Response('<html>error</html>'),()=>{const error=Error();error.name='QuotaExceededError';throw error;}]){
  const f=fixture();const saved=await f.maps.download(planOfflineArea(center,2,13),'First'),before=f.store.tiles.size;
  let count=0;f.store.put=((put)=>async(...args)=>{if(++count===2){const response=fail();if(response)await readMapTile(response);}return put(...args);})(f.store.put);
  await assert.rejects(f.maps.download(planOfflineArea(center,2,13),'Fail'));
  assert.equal(f.maps.areas.length,1);assert.equal(f.maps.areas[0].id,saved.id);assert.equal(f.store.tiles.size,before);
 }
});
test('area and capacity limits fail before requesting another tile',async()=>{
 const f=fixture();for(let i=0;i<MAP_LIMITS.areas;i++)f.store.areas.set(String(i),{id:String(i),bytes:1});
 await assert.rejects(f.maps.download(planOfflineArea(center,2,13),'extra'),/Remove a saved area/);assert.equal(f.calls.length,0);
 const noSpace=fixture({storage:{estimate:async()=>({usage:990,quota:1000})}});await assert.rejects(noSpace.maps.download(planOfflineArea(center,2,13),'extra'),/enough device storage/);assert.equal(noSpace.calls.length,0);
 const offline=fixture({network:{onLine:false}});await assert.rejects(offline.maps.download(planOfflineArea(center,2,13),'extra'),/Connect to the internet/);
});
test('untrusted caller tiles are replaced by the bounded plan; area names are bounded',async()=>{
 const f=fixture();const plan=planOfflineArea(center,2,13);plan.tiles=[{url:'https://evil.example/'}];const area=await f.maps.download(plan,'a'.repeat(500));assert.equal(area.name.length,100);assert.ok(f.calls.every(c=>c.url.startsWith(OFFLINE_SOURCE)));
});
test('image response reader rejects oversized streams, invalid magic and failed responses',async()=>{
 await assert.rejects(readMapTile(new Response(png,{headers:{'content-length':String(MAP_LIMITS.tileBytes+1)}})),/too large/);
 await assert.rejects(readMapTile(new Response(new Uint8Array(MAP_LIMITS.tileBytes+1))),/too large/);
 await assert.rejects(readMapTile(new Response(new Uint8Array(64))),/invalid image/);
 await assert.rejects(readMapTile(new Response('unavailable',{status:429})),/429/);
 const c=new AbortController();c.abort();await assert.rejects(readMapTile(image(),c.signal),/CANCELLED/);
});
test('removing one overlapping area preserves tiles and metadata belonging to the other',async()=>{
 const f=fixture(),plan=planOfflineArea(center,2,13),a=await f.maps.download(plan,'A'),b=await f.maps.download(plan,'B');
 await f.maps.remove(a.id);assert.equal(f.store.tiles.size,b.count);assert.equal(f.maps.areas[0].id,b.id);assert.ok(await f.maps.tile('0/0/0'));
});
function backgroundFixture(){
 const handlers={},layers=[],statuses=[],network={onLine:true};let preferred=false,changed;
 const make=()=>{const layer={handlers:{},redraws:0,on(n,fn){this.handlers[n]=fn;return this;},addTo(map){map.layers.add(this);return this;},redraw(){this.redraws++;}};layers.push(layer);return layer;};
 const L={tileLayer:make,GridLayer:{extend:()=>class {constructor(){const layer=make();layers.pop();Object.assign(this,layer);layers.push(this);}}}};
 const map={layers:new Set(),hasLayer:l=>map.layers.has(l),removeLayer:l=>map.layers.delete(l)};
 const offlineMaps={get preferred(){return preferred;},subscribe(fn){changed=fn;return ()=>{changed=null;};}};
 const bg=createMapBackground({map,L,offlineMaps,events:{addEventListener:(n,f)=>handlers[n]=f,removeEventListener:n=>delete handlers[n]},network,onStatus:s=>statuses.push(s)});
 return {bg,map,network,layers,handlers,statuses,prefer(){preferred=true;changed({phase:'idle'});},change:()=>changed?.({phase:'idle'})};
}
test('background automatically switches offline and supports connected download preview without online tiles',()=>{
 const f=backgroundFixture();f.bg.setVisible(true);assert.ok(f.map.layers.has(f.layers[0]));f.network.onLine=false;f.handlers.offline();assert.equal(f.map.layers.has(f.layers[0]),false);assert.ok(f.map.layers.has(f.layers[1]));assert.match(f.statuses.at(-1).message,/Downloaded USGS/);
 f.network.onLine=true;f.handlers.online();assert.ok(f.map.layers.has(f.layers[0]));f.prefer();assert.equal(f.map.layers.has(f.layers[0]),false);assert.ok(f.map.layers.has(f.layers[1]));
 f.bg.setVisible(false);assert.equal(f.map.layers.size,0);f.change();assert.equal(f.map.layers.size,0);f.bg.destroy();assert.deepEqual(f.handlers,{});
});
test('local tile loader handles wrapped coordinates, town overzoom, late results and URL cleanup',async()=>{
 const calls=[],revoked=[],elements=[];let created,definition;
 const makeElement=tag=>{const e={tag,style:{},classes:new Set(),children:[],classList:{add(c){e.classes.add(c);}},append(c){e.children.push(c);}};elements.push(e);return e;};
 const L={GridLayer:{extend:d=>{definition=d;return class {on(name,fn){this[name]=fn;}};}}};
 const blob=new Blob([png]),layer=createLocalTileLayer({L,document:{createElement:makeElement},offlineMaps:{tile:async key=>{calls.push(key);return key==='13/8191/1'?blob:null;}},urls:{createObjectURL:()=>{created='blob:local';return created;},revokeObjectURL:u=>revoked.push(u)}});
 let completed=0;const tile=definition.createTile({z:15,x:-1,y:7},()=>completed++);await tick();assert.equal(calls.at(-1),'13/8191/1');const img=tile.children[0];assert.match(img.style.cssText,/width:1024px/);img.onload();assert.equal(completed,1);layer.tileunload({tile});assert.deepEqual(revoked,[created]);
 const missing=definition.createTile({z:10,x:1,y:1},()=>completed++);await tick();assert.ok(missing.classes.has('offline-tile-missing'));
 const gate=deferred();let urlCalls=0;const late=createLocalTileLayer({L,document:{createElement:makeElement},offlineMaps:{tile:()=>gate.promise},urls:{createObjectURL(){urlCalls++;}}});
 const old=definition.createTile({z:1,x:0,y:0},()=>completed++);late.tileunload({tile:old});gate.resolve(blob);await tick();assert.equal(urlCalls,0);
});
test('offline map dialog participates in Back while downloads and commit are guarded',()=>{
 assert.equal(navigationRoute({view:'map',dialogs:[{id:'offline-maps'}]}).dialogs[0].id,'offline-maps');
 const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');assert.match(app,/item.id==='offline-maps'.*offlineMaps.phase!=='idle'/);assert.match(app,/offlineMaps.cancel\(\);toast/);
 const sw=fs.readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8');assert.match(sw,/offline-maps.js/);assert.match(sw,/map-background.js/);
});

test('real IndexedDB store persists complete blobs across recreation and hides staged tiles',async()=>{
 const {IDBFactory}=await import('fake-indexeddb');const {createOfflineStore}=await import('../dist/offline-maps.js');
 const indexedDB=new IDBFactory(),a=createOfflineStore({indexedDB});await a.ready();const blob=new Blob([png]);
 await a.put('saved','0/0/0',blob);assert.equal(await a.tile('0/0/0'),null);await a.commit({id:'saved',count:1,bytes:blob.size});
 await a.put('interrupted','1/1/1',blob);
 const b=createOfflineStore({indexedDB});await b.ready();assert.equal((await b.list()).length,1);assert.equal(await b.tile('1/1/1'),null);assert.equal((await b.tile('0/0/0')).size,blob.size);
 // Staged data was actually removed, not merely hidden in the new instance.
 const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('nth-footprints-offline-maps',1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
 const count=await new Promise(resolve=>{const req=db.transaction('tiles').objectStore('tiles').count();req.onsuccess=()=>resolve(req.result);});assert.equal(count,1);db.close();
 await b.remove('saved');assert.equal((await b.list()).length,0);assert.equal(await b.tile('0/0/0'),null);
});
test('IndexedDB commit rejects an incomplete area, and overlapping areas delete independently',async()=>{
 const {IDBFactory}=await import('fake-indexeddb');const {createOfflineStore}=await import('../dist/offline-maps.js');
 const store=createOfflineStore({indexedDB:new IDBFactory()}),blob=new Blob([png]);await store.ready();await store.put('a','0/0/0',blob);await assert.rejects(store.commit({id:'a',count:2}));assert.equal((await store.list()).length,0);
 await store.commit({id:'a',count:1});await store.put('b','0/0/0',blob);await store.commit({id:'b',count:1});await store.remove('a');assert.ok(await store.tile('0/0/0'));assert.equal((await store.list())[0].id,'b');
});
test('storage errors and interrupted commit leave no ready package',async()=>{
 for(const method of ['put','commit']){const f=fixture();f.store[method]=async()=>{throw Error('Disk failure');};await assert.rejects(f.maps.download(planOfflineArea(center,2,13),'Fail'),/Disk failure/);assert.equal(f.store.areas.size,0);assert.equal(f.store.tiles.size,0);}
});
