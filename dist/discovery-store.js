export const MAX_SAVED_SEARCHES=30,MAX_SAVED_SEARCH_BYTES=20*1024*1024;
export const savedSearchBytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
export function trimSavedSearches(entries,{maxEntries=MAX_SAVED_SEARCHES,maxBytes=MAX_SAVED_SEARCH_BYTES}={}){
 const sorted=[...entries].filter(e=>e&&typeof e.id==='string'&&Number.isFinite(e.usedAt)&&Number.isFinite(e.at)).reverse().sort((a,b)=>b.usedAt-a.usedAt||b.at-a.at);let bytes=0;const keep=[],remove=[];
 for(const e of sorted){let n;try{n=savedSearchBytes(e);}catch{remove.push(e.id);continue;}if(keep.length<maxEntries&&bytes+n<=maxBytes){keep.push(e);bytes+=n;}else remove.push(e.id);}
 return {keep,remove,bytes};
}
// Discovery data is deliberately separate from the journal, backups and API key.
export function createDiscoveryStore({indexedDB:factory,name='nth-places-searches',maxEntries=MAX_SAVED_SEARCHES,maxBytes=MAX_SAVED_SEARCH_BYTES}={}){
 if(factory===undefined){try{factory=globalThis.indexedDB;}catch{factory=null;}}
 let pending=null;
 function open(){if(pending)return pending;if(!factory)return Promise.resolve(null);pending=new Promise(resolve=>{try{const r=factory.open(name,1);let finished=false;const timer=setTimeout(()=>{finished=true;resolve(null);},2500);r.onupgradeneeded=()=>{r.result.createObjectStore('searches',{keyPath:'id'});r.result.createObjectStore('meta');};r.onsuccess=()=>{clearTimeout(timer);if(finished){r.result.close();return;}const db=r.result;db.onversionchange=()=>{db.close();pending=null;};resolve(db);};r.onerror=()=>{clearTimeout(timer);resolve(null);};r.onblocked=()=>{clearTimeout(timer);finished=true;resolve(null);};}catch{resolve(null);}});return pending;}
 return {
  async load(){const db=await open();if(!db)return {entries:[],last:null,available:false};return new Promise(resolve=>{try{const t=db.transaction(['searches','meta']),a=t.objectStore('searches').getAll(),b=t.objectStore('meta').get('last');t.oncomplete=()=>resolve({entries:a.result,last:b.result??null,available:true});t.onabort=t.onerror=()=>resolve({entries:[],last:null,available:false});}catch{resolve({entries:[],last:null,available:false});}});},
  async put(entry,last){const db=await open();if(!db)return {saved:false,removed:[]};return new Promise(resolve=>{try{const t=db.transaction(['searches','meta'],'readwrite'),s=t.objectStore('searches'),r=s.getAll();let removed=[];r.onsuccess=()=>{const existing=r.result.filter(e=>e.id!==entry.id),trim=trimSavedSearches([...existing,entry],{maxEntries,maxBytes});removed=trim.remove;for(const id of removed)s.delete(id);if(!removed.includes(entry.id)){s.put(entry);t.objectStore('meta').put(last,'last');}};t.oncomplete=()=>resolve({saved:!removed.includes(entry.id),removed});t.onabort=t.onerror=()=>resolve({saved:false,removed:[]});}catch{resolve({saved:false,removed:[]});}});},
  async clear(){const db=await open();if(!db)return false;return new Promise(resolve=>{try{const t=db.transaction(['searches','meta'],'readwrite');t.objectStore('searches').clear();t.objectStore('meta').clear();t.oncomplete=()=>resolve(true);t.onabort=t.onerror=()=>resolve(false);}catch{resolve(false);}});}
 };
}
