import test from 'node:test';
import assert from 'node:assert/strict';
import {swipeStep,wrappedIndex,dragTransform,bindVerticalDeck} from '../dist/deck.js';
test('only deliberate vertical gestures change a card',()=>{assert.equal(swipeStep(4,-90),1);assert.equal(swipeStep(0,75),-1);for(const [dx,dy]of [[130,3],[-130,5],[0,20],[60,60],[0,0]])assert.equal(swipeStep(dx,dy),0);});
test('both swipe directions wrap through the complete collection',()=>{assert.equal(wrappedIndex(0,-1,3),2);assert.equal(wrappedIndex(2,1,3),0);assert.equal(wrappedIndex(2,1,1),0);assert.equal(wrappedIndex(0,1,0),0);});
test('drag follows the vertical direction and clamps large movements',()=>{assert.match(dragTransform(-100),/translateY\(-65px\)/);assert.match(dragTransform(100),/translateY\(65px\)/);assert.equal(dragTransform(10000),dragTransform(155));});
test('a swipe advances once, suppresses its click, and cancelled gestures never navigate',()=>{
 const handlers=new Map(),moves=[],previews=[];const old=globalThis.document;globalThis.document={querySelector:()=>null};let captured=null;
 const el={addEventListener:(name,fn)=>handlers.set(name,fn),setPointerCapture:id=>captured=id,hasPointerCapture:id=>captured===id,releasePointerCapture:()=>captured=null,clientHeight:400};
 let resets=0;bindVerticalDeck(el,{canMove:()=>true,move:(s)=>moves.push(s),preview:dy=>previews.push(dy),reset:()=>resets++});
 const ev=(x,y)=>({pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y,cancelable:true,preventDefault(){}});
 try{handlers.get('pointerdown')(ev(100,200));handlers.get('pointermove')(ev(103,100));handlers.get('pointerup')(ev(103,100));assert.deepEqual(moves,[1]);assert.deepEqual(previews,[-100]);let suppressed=false;handlers.get('click')({preventDefault(){},stopImmediatePropagation(){suppressed=true;}});assert.equal(suppressed,true);
 handlers.get('pointerdown')(ev(100,200));handlers.get('pointermove')(ev(100,300));handlers.get('pointercancel')(ev(100,300));assert.deepEqual(moves,[1]);assert.equal(resets,1);
 handlers.get('pointerdown')(ev(100,200));handlers.get('pointerup')(ev(240,203));assert.deepEqual(moves,[1]);
 }finally{globalThis.document=old;}
});

// Phones implicitly capture a touch to the child initially hit. Moving capture to
// the gallery emits lostpointercapture on that child; the event bubbles to the
// gallery. It must not be interpreted as the gallery losing its own capture.
function touchHarness(startOn='card'){
 const handlers=new Map(),moves=[],previews=[];let resets=0,suppressed=false;
 const child={name:startOn};let captured=startOn==='surrounding'?null:child;
 const el={name:'gallery',clientHeight:400,addEventListener:(name,fn)=>handlers.set(name,fn),
  hasPointerCapture:()=>captured===el,
  setPointerCapture(){const previous=captured;captured=el;if(previous&&previous!==el)handlers.get('lostpointercapture')({pointerId:1,target:previous});},
  releasePointerCapture(){captured=null;handlers.get('lostpointercapture')({pointerId:1,target:el});}
 };
 if(startOn==='surrounding')captured=el;
 bindVerticalDeck(el,{canMove:()=>true,move:s=>moves.push(s),preview:dy=>previews.push(dy),reset:()=>resets++});
 const pointer=(type,y)=>handlers.get(type)({pointerId:1,isPrimary:true,button:0,target:captured??child,clientX:100,clientY:y,cancelable:true,preventDefault(){}});
 return {el,handlers,moves,previews,pointer,get resets(){return resets;},click(){handlers.get('click')({preventDefault(){suppressed=true;},stopImmediatePropagation(){suppressed=true;}});return suppressed;}};
}
for(const start of ['photo','caption','surrounding'])for(const step of [1,-1])test(`touch swipe ${step===1?'up':'down'} beginning on the ${start} survives capture changes`,()=>{
 const old=globalThis.document;globalThis.document={querySelector:()=>null};
 try{const h=touchHarness(start);h.pointer('pointerdown',250);h.pointer('pointermove',250-step*40);h.pointer('pointermove',250-step*90);h.pointer('pointerup',250-step*100);assert.deepEqual(h.moves,[step]);assert.deepEqual(h.previews,[-step*40,-step*90]);assert.equal(h.click(),true,'swiping must not open memory details');}finally{globalThis.document=old;}
});
test('a genuine gallery capture loss still cancels a swipe',()=>{
 const old=globalThis.document;globalThis.document={querySelector:()=>null};
 try{const h=touchHarness('surrounding');h.pointer('pointerdown',250);h.pointer('pointermove',180);h.handlers.get('lostpointercapture')({pointerId:1,target:h.el});h.pointer('pointerup',150);assert.deepEqual(h.moves,[]);assert.equal(h.resets,1);}finally{globalThis.document=old;}
});
test('a tap on a photo remains available to open memory details',()=>{
 const old=globalThis.document;globalThis.document={querySelector:()=>null};
 try{const h=touchHarness('photo');h.pointer('pointerdown',250);h.pointer('pointerup',250);assert.deepEqual(h.moves,[]);assert.equal(h.click(),false);}finally{globalThis.document=old;}
});
