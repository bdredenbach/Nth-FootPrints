import {knownMedia,dataBlob} from './media-store.js';
// Export attached photo bytes, preserving the image format and embedded metadata.
export function preparePhotoExport(record){
 let blob,format;
 if(knownMedia(record?.photo,'image')){blob=dataBlob(record.photo,'image');format=blob.type.split('/')[1];}
 else{const match=/^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/]*={0,2})$/i.exec(record?.photo??'');if(!match||!match[2]||match[2].length%4)throw Error('Add a photograph to this footprint before exporting it.');format=match[1].toLowerCase();let binary;try{binary=atob(match[2]);}catch{throw Error('This photo could not be read.');}blob=new Blob([Uint8Array.from(binary,c=>c.charCodeAt(0))],{type:'image/'+format});}
 const extension=format==='jpeg'?'.jpg':'.'+format;
 const title=String(record.title??'FootPrint').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'FootPrint';
 const visited=/^\d{4}-\d{2}-\d{2}$/.test(record.visited??'')?'-'+record.visited:'';
 return {blob,name:title+visited+extension,extension,mimeType:'image/'+format,description:'Photograph'};
}
