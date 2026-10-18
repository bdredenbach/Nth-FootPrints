package com.nthexperience.footprints;

import android.content.*;
import android.database.Cursor;
import android.database.sqlite.*;
import org.json.*;
import java.util.*;

/** Only first-party sensor deltas collected after sharing is enabled. Minute IDs survive retries. */
final class HealthStepQueue extends SQLiteOpenHelper {
    private static HealthStepQueue instance;
    static synchronized HealthStepQueue get(Context c){if(instance==null)instance=new HealthStepQueue(c.getApplicationContext());return instance;}
    private HealthStepQueue(Context c){super(c,"nth-health-steps.db",null,1);}
    public void onCreate(SQLiteDatabase d){d.execSQL("CREATE TABLE steps (bucket INTEGER PRIMARY KEY, start INTEGER NOT NULL, end INTEGER NOT NULL, count INTEGER NOT NULL, sent INTEGER NOT NULL DEFAULT 0, start_offset INTEGER NOT NULL, end_offset INTEGER NOT NULL)");}
    public void onUpgrade(SQLiteDatabase d,int old,int next){}
    synchronized void record(long start,long end,long delta){
        if(delta<=0||start<0||end<=start||end>System.currentTimeMillis()+1000)return;
        // Sensor samples can be batched. Preserve their actual interval rather than inventing past daily times.
        long bucket=end/60000;SQLiteDatabase d=getWritableDatabase();d.beginTransaction();try{
            ContentValues v=new ContentValues();v.put("bucket",bucket);v.put("start",start);v.put("end",end);v.put("count",0);v.put("start_offset",TimeZone.getDefault().getOffset(start)/1000);v.put("end_offset",TimeZone.getDefault().getOffset(end)/1000);d.insertWithOnConflict("steps",null,v,SQLiteDatabase.CONFLICT_IGNORE);
            d.execSQL("UPDATE steps SET start=MIN(start,?),end=MAX(end,?),count=count+?,end_offset=? WHERE bucket=?",new Object[]{start,end,delta,TimeZone.getDefault().getOffset(end)/1000,bucket});d.setTransactionSuccessful();
        }finally{d.endTransaction();}
    }
    synchronized JSONArray pending(){JSONArray out=new JSONArray();try(Cursor c=getReadableDatabase().rawQuery("SELECT bucket,start,end,count,start_offset,end_offset FROM steps WHERE count>sent ORDER BY bucket LIMIT 200",null)){while(c.moveToNext())try{out.put(new JSONObject().put("bucket",c.getLong(0)).put("start",c.getLong(1)).put("end",c.getLong(2)).put("count",c.getLong(3)).put("startOffset",c.getInt(4)).put("endOffset",c.getInt(5)));}catch(JSONException e){throw new IllegalStateException(e);}}return out;}
    synchronized void acknowledge(JSONArray rows){SQLiteDatabase d=getWritableDatabase();d.beginTransaction();try{for(int i=0;i<rows.length();i++){JSONObject row=rows.optJSONObject(i);if(row!=null)d.execSQL("UPDATE steps SET sent=MAX(sent,?) WHERE bucket=?",new Object[]{row.optLong("count"),row.optLong("bucket")});}d.delete("steps","count=sent AND end<?",new String[]{Long.toString(System.currentTimeMillis()-7L*86400000)});d.setTransactionSuccessful();}finally{d.endTransaction();}}
    synchronized void clear(){getWritableDatabase().delete("steps",null,null);}
}
