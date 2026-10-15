import test from 'node:test';
import assert from 'node:assert/strict';
import {pinPhoto,createPinPreviews} from '../dist/pin-previews.js';
import {createPhotoPreview} from '../dist/photo-preview.js';
const photo=n=>`data:image/jpeg;base64,${Buffer.from('original-'+n).toString('base64')}`;
const preview=n=>`data:image/jpeg;base64,${Buffer.from('preview-'+n).toString('base64')}`;
const record=(id,extra={})=>({id,photo:photo(id),...extra});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('pin sources follow the gallery cover and reject remote or unsafe image sources',()=>{
 assert.equal(pinPhoto(record('legacy')),photo('legacy'));
 assert.equal(pinPhoto(record('gallery',{photos:[photo(1),photo(2)],coverIndex:1})),photo(2));
 for(const value of [null,'https://example.com/photo.jpg','javascript:alert(1)','data:image/svg+xml;base64,PHN2Zz4='])assert.equal(pinPhoto(record('bad',{photo:value})),null);
 assert.equal(pinPhoto(record('empty',{photos:[],photo:photo('stale')})),null);
});
test('only visible photos are decoded, one at a time; cached pins avoid repeat work on panning',async()=>{
 const calls=[],ready=[],gate=deferred();let active=0,maxActive=0;
 const pins=createPinPreviews({thumbnail:async source=>{calls.push(source);maxActive=Math.max(maxActive,++active);if(calls.length===1)await gate.promise;active--;return preview(source);},onPreview:(id,data)=>ready.push([id,data])});
 const records=[record('a'),record('b'),record('c')];pins.sync(records,['a','b']);await Promise.resolve();assert.deepEqual(calls,[photo('a')]);
 gate.resolve();await pins.idle();assert.deepEqual(calls,[photo('a'),photo('b')]);assert.equal(maxActive,1);
 pins.sync(records,['a']);await pins.idle();assert.equal(calls.length,2);assert.equal(ready.at(-1)[0],'a');
 pins.sync(records,['c']);await pins.idle();assert.equal(calls.length,3);assert.equal(ready.at(-1)[0],'c');
});
test('a changed cover discards a late old preview and retains original photo bytes',async()=>{
 const old=deferred(),ready=[],records=[record('a')],copy=structuredClone(records);
 const pins=createPinPreviews({thumbnail:source=>source===photo('a')?old.promise:Promise.resolve(preview('new')),onPreview:(id,data)=>ready.push(data)});
 pins.sync(records);await Promise.resolve();pins.sync([record('a',{photo:photo('new')})]);old.resolve(preview('old'));await pins.idle();
 assert.deepEqual(ready,[preview('new')]);assert.deepEqual(records,copy);
});
test('filtering, hiding or destroying the map rejects late previews and aborts active decoding',async()=>{
 for(const action of ['filter','hide','destroy']){
  const gate=deferred(),ready=[];let signal;
  const pins=createPinPreviews({thumbnail:(source,s)=>{signal=s;return gate.promise;},onPreview:()=>ready.push('paint')});
  pins.sync([record('a')]);await Promise.resolve();
  if(action==='filter')pins.sync([]);else if(action==='hide')pins.pause();else pins.destroy();
  assert.equal(signal.aborted,true);gate.resolve(preview('late'));await pins.idle();assert.deepEqual(ready,[]);
 }
});
test('failed photos keep their fallback without retry loops; a different cover can retry',async()=>{
 let calls=0;const ready=[],pins=createPinPreviews({thumbnail:async()=>{calls++;throw Error('Decode failed');},onPreview:()=>ready.push(true)});
 pins.sync([record('a')]);await pins.idle();pins.sync([record('a')]);await pins.idle();assert.equal(calls,1);assert.deepEqual(ready,[]);
 pins.sync([record('a',{photo:photo('replacement')})]);await pins.idle();assert.equal(calls,2);
});
test('the preview cache is bounded and removed/filtered footprints release retained entries',async()=>{
 let calls=0;const pins=createPinPreviews({limit:2,thumbnail:async source=>{calls++;return preview(source);}}),records=['a','b','c'].map(id=>record(id));
 pins.sync(records,['a','b']);await pins.idle();assert.equal(pins.stats().cached,2);
 pins.sync(records,['c']);await pins.idle();assert.equal(pins.stats().cached,2);
 pins.sync(records,['a']);await pins.idle();assert.equal(calls,4);assert.equal(pins.stats().cached,2);
 pins.sync([]);assert.equal(pins.stats().cached,0);pins.destroy();
});
test('invalid or unexpectedly oversized generated previews never become marker image sources',async()=>{
 for(const data of ['https://example.com/image.jpg','data:image/svg+xml;base64,AQID','data:image/jpeg;base64,'+'A'.repeat(100001)]){
  const ready=[],pins=createPinPreviews({thumbnail:async()=>data,onPreview:v=>ready.push(v)});pins.sync([record('a')]);await pins.idle();assert.deepEqual(ready,[]);
 }
});
test('map preview rendering crops to 96 by 96 without changing the original and can abort loading',async()=>{
 let canvas,draw;
 class ImageClass{naturalWidth=1200;naturalHeight=600;set src(value){this.source=value;queueMicrotask(()=>this.onload?.());}}
 const source=photo('original'),result=await createPhotoPreview(source,{width:96,height:96,ImageClass,document:{createElement(){return canvas={getContext(){return {fillRect(){},drawImage(...args){draw=args;}};},toDataURL(){return preview('small');}};}}});
 assert.equal(result,preview('small'));assert.equal(canvas.width,96);assert.equal(canvas.height,96);assert.deepEqual(draw.slice(1),[-48,0,192,96]);assert.equal(draw[0].source,source);
 let image;
 class PendingImage{constructor(){image=this;}set src(value){this.source=value;}}
 const abort=new AbortController(),pending=createPhotoPreview(source,{ImageClass:PendingImage,signal:abort.signal});abort.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(image.source,'');assert.equal(image.onload,null);
});
