export function validatePlaceSource(source){
 if(!source||typeof source!=='object')throw Error('Invalid place source.');
 if(source.provider==='geoapify'&&typeof source.id==='string'&&/^[a-f0-9]{2,2048}$/i.test(source.id))return {provider:'geoapify',id:source.id};
 if(source.provider!=='openstreetmap'||!['node','way','relation'].includes(source.type)||typeof source.id!=='string'||!/^[1-9][0-9]{0,19}$/.test(source.id)||source.via!==undefined&&source.via!=='geoapify')throw Error('Invalid place source.');
 return {provider:'openstreetmap',type:source.type,id:source.id,...(source.via?{via:source.via}:{})};
}
export const isGeoapifySource=source=>source?.provider==='geoapify'||source?.via==='geoapify';
export function placeSourceURL(source){const s=validatePlaceSource(source);return s.provider==='openstreetmap'?`https://www.openstreetmap.org/${s.type}/${s.id}`:'https://www.openstreetmap.org/copyright';}
export const placeSourceCredit=source=>isGeoapifySource(source)?'Powered by Geoapify · © OpenStreetMap contributors':'© OpenStreetMap contributors';
export function samePlaceSource(a,b){return !!a&&!!b&&a.provider===b.provider&&a.type===b.type&&a.id===b.id;}
