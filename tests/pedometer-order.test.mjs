import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateJournalOrder,orderPlaces,movePlace} from '../dist/journal-order.js';
import {caseWidgetSnapshot,createAdventureWidgetSync} from '../dist/adventure-widgets.js';
import {journalCare} from '../dist/achievements.js';
import {validateRecord,filterRecords,makeBackup,parseBackup,validateSettings} from '../dist/model.js';
import {writeVisit} from '../dist/visits.js';
import {mergeJournalPreferences} from '../dist/journal-tools.js';
import {createWidgetLaunch} from '../dist/widget.js';
const now='2026-10-18T12:00:00.000Z',place=(id='one',patch={})=>validateRecord({id,title:id,category:'Other',favorite:false,rating:0,notes:'',visited:'2026-10-18',lat:null,lng:null,updatedAt:now,...patch});
test('native step ledger rebases new sessions and resets without awarding historical or paused steps',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nth-step-ledger-'));try{
 fs.copyFileSync(new URL('../native/android/StepLedger.java',import.meta.url),path.join(dir,'StepLedger.java'));
 fs.writeFileSync(path.join(dir,'LedgerTest.java'),`package com.nthexperience.footprints;
 public class LedgerTest {static void check(boolean x){if(!x)throw new AssertionError();}public static void main(String[] args){StepLedger l=new StepLedger();check(l.accept(10000,"2026-10-18",1,1000)==0);check(l.total==0);check(l.accept(10007,"2026-10-18",1,2000)==7);check(l.today("2026-10-18")==7);check(l.accept(10009,"2026-10-19",1,3000)==2);check(l.today("2026-10-19")==2&&l.total==9);check(l.accept(10008,"2026-10-18",1,2500)==0&&l.total==9);l.rebase();check(l.accept(50000,"2026-10-19",1,6000)==0);check(l.accept(50003,"2026-10-19",1,7000)==3);check(l.total==12);check(l.accept(6,"2026-10-20",2,100)==0);check(l.accept(9,"2026-10-20",2,200)==3);check(l.total==15);check(l.accept(2,"2026-10-20",2,300)==0);check(l.accept(5,"2026-10-20",2,400)==3);check(l.total==18);check(l.today("2026-10-21")==0);boolean rejected=false;try{l.accept(-1,"2026-10-20",2,500);}catch(IllegalArgumentException e){rejected=true;}check(rejected&&l.total==18);System.out.println("PASS native step ledger");}}`);
 const java=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin/java'):fs.existsSync('/usr/lib/jvm/java-17-openjdk-amd64/bin/java')?'/usr/lib/jvm/java-17-openjdk-amd64/bin/java':'java',compile=spawnSync(java,['--module','jdk.compiler/com.sun.tools.javac.Main','-d',dir,path.join(dir,'StepLedger.java'),path.join(dir,'LedgerTest.java')],{encoding:'utf8'});assert.equal(compile.status,0,compile.stderr);const result=spawnSync(java,['-cp',dir,'com.nthexperience.footprints.LedgerTest'],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/PASS native step ledger/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('manual order composes with filters, keeps new places at the end and never changes records',()=>{
 const rows=[place('a'),place('b',{favorite:true}),place('c',{favorite:true})],before=structuredClone(rows),ids=['c','a','b'];assert.deepEqual(filterRecords(rows,{sort:'manual',order:ids}).map(r=>r.id),ids);assert.deepEqual(filterRecords(rows,{sort:'manual',order:ids,favorites:true}).map(r=>r.id),['c','b']);assert.deepEqual(orderPlaces([...rows,place('new')],ids).map(r=>r.id),[...ids,'new']);assert.deepEqual(movePlace(ids,'c','b'),['a','b','c']);assert.deepEqual(rows,before);assert.deepEqual(movePlace(ids,'missing','b'),ids);
 for(const bad of [null,['a','a'],['../bad'],Array(10001).fill('a')])assert.throws(()=>validateJournalOrder(bad));
});
test('journal order survives backups and follows the explicit restore-preferences choice',()=>{
 const order=['b','a'],settings={theme:'night',journalOrder:order};assert.deepEqual(parseBackup(JSON.stringify(makeBackup([place('a'),place('b')],settings))).settings,settings);assert.deepEqual(mergeJournalPreferences({journalOrder:['a']},settings,false).journalOrder,['a']);assert.deepEqual(mergeJournalPreferences({},settings,true).journalOrder,order);assert.equal(validateSettings({}).journalOrder,undefined);
});
test('Other categories can be reviewed explicitly without changing a chosen category or old visits',()=>{
 const a=place();assert.equal(journalCare([a],'category').length,1);const reviewed=writeVisit(a,{...a,categoryReviewed:true,updatedAt:now},'initial');assert.equal(journalCare([reviewed],'category').length,0);assert.equal(reviewed.category,'Other');assert.equal(journalCare([place('b',{category:'Nature'})],'category').length,0);assert.throws(()=>place('bad',{categoryReviewed:'yes'}));assert.equal(parseBackup(JSON.stringify(makeBackup([reviewed]))).records[0].categoryReviewed,true);
 assert.equal(journalCare([a],'tags').length,1);assert.equal(journalCare([a],'rating').length,1);assert.equal(journalCare([a],'voice').length,1);assert.equal(journalCare([a],'website').length,1);assert.equal(journalCare([a],'phone').length,1);
});
test('trophy widget mirrors earned and displayed badges with saved geometry and lighting, excluding locked items',()=>{
 const snapshot=caseWidgetSnapshot([place('a')],[],{badgeCase:{wood:'forest',light:82,items:[{id:'places-1',shelf:4,x:67,width:110,height:130,contact:9,facing:'left'}],hidden:['days-1']}});assert.equal(snapshot.wood,'forest');assert.equal(snapshot.light,82);assert.ok(snapshot.items.some(r=>r.id==='places-1'&&r.shelf===4&&r.width===110&&r.facing==='left'));assert.ok(!snapshot.items.some(r=>r.id==='days-1'||r.id==='places-5'));assert.equal(snapshot.total,84);assert.ok(snapshot.items.every(r=>r.art&&!r.photo&&!r.notes));
});
test('trophy widget writes coalesce to the newest durable state and report a retryable native error',async()=>{
 let release,calls=[],messages=[];const gate=new Promise(r=>release=r),sync=createAdventureWidgetSync({plugin:{async updateCase(v){calls.push(v);if(calls.length===1)await gate;}},onStatus:m=>messages.push(m)});const first=sync.refresh([place('a')],[],{});sync.refresh([place('b')],[],{});sync.refresh([],[],{});release();await first;assert.equal(calls.length,2);assert.equal(calls[1].snapshot.earned,0);await createAdventureWidgetSync({plugin:{updateCase:async()=>{throw Error('full');}},onStatus:m=>messages.push(m)}).refresh([],[],{});assert.match(messages[0],/could not refresh/);
});
test('native preparation declares all widget variants and the permission-gated service once, without boot auto-start',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nth-step-manifest-'));try{fs.symlinkSync(new URL('../native',import.meta.url),path.join(dir,'native'),'dir');const manifest=path.join(dir,'android/app/src/main/AndroidManifest.xml');fs.mkdirSync(path.dirname(manifest),{recursive:true});fs.writeFileSync(manifest,'<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application></application></manifest>');const script=new URL('../native/prepare-widget.mjs',import.meta.url);for(let i=0;i<2;i++){const r=spawnSync(process.execPath,[script.pathname],{cwd:dir,encoding:'utf8'});assert.equal(r.status,0,r.stderr);}const content=fs.readFileSync(manifest,'utf8');assert.equal((content.match(/<receiver /g)||[]).length,5);assert.equal((content.match(/<service /g)||[]).length,1);assert.match(content,/foregroundServiceType="health"/);for(const name of ['ACTIVITY_RECOGNITION','POST_NOTIFICATIONS','FOREGROUND_SERVICE_HEALTH'])assert.equal(content.split('android.permission.'+name+'"').length-1,1);assert.match(content,/sensor.stepcounter" android:required="false"/);assert.ok(!content.includes('BOOT_COMPLETED'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('step and trophy widget taps route to their own area and wait behind an open editor',async()=>{
 let action={action:'steps'},canOpen=false;const calls=[],launch=createWidgetLaunch({plugin:{addListener:async()=>({remove(){}}),takeLaunchAction:async()=>action},canOpen:()=>canOpen,openSteps:()=>calls.push('steps'),openBadges:()=>calls.push('badges')});await launch.start();assert.deepEqual(calls,[]);canOpen=true;launch.flush();assert.deepEqual(calls,['steps']);await launch.stop();action={action:'badges'};await launch.start();assert.deepEqual(calls,['steps','badges']);
});
