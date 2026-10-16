import {RECORD_CATEGORIES} from './categories.js';
import {visitsOf,visitView,placeView} from './visits.js';
export const MAX_TAGS=30,MAX_COLLECTIONS=100;
const txt=(v,max,label)=>{if(typeof v!=='string'||v.length>max)throw Error(`Invalid ${label}.`);return v.trim();};
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export const validDay=day;
export function normalizeTags(values=[]){
 if(!Array.isArray(values)||values.length>MAX_TAGS)throw Error(`Use up to ${MAX_TAGS} tags per place.`);const found=new Map();for(const value of values){const tag=txt(value,40,'tag').normalize('NFC');if(!tag||/[\r\n,]/.test(tag))throw Error('Use non-empty tags without commas.');if(!found.has(tag.toLocaleLowerCase()))found.set(tag.toLocaleLowerCase(),tag);}return [...found.values()];
}
export const parseTags=value=>normalizeTags(String(value??'').split(',').map(s=>s.trim()).filter(Boolean));
export function validateLabels(r){return {...(r.tags!==undefined?{tags:normalizeTags(r.tags)}:{}),...(r.country!==undefined?{country:txt(r.country,80,'country')}:{}),...(r.region!==undefined?{region:txt(r.region,100,'state or province')}:{} )};}
export function validateRule(value={}){
 const r={query:txt(value.query??'',200,'collection search'),tag:txt(value.tag??'',40,'collection tag'),category:txt(value.category??'All places',30,'collection category'),country:txt(value.country??'',80,'collection country'),region:txt(value.region??'',100,'collection region'),tripId:txt(value.tripId??'',100,'collection trip'),from:txt(value.from??'',10,'collection start'),to:txt(value.to??'',10,'collection end'),favorites:value.favorites??false,minRating:value.minRating??0,hasLocation:value.hasLocation??false};
 if(!['All places',...RECORD_CATEGORIES].includes(r.category)||typeof r.favorites!=='boolean'||typeof r.hasLocation!=='boolean'||!Number.isInteger(r.minRating)||r.minRating<0||r.minRating>5||r.from&&!day(r.from)||r.to&&!day(r.to)||r.from&&r.to&&r.from>r.to||r.tripId&&!/^[a-z0-9_-]{1,100}$/i.test(r.tripId))throw Error('Check the collection filters and date range.');return r;
}
export function validateCollections(values=[]){
 if(!Array.isArray(values)||values.length>MAX_COLLECTIONS)throw Error(`Use up to ${MAX_COLLECTIONS} saved collections, including removed entries.`);const ids=new Set();return values.map(v=>{if(!v||typeof v.id!=='string'||!/^[a-z0-9_-]{1,100}$/i.test(v.id)||ids.has(v.id))throw Error('Invalid or duplicate collection ID.');ids.add(v.id);const title=txt(v.title,100,'collection name');if(!title||!Number.isFinite(Date.parse(v.updatedAt))||typeof v.updatedAt!=='string'||v.updatedAt.length>40||v.deleted!==undefined&&typeof v.deleted!=='boolean')throw Error('Invalid collection.');return {id:v.id,title,rule:validateRule(v.rule),updatedAt:v.updatedAt,...(v.deleted?{deleted:true}:{})};});
}
export function nextCollectionUpdate(previous,now=new Date().toISOString()){const old=Date.parse(previous??''),current=Date.parse(now);if(!Number.isFinite(current))throw Error('Invalid update time.');return new Date(Math.max(current,Number.isFinite(old)?old+1:current)).toISOString();}
export function mergeCollections(old=[],incoming=[]){const map=new Map(old.map(c=>[c.id,c]));for(const c of incoming){const previous=map.get(c.id);if(!previous||Date.parse(c.updatedAt)>Date.parse(previous.updatedAt)||(c.updatedAt===previous.updatedAt&&c.deleted))map.set(c.id,c);}return validateCollections([...map.values()]);}
export function mergeJournalPreferences(current,incoming,appearance=false){const collections=mergeCollections(current.collections??[],incoming.collections??[]);return {...current,...(appearance?{theme:incoming.theme,...(incoming.memories!==undefined?{memories:incoming.memories}:{})}:{}),...(collections.length||current.collections||incoming.collections?{collections}:{})};}
const same=(a,b)=>String(a??'').trim().toLocaleLowerCase()===String(b??'').trim().toLocaleLowerCase();
export function matchesVisit(record,visit,rule={}){
 if(rule.tag&&!(record.tags??[]).some(t=>same(t,rule.tag))||rule.country&&!same(record.country,rule.country)||rule.region&&!same(record.region,rule.region)||rule.favorites&&!record.favorite||rule.category&&rule.category!=='All places'&&record.category!==rule.category||rule.tripId&&!visit.tripIds?.includes(rule.tripId)||rule.from&&visit.visited<rule.from||rule.to&&visit.visited>rule.to||(rule.minRating??0)>visit.rating||rule.hasLocation&&!Number.isFinite(placeView(record).lat))return false;
 const q=(rule.query??'').trim().toLocaleLowerCase();return !q||[record.title,record.address,record.category,visit.notes,...(record.tags??[])].some(s=>String(s??'').toLocaleLowerCase().includes(q));
}
export function scopeRecords(records,{tripId='',tag='',collection=null,country='',region=''}={}){
 const rule=collection?.rule??{};if(!tripId&&!tag&&!collection&&!country&&!region)return records;
 return records.flatMap(record=>{if(tag&&!(record.tags??[]).some(t=>same(t,tag))||country&&!same(country,record.country)||region&&!same(region,record.region))return [];
 const selected=visitsOf(record).filter(v=>(!tripId||v.tripIds?.includes(tripId))&&matchesVisit(record,v,rule));if(!selected.length)return [];const cover=selected.find(v=>v.id===record.mainVisitId&&v.photo)??selected.find(v=>v.photo)??selected[0],location=placeView(record);return [{...visitView(record,cover.id),lat:location.lat,lng:location.lng,visited:selected[0].visited,searchNotes:selected.map(v=>v.notes??''),matchingVisitIds:selected.map(v=>v.id)}];});
}
export function flattenVisits(records,{tripId='',from='',to='',query='',tag=''}={}){
 const rule={tripId,from,to,query,tag};return records.flatMap(record=>visitsOf(record).filter(v=>matchesVisit(record,v,rule)).map(visit=>({record,visit}))).sort((a,b)=>b.visit.visited.localeCompare(a.visit.visited)||a.record.title.localeCompare(b.record.title)||a.visit.id.localeCompare(b.visit.id));
}
export function anniversaryMemories(records,today){if(!day(today))throw Error('Choose a valid day.');const year=Number(today.slice(0,4)),md=today.slice(5);return flattenVisits(records).filter(({visit})=>visit.visited.slice(5)===md&&Number(visit.visited.slice(0,4))<year).map(row=>({...row,years:year-Number(row.visit.visited.slice(0,4))}));}
export function calendarMonth(month){if(typeof month!=='string'||!/^\d{4}-\d{2}$/.test(month)||!day(month+'-01'))throw Error('Choose a valid month.');const first=new Date(month+'-01T12:00:00Z'),last=new Date(first);last.setUTCMonth(last.getUTCMonth()+1);last.setUTCDate(0);const length=last.getUTCDate();return {month,offset:(first.getUTCDay()+6)%7,days:Array.from({length},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`)};}
export function explorationStats(records){
 const rows=flattenVisits(records),countries=new Map(),regions=new Map(),years=new Map(),dates=new Set();let photos=0,located=0,unlabelled=0;
 for(const r of records){if(Number.isFinite(placeView(r).lat))located++;if(!r.country)unlabelled++;else{const k=r.country.toLocaleLowerCase();const row=countries.get(k)??{name:r.country,count:0};row.count++;countries.set(k,row);}if(r.region){const k=(r.country??'').toLocaleLowerCase()+'|'+r.region.toLocaleLowerCase(),row=regions.get(k)??{name:r.region,country:r.country??'',count:0};row.count++;regions.set(k,row);}}
 for(const {visit}of rows){dates.add(visit.visited);years.set(visit.visited.slice(0,4),(years.get(visit.visited.slice(0,4))??0)+1);photos+=visit.photos?.length??(visit.photo?1:0);}
 const milestones=[{label:'First footprint',reached:records.length>=1},{label:'10 places',reached:records.length>=10},{label:'50 places',reached:records.length>=50},{label:'100 visits',reached:rows.length>=100},{label:'5 named countries',reached:countries.size>=5},{label:'A place revisited',reached:records.some(r=>visitsOf(r).length>1)}];
 return {places:records.length,visits:rows.length,photos,days:dates.size,located,unlabelled,countries:[...countries.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)),regions:[...regions.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)),years:[...years].sort((a,b)=>b[0].localeCompare(a[0])),milestones};
}
