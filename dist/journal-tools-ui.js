import {anniversaryMemories,flattenVisits,calendarMonth,explorationStats} from './journal-tools.js';
import {visitView} from './visits.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createJournalToolsUI({document,getState,write,onOpen,onMap,onImport,onBook,nearby,today,date,art,onStatus=()=>{}}){
 const $=id=>document.getElementById(id);let tab='memories',month=today().slice(0,7),day='',allDates=false,query='',tripId='',limit=100,busy=false;
 function canClose(){if(busy){onStatus('Saving your journal tools. Please wait.');return false;}return true;}
 function visitCards(rows){return rows.slice(0,limit).map(({record,visit,years})=>`<button class="tool-memory" data-tool-place="${esc(record.id)}" data-tool-visit="${esc(visit.id)}"><img src="${esc(art(visitView(record,visit.id)))}" alt="" loading="lazy"><span><strong>${esc(record.title)}</strong><small>${esc(date(visit.visited))}${years?` · ${years} ${years===1?'year':'years'} ago`:''}</small><p>${esc((visit.notes??'').slice(0,180))}</p></span></button>`).join('')+(rows.length>limit?'<button type="button" class="secondary" data-tool-more="true">Show more memories</button>':'');}
 function render(){
  const {records,journeys,settings}=getState();for(const button of document.querySelectorAll('[data-tool-tab]')){button.classList.toggle('active',button.dataset.toolTab===tab);button.setAttribute('aria-selected',String(button.dataset.toolTab===tab));}
  for(const name of ['memories','timeline','explore','nearby'])$('tools-'+name).hidden=name!==tab;
  $('show-memories').checked=settings.memories!==false;$('show-memories').disabled=busy;
  if(tab==='memories'){
   const chosen=$('memory-date').value||today();$('memory-date').value=chosen;const rows=anniversaryMemories(records,chosen);$('anniversary-list').innerHTML=visitCards(rows)||'<p class="field-help">No earlier-year visits on this date yet. Choose another date to look back.</p>';
  }
  if(tab==='timeline'){
   $('timeline-month').value=month;$('timeline-query').value=query;$('timeline-trip').innerHTML='<option value="">Every journey</option>'+journeys.filter(j=>!j.deleted).map(j=>`<option value="${esc(j.id)}">${esc(j.title)}</option>`).join('');$('timeline-trip').value=tripId;
   const rows=flattenVisits(records,{query,tripId}),calendar=calendarMonth(month),counts=new Map();for(const row of rows)counts.set(row.visit.visited,(counts.get(row.visit.visited)??0)+1);
   $('calendar-grid').innerHTML=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(n=>`<span class="calendar-weekday">${n}</span>`).join('')+'<span></span>'.repeat(calendar.offset)+calendar.days.map(d=>`<button type="button" data-calendar-day="${d}" class="${day===d?'active':''}" aria-label="${esc(date(d))}: ${counts.get(d)??0} visits" aria-pressed="${day===d}"><span>${Number(d.slice(8))}</span>${counts.has(d)?`<small>${counts.get(d)}</small>`:''}</button>`).join('');
   const selected=rows.filter(row=>allDates||day?allDates||row.visit.visited===day:row.visit.visited.startsWith(month));$('timeline-count').textContent=`${selected.length} visits · ${allDates?'all dates':day?date(day):month}`;$('timeline-all').setAttribute('aria-pressed',String(allDates));$('timeline-list').innerHTML=visitCards(selected)||'<p class="field-help">No visits in this selection. Try All dates, another month or a different search.</p>';
  }
  if(tab==='explore'){
   const stats=explorationStats(records);$('explore-counts').innerHTML=[['Places',stats.places],['Visits',stats.visits],['Photos',stats.photos],['Days remembered',stats.days],['Named countries',stats.countries.length],['States / provinces',stats.regions.length]].map(([label,count])=>`<div><strong>${count}</strong><span>${label}</span></div>`).join('');
   $('explore-countries').innerHTML=stats.countries.map(c=>`<button type="button" class="tool-region" data-explore-country="${esc(c.name)}"><span>${esc(c.name)}</span><b>${c.count}</b></button>`).join('')||'<p class="field-help">Add a country while editing a place to start your country count.</p>';
   $('explore-regions').innerHTML=stats.regions.map(c=>`<button type="button" class="tool-region" data-explore-country="${esc(c.country)}" data-explore-region="${esc(c.name)}"><span>${esc([c.name,c.country].filter(Boolean).join(', '))}</span><b>${c.count}</b></button>`).join('')||'<p class="field-help">Add a state or province to your places to see it here.</p>';
   $('explore-help').textContent=`${stats.located} places have a map position. ${stats.unlabelled} have no country label. Country and region counts use your labels, so you can name them the way you prefer.`;
   $('explore-milestones').innerHTML=stats.milestones.map(m=>`<li class="${m.reached?'reached':''}"><span aria-hidden="true">${m.reached?'✦':'○'}</span> ${esc(m.label)}${m.reached?' · reached':''}</li>`).join('');$('explore-years').innerHTML=stats.years.map(([year,count])=>`<div class="tool-region"><span>${year}</span><b>${count} visits</b></div>`).join('');
  }
  if(tab==='nearby')renderNearby(nearby.state);

 }
 function renderNearby(state){$('nearby-enable').textContent=state.enabled?'Turn nearby memories off':'Enable nearby memories';$('nearby-radius').value=state.radius;$('nearby-radius').disabled=state.enabled;$('nearby-memory-status').textContent=state.status;}
 async function action(fn){if(busy)return;busy=true;render();try{await fn();$('tools-status').textContent='Saved.';}catch(error){$('tools-status').textContent=error.message;}finally{busy=false;render();}}
 function wire(){
  for(const button of document.querySelectorAll('[data-tool-tab]'))button.onclick=()=>{if(!canClose())return;tab=button.dataset.toolTab;limit=100;render();};
  $('show-memories').onchange=()=>{const enabled=$('show-memories').checked;void action(()=>write(current=>current,settings=>({...settings,memories:enabled})));};
  $('memory-date').value=today();$('memory-date').onchange=()=>{limit=100;try{render();}catch(error){$('tools-status').textContent=error.message;}};
  $('timeline-month').onchange=e=>{if(!e.target.value)return;month=e.target.value;day='';allDates=false;limit=100;render();};$('timeline-query').oninput=e=>{query=e.target.value;limit=100;render();};$('timeline-trip').onchange=e=>{tripId=e.target.value;limit=100;render();};
  for(const [id,delta]of [['timeline-prev',-1],['timeline-next',1]])$(id).onclick=()=>{const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+delta);if(d.getUTCFullYear()<1||d.getUTCFullYear()>9999)return;month=d.toISOString().slice(0,7);day='';allDates=false;limit=100;render();};$('timeline-all').onclick=()=>{allDates=true;day='';limit=100;render();};
  $('tools-import').onclick=onImport;$('tools-book').onclick=()=>onBook();$('explore-map').onclick=()=>onMap({});
  $('nearby-enable').onclick=async()=>{try{if(nearby.state.enabled)await nearby.disable();else await nearby.enable(Number($('nearby-radius').value));}catch(error){$('nearby-memory-status').textContent=error.message;}renderNearby(nearby.state);};
  $('journal-tools').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.toolMore){limit+=100;render();return;}if(b.dataset.toolPlace){onOpen(b.dataset.toolPlace,b.dataset.toolVisit);return;}if(b.dataset.calendarDay){day=b.dataset.calendarDay;allDates=false;limit=100;render();return;}if(b.dataset.exploreCountry!==undefined){onMap({country:b.dataset.exploreCountry,region:b.dataset.exploreRegion??''});return;}});
 }
 return {wire,renderNearby,hasPending:()=>busy,open(next='memories'){tab=next;if(next==='memories')$('memory-date').value=today();$('tools-status').textContent='';render();},refresh(){if($('journal-tools').open)render();},canClose,reset(){}};
}
