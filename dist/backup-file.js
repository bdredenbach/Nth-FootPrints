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
export async function saveBackupFile(blob,name,{native=false,plugin,picker,download,signal,onProgress=()=>{},onCommit=()=>{}}={}){
 check(signal);let session,writer;
 try{
  onProgress({phase:'choosing',written:0,total:blob.size});
  if(native){
   if(!plugin)throw Error('This APK has no save-file handler. Keep your journal installed until it can be transferred safely.');
   session=await plugin.begin({name,size:blob.size});
  }else if(picker){
   const handle=await picker({suggestedName:name,types:[{description:'Nth FootPrints backup',accept:{'application/octet-stream':['.nthbackup']}}]});
   check(signal);writer=await handle.createWritable();
  }else{
   check(signal);onCommit();download(blob,name);
   return {confirmed:false,name,bytes:blob.size};
  }
  check(signal);
  for(let offset=0;offset<blob.size;offset+=CHUNK){
   check(signal);const part=blob.slice(offset,offset+CHUNK);
   if(native)await plugin.append({id:session.id,data:base64(await part.arrayBuffer())});
   else await writer.write(part);
   check(signal);onProgress({phase:'writing',written:Math.min(offset+CHUNK,blob.size),total:blob.size});
  }
  check(signal);onCommit();onProgress({phase:'finalizing',written:blob.size,total:blob.size});
  if(native){
   const saved=await plugin.finish({id:session.id});
   if(saved.bytes!==blob.size)throw Error('Android did not confirm the complete backup. Please retry.');
   session=null;return {confirmed:true,name:saved.name||name,bytes:saved.bytes};
  }
  await writer.close();writer=null;return {confirmed:true,name,bytes:blob.size};
 }catch(error){
  let cleanup;
  try{if(session)await plugin.abort({id:session.id});if(writer)await writer.abort();}catch(e){cleanup=e;}
  if(cleanup)throw Error('The backup was not completed. An incomplete file may remain in the chosen folder; delete it before retrying.');
  throw error;
 }
}
