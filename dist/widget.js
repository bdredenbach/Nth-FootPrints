import {filterRecords} from './model.js';
import {createPhotoPreview as widgetThumbnail} from './photo-preview.js';
export {widgetThumbnail};

// Mirror one small, derived preview. Original media stays in the journal.
export function widgetRecord(records){
 const r=filterRecords(records,{sort:'newest'})[0];
 return r?{id:r.id,title:r.title,visited:r.visited,sample:!r.photo&&!!r.sampleArt,source:r.photo??(r.sampleArt?`assets/${r.sampleArt}.svg`:null)}:null;
}
export function createWidgetSync({plugin,thumbnail=widgetThumbnail,onStatus=()=>{}}={}){
 let pending=null,running=null,revision=0,cachedSource,cachedThumbnail;
 async function drain(){
  while(pending){
   const {records,version}=pending;pending=null;
   const selected=widgetRecord(records);let preview=null;
   try{
    if(selected?.source){
     if(selected.source===cachedSource)preview=cachedThumbnail;
     else{try{preview=await thumbnail(selected.source);}catch{/* A broken preview must not retain an old footprint. */}}
    }
    if(version!==revision)continue;
    await plugin.updateSnapshot({count:records.length,record:selected?{id:selected.id,title:selected.title,visited:selected.visited,sample:selected.sample,thumbnail:preview}:null});
    if(version!==revision)continue;
    cachedSource=preview?selected?.source:undefined;cachedThumbnail=preview;
    onStatus('Widget refreshed. Add it to your Android home screen to keep a footprint close.');
   }catch{if(version===revision)onStatus('Your journal is saved. The widget could not refresh; try Refresh widget.');}
  }
 }
 return {available:!!plugin,
  refresh(records){
   if(!plugin)return Promise.resolve();
   pending={records:records.slice(),version:++revision};
   if(!running)running=drain().finally(()=>{running=null;});
   return running;
  }
 };
}
export function createWidgetLaunch({plugin,canOpen=()=>true,openFootprint,newFootprint,openJournal=()=>{},onError=()=>{}}={}){
 let pending=null,reading=false,again=false,started=false,listener;
 function flush(){if(!pending||!canOpen())return;const action=pending;pending=null;if(action.action==='new')newFootprint();else if(action.action==='journal')openJournal();else openFootprint(action.id);}
 async function read(){
  if(reading){again=true;return;}reading=true;
  try{do{
   again=false;const action=await plugin.takeLaunchAction();
   if(['new','journal'].includes(action?.action)||(action?.action==='open'&&typeof action.id==='string'&&/^[a-z0-9_-]{1,100}$/i.test(action.id)))pending=action;
   flush();
  }while(again);}catch{onError('Could not open the widget shortcut. Open your footprint from the journal.');}
  finally{reading=false;}
 }
 return {flush,async start(){
  if(!plugin||started)return;started=true;
  try{listener=await plugin.addListener('launchAvailable',read);await read();}catch{onError('Widget shortcuts are unavailable.');}
 },async stop(){await listener?.remove();started=false;pending=null;}};
}
