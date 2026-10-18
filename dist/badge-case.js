export const CASE_SHELVES=40,CASE_PAGE_ROWS=3;
const bounded=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const id=v=>typeof v==='string'&&/^[a-z]+-\d{1,9}$/.test(v);
export function validateBadgeCase(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid trophy case.');
 const {wood='walnut',light=65,items=[],hidden=[]}=value;
 if(!['walnut','oak','forest'].includes(wood)||!bounded(light,0,100)||!Array.isArray(items)||items.length>160||!Array.isArray(hidden)||hidden.length>160||hidden.some(v=>!id(v))||new Set(hidden).size!==hidden.length)throw Error('Invalid trophy case settings.');
 const rows=items.map(v=>{if(!v||!id(v.id)||!Number.isInteger(v.shelf)||v.shelf<0||v.shelf>=CASE_SHELVES||!bounded(v.x,0,100)||!bounded(v.width,36,160)||!bounded(v.height,40,180)||!bounded(v.contact,0,18)||!['left','right'].includes(v.facing))throw Error('Invalid trophy placement.');return {id:v.id,shelf:v.shelf,x:v.x,width:v.width,height:v.height,contact:v.contact,facing:v.facing};});
 if(new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Duplicate trophy placement.');
 return {wood,light,items:rows,hidden:[...hidden]};
}
export function badgeCaseLayout(value,earned){
 const config=validateBadgeCase(value??{}),saved=new Map(config.items.map(v=>[v.id,v])),occupied=new Map();
 for(const trophy of earned){const item=saved.get(trophy.id);if(item&&!config.hidden.includes(trophy.id))occupied.set(item.shelf,(occupied.get(item.shelf)??0)+1);}
 const items=earned.filter(b=>!config.hidden.includes(b.id)).map(b=>{if(saved.has(b.id))return {...saved.get(b.id)};let shelf=0;while(shelf<CASE_SHELVES-1&&(occupied.get(shelf)??0)>=3)shelf++;const slot=occupied.get(shelf)??0;occupied.set(shelf,slot+1);return {id:b.id,shelf,x:[18,50,82][slot%3],width:84,height:98,contact:5,facing:'right'};});
 return {...config,items};
}
// x is the center percentage of a shelf; keep the whole control inside its bounds.
export function badgeBounds(item,shelfWidth){const width=Math.min(item.width,Math.max(36,shelfWidth*.44)),edge=width/Math.max(1,shelfWidth)*50;return {width,x:Math.min(100-edge,Math.max(edge,item.x))};}
