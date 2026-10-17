// Real >2 GiB transport/restore regression with file-backed Blobs and bounded heaps.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {registerMedia,forgetMedia,mediaInfo,prepareMedia} from '../dist/media-store.js';
import {prepareJournalArchive,inspectJournalArchive,restoreJournalArchive} from '../dist/journal-archive.js';
import {saveBackupFile} from '../dist/backup-file.js';
const dir=await fsp.mkdtemp(path.join(os.tmpdir(),'nth-large-backup-')),size=17*1024*1024,count=128;
try{
 const fixture=path.join(dir,'source.bin'),fd=await fsp.open(fixture,'w');await fd.truncate(size*count);for(let i=0;i<count;i++)await fd.write(Buffer.from('Nth unique transport fixture '+i),0,('Nth unique transport fixture '+i).length,i*size);await fd.close();
 const original=await fs.openAsBlob(fixture,{type:'audio/webm'}),rows=[];
 for(let i=0;i<count;i++){const source=original.slice(i*size,(i+1)*size,'audio/webm'),prepared=await prepareMedia(source),url=await registerMedia(source,{key:prepared.key,crc:prepared.crc});rows.push({id:'large-'+i,title:'Large transport fixture '+i,category:'Other',visited:'2026-10-17',rating:0,favorite:false,lat:null,lng:null,audio:url,updatedAt:'2026-10-17T04:00:00Z'});if(i%32===31){console.log('Prepared '+(i+1)+' original media files');global.gc?.();}}
 const archive=await prepareJournalArchive(rows,{theme:'night'},[]);assert.equal(archive.manifest.media.length,count);assert.ok(archive.size>2**31);
 const output=path.join(dir,'large.nthbackup'),file=await fsp.open(output,'w'),hash=createHash('sha256');let written=0,last=0;
 const result=await saveBackupFile(archive,'large.nthbackup',{picker:async()=>({createWritable:async()=>({async write(bytes){let offset=0;while(offset<bytes.length){const r=await file.write(bytes,offset,bytes.length-offset);offset+=r.bytesWritten;}hash.update(bytes);written+=bytes.length;},close:()=>file.close(),abort:()=>file.close()})}),onProgress:({written:done})=>{if(done-last>512*1024*1024){last=done;console.log('Streamed '+Math.round(done/1048576)+' MiB');global.gc?.();}}});
 assert.equal(result.bytes,archive.size);assert.equal(written,archive.size);const digest=hash.digest('hex');forgetMedia();global.gc?.();
 const input=await fs.openAsBlob(output),preview=await inspectJournalArchive(input);assert.equal(preview.records.length,count);let restoredBytes=0;
 const restored=await restoreJournalArchive(preview,{stage:async(blob,key)=>{const prepared=await prepareMedia(blob,{key});const target=path.join(dir,key.slice(10)+'.media'),f=await fsp.open(target,'w');for(let at=0;at<blob.size;at+=192*1024){const bytes=new Uint8Array(await blob.slice(at,at+192*1024).arrayBuffer());let pos=0;while(pos<bytes.length){const r=await f.write(bytes,pos,bytes.length-pos);pos+=r.bytesWritten;}}await f.close();const saved=await fs.openAsBlob(target,{type:blob.type}),url=await registerMedia(saved,{key,crc:prepared.crc});restoredBytes+=saved.size;global.gc?.();return url;},onProgress:(done)=>{if(done%32===0)console.log('Restored '+done+' verified originals');}});
 assert.equal(restored.records.length,count);assert.equal(restoredBytes,size*count);for(const r of restored.records)assert.equal(mediaInfo(r.audio).size,size);
 const classes=path.join(dir,'classes'),javaRoot=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin'):'/usr/lib/jvm/java-17-openjdk-amd64/bin',java=path.join(javaRoot,'java');
 const build=spawnSync(java,['--module','jdk.compiler/com.sun.tools.javac.Main','-d',classes,'native/android/BackupIO.java','native/archive-tests/LargeBackupIOTest.java'],{encoding:'utf8'});assert.equal(build.status,0,build.stderr);
 const native=spawnSync(java,['-Xmx32m','-cp',classes,'com.nthexperience.footprints.LargeBackupIOTest',output,digest],{encoding:'utf8',timeout:180000});assert.equal(native.status,0,native.stderr);console.log(native.stdout.trim());
 console.log(JSON.stringify({archiveBytes:archive.size,restoredOriginalBytes:restoredBytes,originals:count,sha256:digest,nodeHeapLimitMiB:96,nativeHeapLimitMiB:32,maxRssMiB:Math.round(process.resourceUsage().maxRSS/1024),passed:true}));
}finally{forgetMedia();await fsp.rm(dir,{recursive:true,force:true});}
