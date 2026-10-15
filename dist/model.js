import {recordJourneyIds,validateJourneys,checkJourneyLinks} from './journeys.js';
export const APP = 'nth-footprints';
export const VERSION = 3;
export const MAX_PHOTOS = 30;
export const CATEGORIES = ['Travel','Nature','Dining','Culture','Everyday','Other'];
export const MAX_BACKUP = 150 * 1024 * 1024;
export const SAMPLE_TIMESTAMP = '2026-10-01T12:00:00.000Z';
const SAMPLE_IDS = new Set(['demo-coast','demo-mountain','demo-city']);
export const isSampleRecord = record => SAMPLE_IDS.has(record.id) && record.updatedAt === SAMPLE_TIMESTAMP;
// Preserve edited examples; clear only untouched starters once a personal place exists.
export function withoutStarterSamples(records) {
 return records.some(record => !SAMPLE_IDS.has(record.id)) ? records.filter(record => !isSampleRecord(record)) : records;
}

const text = (v, max, key) => { if (typeof v !== 'string' || v.length > max) throw Error(`Invalid ${key}.`); return v; };
const media = (v, kind) => {
  if(v == null || v === '') return null;
  if(typeof v !== 'string' || v.length > 30*1024*1024 || !new RegExp(`^data:${kind}/[a-z0-9.+-]+;base64,[A-Za-z0-9+/]*={0,2}$`,'i').test(v)) throw Error(`Invalid ${kind} attachment.`);
  if(kind === 'image' && !/^data:image\/(jpeg|png|webp|gif);/i.test(v)) throw Error('Use JPG, PNG, WebP or GIF photographs.');
  const payload=v.slice(v.indexOf(',')+1);
  if(payload.length%4) throw Error('Invalid attachment encoding.');
  return v;
};
export function validateRecord(r) {
  if(!r || typeof r !== 'object') throw Error('Invalid place.');
  const id = text(r.id,100,'place ID');
  if(!/^[a-z0-9_-]+$/i.test(id)) throw Error('Invalid place ID.');
  const title=text(r.title,160,'title').trim(); if(!title) throw Error('A place needs a title.');
  if(!CATEGORIES.includes(r.category)) throw Error('Unknown place category.');
  if(typeof r.favorite!=='boolean' || !Number.isInteger(r.rating) || r.rating<0 || r.rating>5) throw Error('Invalid rating or favorite.');
  const visited=text(r.visited,10,'visit date');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(visited) || Number.isNaN(Date.parse(visited)) || new Date(visited).toISOString().slice(0,10)!==visited) throw Error('Invalid visit date.');
  const lat=r.lat==null?null:r.lat, lng=r.lng==null?null:r.lng;
  if((lat===null)!==(lng===null) || (lat!==null && (typeof lat!=='number'||!Number.isFinite(lat)||Math.abs(lat)>90||typeof lng!=='number'||!Number.isFinite(lng)||Math.abs(lng)>180))) throw Error('Enter valid latitude and longitude together.');
  const updatedAt=text(r.updatedAt,40,'update time'); if(Number.isNaN(Date.parse(updatedAt))) throw Error('Invalid update time.');
  const url=text(r.url??'',2048,'website');
  if(url && !/^https?:\/\//i.test(url)) throw Error('Websites must start with https:// or http://.');
  if(url) {try {new URL(url);} catch {throw Error('Invalid website.');}}
  const gallery={};let photo=media(r.photo,'image');
  if(r.photos!==undefined){
    if(!Array.isArray(r.photos)||r.photos.length>MAX_PHOTOS)throw Error(`Use up to ${MAX_PHOTOS} photos per footprint.`);
    const photos=r.photos.map(value=>{const image=media(value,'image');if(!image)throw Error('Invalid gallery photo.');return image;});
    const coverIndex=r.coverIndex??0;
    if(!Number.isInteger(coverIndex)||coverIndex<0||coverIndex>=Math.max(1,photos.length))throw Error('Invalid main photo selection.');
    photo=photos[coverIndex]??null;gallery.photos=photos;gallery.coverIndex=coverIndex;
  }
  return {id,title,category:r.category,favorite:r.favorite,rating:r.rating,visited,lat,lng,updatedAt,
    address:text(r.address??'',500,'address'),notes:text(r.notes??'',20000,'notes'),phone:text(r.phone??'',80,'phone'),url,
    photo,...gallery,...(r.tripIds!==undefined?{tripIds:recordJourneyIds(r.tripIds)}:{}),audio:media(r.audio,'audio'),sampleArt: ['coast','mountain','city'].includes(r.sampleArt)?r.sampleArt:null};
}
export function backupRecord(record){const r=validateRecord(record);if(r.photos)delete r.photo;return r;}
export function validateSettings(s={}) {
 if(!s || typeof s!=='object' || (s.theme && !['paper','night'].includes(s.theme))) throw Error('Invalid settings.');
 return {theme:s.theme??'paper'};
}
export function makeBackup(records, settings={theme:'paper'},journeys=[]) {
 const rows=records.map(backupRecord),trips=validateJourneys(journeys);checkJourneyLinks(rows,trips);
 return {app:APP,formatVersion:VERSION,createdAt:new Date().toISOString(),records:rows,settings:validateSettings(settings),journeys:trips};
}
export function parseBackup(raw) {
 if(typeof raw!=='string'||raw.length>MAX_BACKUP) throw Error('Backup is too large for this prototype (150 MB maximum).');
 let b;try{b=JSON.parse(raw);}catch{throw Error('This file is not a readable Nth FootPrints backup.');}
 if(b?.app!==APP) throw Error('Choose a Nth FootPrints backup. Backups from other Nth apps cannot be restored here.');
 if(![1,2,VERSION].includes(b.formatVersion)) throw Error('This backup version is not supported. Your saved places have not changed.');
 if(!Array.isArray(b.records)||b.records.length>10000) throw Error('Invalid place collection.');
 if(b.formatVersion===1&&b.records.some(r=>r&&typeof r==='object'&&('photos'in r||'coverIndex'in r)))throw Error('Photo galleries require backup version 2.');
 if(b.formatVersion<3&&(b.journeys!==undefined||b.records.some(r=>r&&'tripIds'in r)))throw Error('Journeys require backup version 3.');
 const journeys=validateJourneys(b.formatVersion===3?b.journeys:[]);
 const records=b.records.map(validateRecord), ids=new Set(records.map(r=>r.id));
 if(ids.size!==records.length) throw Error('Backup contains duplicate place IDs.');
 checkJourneyLinks(records,journeys);return {records,settings:validateSettings(b.settings),journeys};
}
export function mergeRecords(existing,incoming) {
 const map=new Map(existing.map(r=>[r.id,r]));let added=0,updated=0,kept=0;
 for(const r of incoming) { const old=map.get(r.id);if(!old){map.set(r.id,r);added++;}else if(Date.parse(r.updatedAt)>Date.parse(old.updatedAt)){map.set(r.id,r);updated++;}else kept++; }
 return {records:[...map.values()],added,updated,kept};
}
export function filterRecords(records,{query='',category='All places',sort='newest',favorites=false}={}) {
 const q=query.toLocaleLowerCase().trim();
 return records.filter(r=>(!favorites||r.favorite)&&(category==='All places'||r.category===category)&&(!q||[r.title,r.address,r.notes,r.category].some(x=>x.toLocaleLowerCase().includes(q))))
 .sort((a,b)=>sort==='name'?a.title.localeCompare(b.title):sort==='rating'?b.rating-a.rating||b.visited.localeCompare(a.visited):b.visited.localeCompare(a.visited)||b.updatedAt.localeCompare(a.updatedAt));
}
