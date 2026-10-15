import {hasLocation,TILE_URL,TILE_OPTIONS} from './atlas.js';

export function mapPosition(point){
 if(typeof point?.lat!=='number'||!Number.isFinite(point.lat)||Math.abs(point.lat)>90||typeof point?.lng!=='number'||!Number.isFinite(point.lng))return null;
 return {lat:point.lat,lng:((point.lng+180)%360+360)%360-180};
}
export function distanceKm(a,b){
 if(!hasLocation(a)||!hasLocation(b))return null;
 const rad=Math.PI/180,dlat=(b.lat-a.lat)*rad,dlng=(b.lng-a.lng)*rad;
 const h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlng/2)**2;
 return 6371.0088*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
}
export function nearestPlaces(records,origin){
 if(!hasLocation(origin))return [];
 return records.filter(hasLocation).map(record=>({record,km:distanceKm(origin,record)})).sort((a,b)=>a.km-b.km||a.record.id.localeCompare(b.record.id));
}
export function distanceLabel(km){
 return km<1?`${Math.round(km*1000)} m`:`${new Intl.NumberFormat(undefined,{maximumFractionDigits:1}).format(km)} km`;
}

// A location request can finish after a view closes or the user clears it.
// Keep those results from changing the current screen or saved data.
export function createNearbyLookup({locate,onChange=()=>{},onStatus=()=>{},onBusy=()=>{}}){
 let token=0,origin=null;
 return {
  async refresh(){
   const request=++token;onBusy(true);onStatus('Finding your current location…');
   try{
    const p=await locate();if(request!==token)return;
    const next={lat:p.coords.latitude,lng:p.coords.longitude};
    if(!hasLocation(next))throw Error('Invalid location');
    origin=next;onChange(origin);onStatus(`Nearest saved places · straight-line distances · GPS accuracy about ${Math.round(p.coords.accuracy)} m.`);
   }catch{
    if(request===token)onStatus('Could not get your location. Allow Location access and turn on device Location, then try again.');
   }finally{if(request===token)onBusy(false);}
  },
  clear(){token++;origin=null;onBusy(false);onChange(null);onStatus('Places are shown in your selected visit, name or rating order.');},
  cancel(){token++;onBusy(false);},
  getOrigin:()=>origin
 };
}

export function createPositionPicker({container,L,initial,onChange=()=>{},onStatus=()=>{},events=globalThis.window,network=globalThis.navigator,frame=cb=>requestAnimationFrame(cb)}){
 let map=null,tiles=null,active=true,interacted=false,failures=0;
 let candidate=hasLocation(initial)?{lat:initial.lat,lng:initial.lng}:null;
 const online=()=>network?.onLine!==false;
 const status=(state,message)=>{if(active)onStatus({state,message});};
 function connect(){
  if(!active||!map)return;
  if(!online()){if(map.hasLayer(tiles))map.removeLayer(tiles);status('offline','Offline. You can adjust coordinates, but the map background needs a connection.');return;}
  if(!map.hasLayer(tiles)){failures=0;status('loading','Loading the map…');tiles.addTo(map);}
 }
 function changed(){onChange(candidate?{...candidate}:null);}
 function readCenter(){candidate=mapPosition(map.getCenter());changed();}
 if(!L){status('unavailable','The map could not open. Close this dialog and enter coordinates manually.');onChange(null);return {getPosition:()=>null,setPosition:()=>false,retry(){},destroy(){active=false;}};}
 container.replaceChildren();
 map=L.map(container,{scrollWheelZoom:false,worldCopyJump:false}).setView(candidate?[candidate.lat,candidate.lng]:[20,0],candidate?15:2);
 tiles=L.tileLayer(TILE_URL,{...TILE_OPTIONS});
 tiles.on('loading',()=>{if(active){failures=0;status('loading','Loading the map…');}});
 tiles.on('tileerror',()=>{if(active){failures++;status('error','The map background could not load. Retry, or close and enter coordinates manually.');}});
 tiles.on('load',()=>{if(active&&!failures&&online())status('ready','Move the map beneath the pin, or tap a spot. Then choose Use this spot.');});
 map.on('movestart',()=>{interacted=true;});
 map.on('moveend',()=>{if(interacted&&active)readCenter();});
 function setPosition(position){
  if(!active)return false;const point=mapPosition(position);if(!point)return false;
  candidate=point;map.setView([point.lat,point.lng],Math.max(13,map.getZoom()),{animate:false});changed();return true;
 }
 map.on('click',e=>setPosition(e.latlng));
 const offline=()=>connect(),onlineEvent=()=>connect();
 events?.addEventListener('offline',offline);events?.addEventListener('online',onlineEvent);
 changed();frame(()=>{if(active){map.invalidateSize({pan:false});connect();}});
 return {getPosition:()=>candidate?{...candidate}:null,setPosition,
  retry(){if(!active)return;failures=0;const attached=map.hasLayer(tiles);connect();if(online()&&attached)tiles.redraw();},
  destroy(){if(!active)return;active=false;events?.removeEventListener('offline',offline);events?.removeEventListener('online',onlineEvent);map.remove();candidate=null;}
 };
}
