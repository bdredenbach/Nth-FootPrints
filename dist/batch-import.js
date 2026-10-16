import {readPhotoMetadata} from './geotags.js';
import {validateRecord} from './model.js';
import {visitsOf,writeVisit} from './visits.js';
import {normalizeTags} from './journal-tools.js';
import {proximityKm} from './nearby-memories.js';
export const MAX_BATCH_FILES=60,MAX_BATCH_BYTES=80*1024*1024;
const cancelled=signal=>{if(signal?.aborted)throw Error('CANCELLED');};
export async function preparePhotoBatch(files,{records=[],read,today,signal,grouping='place',onProgress=()=>{}}={}){
 if(!files.length||files.length>MAX_BATCH_FILES)throw Error(`Choose 1–${MAX_BATCH_FILES} photos.`);if(files.reduce((n,f)=>n+f.size,0)>MAX_BATCH_BYTES)throw Error('Choose at most 80 MB of photos in one batch.');
 const seen=new Set();for(const r of records)for(const v of visitsOf(r))for(const src of v.photos??(v.photo?[v.photo]:[]))seen.add(src);
 const groups=[];let duplicates=0;
 for(let i=0;i<files.length;i++){cancelled(signal);const file=files[i];if(!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)||file.size>20*1024*1024)throw Error(`“${file.name}”: use JPG, PNG, WebP or GIF up to 20 MB each.`);
  onProgress(i,files.length);const bytes=new Uint8Array(await file.arrayBuffer());cancelled(signal);const meta=readPhotoMetadata(bytes),src=await read(file);cancelled(signal);if(seen.has(src)){duplicates++;onProgress(i+1,files.length);continue;}seen.add(src);
  const visited=meta.takenOn??today(),point=meta.location;let group=grouping==='individual'?null:groups.find(g=>g.visited===visited&&g.photos.length<30&&!!meta.takenOn&&g.metadataDate===meta.takenOn&&point&&g.lat!==null&&proximityKm(point,g)*1000<=100);
  if(!group){group={id:'batch-'+groups.length,title:String(file.name).replace(/\.[^.]+$/,'').slice(0,160)||'Imported memory',visited,metadataDate:meta.takenOn,dateSource:meta.takenOn?'Photo date':'Today proposed — review date',lat:point?.lat??null,lng:point?.lng??null,category:'Travel',notes:'',targetId:'',country:'',region:'',tags:[],tripId:'',photos:[],files:[],selected:true};groups.push(group);}group.photos.push(src);group.files.push(file.name);onProgress(i+1,files.length);
 }
 return {groups,duplicates};
}
export function applyPhotoBatch(records,groups,{journeys=[],now=new Date().toISOString(),uuid=()=>crypto.randomUUID()}={}){
 const chosen=groups.filter(g=>g.selected);if(!chosen.length)throw Error('Select at least one reviewed group.');const active=new Set(journeys.filter(j=>!j.deleted).map(j=>j.id)),next=records.slice();let added=0,returns=0;
 for(const g of chosen){if(g.tripId&&!active.has(g.tripId))throw Error('A selected trip was removed. Review the batch again.');const tags=normalizeTags(g.tags??[]);let index=g.targetId?next.findIndex(r=>r.id===g.targetId):-1;if(g.targetId&&index<0)throw Error('A selected place was removed. Choose another target.');
  const old=next[index],fields={id:old?.id??uuid(),title:old?.title??g.title,category:old?.category??g.category,favorite:old?.favorite??false,rating:0,visited:g.visited,notes:g.notes??'',address:old?.address??'',phone:old?.phone??'',url:old?.url??'',lat:g.lat,lng:g.lng,photos:g.photos,coverIndex:0,audio:null,sampleArt:null,tripIds:g.tripId?[g.tripId]:[],tags:normalizeTags([...(old?.tags??[]),...tags]),country:g.country||old?.country||'',region:g.region||old?.region||'',updatedAt:now};
  if(old){next[index]=writeVisit(old,fields,'new',{newId:uuid});returns++;}else{next.push(validateRecord(fields));added++;}
 }
 return {records:next,added,returns};
}
