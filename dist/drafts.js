import {recordJourneyIds} from './journeys.js';
import {CATEGORIES,MAX_PHOTOS} from './model.js';
export const DRAFT_KEY='editor-draft',CLOSED_KEY='closed-editor-drafts';
const cameraKey=id=>`draft-camera:${id}`;
const mediaPrefix=id=>`draft-media:${id}:`;
const uuidPattern=/^[a-z0-9_-]{1,100}$/i;
export const DRAFT_FIELDS={title:160,category:30,visited:10,rating:4,address:500,notes:20000,phone:80,url:2048,lat:80,lng:80,tags:2000,country:80,region:100};
export function validateDraft(d){
 if(![1,2,3,4].includes(d?.version)||!uuidPattern.test(d.id??'')||(d.editId!==null&&!uuidPattern.test(d.editId??''))||!d.values||typeof d.favorite!=='boolean'||!Array.isArray(d.photos)||d.photos.length>MAX_PHOTOS||!Number.isInteger(d.coverIndex)||d.coverIndex<0||d.coverIndex>=Math.max(1,d.photos.length)||!Number.isFinite(Date.parse(d.savedAt)))throw Error('This recovery draft could not be read. Your saved journal is unchanged.');
 for(const [field,max]of Object.entries(DRAFT_FIELDS))if(!(['tags','country','region'].includes(field)&&d.values[field]===undefined)&& (typeof d.values[field]!=='string'||d.values[field].length>max))throw Error('This recovery draft has an invalid field.');
 if(!CATEGORIES.includes(d.values.category))throw Error('This recovery draft has an invalid category.');
 const prefix=mediaPrefix(d.id);for(const key of [...d.photos,...(d.audio?[d.audio]:[])])if(typeof key!=='string'||!key.startsWith(prefix)||key.length>240)throw Error('This recovery draft has an invalid attachment.');
 if(d.camera&&(!uuidPattern.test(d.camera.token??'')||!Number.isFinite(Date.parse(d.camera.startedAt))))throw Error('This recovery draft has an invalid camera request.');
 if(d.visitId!==undefined&&d.visitId!==null&&(!d.editId||!uuidPattern.test(d.visitId)))throw Error('This recovery draft has an invalid visit.');
 recordJourneyIds(d.tripIds);return d;
}
function deleteMedia(store,id,keep=new Set()){
 const cursor=store.openKeyCursor();cursor.onsuccess=e=>{const c=e.target.result;if(c){if(typeof c.key==='string'&&c.key.startsWith(mediaPrefix(id))&&!keep.has(c.key))store.delete(c.key);c.continue();}};
}
// Call inside the SAME journal transaction as Save. A crash cannot resurrect a
// draft that has already become a saved footprint.
export function clearDraftInTransaction(store,id){
 if(!id)return;
 const closed=store.get(CLOSED_KEY);closed.onsuccess=()=>store.put([...new Set([...(closed.result??[]),id])].slice(-32),CLOSED_KEY);
 const meta=store.get(DRAFT_KEY);meta.onsuccess=()=>{if(meta.result?.id===id)store.delete(DRAFT_KEY);};
 store.delete(cameraKey(id));deleteMedia(store,id);
}
export function createDraftStore(db){
 const transaction=(mode,work)=>new Promise((resolve,reject)=>{const tx=db.transaction('journal',mode),store=tx.objectStore('journal');let value;work(store,result=>value=result,tx);tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error??Error('Draft could not be saved.'));tx.onerror=()=>{};});
 return {
  read:()=>transaction('readonly',(s,set)=>{const req=s.get(DRAFT_KEY);req.onsuccess=()=>set(req.result??null);}),
  media:key=>transaction('readonly',(s,set)=>{s.get(key).onsuccess=e=>set(e.target.result??null);}),
  result:id=>transaction('readonly',(s,set)=>{s.get(cameraKey(id)).onsuccess=e=>set(e.target.result??null);}),
  write:(draft,entries=[])=>transaction('readwrite',(s,_,tx)=>{
   const closed=s.get(CLOSED_KEY);closed.onsuccess=()=>{if((closed.result??[]).includes(draft.id)){tx.abort();return;}
    const old=s.get(DRAFT_KEY);old.onsuccess=()=>{if(old.result&&old.result.id!==draft.id){tx.abort();return;}
     for(const [key,blob]of entries)s.put(blob,key);
     s.put(draft,DRAFT_KEY);deleteMedia(s,draft.id,new Set([...draft.photos,...(draft.audio?[draft.audio]:[])]));
     if(old.result?.camera?.token!==draft.camera?.token||!draft.camera)s.delete(cameraKey(draft.id));
    };
   };
  }),
  clear:id=>transaction('readwrite',s=>clearDraftInTransaction(s,id)),
  clearActive:id=>transaction('readwrite',(s,_,tx)=>{s.get(DRAFT_KEY).onsuccess=e=>{if(e.target.result&&e.target.result.id!==id){tx.abort();return;}s.delete(DRAFT_KEY);s.delete(cameraKey(id));deleteMedia(s,id);};}),
  clearUnreadable:()=>transaction('readwrite',(s,_,tx)=>{s.get(DRAFT_KEY).onsuccess=e=>{const draft=e.target.result;if(!draft)return;try{validateDraft(draft);tx.abort();return;}catch{}s.delete(DRAFT_KEY);const keys=s.openKeyCursor();keys.onsuccess=e=>{const c=e.target.result;if(c){if(typeof c.key==='string'&&(c.key.startsWith('draft-media:')||c.key.startsWith('draft-camera:')))s.delete(c.key);c.continue();}};};}),
  async putResult(id,token,result){return transaction('readwrite',(s,set)=>{const req=s.get(DRAFT_KEY);req.onsuccess=()=>{if(req.result?.id===id&&req.result?.camera?.token===token){s.put({...result,token},cameraKey(id));set(true);}else set(false);};});}
 };
}
export function draftBlob(source,kind){
 if(typeof source!=='string')throw Error('A draft attachment could not be saved.');
 const match=source.match(/^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/i);
 if(!match||!match[1].startsWith(kind+'/')||(kind==='image'&&!/^image\/(jpeg|png|webp|gif)$/i.test(match[1]))||match[2].length%4||match[2].length>28*1024*1024)throw Error('A draft attachment is not supported.');
 const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));if(bytes.length>20*1024*1024)throw Error('A draft attachment exceeds 20 MB.');
 return new Blob([bytes],{type:match[1]});
}
const blobData=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('A draft attachment could not be opened.'));reader.readAsDataURL(blob);});
export function createDraftRecovery({store,onState=()=>{},read=blobData,uuid=()=>crypto.randomUUID(),delay=250}={}){
 let id=null,pending=null,timer=null,writing=null,frozen=false,cache=new Map(),eligible=null,hasWritten=false;
 const emit=(state,message)=>onState({state,message,id});
 async function prepare(snapshot){
  const entries=[],keys=new Set();
  function media(source,kind){if(!source)return null;let value=cache.get(source);if(!value){value={key:mediaPrefix(id)+uuid(),blob:draftBlob(source,kind)};cache.set(source,value);entries.push([value.key,value.blob]);}keys.add(source);return value.key;}
  const draft={version:4,visitId:snapshot.visitId??null,tripIds:recordJourneyIds(snapshot.tripIds),id,editId:snapshot.editId??null,baseUpdatedAt:snapshot.baseUpdatedAt??null,values:{tags:'',country:'',region:'',...snapshot.values},favorite:!!snapshot.favorite,photos:snapshot.photos.map(src=>media(src,'image')),coverIndex:snapshot.coverIndex,audio:media(snapshot.audio,'audio'),art:snapshot.art??null,camera:snapshot.camera?{...snapshot.camera}:null,savedAt:new Date().toISOString()};
  validateDraft(draft);for(const key of cache.keys())if(!keys.has(key))cache.delete(key);
  // A previous failed transaction may have cached media which never reached disk.
  for(const source of keys){const value=cache.get(source);if(!entries.some(([key])=>key===value.key)&&!value.stored)entries.push([value.key,value.blob]);}
  return {draft,entries};
 }
 async function drain(){
  if(writing)return writing;
  writing=(async()=>{while(pending){const snapshot=pending;pending=null;if(snapshot.clean){await store.clearActive(id);cache.clear();hasWritten=false;emit(pending?'saving':'idle',pending?'Saving recovery draft…':'No unsaved changes.');continue;}const {draft,entries}=await prepare(snapshot);await store.write(draft,entries);for(const value of cache.values()){value.stored=true;value.blob=null;}hasWritten=true;emit(pending?'saving':'saved',pending?'Saving recovery draft…':'Draft saved on this device.');}})();
  try{await writing;}catch(error){emit('error','Draft recovery could not save. Keep the app open and try Save footprint.');throw error;}finally{writing=null;}
 }
 const api={
  get id(){return id;},
  async load(){const draft=await store.read();if(draft){validateDraft(draft);eligible=draft.camera?{id:draft.id,token:draft.camera.token}:null;}return draft;},
  begin(draftId=uuid()){if(id)throw Error('An editor draft is already open.');id=draftId;frozen=false;hasWritten=false;cache=new Map();emit('idle','Changes are kept as a recovery draft on this device.');return id;},
  schedule(snapshot){if(!id||frozen)return;pending=snapshot;emit('saving','Saving recovery draft…');clearTimeout(timer);timer=setTimeout(()=>{timer=null;void drain().catch(()=>{});},delay);},
  clean(){if(!id||frozen||(!hasWritten&&!pending&&!writing))return;pending={clean:true};clearTimeout(timer);timer=setTimeout(()=>{timer=null;void drain().catch(()=>{});},delay);},
  async flush(snapshot){if(!id)return;if(snapshot&&!frozen)pending=snapshot;clearTimeout(timer);timer=null;await drain();},
  async freeze(){frozen=true;clearTimeout(timer);timer=null;try{await drain();}catch{/* Save can still commit the in-memory editor. */}return id;},
  unfreeze(){frozen=false;},
  release(){clearTimeout(timer);timer=null;id=null;pending=null;frozen=true;cache.clear();eligible=null;},
  async discard(){const old=id;frozen=true;pending=null;clearTimeout(timer);timer=null;if(writing)await writing.catch(()=>{});if(old)await store.clear(old);api.release();},
  async discardFound(draftId){await store.clear(draftId);if(eligible?.id===draftId)eligible=null;},
  async hydrate(draft){validateDraft(draft);const photos=[];for(const key of draft.photos){const blob=await store.media(key);if(!(blob instanceof Blob))throw Error('A draft photo could not be recovered. The saved journal is unchanged.');photos.push(await read(blob));}
   let audio=null;if(draft.audio){const blob=await store.media(draft.audio);if(!(blob instanceof Blob))throw Error('The draft voice note could not be recovered.');audio=await read(blob);}
   return {...draft,tripIds:recordJourneyIds(draft.tripIds),values:{tags:'',country:'',region:'',...draft.values},photos,audio};
  },
  async receiveCamera(event,readPhoto){
   if(event?.pluginId!=='Camera'||event.methodName!=='getPhoto'||!eligible)return false;
   const target={...eligible},result=await store.result(target.id);if(result?.blob||result?.cancelled)return false;
   if(event.success!==true){const saved=await store.putResult(target.id,target.token,{cancelled:true});if(saved)emit('camera','The interrupted camera capture did not return a photo. Your draft is still available.');return saved;}
   const photo={webPath:typeof event.data?.webPath==='string'?event.data.webPath.slice(0,8192):null,path:typeof event.data?.path==='string'?event.data.path.slice(0,8192):null};
   if(!photo.webPath&&!photo.path)return false;
   if(!await store.putResult(target.id,target.token,{photo}))return false;
   return api.readReturned(target.id,readPhoto);
  },
  async readReturned(draftId,readPhoto){
   const result=await store.result(draftId);if(!result||result.blob||result.cancelled)return !!result;
   if(!eligible||eligible.id!==draftId||eligible.token!==result.token)return false;
   try{const blob=await readPhoto(result.photo);if(!(blob instanceof Blob)||blob.size>20*1024*1024||!/^image\/(jpeg|png|webp|gif)$/i.test(blob.type))throw Error('Invalid recovered photo.');
    const saved=await store.putResult(draftId,result.token,{blob});if(saved)emit('camera','Your returned camera photo is ready to recover.');return saved;
   }catch{emit('camera-error','The camera photo could not be opened. You can retry recovery; the rest of your draft is safe.');return false;}
  },
  result:draftId=>store.result(draftId),
  forgetCamera(){eligible=null;}
 };
 return api;
}
export async function bindDraftLifecycle({plugin,document=globalThis.document,events=globalThis.window,onPause=()=>{},onRestored=()=>{},onError=()=>{}}={}){
 const pause=()=>{if(document?.hidden)onPause();},pagehide=()=>onPause();
 document?.addEventListener('visibilitychange',pause);events?.addEventListener('pagehide',pagehide);
 const handles=[];
 if(plugin){for(const [name,callback]of [['pause',onPause],['appRestoredResult',onRestored]])try{handles.push(await plugin.addListener(name,callback));}catch{onError('Android draft recovery could not connect. Keep the app open while editing.');}}
 return {async remove(){document?.removeEventListener('visibilitychange',pause);events?.removeEventListener('pagehide',pagehide);for(const handle of handles)await handle.remove();}};
}
