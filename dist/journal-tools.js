import {validateBadgeCase} from './badge-case.js';
import {visitsOf,visitView,placeView} from './visits.js';
export const MAX_TAGS=30;
const txt=(v,max,label)=>{if(typeof v!=='string'||v.length>max)throw Error(`Invalid ${label}.`);return v.trim();};
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export const validDay=day;
export function normalizeTags(values=[]){
 if(!Array.isArray(values)||values.length>MAX_TAGS)throw Error(`Use up to ${MAX_TAGS} tags per place.`);const found=new Map();for(const value of values){const tag=txt(value,40,'tag').normalize('NFC');if(!tag||/[\r\n,]/.test(tag))throw Error('Use non-empty tags without commas.');if(!found.has(tag.toLocaleLowerCase()))found.set(tag.toLocaleLowerCase(),tag);}return [...found.values()];
}
export const parseTags=value=>normalizeTags(String(value??'').split(',').map(s=>s.trim()).filter(Boolean));
export function validateLabels(r){return {...(r.tags!==undefined?{tags:normalizeTags(r.tags)}:{}),...(r.country!==undefined?{country:txt(r.country,80,'country')}:{}),...(r.region!==undefined?{region:txt(r.region,100,'state or province')}:{} )};}
// Only current preferences survive loading/restoring older journal settings.
export function mergeJournalPreferences(current,incoming,appearance=false){
 return {theme:appearance?(incoming.theme??'paper'):(current.theme??'paper'),...(current.memories!==undefined?{memories:current.memories}:{}),...(appearance&&incoming.memories!==undefined?{memories:incoming.memories}:{}),...((appearance?incoming.badgeCase??current.badgeCase:current.badgeCase)?{badgeCase:validateBadgeCase(appearance?incoming.badgeCase??current.badgeCase:current.badgeCase)}:{})};
}
const same=(a,b)=>String(a??'').trim().toLocaleLowerCase()===String(b??'').trim().toLocaleLowerCase();
function matchesVisit(record,visit,{tripId='',from='',to='',query='',tag=''}={}){
 if(tag&&!(record.tags??[]).some(t=>same(t,tag))||tripId&&!visit.tripIds?.includes(tripId)||from&&visit.visited<from||to&&visit.visited>to)return false;
 const q=query.trim().toLocaleLowerCase();return !q||[record.title,record.address,record.category,visit.notes,...(record.tags??[])].some(s=>String(s??'').toLocaleLowerCase().includes(q));
}
export function scopeRecords(records,{tripId='',tag='',country='',region=''}={}){
 if(!tripId&&!tag&&!country&&!region)return records;
 return records.flatMap(record=>{if(tag&&!(record.tags??[]).some(t=>same(t,tag))||country&&!same(country,record.country)||region&&!same(region,record.region))return [];
 const selected=visitsOf(record).filter(v=>!tripId||v.tripIds?.includes(tripId));if(!selected.length)return [];const cover=selected.find(v=>v.id===record.mainVisitId&&v.photo)??selected.find(v=>v.photo)??selected[0],location=placeView(record);return [{...visitView(record,cover.id),lat:location.lat,lng:location.lng,visited:selected[0].visited,searchNotes:selected.map(v=>v.notes??''),matchingVisitIds:selected.map(v=>v.id)}];});
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
