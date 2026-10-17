// Compatibility volumes contain consecutive bytes of ONE ZIP64 archive.
import {saveBackupFile} from './backup-file.js';
export const PART_SIZE=140*1024*1024;
export async function saveArchiveParts(archive,prefix,{plugin,signal,onPart=()=>{},partSize=PART_SIZE}={}){
 if(!Number.isSafeInteger(partSize)||partSize<1||partSize>PART_SIZE)throw Error('Invalid backup part size.');
 const count=Math.ceil(archive.size/partSize),iterator=archive.chunks()[Symbol.asyncIterator]();let carry=null,offset=0,written=0;const saved=[];
 try{for(let part=1;part<=count;part++){
  const size=Math.min(partSize,archive.size-written),source={size,async *chunks(){let left=size;while(left){if(signal?.aborted)throw Error('CANCELLED');if(!carry||offset===carry.byteLength){const next=await iterator.next();if(next.done)throw Error('The archive ended before all parts were written.');carry=next.value;offset=0;}const take=Math.min(left,carry.byteLength-offset);if(!take)throw Error('Empty archive chunk.');yield carry.subarray(offset,offset+take);offset+=take;left-=take;}}};
  const name=`${prefix}.part-${String(part).padStart(3,'0')}-of-${String(count).padStart(3,'0')}.nthbackup`;
  onPart(part,count);saved.push(await saveBackupFile(source,name,{native:true,plugin,signal,onProgress:()=>{},mimeType:'application/octet-stream'}));written+=size;
 }
 if(!(await iterator.next()).done)throw Error('Unexpected bytes after the final backup part.');return saved;
 }finally{await iterator.return?.();}
}
export function joinBackupParts(files){
 if(!Array.isArray(files)||!files.length)throw Error('Choose a backup file.');
 const pattern=/^(.*)\.part-(\d{3,})-of-(\d{3,})\.nthbackup$/;
 if(files.length===1&&!pattern.test(files[0].name))return files[0];
 const rows=files.map(file=>{const match=pattern.exec(file.name);if(!match)throw Error('Select only the parts of one backup together.');return {file,prefix:match[1],index:Number(match[2]),count:Number(match[3])};});
 const first=rows[0];if(first.count!==rows.length||rows.some(r=>r.prefix!==first.prefix||r.count!==first.count)||new Set(rows.map(r=>r.index)).size!==rows.length||rows.some(r=>r.index<1||r.index>rows.length))throw Error(`Choose all ${first.count} parts of this backup together.`);
 rows.sort((a,b)=>a.index-b.index);const blob=new Blob(rows.map(r=>r.file),{type:'application/zip'});Object.defineProperty(blob,'name',{value:first.prefix+'.nthbackup'});return blob;
}
