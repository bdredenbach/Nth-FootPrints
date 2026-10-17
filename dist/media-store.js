// Original bytes stay in Blob storage. Runtime URLs are trusted only while registered here.
export const MEDIA_LIMIT=20*1024*1024,MEDIA_PREFIX='nth-media:';
const byURL=new Map(),byKey=new Map(),table=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes,previous=0){let c=previous^0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
export const isMediaKey=s=>typeof s==='string'&&/^nth-media:[a-f0-9]{64}$/.test(s);
export const mediaInfo=source=>byURL.get(source)??byKey.get(source)??null;
export const knownMedia=(source,kind)=>{const row=byURL.get(source);return !!row&&(!kind||row.type.startsWith(kind+'/'));};
export function dataBlob(source,kind){
 const found=byURL.get(source);if(found){if(kind&&!found.type.startsWith(kind+'/'))throw Error('Invalid attachment type.');return found.blob;}
 const m=/^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/i.exec(source??'');
 if(!m||kind&&!m[1].startsWith(kind+'/')||m[2].length%4||m[2].length>28*1024*1024)throw Error('This attachment could not be read.');
 const blob=new Blob([Uint8Array.from(atob(m[2]),c=>c.charCodeAt(0))],{type:m[1].toLowerCase()});if(blob.size>MEDIA_LIMIT)throw Error('This attachment exceeds 20 MB.');return blob;
}
export async function registerMedia(blob,{key,crc}={}){
 if(!(blob instanceof Blob)||blob.size>MEDIA_LIMIT||!/^image\/(jpeg|png|webp|gif)$|^audio\/[a-z0-9.+-]+$/i.test(blob.type))throw Error('Unsupported original attachment.');
 let bytes;if(!key||crc===undefined){bytes=new Uint8Array(await blob.arrayBuffer());const hex=b=>[...new Uint8Array(b)].map(n=>n.toString(16).padStart(2,'0')).join(''),hash=hex(await crypto.subtle.digest('SHA-256',bytes)),identity=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(blob.type+':'+hash)));const calculated=MEDIA_PREFIX+identity;if(key&&key!==calculated)throw Error('Attachment checksum does not match the backup.');key=calculated;crc=crc32(bytes);}
 if(!isMediaKey(key)||!Number.isInteger(crc)||crc<0||crc>0xffffffff)throw Error('Invalid stored attachment.');
 const old=byKey.get(key);if(old){if(old.size!==blob.size||old.type!==blob.type)throw Error('Conflicting attachment data.');return old.url;}
 const row={key,crc,blob,type:blob.type,size:blob.size,url:URL.createObjectURL(blob)};row.aliases=new Set([row.url]);byURL.set(row.url,row);byKey.set(key,row);return row.url;
}
export function adoptStoredMedia(key,blob){const old=byKey.get(key);if(!old||old.size!==blob.size||old.type!==blob.type)throw Error('Stored attachment does not match its original.');const url=URL.createObjectURL(blob),row={...old,blob,url};row.aliases.add(url);for(const alias of row.aliases){const previous=byURL.get(alias);if(previous)previous.blob=blob;}byURL.set(url,row);byKey.set(key,row);return url;}
export function visitMedia(records,transform){
 const visit=row=>{const copy={...row};if(Array.isArray(row.photos)){copy.photos=row.photos.map(p=>transform(p,'image'));delete copy.photo;}else if(row.photo)copy.photo=transform(row.photo,'image');if(row.audio)copy.audio=transform(row.audio,'audio');return copy;};
 return records.map(row=>{const copy=visit(row);if(Array.isArray(row.visits))copy.visits=row.visits.map(visit);return copy;});
}
export function mediaKeys(records){const set=new Set();visitMedia(records,p=>{if(isMediaKey(p))set.add(p);else if(mediaInfo(p))set.add(mediaInfo(p).key);return p;});return set;}
export async function externalize(records){
 const sources=new Set();visitMedia(records,p=>{sources.add(p);return p;});const map=new Map(),entries=[];
 for(const source of sources){let row=mediaInfo(source);if(!row){const url=await registerMedia(dataBlob(source));row=mediaInfo(url);}map.set(source,row.key);entries.push(row);}
 return {records:visitMedia(records,p=>map.get(p)),entries};
}
export function forgetMedia(keep=new Set()){for(const row of byKey.values())if(!keep.has(row.key)&&!keep.has(row.url)){for(const url of row.aliases){URL.revokeObjectURL(url);byURL.delete(url);}byKey.delete(row.key);}}
