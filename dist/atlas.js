import {createPinPreviews} from './pin-previews.js';
import {createMapBackground} from './map-background.js';
export {TILE_URL,TILE_OPTIONS} from './map-background.js';
export function hasLocation(place){
 return typeof place?.lat==='number'&&Number.isFinite(place.lat)&&Math.abs(place.lat)<=90&&
  typeof place?.lng==='number'&&Number.isFinite(place.lng)&&Math.abs(place.lng)<=180;
}

// Choose the shortest longitude arc, so a journey crossing the date line
// stays together. Only display positions change; saved coordinates do not.
export function atlasPoints(records){
 const places=records.filter(hasLocation);if(!places.length)return [];
 const normalize=lng=>((lng%360)+360)%360;
 const longitudes=places.map(r=>normalize(r.lng)).sort((a,b)=>a-b);
 let gap=-1,start=longitudes[0];
 for(let i=0;i<longitudes.length;i++){
  const next=i+1<longitudes.length?longitudes[i+1]:longitudes[0]+360;
  if(next-longitudes[i]>gap){gap=next-longitudes[i];start=next%360;}
 }
 const values=places.map(r=>{const n=normalize(r.lng);return n<start?n+360:n;});
 const center=(Math.min(...values)+Math.max(...values))/2,shift=360*Math.floor((center+180)/360);
 return places.map((record,i)=>({record,lat:record.lat,lng:values[i]-shift}));
}

export function createAtlas({container,L,onPick=()=>{},onStatus=()=>{},pinHTML='●',thumbnail,offlineMaps,preview=false,document=globalThis.document,events=globalThis.window,network=globalThis.navigator,frame=cb=>requestAnimationFrame(cb)}){
 let map=null,background=null,layer=null,points=[],selected=null,visible=true,spatialKey='',viewportRequest=0;
 const markers=new Map(),faces=new Map();
 const previews=createPinPreviews({thumbnail,onPreview:(id,source)=>{
  const face=faces.get(id);if(!map||!visible||!face)return;
  if(face.children[0]?.src===source)return;
  const photo=document.createElement('img');photo.className='atlas-pin-photo';photo.alt='';photo.draggable=false;photo.decoding='async';
  photo.onerror=()=>{if(faces.get(id)===face&&face.children[0]===photo)face.innerHTML=pinHTML;};photo.src=source;face.replaceChildren(photo);
 }});
 function syncPreviews(){
  if(!map||!visible||!faces.size)return;
  const bounds=map.getBounds?.();
  const inView=points.filter(p=>!bounds||bounds.contains([p.lat,p.lng])).map(p=>p.record.id);
  previews.sync(points.map(p=>p.record),inView);
 }
 const status=(state,message)=>onStatus({state,message});
 function message(text){const p=document.createElement('p');p.className='map-placeholder';p.textContent=text;container.replaceChildren(p);}
 function connect(){background?.setVisible(visible);}
 function init(){
  if(map)return true;
  if(!L){message('The map could not open. Your places are still listed below.');status('unavailable','Reload the app to try the map again.');return false;}
  container.replaceChildren();
  map=L.map(container,{scrollWheelZoom:false,worldCopyJump:false,...(preview?{zoomControl:false,dragging:false,touchZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false}:{} )}).setView([20,0],2);
  layer=L.layerGroup().addTo(map);
  map.on?.('moveend',syncPreviews);
  background=createMapBackground({map,L,offlineMaps,events,network,onStatus,readyMessage:'Tap a pin to open its footprint. Directions open in your map app or browser.'});
  return true;
 }
 function fitAll(){
  if(!map||!points.length)return;
  if(points.length===1)map.setView([points[0].lat,points[0].lng],13,{animate:false});
  else map.fitBounds(points.map(p=>[p.lat,p.lng]),{padding:[38,38],maxZoom:14,animate:false});
 }
 function select(id,{focus=false}={}){
  const point=points.find(p=>p.record.id===id);selected=point?id:null;
  for(const [key,marker]of markers){marker.setZIndexOffset(key===selected?1000:0);marker.getElement()?.classList.toggle('is-selected',key===selected);}
  if(focus&&map&&point){viewportRequest++;map.setView([point.lat,point.lng],Math.max(13,map.getZoom()),{animate:false});}
  return !!point;
 }
 function update(records,{selectedId=null}={}){
  previews.pause();
  points=atlasPoints(records);visible=true;
  if(!points.length&&!offlineMaps?.areas.length){
   background?.destroy();background=null;map?.remove();map=null;layer=null;markers.clear();faces.clear();previews.sync([]);spatialKey='';
   message(records.length?'Add a location to a footprint to put it on the map.':'No places in this view. Try another search or category.');
   status('empty',records.length?'Places without coordinates are listed below. Choose one to add its location.':'No footprints match the current view.');return;
  }
  if(!init())return;
  const key=JSON.stringify(points.map(p=>[p.record.id,p.lat,p.lng]).sort((a,b)=>a[0].localeCompare(b[0]))),changed=key!==spatialKey;spatialKey=key;
  layer.clearLayers();markers.clear();faces.clear();
  for(const point of points){
   const r=point.record,face=document.createElement('span');
   face.className='atlas-pin-face';face.innerHTML=pinHTML;faces.set(r.id,face);
   const icon=L.divIcon({html:face,className:'atlas-pin',iconSize:[44,52],iconAnchor:[22,52]});
   const marker=L.marker([point.lat,point.lng],{icon,title:r.title,keyboard:!preview,interactive:!preview,autoPanOnFocus:!preview}).addTo(layer);
   if(!preview)marker.getElement()?.setAttribute('aria-label',`Open footprint: ${r.title}`);
   marker.on('click',()=>{select(r.id);onPick(r.id);});markers.set(r.id,marker);
  }
  select(selectedId);
  const instance=map,request=viewportRequest;
  frame(()=>{if(map!==instance||!visible)return;map.invalidateSize({pan:false});if(changed&&request===viewportRequest)fitAll();connect();syncPreviews();});
 }
 function setVisible(value){visible=value;if(!value){background?.setVisible(false);previews.pause();}else if(map){map.invalidateSize({pan:false});connect();syncPreviews();}}
 function retry(){background?.retry();}
 function showArea(area){if(!init())return;viewportRequest++;visible=true;map.setView([area.center.lat,area.center.lng],Math.min(13,area.availableMaxZoom??area.maxZoom),{animate:false});map.invalidateSize({pan:false});connect();syncPreviews();}
 return {update,select,fitAll,showArea,setVisible,retry,previewsIdle:()=>previews.idle(),destroy(){previews.destroy();background?.destroy();map?.remove();map=null;markers.clear();faces.clear();}};
}
