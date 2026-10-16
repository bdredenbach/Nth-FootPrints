export function validatePlaceSource(source){
 if(!source||source.provider!=='openstreetmap'||!['node','way','relation'].includes(source.type)||typeof source.id!=='string'||!/^[1-9][0-9]{0,19}$/.test(source.id))throw Error('Invalid place source.');
 return {provider:'openstreetmap',type:source.type,id:source.id};
}
export function placeSourceURL(source){const s=validatePlaceSource(source);return `https://www.openstreetmap.org/${s.type}/${s.id}`;}
export function samePlaceSource(a,b){return !!a&&!!b&&a.provider===b.provider&&a.type===b.type&&a.id===b.id;}
