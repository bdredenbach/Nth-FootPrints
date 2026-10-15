import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readPhotoMetadata} from '../dist/geotags.js';
import {makeBackup,parseBackup} from '../dist/model.js';
const file=name=>readFileSync(new URL('./fixtures/'+name,import.meta.url));
for(const name of ['photo-gps.jpg','photo-gps.png','photo-gps.webp'])test(`reads GPS and original photo date from a real Pillow-generated ${name}`,()=>{
 const bytes=file(name),before=Buffer.from(bytes),r=readPhotoMetadata(bytes);
 assert.equal(r.status,'found');assert.ok(Math.abs(r.location.lat-(45+30/60+12.5/3600))<1e-10);assert.ok(Math.abs(r.location.lng+(123+45/60+54/3600))<1e-10);assert.equal(r.takenOn,'2026-09-22');assert.deepEqual(bytes,before,'metadata reading must not modify original media');
});
test('southern and eastern hemispheres retain correct signs',()=>{const r=readPhotoMetadata(file('southern-gps.jpg'));assert.ok(Math.abs(r.location.lat-(-33-51/60-35/3600))<1e-10);assert.ok(Math.abs(r.location.lng-(151+12/60+40/3600))<1e-10);});
test('photos without GPS and unsupported files return a clear non-location result',()=>{assert.equal(readPhotoMetadata(file('no-gps.jpg')).location,null);assert.equal(readPhotoMetadata(new Uint8Array([1,2,3,4])).status,'unsupported');});
test('truncation and corrupt TIFF offsets never yield a partial or invented coordinate',()=>{
 const bytes=file('photo-gps.jpg');for(const cut of [4,12,40,80,120])assert.equal(readPhotoMetadata(bytes.subarray(0,cut)).location,null);
 const broken=Buffer.from(bytes);const at=broken.indexOf(Buffer.from('Exif\0\0'))+6;assert.ok(at>6);broken.writeUInt32BE(0xfffffff0,at+4);assert.equal(readPhotoMetadata(broken).status,'malformed');
 const denominator=Buffer.from(bytes);const start=denominator.indexOf(Buffer.from('Exif\0\0'))+6;
 const rootCount=denominator.readUInt16BE(start+8);let gpsOffset;
 for(let i=0;i<rootCount;i++){const p=start+10+i*12;if(denominator.readUInt16BE(p)===0x8825)gpsOffset=denominator.readUInt32BE(p+8);}
 assert.ok(gpsOffset);const gps=start+gpsOffset,count=denominator.readUInt16BE(gps);let latOffset;
 for(let i=0;i<count;i++){const p=gps+2+i*12;if(denominator.readUInt16BE(p)===2)latOffset=denominator.readUInt32BE(p+8);}
 denominator.writeUInt32BE(0,start+latOffset+4);assert.equal(readPhotoMetadata(denominator).location,null);
});
// An independently assembled little-endian EXIF segment exercises byte order, zero
// coordinates, invalid reference letters and invalid degree/minute ranges.
function littleEndianGPS({lat=[0,0,0],lng=[0,0,0],ns='N',ew='E'}={}){
 const t=Buffer.alloc(140);t.write('II');t.writeUInt16LE(42,2);t.writeUInt32LE(8,4);t.writeUInt16LE(1,8);t.writeUInt16LE(0x8825,10);t.writeUInt16LE(4,12);t.writeUInt32LE(1,14);t.writeUInt32LE(26,18);t.writeUInt16LE(4,26);
 const entries=[[1,2,2,ns],[2,5,3,80],[3,2,2,ew],[4,5,3,104]];
 entries.forEach(([tag,type,count,value],i)=>{const p=28+i*12;t.writeUInt16LE(tag,p);t.writeUInt16LE(type,p+2);t.writeUInt32LE(count,p+4);if(typeof value==='string')t.write(value+'\0',p+8,'ascii');else t.writeUInt32LE(value,p+8);});
 for(const [coords,at]of [[lat,80],[lng,104]])coords.forEach((n,i)=>{t.writeUInt32LE(n,at+i*8);t.writeUInt32LE(1,at+i*8+4);});
 const head=Buffer.from([255,216,255,225,0,0]);head.writeUInt16BE(t.length+8,4);return Buffer.concat([head,Buffer.from('Exif\0\0'),t,Buffer.from([255,217])]);
}
test('little-endian GPS preserves valid zero coordinates',()=>{assert.deepEqual(readPhotoMetadata(littleEndianGPS()).location,{lat:0,lng:0});});
test('invalid hemispheres and out-of-range coordinates are not geotag candidates',()=>{for(const options of [{ns:'Q'},{ew:'N'},{lat:[91,0,0]},{lng:[180,1,0]},{lat:[30,60,0]}])assert.equal(readPhotoMetadata(littleEndianGPS(options)).location,null);});
test('a geotag and original image survive a full portable backup round trip',()=>{const bytes=file('photo-gps.jpg'),meta=readPhotoMetadata(bytes);const record={id:'photo-location',title:'From a photo',category:'Travel',visited:meta.takenOn,rating:0,favorite:false,updatedAt:'2026-10-15T12:00:00Z',...meta.location,photo:'data:image/jpeg;base64,'+bytes.toString('base64')};const restored=parseBackup(JSON.stringify(makeBackup([record]))).records[0];assert.equal(restored.lat,meta.location.lat);assert.equal(restored.lng,meta.location.lng);assert.deepEqual(Buffer.from(restored.photo.split(',')[1],'base64'),bytes);});
