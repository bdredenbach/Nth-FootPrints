import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {preparePhotoExport} from '../dist/photo-export.js';
import {saveBackupFile} from '../dist/backup-file.js';

for(const [format,fixture,extension]of [['jpeg','photo-gps.jpg','.jpg'],['png','photo-gps.png','.png'],['webp','photo-gps.webp','.webp']]){
 test(`exports original ${format} photo and metadata bytes without recompression`,async()=>{
  const bytes=readFileSync(new URL('./fixtures/'+fixture,import.meta.url));
  const result=preparePhotoExport({title:'Little Falls, NY',visited:'2026-10-15',photo:`data:image/${format};base64,${bytes.toString('base64')}`});
  assert.deepEqual(Buffer.from(await result.blob.arrayBuffer()),bytes);assert.equal(result.blob.type,'image/'+format);
  assert.equal(result.name,'Little-Falls-NY-2026-10-15'+extension);assert.equal(result.extension,extension);
 });
}
test('preserves GIF and creates a safe filename from punctuation, accents and paths',async()=>{
 const bytes=Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64');
 const result=preparePhotoExport({title:'../../Café 🌲 by the sea',visited:'2026-10-15',photo:'data:image/gif;base64,'+bytes.toString('base64')});
 assert.equal(result.name,'Cafe-by-the-sea-2026-10-15.gif');assert.deepEqual(Buffer.from(await result.blob.arrayBuffer()),bytes);
});
test('no-photo footprints and sample illustrations cannot export a fake photograph',()=>{
 for(const photo of [null,'assets/coast.svg','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,'])assert.throws(()=>preparePhotoExport({photo}),/Add a photograph/);
});
test('browser save picker receives the photo MIME and extension rather than backup type',async()=>{
 const image=preparePhotoExport({title:'A place',photo:'data:image/jpeg;base64,/9j/2Q=='});let options,written;
 const picker=async value=>{options=value;return{createWritable:async()=>({write:async blob=>{written=blob;},close:async()=>{}})};};
 const result=await saveBackupFile(image.blob,image.name,{...image,picker});
 assert.equal(result.confirmed,true);assert.equal(options.suggestedName,'A-place.jpg');assert.deepEqual(options.types,[{description:'Photograph',accept:{'image/jpeg':['.jpg']}}]);assert.deepEqual(Buffer.from(await written.arrayBuffer()),Buffer.from(await image.blob.arrayBuffer()));
});
