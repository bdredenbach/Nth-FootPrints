package com.nthexperience.footprints;

import android.content.Context;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorManager;
import android.app.NotificationManager;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Iterator;
import java.util.Locale;

public final class PedometerStore {
    static final Object LOCK=new Object();
    static SharedPreferences prefs(Context c){return c.getSharedPreferences("nth-steps-v1",Context.MODE_PRIVATE);}
    static String date(long time){return new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(new Date(time));}
    static long boot(Context c){return Settings.Global.getInt(c.getContentResolver(),Settings.Global.BOOT_COUNT,0);}
    static StepLedger read(Context c){
        StepLedger l=new StepLedger();try{JSONObject j=new JSONObject(prefs(c).getString("ledger","{}"));l.raw=j.optLong("raw",-1);l.boot=j.optLong("boot",-1);l.elapsed=j.optLong("elapsed",-1);l.total=Math.max(0,j.optLong("total",0));JSONObject days=j.optJSONObject("days");if(days!=null){Iterator<String> keys=days.keys();while(keys.hasNext()){String key=keys.next();if(key.matches("\\d{4}-\\d{2}-\\d{2}"))l.days.put(key,Math.max(0,days.optLong(key,0)));}}}catch(Exception ignored){}return l;
    }
    static void write(Context c,StepLedger l){
        try{JSONObject j=new JSONObject(),days=new JSONObject();for(String key:l.days.keySet())days.put(key,l.days.get(key));j.put("raw",l.raw).put("boot",l.boot).put("elapsed",l.elapsed).put("total",l.total).put("days",days);if(!prefs(c).edit().putString("ledger",j.toString()).commit())throw new IllegalStateException("Step storage unavailable");}catch(org.json.JSONException e){throw new IllegalStateException(e);}
    }
    static boolean available(Context c){SensorManager m=(SensorManager)c.getSystemService(Context.SENSOR_SERVICE);return m!=null&&m.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)!=null;}
    static boolean notifications(Context c){NotificationManager m=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);return Build.VERSION.SDK_INT<24||m.areNotificationsEnabled()&&(Build.VERSION.SDK_INT<26||m.getNotificationChannel(PedometerService.CHANNEL)==null||m.getNotificationChannel(PedometerService.CHANNEL).getImportance()!=NotificationManager.IMPORTANCE_NONE);}
    static JSObject status(Context c){synchronized(LOCK){StepLedger l=read(c);JSObject out=new JSObject();String today=date(System.currentTimeMillis());out.put("available",available(c));out.put("running",PedometerService.running);out.put("enabled",prefs(c).getBoolean("enabled",false));out.put("today",l.today(today));out.put("total",l.total);out.put("date",today);out.put("goal",prefs(c).getInt("goal",6000));out.put("notifications",notifications(c));out.put("error",prefs(c).getString("error",""));JSArray history=new JSArray();Calendar cal=Calendar.getInstance();for(int i=0;i<7;i++){String day=date(cal.getTimeInMillis());JSObject row=new JSObject();row.put("date",day);row.put("steps",l.today(day));history.put(row);cal.add(Calendar.DATE,-1);}out.put("history",history);return out;}}
    static void pause(Context c){synchronized(LOCK){prefs(c).edit().putBoolean("enabled",false).commit();StepLedger l=read(c);l.rebase();write(c,l);}}
}
