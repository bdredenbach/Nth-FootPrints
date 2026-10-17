import {createPhotoLightbox} from './photo-lightbox.js';
import {countryOptions,syncRegionFields,chooseRegion,mergePlaceLabels} from './geography.js';
import {createRegionLookup} from './region-lookup.js';
import {categoryChoices} from './categories.js';
import {placeSourceURL,isGeoapifySource} from './place-source.js';
import {createPlacesUI} from './places-ui.js';
import {parseTags,normalizeTags,scopeRecords,anniversaryMemories,mergeJournalPreferences} from './journal-tools.js';
import {createJournalToolsUI} from './journal-tools-ui.js';
import {createBatchImportUI} from './batch-import-ui.js';
import {createExportsUI} from './exports-ui.js';
import {createNearbyMemories} from './nearby-memories.js';
import {INITIAL_VISIT,visitsOf,visitById,visitView,placeView,latestVisited,journeyIdsOf,writeVisit,changeVisit,removeVisit} from './visits.js';
import {APP,VERSION,CATEGORIES,MAX_BACKUP,MAX_PHOTOS,backupRecord,validateRecord,validateSettings,parseBackup,mergeRecords,filterRecords,SAMPLE_TIMESTAMP,isSampleRecord as isDemo,withoutStarterSamples} from './model.js';
import {activeJourneys,journeyRecords,validateJourneys,reconcileJourneys,mergeJourneys} from './journeys.js';
import {createJourneysUI} from './journeys-ui.js';
import {bindVerticalDeck,wrappedIndex,dragTransform} from './deck.js';
import {readPhotoMetadata} from './geotags.js';
import {createDeviceAccess,cameraCancelled} from './device.js';
import {saveBackupFile,transferCancelled} from './backup-file.js';
import {preparePhotoExport} from './photo-export.js';
import {createAtlas,hasLocation} from './atlas.js';
import {createVisitMap} from './visit-map.js';
import {createPositionPicker,createNearbyLookup,nearestPlaces,distanceLabel} from './location-tools.js';
import {RELEASES,APP_VERSION} from './releases.js';
import {createWidgetSync,createWidgetLaunch,createWidgetPreferences} from './widget.js';
import {photosOf,coverOf,selectPhoto,addPhotos,replacePhoto,removePhoto,readGalleryFiles,createPhotoViewer,bindPhotoSwipe} from './gallery.js';
import {createNavigation,bindNativeBack,navigationRoute} from './navigation.js';
import {createDraftStore,createDraftRecovery,clearDraftInTransaction,bindDraftLifecycle,DRAFT_FIELDS} from './drafts.js';
import {createOfflineMaps,planOfflineArea} from './offline-maps.js';
import {createPlaceSearch,samePlacePoint} from './place-search.js';
const device=createDeviceAccess({native:!!window.Capacitor?.isNativePlatform?.(),plugins:window.NthNative,geolocation:navigator.geolocation});
let atlas=null,picker=null,pickerRequest=0,nearbyOrigin=null,pickerPlace=null,detailMap=null,mapVisit=null,mapsPaused=false;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const offlineMaps=createOfflineMaps();
const photoLightbox=createPhotoLightbox({document,window});
let offlineReady=false,offlineProgress=null;
const regionLookup=createRegionLookup({storage:{getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)}});
let regionRequest=0,regionLabelVersion=0,editorAutoLabels=null;
const placeSearch=createPlaceSearch({onState:renderPlaceSearch});
const paths={expand:'M4 4h5 M4 4v5 M4 4l6 6 M20 20h-5 M20 20v-5 M20 20l-6-6 M20 4h-5 M20 4v5 M20 4l-6 6 M4 20h5 M4 20v-5 M4 20l6-6',minus:'M5 12h14',footprint:'M15 21c-2 0-3-2-3-5 0-2 1-5 3-5s4 3 4 5c0 3-2 5-4 5Z M15 7c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2Z M9 10c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2Z M7 14c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2Z',stack:'M4 7 12 3l8 4-8 4-8-4Z M4 12l8 4 8-4 M4 17l8 4 8-4',list:'M9 6h12 M9 12h12 M9 18h12 M3 6h1 M3 12h1 M3 18h1',map:'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z M9 3v16 M15 5v16',heart:'M20 5c-2-2-5-2-8 1-3-3-6-3-8-1-3 3-1 6 1 8l7 7 7-7c2-2 4-5 1-8Z',archive:'M4 9h16v12H4V9Z M3 3h18v6H3V3Z M9 13h6',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M10 3h4l1 3 3 1 3 2v4l-3 1-1 3-2 4h-4l-1-3-3-1-4-2v-4l3-1 1-3 3-4Z',plus:'M12 5v14 M5 12h14',search:'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z M15 15l6 6',compass:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z m-6-3-2 4-4 2 2-4 4-2Z',arrowUp:'M12 19V5 M6 11l6-6 6 6',arrowDown:'M12 5v14 M6 13l6 6 6-6',arrowLeft:'M19 12H5 M11 6l-6 6 6 6',arrowRight:'M5 12h14 M13 6l6 6-6 6',location:'M19 10c0 6-7 11-7 11S5 16 5 10a7 7 0 0 1 14 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',close:'m6 6 12 12 M18 6 6 18',camera:'M3 7h4l2-3h6l2 3h4v14H3V7Z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',mic:'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Z M5 10v2a7 7 0 0 0 14 0v-2 M12 19v3 M8 22h8',download:'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4',edit:'m15 4 5 5-12 12H3v-5L15 4Z M12 7l5 5',external:'M14 3h7v7 M21 3 10 14 M10 3H3v18h18v-7',navigation:'m21 3-6 18-4-8-8-4L21 3Z',trash:'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7'};
Object.assign(paths,{refresh:"M20 7v5h-5 M4 17v-5h5 M5 8a8 8 0 0 1 13-3l2 2 M4 17l2 2a8 8 0 0 0 13-3","food": "M7 3v7 M4 3v5a3 3 0 0 0 6 0V3 M7 11v10 M18 21V3c-4 3-4 9 0 9", "drink": "M4 3h16l-8 9L4 3Z M12 12v9 M7 21h10", "coffee": "M4 5h12v9a5 5 0 0 1-10 0V5 M16 6h2a3 3 0 0 1 0 6h-2 M3 21h16", "dessert": "m6 11 6 11 6-11 M5 11h14a4 4 0 0 0-3-5 4 4 0 0 0-8 0 4 4 0 0 0-3 5Z", "bag": "M5 7h14l1 14H4L5 7Z M8 7V5a4 4 0 0 1 8 0v2", "truck": "M2 6h12v12H2V6Z M14 10h5l3 5v3h-8 M7 18a2 2 0 1 1-4 0 M21 18a2 2 0 1 1-4 0", "spark": "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z", "tree": "m12 2-7 9h4l-5 7h16l-5-7h4L12 2Z M12 18v4", "gym": "m5 4 15 15 M2 7l5-5 M1 11l10-10 M13 23l10-10 M17 22l5-5", "art": "M12 3a9 9 0 1 0 0 18c2 0 2-3 0-3-2-1-1-4 2-4h3c5 0 3-11-5-11Z M7 9h.1 M11 6h.1 M16 8h.1 M6 14h.1", "music": "M10 18V5l10-2v13 M10 8l10-2 M10 18a3 3 0 1 1-3-3c2 0 3 1 3 3 M20 16a3 3 0 1 1-3-3c2 0 3 1 3 3", "movie": "M3 7h18v14H3V7Z M3 7V3h18v4 M6 3l3 4 M13 3l3 4", "museum": "m2 9 10-7 10 7H2Z M4 10v10 M9 10v10 M15 10v10 M20 10v10 M2 22h20", "book": "M12 5C8 2 4 3 2 4v16c3-1 6-1 10 1 4-2 7-2 10-1V4c-4-1-7-1-10 1Z M12 5v16", "cart": "M2 3h3l3 13h11l3-10H6 M9 20h.1 M18 20h.1", "beauty": "M4 9h7l2 12H2L4 9Z M6 9V3h3v6 M17 3h5v18h-5 M17 7h5 M17 11h5 M17 15h5", "car": "m5 5-3 8v7h3v-3h14v3h3v-7l-3-8H5Z M3 12h18 M6 14h.1 M18 14h.1", "home": "m2 11 10-9 10 9 M5 9v13h14V9 M10 22v-7h4v7", "shirt": "m8 3-6 4 3 5 3-2v12h8V10l3 2 3-5-6-4c0 4-8 4-8 0Z", "shop": "M3 4h18l1 6H2l1-6Z M4 10v12h16V10 M4 15h16 M12 15v7", "screen": "M2 3h20v14H2V3Z M8 21h8 M12 17v4", "ball": "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z m-9-5 4 3-2 5H9l-2-5 5-3Z M12 3v4 M21 12l-5-2 M17 20l-3-5 M7 20l2-5 M3 12l4-2", "service": "M3 10h18v12H3V10Z M8 10V5a4 4 0 0 1 8 0v5 M3 15h18 M12 13v4", "bed": "M3 3v19 M3 15h19v7 M6 8h4v7H6V8Z M13 8h6a3 3 0 0 1 3 3v4h-9V8Z", "cash": "M2 5h20v14H2V5Z M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0 M5 12h.1 M19 12h.1", "repair": "m4 21 11-11a6 6 0 0 0 7-7l-4 4-3-3 4-4a6 6 0 0 0-7 7L1 18l3 3Z", "bolt": "m13 2-9 12h7l-1 8 10-13h-7l1-7Z", "fuel": "M3 3h10v19H3V3Z M3 10h10 M13 8h3v11a3 3 0 0 0 6 0V8l-4-4 M18 4v5h4", "health": "M2 2h20v20H2V2Z M9 6h6v3h3v6h-3v3H9v-3H6V9h3V6Z", "mail": "M2 4h20v16H2V4Z m0 0 10 8L22 4", "parking": "M8 22V2h6a6 6 0 0 1 0 12H8 M8 5h6a3 3 0 0 1 0 6H8"});
const icon=(name)=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]??paths.compass}"/></svg>`;
function icons(root=document){root.querySelectorAll('[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon));}
let tagFilter='',explorationCountry='',explorationRegion='',nearbyMatch=null,exportTarget=null;
let db,records=[],journeys=[],journeyFilter='',settings={theme:'paper'},view='journal',category='All places',query='',sort='newest',deckIndex=0,mapId=null,storageReady=false;
let editVisitId=null,detailVisitId=null;
let editId=null,draftSource=null,draftPhoto=null,draftAudio=null,draftArt=null,recording=null,recordStream=null,recordChunks=[],recordSession=0,transferToken=0,transferRunning=false,pendingRestore=null;
let draftPhotos=[],draftCover=0,detailId=null,detailViewer=null,detailCleanup=null,detailUpload=null,detailRevision=0,galleryWrites=Promise.resolve();
let draftBaseline=null,editorSaving=false,journalDeckIndex=0;
let draftStore=null,draftRecovery=null,draftsReady=false,recoveryFound=null,draftRecovered=false,draftSaved=false,baseDraftUpdatedAt=null,cameraIntent=null;
let draftClosing=Promise.resolve(),nativeDraftReady=Promise.resolve(),cameraInbox=[],cameraRecoveryWrites=Promise.resolve();
const closingDialogs=new Set();
const SEEDTIME=SAMPLE_TIMESTAMP;
const seeds=[
{id:'demo-coast',title:'Cannon Beach',address:'Oregon Coast, United States',category:'Nature',visited:'2026-09-22',rating:5,favorite:true,lat:45.8918,lng:-123.9615,notes:'Salt in the air. Sand in our shoes. Nowhere else we needed to be.\n\nWe stayed until the last of the light disappeared behind the rock.',sampleArt:'coast'},
{id:'demo-mountain',title:'A morning at Moraine Lake',address:'Banff National Park, Canada',category:'Travel',visited:'2026-08-14',rating:5,favorite:true,lat:51.3217,lng:-116.186,notes:'The lake was still enough to hold the mountains. We spoke quietly, as if we might wake them.',sampleArt:'mountain'},
{id:'demo-city',title:'Lost in Alfama',address:'Lisbon, Portugal',category:'Culture',visited:'2026-06-08',rating:4,favorite:false,lat:38.7111,lng:-9.1294,notes:'A wrong turn, a warm pastry, and a street we never wanted to leave. The best afternoon had no itinerary.',sampleArt:'city'}
].map(r=>({...r,updatedAt:SEEDTIME,photo:null,audio:null,phone:'',url:''}));
const date=s=>new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'));
const today=()=>{const n=new Date();return new Date(n.getTime()-n.getTimezoneOffset()*60000).toISOString().slice(0,10);};
const art=r=>{const view=placeView(r);return view.photo??`assets/${view.sampleArt??'blank'}.svg`;};
const photoAlt=record=>{const r=placeView(record);return r.photo?`Photograph of ${r.title}`:r.sampleArt?`Original illustration for ${r.title}`:'No photograph added yet';};
let restoreCommit=false,pendingMedia=0,micPending=false,cameraPending=false;
let pendingExport=null,exportSaving=false,exportCommit=false,transferAbort=null,activeReader=null;
let editorSession=0,photoReadVersion=0,gpsRequestVersion=0,pendingPhotoMetadata=null,locationPending=false;
function syncSave(){ $('save-place').disabled=micPending||pendingMedia>0||locationPending||cameraPending||recording?.state==='recording';for(const id of ['take-photo','photo-file','remove-photo'])$(id).disabled=cameraPending; scheduleDraft(); }
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5500);}
function dbOpen(){return new Promise((resolve,reject)=>{const req=indexedDB.open('nth-footprints',1);req.onupgradeneeded=()=>req.result.createObjectStore('journal');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Close other FootPrints tabs, then reload.'));});}
function dbGet(){return new Promise((resolve,reject)=>{const t=db.transaction('journal','readonly'),r=t.objectStore('journal').get('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function dbPut(nextRecords,nextSettings,clearDraftId=null,nextJourneys=journeys){return new Promise((resolve,reject)=>{const t=db.transaction('journal','readwrite');t.objectStore('journal').put({records:nextRecords,settings:nextSettings,journeys:nextJourneys},'state');if(clearDraftId)clearDraftInTransaction(t.objectStore('journal'),clearDraftId);t.oncomplete=resolve;t.onabort=()=>reject(t.error??Error('The journal could not be saved.'));t.onerror=()=>{};});}
async function commit(nextRecords,nextSettings=settings,clearDraftId=null,nextJourneys=journeys){const linked=reconcileJourneys(withoutStarterSamples(nextRecords),validateJourneys(nextJourneys));nextRecords=linked.records;nextJourneys=linked.journeys;if(!storageReady)throw Error('Local storage is unavailable. Reload after allowing storage to save changes.');try{await dbPut(nextRecords,nextSettings,clearDraftId,nextJourneys);}catch(e){throw Error(e.name==='QuotaExceededError'?'This device is out of storage. Your previous journal is intact. Create a backup and free some space.':e.message);}records=nextRecords;settings=nextSettings;journeys=nextJourneys;applyTheme();render();void widgetSync.refresh(records);}
let journalWrites=Promise.resolve();
function changeJournal(transform,preferences=current=>current,{clearDraftId=null,journeys:tripTransform=current=>current}={}){const write=journalWrites.then(()=>commit(transform(records),preferences(settings),clearDraftId,tripTransform(journeys)));journalWrites=write.catch(()=>{});return write;}
const widgetPlugin=device.native?window.NthNative?.FootprintWidget:null;
const widgetSync=createWidgetSync({plugin:widgetPlugin,onStatus:message=>{$('widget-status').textContent=message;}});
const widgetLaunch=createWidgetLaunch({plugin:widgetPlugin,
 canOpen:action=>storageReady&&draftsReady&&!(recoveryFound&&action?.action==='new')&&!navigation.busy&&!navigation.applying&&(!document.querySelector('dialog[open]')||(action?.action==='configure'&&document.querySelector('dialog[open]').id==='settings')),
 openJournal:()=>setView('journal'),newFootprint:()=>openEditor(),configureWidget:id=>openPreferences(id),
 openFootprint:async id=>{
  const record=records.find(r=>r.id===id);
  if(!record){toast('That footprint is no longer in your journal.');return;}
  query='';journeyFilter='';tagFilter='';explorationCountry='';explorationRegion='';category='All places';$('search').value='';await setView('journal');
  deckIndex=filtered().findIndex(r=>r.id===id);renderDeck(filtered());openDetail(id);
 },onError:toast
});
const widgetPreferences=createWidgetPreferences({plugin:widgetPlugin,refresh:()=>widgetSync.refresh(records),onState:renderWidgetPreferences,onStatus:message=>{$('widget-status').textContent=message;}});
function openPreferences(widgetId=null){show('settings');if(widgetPlugin)void widgetPreferences.load(widgetId);}
const journeyUI=createJourneysUI({document,getState:()=>({records,journeys}),write:({records:transform=current=>current,journeys:trips=current=>current})=>changeJournal(transform,undefined,{journeys:trips}),onOpen:openDetail,onBrowse:id=>browseJourney(id,'journal'),onMap:id=>browseJourney(id,'map'),onStatus:toast,onBook:id=>openMemoryExport({kind:'trip',tripId:id}),confirm:message=>confirm(message),date,art});
const placesUI=createPlacesUI({document,L:window.L,offlineMaps,getRecords:()=>records,locate:()=>device.currentPosition(),icon,onPreview:()=>show('place-preview'),onSave:(prefill,id)=>openEditor(id??null,null,id?'new':null,prefill),onSaved:async id=>{close('place-preview');await navigation.idle();await openDetail(id);},onStatus:toast});
async function browseFavorites(){close('journal-tools');await navigation.idle();if($('settings').open){close('settings');await navigation.idle();}query='';journeyFilter='';tagFilter='';explorationCountry='';explorationRegion='';category='All places';$('search').value='';await setView('favorites');render();}
function openJourneys(){journeyUI.open();show('journeys');}
async function browseJourney(id,next){close('journeys',{force:true});await navigation.idle();journeyFilter=id;query='';category='All places';$('search').value='';deckIndex=0;await setView(next);render();}
function renderJourneyFilter(){if(journeyFilter&&!journeys.some(j=>j.id===journeyFilter&&!j.deleted))journeyFilter='';$('journey-filter').innerHTML='<option value="">All footprints</option>'+activeJourneys(journeys).map(j=>`<option value="${esc(j.id)}">${esc(j.title)}</option>`).join('');$('journey-filter').value=journeyFilter;}
function selectedDraftTrips(){return [...$('place-trips').querySelectorAll('input:checked')].map(input=>input.value);}
function renderEditorTrips(ids=[]){const chosen=new Set(ids),trips=activeJourneys(journeys);$('place-trips').innerHTML=trips.map(j=>`<label class="checkbox"><input type="checkbox" name="tripIds" value="${esc(j.id)}" ${chosen.has(j.id)?'checked':''}>${esc(j.title)}</label>`).join('')||'<p class="field-help">Create a trip with Trips & journeys, then add footprints here or from the trip.</p>';}
let toolsUI;
const nearbyMemories=createNearbyMemories({watch:(...args)=>device.watchPositions(...args),getRecords:()=>records.filter(r=>!isDemo(r)),today,storage:{getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)},onMatch:match=>{nearbyMatch={recordId:match.record.id,visitId:match.visit.id,metres:match.metres};renderNearbyBanner();},onState:state=>toolsUI?.renderNearby(state)});
const toolsState=()=>({records:records.filter(r=>!isDemo(r)),journeys,settings});
toolsUI=createJournalToolsUI({document,getState:toolsState,write:changeJournal,onOpen:openDetail,onMap:showExploration,onImport:openBatchImport,onBook:()=>openMemoryExport({kind:'trip',tripId:journeyFilter}),nearby:nearbyMemories,today,date,art,onStatus:toast});
const batchUI=createBatchImportUI({document,getState:()=>({records,journeys}),write:changeJournal,read:asDataURL,today,lookupRegion:(point,options)=>regionLookup.lookup(point,options),onStatus:toast,confirm:message=>confirm(message),onSaved:async result=>{close('batch-import',{force:true});await navigation.idle();toast(`Imported ${result.added} new places and ${result.returns} return visits.`);}});
const exportsUI=createExportsUI({document,getState:()=>({records,journeys}),device,plugin:window.NthNative?.BackupFiles,picker:window.showSaveFilePicker?.bind(window),download,onStatus:toast});
function openJournalTools(tab='memories'){toolsUI.open(tab);show('journal-tools');}
function openBatchImport(){batchUI.open();show('batch-import');}
function openMemoryExport(target=exportTarget??{kind:'trip',tripId:journeyFilter}){exportTarget=target;exportsUI.open(target);show('memory-export');}
async function showExploration({country='',region=''}={}){if(!toolsUI.canClose())return;close('journal-tools',{force:true});await navigation.idle();if($('settings').open){close('settings');await navigation.idle();}journeyFilter='';tagFilter='';explorationCountry=country;explorationRegion=region;query='';category='All places';$('search').value='';await setView('map');render();}
function renderToolFilters(){
 const tagNames=new Map();for(const tag of records.flatMap(r=>r.tags??[]))if(!tagNames.has(tag.toLocaleLowerCase()))tagNames.set(tag.toLocaleLowerCase(),tag);const tags=[...tagNames.values()].sort((a,b)=>a.localeCompare(b));if(tagFilter)tagFilter=tagNames.get(tagFilter.toLocaleLowerCase())??'';
 $('tag-filter').innerHTML='<option value="">All tags</option>'+tags.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');$('tag-filter').value=tagFilter;
 for(const [id,values]of [['journal-tags',tags],['journal-countries',[...new Set(records.map(r=>r.country).filter(Boolean))]],['journal-regions',[...new Set(records.map(r=>r.region).filter(Boolean))]]])$(id).innerHTML=values.map(t=>`<option value="${esc(t)}"></option>`).join('');
 $('clear-exploration').hidden=!explorationCountry&&!explorationRegion;$('clear-exploration').textContent=[explorationRegion,explorationCountry].filter(Boolean).join(', ')+' · Clear map filter';
 const memories=settings.memories===false?[]:anniversaryMemories(records.filter(r=>!isDemo(r)),today());$('memory-banner').hidden=!memories.length||view==='places';$('memory-banner-title').textContent=memories.length===1?`${memories[0].record.title} · ${memories[0].years} ${memories[0].years===1?'year':'years'} ago`:`${memories.length} memories from this day`;
 toolsUI.refresh();
}
function renderNearbyBanner(){const record=nearbyMatch&&records.find(r=>r.id===nearbyMatch.recordId),visit=record&&visitById(record,nearbyMatch.visitId);if(!visit)nearbyMatch=null;$('nearby-memory-banner').hidden=!visit||view==='places';if(!visit)return;$('nearby-memory-title').textContent=record.title;$('nearby-memory-copy').textContent=`About ${Math.round(nearbyMatch.metres)} metres away · remembered ${date(visit.visited)}`;}
function renderWidgetPreferences({widgets,busy,focusId}){
 const places=records.map(placeView).sort((a,b)=>a.title.localeCompare(b.title));
 $('widget-list').innerHTML=widgets.length?widgets.map((widget,i)=>{
  const missing=widget.recordId&&!places.some(r=>r.id===widget.recordId),id=`widget-choice-${widget.widgetId}`;
  return `<div class="widget-choice ${widget.widgetId===focusId?'widget-target':''}"><label for="${id}">Widget ${i+1}</label><select id="${id}" ${busy?'disabled':''}><option value="" ${widget.recordId?'':'selected'}>Latest visit · follows your journal</option>${missing?`<option value="${esc(widget.recordId)}" selected disabled>Footprint no longer in journal</option>`:''}${places.map(r=>`<option value="${esc(r.id)}" ${r.id===widget.recordId?'selected':''}>${esc(r.title)} · ${esc(date(latestVisited(r)))}</option>`).join('')}</select><button class="secondary" data-widget-save="${widget.widgetId}" ${busy?'disabled':''}>Save choice</button></div>`;
 }).join(''):`<p class="field-help">${busy?'Loading your widgets…':'Add a widget to your home screen, then tap Choose on it to set a footprint.'}</p>`;
 $('widget-list').querySelectorAll('[data-widget-save]').forEach(button=>{button.onclick=()=>{const id=Number(button.dataset.widgetSave),recordId=$(`widget-choice-${id}`).value;if(!recordId||records.some(r=>r.id===recordId))void widgetPreferences.select(id,recordId);};});
 if(focusId&&!busy){const select=$(`widget-choice-${focusId}`);select?.closest('.widget-choice').scrollIntoView({block:'nearest'});select?.focus({preventScroll:true});}
}
async function pinWidget(){
 $('pin-widget').disabled=true;
 try{
  await widgetSync.refresh(records);
  const result=await widgetPlugin.requestPin();
  $('widget-status').textContent=result.requested?'Finish adding the widget in Android’s home-screen prompt.':'Long-press your Android home screen, choose Widgets, then Nth FootPrints.';
 }catch{$('widget-status').textContent='Long-press your Android home screen, choose Widgets, then Nth FootPrints.';}
 finally{$('pin-widget').disabled=false;}
}
function applyTheme(){document.documentElement.classList.toggle('night',settings.theme==='night');$('theme').value=settings.theme;}
function filtered(){return filterRecords(scopeRecords(records,{tripId:journeyFilter,tag:tagFilter,country:explorationCountry,region:explorationRegion}),{query,category,sort,favorites:view==='favorites'}).map(placeView);}
let deckMotion=0,deckBusy=false,deckAnimations=[];
function cancelDeckMotion(){deckMotion++;deckBusy=false;deckAnimations.forEach(a=>a.cancel());deckAnimations=[];}
function photoCard(r,index,total,layer=0){return `<button class="photo-card ${layer?'deck-rear deck-layer-'+layer:'deck-front'}" ${layer?'tabindex="-1" aria-hidden="true"':`data-detail="${esc(r.id)}" aria-label="Open ${esc(r.title)}. ${total-index} of ${total} places. Swipe up or down to browse."`}><img class="card-image" src="${art(r)}" alt="${layer?'':esc(photoAlt(r))}" draggable="false"><strong>${esc(r.title)}</strong><span class="card-caption"><span>${esc(date(latestVisited(r)))}</span><span>${String(total-index).padStart(2,'0')} / ${String(total).padStart(2,'0')} places</span></span></button>`;}
function updateRearCards(step=1){const items=filtered();document.querySelectorAll('#deck .deck-rear').forEach((el,i)=>{const index=wrappedIndex(deckIndex,(i+1)*step,items.length);el.outerHTML=photoCard(items[index],index,items.length,i+1);});}
function previewDeck(dy){if(deckBusy)return;const front=$('deck').querySelector('.deck-front');if(!front)return;const direction=dy<0?1:-1;if($('deck').dataset.direction!==String(direction)){updateRearCards(direction);$('deck').dataset.direction=String(direction);}front.style.transform=dragTransform(dy);$('deck').classList.add('dragging');}
function resetDeck(){const front=$('deck').querySelector('.deck-front');$('deck').classList.remove('dragging');if(front&&!deckBusy)front.style.transform='';}
function render(){
 renderJourneyFilter();journeyUI.refresh();renderToolFilters();renderNearbyBanner();
 cancelDeckMotion();
 $('fav-count').textContent=records.filter(r=>r.favorite).length;
 document.querySelectorAll('[data-view]').forEach(e=>{e.classList.toggle('active',e.dataset.view===view);e.setAttribute('aria-current',e.dataset.view===view?'page':'false');});

 const items=filtered();deckIndex=Math.min(Math.max(0,deckIndex),Math.max(0,items.length-1));
 $('journal-view').hidden=view!=='journal'||!items.length;$('favorites-view').hidden=view!=='favorites'||!items.length;$('map-view').hidden=view!=='map';$('places-view').hidden=view!=='places';$('journal-controls').hidden=view==='places';$('empty').hidden=items.length>0||view==='map'||view==='places';
 const hasFilter=query||journeyFilter||tagFilter||explorationCountry||explorationRegion||category!=='All places';$('empty-title').textContent=hasFilter?'No footprints here just yet.':view==='favorites'?'Keep your favorites close.':'Your next story starts here.';$('empty-copy').textContent=hasFilter?'Try another search, category, trip or tag.':view==='favorites'?'Tap the heart on a footprint to collect it here.':'Save a place, a photo, and a little of how it felt.';
 if(view==='journal'&&items.length)renderDeck(items);
 if(view==='favorites'){$('favorites-title').textContent=view==='favorites'?'A little more than a place.':'Every footprint tells a story.';$('favorites-count').textContent=`${items.length} ${items.length===1?'memory':'memories'}`;$('place-grid').innerHTML=items.map(r=>`<button class="grid-card" data-detail="${esc(r.id)}"><img src="${art(r)}" alt="${esc(photoAlt(r))}" loading="lazy">${r.favorite?'<span class="heart-corner" aria-label="Favorite">♥</span>':''}<h3>${esc(r.title)}</h3><p>${esc(r.address||r.category)}</p><span class="card-caption"><span>${esc(date(latestVisited(r)))}</span><span>${esc(r.category)}</span></span></button>`).join('');}
 if(view==='map')renderMap(items);placesUI.refresh();
 icons();
}
function renderDeck(items){
 const r=items[deckIndex];$('deck-count').textContent=`${String(items.length-deckIndex).padStart(2,'0')} / ${String(items.length).padStart(2,'0')}`;
 $('deck').classList.remove('dragging');$('deck').dataset.direction='1';
 $('deck').innerHTML=[...Array(Math.min(items.length,3))].map((_,layer)=>{const index=wrappedIndex(deckIndex,layer,items.length);return photoCard(items[index],index,items.length,layer);}).join('');
 $('deck-status').textContent=`${r.title}. Place ${items.length-deckIndex} of ${items.length}.`;
 $('previous').disabled=items.length<2;$('next').disabled=items.length<2;

}
function directions(r){return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.lat!==null?`${r.lat},${r.lng}`:r.address||r.title)}`;}
const nearby=createNearbyLookup({locate:()=>device.currentPosition(),
 onChange:origin=>{nearbyOrigin=origin;$('clear-nearby').hidden=!origin;if(view==='map')renderMapList(filtered());},
 onStatus:message=>{$('nearby-status').textContent=message;},
 onBusy:busy=>{$('nearest-places').disabled=busy;$('nearest-places').textContent=busy?'Locating…':'Nearest to me';$('clear-nearby').hidden=!busy&&!nearbyOrigin;}
});
function mapDisplayRecords(items){
 if(!mapVisit)return items;const place=records.find(r=>r.id===mapVisit.recordId),visit=place&&visitById(place,mapVisit.visitId);
 if(!visit){mapVisit=null;return items;}const chosen=visitView(place,visit.id);
 return items.map(r=>r.id===place.id?{...r,lat:chosen.lat,lng:chosen.lng,photo:chosen.photo,photos:chosen.photos,coverIndex:chosen.coverIndex,visited:chosen.visited}:r);
}
function renderMapList(items){
 items=mapDisplayRecords(items);
 if(!items.some(r=>r.id===mapId&&hasLocation(r)))mapId=null;
 const pinned=items.filter(hasLocation),missing=items.length-pinned.length;
 $('atlas-count').textContent=`${pinned.length} pinned ${pinned.length===1?'place':'places'}${missing?` · ${missing} without a location`:''}`;
 $('fit-places').disabled=!pinned.length;
 const ranked=nearbyOrigin?nearestPlaces(items,nearbyOrigin):[],distances=new Map(ranked.map(p=>[p.record.id,p.km]));
 const listed=nearbyOrigin?[...ranked.map(p=>p.record),...items.filter(r=>!hasLocation(r))]:items;
 $('map-list').innerHTML=listed.length?listed.map(r=>`<button class="map-place ${r.id===mapId?'selected':''}" ${hasLocation(r)?`data-map="${esc(r.id)}" aria-pressed="${r.id===mapId}" aria-label="Show ${esc(r.title)} on map"`:`data-edit="${esc(r.id)}" aria-label="Add location to ${esc(r.title)}"`}><img src="${art(r)}" alt="" loading="lazy"><span><strong>${esc(r.title)}</strong><small>${esc(r.address||r.category)}</small>${distances.has(r.id)?`<small class="map-distance">${esc(distanceLabel(distances.get(r.id)))} away</small>`:''}${hasLocation(r)?'':'<small class="map-missing">Add a location</small>'}</span></button>`).join(''):'<p class="field-help">No places match this view.</p>';
 const r=pinned.find(r=>r.id===mapId);$('map-selection').hidden=!r;
 $('map-selection').innerHTML=r?`<strong>${esc(r.title)}</strong><div class="detail-actions"><button class="secondary" data-detail="${esc(r.id)}">Open footprint</button><a class="primary" href="${directions(r)}" target="_blank" rel="noopener noreferrer">Directions ${icon('external')}</a></div>`:'';
}
function renderMap(items){
 items=mapDisplayRecords(items);renderMapList(items);
 if(!atlas)atlas=createAtlas({container:$('map-content'),L:window.L,offlineMaps,pinHTML:icon('footprint'),
  onPick:id=>{mapId=id;renderMapList(filtered());openDetail(id,mapVisit?.recordId===id?mapVisit.visitId:undefined);},
  onStatus:({state,message})=>{$('map-status').textContent=message;$('retry-map').hidden=state!=='error';}
 });
 atlas.update(items,{selectedId:mapId});syncMapVisibility();
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
const navigation=createNavigation({history:window.history,location:window.location,events:window,
 apply:applyNavigation,canLeave:canLeaveNavigation,onError:toast,onSettled:()=>widgetLaunch.flush(),
 onRoot:()=>{if(device.native)window.NthNative?.App?.minimizeApp().catch(()=>toast('Could not return to the home screen.'));}
});
function editorSnapshot(){return {fields:JSON.stringify([...new FormData($('place-form')).entries()]),favorite:$('favorite').checked,photo:draftPhoto,photos:draftPhotos.slice(),cover:draftCover,audio:draftAudio,art:draftArt};}
function editorDirty(){
 if(!$('editor').open||!draftBaseline)return false;
 if(draftRecovered||pendingMedia||micPending||cameraPending||locationPending||recording?.state==='recording')return true;
 const next=editorSnapshot();return ['fields','favorite','photo','cover','audio','art'].some(key=>next[key]!==draftBaseline[key])||next.photos.length!==draftBaseline.photos.length||next.photos.some((photo,i)=>photo!==draftBaseline.photos[i]);
}
function canLeaveNavigation(previous,next){
 const removed=previous.dialogs.filter(item=>!next.dialogs.some(target=>target.id===item.id&&target.recordId===item.recordId&&target.visitId===item.visitId));
 for(const [id,ui]of [['journal-tools',toolsUI],['batch-import',batchUI],['memory-export',exportsUI]])if(removed.some(item=>item.id===id)&&!ui.canClose())return false;
 if(removed.some(item=>item.id==='journeys')&&!journeyUI.canClose())return false;
 if(removed.some(item=>item.id==='editor')){
  if(editorSaving){toast('Saving your footprint. Please wait.');return false;}
  if(editorDirty()&&!confirm('Discard your unsaved footprint changes?'))return false;
 }
 if(removed.some(item=>item.id==='offline-maps')&&offlineMaps.phase!=='idle'){
  offlineMaps.cancel();toast('Finishing or cancelling the map download safely. Please wait.');return false;
 }
 if(removed.some(item=>item.id==='backup')){
  if(restoreCommit||exportCommit){toast('Finishing your transfer. Please wait.');return false;}
  if(transferRunning){cancelTransfer();if(transferRunning){toast('Cancelling your transfer safely. Please wait.');return false;}}
 }
 return true;
}
function applyView(next){
 if(view==='places'&&next!=='places')placesUI.setActive(false);
 if(view==='journal')journalDeckIndex=deckIndex;
 cancelDeckMotion();if(next!=='map'){mapVisit=null;atlas?.setVisible(false);nearby.cancel();}
 view=next;deckIndex=next==='journal'?journalDeckIndex:0;render();if(next==='places')placesUI.setActive(true);
}
function setView(next){return navigation.view(next);}
function syncMapVisibility(){const clear=!mapsPaused&&!document.hidden&&!document.querySelector('dialog[open]');atlas?.setVisible(view==='map'&&clear);placesUI.syncVisibility(clear,mapsPaused);detailMap?.setVisible(!mapsPaused&&!document.hidden&&$('details').open&&![...document.querySelectorAll('dialog[open]')].some(d=>d.id!=='details'));}
function show(id){if(navigation.busy&&!navigation.applying)return;if(!$(id).open)$(id).showModal();navigation.opened({id,...(id==='details'?{recordId:detailId}:id==='editor'?{recordId:editId,...(editVisitId?{visitId:editVisitId}:{})}:{} )});syncMapVisibility();}
function cleanupDialog(id){
 if(id==='photo-lightbox')photoLightbox.reset();
 if(id==='place-preview')placesUI.closePreview();if(id==='journal-tools')toolsUI.reset();if(id==='batch-import')batchUI.reset();if(id==='memory-export')exportsUI.reset();
 if(id==='journeys')journeyUI.reset();
 if(id==='pin-picker')closePicker();
 if(id==='editor'){
  finishEditorDraft();
  if($('pin-picker').open)closeRaw('pin-picker');
  editorSession++;photoReadVersion++;gpsRequestVersion++;locationPending=false;draftBaseline=null;
  syncSave();$('audio-preview').pause();stopRecording(true);
 }
 if(id==='details'){
  detailMap?.destroy();detailMap=null;detailRevision++;detailViewer?.destroy();detailCleanup?.();detailViewer=null;detailCleanup=null;detailUpload?.abort();detailId=null;detailVisitId=null;
  $('details').querySelectorAll('audio').forEach(audio=>audio.pause());
 }
 if(id==='backup'){cancelTransfer();pendingRestore=null;}
}
function closeRaw(id){if(!$(id).open)return;cleanupDialog(id);closingDialogs.add(id);$(id).close();syncMapVisibility();}
function close(id,{force=false}={}){
 if(!$(id).open)return;
 if(navigation.route()?.dialogs.at(-1)?.id!==id)return;
 navigation.back({force});
}
function openBackup(){
 if(!transferRunning){setTransferDialog();$('restore-preview').hidden=true;$('backup-status').textContent='';pendingRestore=null;$('transfer').hidden=true;$('backup').classList.remove('transfer-active');}
 show('backup');
}
async function applyNavigation(route,previous){
 const next=navigationRoute(route);
 const missing=next.dialogs.findIndex(item=>['details','editor'].includes(item.id)&&item.recordId&&(!records.some(r=>r.id===item.recordId)||(item.id==='editor'&&item.visitId&&item.visitId!=='new'&&!visitById(records.find(r=>r.id===item.recordId),item.visitId))));
 if(missing>=0){next.dialogs=next.dialogs.slice(0,missing);navigation.replaceRoute(next);toast('That footprint is no longer in your journal.');}
 for(const item of [...previous.dialogs].reverse()){
  if(!next.dialogs.some(target=>target.id===item.id&&target.recordId===item.recordId&&target.visitId===item.visitId))closeRaw(item.id);
 }
 if(next.view!==view)applyView(next.view);
 for(const item of next.dialogs){
  if(item.id==='details'){
   const returning=previous.dialogs.at(-1)?.id==='editor'&&next.dialogs.at(-1)?.id==='details';
   if(!$('details').open||detailId!==item.recordId||returning){const scroll=$('details').scrollTop;await openDetail(item.recordId);if(returning)$('details').scrollTop=scroll;}
  }else if(item.id==='editor'){
   if(!$('editor').open||editId!==item.recordId||editVisitId!==(item.visitId??null))await openEditor(item.recordId,null,item.visitId??null);
  }else if(item.id==='pin-picker'){if(!$('pin-picker').open)openPicker();}
  else if(item.id==='photo-lightbox'){if(!$('photo-lightbox').open&&!openEnlargedPhoto()){navigation.replaceRoute({...next,dialogs:next.dialogs.slice(0,next.dialogs.indexOf(item))});toast('This photo is no longer available.');}}
  else if(item.id==='backup'){if(!$('backup').open)openBackup();}
  else if(item.id==='settings'){if(!$('settings').open)openPreferences();}
  else if(item.id==='place-preview'){if(!$('place-preview').open){show('place-preview');placesUI.resumePreview();}}
  else if(item.id==='journal-tools'){if(!$('journal-tools').open)openJournalTools();}
  else if(item.id==='batch-import'){if(!$('batch-import').open)openBatchImport();}
  else if(item.id==='memory-export'){if(!$('memory-export').open)openMemoryExport();}
  else if(item.id==='journeys'){if(!$('journeys').open)openJourneys();}
  else if(item.id==='offline-maps'){if(!$('offline-maps').open)openOfflineMaps();}
  else if(!$(item.id).open)show(item.id);
 }
}
async function showVisitOnMap(id,visitId){
 await galleryWrites;await journalWrites;
 const record=records.find(r=>r.id===id),visit=record&&visitById(record,visitId);
 if(!visit||!hasLocation(visitView(record,visitId)))return;
 while(navigation.route().dialogs.length){const before=navigation.route().dialogs.length;close(navigation.route().dialogs.at(-1).id);await navigation.idle();if(navigation.route().dialogs.length>=before)return;}
 query='';category='All places';journeyFilter='';tagFilter='';explorationCountry='';explorationRegion='';$('search').value='';
 mapId=id;mapVisit={recordId:id,visitId};await setView('map');render();atlas?.select(id,{focus:true});$('map-content').scrollIntoView({block:'start'});
}
async function openDetail(id,visitId=undefined){
 const request=++detailRevision;detailUpload?.abort();await galleryWrites;await journalWrites;if(request!==detailRevision)return;
 detailMap?.destroy();detailMap=null;detailViewer?.destroy();detailCleanup?.();detailViewer=null;detailCleanup=null;
 const place=records.find(x=>x.id===id);if(!place)return;const previous=visitId===undefined&&detailId===id?detailVisitId:visitId;const scoped=filtered().find(row=>row.id===id),visitIds=scoped?.matchingVisitIds;const visits=visitsOf(place),selected=(previous?visitById(place,previous):null)??(visitIds?visits.find(v=>visitIds.includes(v.id)):null)??(journeyFilter?visits.find(v=>v.tripIds?.includes(journeyFilter)):null)??visits[0];if(!selected)return;const r=visitView(place,selected.id);detailId=id;detailVisitId=selected.id;
 $('details-content').innerHTML=`<button class="icon-button detail-top-close" data-close="details" aria-label="Close memory">${icon('close')}</button><div id="detail-carousel" class="detail-carousel" tabindex="0" role="region" aria-label="Footprint photos. Swipe left or right to browse."><img id="detail-image" class="detail-photo" src="${art(r)}" alt="${esc(photoAlt(r))}" draggable="false"><button class="icon-button photo-previous" id="photo-previous" aria-label="Previous photo" ${photosOf(r).length<2?'hidden':''}>${icon('arrowLeft')}</button><button class="icon-button photo-next" id="photo-next" aria-label="Next photo" ${photosOf(r).length<2?'hidden':''}>${icon('arrowRight')}</button><button type="button" id="enlarge-detail" class="icon-button photo-expand" aria-label="Enlarge photo" title="Enlarge photo" ${photosOf(r).length?'':'hidden'}>${icon('expand')}</button><span id="photo-position" class="photo-position" aria-live="polite"></span></div><div class="detail-content"><div class="memory-top"><span class="eyebrow">${esc(r.category)}${isDemo(r)?' · ILLUSTRATED SAMPLE':''}</span><button class="favorite-btn ${r.favorite?'on':''}" data-favorite="${esc(r.id)}" aria-label="Toggle favorite" aria-pressed="${r.favorite}">${icon('heart')}</button></div><h2>${esc(r.title)}</h2><p class="address-line">${icon('location')}${esc(r.address||'A place of your own')}</p><section class="visit-history" aria-label="Visits to this place"><div class="visit-heading"><span class="eyebrow">${visits.length} ${visits.length===1?'VISIT':'VISITS'} · ONE PLACE</span><button class="secondary" id="add-return-visit">${icon('plus')}Log return visit</button></div><label for="visit-choice">Choose a visit</label><select id="visit-choice">${visits.map((v,i)=>`<option value="${esc(v.id)}" ${v.id===selected.id?'selected':''}>${esc(date(v.visited))} · Visit ${visits.length-i}${v.id===INITIAL_VISIT?' · Original entry':''}${v.notes?' · '+esc(v.notes.slice(0,55).replace(/\s+/g,' ')):''}</option>`).join('')}</select><div class="visit-tools"><button type="button" class="text-button delete-button" id="delete-visit" ${visits.length<2?'disabled':''}>Delete this visit</button></div></section><div class="rating-line"><span class="stars" aria-label="${r.rating} out of 5 stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span><span>${date(r.visited)}</span></div>${r.tripIds?.length?`<p class="journey-labels">${r.tripIds.map(id=>journeys.find(j=>j.id===id&&!j.deleted)?.title).filter(Boolean).map(esc).join(' · ')}</p>`:''}${r.tags?.length?`<div class="tool-labels">${r.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}${r.country||r.region?`<p class="field-help">${esc([r.region,r.country].filter(Boolean).join(', '))}</p>`:''}<p class="story">${esc(r.notes||'No note added yet.')}</p>${r.audio?`<audio controls src="${r.audio}" aria-label="Voice note"></audio>`:''}<div class="detail-extra">${r.phone?`<a href="tel:${esc(r.phone.replace(/[^+\d*#,;]/g,''))}">${esc(r.phone)}</a>`:''}${r.url?`<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Visit website ${icon('external')}</a>`:''}</div>${hasLocation(r)?`<section class="visit-location" aria-label="Visit location"><p class="field-help">${r.lat.toFixed(6)}°, ${r.lng.toFixed(6)}°</p><div class="visit-map-preview"><div id="visit-map" class="visit-map" aria-label="Map preview of ${esc(r.title)}"></div><button type="button" id="visit-map-open" class="visit-map-open" aria-label="Show ${esc(r.title)} in Map and directions"><span>${icon('map')}Open in Map & directions ${icon('arrowRight')}</span></button></div><p id="visit-map-status" class="field-help" role="status"></p></section>`:''}<section class="footprint-gallery" aria-label="Footprint photos"><div class="gallery-heading"><span class="eyebrow">PHOTOS <span id="gallery-count"></span></span><label class="secondary file-button gallery-upload">${icon('plus')}Upload more photos<input id="gallery-files" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Upload more photos to this footprint"></label></div><div id="gallery-thumbs" class="gallery-thumbs"></div><p class="field-help" id="gallery-status" role="status">Swipe the photo above. The one you leave selected becomes the main photo.</p><p class="field-help">Up to ${MAX_PHOTOS} photos · 20 MB each. Full journal backups support up to 150 MB.</p></section>${r.placeSource?`<p class="field-help">Place details © <a href="${placeSourceURL(r.placeSource)}" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>${isGeoapifySource(r.placeSource)?' · <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Powered by Geoapify</a>':''}</p>`:''}<div class="detail-actions"><button class="primary" data-edit="${esc(r.id)}" data-edit-visit="${esc(selected.id)}">${icon('edit')}Edit place & visit</button><a class="secondary" href="${directions(r)}" target="_blank" rel="noopener noreferrer">${icon('navigation')}Directions</a><button class="secondary" data-export-photo="${esc(r.id)}" ${r.photo?'':'disabled title="Add a photograph to export it"'}>${icon('download')}Export Photo</button><button type="button" class="secondary" id="share-memory">Memory card</button><button type="button" class="secondary" id="export-geotagged" ${r.photo&&Number.isFinite(r.lat)&&Number.isFinite(r.lng)?'':'disabled title="This visit needs a photo and coordinates"'}>Geotagged photo copy</button><button class="secondary delete-button" data-delete="${esc(r.id)}" aria-label="Delete place ${esc(r.title)} and all visits">${icon('trash')}</button></div></div>`;
 if(!$('details').open)show('details');
 if(hasLocation(r)){detailMap=createVisitMap({container:$('visit-map'),record:r,L:window.L,offlineMaps,pinHTML:icon('footprint'),onStatus:({state,message})=>{if(detailId===id&&detailVisitId===selected.id)$('visit-map-status').textContent=state==='ready'?'':message;}});$('visit-map-open').onclick=()=>void showVisitOnMap(id,selected.id).catch(error=>toast(error.message));syncMapVisibility();}
 setupDetailGallery(r);
 $('visit-choice').onchange=e=>void openDetail(id,e.target.value).catch(error=>toast(error.message));
 $('add-return-visit').onclick=()=>openEditor(id,null,'new');

 $('share-memory').onclick=()=>openMemoryExport({kind:'card',recordId:id,visitId:selected.id});$('export-geotagged').onclick=()=>openMemoryExport({kind:'geotag',recordId:id,visitId:selected.id});
 $('delete-visit').onclick=()=>deleteSavedVisit(id,selected.id);
}
function setupDetailGallery(record){
 const id=record.id,visitId=record.visitId??INITIAL_VISIT,revision=detailRevision,photos=photosOf(record),carousel=$('detail-carousel');
 $('gallery-count').textContent=`· ${photos.length}`;
 $('gallery-thumbs').innerHTML=photos.map((src,i)=>`<button type="button" data-photo-index="${i}" aria-label="Make photo ${i+1} the main photo" aria-pressed="false"><img src="${src}" alt="" loading="lazy" decoding="async"></button>`).join('');
 const current=()=>revision===detailRevision&&detailId===id&&$('details').open;
 detailViewer=createPhotoViewer({record,
  save:photo=>changeJournal(rows=>rows.map(r=>{
   if(r.id!==id)return r;
   return changeVisit(r,visitId,view=>selectPhoto(view,photosOf(view).indexOf(photo)),{main:true});
  })),
  onChange:({index,total,photo})=>{
   if(!current())return;const image=$('detail-image'),changed=image.getAttribute('src')!==photo;
   image.src=photo??art(record);if(changed)detailMap?.update({...record,photo,photos:photo?[photo]:[],coverIndex:0});image.alt=photo?`Photo ${index+1} of ${total} of ${record.title}`:photoAlt(record);
   if(changed&&photo&&image.animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)image.animate([{opacity:.55},{opacity:1}],{duration:180});
   $('photo-position').textContent=total?`${index+1} / ${total}`:'';
   document.querySelectorAll('[data-photo-index]').forEach(button=>button.setAttribute('aria-pressed',Number(button.dataset.photoIndex)===index?'true':'false'));
  },
  onStatus:message=>{if(current())$('gallery-status').textContent=message||'The selected photo is your main journal photo.';},onError:toast
 });
 const move=step=>{if(!current())return;galleryWrites=detailViewer.move(step)??Promise.resolve();};
 $('enlarge-detail').onclick=openEnlargedPhoto;
 $('photo-previous').onclick=()=>move(-1);$('photo-next').onclick=()=>move(1);
 carousel.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();move(e.key==='ArrowLeft'?-1:1);}};
 detailCleanup=bindPhotoSwipe(carousel,{move});
 $('gallery-files').onchange=e=>uploadDetailPhotos([...e.target.files],id,revision,visitId);
}
async function uploadDetailPhotos(files,id,revision,visitId=INITIAL_VISIT){
 if(!files.length||detailUpload)return;const abort=new AbortController();detailUpload=abort;
 const current=()=>revision===detailRevision&&detailId===id&&$('details').open;
 $('gallery-files').disabled=true;
 try{
  await galleryWrites;
  const images=await readGalleryFiles(files,{read:asDataURL,signal:abort.signal,onProgress:(done,total)=>{if(current())$('gallery-status').textContent=`Reading photos · ${done} of ${total}`;}});
  if(!current()||abort.signal.aborted)return;
  $('gallery-status').textContent='Saving photos…';
  await changeJournal(rows=>{
   if(!rows.some(r=>r.id===id))throw Error('This footprint is no longer available.');
   return rows.map(r=>r.id===id?changeVisit(r,visitId,view=>addPhotos(view,images)):r);
  });
  if(current()){const scroll=$('details').scrollTop;await openDetail(id,visitId);$('details').scrollTop=scroll;$('gallery-status').textContent='Photos saved. Swipe the photo above to choose your main image.';}
 }catch(e){if(current()&&e.message!=='CANCELLED')$('gallery-status').textContent=e.message;}
 finally{if(detailUpload===abort)detailUpload=null;if(current()){$('gallery-files').disabled=false;$('gallery-files').value='';}}
}
function openEnlargedPhoto(){
 if(navigation.busy&&!navigation.applying)return false;
 const parent=navigation.route()?.dialogs.filter(d=>d.id!=='photo-lightbox').at(-1)?.id;
 let photos,index,title;
 if(parent==='editor'){photos=draftPhotos.slice();index=draftCover;title=$('title').value||'New footprint';}
 else if(parent==='details'){const place=records.find(r=>r.id===detailId),visit=place&&visitById(place,detailVisitId);if(!visit)return false;const r=visitView(place,visit.id);photos=photosOf(r);index=detailViewer?.getIndex()??coverOf(r);title=r.title;}
 else return false;
 if(!photos.length)return false;
 show('photo-lightbox');return photoLightbox.open({photos,index,title});
}
function chooseDraftPhoto(index){
 if(!draftPhotos[index]||cameraPending)return;
 draftCover=index;draftPhoto=draftPhotos[index];photoReadVersion++;gpsRequestVersion++;locationPending=false;
 pendingPhotoMetadata=null;$('photo-geotag').hidden=true;$('use-location').disabled=false;syncSave();refreshDraft();
}
function refreshDraft(){
 $('read-photo-geotag').hidden=!draftPhoto;$('enlarge-draft').hidden=!draftPhoto;
 $('draft-gallery').innerHTML=draftPhotos.length>1?draftPhotos.map((src,i)=>`<button type="button" data-draft-index="${i}" aria-label="Edit photo ${i+1}" aria-pressed="${i===draftCover}"><img src="${src}" alt="" loading="lazy"></button>`).join(''):'';
 const src=draftPhoto??(draftArt?`assets/${draftArt}.svg`:null);$('photo-preview').hidden=!src;$('photo-placeholder').hidden=!!src;$('remove-photo').hidden=!src;if(src)$('photo-preview').src=src;else $('photo-preview').removeAttribute('src');
 $('audio-preview').hidden=!draftAudio;$('remove-audio').hidden=!draftAudio;if(draftAudio)$('audio-preview').src=draftAudio;else{$('audio-preview').pause();$('audio-preview').removeAttribute('src');}
 scheduleDraft();
}
async function openEditor(id=null,recovered=null,visitId=null,prefill=null){
 await draftClosing;
 if(!draftsReady){toast('Preparing local draft recovery. Please try again in a moment.');return;}
 if(recoveryFound&&!recovered){toast('Resume or discard your unfinished footprint first.');$('draft-recovery').scrollIntoView?.({block:'center'});return;}
 const fromDetails=$('details').open,request=detailRevision;if(fromDetails)detailUpload?.abort();await galleryWrites;await journalWrites;
 if(fromDetails&&(!$('details').open||request!==detailRevision))return;
 if(!storageReady){toast('Local saving is unavailable. Check browser storage permissions and reload.');return;}
 if($('details').open)$('details').querySelectorAll('audio').forEach(audio=>audio.pause());
 editorSession++;photoReadVersion++;gpsRequestVersion++;locationPending=false;$('use-location').disabled=false;syncSave();pendingPhotoMetadata=null;$('photo-geotag').hidden=true;
 const place=id?records.find(x=>x.id===id):null;editVisitId=place?(recovered?.visitId??visitId):null;const existing=place&&editVisitId!=='new'?visitById(place,editVisitId??INITIAL_VISIT):null;if(place&&editVisitId!=='new'&&!existing){toast('This visit is no longer available.');return;}const r=place?(editVisitId==='new'?{...place,visited:today(),notes:'',rating:0,photo:null,photos:[],coverIndex:0,audio:null,sampleArt:null,tripIds:journeyFilter?[journeyFilter]:[]}:visitView(place,existing.id)):(prefill??null);draftSource=recovered?.placeSource??r?.placeSource??null;baseDraftUpdatedAt=place?.updatedAt??null;draftRecovered=!!recovered||!!prefill;draftSaved=false;cameraIntent=recovered?.camera??null;editId=r?.id??null;draftPhoto=r?.photo??null;draftAudio=r?.audio??null;draftArt=r?.sampleArt??null;draftPhotos=photosOf(r);draftCover=coverOf(r);
 $('country').innerHTML=countryOptions(recovered?.values.country??r?.country??'');regionRequest++;regionLabelVersion++;editorAutoLabels=null;$('region-status').textContent='';
 $('category').innerHTML=categoryChoices(recovered?.values.category??r?.category).map(c=>`<option>${esc(c)}</option>`).join('');$('place-form').reset();$('editor-title').textContent=editVisitId==='new'?'Another visit, another story.':r?'Edit this place & visit.':'A new footprint.';$('editor-visit-help').hidden=!place;$('editor-visit-help').textContent=place?'Date, rating, location, story, media and trips belong to this visit. Name, category, favorite, address, tags, country, region and contact details apply to the place.':' ';$('save-place').textContent=place?'Save visit':'Save footprint';
 for(const field of ['title','category','visited','rating','address','notes','phone','url','lat','lng','tags','country','region'])$(field).value=r?.[field]??({category:'Other',visited:today(),rating:0}[field]??'');
 $('tags').value=(r?.tags??[]).join(', ');
 $('recover-camera-photo').hidden=true;$('favorite').checked=r?.favorite??false;$('editor-error').textContent='';$('location-status').textContent='Add coordinates to put this footprint on the map.';$('record-status').textContent='Recording needs microphone access. You can also attach an audio file.';
 renderEditorTrips(r?.tripIds??(journeyFilter?[journeyFilter]:[]));refreshDraft();draftBaseline=editorSnapshot();
 if(recovered){
  for(const field of Object.keys(DRAFT_FIELDS))$(field).value=recovered.values[field];
  renderEditorTrips(recovered.tripIds??[]);$('favorite').checked=recovered.favorite;draftPhotos=recovered.photos.slice();draftCover=recovered.coverIndex;draftPhoto=draftPhotos[draftCover]??null;draftAudio=recovered.audio;draftArt=recovered.art;refreshDraft();
 }
 syncRegionFields($('country'),$('region'),$('region-choice'));
 draftRecovery.begin(recovered?.id);recoveryFound=null;$('draft-recovery').hidden=true;show('editor');
 if(prefill){scheduleDraft();await checkpointDraft();void fillEditorRegion();}
 if(recovered){scheduleDraft();await checkpointDraft();$('location-status').textContent=recovered.recoveredCamera?'Camera photo recovered. Add its location manually or tap Use my location for where you are now.':'Recovered unfinished footprint. Review it, then Save footprint.';await refreshReturnedCamera();}
}

function draftPosition(){
 const lat=$('lat').value.trim(),lng=$('lng').value.trim();
 const point={lat:lat===''?null:Number(lat),lng:lng===''?null:Number(lng)};
 return hasLocation(point)?point:null;
}
function setDraftPosition(point,message){
 gpsRequestVersion++;locationPending=false;$('use-location').disabled=false;syncSave();
 $('lat').value=point.lat.toFixed(6);$('lng').value=point.lng.toFixed(6);
 $('location-status').textContent=message;scheduleDraft();void fillEditorRegion();
}
async function fillEditorRegion(){
 const point=draftPosition();if(!point||!$('editor').open)return;const previous={country:$('country').value,region:$('region').value},automatic=editorAutoLabels&&previous.country===editorAutoLabels.country&&previous.region===editorAutoLabels.region;if(previous.country&&previous.region&&(!automatic||samePlacePoint(editorAutoLabels.point,point)))return;const base=automatic?{country:'',region:''}:previous;
 const request=++regionRequest,session=editorSession,labelsVersion=regionLabelVersion;
 const current=()=>request===regionRequest&&session===editorSession&&labelsVersion===regionLabelVersion&&$('editor').open&&samePlacePoint(point,draftPosition())&&!editorSaving;
 $('region-status').textContent='Finding country and state/province…';
 try{const labels=await regionLookup.lookup(point,{isCurrent:current});if(!current())return;const next=mergePlaceLabels(base,labels);editorAutoLabels=!base.country&&!base.region?{...next,point:{...point}}:null;$('country').innerHTML=countryOptions(next.country);$('country').value=next.country;$('region').value=next.region;syncRegionFields($('country'),$('region'),$('region-choice'));$('region-status').textContent=next.country!==previous.country||next.region!==previous.region?'Country/state filled from the chosen coordinates. Review or change these labels.':'Existing labels kept. Choose a state/province manually if needed.';scheduleDraft();}catch(error){if(current())$('region-status').textContent=error.message;}
}
function closePicker(){pickerRequest++;placeSearch.cancel();pickerPlace=null;picker?.destroy();picker=null;$('picker-locate').disabled=false;}
function openPicker(){
 if(!$('editor').open)return;
 gpsRequestVersion++;locationPending=false;$('use-location').disabled=false;syncSave();closePicker();
 $('picker-error').textContent='';$('place-query').value='';$('picker-fill-details').checked=true;show('pin-picker');
 picker=createPositionPicker({container:$('position-map'),L:window.L,offlineMaps,initial:draftPosition(),
  onChange:point=>{if(pickerPlace&&!samePlacePoint(point,pickerPlace.position))pickerPlace=null;renderPickerPlace();pickerRequest++;$('picker-locate').disabled=false;$('apply-position').disabled=!point;$('position-coordinates').textContent=point?`${point.lat.toFixed(6)}°, ${point.lng.toFixed(6)}°`:'Move or tap the map to choose a location.';},
  onStatus:({state,message})=>{$('picker-status').textContent=message;$('picker-retry').hidden=state!=='error';}
 });
}
async function locatePicker(){
 const instance=picker,request=++pickerRequest;$('picker-locate').disabled=true;$('picker-error').textContent='Finding your current location…';
 try{
  const p=await device.currentPosition();
  if(request!==pickerRequest||picker!==instance||!$('pin-picker').open)return;
  instance.setPosition({lat:p.coords.latitude,lng:p.coords.longitude});$('picker-error').textContent=`GPS accuracy about ${Math.round(p.coords.accuracy)} m. Adjust the map if needed.`;
 }catch{
  if(request===pickerRequest&&picker===instance)$('picker-error').textContent='Could not get your location. Turn on device Location and allow access, or choose a spot manually.';
 }finally{if(request===pickerRequest)$('picker-locate').disabled=false;}
}
function renderPlaceSearch({busy,results,status}){
 $('place-search-button').disabled=busy;$('place-search-cancel').hidden=!busy;$('place-search-status').textContent=status;
 $('place-results').innerHTML=results.map((result,i)=>`<li><button type="button" data-place-result="${i}"><strong>${esc(result.name)}</strong><span>${esc(result.address||`${result.position.lat.toFixed(6)}°, ${result.position.lng.toFixed(6)}°`)}</span><small>Preview on map</small></button></li>`).join('');
 $('place-results').querySelectorAll('[data-place-result]').forEach(button=>{button.onclick=()=>previewPlace(Number(button.dataset.placeResult));});
}
function renderPickerPlace(){
 $('picker-place').textContent=pickerPlace?`Previewing ${pickerPlace.name}. Check the pin, then choose Use this spot.`:'';
 $('picker-details-option').hidden=!pickerPlace;
}
function previewPlace(index){
 if(!$('pin-picker').open||!$('editor').open||!picker)return;
 const result=placeSearch.result(index);if(!result)return;
 pickerPlace=result;
 if(!picker.setPosition(result.position)){pickerPlace=null;$('place-search-status').textContent='The map could not preview that place. You can enter its coordinates manually.';}
 renderPickerPlace();$('position-map').scrollIntoView({block:'center',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$('position-map').focus({preventScroll:true});
}
function searchPlaces(event){event?.preventDefault();if(!$('pin-picker').open)return;$('place-query').blur();void placeSearch.search($('place-query').value);}
function applyPicker(){
 const point=picker?.getPosition();if(!point||!$('editor').open)return;
 setDraftPosition(point,'Location chosen on the map. Save the footprint to keep it.');
 if(pickerPlace&&samePlacePoint(point,pickerPlace.position)&&$('picker-fill-details').checked){
  if(!$('title').value.trim())$('title').value=pickerPlace.name;
  if(!$('address').value.trim())$('address').value=pickerPlace.address;
 }
 scheduleDraft();close('pin-picker',{force:true});
}
function renderReleases(){
 $('release-version').textContent=`NTH FOOTPRINTS · ${APP_VERSION}`;
 $('release-history').innerHTML=RELEASES.map(r=>`<li><div class="release-heading"><h3>Version ${esc(r.version)}</h3>${r.version===APP_VERSION?'<span class="release-current">Current</span>':''}</div><time datetime="${r.date}">${esc(date(r.date))}</time><p>${esc(r.summary)}</p></li>`).join('');
}
function asDataURL(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('This attachment could not be read.'));reader.readAsDataURL(file);});}
function offerPhotoMetadata(metadata){
 pendingPhotoMetadata=metadata;const box=$('photo-geotag');box.hidden=false;
 if(metadata.location){const {lat,lng}=metadata.location;
  box.innerHTML=`<span class="eyebrow">A LOCATION IN YOUR PHOTO</span><h3>Bring this place into your footprint.</h3><p>${lat.toFixed(6)}°, ${lng.toFixed(6)}°</p><p class="field-help">Apply these coordinates to the editor, then save the footprint to keep them.</p>${metadata.takenOn?`<label class="checkbox"><input type="checkbox" id="use-photo-date">Also use photo date: ${esc(date(metadata.takenOn))}</label>`:''}<div class="geotag-actions"><button type="button" class="primary" id="apply-photo-geotag">Use photo location</button><a class="text-button" href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}" target="_blank" rel="noopener noreferrer">Preview on map ${icon('external')}</a><button type="button" class="text-button" id="dismiss-photo-geotag">Dismiss</button></div>`;
 }else{
  const message=metadata.status==='malformed'?'The saved photo metadata could not be read. Your photo is still attached.':metadata.status==='unsupported'?'This photo format does not have a supported GPS reader yet.':'No GPS fields were found in the file supplied to FootPrints. A gallery or sharing app may remove location metadata; an estimated gallery location may also be separate from the file.';
  box.innerHTML=`<span class="eyebrow">PHOTO LOCATION</span><p>${message}</p><p class="field-help">Try choosing the original from Files / Images and allow photo-location access on Android. You can also choose a spot on the map or enter coordinates; use your current location only if this photo was taken where you are now.</p><button type="button" class="text-button" id="dismiss-photo-geotag">Dismiss</button>`;
 }
}
function applyPhotoLocation(){
 if(!pendingPhotoMetadata?.location)return;const {lat,lng}=pendingPhotoMetadata.location;gpsRequestVersion++;locationPending=false;$('use-location').disabled=false;syncSave();
 $('lat').value=lat.toFixed(6);$('lng').value=lng.toFixed(6);
 if($('use-photo-date')?.checked&&pendingPhotoMetadata.takenOn)$('visited').value=pendingPhotoMetadata.takenOn;
 $('location-status').textContent='Location taken from this photo. Save the footprint to keep it.';$('photo-geotag').hidden=true;pendingPhotoMetadata=null;scheduleDraft();void fillEditorRegion();
}
async function inspectSavedPhoto(){
 if(!draftPhoto)return;const session=editorSession,selection=++photoReadVersion;pendingMedia++;syncSave();$('read-photo-geotag').disabled=true;
 try{await tick();const payload=atob(draftPhoto.slice(draftPhoto.indexOf(',')+1)),bytes=Uint8Array.from(payload,c=>c.charCodeAt(0));const metadata=readPhotoMetadata(bytes);
 if(session===editorSession&&selection===photoReadVersion&&$('editor').open)offerPhotoMetadata(metadata);
 }catch{$('editor-error').textContent='This photo’s metadata could not be read. You can still set its footprint location manually.';}finally{pendingMedia--;syncSave();$('read-photo-geotag').disabled=false;}
}
async function attach(file,kind,{preserveCapture=false}={}){
 if(!file)return;if(kind==='image'&&!preserveCapture){cameraIntent=null;draftRecovery?.forgetCamera();}let processing=false;const session=editorSession,selection=kind==='image'?++photoReadVersion:null;
 if(kind==='image'){gpsRequestVersion++;locationPending=false;$('use-location').disabled=false;pendingPhotoMetadata=null;$('photo-geotag').hidden=true;}
 try{if(file.size>20*1024*1024)throw Error('Choose an attachment smaller than 20 MB for this prototype.');if(!file.type.startsWith(kind+'/'))throw Error(`Choose a valid ${kind} file.`);
 processing=true;pendingMedia++;syncSave();
 const [data,buffer]=await Promise.all([asDataURL(file),kind==='image'?file.arrayBuffer():null]);
 const probe={...seeds[0],photo:kind==='image'?data:null,audio:kind==='audio'?data:null};validateRecord(probe);
 if(!$('editor').open||session!==editorSession||(kind==='image'&&selection!==photoReadVersion))return;
 if(kind==='image'){const next=replacePhoto({photos:draftPhotos,coverIndex:draftCover},data);draftPhotos=next.photos;draftCover=next.coverIndex;draftPhoto=next.photo;draftArt=null;offerPhotoMetadata(readPhotoMetadata(buffer));}else draftAudio=data;refreshDraft();$('editor-error').textContent='';return true;
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
async function savePlace(e){e.preventDefault();if(editorSaving||micPending||pendingMedia>0||locationPending||cameraPending||recording?.state==='recording')return;$('editor-error').textContent='';const save=$('save-place');save.disabled=true;
 try{const form=new FormData($('place-form'));const r=validateRecord({id:editId??crypto.randomUUID(),title:form.get('title'),category:form.get('category'),visited:form.get('visited'),rating:Number(form.get('rating')),favorite:$('favorite').checked,address:form.get('address'),notes:form.get('notes'),phone:form.get('phone'),url:form.get('url'),lat:form.get('lat')===''?null:Number(form.get('lat')),lng:form.get('lng')===''?null:Number(form.get('lng')),photo:draftPhoto,photos:draftPhotos,coverIndex:draftCover,tripIds:selectedDraftTrips(),tags:parseTags(form.get('tags')),country:form.get('country')??'',region:form.get('region')??'',audio:draftAudio,...(draftSource?{placeSource:draftSource}:{}),sampleArt:draftArt,updatedAt:new Date().toISOString()});
 editorSaving=true;$('place-form').inert=true;let savedVisit=editVisitId??INITIAL_VISIT;await saveEditorRecord(current=>{if(!editId)return current.concat(r);const old=current.find(x=>x.id===editId);if(!old)throw Error('This place was removed. Reopen recovery to save the draft as a new footprint.');const next=writeVisit(old,r,editVisitId??INITIAL_VISIT);if(editVisitId==='new')savedVisit=next.mainVisitId;return current.map(x=>x.id===next.id?next:x);});if(detailId===editId)detailVisitId=savedVisit;editorSaving=false;draftBaseline=editorSnapshot();close('editor',{force:true});deckIndex=Math.max(0,filtered().findIndex(x=>x.id===r.id));render();toast(editVisitId==='new'?'Return visit saved.':editId?'Place & visit updated.':'A new memory, kept.');
 }catch(e){$('editor-error').textContent=e.message;}finally{editorSaving=false;$('place-form').inert=false;save.disabled=false;scheduleDraft();}
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const fileSize=n=>n<1024*1024?`${(n/1024).toFixed(1)} KB`:`${(n/1024/1024).toFixed(1)} MB`;
function transferProgress(value,label,detail=''){
 $('transfer-progress').value=value;$('transfer-percent').textContent=`${Math.round(value)}%`;
 if(label)$('transfer-label').textContent=label;if(detail)$('transfer-detail').textContent=detail;
}
function cancelTransfer(){
 if(restoreCommit||exportCommit||!transferRunning)return;
 transferAbort?.abort();activeReader?.abort();
 if(pendingExport&&!exportSaving){finishTransfer(transferToken,'Cancelled. Your journal has not changed.',false,true);return;}
 $('cancel-transfer').disabled=true;$('transfer-label').textContent='Cancelling safely…';
}
function beginTransfer(label){
 const token=++transferToken;transferAbort=new AbortController();transferRunning=true;pendingExport=null;
 $('backup').classList.add('transfer-active');$('transfer').hidden=false;$('transfer').dataset.state='working';$('transfer').setAttribute('aria-busy','true');
 $('transfer-title').textContent=label;$('transfer-file').textContent='';$('transfer-detail').textContent='';
 $('save-backup').hidden=true;$('dismiss-transfer').hidden=true;$('cancel-transfer').hidden=false;$('cancel-transfer').disabled=false;
 transferProgress(0,label);$('backup-status').textContent='';$('export-all').disabled=true;$('backup-file').disabled=true;$('transfer').scrollIntoView?.({block:'nearest'});return token;
}
function checkToken(token){if(token!==transferToken||transferAbort?.signal.aborted)throw Error('CANCELLED');}
function finishTransfer(token,message,success=true,cancelled=false){
 if(token!==transferToken)return;transferRunning=false;pendingExport=null;
 $('transfer').setAttribute('aria-busy','false');$('transfer').dataset.state=cancelled?'cancelled':success?'success':'error';
 $('transfer-title').textContent=cancelled?'Transfer cancelled':success?'Complete':'Transfer could not finish';
 if(success)transferProgress(100);$('transfer-label').textContent=message;$('backup-status').textContent=message;
 $('save-backup').hidden=true;$('cancel-transfer').hidden=true;$('dismiss-transfer').hidden=false;
 $('export-all').disabled=false;$('backup-file').disabled=false;
}
function setTransferDialog(photo=false){$('backup').dataset.kind=photo?'photo':'backup';$('backup-heading').textContent=photo?'Export photo.':'Backup & restore.';$('backup-eyebrow').textContent=photo?'KEEP THE VIEW':'YOUR MEMORIES GO WITH YOU';}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
async function exportBackup(id=null){
 if(transferRunning)return;await galleryWrites;await journalWrites;if(transferRunning)return;setTransferDialog();
 if(!$('backup').open)show('backup');$('restore-preview').hidden=true;pendingRestore=null;
 const token=beginTransfer('Create a backup');const items=id?records.filter(r=>r.id===id):[...records];
 const name=`Nth-FootPrints-${id?'memory-':''}${today()}.nthbackup`;$('transfer-file').textContent=name;
 try{
  const trips=id?journeys.filter(j=>items.some(r=>journeyIdsOf(r).includes(j.id))).map(j=>({...j,coverId:items.some(r=>r.id===j.coverId)?j.coverId:null})):journeys;
  const chunks=['{"app":'+JSON.stringify(APP)+',"formatVersion":'+VERSION+',"createdAt":'+JSON.stringify(new Date().toISOString())+',"settings":'+JSON.stringify(settings)+',"journeys":'+JSON.stringify(trips)+',"records":['];let size=chunks[0].length;
  for(let i=0;i<items.length;i++){
   await tick();checkToken(token);const record=backupRecord(items[i]),part=(i?',':'')+JSON.stringify(record);size+=part.length;
   if(size>MAX_BACKUP)throw Error('This journal exceeds the 150 MB backup limit.');
   chunks.push(part);transferProgress(Math.round((i+1)/items.length*50),`Packing “${record.title}”`,`${i+1} of ${items.length} footprints · photos and voice notes included`);
  }
  chunks.push(']}');await tick();checkToken(token);const blob=new Blob(chunks,{type:'application/json'});
  if(blob.size>MAX_BACKUP)throw Error('Backup exceeds the 150 MB limit.');
  pendingExport={blob,name,token,count:items.length};
  transferProgress(50,'Your backup is ready to save.',`${items.length} footprints · ${fileSize(blob.size)} · originals and preferences included`);
  $('transfer').setAttribute('aria-busy','false');$('save-backup').hidden=false;$('save-backup').disabled=false;
 }catch(error){finishTransfer(token,error.message==='CANCELLED'?'Cancelled. Your journal has not changed.':error.message,false,error.message==='CANCELLED');}
}
async function exportPhoto(id){
 if(transferRunning)return;await galleryWrites;await journalWrites;if(transferRunning)return;const saved=records.find(record=>record.id===id);const r=saved?(detailId===id?visitView(saved,detailVisitId):placeView(saved)):saved;const photo=preparePhotoExport(r);
 setTransferDialog(true);if(!$('backup').open)show('backup');$('restore-preview').hidden=true;pendingRestore=null;
 const token=beginTransfer('Export photo');$('transfer-file').textContent=photo.name;
 pendingExport={...photo,token,kind:'photo'};transferProgress(0,'Preparing your photo…',`${fileSize(photo.blob.size)} · original photo`);
 await savePreparedBackup();
}
async function savePreparedBackup(){
 if(!pendingExport||exportSaving)return;const {blob,name,token,kind='backup',mimeType,extension,description}=pendingExport;
 const photo=kind==='photo',noun=photo?'photo':'backup',start=photo?0:50;
 exportSaving=true;$('save-backup').disabled=true;$('transfer').setAttribute('aria-busy','true');
 try{
  checkToken(token);
  const result=await saveBackupFile(blob,name,{
   native:device.native,plugin:window.NthNative?.BackupFiles,mimeType,extension,description,
   picker:window.showSaveFilePicker?.bind(window),download,signal:transferAbort.signal,
   onProgress:({phase,written,total})=>{
    if(token!==transferToken)return;
    if(phase==='choosing')transferProgress(start,`Choose where to save your ${photo?'photo':'.nthbackup file'}.`);
    else if(phase==='finalizing')transferProgress(99,`Finishing your ${noun}…`);
    else transferProgress(start+written/total*(99-start),`Saving your ${noun}…`,`${fileSize(written)} of ${fileSize(total)} written`);
   },
   onCommit:()=>{exportCommit=true;$('cancel-transfer').disabled=true;}
  });
  finishTransfer(token,result.confirmed?`Saved ${result.name} (${fileSize(result.bytes)}). Your ${noun} is ready.`:`${photo?'Photo':'Backup'} handed to your browser. Check Downloads and confirm the file is there.`);
  if(!result.confirmed)$('transfer-title').textContent='Download requested';
 }catch(error){finishTransfer(token,transferCancelled(error)?'Cancelled. Your journal has not changed.':error.message,false,transferCancelled(error));}
 finally{exportSaving=false;exportCommit=false;$('cancel-transfer').disabled=false;}
}
async function inspectBackup(file){
 if(!file||transferRunning)return;if(file.size>MAX_BACKUP){$('backup-status').textContent='Choose a backup smaller than 150 MB for this prototype.';return;}
 $('restore-preview').hidden=true;pendingRestore=null;const token=beginTransfer('Read a backup');const reader=new FileReader();activeReader=reader;$('transfer-file').textContent=file.name;
 reader.onprogress=e=>{if(e.lengthComputable&&token===transferToken)transferProgress(Math.round(e.loaded/e.total*85),'Reading your backup…',`${fileSize(e.loaded)} of ${fileSize(e.total)} read`);};
 try{
  const raw=await new Promise((resolve,reject)=>{reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('The backup could not be read.'));reader.onabort=()=>reject(Error('CANCELLED'));reader.readAsText(file);});
  await tick();checkToken(token);transferProgress(90,'Checking places and attachments…');const parsed=parseBackup(raw);await tick();checkToken(token);const m=mergeRecords(records,parsed.records);pendingRestore=parsed;
  $('restore-preview').innerHTML=`<span class="eyebrow">READY TO RESTORE</span><h3>${parsed.records.length} ${parsed.records.length===1?'footprint':'footprints'} in this backup</h3><p><b>${m.added}</b> new · <b>${m.updated}</b> with changes · <b>${m.kept}</b> already up to date</p><p>${parsed.records.reduce((count,r)=>count+visitsOf(r).length,0)} visits · ${activeJourneys(parsed.journeys).length} trips included.</p><p>Your existing places stay. Visits merge separately, keeping newer edits and recorded visit removals.</p><label class="checkbox"><input type="checkbox" id="restore-settings">Also restore appearance and memory-card preferences</label><button class="primary" id="confirm-restore">Restore footprints</button>`;
  $('restore-preview').hidden=false;finishTransfer(token,'Backup checked. Nothing has changed yet.');
 }catch(error){finishTransfer(token,error.message==='CANCELLED'?'Cancelled. Your journal has not changed.':error.message,false,error.message==='CANCELLED');}
 finally{if(activeReader===reader)activeReader=null;$('backup-file').value='';}
}
async function restoreBackup(){
 if(!pendingRestore||transferRunning)return;const incoming=pendingRestore,withSettings=$('restore-settings').checked,token=beginTransfer('Restore your journal');$('confirm-restore').disabled=true;
 try{
  for(let i=0;i<incoming.records.length;i++){await tick();checkToken(token);transferProgress(Math.round((i+1)/incoming.records.length*90),`Preparing footprint ${i+1} of ${incoming.records.length}…`);}
  checkToken(token);const merged=mergeRecords(records,incoming.records);restoreCommit=true;$('cancel-transfer').disabled=true;transferProgress(95,'Saving your restored journal…');
  await changeJournal(current=>mergeRecords(current,incoming.records).records,current=>mergeJournalPreferences(current,incoming.settings,withSettings),{journeys:current=>mergeJourneys(current,incoming.journeys)});pendingRestore=null;$('restore-preview').hidden=true;finishTransfer(token,`Restored: ${merged.added} added, ${merged.updated} updated. Your journal is ready.`);toast('Your memories are here.');
 }catch(error){finishTransfer(token,error.message==='CANCELLED'?'Cancelled. Your journal has not changed.':error.message,false,error.message==='CANCELLED');}
 finally{restoreCommit=false;$('cancel-transfer').disabled=false;if($('confirm-restore'))$('confirm-restore').disabled=false;}
}
async function finishCameraPhoto(file,session,{restored=false}={}){
 if(session!==editorSession||!$('editor').open)return;
 const attached=await attach(file,'image',{preserveCapture:true});
 if(attached&&session===editorSession&&$('editor').open&&draftPhoto){
  pendingPhotoMetadata=null;$('photo-geotag').hidden=true;
  // A failed new fix must never leave a previous place attached to this photo.
  $('lat').value='';$('lng').value='';cameraIntent=null;draftRecovery?.forgetCamera();await checkpointDraft();
  if(restored){$('location-status').textContent='Camera photo recovered. Add its location manually or tap Use my location for where you are now.';}else await useLocation({capture:true});
 }
}
async function takePhoto(){
 if(cameraPending)return;
 if(!device.native){$('camera-file').value='';$('camera-file').click();return;}
 const session=editorSession;cameraPending=true;syncSave();$('editor-error').textContent='';
 try{await checkpointCamera();const photo=await device.takePhoto();await finishCameraPhoto(photo,session);}
 catch(error){if(session===editorSession&&$('editor').open&&!cameraCancelled(error))$('editor-error').textContent=error.draftRecovery?'Your photo is attached, but draft recovery could not save it. Keep the app open and use Save footprint.':/recovery draft/i.test(error.message)?error.message:'Could not open the camera or read its photo. Allow Camera access in Android Settings → Apps → Nth FootPrints → Permissions, then try again.';}
 finally{if(session===editorSession)cameraIntent=null;cameraPending=false;syncSave();if(session===editorSession)await checkpointDraft().catch(()=>{});}
}
async function useLocation({capture=false}={}){
 const session=editorSession,request=++gpsRequestVersion;locationPending=true;syncSave();$('use-location').disabled=true;$('location-status').textContent=capture?'Finding the location for your new photo…':'Finding your location…';
 try{
  const p=await device.currentPosition();
  if(session===editorSession&&request===gpsRequestVersion&&$('editor').open){$('lat').value=p.coords.latitude.toFixed(6);$('lng').value=p.coords.longitude.toFixed(6);$('location-status').textContent=`${capture?'New photo located':'Current location found'} (about ${Math.round(p.coords.accuracy)} m accuracy). Save the footprint to keep it. Add the address above if you’d like.`;void fillEditorRegion();}
 }catch{
  if(session===editorSession&&request===gpsRequestVersion&&$('editor').open)$('location-status').textContent=(capture?'Your photo is attached, but its location could not be found. ':'Could not get your location. ')+'Turn on device Location and allow location access for Nth FootPrints, then retry “Use my location” or enter coordinates manually.';
 }finally{
  if(session===editorSession&&request===gpsRequestVersion){locationPending=false;$('use-location').disabled=false;syncSave();}
 }
}
async function deleteSavedVisit(id,visitId){
 const record=records.find(r=>r.id===id),visit=record?visitById(record,visitId):null;if(!visit)return;
 if(!confirm(`Delete the visit on ${date(visit.visited)} and its photos and voice note? The place and its other visits will stay.`))return;
 try{await galleryWrites;await changeJournal(rows=>rows.map(r=>r.id===id?removeVisit(r,visitId):r));await openDetail(id,null);toast('Visit removed. Your other visits are still here.');}catch(error){toast(error.message);}
}
async function toggleFavorite(id){const r=records.find(x=>x.id===id);if(!r)return;await galleryWrites;await changeJournal(current=>current.map(x=>x.id===id?{...x,favorite:!x.favorite,updatedAt:new Date().toISOString()}:x));if($('details').open)openDetail(id);}
async function deletePlace(id){const r=records.find(x=>x.id===id);if(!r||!confirm(`Delete “${r.title}” and all its visits, photos and voice notes?`))return;await galleryWrites;await changeJournal(current=>current.filter(x=>x.id!==id));close('details',{force:true});toast('Footprint deleted.');}
async function routeClick(e){const b=e.target.closest('button,a');if(!b)return;
 try{if(b.dataset.view){setView(b.dataset.view);return;}if(b.dataset.category){category=b.dataset.category;deckIndex=0;render();return;}if(b.dataset.close){close(b.dataset.close);return;}if(b.dataset.detail){await openDetail(b.dataset.detail,view==='map'&&mapVisit?.recordId===b.dataset.detail?mapVisit.visitId:undefined);return;}if(b.dataset.photoIndex!==undefined){galleryWrites=detailViewer?.select(Number(b.dataset.photoIndex))??Promise.resolve();return;}if(b.dataset.draftIndex!==undefined){chooseDraftPhoto(Number(b.dataset.draftIndex));return;}if(b.dataset.edit){await openEditor(b.dataset.edit,null,b.dataset.editVisit??null);return;}if(b.dataset.favorite){b.disabled=true;try{await toggleFavorite(b.dataset.favorite);}finally{b.disabled=false;}return;}if(b.dataset.delete){await deletePlace(b.dataset.delete);return;}if(b.dataset.exportPhoto){await exportPhoto(b.dataset.exportPhoto);return;}if(b.dataset.map){mapId=b.dataset.map;atlas?.select(mapId,{focus:true});renderMapList(filtered());return;}if(b.id==='apply-photo-geotag'){applyPhotoLocation();return;}if(b.id==='dismiss-photo-geotag'){pendingPhotoMetadata=null;$('photo-geotag').hidden=true;return;}if(b.id==='confirm-restore')await restoreBackup();
 }catch(err){toast(err.message);}
}
function draftSnapshot(){
 return {editId,...(draftSource?{placeSource:draftSource}:{}),visitId:editVisitId,baseUpdatedAt:baseDraftUpdatedAt,tripIds:selectedDraftTrips(),values:Object.fromEntries(Object.keys(DRAFT_FIELDS).map(field=>[field,$(field).value])),favorite:$('favorite').checked,photos:draftPhotos.slice(),coverIndex:draftCover,audio:draftAudio,art:draftArt,camera:cameraIntent?{...cameraIntent}:null};
}
function scheduleDraft(){
 if(!draftRecovery?.id||!$('editor').open||editorSaving)return;
 if(editorDirty())draftRecovery.schedule(draftSnapshot());else draftRecovery.clean();
}
async function checkpointDraft(){
 if(!draftRecovery?.id||!$('editor').open||editorSaving)return;
 try{if(editorDirty())await draftRecovery.flush(draftSnapshot());else await draftRecovery.flush();}catch(error){error.draftRecovery=true;throw error;}
}
async function checkpointCamera(){
 await nativeDraftReady;cameraIntent={token:crypto.randomUUID(),startedAt:new Date().toISOString()};draftRecovery?.forgetCamera();
 try{await checkpointDraft();}catch{cameraIntent=null;throw Error('The recovery draft could not be saved before opening the camera.');}
}
async function saveEditorRecord(transform){
 const clearDraftId=await draftRecovery.freeze();
 try{await changeJournal(transform,undefined,{clearDraftId});draftSaved=true;draftRecovery.release();}
 catch(error){draftRecovery.unfreeze();throw error;}
}
function finishEditorDraft(){
 if(!draftRecovery?.id)return;
 if(draftSaved){draftRecovery.release();return;}
 draftClosing=draftRecovery.discard().catch(async()=>{draftRecovery.release();toast('The draft could not be removed. It remains available for recovery.');await loadDraftBanner();});
 draftRecovered=false;cameraIntent=null;
}
async function loadDraftBanner(){
 try{recoveryFound=await draftRecovery.load();$('draft-recovery').hidden=!recoveryFound;
  if(recoveryFound){$('recovery-name').textContent=recoveryFound.values.title.trim()||'An unfinished footprint';$('recovery-status').textContent='Resume your local draft or discard it. Saved footprints stay as they are.';}
 }catch(error){recoveryFound={unreadable:true};$('draft-recovery').hidden=false;$('recovery-name').textContent='A recovery draft needs attention';$('recovery-status').textContent=error.message;$('resume-draft').disabled=true;}
}
async function initialiseDraftRecovery(){
 draftStore=createDraftStore(db);draftRecovery=createDraftRecovery({store:draftStore,onState:({state,message})=>{
  $('draft-status').textContent=message;$('draft-status').dataset.state=state;
  if(state==='camera'||state==='camera-error'){if($('editor').open)void refreshReturnedCamera();else $('recovery-status').textContent=message;}
 }});
 await loadDraftBanner();draftsReady=true;
 for(const event of cameraInbox.splice(0))queueRestoredCamera(event);
 if(recoveryFound?.id)void draftRecovery.readReturned(recoveryFound.id,photo=>device.readCameraPhoto(photo));
}
function queueRestoredCamera(event){
 if(!draftsReady){cameraInbox.push(event);return;}
 cameraRecoveryWrites=cameraRecoveryWrites.then(()=>draftRecovery.receiveCamera(event,photo=>device.readCameraPhoto(photo))).catch(()=>{toast('The returned camera photo could not be recovered. Your draft is still available.');});
}
async function refreshReturnedCamera(){
 const id=draftRecovery?.id,session=editorSession;
 if(!id||!$('editor').open){$('recover-camera-photo').hidden=true;return;}
 const result=await draftRecovery.result(id);if(id!==draftRecovery.id||session!==editorSession)return;
 $('recover-camera-photo').hidden=!result||result.cancelled;$('recover-camera-photo').textContent=result?.blob?'Recover returned camera photo':'Retry camera photo recovery';
}
async function resumeDraft(){
 if(!recoveryFound?.id||!draftsReady)return;$('resume-draft').disabled=true;$('discard-draft').disabled=true;
 try{
  await cameraRecoveryWrites;const raw=await draftStore.read();if(!raw){recoveryFound=null;$('draft-recovery').hidden=true;return;}
  await draftRecovery.readReturned(raw.id,photo=>device.readCameraPhoto(photo));
  const data=await draftRecovery.hydrate(raw),result=await draftRecovery.result(raw.id);
  if(result?.blob){const photo=await asDataURL(result.blob),next=replacePhoto({photos:data.photos,coverIndex:data.coverIndex},photo);data.photos=next.photos;data.coverIndex=next.coverIndex;data.art=null;data.values.lat='';data.values.lng='';data.camera=null;data.recoveredCamera=true;draftRecovery.forgetCamera();}
  else if(result?.cancelled){data.camera=null;draftRecovery.forgetCamera();}
  await journalWrites;const currentState=await dbGet();if(currentState){records=currentState.records.map(validateRecord);settings=validateSettings(currentState.settings);journeys=validateJourneys(currentState.journeys??[]);applyTheme();render();}
  const original=records.find(r=>r.id===data.editId),conflict=data.editId&&(!original||original.updatedAt!==data.baseUpdatedAt);
  await openEditor(conflict?null:data.editId,{...data,visitId:conflict?null:data.visitId},conflict?null:data.visitId??null);
  if(conflict)$('editor-error').textContent='The saved footprint changed or was removed. This draft will save as a new footprint so the current journal stays intact.';
 }catch(error){$('recovery-status').textContent=error.message;}
 finally{$('resume-draft').disabled=false;$('discard-draft').disabled=false;}
}
async function discardRecoveryDraft(){
 if(!recoveryFound||!confirm('Discard this unfinished draft and its draft attachments? Your saved footprints will stay.'))return;
 $('discard-draft').disabled=true;
 try{const raw=await draftStore.read();if(recoveryFound.unreadable)await draftStore.clearUnreadable();else if(raw?.id)await draftRecovery.discardFound(raw.id);recoveryFound=null;$('resume-draft').disabled=false;$('draft-recovery').hidden=true;widgetLaunch.flush();}
 catch(error){$('recovery-status').textContent=error.message;}finally{$('discard-draft').disabled=false;}
}
async function applyReturnedCamera(){
 const id=draftRecovery?.id,session=editorSession;if(!id)return;$('recover-camera-photo').disabled=true;
 try{await draftRecovery.readReturned(id,photo=>device.readCameraPhoto(photo));const result=await draftRecovery.result(id);
  if(id===draftRecovery.id&&session===editorSession&&result?.blob)await finishCameraPhoto(result.blob,session,{restored:true});
  await refreshReturnedCamera();
 }catch(error){$('editor-error').textContent=error.message;}finally{$('recover-camera-photo').disabled=false;}
}
function openOfflineMaps(){
 const places=records.map(placeView).filter(hasLocation).sort((a,b)=>a.title.localeCompare(b.title));
 $('offline-place').innerHTML=places.map(r=>`<option value="${esc(r.id)}">${esc(r.title)}</option>`).join('')||'<option value="">Save a footprint with coordinates first</option>';
 $('offline-status').textContent='';show('offline-maps');renderOfflineMaps();
}
function offlinePlan(){
 const saved=records.find(r=>r.id===$('offline-place').value),place=saved?placeView(saved):null;if(!place)throw Error('Save a footprint with coordinates first.');
 return {place,plan:planOfflineArea(place,Number($('offline-radius').value),Number($('offline-detail').value))};
}
function offlineEstimate(){
 let valid=false;
 try{const {plan}=offlinePlan();$('offline-estimate').textContent=`${plan.radiusKm*2} km across · ${plan.tiles.length} tiles · up to 50 MB. Actual size appears during download.`;valid=true;}
 catch(error){$('offline-estimate').textContent=error.message;}
 $('offline-download').disabled=!offlineReady||!valid||offlineMaps.phase!=='idle';
}
function renderOfflineMaps(){
 const busy=offlineMaps.phase!=='idle',working=offlineMaps.phase==='downloading';
 $('downloaded-map').checked=offlineMaps.preferred;
 for(const id of ['offline-place','offline-radius','offline-detail'])$(id).disabled=busy;
 $('offline-cancel').hidden=!busy;$('offline-cancel').disabled=!working;
 $('offline-transfer').hidden=!busy;$('offline-transfer').setAttribute('aria-busy',String(busy));
 if(busy){const p=offlineProgress;$('offline-progress').value=p?.total?Math.round(p.done/p.total*100):0;$('offline-progress-label').textContent=working?`${p?.done??0} / ${p?.total??0} tiles · ${fileSize(p?.bytes??0)}`:offlineMaps.phase==='committing'?'Finishing saved area…':'Removing saved area…';}
 const areas=offlineMaps.areas,total=areas.reduce((n,a)=>n+a.bytes,0);
 $('offline-storage').textContent=`${areas.length} / 8 saved areas · ${fileSize(total)} / 200 MB`;
 $('offline-areas').innerHTML=areas.length?areas.map(a=>`<article class="offline-area"><div><strong>${esc(a.name)}</strong><p>${a.radiusKm*2} km across · ${a.maxZoom===15?'Street':'Town'} detail · ${fileSize(a.bytes)}</p><small>Downloaded ${esc(date(a.createdAt.slice(0,10)))}</small></div><div class="detail-actions"><button type="button" class="secondary" data-offline-view="${esc(a.id)}" ${busy?'disabled':''}>View</button><button type="button" class="text-button" data-offline-remove="${esc(a.id)}" ${busy?'disabled':''}>Remove</button></div></article>`).join(''):'<p class="field-help">No maps downloaded yet.</p>';
 $('offline-areas').querySelectorAll('[data-offline-remove]').forEach(button=>{button.onclick=async()=>{try{await offlineMaps.remove(button.dataset.offlineRemove);$('offline-status').textContent='Map area removed. Your footprints are unchanged.';}catch(error){$('offline-status').textContent=error.message;}};});
 $('offline-areas').querySelectorAll('[data-offline-view]').forEach(button=>{button.onclick=async()=>{const area=offlineMaps.areas.find(a=>a.id===button.dataset.offlineView);if(!area)return;offlineMaps.setPreferred(true);close('offline-maps');await navigation.idle();if($('settings').open){close('settings');await navigation.idle();}await setView('map');renderMap(filtered());atlas?.showArea(area);};});
 offlineEstimate();
}
async function downloadOfflineArea(){
 if(offlineMaps.phase!=='idle'||!offlineReady)return;
 try{const {place,plan}=offlinePlan();$('offline-status').textContent='Downloading… Keep the app open.';offlineProgress=null;
  const area=await offlineMaps.download(plan,place.title);$('offline-status').textContent=`Saved “${area.name}” · ${fileSize(area.bytes)}. Use View, or turn on Downloaded maps in the atlas.`;
  void navigator.storage?.persist?.().catch(()=>{});
 }catch(error){$('offline-status').textContent=error.message==='CANCELLED'?'Download cancelled. Incomplete tiles were removed.':error.message;}
}
function wire(){
 nativeDraftReady=bindDraftLifecycle({plugin:device.native?window.NthNative?.App:null,onPause:()=>{mapsPaused=true;syncMapVisibility();void checkpointDraft().catch(()=>{});void nearbyMemories.pause();},onRestored:queueRestoredCamera,onError:toast});
 $('place-form').addEventListener('input',scheduleDraft);$('place-form').addEventListener('change',scheduleDraft);
 $('resume-draft').onclick=resumeDraft;$('discard-draft').onclick=discardRecoveryDraft;$('recover-camera-photo').onclick=applyReturnedCamera;

 $('offline-open').onclick=openOfflineMaps;$('settings-offline').onclick=openOfflineMaps;
 $('offline-place').onchange=offlineEstimate;$('offline-radius').onchange=offlineEstimate;$('offline-detail').onchange=offlineEstimate;
 $('offline-download').onclick=downloadOfflineArea;$('offline-cancel').onclick=()=>offlineMaps.cancel();
 $('downloaded-map').onchange=e=>offlineMaps.setPreferred(e.target.checked);
 offlineMaps.subscribe(state=>{if(state.done!==undefined)offlineProgress=state;renderOfflineMaps();});

 $('widget-preferences').hidden=!widgetSync.available;$('pin-widget').onclick=pinWidget;$('refresh-widget').onclick=async()=>{await widgetSync.refresh(records);await widgetPreferences.load();};
 document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.addEventListener('cancel',event=>{event.preventDefault();close(dialog.id);});
  dialog.addEventListener('close',()=>{if(!closingDialogs.delete(dialog.id)&&!dialog.open)cleanupDialog(dialog.id);syncMapVisibility();if(!navigation.busy)widgetLaunch.flush();});
 });
 window.addEventListener('beforeunload',event=>{if(toolsUI.hasPending()||batchUI.hasPending()||exportsUI.hasPending()||editorDirty()||editorSaving||restoreCommit||exportCommit||transferRunning||offlineMaps.phase!=='idle'){event.preventDefault();event.returnValue='';}});
 if(device.native)void bindNativeBack({plugin:window.NthNative?.App,navigation,onError:toast});
 icons();renderReleases();$('enlarge-draft').onclick=openEnlargedPhoto;$('place-search-form').onsubmit=searchPlaces;$('place-query').oninput=()=>placeSearch.cancel();$('place-search-cancel').onclick=()=>placeSearch.cancel();$('nearest-places').onclick=()=>nearby.refresh();$('clear-nearby').onclick=()=>nearby.clear();$('choose-position').onclick=openPicker;$('picker-locate').onclick=locatePicker;$('apply-position').onclick=applyPicker;$('picker-retry').onclick=()=>picker?.retry();$('pin-picker').addEventListener('close',()=>{if(!$('pin-picker').open)closePicker();});$('fit-places').onclick=()=>atlas?.fitAll();$('retry-map').onclick=()=>atlas?.retry();$('category').innerHTML=CATEGORIES.map(c=>`<option>${c}</option>`).join('');
 window.addEventListener('pagehide',()=>{mapsPaused=true;syncMapVisibility();});window.addEventListener('pageshow',()=>{mapsPaused=false;syncMapVisibility();});
 placesUI.wire();$('tools-favorites').onclick=()=>void browseFavorites();toolsUI.wire();batchUI.wire();exportsUI.wire();$('tools-open').onclick=()=>openJournalTools();$('settings-tools').onclick=()=>openJournalTools();$('memory-banner-open').onclick=()=>openJournalTools('memories');$('nearby-memory-open').onclick=()=>{if(nearbyMatch)openDetail(nearbyMatch.recordId,nearbyMatch.visitId);};$('nearby-memory-dismiss').onclick=()=>{nearbyMatch=null;renderNearbyBanner();};
 $('tag-filter').onchange=e=>{tagFilter=e.target.value;deckIndex=0;render();};$('clear-exploration').onclick=()=>{explorationCountry='';explorationRegion='';render();};
 document.addEventListener('visibilitychange',()=>{syncMapVisibility();if(document.hidden)void nearbyMemories.pause();else if(storageReady){void nearbyMemories.resume();renderToolFilters();}});if(device.native)void window.NthNative?.App?.addListener('resume',()=>{mapsPaused=false;syncMapVisibility();if(storageReady){void nearbyMemories.resume();renderToolFilters();}}).catch(()=>{});
 journeyUI.wire();$('journeys-open').onclick=openJourneys;$('journey-filter').onchange=e=>{journeyFilter=e.target.value;deckIndex=0;render();};
 document.addEventListener('click',routeClick);$('add').onclick=()=>openEditor();$('empty-add').onclick=()=>openEditor();$('previous').onclick=()=>moveDeck(-1);$('next').onclick=()=>moveDeck(1);
 $('search').oninput=e=>{query=e.target.value;deckIndex=0;render();};$('sort').onchange=e=>{sort=e.target.value;deckIndex=0;render();};
 $('country').onchange=()=>{regionLabelVersion++;editorAutoLabels=null;$('region').value='';syncRegionFields($('country'),$('region'),$('region-choice'));$('region-status').textContent='';scheduleDraft();};$('region-choice').onchange=()=>{regionLabelVersion++;editorAutoLabels=null;$('region-status').textContent='Labels selected manually.';chooseRegion($('country'),$('region'),$('region-choice'));scheduleDraft();};$('region').addEventListener('input',()=>{regionLabelVersion++;editorAutoLabels=null;$('region-status').textContent='Labels entered manually.';});$('lookup-region').onclick=()=>{if(!draftPosition()){$('region-status').textContent='Choose photo GPS, a map location or coordinates first.';return;}void fillEditorRegion();};
 $('place-form').onsubmit=savePlace;$('photo-file').onchange=e=>attach(e.target.files[0],'image');$('take-photo').onclick=takePhoto;$('camera-file').onchange=e=>finishCameraPhoto(e.target.files[0],editorSession);$('read-photo-geotag').onclick=inspectSavedPhoto;$('audio-file').onchange=e=>attach(e.target.files[0],'audio');$('remove-photo').onclick=()=>{photoReadVersion++;gpsRequestVersion++;locationPending=false;$('use-location').disabled=false;syncSave();pendingPhotoMetadata=null;$('photo-geotag').hidden=true;$('camera-file').value='';const next=removePhoto({photos:draftPhotos,coverIndex:draftCover});draftPhotos=next.photos;draftCover=next.coverIndex;draftPhoto=next.photo;draftArt=null;$('photo-file').value='';refreshDraft();};$('remove-audio').onclick=()=>{draftAudio=null;$('audio-file').value='';refreshDraft();};$('record').onclick=toggleRecording;$('use-location').onclick=()=>useLocation();for(const id of ['lat','lng'])$(id).addEventListener('input',()=>{$('region-status').textContent='';regionRequest++;gpsRequestVersion++;locationPending=false;$('use-location').disabled=false;syncSave();$('location-status').textContent='Location set manually. Save the footprint to keep it.';});
 $('backup-open').onclick=openBackup;$('export-all').onclick=()=>exportBackup();$('backup-file').onchange=e=>inspectBackup(e.target.files[0]);$('cancel-transfer').onclick=cancelTransfer;$('save-backup').onclick=savePreparedBackup;$('dismiss-transfer').onclick=()=>{if($('backup').dataset.kind==='photo'){close('backup');return;}$('transfer').hidden=true;$('backup').classList.remove('transfer-active');};
 $('settings-open').onclick=()=>openPreferences();$('roadmap-open').onclick=()=>show('roadmap');$('theme').onchange=async e=>{try{await changeJournal(current=>current,current=>({...current,theme:e.target.value}));}catch(err){applyTheme();toast(err.message);}};
 $('request-persistence').onclick=async()=>{try{$('persistence-status').textContent=await navigator.storage?.persist?.()?'Durable storage granted for this browser. Keep backups too.':'The browser did not grant durable storage. Backups are still available.';}catch{$('persistence-status').textContent='Durable storage is unavailable in this browser.';}};

 bindVerticalDeck($('deck'),{canMove:()=>!deckBusy&&filtered().length>1,move:moveDeck,preview:previewDeck,reset:resetDeck});
 document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;if(view==='journal'&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();moveDeck(e.key==='ArrowUp'?1:-1);}});
 document.querySelector('.brand').onclick=e=>{e.preventDefault();setView('journal');};

}
// Retired preferences are already ignored in memory; optional cleanup can wait for the next save if storage is full.
async function init(){const initial=location.hash.slice(1);if(['journal','map','places','favorites'].includes(initial))view=initial;navigation.start(view);wire();
 try{db=await dbOpen();const state=await dbGet();if(state){const loaded=state.records.map(validateRecord);records=withoutStarterSamples(loaded);settings=validateSettings(state.settings);journeys=validateJourneys(state.journeys??[]);const linked=reconcileJourneys(records,journeys);records=linked.records;journeys=linked.journeys;if(records.length!==loaded.length)await dbPut(records,settings);else if(Object.hasOwn(state.settings??{},'collections'))await dbPut(records,settings).catch(()=>{});}else{records=seeds;await dbPut(records,settings);}storageReady=true;}catch(e){records=[];$('add').disabled=true;document.querySelector('.local-status').textContent='Local storage unavailable';toast('Unable to open local storage. Check browser permissions and reload. '+e.message);}
 applyTheme();render();if(view==='places')placesUI.setActive(true);if(storageReady){await initialiseDraftRecovery();if(!document.hidden)void nearbyMemories.resume();}void offlineMaps.ready().then(()=>{offlineReady=true;renderOfflineMaps();}).catch(()=>{$('offline-status').textContent='Offline map storage could not open. Your journal is unchanged.';});if(storageReady){void widgetSync.refresh(records);void widgetLaunch.start();}if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
init();
