import test from 'node:test';
import assert from 'node:assert/strict';
import {BADGES,BADGE_FAMILIES,achievementProgress,journalCare} from '../dist/achievements.js';
import {badgeCaseLayout,validateBadgeCase,badgeBounds} from '../dist/badge-case.js';
import {validateRecord,validateSettings,makeBackup,parseBackup} from '../dist/model.js';
import {writeVisit,removeVisit} from '../dist/visits.js';
import {mergeJournalPreferences} from '../dist/journal-tools.js';
const now='2026-10-18T12:00:00.000Z';
const place=(patch={})=>validateRecord({id:'one',title:'A place',category:'Nature',favorite:false,rating:0,visited:'2026-10-17',lat:0,lng:0,notes:'A story',country:'United States',region:'Massachusetts',updatedAt:now,...patch});
const trip={id:'trip',title:'A journey',notes:'',createdAt:now,updatedAt:now};
const returning=()=>writeVisit(place(),{visited:'2026-10-18',rating:0,notes:'',lat:null,lng:null,photos:[],audio:'data:audio/webm;base64,AQID',tripIds:['trip'],updatedAt:now},'new',{newId:()=> 'return'});
test('84 attainable badge rules have stable unique identities, increasing tiers and real art families',()=>{
 assert.equal(BADGES.length,84);assert.equal(new Set(BADGES.map(b=>b.id)).size,84);assert.equal(BADGE_FAMILIES.length,14);
 for(const f of BADGE_FAMILIES){assert.equal(f.levels.length,f.titles.length);assert.ok(f.levels.every((n,i)=>n>0&&(!i||n>f.levels[i-1])));}
 assert.equal(new Set(BADGES.map(b=>b.art)).size,8);
});
test('empty journals earn nothing; distinct places, return visits and nonempty journeys count independently',()=>{
 assert.ok(achievementProgress([],[]).badges.every(b=>!b.reached&&b.progress===0));
 const r=returning(),s=achievementProgress([r,place({id:'two',country:'united states',region:'massachusetts'})],[trip,{...trip,id:'empty'},{...trip,id:'removed',deleted:true}]);
 assert.deepEqual(s.metrics,{places:2,states:1,countries:1,photos:0,stories:2,revisited:1,days:2,journeys:1,visits:3,voice:1,steps:0,daily:0,active:0,goals:0});
 assert.equal(s.badges.find(b=>b.id==='revisited-1').reached,true);assert.equal(s.badges.find(b=>b.id==='places-5').progress,.4);
});
test('removing a return excludes its story, media, date and journey from progress and relocks its badge',()=>{
 const r=removeVisit(returning(),'return'),s=achievementProgress([r],[trip]);assert.equal(s.metrics.visits,1);assert.equal(s.metrics.voice,0);assert.equal(s.metrics.days,1);assert.equal(s.metrics.journeys,0);assert.equal(s.metrics.revisited,0);assert.equal(s.badges.find(b=>b.id==='revisited-1').reached,false);
});
test('Journal care targets the particular active visit, uses exact zero coordinates, and never changes records',()=>{
 const r=returning(),before=structuredClone(r);assert.deepEqual(journalCare([r],'story').map(x=>x.visit.id),['return']);assert.deepEqual(journalCare([r],'pin').map(x=>x.visit.id),['return']);assert.deepEqual(journalCare([r],'journey').map(x=>x.visit.id),['initial']);assert.equal(journalCare([r],'country').length,0);assert.equal(journalCare([r],'bogus').length,0);assert.equal(journalCare([r],'address').length,2);assert.deepEqual(r,before);
});
test('all 84 trophies fit automatic shelves, saved placements stay fixed and hidden trophies stay put away',()=>{
 const earned=BADGES.map(b=>({...b,reached:true})),layout=badgeCaseLayout({},earned);assert.equal(layout.items.length,84);assert.ok(layout.items.every(v=>v.shelf<40));assert.equal(new Set(layout.items.map(v=>v.id)).size,84);
 const moved={...layout.items[0],shelf:23,x:91,width:150,height:160};const config={...layout,items:[moved,...layout.items.slice(1)],hidden:[layout.items[1].id]};const result=badgeCaseLayout(config,earned);assert.deepEqual(result.items.find(v=>v.id===moved.id),moved);assert.ok(!result.items.some(v=>v.id===config.hidden[0]));assert.deepEqual(config.items[0],moved);
});
test('bounded layout copies its data, rejects corrupt values and keeps oversized trophies within a narrow shelf',()=>{
 const row=badgeCaseLayout({},BADGES.slice(0,1)).items[0],value={wood:'oak',light:0,items:[row],hidden:[]},copy=validateBadgeCase(value);copy.items[0].x=90;assert.notEqual(value.items[0].x,90);
 for(const patch of [{wood:'url(evil)'},{light:NaN},{light:101},{items:[row,row]},{hidden:['bad"id']},{items:[{...row,shelf:40}]},{items:[{...row,x:Infinity}]},{items:[{...row,width:100000}]}])assert.throws(()=>validateBadgeCase({...value,...patch}));
 const left=badgeBounds({...row,x:-100,width:160},220),right=badgeBounds({...row,x:999,width:160},220);assert.ok(left.x*2.2-left.width/2>=0);assert.ok(right.x*2.2+right.width/2<=220.00001);
});
test('case preferences round-trip backups and appearance restore chooses incoming or current layout explicitly',()=>{
 const a=badgeCaseLayout({wood:'oak'},BADGES.slice(0,1)),b=badgeCaseLayout({wood:'forest'},BADGES.slice(0,2)),record=place();
 const restored=parseBackup(JSON.stringify(makeBackup([record],{theme:'night',badgeCase:a})));assert.deepEqual(restored.settings.badgeCase,a);assert.deepEqual(restored.records,[record]);assert.equal(validateSettings({}).badgeCase,undefined);
 assert.deepEqual(mergeJournalPreferences({badgeCase:a},{badgeCase:b},false).badgeCase,a);assert.deepEqual(mergeJournalPreferences({badgeCase:a},{badgeCase:b},true).badgeCase,b);assert.deepEqual(mergeJournalPreferences({badgeCase:a},{},true).badgeCase,a);
});
test('step trophies come from native observations independently of journal visits and never accept corrupt metrics',()=>{
 const result=achievementProgress([],[],{steps:1000000,daily:20000,active:30,goals:7});assert.equal(result.badges.find(b=>b.id==='steps-1000000').reached,true);assert.equal(result.badges.find(b=>b.id==='daily-30000').reached,false);assert.equal(result.badges.find(b=>b.id==='goals-7').reached,true);assert.ok(result.badges.filter(b=>!['steps','daily','active','goals'].includes(b.family)).every(b=>!b.reached));
 const invalid=achievementProgress([],[],{steps:Infinity,daily:-1,active:'30',goals:NaN});assert.ok(invalid.badges.every(b=>!b.reached));
 const layout=badgeCaseLayout({},result.badges.filter(b=>b.reached));assert.ok(layout.items.some(i=>i.id==='steps-1000000'));assert.deepEqual(validateBadgeCase(layout),layout);
});
