// One-time, read-only bridge for older debug APKs whose own exporter is capped at 150 MiB.
import {prepareJournalArchive} from './journal-archive.js';
import {saveArchiveParts} from './backup-parts.js';
export async function rescueLegacyJournal({partSize,onPart=(part,total)=>console.info(`Save rescue part ${part} of ${total}. Keep every part together.`)}={}){
 if(!window.NthNative?.BackupFiles)throw Error('Run this only inside your installed Nth FootPrints app, through its debugging console.');
 if(document.hidden)await new Promise(resolve=>{const visible=()=>{if(!document.hidden){document.removeEventListener('visibilitychange',visible);resolve();}};document.addEventListener('visibilitychange',visible);});
 if(document.querySelector('#editor[open],#batch-import[open],#backup[open]'))throw Error('Close the editor, import review and backup dialog first so only saved footprints are copied.');
 const state=await new Promise((resolve,reject)=>{const request=indexedDB.open('nth-footprints');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('journal','readonly'),get=tx.objectStore('journal').get('state');get.onsuccess=()=>resolve(get.result);get.onerror=()=>reject(get.error);tx.oncomplete=()=>db.close();};});
 if(!state?.records?.length||state.storageVersion===2)throw Error('This rescue is for an existing journal in an older APK. Use its normal backup if storage is already upgraded.');
 const archive=await prepareJournalArchive(state.records,state.settings??{theme:'paper'},state.journeys??[]);
 const prefix='Nth-FootPrints-rescue-'+new Date().toISOString().slice(0,10)+'-'+crypto.randomUUID().slice(0,8);
 const files=await saveArchiveParts(archive,prefix,{plugin:window.NthNative.BackupFiles,onPart,...(partSize?{partSize}:{})});
 const result={footprints:state.records.length,parts:files.length,bytes:archive.size,files:files.map(f=>f.name),journalUnchanged:true};console.info('Rescue backup complete. Keep the old app until this backup is restored and checked.',result);return result;
}
