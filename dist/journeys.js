import {visitsOf,visitView,placeView,journeyIdsOf} from './visits.js';
export const MAX_JOURNEYS=1000,MAX_RECORD_JOURNEYS=20;
const id=value=>typeof value==='string'&&/^[a-z0-9_-]{1,100}$/i.test(value);
const text=(value,max,label)=>{if(typeof value!=='string'||value.length>max)throw Error(`Invalid journey ${label}.`);return value;};
export function recordJourneyIds(value){
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>MAX_RECORD_JOURNEYS||value.some(v=>!id(v))||new Set(value).size!==value.length)throw Error(`A visit can belong to up to ${MAX_RECORD_JOURNEYS} different journeys.`);
 return value.slice();
}
export function validateJourney(value){
 if(!value||!id(value.id))throw Error('Invalid journey ID.');const title=text(value.title,160,'name').trim();if(!title)throw Error('Give this journey a name.');
 const notes=text(value.notes??'',2000,'description'),createdAt=text(value.createdAt,40,'creation time'),updatedAt=text(value.updatedAt,40,'update time');
 if(!Number.isFinite(Date.parse(createdAt))||!Number.isFinite(Date.parse(updatedAt)))throw Error('Invalid journey date.');
 const coverId=value.coverId??null;if(coverId!==null&&!id(coverId))throw Error('Invalid journey cover.');if(value.deleted!==undefined&&typeof value.deleted!=='boolean')throw Error('Invalid journey state.');
 return {id:value.id,title,notes,coverId,createdAt,updatedAt,...(value.deleted?{deleted:true}:{})};
}
export function validateJourneys(values=[]){
 if(!Array.isArray(values)||values.length>MAX_JOURNEYS)throw Error(`Use up to ${MAX_JOURNEYS} journeys.`);const rows=values.map(validateJourney);if(new Set(rows.map(j=>j.id)).size!==rows.length)throw Error('Duplicate journey IDs.');return rows;
}
export function activeJourneys(journeys){return journeys.filter(j=>!j.deleted).slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.title.localeCompare(b.title));}
export function journeyRecords(records,id){return records.flatMap(r=>{if(!r.visits)return recordJourneyIds(r.tripIds).includes(id)?[r]:[];const matches=visitsOf(r).filter(v=>v.tripIds?.includes(id));if(!matches.length)return [];const cover=matches.find(v=>v.id===r.mainVisitId&&v.photo)??matches.find(v=>v.photo)??matches[0];const location=placeView(r);return [{...visitView(r,cover.id),lat:location.lat,lng:location.lng,searchNotes:matches.map(v=>v.notes??''),visited:matches.at(-1).visited,visitEnd:matches[0].visited,visitCount:matches.length}];}).sort((a,b)=>a.visited.localeCompare(b.visited)||a.updatedAt.localeCompare(b.updatedAt)||a.id.localeCompare(b.id));}
export function journeySummary(journey,records){
 const places=journeyRecords(records,journey.id),cover=places.find(r=>r.id===journey.coverId)??places.find(r=>r.photo)??places[0]??null;
 return {journey,places,cover,count:places.length,located:places.filter(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lng)).length,start:places[0]?.visited??null,end:places.length?places.reduce((end,r)=>end>(r.visitEnd??r.visited)?end:(r.visitEnd??r.visited),''):null};
}
function mapMemberships(record,transform,updatedAt){
 let changed=false,firstChanged=false;const root=recordJourneyIds(record.tripIds),first=transform(root,'initial');firstChanged=first.length!==root.length||first.some((id,i)=>id!==root[i]);changed=firstChanged;
 const visits=record.visits?.map(v=>{if(v.deleted)return v;const ids=recordJourneyIds(v.tripIds),next=transform(ids,v.id);if(next.length===ids.length&&next.every((id,i)=>id===ids[i]))return v;changed=true;return {...v,tripIds:recordJourneyIds(next),updatedAt};});
 return changed?{...record,tripIds:recordJourneyIds(first),...(visits?{visits}:{}),...(firstChanged&&record.visits?{firstVisitUpdatedAt:updatedAt}:{}),updatedAt}:record;
}
export function setJourneyMembership(records,journeyId,selectedIds,updatedAt=new Date().toISOString()){
 const selected=new Set(selectedIds);return records.map(record=>{const had=journeyIdsOf(record).includes(journeyId),has=selected.has(record.id);if(had===has)return record;const target=visitsOf(record)[0]?.id;return mapMemberships(record,(ids,id)=>has?(id===target?[...ids,journeyId]:ids):ids.filter(id=>id!==journeyId),updatedAt);});
}
export function reconcileJourneys(records,journeys,updatedAt=new Date().toISOString()){
 const active=new Set(journeys.filter(j=>!j.deleted).map(j=>j.id));
 const rows=records.map(record=>mapMemberships(record,ids=>ids.filter(id=>active.has(id)),updatedAt));
 const trips=journeys.map(j=>{if(!j.coverId||(!j.deleted&&rows.some(r=>r.id===j.coverId&&journeyIdsOf(r).includes(j.id))))return j;return {...j,coverId:null,updatedAt};});
 return {records:rows,journeys:trips};
}
export function mergeJourneys(existing,incoming){
 const map=new Map(existing.map(j=>[j.id,j]));for(const next of incoming){const old=map.get(next.id);if(!old||Date.parse(next.updatedAt)>Date.parse(old.updatedAt)||(next.updatedAt===old.updatedAt&&next.deleted))map.set(next.id,next);}return [...map.values()];
}
export function checkJourneyLinks(records,journeys){
 const active=new Set(journeys.filter(j=>!j.deleted).map(j=>j.id));for(const r of records)if(journeyIdsOf(r).some(id=>!active.has(id)))throw Error('This backup references a missing journey.');
 for(const j of journeys)if(j.coverId&&!records.some(r=>r.id===j.coverId&&journeyIdsOf(r).includes(j.id)))throw Error('This backup has a journey cover outside its footprints.');
}
