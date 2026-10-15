import {createPhotoPreview} from './photo-preview.js';
export function pinPhoto(record){
 const photo=Array.isArray(record?.photos)?record.photos[record.coverIndex??0]:record?.photo;
 return typeof photo==='string'&&photo.length<=30*1024*1024&&/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(photo)?photo:null;
}
export function createPinPreviews({thumbnail=(source,signal)=>createPhotoPreview(source,{width:96,height:96,signal}),onPreview=()=>{},limit=48}={}){
 let targets=new Map(),visible=new Set(),queue=[],active=null,disposed=false,waiters=[];
 const cache=new Map();
 function idle(){if(!active&&!queue.length)return Promise.resolve();return new Promise(resolve=>waiters.push(resolve));}
 function settle(){if(!active&&!queue.length){for(const done of waiters)done();waiters=[];}}
 function keep(id,value){cache.delete(id);cache.set(id,value);while(cache.size>limit)cache.delete(cache.keys().next().value);}
 function pump(){
  if(active||disposed)return;
  const task=queue.shift();if(!task){settle();return;}
  const {id,source}=task,abort=new AbortController();active={id,source,abort};
  Promise.resolve().then(()=>{if(abort.signal.aborted)throw Error('cancelled');return thumbnail(source,abort.signal);}).then(preview=>{
   if(disposed||abort.signal.aborted||targets.get(id)!==source||!visible.has(id))return;
   if(typeof preview!=='string'||preview.length>100000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(preview))throw Error('Invalid photo preview.');
   keep(id,{source,preview});onPreview(id,preview,source);
  }).catch(()=>{
   if(!disposed&&!abort.signal.aborted&&targets.get(id)===source&&visible.has(id))keep(id,{source,preview:null});
  }).finally(()=>{active=null;pump();settle();});
 }
 function sync(records,visibleIds=records.map(r=>r.id)){
  if(disposed)return;
  targets=new Map(records.map(r=>[r.id,pinPhoto(r)]).filter(([,photo])=>photo));visible=new Set(visibleIds);
  for(const [id,item]of cache)if(targets.get(id)!==item.source)cache.delete(id);
  if(active&&(targets.get(active.id)!==active.source||!visible.has(active.id)))active.abort.abort();
  queue=[];
  for(const [id,source]of targets){
   if(!visible.has(id))continue;
   const cached=cache.get(id);
   if(cached?.source===source){keep(id,cached);if(cached.preview)onPreview(id,cached.preview,source);}
   else if(!active||active.id!==id||active.source!==source||active.abort.signal.aborted)queue.push({id,source});
  }
  pump();
 }
 function pause(){visible.clear();queue=[];active?.abort.abort();settle();}
 return {sync,pause,idle,stats:()=>({cached:cache.size,queued:queue.length,active:active?1:0}),destroy(){disposed=true;pause();cache.clear();targets.clear();}};
}
