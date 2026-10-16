import {placeView,visitsOf} from './visits.js';
const KEY='nth-nearby-memories-v1';
export function proximityKm(a,b){const rad=Math.PI/180,dlat=(b.lat-a.lat)*rad,dlng=(b.lng-a.lng)*rad,h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlng/2)**2;return 6371.0088*2*Math.asin(Math.sqrt(Math.max(0,Math.min(1,h))));}
export function nearbyCandidates(records,position,{radius=500,today,cooldowns={},now=Date.now()}={}){
 const c=position?.coords;if(!c||![c.latitude,c.longitude,c.accuracy].every(Number.isFinite)||Math.abs(c.latitude)>90||Math.abs(c.longitude)>180||c.accuracy<0||c.accuracy>Math.max(200,radius))return [];
 const origin={lat:c.latitude,lng:c.longitude};return records.flatMap(record=>{const point=placeView(record);if(!Number.isFinite(point.lat)||!Number.isFinite(point.lng)||cooldowns[record.id]>now)return [];const visit=visitsOf(record).find(v=>v.visited<today);if(!visit)return [];const metres=proximityKm(origin,point)*1000;return metres<=radius?[{record,visit,metres}]:[];}).sort((a,b)=>a.metres-b.metres||a.record.id.localeCompare(b.record.id));
}
export function createNearbyMemories({watch,getRecords,today,storage=globalThis.localStorage,now=Date.now,onMatch=()=>{},onState=()=>{}}={}){
 let prefs={enabled:false,radius:500,cooldowns:Object.create(null)},cleanup=null,starting=null,stopping=null,generation=0,paused=false,alive=true,status='Nearby memories are off.',lastCheck=0;
 try{const saved=JSON.parse(storage.getItem(KEY)??'null');if(saved&&typeof saved.enabled==='boolean'&&[250,500,1000].includes(saved.radius)){prefs={enabled:saved.enabled,radius:saved.radius,cooldowns:Object.create(null)};for(const [id,time]of Object.entries(saved.cooldowns??{}).slice(-512))if(/^[a-z0-9_-]{1,100}$/i.test(id)&&Number.isFinite(time)&&time>now())prefs.cooldowns[id]=Math.min(time,now()+86400000);}}catch{/* Missing preferences default to off. */}
 const emit=()=>onState({enabled:prefs.enabled,radius:prefs.radius,status,watching:!!cleanup,paused});
 function persist(){storage.setItem(KEY,JSON.stringify(prefs));}
 async function stop(){if(stopping)return stopping;const old=cleanup;if(!old)return;stopping=Promise.resolve().then(old).then(()=>{if(cleanup===old)cleanup=null;}).finally(()=>{stopping=null;});return stopping;}
 async function start(request=false){
  if(!alive||!prefs.enabled||paused)return;if(stopping){try{await stopping;}catch{return;}return start(request);}if(starting)return starting;if(cleanup)return;
  const token=++generation;status='Waiting for a location while FootPrints is open…';emit();
  starting=(async()=>{try{const remove=await watch(position=>{
   if(token!==generation||paused||!prefs.enabled||!alive)return;const instant=now();if(lastCheck&&instant-lastCheck<30000)return;lastCheck=instant;
   const accuracy=position?.coords?.accuracy;if(!Number.isFinite(accuracy)||accuracy>Math.max(200,prefs.radius)){status='Location is approximate. Waiting for a closer fix.';emit();return;}
   const candidate=nearbyCandidates(getRecords(),position,{radius:prefs.radius,today:today(),cooldowns:prefs.cooldowns,now:instant})[0];status='Checking nearby saved places while the app is open.';
   if(candidate){prefs.cooldowns[candidate.record.id]=instant+86400000;const rows=Object.entries(prefs.cooldowns).filter(([,t])=>t>instant).slice(-512);prefs.cooldowns=Object.assign(Object.create(null),Object.fromEntries(rows));try{persist();}catch{status='Reminder shown; its cooldown could not be saved.';}onMatch(candidate);}emit();
  },error=>{if(token!==generation)return;status='Location unavailable. Check permission and device Location, then enable nearby memories again.';prefs.enabled=false;try{persist();}catch{}generation++;void stop().catch(()=>{status='Could not stop the location watch. Close FootPrints and reopen it.';emit();});emit();},{request});
   if(token!==generation||paused||!prefs.enabled||!alive)await remove();else cleanup=remove;
  }catch(error){if(token===generation){prefs.enabled=false;status=error.message||'Nearby memories could not start. Enable them again to retry.';try{persist();}catch{}}}finally{starting=null;emit();if(alive&&!paused&&prefs.enabled&&token!==generation&&!cleanup)void start(false);}})();return starting;
 }
 const api={get state(){return {...prefs,status,watching:!!cleanup,paused};},async enable(radius=prefs.radius){if(![250,500,1000].includes(radius))throw Error('Choose a nearby distance.');prefs={...prefs,enabled:true,radius};try{persist();}catch(error){prefs.enabled=false;status='Nearby preferences could not be saved.';emit();throw error;}lastCheck=0;await start(true);emit();},async disable(){prefs.enabled=false;generation++;status='Nearby memories are off.';try{persist();}catch{status='Nearby memories are off for this session; preferences could not be saved.';}try{await stop();}catch{status='Could not stop the location watch. Close FootPrints and reopen it.';}emit();},async pause(){paused=true;generation++;try{await stop();}catch{status='Could not stop the location watch. Close FootPrints and reopen it.';}emit();},async resume(){paused=false;lastCheck=0;await start(false);emit();},snooze(id){prefs.cooldowns[id]=now()+86400000;persist();},async destroy(){alive=false;await api.pause();},refresh:emit};
 return api;
}
