import {createAtlas,hasLocation} from './atlas.js';

// A visible, on-screen detail preview shares the atlas tile/cache policy.
// Off-screen, covered, paused and destroyed previews never keep tiles attached.
export function createVisitMap({container,record,document=globalThis.document,Observer=globalThis.IntersectionObserver,makeAtlas=createAtlas,...options}){
 let atlas=null,alive=true,enabled=true,inView=!Observer,dirty=true;
 function sync(){
  const visible=alive&&enabled&&inView&&!document.hidden&&hasLocation(record);
  if(!visible){atlas?.setVisible(false);return;}
  if(!atlas)atlas=makeAtlas({...options,container,document,preview:true});
  if(dirty){atlas.update([record],{selectedId:record.id});dirty=false;}
  else atlas.setVisible(true);
 }
 const observer=Observer?new Observer(entries=>{if(!alive)return;inView=entries.some(entry=>entry.isIntersecting);sync();},{threshold:0}):null;
 observer?.observe(container);document.addEventListener?.('visibilitychange',sync);sync();
 return {
  update(next){record=next;dirty=true;sync();},
  setVisible(value){enabled=value;sync();},
  destroy(){if(!alive)return;alive=false;observer?.disconnect();document.removeEventListener?.('visibilitychange',sync);atlas?.destroy();atlas=null;}
 };
}
