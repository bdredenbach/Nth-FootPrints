// Minimal, bounds-checked EXIF reader. GPS tags follow the ExifTool GPS tag table:
// https://exiftool.org/TagNames/GPS.html. Only metadata is read; image bytes stay intact.
const empty=status=>({status,location:null,takenOn:null});
function tiffMetadata(bytes){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),len=v.byteLength;
 const check=(o,n)=>{if(!Number.isSafeInteger(o)||o<0||n<0||o+n>len)throw Error('Truncated EXIF.');};
 const u16=o=>{check(o,2);return v.getUint16(o,little);},u32=o=>{check(o,4);return v.getUint32(o,little);};
 check(0,8);const marker=v.getUint16(0,false),little=marker===0x4949;
 if(!little&&marker!==0x4d4d)throw Error('Invalid TIFF byte order.');
 if(u16(2)!==42)throw Error('Unsupported TIFF.');
 function ifd(offset){
  if(offset<8)throw Error('Invalid directory offset.');const count=u16(offset);if(count>512)throw Error('Oversized EXIF directory.');check(offset+2,count*12+4);const tags=new Map();
  for(let i=0;i<count;i++){
   const p=offset+2+i*12,tag=u16(p),type=u16(p+2),n=u32(p+4),unit=({1:1,2:1,3:2,4:4,5:8,7:1,9:4,10:8})[type];
   if(!unit)continue;if(n>65536)throw Error('Oversized EXIF field.');
   const size=n*unit,start=size<=4?p+8:u32(p+8);check(start,size);tags.set(tag,{type,count:n,start});
  }return tags;
 }
 function ascii(t){if(!t||t.type!==2||t.count>100)return null;return new TextDecoder('ascii').decode(bytes.subarray(t.start,t.start+t.count)).replace(/\0.*$/s,'').trim();}
 function pointer(t){if(!t||t.type!==4||t.count!==1)return null;return u32(t.start);}
 function rationals(t){if(!t||t.type!==5||t.count!==3)return null;const values=[];for(let i=0;i<3;i++){const d=u32(t.start+i*8+4);if(!d)return null;values.push(u32(t.start+i*8)/d);}return values;}
 function degrees(parts,ref,max){if(!parts||!ref)return null;const [d,m,s]=parts;if(d>max||m>=60||s>=60)return null;const value=d+m/60+s/3600;if(!Number.isFinite(value)||value>max)return null;return value;}
 const root=ifd(u32(4));let location=null,takenOn=null;
 const gpsOffset=pointer(root.get(0x8825));
 if(gpsOffset!==null){const gps=ifd(gpsOffset),latRef=ascii(gps.get(1)),lngRef=ascii(gps.get(3));
  const lat=['N','S'].includes(latRef)?degrees(rationals(gps.get(2)),latRef,90):null;
  const lng=['E','W'].includes(lngRef)?degrees(rationals(gps.get(4)),lngRef,180):null;
  if(lat!==null&&lng!==null)location={lat:lat*(latRef==='S'?-1:1),lng:lng*(lngRef==='W'?-1:1)};
 }
 const exifOffset=pointer(root.get(0x8769));
 if(exifOffset!==null){const exif=ifd(exifOffset),date=ascii(exif.get(0x9003));const match=date?.match(/^(\d{4}):(\d{2}):(\d{2}) \d{2}:\d{2}:\d{2}$/);
  if(match){const candidate=`${match[1]}-${match[2]}-${match[3]}`;const ms=Date.parse(candidate);if(Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===candidate)takenOn=candidate;}
 }
 return {status:location?'found':'no-gps',location,takenOn};
}
function withExifPrefix(bytes){return bytes.length>=6&&String.fromCharCode(...bytes.subarray(0,6))==='Exif\0\0'?bytes.subarray(6):bytes;}
export function readPhotoMetadata(input){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),len=bytes.length;
 const word=(o,n)=>String.fromCharCode(...bytes.subarray(o,o+n));
 try{
  if(len>=2&&v.getUint16(0,false)===0xffd8){
   let p=2;
   while(p<len){
    if(bytes[p++]!==0xff)throw Error('Invalid JPEG marker.');while(p<len&&bytes[p]===0xff)p++;if(p>=len)throw Error('Truncated JPEG marker.');const marker=bytes[p++];
    if(marker===0xda||marker===0xd9)break;if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
    if(p+2>len)throw Error('Truncated JPEG segment.');const n=v.getUint16(p,false);if(n<2||p+n>len)throw Error('Invalid JPEG segment length.');
    if(marker===0xe1&&word(p+2,6)==='Exif\0\0')return tiffMetadata(bytes.subarray(p+8,p+n));p+=n;
   }return empty('no-exif');
  }
  if(len>=8&&word(0,8)==='\x89PNG\r\n\x1a\n'){
   let p=8;while(p+12<=len){const n=v.getUint32(p,false);if(n>len-p-12)throw Error('Truncated PNG chunk.');const tag=word(p+4,4);if(tag==='eXIf')return tiffMetadata(withExifPrefix(bytes.subarray(p+8,p+8+n)));if(tag==='IEND')break;p+=n+12;}return empty('no-exif');
  }
  if(len>=12&&word(0,4)==='RIFF'&&word(8,4)==='WEBP'){
   const end=v.getUint32(4,true)+8;if(end>len||end<12)throw Error('Truncated WebP.');let p=12;
   while(p+8<=end){const n=v.getUint32(p+4,true);if(n>end-p-8)throw Error('Truncated WebP chunk.');if(word(p,4)==='EXIF')return tiffMetadata(withExifPrefix(bytes.subarray(p+8,p+8+n)));p+=8+n+(n%2);}return empty('no-exif');
  }
  return empty('unsupported');
 }catch{return empty('malformed');}
}
