import {cpSync,readFileSync,writeFileSync} from 'node:fs';
cpSync('native/android/res','android/app/src/main/res',{recursive:true});
const path='android/app/src/main/AndroidManifest.xml';let source=readFileSync(path,'utf8');
if(!source.includes('</application>'))throw Error('Android application manifest missing.');
for(const [name,label,xml]of [['FootprintWidgetProvider','widget_label','footprint_widget_info'],['StepsWidgetProvider','widget_steps_label','steps_widget_info'],['StepsWideWidgetProvider','widget_steps_wide_label','steps_wide_widget_info'],['TrophyWidgetProvider','widget_case_label','trophy_widget_info'],['TrophyLargeWidgetProvider','widget_case_large_label','trophy_large_widget_info']]){
 if(!source.includes(`android:name=".${name}"`))source=source.replace('</application>',`<receiver android:name=".${name}" android:label="@string/${label}" android:exported="false"><intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter><meta-data android:name="android.appwidget.provider" android:resource="@xml/${xml}" /></receiver>\n</application>`);
}
if(!source.includes('android:name=".PedometerService"'))source=source.replace('</application>','<service android:name=".PedometerService" android:exported="false" android:foregroundServiceType="health" android:stopWithTask="false" />\n</application>');
for(const permission of ['ACTIVITY_RECOGNITION','POST_NOTIFICATIONS','FOREGROUND_SERVICE','FOREGROUND_SERVICE_HEALTH'])if(!source.includes(`android.permission.${permission}`))source=source.replace('</manifest>',`<uses-permission android:name="android.permission.${permission}" />\n</manifest>`);
if(!source.includes('android.hardware.sensor.stepcounter'))source=source.replace('</manifest>','<uses-feature android:name="android.hardware.sensor.stepcounter" android:required="false" />\n</manifest>');
writeFileSync(path,source);
