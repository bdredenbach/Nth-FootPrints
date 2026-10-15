import {cpSync,readFileSync,writeFileSync} from 'node:fs';
cpSync('native/android/res','android/app/src/main/res',{recursive:true});
const path='android/app/src/main/AndroidManifest.xml';
let source=readFileSync(path,'utf8');
if(!source.includes('android:name=".FootprintWidgetProvider"')){
 if(!source.includes('</application>'))throw Error('Android application manifest missing.');
 source=source.replace('</application>',`<receiver android:name=".FootprintWidgetProvider" android:label="@string/widget_label" android:exported="false">
            <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/footprint_widget_info" />
        </receiver>
    </application>`);
 writeFileSync(path,source);
}
