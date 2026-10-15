// A vertical gesture must be deliberate; horizontal movement never changes cards.
export function swipeStep(dx,dy,distance=48){
 return Math.abs(dy)>=distance&&Math.abs(dy)>Math.abs(dx)*1.25?(dy<0?1:-1):0;
}
export function wrappedIndex(index,step,count){return count?((index+step)%count+count)%count:0;}
export function dragTransform(dy=0){const d=Math.max(-155,Math.min(155,dy));return `translateY(${d*.65}px) rotateX(${-d*.12}deg) rotateZ(${-3+d*.015}deg)`;}
export function bindVerticalDeck(el,{canMove,move,preview,reset}){
 let pointer=null,ignoreClickUntil=0,wheelTotal=0,wheelLast=0,wheelConsumed=false;
 function release(e,cancel=false){
  if(!pointer||e.pointerId!==pointer.id)return;
  const p=pointer;pointer=null;
  if(el.hasPointerCapture?.(p.id))el.releasePointerCapture(p.id);
  const dx=e.clientX-p.x,dy=e.clientY-p.y,step=cancel?0:swipeStep(dx,dy);
  if(p.moved||step)ignoreClickUntil=performance.now()+400;
  if(step&&canMove())move(step,{drag:dy});else reset();
 }
 el.addEventListener('pointerdown',e=>{
  if(e.isPrimary===false||(e.button!==undefined&&e.button!==0)||document.querySelector('dialog[open]'))return;
  pointer={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
 });
 el.addEventListener('pointermove',e=>{
  if(!pointer||e.pointerId!==pointer.id)return;
  const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
  if(Math.hypot(dx,dy)>9)pointer.moved=true;
  if(Math.abs(dy)>9&&Math.abs(dy)>Math.abs(dx)*1.15&&canMove()){
   if(!el.hasPointerCapture?.(e.pointerId))el.setPointerCapture?.(e.pointerId);
   if(e.cancelable)e.preventDefault();preview(dy);
  }
 });
 el.addEventListener('pointerup',e=>release(e));
 el.addEventListener('pointercancel',e=>release(e,true));
 // Touch capture initially belongs to the card (or caption). When it moves to
 // the deck, the child's lostpointercapture bubbles here before the deck's
 // gotpointercapture. Only a loss targeted at the deck cancels our gesture.
 el.addEventListener('lostpointercapture',e=>{if(e.target===el&&pointer?.id===e.pointerId){pointer=null;reset();}});
 el.addEventListener('click',e=>{if(performance.now()<ignoreClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 el.addEventListener('wheel',e=>{
  if(Math.abs(e.deltaY)<=Math.abs(e.deltaX)||!canMove())return;
  e.preventDefault();const now=performance.now();if(now-wheelLast>180){wheelTotal=0;wheelConsumed=false;}wheelLast=now;
  if(wheelConsumed)return;
  wheelTotal+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?el.clientHeight:1);
  if(Math.abs(wheelTotal)>42){wheelConsumed=true;move(wheelTotal>0?1:-1);}
 },{passive:false});
}
