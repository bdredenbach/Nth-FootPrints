export function createPedometerUI({document,plugin,healthPlugin,onStatus=()=>{},onState=()=>{}}){
 const $=id=>document.getElementById(id);let state={available:!!plugin,today:0,total:0,goal:6000,history:[]},health={},busy=false,healthBusy=false,version=0,goalDraft=null,timer,lastHealth=0;
 const number=v=>Number.isFinite(v)&&v>=0?Math.floor(v):0;
 function render(){
  $('steps-today').textContent=number(state.today).toLocaleString();$('steps-total').textContent=number(state.total).toLocaleString();$('steps-goal-progress').max=number(state.goal)||6000;$('steps-goal-progress').value=Math.min(number(state.today),number(state.goal)||6000);
  $('step-toggle').disabled=busy||!plugin||!state.available;$('step-toggle').textContent=busy?'Please wait…':state.running?'Pause phone tracking':state.enabled?'Resume phone tracking':'Start counting phone steps';
  $('step-goal-save').disabled=busy||!plugin;$('step-goal').disabled=!plugin;$('step-goal').value=goalDraft??state.goal??6000;
  $('steps-running').textContent=!plugin?'Available in the Android app':state.source==='health'?(state.readGranted?'Health Connect · latest synced steps':'Health Connect · access needed'):!state.available?'Step sensor unavailable':state.running?'Phone tracking enabled':state.enabled?'Tracking interrupted · resume to continue':'Phone tracking paused';
  const rows=Array.isArray(state.history)?state.history.slice(0,7):[];$('step-history').innerHTML=rows.map(r=>`<div class="tool-region"><span>${/^\d{4}-\d{2}-\d{2}$/.test(r.date)?r.date:''}</span><b>${number(r.steps).toLocaleString()} steps</b></div>`).join('');
  if(state.error&&!busy)$('step-status').textContent=String(state.error);
 }
 function renderHealth(){
  const native=!!healthPlugin,available=native&&health.available,connected=health.connected;
  $('health-connection').textContent=!native?'Available in the Android app':!available?health.needsInstall?'Install or update Health Connect to connect.':'Health Connect is unavailable on this device.':connected?`Connected · ${health.readGranted?'read steps enabled':'read steps not allowed'} · ${health.writeGranted?'write steps enabled':'write steps not allowed'}`:'Not connected';
  $('health-connect').textContent=healthBusy?'Please wait…':connected?'Review step permissions':'Connect Health Connect';$('health-connect').disabled=healthBusy||!available;
  for(const id of ['health-source','health-share','health-sync'])$(id).disabled=healthBusy||!available||!connected;
  $('health-disconnect').disabled=healthBusy||!native||!connected;
  for(const id of ['health-settings','health-privacy'])$(id).disabled=healthBusy||!native;
  $('health-settings').textContent=health.needsInstall?'Get Health Connect':'Manage access';$('health-source').value=health.source??'phone';$('health-share').checked=!!health.share;
  const stamps=[];if(health.lastRead)stamps.push('Steps refreshed '+new Date(health.lastRead).toLocaleString());if(health.lastWrite)stamps.push('Sharing checked '+new Date(health.lastWrite).toLocaleString());$('health-last-sync').textContent=stamps.join(' · ')||'Connected totals refresh when you open the app or tap Sync now. Widgets show the last refreshed total.';
  if(health.error&&!healthBusy)$('health-status').textContent=String(health.error);
 }
 async function refresh(){if(!plugin||busy){if(!plugin)render();return;}const request=++version;try{const next=await plugin.getStatus();if(request!==version||busy)return;state=next;render();onState(state);}catch{if(request===version)$('step-status').textContent='The step counter could not refresh. Try again.';}}
 async function action(fn){if(busy||!plugin)return;busy=true;version++;$('step-status').textContent='';render();try{state=await fn();render();onState(state);}catch(e){$('step-status').textContent=e.message||'The step counter could not update.';onStatus($('step-status').textContent);}finally{busy=false;render();setTimeout(()=>void refresh(),700);}}
 async function healthAction(fn,{silent=false}={}){if(healthBusy||!healthPlugin)return;healthBusy=true;$('health-status').textContent='';renderHealth();try{health=await fn();lastHealth=Date.now();if(!silent)$('health-status').textContent=health.error||'Health Connect updated.';}catch(e){$('health-status').textContent=e.message||'Health Connect could not update. Tap Sync now to retry.';if(!silent)onStatus($('health-status').textContent);}finally{healthBusy=false;renderHealth();await refresh();}}
 async function syncHealth(){if(!healthPlugin||healthBusy||document.hidden)return;await healthAction(async()=>{const status=await healthPlugin.getStatus();return status.connected&&status.available?healthPlugin.sync():status;},{silent:true});}
 return {wire(){render();renderHealth();$('step-toggle').onclick=()=>void action(()=>state.running?plugin.stop():plugin.start());$('step-refresh').onclick=()=>{void refresh();void syncHealth();};$('step-goal').oninput=e=>{goalDraft=e.target.value;};$('step-goal-save').onclick=()=>{const goal=Number($('step-goal').value);if(!Number.isInteger(goal)||goal<100||goal>100000){$('step-status').textContent='Choose a daily goal between 100 and 100,000 steps.';return;}void action(async()=>{const result=await plugin.setGoal({goal});goalDraft=null;$('step-status').textContent='Daily goal saved. Today’s trophy goal keeps the target recorded with its first steps.';return result;});};
  $('health-connect').onclick=()=>void healthAction(()=>healthPlugin.connect({write:$('health-share').checked}));
  $('health-source').onchange=e=>{const source=e.target.value;void healthAction(async()=>{let current=await healthPlugin.getStatus();if(source==='health'&&!current.readGranted)current=await healthPlugin.connect({write:!!current.share});if(source==='health'&&!current.readGranted)throw Error('Allow read steps in Health Connect to use combined steps.');return healthPlugin.configure({source});});};
  $('health-share').onchange=e=>{const share=e.target.checked;void healthAction(async()=>{let current=await healthPlugin.getStatus();if(share&&!current.writeGranted)current=await healthPlugin.connect({write:true});if(share&&!current.writeGranted)throw Error('Allow write steps in Health Connect to share FootPrints steps.');return healthPlugin.configure({share});});};
  $('health-sync').onclick=()=>void healthAction(()=>healthPlugin.sync());$('health-disconnect').onclick=()=>void healthAction(()=>healthPlugin.disconnect());
  for(const [id,method]of [['health-settings','openSettings'],['health-privacy','privacy']])$(id).onclick=()=>{void healthPlugin?.[method]().catch(e=>{$('health-status').textContent=e.message;});};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){void refresh();void syncHealth();}});
 },refresh,syncHealth,start(){void refresh();void syncHealth();if(plugin&&!timer)timer=setInterval(()=>{if(!document.hidden&&$('journeys').open){if(!$('travel-explore').hidden)void refresh();if(Date.now()-lastHealth>=60000)void syncHealth();}},3000);},hasPending:()=>busy||healthBusy};
}
