import {achievementProgress,BADGE_FAMILIES} from './achievements.js';
import {createBadgeCaseUI} from './badge-case-ui.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createTravelUI({document,getState,journeyUI,writeSettings,onMap,onStatus,confirm}){
 const $=id=>document.getElementById(id);let tab='explore',milestoneFilter='all',milestoneFamily='';
 const getProgress=()=>achievementProgress(getState().records,getState().journeys,getState().stepProgress);
 const badgeCase=createBadgeCaseUI({document,getState,getProgress,write:config=>writeSettings(current=>({...current,badgeCase:config})),onStatus,confirm});
 function render(){
  for(const b of document.querySelectorAll('[data-travel-tab]')){const active=b.dataset.travelTab===tab;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;}
  for(const name of ['explore','milestones','journeys','badges'])$('travel-'+name).hidden=tab!==name;
  if(tab==='journeys'){journeyUI.refresh();return;}
  const {stats,metrics,badges}=getProgress();
  if(tab==='explore'){
   $('explore-counts').innerHTML=[['Places visited',stats.places],['States visited',stats.regions.length],['Countries visited',stats.countries.length],['Places revisited',metrics.revisited],['Visits remembered',stats.visits],['Photos',stats.photos],['Days remembered',stats.days],['Stories kept',metrics.stories],['Journeys',metrics.journeys]].map(([label,count])=>`<div><strong>${count.toLocaleString()}</strong><span>${label}</span></div>`).join('');
   $('explore-help').textContent=`${stats.located} places have a map position. ${stats.unlabelled} have no country label. States includes provinces and other regions. Country and region totals use your reviewed labels; they are not inferred from your current location.`;
   $('explore-countries').innerHTML=stats.countries.map(c=>`<button type="button" class="tool-region" data-travel-country="${esc(c.name)}"><span>${esc(c.name)}</span><b>${c.count} ${c.count===1?'place':'places'}</b></button>`).join('')||'<p class="field-help">Add a country while editing a place to begin your country count.</p>';
   $('explore-regions').innerHTML=stats.regions.map(c=>`<button type="button" class="tool-region" data-travel-country="${esc(c.country)}" data-travel-region="${esc(c.name)}"><span>${esc([c.name,c.country].filter(Boolean).join(', '))}</span><b>${c.count} ${c.count===1?'place':'places'}</b></button>`).join('')||'<p class="field-help">Add a state or province to your places to see it here.</p>';
   $('explore-years').innerHTML=stats.years.map(([year,count])=>`<div class="tool-region"><span>${year}</span><b>${count} visits</b></div>`).join('')||'<p class="field-help">Your first saved visit starts the timeline.</p>';
  }
  if(tab==='milestones'){
   $('milestone-summary').textContent=`${badges.filter(b=>b.reached).length} reached · ${badges.length} milestones across ${BADGE_FAMILIES.length} collections`;
   $('milestone-list').innerHTML=BADGE_FAMILIES.filter(f=>!milestoneFamily||f.id===milestoneFamily).map(f=>{const rows=badges.filter(b=>b.family===f.id&&(milestoneFilter==='all'||(milestoneFilter==='reached')===b.reached));return rows.length?`<section class="milestone-collection"><h4>${esc(f.name)}</h4>${rows.map(b=>`<button type="button" class="milestone-card ${b.reached?'reached':''}" data-milestone-badge="${b.id}"><span class="milestone-mark" aria-hidden="true">${b.reached?'✦':'○'}</span><span><strong>${esc(b.title)}</strong><small>${b.target.toLocaleString()} ${esc(b.unit)}</small><progress value="${Math.min(b.value,b.target)}" max="${b.target}" aria-label="${esc(b.title)} progress"></progress></span><span class="milestone-value">${b.reached?'Reached':`${b.value.toLocaleString()} / ${b.target.toLocaleString()}`}</span></button>`).join('')}</section>`:'';}).join('')||'<p class="field-help">No milestones in this selection yet.</p>';
  }
  if(tab==='badges')badgeCase.render();
 }
 function choose(next){if(!['explore','milestones','journeys','badges'].includes(next)||next===tab)return;if(tab==='journeys'){if(!journeyUI.canClose())return;journeyUI.open();}tab=next;render();}
 function wire(){
  badgeCase.wire();$('milestone-family').innerHTML='<option value="">Every collection</option>'+BADGE_FAMILIES.map(f=>`<option value="${f.id}">${esc(f.name)}</option>`).join('');
  $('milestone-filter').onchange=e=>{milestoneFilter=e.target.value;render();};$('milestone-family').onchange=e=>{milestoneFamily=e.target.value;render();};
  const buttons=[...document.querySelectorAll('[data-travel-tab]')];for(const b of buttons){b.onclick=()=>choose(b.dataset.travelTab);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=buttons.indexOf(b),target=buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowLeft'?-1:1)+buttons.length)%buttons.length];choose(target.dataset.travelTab);if(tab===target.dataset.travelTab)target.focus();};}
  $('explore-map').onclick=()=>onMap({});
  $('journeys').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.travelCountry!==undefined)onMap({country:b.dataset.travelCountry,region:b.dataset.travelRegion??''});if(b.dataset.milestoneBadge){tab='badges';render();badgeCase.select(b.dataset.milestoneBadge);}});
 }
 return {wire,open(next='explore'){tab=['explore','milestones','journeys','badges'].includes(next)?next:'explore';badgeCase.reset();journeyUI.open();render();},refresh(){if($('journeys').open)render();},canClose({journeyChecked=false}={}){return (journeyChecked||journeyUI.canClose())&&badgeCase.canClose();},hasPending:()=>badgeCase.hasPending(),reset(){journeyUI.reset();badgeCase.reset();},get tab(){return tab;}};
}
