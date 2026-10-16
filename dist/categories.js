export const CATEGORIES=['Food & Drink','Things to do','Shopping','Services','Other'];
export const LEGACY_CATEGORIES=['Travel','Nature','Dining','Culture','Everyday'];
export const RECORD_CATEGORIES=[...CATEGORIES,...LEGACY_CATEGORIES];
export function categoryChoices(current){return CATEGORIES.includes(current)||!LEGACY_CATEGORIES.includes(current)?CATEGORIES:[...CATEGORIES,current];}
