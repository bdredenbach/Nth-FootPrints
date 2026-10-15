import test from 'node:test';
import assert from 'node:assert/strict';
import {atlasPoints,hasLocation,createAtlas} from '../dist/atlas.js';
import {filterRecords} from '../dist/model.js';

const place=(id,lat,lng,extra={})=>({id,title:id,lat,lng,category:'Travel',favorite:false,visited:'2026-10-15',updatedAt:'2026-10-15T12:00:00Z',...extra});
test('only valid coordinate pairs become pins; zero is a real location',()=>{
 assert.equal(hasLocation(place('zero',0,0)),true);assert.equal(hasLocation(place('edge',90,-180)),true);
 for(const [lat,lng]of [[null,null],[null,2],[1,null],[NaN,1],[1,Infinity],[91,0],[0,-181],['0',0]])assert.equal(hasLocation(place('bad',lat,lng)),false);
 assert.deepEqual(atlasPoints([place('missing',null,null),place('zero',0,0)]).map(p=>p.record.id),['zero']);
});
test('date-line journeys use the short arc without changing saved coordinates or order',()=>{
 const records=[place('east',1,179.5),place('west',2,-179.7)],before=structuredClone(records),points=atlasPoints(records);
 assert.ok(Math.abs(points[0].lng-points[1].lng)<1);assert.deepEqual(records,before);assert.deepEqual(points.map(p=>p.record.id),['east','west']);
 for(const p of points)assert.ok(Math.abs((p.lng-p.record.lng)/360-Math.round((p.lng-p.record.lng)/360))<1e-8);
});
test('ordinary trips and separate footprints at one coordinate are retained',()=>{
 const records=[place('oregon',45,-123),place('new-york',43,-74),place('same-site',43,-74)];
 const points=atlasPoints(records);assert.deepEqual(points.map(p=>p.lng),[-123,-74,-74]);assert.equal(points.length,3);assert.deepEqual(atlasPoints([]),[]);
});

function element(){
 return {children:[],attributes:{},classes:new Set(),innerHTML:'',textContent:'',className:'',
  replaceChildren(...items){this.children=items;},append(item){this.children.push(item);},
  setAttribute(k,v){this.attributes[k]=v;},classList:{toggle(){}}
 };
}
function fixture({thumbnail}={}){
 const container=element(),statuses=[],picked=[],handlers={},network={onLine:true},state={maps:[],tiles:[],groups:[]};
 const events={addEventListener:(n,f)=>{handlers[n]=f;},removeEventListener:(n,f)=>{if(handlers[n]===f)delete handlers[n];}};
 const L={
  map(){const m={layers:new Set(),views:[],bounds:[],zoom:2,invalidations:0,removed:false,handlers:{},inView:()=>true,
   on(name,fn){this.handlers[name]=fn;return this;},getBounds(){return {contains:this.inView};},
   setView(point,zoom){this.views.push({point,zoom});this.zoom=zoom;return this;},
   getZoom(){return this.zoom;},fitBounds(points,options){this.bounds.push({points,options});return this;},
   hasLayer(layer){return this.layers.has(layer);},removeLayer(layer){this.layers.delete(layer);return this;},
   invalidateSize(){this.invalidations++;},remove(){this.removed=true;this.layers.clear();}
  };state.maps.push(m);return m;},
  layerGroup(){const g={members:[],addTo(map){map.layers.add(this);return this;},clearLayers(){this.members=[];}};state.groups.push(g);return g;},
  tileLayer(url,options){const t={url,options,handlers:{},redraws:0,addTo(map){map.layers.add(this);return this;},on(n,f){this.handlers[n]=f;return this;},redraw(){this.redraws++;return this;}};state.tiles.push(t);return t;},
  divIcon:options=>options,
  marker(position,options){return{position,options,element:element(),handlers:{},z:0,
   addTo(group){group.members.push(this);return this;},on(n,f){this.handlers[n]=f;return this;},
   getElement(){return this.element;},setZIndexOffset(z){this.z=z;return this;}
  };}
 };
 const atlas=createAtlas({container,L,thumbnail,document:{createElement:element},events,network,frame:cb=>cb(),pinHTML:'<svg>trusted mark</svg>',onPick:id=>picked.push(id),onStatus:s=>statuses.push(s)});
 return{atlas,container,statuses,picked,handlers,network,state};
}
test('atlas fits every located footprint, keeps attribution, and pin activation opens the right place',()=>{
 const f=fixture();f.atlas.update([place('first',43,-74),place('second',45,-123),place('missing',null,null)]);
 assert.equal(f.state.groups[0].members.length,2);assert.equal(f.state.maps[0].bounds[0].points.length,2);
 const tile=f.state.tiles[0];assert.equal(tile.url,'https://tile.openstreetmap.org/{z}/{x}/{y}.png');assert.match(tile.options.attribution,/OpenStreetMap/);assert.equal(tile.options.keepBuffer,0);
 const marker=f.state.groups[0].members[1];marker.handlers.click();assert.deepEqual(f.picked,['second']);assert.equal(marker.z,1000);assert.equal(marker.element.attributes['aria-label'],'Open footprint: second');
});
test('filtering removes old pins, one place uses a street view, and empty results remove the map',()=>{
 const f=fixture(),records=[place('a',43,-74),place('b',45,-123,{category:'Nature'})];f.atlas.update(records);
 f.atlas.update(filterRecords(records,{category:'Nature'}));assert.equal(f.state.groups[0].members.length,1);assert.deepEqual(f.state.maps[0].views.at(-1),{point:[45,-123],zoom:13});
 f.atlas.update([]);assert.equal(f.state.maps[0].removed,true);assert.equal(f.statuses.at(-1).state,'empty');assert.match(f.container.children[0].textContent,/No places/);
});
test('selection can focus any pin, including overlapping places; unrelated edits keep the viewport',()=>{
 const f=fixture(),records=[place('a',0,0),place('b',0,0)];f.atlas.update(records);const map=f.state.maps[0];
 f.atlas.select('a',{focus:true});assert.equal(f.state.groups[0].members[0].z,1000);assert.equal(f.state.groups[0].members[1].z,0);
 const fits=map.bounds.length;f.atlas.update(records.map(r=>({...r,title:'edited title',favorite:true})),{selectedId:'a'});assert.equal(map.bounds.length,fits);
 f.atlas.fitAll();assert.equal(map.bounds.length,fits+1);assert.equal(f.atlas.select('missing'),false);
});
test('offline and hidden maps make no background tile requests while retaining pins',()=>{
 const f=fixture();f.network.onLine=false;f.atlas.update([place('a',0,0)]);const map=f.state.maps[0],tiles=f.state.tiles[0];
 assert.equal(map.hasLayer(tiles),false);assert.equal(f.state.groups[0].members.length,1);assert.equal(f.statuses.at(-1).state,'offline');
 f.network.onLine=true;f.handlers.online();assert.equal(map.hasLayer(tiles),true);
 f.atlas.setVisible(false);assert.equal(map.hasLayer(tiles),false);const redraws=tiles.redraws;f.handlers.online();assert.equal(tiles.redraws,redraws);
 f.atlas.setVisible(true);assert.equal(map.hasLayer(tiles),true);
});
test('tile failures remain visible until retry; destroying detaches listeners and ignores old callbacks',()=>{
 const f=fixture();f.atlas.update([place('a',43,-74)]);const tile=f.state.tiles[0];
 tile.handlers.tileerror();tile.handlers.load();assert.equal(f.statuses.at(-1).state,'error');
 f.atlas.retry();tile.handlers.load();assert.equal(f.statuses.at(-1).state,'ready');
 f.atlas.destroy();const count=f.statuses.length;tile.handlers.load();assert.equal(f.statuses.length,count);assert.deepEqual(Object.keys(f.handlers),[]);
});
test('place titles stay in accessible attributes and never become map icon HTML',()=>{
 const f=fixture(),title='<img src=x onerror=alert(1)>';f.atlas.update([place('a',0,0,{title})]);const m=f.state.groups[0].members[0];
 assert.equal(m.element.attributes['aria-label'],'Open footprint: '+title);assert.equal(m.options.icon.html.innerHTML,'<svg>trusted mark</svg>');
});
test('photo pins use bounded selected-cover previews and keep memory selection/accessibility intact',async()=>{
 const calls=[],original='data:image/png;base64,AQID',selected='data:image/jpeg;base64,BAUG',small='data:image/jpeg;base64,BwgJ';
 const f=fixture({thumbnail:async source=>{calls.push(source);return small;}});
 f.atlas.update([place('photo',43,-74,{photo:original,photos:[original,selected],coverIndex:1,title:'<b>Photo</b>'}),place('no-photo',44,-75)]);
 await f.atlas.previewsIdle();assert.deepEqual(calls,[selected]);
 const [photo,empty]=f.state.groups[0].members,face=photo.options.icon.html,image=face.children[0];
 assert.equal(image.src,small);assert.equal(image.alt,'');assert.equal(image.draggable,false);assert.equal(empty.options.icon.html.children.length,0);
 assert.equal(photo.element.attributes['aria-label'],'Open footprint: <b>Photo</b>');photo.handlers.click();assert.deepEqual(f.picked,['photo']);assert.equal(photo.z,1000);
 image.onerror();assert.equal(face.innerHTML,'<svg>trusted mark</svg>');
});
test('map movement hydrates only new visible photo pins and preserves the viewport on cover changes',async()=>{
 const calls=[],photo='data:image/png;base64,AQID',next='data:image/png;base64,BAUG',small='data:image/jpeg;base64,BwgJ';
 const f=fixture({thumbnail:async source=>{calls.push(source);return small;}});
 f.atlas.update([place('a',0,0)]);const map=f.state.maps[0];map.inView=point=>point[0]===0;
 f.atlas.update([place('a',0,0,{photo}),place('b',10,10,{photo:next})]);await f.atlas.previewsIdle();assert.deepEqual(calls,[photo]);
 map.inView=point=>point[0]===10;map.handlers.moveend();await f.atlas.previewsIdle();assert.deepEqual(calls,[photo,next]);
 const fits=map.bounds.length;map.inView=()=>true;f.atlas.update([place('a',0,0,{photo:next}),place('b',10,10,{photo:next})]);await f.atlas.previewsIdle();assert.equal(map.bounds.length,fits);
 f.atlas.setVisible(false);f.atlas.destroy();
});
