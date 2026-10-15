// Derived display images only. Never write these over the original attachment.
export async function createPhotoPreview(source,{width=384,height=240,signal,ImageClass=globalThis.Image,document=globalThis.document}={}){
 if(!source)return null;
 const cancelled=()=>Object.assign(Error('Photo preview cancelled.'),{name:'AbortError'});
 if(signal?.aborted)throw cancelled();
 const image=new ImageClass();
 await new Promise((resolve,reject)=>{
  let timer;
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);image.onload=null;image.onerror=null;};
  const abort=()=>{cleanup();image.src='';reject(cancelled());};
  image.onload=()=>{cleanup();resolve();};image.onerror=()=>{cleanup();reject(Error('Photo preview unavailable.'));};
  signal?.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>{cleanup();image.src='';reject(Error('Photo preview timed out.'));},15000);
  try{image.src=source;}catch(e){cleanup();reject(e);}
 });
 if(signal?.aborted)throw cancelled();
 if(!image.naturalWidth||!image.naturalHeight)throw Error('Photo preview unavailable.');
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Photo preview unavailable.');
 const scale=Math.max(width/image.naturalWidth,height/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;
 ctx.fillStyle='#f5f2e9';ctx.fillRect(0,0,width,height);ctx.drawImage(image,(width-w)/2,(height-h)/2,w,h);
 return canvas.toDataURL('image/jpeg',.8);
}
