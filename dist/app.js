import {APP,VERSION,CATEGORIES,MAX_BACKUP,validateRecord,validateSettings,parseBackup,mergeRecords,filterRecords} from './model.js';
import {bindVerticalDeck,wrappedIndex,dragTransform} from './deck.js';
import {readPhotoMetadata} from './geotags.js';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={footprint:'M15 21c-2 0-3-2-3-5 0-2 1-5 3-5s4 3 4 5c0 3-2 5-4 5Z M15 7c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2Z M9 10c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2Z M7 14c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2Z',stack:'M4 7 12 3l8 4-8 4-8-4Z M4 12l8 4 8-4 M4 17l8 4 8-4',list:'M9 6h12 M9 12h12 M9 18h12 M3 6h1 M3 12h1 M3 18h1',map:'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z M9 3v16 M15 5v16',heart:'M20 5c-2-2-5-2-8 1-3-3-6-3-8-1-3 3-1 6 1 8l7 7 7-7c2-2 4-5 1-8Z',archive:'M4 9h16v12H4V9Z M3 3h18v6H3V3Z M9 13h6',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M10 3h4l1 3 3 1 3 2v4l-3 1-1 3-2 4h-4l-1-3-3-1-4-2v-4l3-1 1-3 3-4Z',plus:'M12 5v14 M5 12h14',search:'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z M15 15l6 6',compass:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z m-6-3-2 4-4 2 2-4 4-2Z',arrowUp:'M12 19V5 M6 11l6-6 6 6',arrowDown:'M12 5v14 M6 13l6 6 6-6',arrowLeft:'M19 12H5 M11 6l-6 6 6 6',arrowRight:'M5 12h14 M13 6l6 6-6 6',location:'M19 10c0 6-7 11-7 11S5 16 5 10a7 7 0 0 1 14 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',close:'m6 6 12 12 M18 6 6 18',camera:'M3 7h4l2-3h6l2 3h4v14H3V7Z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',mic:'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Z M5 10v2a7 7 0 0 0 14 0v-2 M12 19v3 M8 22h8',download:'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4',edit:'m15 4 5 5-12 12H3v-5L15 4Z M12 7l5 5',external:'M14 3h7v7 M21 3 10 14 M10 3H3v18h18v-7',navigation:'m21 3-6 18-4-8-8-4L21 3Z',trash:'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7'};
const icon=(name)=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]??paths.compass}"/></svg>`;
function icons(root=document){root.querySelectorAll('[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon));}
let db,records=[],settings={theme:'paper'},view='journal',category='All places',query='',sort='newest',deckIndex=0,mapId=null,storageReady=false;
let editId=null,draftPhoto=null,draftAudio=null,draftArt=null,recording=null,recordStream=null,recordChunks=[],recordSession=0,transferToken=0,transferRunning=false,pendingRestore=null;
const SEEDTIME='2026-10-01T12:00:00.000Z';
const seeds=[
{id:'demo-coast',title:'Cannon Beach',address:'Oregon Coast, United States',category:'Nature',visited:'2026-09-22',rating:5,favorite:true,lat:45.8918,lng:-123.9615,notes:'Salt in the air. Sand in our shoes. Nowhere else we needed to be.\n\nWe stayed until the last of the light disappeared behind the rock.',sampleArt:'coast'},
{id:'demo-mountain',title:'A morning at Moraine Lake',address:'Banff National Park, Canada',category:'Travel',visited:'2026-08-14',rating:5,favorite:true,lat:51.3217,lng:-116.186,notes:'The lake was still enough to hold the mountains. We spoke quietly, as if we might wake them.',sampleArt:'mountain'},
{id:'demo-city',title:'Lost in Alfama',address:'Lisbon, Portugal',category:'Culture',visited:'2026-06-08',rating:4,favorite:false,lat:38.7111,lng:-9.1294,notes:'A wrong turn, a warm pastry, and a street we never wanted to leave. The best afternoon had no itinerary.',sampleArt:'city'}
].map(r=>({...r,updatedAt:SEEDTIME,photo:null,audio:null,phone:'',url:''}));
const isDemo=r=>r.id.startsWith('demo-')&&r.updatedAt===SEEDTIME;
const date=s=>new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'));
const today=()=>{const n=new Date();return new Date(n.getTime()-n.getTimezoneOffset()*60000).toISOString().slice(0,10);};
const art=r=>r.photo??`assets/${r.sampleArt??'blank'}.svg`;
const photoAlt=r=>r.photo?`Photograph of ${r.title}`:r.sampleArt?`Original illustration for ${r.title}`:'No photograph added yet';
let restoreCommit=false,pendingMedia=0,micPending=false;
let editorSession=0,photoReadVersion=0,gpsRequestVersion=0,pendingPhotoMetadata=null,locationPending=false;
function syncSave(){ $('save-place').disabled=micPending||pendingMedia>0||locationPending||recording?.state==='recording'; }
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5500);}
function dbOpen(){return new Promise((resolve,reject)=>{const req=indexedDB.open('nth-footprints',1);req.onupgradeneeded=()=>req.result.createObjectStore('journal');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Close other FootPrints tabs, then reload.'));});}
function dbGet(){return new Promise((resolve,reject)=>{const t=db.transaction('journal','readonly'),r=t.objectStore('journal').get('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function dbPut(nextRecords,nextSettings){return new Promise((resolve,reject)=>{const t=db.transaction('journal','readwrite');t.objectStore('journal').put({records:nextRecords,settings:nextSettings},'state');t.oncomplete=resolve;t.onabort=()=>reject(t.error??Error('The journal could not be saved.'));t.onerror=()=>{};});}
async function commit(nextRecords,nextSettings=settings){if(!storageReady)throw Error('Local storage is unavailable. Reload after allowing storage to save changes.');try{await dbPut(nextRecords,nextSettings);}catch(e){throw Error(e.name==='QuotaExceededError'?'This device is out of storage. Your previous journal is intact. Create a backup and free some space.':e.message);}records=nextRecords;settings=nextSettings;applyTheme();render();}
function applyTheme(){document.documentElement.classList.toggle('night',settings.theme==='night');$('theme').value=settings.theme;}
function filtered(){return filterRecords(records,{query,category,sort,favorites:view==='favorites'});}
let deckMotion=0,deckBusy=false,deckAnimations=[];
function cancelDeckMotion(){deckMotion++;deckBusy=false;deckAnimations.forEach(a=>a.cancel());deckAnimations=[];}
function photoCard(r,index,total,layer=0){return `<button class="photo-card ${layer?'deck-rear deck-layer-'+layer:'deck-front'}" ${layer?'tabindex="-1" aria-hidden="true"':`data-detail="${esc(r.id)}" aria-label="Open ${esc(r.title)}. ${index+1} of ${total} places. Swipe up or down to browse."`}><img class="card-image" src="${art(r)}" alt="${layer?'':esc(photoAlt(r))}" draggable="false"><strong>${esc(r.title)}</strong><span class="card-caption"><span>${esc(date(r.visited))}</span><span>${String(index+1).padStart(2,'0')} / ${String(total).padStart(2,'0')} places</span></span></button>`;}
function updateRearCards(step=1){const items=filtered();document.querySelectorAll('#deck .deck-rear').forEach((el,i)=>{const index=wrappedIndex(deckIndex,(i+1)*step,items.length);el.outerHTML=photoCard(items[index],index,items.length,i+1);});}
function previewDeck(dy){if(deckBusy)return;const front=$('deck').querySelector('.deck-front');if(!front)return;const direction=dy<0?1:-1;if($('deck').dataset.direction!==String(direction)){updateRearCards(direction);$('deck').dataset.direction=String(direction);}front.style.transform=dragTransform(dy);$('deck').classList.add('dragging');}
function resetDeck(){const front=$('deck').querySelector('.deck-front');$('deck').classList.remove('dragging');if(front&&!deckBusy)front.style.transform='';}
function render(){
 cancelDeckMotion();
 $('fav-count').textContent=records.filter(r=>r.favorite).length;
 document.querySelectorAll('[data-view]').forEach(e=>{e.classList.toggle('active',e.dataset.view===view);e.setAttribute('aria-current',e.dataset.view===view?'page':'false');});
 $('filters').innerHTML=['All places',...CATEGORIES].map(c=>`<button class="${category===c?'active':''}" data-category="${esc(c)}" aria-pressed="${category===c}">${esc(c)}</button>`).join('');
 $('sample-banner').hidden=!records.some(isDemo);
 const items=filtered();deckIndex=Math.min(Math.max(0,deckIndex),Math.max(0,items.length-1));
 $('journal-view').hidden=view!=='journal'||!items.length;$('favorites-view').hidden=view!=='favorites'||!items.length;$('map-view').hidden=view!=='map';$('empty').hidden=items.length>0||view==='map';
 const hasFilter=query||category!=='All places';$('empty-title').textContent=hasFilter?'No footprints here just yet.':view==='favorites'?'Keep your favorites close.':'Your next story starts here.';$('empty-copy').textContent=hasFilter?'Try another search or category.':view==='favorites'?'Tap the heart on a footprint to collect it here.':'Save a place, a photo, and a little of how it felt.';
 if(view==='journal'&&items.length)renderDeck(items);
 if(view==='favorites'){$('collection-title').textContent=view==='favorites'?'A little more than a place.':'Every footprint tells a story.';$('collection-count').textContent=`${items.length} ${items.length===1?'memory':'memories'}`;$('place-grid').innerHTML=items.map(r=>`<button class="grid-card" data-detail="${esc(r.id)}"><img src="${art(r)}" alt="${esc(photoAlt(r))}" loading="lazy">${r.favorite?'<span class="heart-corner" aria-label="Favorite">♥</span>':''}<h3>${esc(r.title)}</h3><p>${esc(r.address||r.category)}</p><span class="card-caption"><span>${esc(date(r.visited))}</span><span>${esc(r.category)}</span></span></button>`).join('');}
 if(view==='map')renderMap(items);
 icons();
}
function renderDeck(items){
 const r=items[deckIndex];$('deck-count').textContent=`${String(deckIndex+1).padStart(2,'0')} / ${String(items.length).padStart(2,'0')}`;
 $('deck').classList.remove('dragging');$('deck').dataset.direction='1';
 $('deck').innerHTML=[...Array(Math.min(items.length,3))].map((_,layer)=>{const index=wrappedIndex(deckIndex,layer,items.length);return photoCard(items[index],index,items.length,layer);}).join('');
 $('deck-status').textContent=`${r.title}. Place ${deckIndex+1} of ${items.length}.`;
 $('previous').disabled=items.length<2;$('next').disabled=items.length<2;

}
function directions(r){return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.lat!==null?`${r.lat},${r.lng}`:r.address||r.title)}`;}
function renderMap(items){
 const pinned=items.filter(r=>r.lat!==null);if(!pinned.some(r=>r.id===mapId))mapId=pinned[0]?.id??null;
 $('map-list').innerHTML=pinned.length?pinned.map(r=>`<button class="map-place ${r.id===mapId?'selected':''}" data-map="${esc(r.id)}"><img src="${art(r)}" alt=""><span><strong>${esc(r.title)}</strong><small>${esc(r.address||r.category)}</small></span></button>`).join(''):'<p class="field-help">Add coordinates to a footprint to see it here.</p>';
 const r=pinned.find(r=>r.id===mapId);
 if(!r){$('map-content').innerHTML='<div class="map-placeholder">A whole world of memories.<br>Add a location to begin.</div>';return;}
 const delta=.025,bbox=[Math.max(-180,r.lng-delta),Math.max(-90,r.lat-delta),Math.min(180,r.lng+delta),Math.min(90,r.lat+delta)].join(',');
 const url=`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${r.lat}%2C${r.lng}`;
 $('map-content').innerHTML=`<iframe title="Map of ${esc(r.title)}" src="${url}" loading="lazy" referrerpolicy="no-referrer"></iframe>`;
 $('map-list').insertAdjacentHTML('beforeend',`<div class="detail-actions"><button class="secondary" data-detail="${esc(r.id)}">Open memory</button><a class="primary" href="${directions(r)}" target="_blank" rel="noopener noreferrer">Directions ${icon('external')}</a></div>`);
}
async function moveDeck(step,{drag=0}={}){
 const items=filtered();if(deckBusy||items.length<2||view!=='journal')return;
 const front=$('deck').querySelector('.deck-front');if(!front)return;
 const focused=document.activeElement===front;const token=++deckMotion;deckBusy=true;updateRearCards(step);$('deck').classList.remove('dragging');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!reduced&&front.animate){
  const direction=step>0?-1:1,offset=Math.min(220,$('deck').clientHeight*.48);
  const frames=[{transform:front.style.transform||dragTransform(0),opacity:1,offset:0},{transform:`translateY(${direction*offset*.66}px) rotateX(${-direction*66}deg) rotateZ(${-3+direction*3}deg) scale(.94)`,opacity:.85,offset:.65},{transform:`translateY(${direction*offset}px) rotateX(${-direction*87}deg) rotateZ(${-3+direction*4}deg) scale(.88)`,opacity:0,offset:1}];
  const options={duration:480,easing:'cubic-bezier(.22,.7,.25,1)',fill:'forwards'};
  deckAnimations=[front.animate(frames,options)];
  $('deck').querySelectorAll('.deck-rear').forEach((el,i)=>deckAnimations.push(el.animate([{transform:getComputedStyle(el).transform},{transform:i===0?dragTransform(0):'translateY(8px) rotateZ(4deg) scale(.97)'}],options)));
  await Promise.allSettled(deckAnimations.map(a=>a.finished));
 }
 if(token!==deckMotion)return;
 deckIndex=wrappedIndex(deckIndex,step,items.length);deckAnimations.forEach(a=>a.cancel());deckAnimations=[];deckBusy=false;renderDeck(items);
 if(focused)$('deck').querySelector('.deck-front')?.focus({preventScroll:true});
}
function setView(next){cancelDeckMotion();view=next;deckIndex=0;history.replaceState(null,'','#'+next);render();}
function show(id){$(id).showModal();}
function close(id){if(id==='backup'&&restoreCommit)return;if(id==='editor')stopRecording(true);if(id==='backup'){cancelTransfer();pendingRestore=null;}$ (id).close();}
function openDetail(id){const r=records.find(x=>x.id===id);if(!r)return;
 $('details-content').innerHTML=`<button class="icon-button detail-top-close" data-close="details" aria-label="Close memory">${icon('close')}</button><img class="detail-photo" src="${art(r)}" alt="${esc(photoAlt(r))}"><div class="detail-content"><div class="memory-top"><span class="eyebrow">${esc(r.category)}${isDemo(r)?' · ILLUSTRATED SAMPLE':''}</span><button class="favorite-btn ${r.favorite?'on':''}" data-favorite="${esc(r.id)}" aria-label="Toggle favorite" aria-pressed="${r.favorite}">${icon('heart')}</button></div><h2>${esc(r.title)}</h2><p class="address-line">${icon('location')}${esc(r.address||'A place of your own')}</p><div class="rating-line"><span class="stars" aria-label="${r.rating} out of 5 stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span><span>${date(r.visited)}</span></div><p class="story">${esc(r.notes||'No note added yet.')}</p>${r.audio?`<audio controls src="${r.audio}" aria-label="Voice note"></audio>`:''}<div class="detail-extra">${r.phone?`<a href="tel:${esc(r.phone.replace(/[^+\d*#,;]/g,''))}">${esc(r.phone)}</a>`:''}${r.url?`<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Visit website ${icon('external')}</a>`:''}</div>${r.lat!==null?`<p class="field-help">${r.lat.toFixed(6)}°, ${r.lng.toFixed(6)}°</p>`:''}<div class="detail-actions"><button class="primary" data-edit="${esc(r.id)}">${icon('edit')}Edit</button><a class="secondary" href="${directions(r)}" target="_blank" rel="noopener noreferrer">${icon('navigation')}Directions</a><button class="secondary" data-export="${esc(r.id)}">${icon('download')}Export</button><button class="secondary delete-button" data-delete="${esc(r.id)}" aria-label="Delete ${esc(r.title)}">${icon('trash')}</button></div></div>`;
 if(!$('details').open)show('details');
}
function refreshDraft(){
 $('read-photo-geotag').hidden=!draftPhoto;
 const src=draftPhoto??(draftArt?`assets/${draftArt}.svg`:null);$('photo-preview').hidden=!src;$('photo-placeholder').hidden=!!src;$('remove-photo').hidden=!src;if(src)$('photo-preview').src=src;else $('photo-preview').removeAttribute('src');
 $('audio-preview').hidden=!draftAudio;$('remove-audio').hidden=!draftAudio;if(draftAudio)$('audio-preview').src=draftAudio;else{$('audio-preview').pause();$('audio-preview').removeAttribute('src');}
}
function openEditor(id=null){
 if(!storageReady){toast('Local saving is unavailable. Check browser storage permissions and reload.');return;}
 if($('details').open)$('details').close();
 editorSession++;photoReadVersion++;gpsRequestVersion++;locationPending=false;$('use-location').disabled=false;syncSave();pendingPhotoMetadata=null;$('photo-geotag').hidden=true;
 const r=id?records.find(x=>x.id===id):null;editId=r?.id??null;draftPhoto=r?.photo??null;draftAudio=r?.audio??null;draftArt=r?.sampleArt??null;
 $('place-form').reset();$('editor-title').textContent=r?'A place worth revisiting.':'A new footprint.';
 for(const field of ['title','category','visited','rating','address','notes','phone','url','lat','lng'])$(field).value=r?.[field]??({category:'Travel',visited:today(),rating:0}[field]??'');
 $('favorite').checked=r?.favorite??false;$('editor-error').textContent='';$('location-status').textContent='Add coordinates to put this footprint on the map.';$('record-status').textContent='Recording needs microphone access. You can also attach an audio file.';
 refreshDraft();show('editor');
}
function asDataURL(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('This attachment could not be read.'));reader.readAsDataURL(file);});}
function offerPhotoMetadata(metadata){
 pendingPhotoMetadata=metadata;const box=$('photo-geotag');box.hidden=false;
 if(metadata.location){const {lat,lng}=metadata.location;
  box.innerHTML=`<span class="eyebrow">A LOCATION IN YOUR PHOTO</span><h3>Bring this place into your footprint.</h3><p>${lat.toFixed(6)}°, ${lng.toFixed(6)}°</p><p class="field-help">Apply these coordinates to the editor, then save the footprint to keep them.</p>${metadata.takenOn?`<label class="checkbox"><input type="checkbox" id="use-photo-date">Also use photo date: ${esc(date(metadata.takenOn))}</label>`:''}<div class="geotag-actions"><button type="button" class="primary" id="apply-photo-geotag">Use photo location</button><a class="text-button" href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}" target="_blank" rel="noopener noreferrer">Preview on map ${icon('external')}</a><button type="button" class="text-button" id="dismiss-photo-geotag">Dismiss</button></div>`;
 }else{
  const message=metadata.status==='malformed'?'The saved photo metadata could not be read. Your photo is still attached.':metadata.status==='unsupported'?'This photo format does not have a supported GPS reader yet.':'No saved GPS location was found. Some photos have their location removed when shared.';
  box.innerHTML=`<span class="eyebrow">PHOTO LOCATION</span><p>${message}</p><p class="field-help">Use “Use my location” for where you are now, or enter the place’s coordinates manually.</p><button type="button" class="text-button" id="dismiss-photo-geotag">Dismiss</button>`;
 }
}
function applyPhotoLocation(){
 if(!pendingPhotoMetadata?.location)return;const {lat,lng}=pendingPhotoMetadata.location;gpsRequestVersion++;locationPending=false;$('use-location').disabled=false;syncSave();
 $('lat').value=lat.toFixed(6);$('lng').value=lng.toFixed(6);
 if($('use-photo-date')?.checked&&pendingPhotoMetadata.takenOn)$('visited').value=pendingPhotoMetadata.takenOn;
 $('location-status').textContent='Location taken from this photo. Save the footprint to keep it.';$('photo-geotag').hidden=true;pendingPhotoMetadata=null;
}
async function inspectSavedPhoto(){
 if(!draftPhoto)return;const session=editorSession,selection=++photoReadVersion;pendingMedia++;syncSave();$('read-photo-geotag').disabled=true;
 try{await tick();const payload=atob(draftPhoto.slice(draftPhoto.indexOf(',')+1)),bytes=Uint8Array.from(payload,c=>c.charCodeAt(0));const metadata=readPhotoMetadata(bytes);
 if(session===editorSession&&selection===photoReadVersion&&$('editor').open)offerPhotoMetadata(metadata);
 }catch{$('editor-error').textContent='This photo’s metadata could not be read. You can still set its footprint location manually.';}finally{pendingMedia--;syncSave();$('read-photo-geotag').disabled=false;}
}
async function attach(file,kind){
 if(!file)return;let processing=false;const session=editorSession,selection=kind==='image'?++photoReadVersion:null;
 if(kind==='image'){pendingPhotoMetadata=null;$('photo-geotag').hidden=true;}
 try{if(file.size>20*1024*1024)throw Error('Choose an attachment smaller than 20 MB for this prototype.');if(!file.type.startsWith(kind+'/'))throw Error(`Choose a valid ${kind} file.`);
 processing=true;pendingMedia++;syncSave();
 const [data,buffer]=await Promise.all([asDataURL(file),kind==='image'?file.arrayBuffer():null]);
 const probe={...seeds[0],photo:kind==='image'?data:null,audio:kind==='audio'?data:null};validateRecord(probe);
 if(!$('editor').open||session!==editorSession||(kind==='image'&&selection!==photoReadVersion))return;
 if(kind==='image'){draftPhoto=data;draftArt=null;offerPhotoMetadata(readPhotoMetadata(buffer));}else draftAudio=data;refreshDraft();$('editor-error').textContent='';return true;
 }catch(e){if(session===editorSession)$('editor-error').textContent=e.message;}finally{if(processing)pendingMedia--;syncSave();}
}
function stopRecording(discard=false){
 if(discard)recordSession++;
 if(recording&&recording.state!=='inactive'){if(!discard&&!recording._processing){recording._processing=true;pendingMedia++;}recording.stop();}
 recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;
 $('record').classList.remove('recording');$('record').innerHTML=icon('mic')+'Record a note';syncSave();
}
async function toggleRecording(){
 if(recording&&recording.state==='recording'){stopRecording();return;}
 if(!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder){$('record-status').textContent='Recording is unavailable in this browser. Attach an audio file instead.';return;}
 const session=++recordSession;$('record').disabled=true;micPending=true;syncSave();
 try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});if(session!==recordSession||!$('editor').open){stream.getTracks().forEach(t=>t.stop());return;}
 recordStream=stream;const recorder=new MediaRecorder(stream);recording=recorder;recordChunks=[];let size=0;
 recorder.ondataavailable=e=>{if(e.data.size){recordChunks.push(e.data);size+=e.data.size;if(size>20*1024*1024){stopRecording(true);$('record-status').textContent='Recording stopped at the 20 MB limit. Please record a shorter note.';}}};
 recorder.onstop=async()=>{if(!recorder._processing){recorder._processing=true;pendingMedia++;}syncSave();try{if(session!==recordSession)return;const blob=new Blob(recordChunks,{type:(recorder.mimeType||'audio/webm').split(';')[0]});draftAudio=await asDataURL(blob);if(session!==recordSession||!$('editor').open)return;refreshDraft();$('record-status').textContent='Voice note ready. Save the footprint to keep it.';}catch(e){$('editor-error').textContent=e.message;}finally{pendingMedia--;if(session===recordSession)recording=null;syncSave();}};
 recorder.start(1000);$('record').innerHTML=icon('mic')+'Stop recording';$('record').classList.add('recording');$('record-status').textContent='Recording… tap Stop when you’re finished.';$('save-place').disabled=true;
 }catch(e){recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;$('record-status').textContent='Microphone access was unavailable. You can attach an audio file instead.';}finally{$('record').disabled=false;micPending=false;syncSave();}
}
async function savePlace(e){e.preventDefault();if(micPending||pendingMedia>0||locationPending||recording?.state==='recording')return;$('editor-error').textContent='';const save=$('save-place');save.disabled=true;
 try{const form=new FormData($('place-form'));const r=validateRecord({id:editId??crypto.randomUUID(),title:form.get('title'),category:form.get('category'),visited:form.get('visited'),rating:Number(form.get('rating')),favorite:$('favorite').checked,address:form.get('address'),notes:form.get('notes'),phone:form.get('phone'),url:form.get('url'),lat:form.get('lat')===''?null:Number(form.get('lat')),lng:form.get('lng')===''?null:Number(form.get('lng')),photo:draftPhoto,audio:draftAudio,sampleArt:draftArt,updatedAt:new Date().toISOString()});
 const next=records.filter(x=>x.id!==r.id).concat(r);await commit(next);close('editor');deckIndex=Math.max(0,filtered().findIndex(x=>x.id===r.id));render();toast(editId?'Footprint updated.':'A new memory, kept.');
 }catch(e){$('editor-error').textContent=e.message;}finally{save.disabled=false;}
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function cancelTransfer(){if(restoreCommit)return;if(transferRunning){transferToken++;transferRunning=false;$('transfer').hidden=true;$('backup-status').textContent='Cancelled. Your journal has not changed.';}$('export-all').disabled=false;$('backup-file').disabled=false;}
function beginTransfer(label){const token=++transferToken;transferRunning=true;$('transfer').hidden=false;$('transfer-label').textContent=label;$('transfer-progress').value=0;$('backup-status').textContent='';$('export-all').disabled=true;$('backup-file').disabled=true;return token;}
function checkToken(token){if(token!==transferToken)throw Error('CANCELLED');}
function finishTransfer(token,message){if(token!==transferToken)return;transferRunning=false;$('transfer').hidden=true;$('export-all').disabled=false;$('backup-file').disabled=false;$('backup-status').textContent=message;}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
async function exportBackup(id=null){
 if($('details').open)$('details').close();if(!$('backup').open)show('backup');$('restore-preview').hidden=true;pendingRestore=null;
 const token=beginTransfer('Preparing your backup…');const items=id?records.filter(r=>r.id===id):[...records];
 try{const chunks=['{"app":'+JSON.stringify(APP)+',"formatVersion":'+VERSION+',"createdAt":'+JSON.stringify(new Date().toISOString())+',"settings":'+JSON.stringify(settings)+',"records":['];let size=chunks[0].length;
 for(let i=0;i<items.length;i++){await tick();checkToken(token);const part=(i?',':'')+JSON.stringify(validateRecord(items[i]));size+=part.length;if(size>MAX_BACKUP)throw Error('This journal exceeds the prototype’s 150 MB backup limit. Export individual footprints from their memory pages.');chunks.push(part);$('transfer-label').textContent=`Packing ${i+1} of ${items.length} footprints…`;$('transfer-progress').value=Math.round((i+1)/items.length*95);}
 chunks.push(']}');await tick();checkToken(token);const blob=new Blob(chunks,{type:'application/json'});if(blob.size>MAX_BACKUP)throw Error('Backup exceeds the 150 MB prototype limit. Export individual footprints instead.');
 download(blob,`Nth-FootPrints-${id?'memory-':''}${today()}.nthbackup`);$('transfer-progress').value=100;finishTransfer(token,'Backup download started. Keep the file somewhere safe.');
 }catch(e){if(e.message!=='CANCELLED')finishTransfer(token,e.message);}
}
async function inspectBackup(file){
 if(!file)return;if(file.size>MAX_BACKUP){$('backup-status').textContent='Choose a backup smaller than 150 MB for this prototype.';return;}
 $('restore-preview').hidden=true;pendingRestore=null;const token=beginTransfer('Reading your backup…');const reader=new FileReader();
 reader.onprogress=e=>{if(e.lengthComputable&&token===transferToken)$('transfer-progress').value=Math.round(e.loaded/e.total*85);};
 try{const raw=await new Promise((resolve,reject)=>{reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('The backup could not be read.'));reader.onabort=()=>reject(Error('CANCELLED'));reader.readAsText(file);});await tick();checkToken(token);$('transfer-label').textContent='Checking places and attachments…';const parsed=parseBackup(raw);await tick();checkToken(token);pendingRestore=parsed;const m=mergeRecords(records,parsed.records);
 $('restore-preview').innerHTML=`<span class="eyebrow">READY TO RESTORE</span><h3>${parsed.records.length} ${parsed.records.length===1?'footprint':'footprints'} in this backup</h3><p><b>${m.added}</b> new · <b>${m.updated}</b> newer versions · <b>${m.kept}</b> already up to date</p><p>Your existing places stay. Only newer versions of matching footprints are updated.</p><label class="checkbox"><input type="checkbox" id="restore-settings">Also restore appearance preferences</label><button class="primary" id="confirm-restore">Restore footprints</button>`;$('restore-preview').hidden=false;finishTransfer(token,'Backup checked. Nothing has changed yet.');
 }catch(e){if(e.message!=='CANCELLED')finishTransfer(token,e.message);}finally{$('backup-file').value='';}
}
async function restoreBackup(){if(!pendingRestore)return;const incoming=pendingRestore,withSettings=$('restore-settings').checked;const token=beginTransfer('Preparing your journal…');$('confirm-restore').disabled=true;
 try{for(let i=0;i<incoming.records.length;i++){await tick();checkToken(token);$('transfer-label').textContent=`Preparing footprint ${i+1} of ${incoming.records.length}…`;$('transfer-progress').value=Math.round((i+1)/incoming.records.length*90);}
 checkToken(token);const merged=mergeRecords(records,incoming.records);restoreCommit=true;$('cancel-transfer').disabled=true;await commit(merged.records,withSettings?incoming.settings:settings);pendingRestore=null;$('restore-preview').hidden=true;finishTransfer(token,`Restored: ${merged.added} added, ${merged.updated} updated. Your journal is ready.`);toast('Your memories are here.');
 }catch(e){if(e.message!=='CANCELLED')finishTransfer(token,e.message);}finally{restoreCommit=false;$('cancel-transfer').disabled=false;if($('confirm-restore'))$('confirm-restore').disabled=false;}
}
async function useLocation({capture=false}={}){
 if(!navigator.geolocation){$('location-status').textContent='Location is unavailable. Enter coordinates manually.';return;}
 const session=editorSession,request=++gpsRequestVersion;locationPending=true;syncSave();$('use-location').disabled=true;$('location-status').textContent=capture?'Finding the location for your new photo…':'Finding your location…';
 navigator.geolocation.getCurrentPosition(p=>{
  if(session===editorSession&&request===gpsRequestVersion&&$('editor').open){$('lat').value=p.coords.latitude.toFixed(6);$('lng').value=p.coords.longitude.toFixed(6);$('location-status').textContent=`${capture?'New photo located':'Current location found'} (about ${Math.round(p.coords.accuracy)} m accuracy). Save the footprint to keep it. Add the address above if you’d like.`;}
  if(session===editorSession&&request===gpsRequestVersion){locationPending=false;$('use-location').disabled=false;syncSave();}
 },()=>{if(session===editorSession&&request===gpsRequestVersion){$('location-status').textContent='Could not get your location. Check location permission or enter coordinates manually.';locationPending=false;$('use-location').disabled=false;syncSave();}},{enableHighAccuracy:true,timeout:20000,maximumAge:0});
}
async function toggleFavorite(id){const r=records.find(x=>x.id===id);if(!r)return;await commit(records.map(x=>x.id===id?{...x,favorite:!x.favorite,updatedAt:new Date().toISOString()}:x));if($('details').open)openDetail(id);}
async function deletePlace(id){const r=records.find(x=>x.id===id);if(!r||!confirm(`Delete “${r.title}” and its attached photo and voice note?`))return;await commit(records.filter(x=>x.id!==id));$('details').close();toast('Footprint deleted.');}
async function routeClick(e){const b=e.target.closest('button,a');if(!b)return;
 try{if(b.dataset.view){setView(b.dataset.view);return;}if(b.dataset.category){category=b.dataset.category;deckIndex=0;render();return;}if(b.dataset.close){close(b.dataset.close);return;}if(b.dataset.detail){openDetail(b.dataset.detail);return;}if(b.dataset.edit){openEditor(b.dataset.edit);return;}if(b.dataset.favorite){b.disabled=true;try{await toggleFavorite(b.dataset.favorite);}finally{b.disabled=false;}return;}if(b.dataset.delete){await deletePlace(b.dataset.delete);return;}if(b.dataset.export){await exportBackup(b.dataset.export);return;}if(b.dataset.map){mapId=b.dataset.map;renderMap(filtered());return;}if(b.id==='apply-photo-geotag'){applyPhotoLocation();return;}if(b.id==='dismiss-photo-geotag'){pendingPhotoMetadata=null;$('photo-geotag').hidden=true;return;}if(b.id==='confirm-restore')await restoreBackup();
 }catch(err){toast(err.message);}
}
function wire(){
 icons();$('category').innerHTML=CATEGORIES.map(c=>`<option>${c}</option>`).join('');
 document.addEventListener('click',routeClick);$('add').onclick=()=>openEditor();$('empty-add').onclick=()=>openEditor();$('previous').onclick=()=>moveDeck(-1);$('next').onclick=()=>moveDeck(1);
 $('search').oninput=e=>{query=e.target.value;deckIndex=0;render();};$('sort').onchange=e=>{sort=e.target.value;deckIndex=0;render();};
 $('place-form').onsubmit=savePlace;$('photo-file').onchange=e=>attach(e.target.files[0],'image');$('camera-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;const session=editorSession;const attached=await attach(file,'image');if(attached&&session===editorSession&&$('editor').open&&draftPhoto){pendingPhotoMetadata=null;$('photo-geotag').hidden=true;useLocation({capture:true});}};$('read-photo-geotag').onclick=inspectSavedPhoto;$('audio-file').onchange=e=>attach(e.target.files[0],'audio');$('remove-photo').onclick=()=>{photoReadVersion++;pendingPhotoMetadata=null;$('photo-geotag').hidden=true;$('camera-file').value='';draftPhoto=null;draftArt=null;$('photo-file').value='';refreshDraft();};$('remove-audio').onclick=()=>{draftAudio=null;$('audio-file').value='';refreshDraft();};$('record').onclick=toggleRecording;$('use-location').onclick=()=>useLocation();for(const id of ['lat','lng'])$(id).addEventListener('input',()=>{gpsRequestVersion++;locationPending=false;$('use-location').disabled=false;syncSave();$('location-status').textContent='Location set manually. Save the footprint to keep it.';});
 $('backup-open').onclick=()=>{if(!transferRunning){$('restore-preview').hidden=true;$('backup-status').textContent='';pendingRestore=null;}show('backup');};$('export-all').onclick=()=>exportBackup();$('backup-file').onchange=e=>inspectBackup(e.target.files[0]);$('cancel-transfer').onclick=cancelTransfer;
 $('settings-open').onclick=()=>show('settings');$('roadmap-open').onclick=()=>show('roadmap');$('theme').onchange=async e=>{try{await commit(records,{theme:e.target.value});}catch(err){applyTheme();toast(err.message);}};
 $('request-persistence').onclick=async()=>{try{$('persistence-status').textContent=await navigator.storage?.persist?.()?'Durable storage granted for this browser. Keep backups too.':'The browser did not grant durable storage. Backups are still available.';}catch{$('persistence-status').textContent='Durable storage is unavailable in this browser.';}};
 $('clear-samples').onclick=async()=>{if(!confirm('Remove the untouched sample memories? Your own footprints and edited samples will stay.'))return;try{await commit(records.filter(r=>!isDemo(r)));toast('A fresh journal, ready for you.');}catch(e){toast(e.message);}};
 $('editor').addEventListener('cancel',()=>stopRecording(true));$('editor').addEventListener('close',()=>{editorSession++;photoReadVersion++;gpsRequestVersion++;locationPending=false;syncSave();$('audio-preview').pause();stopRecording(true);});$('details').addEventListener('close',()=>{$('details').querySelectorAll('audio').forEach(a=>a.pause());});$('backup').addEventListener('cancel',e=>{if(restoreCommit)e.preventDefault();else cancelTransfer();});
 bindVerticalDeck($('deck'),{canMove:()=>!deckBusy&&filtered().length>1,move:moveDeck,preview:previewDeck,reset:resetDeck});
 document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;if(view==='journal'&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();moveDeck(e.key==='ArrowUp'?1:-1);}});
 document.querySelector('.brand').onclick=e=>{e.preventDefault();setView('journal');};
 // Backup and preferences remain accessible above the bottom bar on small screens.
 const mobileActions=document.createElement('div');mobileActions.className='mobile-tools';mobileActions.innerHTML=`<button class="text-button" id="mobile-backup">${icon('archive')}Backup & restore</button><button class="text-button" id="mobile-settings">${icon('settings')}Preferences</button>`;$('sample-banner').before(mobileActions);$('mobile-backup').onclick=()=>$('backup-open').click();$('mobile-settings').onclick=()=>$('settings-open').click();
}
async function init(){wire();const initial=location.hash.slice(1);if(initial==='places')history.replaceState(null,'','#journal');if(['journal','map','favorites'].includes(initial))view=initial;
 try{db=await dbOpen();const state=await dbGet();if(state){records=state.records.map(validateRecord);settings=validateSettings(state.settings);}else{records=seeds;await dbPut(records,settings);}storageReady=true;}catch(e){records=[];$('add').disabled=true;document.querySelector('.local-status').textContent='Local storage unavailable';toast('Unable to open local storage. Check browser permissions and reload. '+e.message);}
 applyTheme();render();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
init();
