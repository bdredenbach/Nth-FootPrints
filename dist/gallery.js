import {MAX_PHOTOS,validateRecord} from './model.js';
export const photosOf=record=>record?.photos?.slice()??(record?.photo?[record.photo]:[]);
export const coverOf=record=>record?.photos?.length?record.coverIndex??0:0;
export function selectPhoto(record,index){
 const photos=photosOf(record);if(!Number.isInteger(index)||index<0||index>=photos.length)throw Error('This photo is no longer available.');
 return {...record,photos,coverIndex:index,photo:photos[index]};
}
export function addPhotos(record,images){
 const photos=photosOf(record),coverIndex=coverOf(record);
 for(const image of images)if(!photos.includes(image))photos.push(image);
 if(photos.length>MAX_PHOTOS)throw Error(`Use up to ${MAX_PHOTOS} photos per footprint.`);
 return validateRecord({...record,photos,coverIndex,photo:photos[coverIndex]??null,sampleArt:null});
}
export function replacePhoto(record,image){
 const photos=photosOf(record);let index=coverOf(record),found=photos.indexOf(image);
 if(found>=0)index=found;else if(photos.length)photos[index]=image;else{photos.push(image);index=0;}
 return {...record,photos,coverIndex:index,photo:image};
}
export function removePhoto(record){
 const photos=photosOf(record);photos.splice(coverOf(record),1);const coverIndex=Math.max(0,Math.min(coverOf(record),photos.length-1));
 return {...record,photos,coverIndex,photo:photos[coverIndex]??null};
}
export async function readGalleryFiles(files,{read,signal,onProgress=()=>{}}){
 const images=[];if(files.length>MAX_PHOTOS)throw Error(`Choose up to ${MAX_PHOTOS} photos at a time.`);
 for(let i=0;i<files.length;i++){
  if(signal?.aborted)throw Error('CANCELLED');const file=files[i];
  if(!/^image\/(jpeg|png|webp|gif)$/i.test(file.type))throw Error('Use JPG, PNG, WebP or GIF photographs.');
  if(file.size>20*1024*1024)throw Error('Choose photos smaller than 20 MB each.');
  onProgress(i,files.length);const image=await read(file);
  if(signal?.aborted)throw Error('CANCELLED');images.push(image);onProgress(i+1,files.length);
 }
 return images;
}
// Coalesce rapid swipes. A failed save returns to the last saved cover.
export function createPhotoViewer({record,save,onChange=()=>{},onStatus=()=>{},onError=()=>{}}){
 const photos=photosOf(record);let index=coverOf(record),saved=index,pending=null,running=null,alive=true;
 function show(){if(alive)onChange({index,total:photos.length,photo:photos[index]??null});}
 async function drain(){while(pending!==null){
  const next=pending;pending=null;
  try{await save(photos[next]);saved=next;if(alive)onStatus(pending===null?'Main photo saved.':'Saving main photo…');}
  catch(e){if(pending===null){index=saved;show();onError(e.message);}}
 }if(alive)onStatus('');}
 function select(next){
  if(!alive||!photos.length||!Number.isInteger(next)||next<0||next>=photos.length)return;
  if(next===index&&pending===null&&!running)return Promise.resolve();
  index=next;show();pending=next;onStatus('Saving main photo…');
  if(!running)running=drain().finally(()=>{running=null;});return running;
 }
 show();return {select,move:step=>select((index+step+photos.length)%photos.length),settled:()=>running??Promise.resolve(),destroy(){alive=false;},getIndex:()=>index};
}
export function horizontalStep(dx,dy){return Math.abs(dx)>=40&&Math.abs(dx)>Math.abs(dy)*1.25?(dx<0?1:-1):0;}
export function bindPhotoSwipe(el,{move}){
 let pointer=null;
 const down=e=>{if(e.isPrimary===false||(e.button!==undefined&&e.button!==0)||e.target.closest?.('button'))return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};};
 const drag=e=>{if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.25){if(!el.hasPointerCapture?.(e.pointerId))el.setPointerCapture?.(e.pointerId);if(e.cancelable)e.preventDefault();}};
 const up=e=>{if(!pointer||pointer.id!==e.pointerId)return;const p=pointer;pointer=null;if(el.hasPointerCapture?.(p.id))el.releasePointerCapture(p.id);const step=horizontalStep(e.clientX-p.x,e.clientY-p.y);if(step)move(step);};
 const cancel=e=>{if(pointer?.id===e.pointerId)pointer=null;};
 const lost=e=>{if(e.target===el)cancel(e);};
 const events={pointerdown:down,pointermove:drag,pointerup:up,pointercancel:cancel,lostpointercapture:lost};
 for(const [event,handler] of Object.entries(events))el.addEventListener(event,handler);
 return ()=>{for(const [event,handler] of Object.entries(events))el.removeEventListener(event,handler);pointer=null;};
}
