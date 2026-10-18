export function createPedometerUI({document,plugin,onStatus=()=>{}}){
 const $=id=>document.getElementById(id);let state={available:!!plugin,today:0,total:0,goal:6000,history:[]},busy=false,version=0,goalDraft=null,timer;
 const number=v=>Number.isFinite(v)&&v>=0?Math.floor(v):0;
 function render(){
  $('steps-today').textContent=number(state.today).toLocaleString();$('steps-total').textContent=number(state.total).toLocaleString();$('steps-goal-progress').max=number(state.goal)||6000;$('steps-goal-progress').value=Math.min(number(state.today),number(state.goal)||6000);
  $('step-toggle').disabled=busy||!plugin||!state.available;$('step-toggle').textContent=busy?'Please wait…':state.running?'Pause tracking':state.enabled?'Resume tracking':'Start counting steps';
  $('step-goal-save').disabled=busy||!plugin;$('step-goal').disabled=!plugin;$('step-goal').value=goalDraft??state.goal??6000;
  $('steps-running').textContent=!plugin?'Available in the Android app':!state.available?'Step sensor unavailable':state.running?'Tracking enabled':state.enabled?'Tracking interrupted · resume to continue':'Tracking paused';
  const rows=Array.isArray(state.history)?state.history.slice(0,7):[];$('step-history').innerHTML=rows.map(r=>`<div class="tool-region"><span>${/^\d{4}-\d{2}-\d{2}$/.test(r.date)?r.date:''}</span><b>${number(r.steps).toLocaleString()} steps</b></div>`).join('');
  if(state.error&&!busy)$('step-status').textContent=String(state.error);
 }
 async function refresh(){if(!plugin||busy){if(!plugin)render();return;}const request=++version;try{const next=await plugin.getStatus();if(request!==version||busy)return;state=next;render();}catch{if(request===version)$('step-status').textContent='The step counter could not refresh. Try again.';}}
 async function action(fn){if(busy||!plugin)return;busy=true;version++;$('step-status').textContent='';render();try{state=await fn();render();}catch(e){$('step-status').textContent=e.message||'The step counter could not update.';onStatus($('step-status').textContent);}finally{busy=false;render();setTimeout(()=>void refresh(),700);}}
 return {wire(){render();$('step-toggle').onclick=()=>void action(()=>state.running?plugin.stop():plugin.start());$('step-refresh').onclick=()=>void refresh();$('step-goal').oninput=e=>{goalDraft=e.target.value;};$('step-goal-save').onclick=()=>{const goal=Number($('step-goal').value);if(!Number.isInteger(goal)||goal<100||goal>100000){$('step-status').textContent='Choose a daily goal between 100 and 100,000 steps.';return;}void action(async()=>{const result=await plugin.setGoal({goal});goalDraft=null;$('step-status').textContent='Daily goal saved.';return result;});};},refresh,start(){void refresh();if(plugin&&!timer)timer=setInterval(()=>{if(!document.hidden&&$('journeys').open&&!$('travel-explore').hidden)void refresh();},3000);},hasPending:()=>busy};
}
