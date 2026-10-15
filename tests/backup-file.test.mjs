import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {saveBackupFile,transferCancelled} from '../dist/backup-file.js';
import {APP,VERSION,MAX_BACKUP,validateRecord,parseBackup} from '../dist/model.js';

function document(overrides={}){
 const calls=[],chunks=[];
 const plugin={
  begin:async options=>{calls.push('begin');plugin.size=options.size;return {id:'document-1'};},
  append:async({id,data})=>{assert.equal(id,'document-1');const bytes=Buffer.from(data,'base64');assert.ok(bytes.length<=192*1024);chunks.push(bytes);calls.push('append');},
  finish:async()=>{calls.push('finish');return {name:'renamed.nthbackup',bytes:plugin.size};},
  abort:async()=>{calls.push('abort');},...overrides
 };return {plugin,calls,chunks};
}
test('native export preserves exact bytes across chunks, including Unicode and media',async()=>{
 const bytes=JSON.stringify({title:'Here 🌲 café 日本語',photo:'data:image/jpeg;base64,'+'abcd'.repeat(160000)}),blob=new Blob([bytes]);
 const {plugin,calls,chunks}=document();const progress=[];
 const result=await saveBackupFile(blob,'journal.nthbackup',{native:true,plugin,onProgress:p=>progress.push(p),onCommit:()=>calls.push('commit')});
 assert.equal(Buffer.concat(chunks).toString(),bytes);assert.deepEqual(calls.slice(-2),['commit','finish']);
 assert.equal(result.confirmed,true);assert.equal(result.name,'renamed.nthbackup');assert.equal(result.bytes,blob.size);
 assert.ok(progress.filter(p=>p.phase==='writing').length>1);assert.equal(progress.at(-1).phase,'finalizing');
});
test('export stays pending until Android closes the document',async()=>{
 let finish;const {plugin}=document({finish:()=>new Promise(r=>{finish=r;})});let completed=false;
 const pending=saveBackupFile(new Blob(['abc']),'journal.nthbackup',{native:true,plugin}).then(x=>{completed=true;return x;});
 while(!finish)await new Promise(r=>setImmediate(r));assert.equal(completed,false);finish({bytes:3,name:'journal.nthbackup'});await pending;assert.equal(completed,true);
});
test('cancel during writing aborts the native document without completing it',async()=>{
 const controller=new AbortController();const {plugin,calls}=document();
 await assert.rejects(saveBackupFile(new Blob(['a'.repeat(400000)]),'journal.nthbackup',{native:true,plugin,signal:controller.signal,onProgress:p=>{if(p.phase==='writing')controller.abort();}}),e=>transferCancelled(e));
 assert.deepEqual(calls,['begin','append','abort']);
});
test('picker cancellation does not create a stream or claim a saved backup',async()=>{
 const {plugin,calls}=document({begin:async()=>{throw Object.assign(Error('Export cancelled.'),{code:'CANCELLED'});}});
 await assert.rejects(saveBackupFile(new Blob(['abc']),'journal.nthbackup',{native:true,plugin}),e=>transferCancelled(e));assert.deepEqual(calls,[]);
});
test('write errors abort the partial document and preserve the error',async()=>{
 const {plugin,calls}=document({append:async()=>{throw Error('No space left');}});
 await assert.rejects(saveBackupFile(new Blob(['abc']),'journal.nthbackup',{native:true,plugin}),/No space/);assert.deepEqual(calls,['begin','abort']);
});
test('finalization failure or incomplete byte count cannot be reported as saved',async()=>{
 const {plugin,calls}=document({finish:async()=>({bytes:1})});
 await assert.rejects(saveBackupFile(new Blob(['abc']),'journal.nthbackup',{native:true,plugin}),/complete backup/);assert.ok(calls.includes('abort'));
});
test('failed cleanup explicitly reports the possible incomplete file',async()=>{
 const {plugin}=document({append:async()=>{throw Error('Write failed');},abort:async()=>{throw Error('Cannot delete');}});
 await assert.rejects(saveBackupFile(new Blob(['abc']),'journal.nthbackup',{native:true,plugin}),/incomplete file may remain/);
});
test('native builds never silently fall back to a broken browser download',async()=>{
 let clicked=false;
 await assert.rejects(saveBackupFile(new Blob(['abc']),'journal.nthbackup',{native:true,download:()=>{clicked=true;}}),/no save-file handler/);assert.equal(clicked,false);
});
test('browser file writer confirms only after close; download fallback remains unconfirmed',async()=>{
 const calls=[];const picker=async()=>({createWritable:async()=>({write:async()=>calls.push('write'),close:async()=>calls.push('close')})});
 const saved=await saveBackupFile(new Blob(['abc']),'journal.nthbackup',{picker});assert.equal(saved.confirmed,true);assert.deepEqual(calls,['write','close']);
 const result=await saveBackupFile(new Blob(['abc']),'journal.nthbackup',{download:()=>calls.push('download')});assert.equal(result.confirmed,false);assert.equal(calls.at(-1),'download');
});

const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
function backupDialog(save){
 const nodes=Object.fromEntries(['details','backup','restore-preview','transfer','transfer-title','transfer-file','transfer-detail','save-backup','dismiss-transfer','cancel-transfer','transfer-progress','transfer-percent','transfer-label','backup-status','export-all','backup-file'].map(id=>[id,{hidden:true,open:id==='backup',textContent:'',dataset:{},setAttribute(){}}]));
 const r=validateRecord({id:'place',title:'Our first place 🌲',category:'Nature',visited:'2026-10-15',rating:4,favorite:false,lat:0,lng:0,notes:'Saved original',address:'',phone:'',url:'',photo:null,audio:null,sampleArt:null,updatedAt:'2026-10-15T13:00:00Z'});
 const state=vm.createContext({$:id=>nodes[id],APP,VERSION,MAX_BACKUP,validateRecord,parseBackup,Blob,AbortController,setTimeout,records:[r],settings:{theme:'paper'},transferToken:0,transferRunning:false,transferAbort:null,pendingExport:null,pendingRestore:null,exportSaving:false,exportCommit:false,restoreCommit:false,activeReader:null,device:{native:true},window:{NthNative:{BackupFiles:{}}},today:()=> '2026-10-15',saveBackupFile:save,transferCancelled,show:()=>{}});
 vm.runInContext(source.slice(source.indexOf('const tick=()=>'),source.indexOf('async function finishCameraPhoto(')),state);return {state,nodes};
}
test('dialog prepares a valid backup at 50%, and confirms 100% only after saving',async()=>{
 let resolve;const {state,nodes}=backupDialog(()=>new Promise(r=>{resolve=r;}));
 await state.exportBackup();assert.equal(nodes['transfer-progress'].value,50);assert.equal(nodes['save-backup'].hidden,false);assert.equal(state.transferRunning,true);
 const parsed=parseBackup(await state.pendingExport.blob.text());assert.equal(parsed.records[0].title,'Our first place 🌲');
 const saving=state.savePreparedBackup();assert.equal(nodes['transfer-progress'].value,50);resolve({confirmed:true,name:'journal.nthbackup',bytes:100});await saving;
 assert.equal(nodes['transfer-progress'].value,100);assert.match(nodes['backup-status'].textContent,/Saved journal.nthbackup/);assert.equal(state.transferRunning,false);
});
test('dialog shows write failure rather than success and clears prepared media',async()=>{
 const {state,nodes}=backupDialog(async()=>{throw Error('Disk full');});await state.exportBackup();await state.savePreparedBackup();
 assert.equal(nodes.transfer.dataset.state,'error');assert.match(nodes['backup-status'].textContent,/Disk full/);assert.notEqual(nodes['transfer-progress'].value,100);assert.equal(state.pendingExport,null);
});
