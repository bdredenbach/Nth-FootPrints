import {hasLocation} from './atlas.js';
import {createMapBackground} from './map-background.js';
export function createPlacesMap({container,L,offlineMaps,pinHTML='●',onPick=()=>{},onMove=()=>{},onStatus=()=>{},document=globalThis.document,events=globalThis.window,network=globalThis.navigator}){
 let map=null,background=null,layer=null,visible=false,selected=null,markers=new Map(),alive=true,pendingArea=null,areaLayer=null,framing=false;
 function init(){
  if(map||!alive)return !!map;if(!L){container.textContent='The map could not open. Nearby places are still listed below.';return false;}
  container.replaceChildren();map=L.map(container,{scrollWheelZoom:false,worldCopyJump:false}).setView([20,0],2);layer=L.layerGroup().addTo(map);
  map.on('moveend',()=>{if(alive&&!framing)onMove(map.getCenter());});background=createMapBackground({map,L,offlineMaps,events,network,onStatus,readyMessage:'Move the map, then tap Search this area.'});return true;
 }
 function setVisible(value){visible=value;if(value&&init()){map.invalidateSize({pan:false});frameArea();background.setVisible(true);}else background?.setVisible(false);}
 function frameArea(){if(!visible||!pendingArea||!map)return;const {point,radius}=pendingArea;pendingArea=null;map.invalidateSize({pan:false});framing=true;map.fitBounds(L.latLng(point.lat,point.lng).toBounds(radius*2),{padding:[32,52],maxZoom:15,animate:false});framing=false;}
 function center(point,radius=2000){if(!hasLocation(point)||!init())return;pendingArea={point:{...point},radius};if(areaLayer)map.removeLayer(areaLayer);areaLayer=L.circle([point.lat,point.lng],{radius,interactive:false,color:'#9c7746',weight:1,fillOpacity:.035}).addTo(map);frameArea();}
 function select(id){selected=id;for(const [key,m]of markers){m.setZIndexOffset(key===id?1000:0);m.getElement()?.classList.toggle('is-selected',key===id);}}
 return {setVisible,center,getCenter(){if(!map)return null;const p=map.getCenter();return {lat:p.lat,lng:((p.lng+540)%360)-180};},update(rows){if(!visible||!init())return;layer.clearLayers();markers.clear();for(const r of rows){const face=document.createElement('span');face.className='atlas-pin-face';face.innerHTML=pinHTML;const icon=L.divIcon({html:face,className:'atlas-pin poi-pin',iconSize:[36,44],iconAnchor:[18,44]});const marker=L.marker([r.lat,r.lng],{icon,title:r.title,keyboard:true,autoPanOnFocus:true}).addTo(layer);marker.getElement()?.setAttribute('aria-label',`Explore ${r.title}`);marker.on('click',()=>{select(r.id);onPick(r.id);});markers.set(r.id,marker);}select(selected);},select,retry:()=>background?.retry(),destroy(){alive=false;background?.destroy();map?.remove();map=null;markers.clear();}};
}
