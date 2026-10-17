import test from 'node:test';
import assert from 'node:assert/strict';
import {fitPhoto,constrainPhoto} from '../dist/photo-lightbox.js';
import {navigationRoute,createNavigation} from '../dist/navigation.js';
test('full photo fitting retains aspect ratio for portrait, landscape and rotated viewport sizes',()=>{
 assert.deepEqual(fitPhoto(800,1600,400,600),{width:300,height:600});assert.deepEqual(fitPhoto(1600,800,400,600),{width:400,height:200});assert.deepEqual(fitPhoto(800,1600,600,400),{width:200,height:400});assert.deepEqual(fitPhoto(0,800,400,600),{width:0,height:0});
});
test('zoom and panning cannot expose empty edges or lose a fitted photo after resizing',()=>{
 const fit={width:300,height:600},box={width:400,height:600};assert.deepEqual(constrainPhoto({scale:1,x:100,y:-100},fit,box),{scale:1,x:0,y:-0});assert.deepEqual(constrainPhoto({scale:2,x:200,y:-900},fit,box),{scale:2,x:100,y:-300});assert.equal(constrainPhoto({scale:99},fit,box).scale,5);assert.equal(constrainPhoto({scale:-1},fit,box).scale,1);
});
test('enlarged photo history requires a footprint/editor parent and Back preserves that parent',async()=>{
 for(const parent of [{id:'details',recordId:'one'},{id:'editor'}]){
  assert.equal(navigationRoute({dialogs:[parent,{id:'photo-lightbox'}]}).dialogs.length,2);
  const entries=[],events={};let position=0,back;
  const history={replaceState:s=>entries[position]=s,pushState:s=>entries[++position]=s,back:()=>{back=events.popstate({state:entries[--position]});}};
  const applied=[],nav=createNavigation({history,events:{addEventListener:(name,fn)=>events[name]=fn},apply:next=>applied.push(next)});nav.start();nav.opened(parent);nav.opened({id:'photo-lightbox'});nav.back();await back;await nav.idle();assert.deepEqual(nav.route().dialogs,[{...parent,...(parent.id==='editor'?{recordId:null}:{})}]);assert.equal(applied.length,1);
 }
 assert.equal(navigationRoute({dialogs:[{id:'photo-lightbox'}]}).dialogs.length,0);assert.equal(navigationRoute({dialogs:[{id:'settings'},{id:'photo-lightbox'}]}).dialogs.length,1);
});
