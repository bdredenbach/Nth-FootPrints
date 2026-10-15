import {journeyIdsOf,latestVisited} from './visits.js';
import {activeJourneys,journeySummary,validateJourney,setJourneyMembership,MAX_JOURNEYS} from './journeys.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createJourneysUI({document=globalThis.document,getState,write,onOpen=()=>{},onBrowse=()=>{},onMap=()=>{},onStatus=()=>{},confirm=globalThis.confirm,date=s=>s,art=r=>r.photo??`assets/${r.sampleArt??'blank'}.svg`,uuid=()=>crypto.randomUUID()}={}){
 const $=id=>document.getElementById(id);let selected=null,formDraft=null,members=null,membersBaseline=null,search='',busy=false;
 const state=()=>getState();
 function dirty(){if(!selected)return !!formDraft&&(formDraft.title.trim()!==''||formDraft.notes.trim()!=='');const j=state().journeys.find(j=>j.id===selected);return !!formDraft&&(formDraft.title!==j?.title||formDraft.notes!==j?.notes)||!!members&&JSON.stringify([...members].sort())!==membersBaseline;}
 function canClose(){if(busy){onStatus('Saving the journey. Please wait.');return false;}return !dirty()||confirm('Discard your unsaved journey changes? Saved footprints will stay.');}
 function reset(){selected=null;formDraft=null;members=null;membersBaseline=null;search='';}
 function show(id=null){if(!canClose())return;reset();selected=id;render();}
 async function act(action){if(busy)return;busy=true;render();try{await action();}catch(error){$('journey-status').textContent=error.message;}finally{busy=false;render();}}
 function render(){
  for(const id of ['journey-create-form','journey-form','journey-back','journey-member-search'])$(id).inert=busy;
  const {records,journeys}=state(),trip=journeys.find(j=>j.id===selected&&!j.deleted);if(selected&&!trip)reset();
  const editing=!!trip;const summary=trip?journeySummary(trip,records):null;
  $('journey-back').hidden=!editing;$('journey-list').hidden=editing;$('journey-editor').hidden=!editing;
  $('journey-new').hidden=editing;
  if(!editing){
   const trips=activeJourneys(journeys);$('journey-list').innerHTML=trips.map(j=>{const s=journeySummary(j,records);return `<button type="button" class="journey-card" data-journey-open="${esc(j.id)}">${s.cover?`<img src="${esc(art(s.cover))}" alt="" loading="lazy">`:'<span class="journey-no-cover" aria-hidden="true">✦</span>'}<span><strong>${esc(j.title)}</strong><small>${s.count} ${s.count===1?'footprint':'footprints'}${s.start?` · ${esc(date(s.start))}${s.end!==s.start?` – ${esc(date(s.end))}`:''}`:''}</small>${j.notes?`<p>${esc(j.notes)}</p>`:''}</span></button>`;}).join('')||'<p class="field-help">Make a journey for a road trip, a holiday, or a day worth keeping.</p>';
   formDraft??={title:'',notes:''};$('journey-new-name').value=formDraft.title;$('journey-new-notes').value=formDraft.notes;$('journey-create').disabled=busy;return;
  }
  formDraft??={title:trip.title,notes:trip.notes};
  const savedMembers=summary.places.map(r=>r.id),savedBaseline=JSON.stringify(savedMembers.slice().sort());
  if(members&&JSON.stringify([...members].sort())===membersBaseline&&savedBaseline!==membersBaseline){members=new Set(savedMembers);membersBaseline=savedBaseline;}
  members??=new Set(savedMembers);membersBaseline??=JSON.stringify([...members].sort());
  $('journey-name').value=formDraft.title;$('journey-notes').value=formDraft.notes;$('journey-caption').textContent=`${summary.count} ${summary.count===1?'footprint':'footprints'} · ${summary.located} on the map${summary.start?` · ${date(summary.start)}${summary.end!==summary.start?` – ${date(summary.end)}`:''}`:''}`;
  $('journey-cover').hidden=!summary.cover;if(summary.cover)$('journey-cover').src=art(summary.cover);
  $('journey-stops').innerHTML=summary.places.map(r=>`<article class="journey-stop"><button type="button" data-journey-memory="${esc(r.id)}"><img src="${esc(art(r))}" alt="" loading="lazy"><span><strong>${esc(r.title)}</strong><small>${esc(date(r.visited))}${r.visitEnd&&r.visitEnd!==r.visited?` – ${esc(date(r.visitEnd))}`:''}${r.visitCount>1?` · ${r.visitCount} visits`:''}</small></span></button><button type="button" class="text-button" data-journey-cover="${esc(r.id)}" ${busy?'disabled':''}>${trip.coverId===r.id?'Cover selected':'Use as cover'}</button></article>`).join('')||'<p class="field-help">Add footprints below to begin this journey.</p>';
  for(const id of ['journey-save','journey-save-members','journey-delete'])$(id).disabled=busy;
  $('journey-map').disabled=busy||!summary.located;$('journey-browse').disabled=busy||!summary.count;$('journey-member-search').value=search;renderMembers();
 }
 function renderMembers(){
  if(!members)return;const q=search.toLocaleLowerCase().trim(),records=state().records.slice().sort((a,b)=>latestVisited(b).localeCompare(latestVisited(a))||a.title.localeCompare(b.title));
  $('journey-members').innerHTML=records.filter(r=>!q||[r.title,r.address,r.notes].some(s=>String(s??'').toLocaleLowerCase().includes(q))).map(r=>`<label class="journey-member"><input type="checkbox" data-journey-member="${esc(r.id)}" ${members.has(r.id)?'checked':''} ${busy?'disabled':''}><span><strong>${esc(r.title)}</strong><small>${esc(date(latestVisited(r)))}</small></span></label>`).join('')||'<p class="field-help">No footprints match. Clear the search or save a footprint first.</p>';
  $('journey-members-count').textContent=`${members.size} selected · save the selection below`;
 }
 function wire(){
  $('journey-back').onclick=()=>show();
  for(const [input,field]of [['journey-new-name','title'],['journey-new-notes','notes'],['journey-name','title'],['journey-notes','notes']])$(input).oninput=()=>{formDraft??={title:'',notes:''};formDraft[field]=$(input).value;};
  $('journey-create-form').onsubmit=event=>{event.preventDefault();void act(async()=>{const now=new Date().toISOString(),journey=validateJourney({id:uuid(),title:formDraft?.title??'',notes:formDraft?.notes??'',createdAt:now,updatedAt:now});if(state().journeys.length>=MAX_JOURNEYS)throw Error('The journey limit has been reached.');await write({journeys:current=>current.concat(journey)});reset();selected=journey.id;$('journey-status').textContent='Journey created. Select its footprints below.';});};
  $('journey-form').onsubmit=event=>{event.preventDefault();void act(async()=>{const {journeys}=state(),old=journeys.find(j=>j.id===selected);if(!old)throw Error('Journey no longer available.');const next=validateJourney({...old,...formDraft,updatedAt:new Date().toISOString()});await write({journeys:current=>current.map(j=>j.id===selected?next:j)});formDraft={title:next.title,notes:next.notes};$('journey-status').textContent='Journey saved.';});};
  $('journey-member-search').oninput=()=>{search=$('journey-member-search').value;renderMembers();};
  $('journey-save-members').onclick=()=>void act(async()=>{const chosen=new Set(members),journeyId=selected;await write({records:rows=>setJourneyMembership(rows,journeyId,chosen)});members=null;membersBaseline=null;$('journey-status').textContent='Footprints saved to this journey.';});
  $('journey-delete').onclick=()=>{if(!confirm('Delete this journey? All its footprints, photos and stories will stay in your journal.'))return;void act(async()=>{const journeyId=selected,now=new Date().toISOString();await write({records:rows=>setJourneyMembership(rows,journeyId,[],now),journeys:rows=>rows.map(j=>j.id===journeyId?{...j,deleted:true,coverId:null,updatedAt:now}:j)});reset();$('journey-status').textContent='Journey removed. Your footprints are still in the journal.';});};
  $('journey-browse').onclick=()=>{if(canClose())onBrowse(selected);};$('journey-map').onclick=()=>{if(canClose())onMap(selected);};
  $('journeys').addEventListener('change',event=>{const id=event.target.dataset.journeyMember;if(id){if(event.target.checked)members.add(id);else members.delete(id);$('journey-members-count').textContent=`${members.size} selected · save the selection below`;}});
  $('journeys').addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.journeyOpen){show(button.dataset.journeyOpen);return;}if(button.dataset.journeyMemory){if(!busy)onOpen(button.dataset.journeyMemory);return;}if(button.dataset.journeyCover)void act(async()=>{const coverId=button.dataset.journeyCover,journeyId=selected;if(!state().records.some(r=>r.id===coverId&&journeyIdsOf(r).includes(journeyId)))throw Error('Add that footprint to this journey first.');await write({journeys:rows=>rows.map(j=>j.id===journeyId?{...j,coverId,updatedAt:new Date().toISOString()}:j)});$('journey-status').textContent='Journey cover saved.';});});
 }
 return {wire,open(){reset();$('journey-status').textContent='';render();},refresh(){if($('journeys').open)render();},canClose,reset};
}
