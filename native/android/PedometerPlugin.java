package com.nthexperience.footprints;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;

@CapacitorPlugin(name="Pedometer",permissions={@Permission(alias="motion",strings={Manifest.permission.ACTIVITY_RECOGNITION}),@Permission(alias="notifications",strings={Manifest.permission.POST_NOTIFICATIONS})})
public class PedometerPlugin extends Plugin {
    @PluginMethod public void getStatus(PluginCall call){if(!PedometerStore.date(System.currentTimeMillis()).equals(getContext().getSharedPreferences("nth-adventure-widgets",0).getString("steps_date","")))AdventureWidgetProvider.refreshSteps(getContext());call.resolve(PedometerStore.status(getContext()));}
    @PluginMethod public void start(PluginCall call){
        if(!PedometerStore.available(getContext())){call.reject("This device does not have a step-counter sensor.");return;}
        if(Build.VERSION.SDK_INT>=29&&getPermissionState("motion")!=PermissionState.GRANTED){requestPermissionForAlias("motion",call,"motionResult");return;}requestNotifications(call);
    }
    @PermissionCallback private void motionResult(PluginCall call){if(getPermissionState("motion")!=PermissionState.GRANTED){call.reject("Allow Physical activity in Android app permissions to count steps.");return;}requestNotifications(call);}
    private void requestNotifications(PluginCall call){if(Build.VERSION.SDK_INT>=33&&getPermissionState("notifications")!=PermissionState.GRANTED){requestPermissionForAlias("notifications",call,"notificationResult");return;}begin(call);}
    @PermissionCallback private void notificationResult(PluginCall call){if(getPermissionState("notifications")!=PermissionState.GRANTED){call.reject("Allow notifications to keep the step counter visible while tracking.");return;}begin(call);}
    private void begin(PluginCall call){getActivity().runOnUiThread(()->{try{
        if(!PedometerStore.notifications(getContext()))throw new Exception("Enable FootPrints step-counter notifications in Android Settings before starting.");
        synchronized(PedometerStore.LOCK){if(!PedometerService.running){StepLedger l=PedometerStore.read(getContext());l.rebase();PedometerStore.write(getContext(),l);}if(!PedometerStore.prefs(getContext()).edit().putBoolean("enabled",true).putString("error","").commit())throw new Exception("Step storage unavailable");}
        Intent intent=new Intent(getContext(),PedometerService.class);if(Build.VERSION.SDK_INT>=26)getContext().startForegroundService(intent);else getContext().startService(intent);call.resolve(PedometerStore.status(getContext()));
    }catch(Exception e){PedometerStore.prefs(getContext()).edit().putBoolean("enabled",false).apply();call.reject(e.getMessage(),e);}});}
    @PluginMethod public void stop(PluginCall call){try{PedometerStore.pause(getContext());getContext().stopService(new Intent(getContext(),PedometerService.class));AdventureWidgetProvider.refreshSteps(getContext());call.resolve(PedometerStore.status(getContext()));}catch(Exception e){call.reject("Could not pause the step counter.",e);}}
    @PluginMethod public void setGoal(PluginCall call){Integer goal=call.getInt("goal");if(goal==null||goal<100||goal>100000){call.reject("Choose a daily goal between 100 and 100,000 steps.");return;}if(!PedometerStore.prefs(getContext()).edit().putInt("goal",goal).commit()){call.reject("Your step goal could not save.");return;}PedometerService.refreshNow();AdventureWidgetProvider.refreshSteps(getContext());call.resolve(PedometerStore.status(getContext()));}
}
