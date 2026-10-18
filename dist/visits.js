import {validateRecord} from './model.js';
export const INITIAL_VISIT='initial',MAX_VISITS=200;
export const VISIT_FIELDS=['visited','notes','rating','lat','lng','photo','photos','coverIndex','audio','sampleArt','tripIds'];
const validId=id=>typeof id==='string'&&/^[a-z0-9_-]{1,100}$/i.test(id);
const pick=source=>Object.fromEntries(VISIT_FIELDS.filter(key=>source[key]!==undefined).map(key=>[key,source[key]]));
const clock=record=>record.firstVisitUpdatedAt??record.updatedAt;
export function validateVisit(value){
 if(!value||!validId(value.id)||['initial','new'].includes(value.id)||value.visits!==undefined)throw Error('Invalid visit ID.');
 if(value.deleted!==undefined&&typeof value.deleted!=='boolean')throw Error('Invalid visit state.');
 const row=validateRecord({...pick(value),id:value.id,title:'Visit',category:'Other',favorite:false,updatedAt:value.updatedAt});
 const createdAt=value.createdAt??value.updatedAt;if(typeof createdAt!=='string'||createdAt.length>40||!Number.isFinite(Date.parse(createdAt)))throw Error('Invalid visit creation time.');
 if(value.deleted&&(row.photo||row.audio||row.photos?.length))throw Error('Removed visits must not contain attachments.');
 return {id:value.id,...pick(row),createdAt,updatedAt:row.updatedAt,...(value.deleted?{deleted:true}:{})};
}
export function validateVisitState(record){
 const state={};if(record.visits!==undefined){if(!Array.isArray(record.visits)||record.visits.length>=MAX_VISITS)throw Error(`Use up to ${MAX_VISITS} visits per place, including removed visits.`);state.visits=record.visits.map(validateVisit);if(new Set(state.visits.map(v=>v.id)).size!==state.visits.length)throw Error('Duplicate visit IDs.');}
 if(record.firstVisitUpdatedAt!==undefined){if(typeof record.firstVisitUpdatedAt!=='string'||record.firstVisitUpdatedAt.length>40||!Number.isFinite(Date.parse(record.firstVisitUpdatedAt)))throw Error('Invalid first visit update time.');state.firstVisitUpdatedAt=record.firstVisitUpdatedAt;}
 if(record.firstVisitDeleted!==undefined){if(typeof record.firstVisitDeleted!=='boolean')throw Error('Invalid first visit state.');if(record.firstVisitDeleted){state.firstVisitDeleted=true;if(!state.visits?.some(v=>!v.deleted))throw Error('Keep at least one visit, or delete the place.');if(record.photo||record.photos?.length||record.audio)throw Error('Removed visits must not contain attachments.');}}
 if(record.mainVisitId!==undefined){if(!validId(record.mainVisitId)||(record.mainVisitId==='initial'?state.firstVisitDeleted:!state.visits?.some(v=>v.id===record.mainVisitId&&!v.deleted)))throw Error('The journal photo refers to an unavailable visit.');state.mainVisitId=record.mainVisitId;}
 return state;
}
export function visitsOf(record){
 if(!record)return [];const initial={id:INITIAL_VISIT,...pick(record),updatedAt:clock(record),createdAt:record.visited+'T00:00:00.000Z'};
 return [...(record.firstVisitDeleted?[]:[initial]),...(record.visits??[]).filter(v=>!v.deleted)].sort((a,b)=>b.visited.localeCompare(a.visited)||b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));
}
export const latestVisited=record=>record.visitId?(record.visitEnd??record.visited):visitsOf(record)[0]?.visited??record.visited;
export function visitById(record,id){return visitsOf(record).find(v=>v.id===(id??visitsOf(record)[0]?.id))??null;}
export function visitView(record,id){const visit=visitById(record,id);if(!visit)throw Error('This visit is no longer available.');const view={...record,...pick(visit),visitId:visit.id};for(const key of ['visits','firstVisitDeleted','firstVisitUpdatedAt','mainVisitId'])delete view[key];return view;}
export function coverVisit(record){const visits=visitsOf(record),chosen=visits.find(v=>v.id===(record.mainVisitId??visits[0]?.id));return chosen?.photo||chosen?.sampleArt?chosen:visits.find(v=>v.photo)||chosen||visits[0];}
export function placeView(record){if(record.visitId)return record;const visit=coverVisit(record);if(!visit)return record;const location=record.lat!==null&&record.lat!==undefined?record:visitsOf(record).find(v=>Number.isFinite(v.lat)&&Number.isFinite(v.lng))??record;return {...visitView(record,visit.id),lat:location.lat,lng:location.lng,visited:latestVisited(record),tripIds:journeyIdsOf(record)};}
export function journeyIdsOf(record){return [...new Set(visitsOf(record).flatMap(v=>v.tripIds??[]))];}
export function writeVisit(record,fields,id=INITIAL_VISIT,{newId=()=>crypto.randomUUID()}={}){
 const now=fields.updatedAt??new Date().toISOString(),shared=Object.fromEntries(['title','category','categoryReviewed','favorite','address','phone','url','tags','country','region','placeSource'].map(key=>[key,fields[key]??record[key]]));
 let next={...record,...shared,updatedAt:now};
 if(id==='new'){
  if((record.visits?.length??0)>=MAX_VISITS-1)throw Error(`Use up to ${MAX_VISITS} visits per place, including removed visits.`);
  const visit=validateVisit({...pick(fields),id:newId(),createdAt:now,updatedAt:now});next.visits=[...(record.visits??[]),visit];next.firstVisitUpdatedAt=clock(record);next.mainVisitId=visit.id;
 }else if(id===INITIAL_VISIT){
  if(record.firstVisitDeleted)throw Error('This visit was removed.');Object.assign(next,pick(fields));if(record.visits!==undefined||record.firstVisitUpdatedAt!==undefined)next.firstVisitUpdatedAt=now;
 }else{
  const previous=record.visits?.find(v=>v.id===id&&!v.deleted);if(!previous)throw Error('This visit is no longer available.');
  const visit=validateVisit({...previous,...pick(fields),id,updatedAt:now});next.visits=record.visits.map(v=>v.id===id?visit:v);
 }
 return validateRecord(next);
}
export function changeVisit(record,id,transform,{main=false,now=new Date().toISOString()}={}){
 const view=visitView(record,id),updated=transform(view);const next=writeVisit(record,{...updated,updatedAt:now},id);return main?validateRecord({...next,mainVisitId:id}):next;
}
export function removeVisit(record,id,now=new Date().toISOString()){
 if(!visitById(record,id))throw Error('This visit is no longer available.');if(visitsOf(record).length<=1)throw Error('Keep at least one visit. Use Delete place to remove the whole footprint.');
 const blank={notes:'',rating:0,photo:null,photos:[],coverIndex:0,audio:null,sampleArt:null,tripIds:[]};let next={...record,updatedAt:now};
 if(id===INITIAL_VISIT)next={...next,...blank,firstVisitDeleted:true,firstVisitUpdatedAt:now};else next.visits=record.visits.map(v=>v.id===id?{...v,...blank,lat:null,lng:null,deleted:true,updatedAt:now}:v);
 if(next.mainVisitId===id)delete next.mainVisitId;return validateRecord(next);
}
// Independent visit clocks preserve additions and removals when backups overlap.
export function mergeVisitRecords(existing,incoming){
 const incomingNewer=Date.parse(incoming.updatedAt)>Date.parse(existing.updatedAt);
 if(existing.visits===undefined&&incoming.visits===undefined&&existing.firstVisitUpdatedAt===undefined&&incoming.firstVisitUpdatedAt===undefined)return incomingNewer?incoming:existing;
 let changed=incomingNewer;const firstNext=Date.parse(clock(incoming))>Date.parse(clock(existing))||(Date.parse(clock(incoming))===Date.parse(clock(existing))&&incoming.firstVisitDeleted&&!existing.firstVisitDeleted),first=firstNext?incoming:existing;changed||=firstNext;
 const map=new Map((existing.visits??[]).map(v=>[v.id,v]));for(const v of incoming.visits??[]){const old=map.get(v.id);if(!old||Date.parse(v.updatedAt)>Date.parse(old.updatedAt)||(Date.parse(v.updatedAt)===Date.parse(old.updatedAt)&&v.deleted&&!old.deleted)){map.set(v.id,v);changed=true;}}
 if(!changed)return existing;
 const result={...(incomingNewer?incoming:existing),...pick(first),firstVisitUpdatedAt:clock(first),visits:[...map.values()]};if(first.firstVisitDeleted)result.firstVisitDeleted=true;else delete result.firstVisitDeleted;
 if(result.mainVisitId&&!visitsOf(result).some(v=>v.id===result.mainVisitId))delete result.mainVisitId;
 return validateRecord(result);
}
