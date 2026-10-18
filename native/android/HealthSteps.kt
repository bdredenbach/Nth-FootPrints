package com.nthexperience.footprints

import android.content.Context
import android.os.Build
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.records.metadata.Device
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSObject
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONObject
import java.time.*
import java.util.UUID

/** Shared write coordinator; background work writes only, and never reads health data. */
object HealthSteps {
    private val scope=CoroutineScope(SupervisorJob()+Dispatchers.IO)
    private val mutex=Mutex()
    private const val READ="android.permission.health.READ_STEPS"
    private const val WRITE="android.permission.health.WRITE_STEPS"
    @JvmStatic fun prefs(c:Context)=c.getSharedPreferences("nth-health-v1",Context.MODE_PRIVATE)
    @JvmStatic fun available(c:Context)=Build.VERSION.SDK_INT>=28&&HealthConnectClient.getSdkStatus(c)==HealthConnectClient.SDK_AVAILABLE
    @JvmStatic fun queue(c:Context,start:Long,end:Long,delta:Long){if(prefs(c).getBoolean("share",false)&&start>=prefs(c).getLong("shareSince",Long.MAX_VALUE))HealthStepQueue.get(c).record(start,end,delta)}
    @JvmStatic fun publish(c:Context){if(prefs(c).getBoolean("share",false))scope.launch{try{sync(c,false)}catch(e:Exception){prefs(c).edit().putString("error",friendly(e)).apply()}}}
    fun friendly(e:Exception)=if(e is SecurityException)"Health Connect access changed. Reconnect or review permissions." else "Health Connect could not sync. Your steps are saved; tap Sync now to retry."
    suspend fun sync(c:Context,read:Boolean):JSObject=mutex.withLock {
        val p=prefs(c)
        if(!available(c))return@withLock state(c)
        val client=HealthConnectClient.getOrCreate(c)
        val permissions=client.permissionController.getGrantedPermissions()
        p.edit().putBoolean("readGranted",READ in permissions).putBoolean("writeGranted",WRITE in permissions).apply()
        if(p.getBoolean("share",false)&&WRITE in permissions){
            var rows=HealthStepQueue.get(c).pending()
            // Bound each foreground/background run. Remaining durable rows retry on the next sync.
            repeat(5){if(rows.length()>0&&p.getBoolean("share",false)){
                var install=p.getString("install",null)
                if(install==null){install=UUID.randomUUID().toString();check(p.edit().putString("install",install).commit())}
                val records=(0 until rows.length()).map{index->val r=rows.getJSONObject(index);StepsRecord(
                    startTime=Instant.ofEpochMilli(r.getLong("start")),endTime=Instant.ofEpochMilli(r.getLong("end")),
                    startZoneOffset=ZoneOffset.ofTotalSeconds(r.getInt("startOffset")),endZoneOffset=ZoneOffset.ofTotalSeconds(r.getInt("endOffset")),count=r.getLong("count"),
                    metadata=Metadata.autoRecorded(clientRecordId="nth-$install-${r.getLong("bucket")}",clientRecordVersion=r.getLong("count"),device=Device(type=Device.TYPE_PHONE,manufacturer=Build.MANUFACTURER,model=Build.MODEL))) }
                client.insertRecords(records);HealthStepQueue.get(c).acknowledge(rows);rows=HealthStepQueue.get(c).pending()
            }}
            p.edit().putLong("lastWrite",System.currentTimeMillis()).apply()
        }
        if(read&&p.getBoolean("connected",false)&&READ in permissions){
            val zone=ZoneId.systemDefault();val today=LocalDate.now(zone);val days=JSONObject()
            for(i in 0L..6L){val day=today.minusDays(i);val start=day.atStartOfDay(zone).toInstant();val end=if(i==0L)Instant.now() else day.plusDays(1).atStartOfDay(zone).toInstant()
                val result=client.aggregate(AggregateRequest(metrics=setOf(StepsRecord.COUNT_TOTAL),timeRangeFilter=TimeRangeFilter.between(start,end)))
                days.put(day.toString(),result[StepsRecord.COUNT_TOTAL]?:0L)
            }
            check(p.edit().putString("days",days.toString()).putLong("lastRead",System.currentTimeMillis()).putString("error","").commit())
            synchronized(PedometerStore.LOCK){StepProgress.observe(c,days)}
        }
        p.edit().putString("error","").apply();AdventureWidgetProvider.refreshSteps(c);state(c)
    }
    @JvmStatic fun state(c:Context):JSObject {
        val p=prefs(c);val s=JSObject();val sdk=if(Build.VERSION.SDK_INT>=28)HealthConnectClient.getSdkStatus(c) else HealthConnectClient.SDK_UNAVAILABLE
        s.put("available",sdk==HealthConnectClient.SDK_AVAILABLE);s.put("needsInstall",sdk==HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED)
        for(k in arrayOf("connected","share","readGranted","writeGranted"))s.put(k,p.getBoolean(k,false))
        s.put("source",p.getString("source","phone"));s.put("lastRead",p.getLong("lastRead",0));s.put("lastWrite",p.getLong("lastWrite",0));s.put("error",p.getString("error",""))
        return s
    }
    suspend fun disconnect(c:Context):JSObject=mutex.withLock {
        // Stop eligibility before revoking; queued sensor events cannot be exported after disconnect.
        prefs(c).edit().putBoolean("share",false).putBoolean("connected",false).putString("source","phone").commit()
        if(available(c))HealthConnectClient.getOrCreate(c).permissionController.revokeAllPermissions()
        prefs(c).edit().remove("days").remove("lastRead").remove("lastWrite").putBoolean("readGranted",false).putBoolean("writeGranted",false).putString("error","").commit()
        HealthStepQueue.get(c).clear();AdventureWidgetProvider.refreshSteps(c);state(c)
    }
}
