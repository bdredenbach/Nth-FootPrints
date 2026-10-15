import {filterRecords} from './model.js';
import {createPhotoPreview as widgetThumbnail} from './photo-preview.js';
export {widgetThumbnail};

// Mirror one small, derived preview. Original media stays in the journal.
export function widgetRecord(records){
 const r=filterRecords(records,{sort:'newest'})[0];
 return r?{id:r.id,title:r.title,visited:r.visited,sample:!r.photo&&!!r.sampleArt,source:r.photo??(r.sampleArt?`assets/${r.sampleArt}.svg`:null)}:null;
}
// Only latest and explicitly pinned footprints need a native copy.
export function widgetTargets(records,widgets=[]){
 const latest=widgetRecord(records),ids=new Set(widgets.map(w=>w.recordId).filter(Boolean));
 return {latest,selected:records.filter(r=>ids.has(r.id)).map(r=>widgetRecord([r]))};
}
export function createWidgetSync({plugin,thumbnail=widgetThumbnail,onStatus=()=>{}}={}){
 let pending=null,running=null,revision=0;const previews=new Map();
 async function drain(){
  let success=false;
  while(pending){
   const {records,version}=pending;pending=null;
   try{
    const widgets=plugin.getWidgets?(await plugin.getWidgets()).widgets:[];
    const {latest,selected}=widgetTargets(records,widgets);
    const targets=[...new Map([latest,...selected].filter(Boolean).map(r=>[r.id,r])).values()],mirrors=[];
    const sources=new Set(targets.map(r=>r.source).filter(Boolean));
    for(const source of previews.keys())if(!sources.has(source))previews.delete(source);
    for(const r of targets){
     if(version!==revision)break;
     let preview=null;
     if(r.source){
      if(previews.has(r.source))preview=previews.get(r.source);
      else{try{preview=await thumbnail(r.source);}catch{/* Keep the placeholder and retry next refresh. */}}
      if(preview){previews.delete(r.source);previews.set(r.source,preview);while(previews.size>32)previews.delete(previews.keys().next().value);}
     }
     mirrors.push({id:r.id,title:r.title,visited:r.visited,sample:r.sample,thumbnail:preview});
    }
    if(version!==revision)continue;
    await plugin.updateSnapshot({count:records.length,record:latest?mirrors.find(r=>r.id===latest.id):null,...(plugin.getWidgets?{records:mirrors}: {})});
    if(version!==revision)continue;
    success=true;onStatus('Widgets refreshed. Use Choose on a widget to select its footprint.');
   }catch{success=false;if(version===revision)onStatus('Your journal is saved. Widgets could not refresh; try Refresh widgets.');}
  }
  return success;
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
export function createWidgetPreferences({plugin,refresh=async()=>{},onState=()=>{},onStatus=()=>{}}={}){
 let widgets=[],busy=false,version=0,focusId=null;
 function emit(){onState({widgets:widgets.map(w=>({...w})),busy,focusId});}
 async function load(id=null){
  focusId=id;if(busy){emit();return;}
  const request=++version;busy=true;emit();
  try{widgets=(await plugin.getWidgets()).widgets;if(request!==version)return;if(focusId&&!widgets.some(w=>w.widgetId===focusId))onStatus('That widget has been removed. Add a new home-screen widget.');}
  catch{widgets=[];onStatus('Could not load your widgets. Try Refresh widgets.');}
  finally{if(request===version){busy=false;emit();}}
 }
 return {load,async select(widgetId,recordId){
  if(busy)return;busy=true;emit();
  try{await plugin.setSelection({widgetId,recordId:recordId||null});const refreshed=await refresh();onStatus(refreshed===false?'Choice saved. Preview could not refresh; try Refresh widgets.':'Widget choice saved.');}
  catch(error){onStatus(error.message||'Could not save the widget choice. Try again.');}
  finally{busy=false;await load(focusId);}
 }};
}
export function createWidgetLaunch({plugin,canOpen=()=>true,openFootprint,newFootprint,openJournal=()=>{},configureWidget=()=>{},onError=()=>{}}={}){
 let pending=null,reading=false,again=false,started=false,listener;
 function flush(){if(!pending||!canOpen(pending))return;const action=pending;pending=null;try{const result=action.action==='new'?newFootprint():action.action==='journal'?openJournal():action.action==='configure'?configureWidget(action.widgetId):openFootprint(action.id);Promise.resolve(result).catch(()=>onError('Could not open the widget shortcut. Open your footprint from the journal.'));}catch{onError('Could not open the widget shortcut. Open your footprint from the journal.');}}
 async function read(){
  if(reading){again=true;return;}reading=true;
  try{do{
   again=false;const action=await plugin.takeLaunchAction();
   if((action?.action==='configure'&&Number.isSafeInteger(action.widgetId)&&action.widgetId>0)||['new','journal'].includes(action?.action)||(action?.action==='open'&&typeof action.id==='string'&&/^[a-z0-9_-]{1,100}$/i.test(action.id)))pending=action;
   flush();
  }while(again);}catch{onError('Could not open the widget shortcut. Open your footprint from the journal.');}
  finally{reading=false;}
 }
 return {flush,async start(){
  if(!plugin||started)return;started=true;
  try{listener=await plugin.addListener('launchAvailable',read);await read();}catch{onError('Widget shortcuts are unavailable.');}
 },async stop(){await listener?.remove();started=false;pending=null;}};
}
