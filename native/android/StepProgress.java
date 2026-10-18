package com.nthexperience.footprints;

import android.content.Context;
import org.json.*;
import com.getcapacitor.JSObject;
import java.util.Iterator;

final class StepProgress {
    private static StepTally read(Context c)throws JSONException {
        android.content.SharedPreferences p=PedometerStore.prefs(c);StepTally tally=new StepTally();JSONObject days=new JSONObject(p.getString("progress","{}")),goals=new JSONObject(p.getString("goalDays","{}")),targets=new JSONObject(p.getString("dayGoals","{}"));
        Iterator<String> keys=days.keys();while(keys.hasNext()){String day=keys.next();tally.observe(day,days.optLong(day,0),targets.optLong(day,p.getInt("goal",6000)));if(goals.optBoolean(day,false))tally.goals.add(day);}return tally;
    }
    static void observe(Context c,JSONObject incoming){try{
        android.content.SharedPreferences p=PedometerStore.prefs(c);StepTally tally=read(c);Iterator<String> keys=incoming.keys();while(keys.hasNext()){String day=keys.next();tally.observe(day,incoming.optLong(day,0),p.getInt("goal",6000));}
        JSONObject days=new JSONObject(tally.days),targets=new JSONObject(tally.targets),goals=new JSONObject();for(String day:tally.goals)goals.put(day,true);
        if(!p.edit().putString("progress",days.toString()).putString("goalDays",goals.toString()).putString("dayGoals",targets.toString()).commit())throw new IllegalStateException("Step progress unavailable");
    }catch(JSONException e){throw new IllegalStateException(e);}}
    static JSObject metrics(Context c,StepLedger ledger){try{JSONObject incoming=new JSONObject();for(String day:ledger.days.keySet())incoming.put(day,ledger.days.get(day));observe(c,incoming);StepTally tally=read(c);JSObject out=new JSObject();out.put("steps",tally.total());out.put("daily",tally.best());out.put("active",tally.active());out.put("goals",tally.goals.size());return out;}catch(JSONException e){throw new IllegalStateException(e);}}
}
