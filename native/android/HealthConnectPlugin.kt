package com.nthexperience.footprints

import android.content.Intent
import android.net.Uri
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.PermissionController
import com.getcapacitor.*
import com.getcapacitor.annotation.*
import kotlinx.coroutines.*

@CapacitorPlugin(name="HealthConnect")
class HealthConnectPlugin:Plugin(){
    private val scope=CoroutineScope(SupervisorJob()+Dispatchers.IO)
    private val read="android.permission.health.READ_STEPS"
    private val write="android.permission.health.WRITE_STEPS"
    private var requesting=false
    private fun run(call:PluginCall,task:suspend ()->JSObject){scope.launch{try{call.resolve(task())}catch(e:Exception){HealthSteps.prefs(context).edit().putString("error",HealthSteps.friendly(e)).apply();call.reject(HealthSteps.friendly(e),e)}}}
    @PluginMethod fun getStatus(call:PluginCall){run(call){HealthSteps.sync(context,false)}}
    @PluginMethod fun connect(call:PluginCall){activity.runOnUiThread{
        if(requesting){call.reject("A Health Connect permission request is already open.");return@runOnUiThread}
        if(!HealthSteps.available(context)){call.resolve(HealthSteps.state(context));return@runOnUiThread}
        val permissions=mutableSetOf(read);if(call.getBoolean("write",false)==true)permissions.add(write)
        try{requesting=true;val contract=PermissionController.createRequestPermissionResultContract();startActivityForResult(call,contract.createIntent(context,permissions),"permissionResult")}catch(e:Exception){requesting=false;call.reject("Health Connect permissions could not open.",e)}
    }}
    @ActivityCallback private fun permissionResult(call:PluginCall?,result:ActivityResult){requesting=false;if(call==null)return;run(call){val granted=PermissionController.createRequestPermissionResultContract().parseResult(result.resultCode,result.data);val p=HealthSteps.prefs(context);val editor=p.edit().putBoolean("connected",read in granted||write in granted).putBoolean("readGranted",read in granted).putBoolean("writeGranted",write in granted);if(read in granted&&!p.getBoolean("connected",false))editor.putString("source","health");if(call.getBoolean("write",false)==true)editor.putBoolean("share",write in granted).putLong("shareSince",System.currentTimeMillis());check(editor.commit());HealthSteps.sync(context,true)}}
    @PluginMethod fun configure(call:PluginCall){run(call){val p=HealthSteps.prefs(context);val source=call.getString("source",p.getString("source","phone"))?:"phone";require(source=="phone"||source=="health");HealthSteps.sync(context,false);if(source=="health"&&!p.getBoolean("readGranted",false))throw SecurityException();val share=call.getBoolean("share",p.getBoolean("share",false))==true;if(share&&!p.getBoolean("writeGranted",false))throw SecurityException();val edit=p.edit().putString("source",source).putBoolean("share",share);if(share&&!p.getBoolean("share",false))edit.putLong("shareSince",System.currentTimeMillis());check(edit.commit());if(!share)HealthStepQueue.get(context).clear();HealthSteps.sync(context,true)}}
    @PluginMethod fun sync(call:PluginCall){run(call){HealthSteps.sync(context,true)}}
    @PluginMethod fun disconnect(call:PluginCall){run(call){HealthSteps.disconnect(context)}}
    @PluginMethod fun openSettings(call:PluginCall){activity.runOnUiThread{try{val intent=if(HealthSteps.state(context).optBoolean("needsInstall"))Intent(Intent.ACTION_VIEW,Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata"))else Intent("android.health.connect.action.HEALTH_HOME_SETTINGS");try{activity.startActivity(intent)}catch(e:Exception){activity.startActivity(Intent("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS"))};call.resolve()}catch(e:Exception){call.reject("Open Health Connect from Android Settings.",e)}}}
    @PluginMethod fun privacy(call:PluginCall){activity.runOnUiThread{activity.startActivity(Intent(context,HealthPrivacyActivity::class.java));call.resolve()}}
    override fun handleOnDestroy(){scope.cancel()}
}
