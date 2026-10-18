import {BADGE_FAMILIES} from './achievements.js';
import {BADGE_ART} from './badge-art.js';
import {validateBadgeCase,badgeCaseLayout,badgeBounds,CASE_PAGE_ROWS,CASE_SHELVES} from './badge-case.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const picture=b=>`assets/badges/${b.art}.webp`;
export function createBadgeCaseUI({document,getState,getProgress,write,onStatus=()=>{},confirm=globalThis.confirm}){
 const $=id=>document.getElementById(id);let draft=null,dirty=false,busy=false,selected=null,page=0,editing=false,filter='all',family='',drag=null,suppressClick=false;
 const progress=()=>getProgress(),earned=()=>progress().badges.filter(b=>b.reached);
 function ensure(){draft??=badgeCaseLayout(getState().settings.badgeCase,earned());const visible=badgeCaseLayout(draft,earned()),all=new Map(draft.items.map(v=>[v.id,v]));for(const row of visible.items)all.set(row.id,row);draft.items=[...all.values()];return visible;}
 const selectedItem=()=>draft?.items.find(v=>v.id===selected);
 function changed(){dirty=true;$('badge-case-status').textContent='Arrangement changed. Save case to keep it.';$('badge-case-save').disabled=busy;}
 function paint(){
  const config=ensure(),badges=new Map(earned().map(b=>[b.id,b])),items=config.items;
  const pages=Math.max(1,Math.ceil((Math.max(0,...items.map(v=>v.shelf))+1)/CASE_PAGE_ROWS));page=Math.min(Math.max(0,page),pages-1);
  const stage=$('badge-case-stage');stage.dataset.wood=draft.wood;stage.style.setProperty('--case-light',draft.light/100);stage.classList.toggle('arranging',editing);
  stage.innerHTML=Array.from({length:CASE_PAGE_ROWS},(_,i)=>{const shelf=page*CASE_PAGE_ROWS+i;return `<div class="trophy-shelf" data-case-shelf="${shelf}" aria-label="Shelf ${shelf+1}"><span class="shelf-light" aria-hidden="true"></span>${items.filter(v=>v.shelf===shelf).map(v=>{const b=badges.get(v.id);return `<button type="button" class="case-trophy ${v.id===selected?'selected':''}" data-case-badge="${v.id}" aria-pressed="${v.id===selected}" aria-label="${esc(b.title)}, ${b.target} ${esc(b.unit)}; shelf ${shelf+1}${editing?'. Drag or use arrow keys to move.':''}" style="--badge-bottom-gap:${BADGE_ART[b.art]?.bottom??0};--badge-x:${v.x}%;--badge-width:${v.width}px;--badge-height:${v.height}px;--badge-contact:${v.contact}px;--badge-facing:${v.facing==='left'?-1:1}"><img draggable="false" src="${picture(b)}" alt=""><span class="trophy-plaque">${esc(b.title)}<small>${b.target.toLocaleString()} · ${esc(b.familyName)}</small></span></button>`;}).join('')}<span class="shelf-number" aria-hidden="true">${String(shelf+1).padStart(2,'0')}</span></div>`;}).join('');
  $('badge-case-page').textContent=`Case ${page+1} of ${pages}`;$('badge-case-prev').disabled=busy||page===0;$('badge-case-next').disabled=busy||page>=pages-1;
  $('badge-case-empty').hidden=items.length>0;$('badge-case-save').disabled=busy||!dirty;$('badge-case-edit').textContent=editing?'Finish arranging':'Arrange case';$('badge-case-edit').setAttribute('aria-pressed',String(editing));
 }
 function renderControls(){
  const b=progress().badges.find(b=>b.id===selected),v=selectedItem();$('badge-selected').hidden=!b;$('badge-item-controls').hidden=!b?.reached||!v||!editing||draft.hidden.includes(selected);
  $('badge-selected-title').textContent=b?.title??'';$('badge-selected-rule').textContent=b?`${b.value.toLocaleString()} / ${b.target.toLocaleString()} ${b.unit} · ${b.reached?'earned':'in progress'}`:'';
  if(!v)return;
  for(const key of ['width','height','contact','x']){$('badge-'+key).value=v[key];$('badge-'+key+'-value').textContent=v[key]+(key==='x'?'%':' px');}
  $('badge-shelf').value=v.shelf;$('badge-facing').textContent=v.facing==='left'?'Face right':'Face left';
 }
 function renderLibrary(){
  const p=progress(),unlocked=p.badges.filter(b=>b.reached).length;$('badge-earned-count').textContent=`${unlocked} of ${p.badges.length} trophies earned`;
  $('badge-library').innerHTML=p.badges.filter(b=>(!family||b.family===family)&&(filter==='all'||(filter==='earned')===b.reached)).map(b=>`<article class="badge-card ${b.reached?'earned':'locked'}"><button type="button" class="badge-art-button" data-select-badge="${b.id}" aria-label="View ${esc(b.title)}"><img src="${picture(b)}" alt="" loading="lazy"></button><strong>${esc(b.title)}</strong><small>${b.target.toLocaleString()} ${esc(b.unit)}</small><progress max="${b.target}" value="${Math.min(b.value,b.target)}" aria-label="${esc(b.title)} progress"></progress><span>${b.reached?'Earned':`${b.value.toLocaleString()} / ${b.target.toLocaleString()}`}</span>${b.reached?`<button type="button" class="text-button" data-display-badge="${b.id}">${draft.hidden.includes(b.id)?'Display trophy':'Find in case'}</button>`:'<span class="badge-locked-label">Still to discover</span>'}</article>`).join('')||'<p class="field-help">No trophies in this selection yet.</p>';
 }
 function render(){ensure();paint();renderControls();renderLibrary();$('badge-case-wood').value=draft.wood;$('badge-case-light').value=draft.light;$('badge-light-value').textContent=draft.light+'%';$('badge-case-settings').inert=busy;$('badge-item-controls').inert=busy;$('badge-case-stage').inert=busy;$('badge-library').inert=busy;}
 function select(id){selected=id;const v=ensure().items.find(v=>v.id===id);if(v)page=Math.floor(v.shelf/CASE_PAGE_ROWS);paint();renderControls();}
 function patch(values){const item=selectedItem();if(!item||busy)return;Object.assign(item,values);changed();paint();}
 async function save(){if(!dirty||busy)return;const snapshot=validateBadgeCase(draft);busy=true;render();$('badge-case-status').textContent='Saving your case…';try{await write(snapshot);dirty=false;$('badge-case-status').textContent='Case saved. Included in journal backups.';}catch(e){$('badge-case-status').textContent='Case not saved. '+e.message;onStatus('Your case could not save. Your arrangement is still here to retry.');}finally{busy=false;render();}}
 function endDrag(event,cancel=false){if(!drag||event.pointerId!==drag.pointerId)return;const previous=drag;drag=null;if(cancel){Object.assign(selectedItem(),previous.original);paint();renderControls();return;}if(previous.moved){suppressClick=true;changed();renderControls();setTimeout(()=>suppressClick=false,0);}}
 function wire(){
  $('badge-family').innerHTML='<option value="">Every collection</option>'+BADGE_FAMILIES.map(f=>`<option value="${f.id}">${f.name}</option>`).join('');
  $('badge-shelf').innerHTML=Array.from({length:CASE_SHELVES},(_,i)=>`<option value="${i}">Shelf ${i+1}</option>`).join('');
  $('badge-filter').onchange=e=>{filter=e.target.value;renderLibrary();};$('badge-family').onchange=e=>{family=e.target.value;renderLibrary();};
  $('badge-case-edit').onclick=()=>{editing=!editing;paint();renderControls();};
  $('badge-case-save').onclick=()=>void save();
  $('badge-case-prev').onclick=()=>{page--;paint();};$('badge-case-next').onclick=()=>{page++;paint();};
  $('badge-case-wood').onchange=e=>{draft.wood=e.target.value;changed();paint();};$('badge-case-light').oninput=e=>{draft.light=Number(e.target.value);$('badge-light-value').textContent=draft.light+'%';changed();paint();};
  for(const key of ['width','height','contact','x'])$('badge-'+key).oninput=e=>{patch({[key]:Number(e.target.value)});$('badge-'+key+'-value').textContent=e.target.value+(key==='x'?'%':' px');};
  $('badge-shelf').onchange=e=>{patch({shelf:Number(e.target.value)});page=Math.floor(Number(e.target.value)/CASE_PAGE_ROWS);paint();};
  $('badge-facing').onclick=()=>{patch({facing:selectedItem()?.facing==='left'?'right':'left'});renderControls();};
  $('badge-hide').onclick=()=>{if(!selected)return;draft.hidden=[...new Set([...draft.hidden,selected])];changed();render();};
  $('badge-case-reset').onclick=()=>{if(busy||!confirm('Reset the trophy arrangement, finish and lighting? Your journal and earned trophies will stay.'))return;draft=badgeCaseLayout({},earned());selected=null;page=0;changed();render();};
  $('badge-library').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||busy)return;const id=b.dataset.selectBadge??b.dataset.displayBadge;if(!id)return;if(b.dataset.displayBadge&&draft.hidden.includes(id)){draft.hidden=draft.hidden.filter(v=>v!==id);ensure();changed();renderLibrary();}select(id);$('badge-case-stage').scrollIntoView({block:'center',behavior:'smooth'});});
  const stage=$('badge-case-stage');
  stage.addEventListener('click',e=>{if(suppressClick)return;const b=e.target.closest('[data-case-badge]');if(b&&!busy)select(b.dataset.caseBadge);});
  stage.addEventListener('keydown',e=>{const b=e.target.closest('[data-case-badge]');if(!b||!editing||busy||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();selected=b.dataset.caseBadge;const v=selectedItem(),step=e.shiftKey?5:1;if(e.key==='ArrowLeft'||e.key==='ArrowRight')patch({x:Math.max(0,Math.min(100,v.x+(e.key==='ArrowLeft'?-step:step)))});else{patch({shelf:Math.max(0,Math.min(CASE_SHELVES-1,v.shelf+(e.key==='ArrowUp'?-1:1)))});page=Math.floor(v.shelf/CASE_PAGE_ROWS);paint();}renderControls();stage.querySelector(`[data-case-badge="${selected}"]`)?.focus({preventScroll:true});});
  stage.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-case-badge]');if(!b||!editing||busy||e.button!==0)return;selected=b.dataset.caseBadge;drag={pointerId:e.pointerId,x:e.clientX,y:e.clientY,moved:false,original:{...selectedItem()}};stage.setPointerCapture(e.pointerId);renderControls();});
  stage.addEventListener('pointermove',e=>{if(!drag||drag.pointerId!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5&&!drag.moved)return;drag.moved=true;e.preventDefault();const rows=[...stage.querySelectorAll('[data-case-shelf]')],row=rows.reduce((best,node)=>{const r=node.getBoundingClientRect(),distance=Math.abs(e.clientY-(r.top+r.height/2));return !best||distance<best.distance?{node,distance}:best;},null)?.node;if(!row)return;const rect=row.getBoundingClientRect(),v=selectedItem();v.shelf=Number(row.dataset.caseShelf);v.x=badgeBounds({...v,x:(e.clientX-rect.left)/rect.width*100},rect.width).x;paint();});
  stage.addEventListener('pointerup',e=>endDrag(e));stage.addEventListener('pointercancel',e=>endDrag(e,true));stage.addEventListener('lostpointercapture',e=>endDrag(e,true));
 }
 return {wire,render,select,hasPending:()=>dirty||busy,canClose(){if(busy){onStatus('Saving your case. Please wait.');return false;}return !dirty||confirm('Discard your unsaved trophy case arrangement? Your earned trophies and journal will stay.');},reset(){draft=null;dirty=false;selected=null;drag=null;page=0;editing=false;},save};
}
