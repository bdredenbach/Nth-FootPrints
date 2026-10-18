import {explorationStats} from './journal-tools.js';
import {visitsOf,journeyIdsOf} from './visits.js';

// Achievements describe the current journal, never inferred travel or device activity.
export const BADGE_FAMILIES=[
 {id:'places',name:'Footprints',art:'footsteps',unit:'places visited',levels:[1,5,10,25,50,100,250,500],titles:['First footprint','Out the door','Finding your feet','Local explorer','Trail maker','A hundred horizons','Far and wide','A world of footprints']},
 {id:'states',name:'Across the map',art:'mountain',unit:'states or provinces visited',levels:[1,3,5,10,20,50],titles:['First region','Beyond the border','Regional explorer','State of wonder','Across the map','Fifty chapters']},
 {id:'countries',name:'World wanderer',art:'globe',unit:'countries visited',levels:[1,2,5,10,25,50],titles:['A place in the world','Another shore','World wanderer','Ten horizons','Passport of memories','Around the world']},
 {id:'photos',name:'Through your lens',art:'camera',unit:'photos saved',levels:[1,10,25,50,100,250,500,1000],titles:['First frame','Little collection','Through your lens','A gallery begins','Hundred-frame story','Life in pictures','Memory curator','A thousand moments']},
 {id:'stories',name:'Story keeper',art:'journal',unit:'visits with a story',levels:[1,5,10,25,50,100],titles:['A story begins','Words worth keeping','Story keeper','Written in memory','Travel chronicler','A hundred stories']},
 {id:'revisited',name:'The way back',art:'homecoming',unit:'places revisited',levels:[1,3,5,10,25,50],titles:['The way back','Familiar footsteps','Favorite corners','Back again','Roots and routes','A life of returns']},
 {id:'days',name:'Days to remember',art:'compass',unit:'distinct days remembered',levels:[1,7,30,60,100,365],titles:['A day to remember','Seven remembered days','A month of memories','Sixty little adventures','Hundred-day journal','A year of days']},
 {id:'journeys',name:'Connected moments',art:'journey',unit:'journeys with saved visits',levels:[1,3,5,10,25,50],titles:['First journey','Connected moments','Journey maker','Roads well traveled','An atlas of journeys','Fifty adventures']},
 {id:'visits',name:'Keep exploring',art:'footsteps',unit:'visits remembered',levels:[10,25,50,100,250,500,1000],titles:['Ten remembered visits','Keep exploring','Fifty visits','A hundred visits','The long way home','Five hundred visits','A thousand visits']},
 {id:'voice',name:'In your own voice',art:'journal',unit:'visits with a voice note',levels:[1,5,10,25,50],titles:['In your own voice','Sounds of a journey','Voice of the traveler','Spoken memories','An archive of voices']}
];
export const BADGES=BADGE_FAMILIES.flatMap(f=>f.levels.map((target,i)=>({id:`${f.id}-${target}`,family:f.id,familyName:f.name,title:f.titles[i],art:f.art,target,unit:f.unit,tier:i+1})));
export function achievementProgress(records,journeys=[]){
 const stats=explorationStats(records),visits=records.flatMap(visitsOf),linked=new Set(records.flatMap(journeyIdsOf));
 const metrics={places:stats.places,states:stats.regions.length,countries:stats.countries.length,photos:stats.photos,stories:visits.filter(v=>v.notes?.trim()).length,revisited:records.filter(r=>visitsOf(r).length>1).length,days:stats.days,journeys:journeys.filter(j=>!j.deleted&&linked.has(j.id)).length,visits:stats.visits,voice:visits.filter(v=>v.audio).length};
 return {stats,metrics,badges:BADGES.map(b=>({...b,value:metrics[b.family],reached:metrics[b.family]>=b.target,progress:Math.min(1,metrics[b.family]/b.target)}))};
}

export const CARE_FILTERS=[['story','Missing a story'],['photo','Missing a photo'],['pin','Missing a map pin'],['address','Missing an address'],['country','Missing a country'],['region','Missing a state / province'],['journey','Not in a journey']];
export function journalCare(records,filter='story'){
 if(!CARE_FILTERS.some(([id])=>id===filter))return [];
 const missing=(record,visit)=>({story:!visit.notes?.trim(),photo:!(visit.photos?.length||visit.photo),pin:!Number.isFinite(visit.lat)||!Number.isFinite(visit.lng),address:!record.address?.trim(),country:!record.country?.trim(),region:!record.region?.trim(),journey:!visit.tripIds?.length})[filter];
 return records.flatMap(record=>visitsOf(record).filter(v=>missing(record,v)).map(visit=>({record,visit}))).sort((a,b)=>b.visit.visited.localeCompare(a.visit.visited)||a.record.title.localeCompare(b.record.title));
}
