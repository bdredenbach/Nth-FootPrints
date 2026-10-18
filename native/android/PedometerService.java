package com.nthexperience.footprints;

import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.hardware.*;
import android.os.*;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import java.util.Locale;

public class PedometerService extends Service implements SensorEventListener {
    static final String CHANNEL="nth-footprints-steps",STOP="com.nthexperience.footprints.PAUSE_STEPS";
    static final int NOTICE=871;
    static volatile boolean running=false;
    private static volatile PedometerService instance;
    private SensorManager sensors;private HandlerThread thread;private Handler handler;private long lastNotice=0,lastWidget=0;private boolean registered;
    public static void refreshNow(){PedometerService s=instance;if(s!=null&&s.handler!=null)s.handler.post(()->s.publish(true));}
    @Override public IBinder onBind(Intent intent){return null;}
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent!=null&&STOP.equals(intent.getAction())){PedometerStore.pause(this);stopSelf();return START_NOT_STICKY;}
        if(!PedometerStore.prefs(this).getBoolean("enabled",false)){stopSelf();return START_NOT_STICKY;}
        try{
            if(Build.VERSION.SDK_INT>=29&&checkSelfPermission(android.Manifest.permission.ACTIVITY_RECOGNITION)!=PackageManager.PERMISSION_GRANTED)throw new SecurityException("Physical activity permission was removed.");
            if(!PedometerStore.notifications(this))throw new SecurityException("Step notifications are disabled. Enable them to resume.");
            if(Build.VERSION.SDK_INT>=26){NotificationChannel c=new NotificationChannel(CHANNEL,"FootPrints step counter",NotificationManager.IMPORTANCE_LOW);c.setDescription("Steps counted while tracking is enabled");getSystemService(NotificationManager.class).createNotificationChannel(c);}
            ServiceCompat.startForeground(this,NOTICE,notification(),Build.VERSION.SDK_INT>=34?ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH:0);
            if(!registered){sensors=(SensorManager)getSystemService(SENSOR_SERVICE);Sensor sensor=sensors==null?null:sensors.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);if(sensor==null)throw new IllegalStateException("Step-counter sensor unavailable.");thread=new HandlerThread("nth-step-counter");thread.start();handler=new Handler(thread.getLooper());if(!sensors.registerListener(this,sensor,SensorManager.SENSOR_DELAY_NORMAL,0,handler))throw new IllegalStateException("The step-counter sensor could not start.");registered=true;running=true;instance=this;handler.post(tick);}
            return START_STICKY;
        }catch(Exception e){PedometerStore.prefs(this).edit().putBoolean("enabled",false).putString("error",e.getMessage()).commit();stopSelf();return START_NOT_STICKY;}
    }
    private final Runnable tick=new Runnable(){public void run(){if(!running)return;try{if(Build.VERSION.SDK_INT>=29&&checkSelfPermission(android.Manifest.permission.ACTIVITY_RECOGNITION)!=PackageManager.PERMISSION_GRANTED)throw new SecurityException("Physical activity permission was removed.");if(!PedometerStore.notifications(PedometerService.this))throw new SecurityException("Step notifications are disabled.");publish(true);HealthSteps.publish(PedometerService.this);handler.postDelayed(this,60000);}catch(Exception e){PedometerStore.prefs(PedometerService.this).edit().putBoolean("enabled",false).putString("error",e.getMessage()).apply();stopSelf();}}};
    private Notification notification(){
        long steps;synchronized(PedometerStore.LOCK){steps=PedometerStore.read(this).today(PedometerStore.date(System.currentTimeMillis()));}
        Intent open=new Intent(this,MainActivity.class).setAction(FootprintWidgetProvider.ACTION).putExtra(FootprintWidgetProvider.EXTRA_ACTION,"steps");
        PendingIntent view=PendingIntent.getActivity(this,871,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        PendingIntent pause=PendingIntent.getService(this,872,new Intent(this,PedometerService.class).setAction(STOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this,CHANNEL).setSmallIcon(R.drawable.nth_step_notice).setContentTitle(String.format(Locale.getDefault(),"%,d steps today",steps)).setContentText("Nth FootPrints · step counter is running").setOngoing(true).setOnlyAlertOnce(true).setSilent(true).setPriority(NotificationCompat.PRIORITY_LOW).setContentIntent(view).addAction(0,"Pause tracking",pause).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).build();
    }
    private void publish(boolean force){long now=SystemClock.elapsedRealtime();if(force||now-lastNotice>=5000){getSystemService(NotificationManager.class).notify(NOTICE,notification());lastNotice=now;}if(force||now-lastWidget>=15000){AdventureWidgetProvider.refreshSteps(this);lastWidget=now;}}
    @Override public void onSensorChanged(SensorEvent event){if(!running||event.values.length==0||!Float.isFinite(event.values[0])||event.values[0]<0)return;try{long millis=event.timestamp/1000000L,wall=System.currentTimeMillis()-(SystemClock.elapsedRealtime()-millis);synchronized(PedometerStore.LOCK){if(!PedometerStore.prefs(this).getBoolean("enabled",false))return;StepLedger l=PedometerStore.read(this);long previous=l.elapsed,boot=PedometerStore.boot(this);long delta=l.accept((long)event.values[0],PedometerStore.date(wall),boot,millis);PedometerStore.write(this,l);if(delta>0&&previous>=0)HealthSteps.queue(this,wall-(millis-previous),wall,delta);}publish(false);}catch(Exception e){PedometerStore.prefs(this).edit().putBoolean("enabled",false).putString("error","Step storage could not save. Resume after freeing storage.").apply();stopSelf();}}
    @Override public void onAccuracyChanged(Sensor sensor,int accuracy){}
    @Override public void onDestroy(){HealthSteps.publish(this);running=false;instance=null;if(sensors!=null)sensors.unregisterListener(this);if(handler!=null)handler.removeCallbacksAndMessages(null);if(thread!=null)thread.quitSafely();stopForeground(STOP_FOREGROUND_REMOVE);AdventureWidgetProvider.refreshSteps(this);super.onDestroy();}
}
