const CHUNK=192*1024;
function check(signal){if(signal?.aborted){const e=Error('Export cancelled.');e.name='AbortError';throw e;}}
function base64(buffer){
 const bytes=new Uint8Array(buffer);let binary='';
 for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary);
}
export function transferCancelled(error){return error?.name==='AbortError'||error?.code==='CANCELLED'||error?.message==='CANCELLED';}

// Each native write is acknowledged before sending the next bounded chunk.
// Native success means the document stream was closed, not a download click.
export async function saveBackupFile(blob,name,{native=false,plugin,picker,download,signal,onProgress=()=>{},onCommit=()=>{},mimeType='application/octet-stream',extension='.nthbackup',description='Nth FootPrints backup'}={}){
 check(signal);let session,writer;
 try{
  onProgress({phase:'choosing',written:0,total:blob.size});
  if(native){
   if(!plugin)throw Error('This APK has no save-file handler. Keep your journal installed until it can be transferred safely.');
   session=await plugin.begin({name,size:blob.size,...(blob.chunks?{verification:'sha256'}:{})});
  }else if(picker){
   const handle=await picker({suggestedName:name,types:[{description,accept:{[mimeType]:[extension]}}]});
   check(signal);writer=await handle.createWritable();
  }else{
   check(signal);if(blob.chunks){if(blob.size>128*1024*1024)throw Error('This browser cannot save a large backup directly. Use the Android app or a desktop browser with a save-file picker.');const parts=[];for await(const part of blob.chunks()){check(signal);parts.push(part);}blob=new Blob(parts,{type:'application/zip'});}onCommit();download(blob,name);
   return {confirmed:false,name,bytes:blob.size};
  }
  check(signal);
  async function* parts(){for(let offset=0;offset<blob.size;offset+=CHUNK){check(signal);yield new Uint8Array(await blob.slice(offset,offset+CHUNK).arrayBuffer());}}
  let written=0;const abort=()=>{if(session&&blob.chunks)void plugin.abort({id:session.id}).catch(()=>{});};signal?.addEventListener('abort',abort,{once:true});
  try{for await(const bytes of blob.chunks?blob.chunks():parts()){
   check(signal);if(native)await plugin.append({id:session.id,data:base64(bytes)});else await writer.write(bytes);
   written+=bytes.byteLength;check(signal);onProgress({phase:'writing',written,total:blob.size});
  }
  if(written!==blob.size)throw Error('Backup byte count did not match.');
  check(signal);if(!blob.chunks)onCommit();onProgress({phase:'finalizing',written,total:blob.size});
  if(native){
   const saved=await plugin.finish({id:session.id});
   if(saved.bytes!==blob.size)throw Error('Android did not confirm the complete file. Please retry.');
   session=null;check(signal);if(blob.chunks)onCommit();return {confirmed:true,name:saved.name||name,bytes:saved.bytes,verified:!!saved.verified};
  }
  check(signal);if(blob.chunks)onCommit();await writer.close();writer=null;return {confirmed:true,name,bytes:blob.size};
  }finally{signal?.removeEventListener('abort',abort);}
 }catch(error){
  let cleanup;
  try{if(session)await plugin.abort({id:session.id});if(writer)await writer.abort();}catch(e){cleanup=e;}
  if(cleanup)throw Error('The file was not completed. An incomplete file may remain in the chosen folder; delete it before retrying.');
  throw error;
 }
}
