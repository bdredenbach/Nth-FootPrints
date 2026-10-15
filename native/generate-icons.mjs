import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url),sharp=require('sharp');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const design=JSON.parse(readFileSync(path.join(root,'native/icon-design.json'),'utf8'));
const write=(name,content)=>{const file=path.join(root,name);mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,content);};
const color=name=>design[name];
const group=design.paths.map(p=>`<path fill="${color(p.fill)}" d="${p.d}"/>`).join('');
export function iconSVG({maskable=false,round=false}={}){
 const start=maskable?12:18,size=maskable?84:72;
 const background=round?`<circle cx="54" cy="54" r="36" fill="${design.background}"/>`:`<rect x="${start}" y="${start}" width="${size}" height="${size}" rx="${maskable?0:16}" fill="${design.background}"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${start} ${start} ${size} ${size}">${background}<g transform="rotate(${design.rotation} 54 54)">${group}</g></svg>`;
}
const vector=content=>`<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><group android:rotation="${design.rotation}" android:pivotX="54" android:pivotY="54">${content}</group></vector>\n`;
write('native/android/res/drawable/nth_launcher_foreground.xml',vector(design.paths.map(p=>`<path android:fillColor="${color(p.fill)}" android:pathData="${p.d}"/>`).join('')));
write('native/android/res/drawable/nth_launcher_monochrome.xml',vector(`<path android:fillColor="#FFFFFF" android:fillType="evenOdd" android:pathData="${design.monochromeFrame}"/><path android:fillColor="#FFFFFF" android:pathData="${design.paths[2].d}"/><path android:fillColor="#FFFFFF" android:pathData="${design.monochromeStar}"/>`));
write('native/android/res/values/nth_icon_colors.xml',`<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="nth_launcher_background">${design.background}</color></resources>\n`);
for(const version of [26,33])for(const name of ['ic_launcher','ic_launcher_round'])write(`native/android/res/mipmap-anydpi-v${version}/${name}.xml`,`<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/nth_launcher_background"/><foreground android:drawable="@drawable/nth_launcher_foreground"/>${version===33?'<monochrome android:drawable="@drawable/nth_launcher_monochrome"/>':''}</adaptive-icon>\n`);
write('dist/assets/icon.svg',iconSVG());
const png=async(svg,size)=>sharp(Buffer.from(svg)).resize(size,size).png().toBuffer();
for(const [density,size]of [['mdpi',48],['hdpi',72],['xhdpi',96],['xxhdpi',144],['xxxhdpi',192]]){
 write(`native/android/res/mipmap-${density}/ic_launcher.png`,await png(iconSVG(),size));
 write(`native/android/res/mipmap-${density}/ic_launcher_round.png`,await png(iconSVG({round:true}),size));
}
for(const size of [192,512]){
 write(`dist/assets/icon-${size}.png`,await png(iconSVG(),size));
 write(`dist/assets/icon-maskable-${size}.png`,await png(iconSVG({maskable:true}),size));
}
write('dist/assets/apple-touch-icon.png',await png(iconSVG({maskable:true}),180));
write('dist/assets/favicon-32.png',await png(iconSVG(),32));
console.log('Generated Nth FootPrints Android and web icon assets.');
