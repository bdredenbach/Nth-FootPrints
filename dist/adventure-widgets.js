import {achievementProgress,BADGES} from './achievements.js';
import {badgeCaseLayout} from './badge-case.js';
export function caseWidgetSnapshot(records,journeys,settings,steps={}){const badges=achievementProgress(records,journeys,steps).badges.filter(b=>b.reached),layout=badgeCaseLayout(settings.badgeCase,badges),byId=new Map(badges.map(b=>[b.id,b]));return {earned:badges.length,total:BADGES.length,wood:layout.wood,light:Math.round(layout.light),items:layout.items.map(item=>({...item,art:byId.get(item.id).art,title:byId.get(item.id).title}))};}
export function createAdventureWidgetSync({plugin,onStatus=()=>{}}={}){
 let pending=null,running=null;
 async function drain(){while(pending){const next=pending;pending=null;try{await plugin.updateCase({snapshot:next});}catch{onStatus('Your journal is saved. Trophy widgets could not refresh; try Refresh widgets.');}}}
 function start(){running=drain().finally(()=>{running=null;if(pending)start();});return running;}
 return {refresh(records,journeys,settings,steps={}){if(!plugin)return Promise.resolve();pending=caseWidgetSnapshot(records,journeys,settings,steps);return running??start();}};
}
