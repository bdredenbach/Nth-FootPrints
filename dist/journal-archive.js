import {APP,VERSION,backupRecord,parseBackup,validateRecord} from './model.js';
import {externalize,visitMedia,isMediaKey,MEDIA_LIMIT} from './media-store.js';
import {createZip64,readZip64,verifyEntry} from './stream-archive.js';
const MANIFEST='nth-footprints-backup.json',INDEX_LIMIT=32*1024*1024;
const check=signal=>{if(signal?.aborted)throw Object.assign(Error('CANCELLED'),{name:'AbortError'});};
export async function prepareJournalArchive(records,settings,journeys,{signal,onProgress=()=>{}}={}){
 const data=await externalize(records.map(backupRecord));check(signal);const unique=new Map(data.entries.map(row=>[row.key,row]));
 const media=[...unique.values()].map(row=>({key:row.key,path:'media/'+row.key.slice(10)+'.bin',type:row.type,size:row.size}));
 const manifest={app:APP,archiveVersion:1,createdAt:new Date().toISOString(),journal:{app:APP,formatVersion:VERSION,records:data.records,settings,journeys},media};
 const index=new Blob([JSON.stringify(manifest)],{type:'application/json'});if(index.size>INDEX_LIMIT)throw Error('The backup index exceeds 32 MB.');
 const {crc32}=await import('./media-store.js');const entries=[{path:MANIFEST,blob:index,crc:crc32(new Uint8Array(await index.arrayBuffer()))}];
 for(const item of media){check(signal);const row=unique.get(item.key);entries.push({path:item.path,blob:row.blob,crc:row.crc});onProgress(entries.length-1,media.length);}
 return {...createZip64(entries,{signal}),manifest};
}
export async function inspectJournalArchive(file,{signal}={}){
 const entries=await readZip64(file,{signal}),entry=entries.get(MANIFEST);if(!entry)throw Error('Choose an Nth FootPrints backup archive.');const blob=await verifyEntry(entry,{signal,max:INDEX_LIMIT});let manifest;try{manifest=JSON.parse(await blob.text());}catch{throw Error('The backup index could not be read.');}
 if(manifest?.app!==APP||manifest.archiveVersion!==1||!Array.isArray(manifest.media)||manifest.media.length>100000||!manifest.journal||entries.size!==manifest.media.length+1)throw Error('Unsupported FootPrints archive.');const declared=new Map();
 for(const item of manifest.media){if(!isMediaKey(item?.key)||item.path!=='media/'+item.key.slice(10)+'.bin'||declared.has(item.key)||!/^image\/(jpeg|png|webp|gif)$|^audio\/[a-z0-9.+-]+$/i.test(item.type)||!Number.isSafeInteger(item.size)||item.size<0||item.size>MEDIA_LIMIT||entries.get(item.path)?.size!==item.size)throw Error('Invalid attachment index in backup.');declared.set(item.key,item);}
 const referenced=new Set(),preview=visitMedia(manifest.journal.records??[],(key,kind)=>{const item=declared.get(key);if(!item||!item.type.startsWith(kind+'/'))throw Error('A referenced attachment is missing or has the wrong type.');referenced.add(key);return 'data:'+item.type+';base64,AQID';});if(referenced.size!==declared.size)throw Error('Backup contains unreferenced attachments.');
 const parsed=parseBackup(JSON.stringify({...manifest.journal,records:preview}));return {archive:true,file,manifest,entries,...parsed};
}
export async function restoreJournalArchive(archive,{stage,signal,onProgress=()=>{}}){
 const map=new Map();let done=0;for(const item of archive.manifest.media){check(signal);const entry=archive.entries.get(item.path);await verifyEntry(entry,{signal});const url=await stage(entry.blob(item.type),item.key);map.set(item.key,url);onProgress(++done,archive.manifest.media.length);check(signal);}
 const records=visitMedia(archive.manifest.journal.records,p=>map.get(p)).map(validateRecord);return {...archive,records};
}
