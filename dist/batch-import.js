import {mediaInfo} from './media-store.js';
import {readPhotoMetadata} from './geotags.js';
import {validateRecord,MAX_PHOTOS} from './model.js';
import {visitsOf,writeVisit} from './visits.js';
import {normalizeTags} from './journal-tools.js';
import {proximityKm} from './nearby-memories.js';
export const MAX_BATCH_FILES=60;
const samePoint=(a,b)=>a.lat.toFixed(5)===b.lat.toFixed(5)&&a.lng.toFixed(5)===b.lng.toFixed(5);
export const batchCoordinates=point=>Number.isFinite(point?.lat)&&Number.isFinite(point?.lng)?`${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`:'No photo GPS';
const cancelled=signal=>{if(signal?.aborted)throw Error('CANCELLED');};
function draftGroup(source,index,today){return {id:'batch-'+index,title:String(source.name).replace(/\.[^.]+$/,'').slice(0,160)||'Imported memory',visited:source.takenOn??today(),metadataDate:source.takenOn,dateSource:source.takenOn?'Photo date':'Today proposed — review date',lat:source.location?.lat??null,lng:source.location?.lng??null,category:'Other',notes:'',targetId:'',country:'',region:'',tags:[],tripId:'',photos:[],files:[],photoMetadata:[],selected:true};}
export function proposePhotoGroups(sources,{grouping='place',today}={}){
 if(!['place','same','individual','together'].includes(grouping))throw Error('Choose a photo grouping option.');
 if(grouping==='together'&&sources.length>MAX_PHOTOS)throw Error(`One footprint holds up to ${MAX_PHOTOS} photos. Choose fewer photos or another grouping option. Nothing has been saved.`);
 const groups=[];
 for(const source of sources){const point=source.location;let group=grouping==='individual'?null:grouping==='together'?groups[0]:groups.find(g=>g.visited===(source.takenOn??'')&&g.photos.length<MAX_PHOTOS&&!!source.takenOn&&g.metadataDate===source.takenOn&&point&&g.lat!==null&&(grouping==='same'?samePoint(point,g):proximityKm(point,g)*1000<=100));
  if(!group){group=draftGroup(source,groups.length,today);groups.push(group);}
  group.photos.push(source.photo);group.files.push(source.name);group.photoMetadata.push({takenOn:source.takenOn,location:point?{...point}:null});
 }
 if(grouping==='together'&&groups.length){const g=groups[0],dated=sources.find(p=>p.takenOn),located=sources.find(p=>p.location);g.singleFootprint=true;g.visited=dated?.takenOn??g.visited;g.metadataDate=dated?.takenOn??null;g.dateSource=dated?'First detected photo date — review shared date':'Today proposed — review shared date';g.lat=located?.location.lat??null;g.lng=located?.location.lng??null;g.locationSource=located?`Shared coordinates proposed from ${located.name}`:'No photo GPS — shared location is optional';}
 return groups;
}
export async function preparePhotoBatch(files,{records=[],read,today,signal,grouping='place',onProgress=()=>{}}={}){
 if(!files.length||files.length>MAX_BATCH_FILES)throw Error(`Choose 1–${MAX_BATCH_FILES} photos.`);
 // Validate the whole selection before staging any originals. Aggregate size follows device capacity.
 for(const file of files)if(!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)||file.size>20*1024*1024)throw Error(`“${file.name}”: use JPG, PNG, WebP or GIF up to 20 MB each.`);
 const totalBytes=files.reduce((n,f)=>n+f.size,0);let doneBytes=0;
 const progress=(done,file)=>onProgress(done,files.length,{bytes:doneBytes,totalBytes,file:file.name});
 const seen=new Set();for(const r of records)for(const v of visitsOf(r))for(const src of v.photos??(v.photo?[v.photo]:[]))seen.add(mediaInfo(src)?.key??src);
 const sources=[];let duplicates=0;
 for(let i=0;i<files.length;i++){
  cancelled(signal);const file=files[i];progress(i,file);
  // Keep metadata buffers local to one photo, then stage its original before the next file.
  const meta=await (async()=>readPhotoMetadata(new Uint8Array(await file.arrayBuffer())))();cancelled(signal);
  const src=await read(file);cancelled(signal);doneBytes+=file.size;
  if(seen.has(mediaInfo(src)?.key??src)){duplicates++;progress(i+1,file);continue;}seen.add(mediaInfo(src)?.key??src);
  sources.push({photo:src,name:file.name,takenOn:meta.takenOn,location:meta.location?{...meta.location}:null});progress(i+1,file);
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 cancelled(signal);
 return {groups:proposePhotoGroups(sources,{grouping,today}),duplicates,sources};
}
// This is an explicit review action. Automatic grouping never assigns missing GPS.
export function groupBatchAtLocation(groups,referenceId){
 const chosen=groups.filter(g=>g.selected),reference=chosen.find(g=>g.id===referenceId);
 if(!reference||!Number.isFinite(reference.lat)||!Number.isFinite(reference.lng)||Math.abs(reference.lat)>90||Math.abs(reference.lng)>180)throw Error('Choose a checked visit with valid latitude and longitude first.');
 if(chosen.length<2)throw Error('Check at least two visits to group at the same location.');
 const byDate=new Map();
 for(const g of chosen){
  if(g.tagsError)throw Error(g.tagsError);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(g.visited))throw Error('Review each selected visit date before grouping.');
  const rows=byDate.get(g.visited)??[];rows.push(g);byDate.set(g.visited,rows);
 }
 const combined=[],usedIds=new Set(groups.map(g=>g.id));let serial=0;const nextId=()=>{let id;do{id=`shared-${serial++}`;}while(usedIds.has(id));usedIds.add(id);return id;};
 for(const rows of byDate.values()){
  // Preserve reviewed destinations and labels instead of silently choosing between them.
  for(const field of ['targetId','category','tripId','country','region'])if(new Set(rows.map(g=>g[field]??'')).size>1)throw Error('Selected visits on the same date have different destinations or labels. Make those fields match before grouping.');
  const base=rows.includes(reference)?reference:rows[0],photos=rows.flatMap(g=>g.photos),files=rows.flatMap(g=>g.files),metadata=rows.flatMap(g=>g.photoMetadata??g.photos.map(()=>({takenOn:null,location:null}))),notes=[...new Set(rows.map(g=>g.notes).filter(Boolean))].join('\n\n'),tags=normalizeTags(rows.flatMap(g=>g.tags??[]));
  if(notes.length>20000)throw Error('Combined stories are too long. Shorten them before grouping.');
  for(let start=0;start<photos.length;start+=30)combined.push({...base,id:nextId(),lat:reference.lat,lng:reference.lng,dateSource:'Reviewed date',locationSource:'Shared location chosen in review',photos:photos.slice(start,start+30),files:files.slice(start,start+30),photoMetadata:metadata.slice(start,start+30),notes,tags:[...tags],selected:true});
 }
 return [...groups.filter(g=>!g.selected),...combined];
}
export function applyPhotoBatch(records,groups,{journeys=[],now=new Date().toISOString(),uuid=()=>crypto.randomUUID()}={}){
 const chosen=groups.filter(g=>g.selected);if(!chosen.length)throw Error('Select at least one reviewed group.');const active=new Set(journeys.filter(j=>!j.deleted).map(j=>j.id)),next=records.slice();let added=0,returns=0;
 for(const g of chosen){if(g.tripId&&!active.has(g.tripId))throw Error('A selected trip was removed. Review the batch again.');const tags=normalizeTags(g.tags??[]);let index=g.targetId?next.findIndex(r=>r.id===g.targetId):-1;if(g.targetId&&index<0)throw Error('A selected place was removed. Choose another target.');
  const old=next[index],fields={id:old?.id??uuid(),title:old?.title??g.title,category:old?.category??g.category,favorite:old?.favorite??false,rating:0,visited:g.visited,notes:g.notes??'',address:old?.address??'',phone:old?.phone??'',url:old?.url??'',lat:g.lat,lng:g.lng,photos:g.photos,coverIndex:0,audio:null,sampleArt:null,tripIds:g.tripId?[g.tripId]:[],tags:normalizeTags([...(old?.tags??[]),...tags]),country:g.country||old?.country||'',region:g.region||old?.region||'',updatedAt:now};
  if(old){next[index]=writeVisit(old,fields,'new',{newId:uuid});returns++;}else{next.push(validateRecord(fields));added++;}
 }
 return {records:next,added,returns};
}
