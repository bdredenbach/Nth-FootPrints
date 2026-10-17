import {OFFLINE_CREDIT} from './offline-maps.js';
export const TILE_URL='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_OPTIONS={maxZoom:19,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:0,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'};
export function createLocalTileLayer({L,offlineMaps,document=globalThis.document,urls=globalThis.URL}){
 const Layer=L.GridLayer.extend({
  createTile(coords,done){
   const tile=document.createElement('div');tile.className='offline-tile';tile._released=false;
   const missing=()=>{tile.classList.add('offline-tile-missing');done(null,tile);};
   async function load(){
    // Missing detail can use an available overview within the saved bounds.
    // Limit enlargement to eight levels and never borrow a distant area's overview.
    const nRequest=2**coords.z,point={lat:Math.atan(Math.sinh(Math.PI*(1-2*(coords.y+.5)/nRequest)))*180/Math.PI,lng:(((coords.x+.5)/nRequest*360)%360+360)%360-180};
    for(let z=coords.z;z>=Math.max(0,coords.z-8);z--){
     const scale=2**(coords.z-z),n=2**z,x=Math.floor(coords.x/scale),y=Math.floor(coords.y/scale);
     const blob=await offlineMaps.tile(`${z}/${((x%n)+n)%n}/${y}`,z<coords.z?{point}:undefined);
     if(tile._released)return;if(!blob)continue;
     const image=document.createElement('img'),url=urls.createObjectURL(blob);tile._blobURL=url;tile._image=image;image.alt='';
     image.style.cssText=`position:absolute;max-width:none;width:${256*scale}px;height:${256*scale}px;left:${-((coords.x%scale+scale)%scale)*256}px;top:${-((coords.y%scale+scale)%scale)*256}px;`;
     image.onload=()=>{if(!tile._released)done(null,tile);};image.onerror=()=>{urls.revokeObjectURL(url);tile._blobURL=null;if(!tile._released)missing();};image.src=url;tile.append(image);return;
    }
    if(!tile._released)missing();
   }
   load().catch(()=>{if(!tile._released)missing();});return tile;
  }
 });
 const layer=new Layer({maxZoom:19,maxNativeZoom:15,minNativeZoom:0,keepBuffer:0,updateWhenIdle:true,updateWhenZooming:false,attribution:OFFLINE_CREDIT});
 layer.on('tileunload',({tile})=>{tile._released=true;if(tile._image)tile._image.onload=tile._image.onerror=null;if(tile._blobURL){urls.revokeObjectURL(tile._blobURL);tile._blobURL=null;}});return layer;
}
export function createMapBackground({map,L,offlineMaps,onStatus=()=>{},events=globalThis.window,network=globalThis.navigator,readyMessage='Tap a pin to open its footprint.'}){
 let active=true,visible=false,failures=0,local=null,localMode=false;
 const online=()=>network?.onLine!==false;
 const tiles=L.tileLayer(TILE_URL,{...TILE_OPTIONS});
 const status=(state,message)=>{if(active&&visible)onStatus({state,message});};
 tiles.on('loading',()=>{if(!localMode){failures=0;status('loading','Loading the map…');}});
 tiles.on('tileerror',()=>{if(!localMode){failures++;status('error','The map background could not load. Your saved places are still available.');}});
 tiles.on('load',()=>{if(!localMode&&!failures&&online())status('ready',readyMessage);});
 function detach(layer){if(layer&&map.hasLayer(layer))map.removeLayer(layer);}
 function connect(){
  if(!active||!visible)return;
  localMode=!!offlineMaps&&(!online()||offlineMaps.preferred);
  if(localMode){detach(tiles);local??=createLocalTileLayer({L,offlineMaps});if(!map.hasLayer(local))local.addTo(map);else local.redraw();status('downloaded','Downloaded USGS map · available detail only. Missing detail uses a saved overview; hatched areas have no saved coverage.');return;}
  detach(local);
  if(!online()){detach(tiles);status('offline','Offline. Your saved pins and places are available; download a map area before going offline.');return;}
  if(!map.hasLayer(tiles)){failures=0;status('loading','Loading the map…');tiles.addTo(map);}
 }
 const changed=state=>{if(state.phase==='idle')connect();};
 const unsubscribe=offlineMaps?.subscribe(changed);
 events?.addEventListener('offline',connect);events?.addEventListener('online',connect);
 return {setVisible(value){visible=value;if(value)connect();else{detach(tiles);detach(local);}},retry(){if(!active||!visible)return;const attached=map.hasLayer(tiles);failures=0;connect();if(!localMode&&online()&&attached)tiles.redraw();},destroy(){active=false;unsubscribe?.();events?.removeEventListener('offline',connect);events?.removeEventListener('online',connect);detach(tiles);detach(local);}};
}
