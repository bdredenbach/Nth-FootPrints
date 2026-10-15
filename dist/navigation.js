const TAG='nth-footprints-navigation';
const views=new Set(['journal','map','favorites']);
export function navigationRoute(route){
 const view=views.has(route?.view)?route.view:'journal',dialogs=[];
 const allowed=new Set(['details','editor','pin-picker','backup','settings','roadmap']);
 for(const item of Array.isArray(route?.dialogs)?route.dialogs:[]){
  if(!allowed.has(item?.id)||dialogs.some(d=>d.id===item.id))break;
  if(item.id==='details'&&!/^[a-z0-9_-]{1,100}$/i.test(item.recordId??''))break;
  if(item.id==='editor'&&item.recordId!=null&&!/^[a-z0-9_-]{1,100}$/i.test(item.recordId))break;
  if(item.id==='pin-picker'&&dialogs.at(-1)?.id!=='editor')break;
  dialogs.push({id:item.id,...(['details','editor'].includes(item.id)?{recordId:item.recordId??null}:{})});
 }
 return {view,dialogs};
}
export function createNavigation({history,location,events,apply=()=>{},canLeave=()=>true,onRoot=()=>{},onError=()=>{},onSettled=()=>{},session=String(Date.now())+Math.random()}={}){
 let current=null,busy=false,approved=null,bounce=null,applying=false,started=false,waiters=[],pendingPop=null;
 const idle=()=>busy?new Promise(resolve=>waiters.push(resolve)):Promise.resolve();
 function settled(){if(pendingPop){const event=pendingPop;pendingPop=null;void popped(event);return;}busy=false;for(const resolve of waiters)resolve();waiters=[];onSettled();}
 const entry=(index,route)=>({tag:TAG,session,index,route:navigationRoute(route)});
 const owns=value=>value?.tag===TAG&&value.session===session&&Number.isInteger(value.index)&&value.index>=0;
 const write=(method,value)=>history[method](value,'','#'+value.route.view);
 async function render(next,previous){applying=true;try{await apply(next,previous);}finally{applying=false;}}
 async function popped(event){
  const value=event.state;
  if(bounce!==null){if(owns(value)&&value.index===bounce){bounce=null;settled();}return;}
  if(!owns(value))return;
  if(applying){pendingPop=event;return;}
  const target=entry(value.index,value.route),previous=current;
  if(!previous)return;
  const authorized=approved===target.index;approved=null;
  if(!authorized&&!canLeave(previous.route,target.route)){
   const delta=previous.index-target.index;
   if(delta){bounce=previous.index;busy=true;history.go(delta);}else{write('replaceState',previous);settled();}
   return;
  }
  current=target;busy=true;
  try{await render(target.route,previous.route);}catch(error){onError(error.message);}finally{settled();}
 }
 function start(initial='journal'){
  if(started)return;started=true;
  current=entry(0,{view:'journal',dialogs:[]});write('replaceState',current);
  if(views.has(initial)&&initial!=='journal'){current=entry(1,{view:initial,dialogs:[]});write('pushState',current);}
  events.addEventListener('popstate',popped);
 }
 function opened(dialog){
  if(!current||applying)return;
  const existing=current.route.dialogs.findIndex(d=>d.id===dialog.id);
  const dialogs=current.route.dialogs.slice();
  if(existing>=0){dialogs[existing]=dialog;current=entry(current.index,{...current.route,dialogs});write('replaceState',current);return;}
  current=entry(current.index+1,{...current.route,dialogs:[...dialogs,dialog]});write('pushState',current);
 }
 function back({force=false}={}){
  if(!current||busy)return true;
  const route=current.route;
  if(!route.dialogs.length&&route.view==='journal'){onRoot();return false;}
  const target=route.dialogs.length?{...route,dialogs:route.dialogs.slice(0,-1)}:{view:'journal',dialogs:[]};
  if(!force&&!canLeave(route,target))return true;
  approved=current.index-1;busy=true;history.back();return true;
 }
 async function view(next){
  if(!views.has(next)||!current||busy||current.route.dialogs.length)return;
  if(next===current.route.view)return;
  if(next==='journal'){back();await idle();return;}
  const previous=current.route,index=current.route.view==='journal'?current.index+1:current.index;
  current=entry(index,{view:next,dialogs:[]});write(previous.view==='journal'?'pushState':'replaceState',current);
  busy=true;try{await render(current.route,previous);}catch(error){onError(error.message);}finally{settled();}
 }
 return {start,opened,back,view,idle,get applying(){return applying;},get busy(){return busy;},route:()=>current?.route,
  replaceRoute(route){if(!current)return;current=entry(current.index,route);write('replaceState',current);},
  destroy(){events.removeEventListener('popstate',popped);started=false;}
 };
}
export async function bindNativeBack({plugin,navigation,onError=()=>{}}){
 if(!plugin)return null;
 try{return await plugin.addListener('backButton',()=>navigation.back());}
 catch{onError('Android Back navigation is unavailable. Use the on-screen controls.');return null;}
}
