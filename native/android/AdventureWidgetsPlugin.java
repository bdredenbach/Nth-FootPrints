package com.nthexperience.footprints;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.os.Build;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.*;
import java.util.*;
import java.util.concurrent.*;

@CapacitorPlugin(name="AdventureWidgets")
public class AdventureWidgetsPlugin extends Plugin {
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    @PluginMethod public void updateCase(PluginCall call){worker.execute(()->{try{
        JSObject source=call.getObject("snapshot");if(source==null)throw new Exception("Missing case snapshot");
        int earned=source.optInt("earned",0),total=source.optInt("total",84),light=source.optInt("light",65);String wood=source.optString("wood","walnut");
        if(earned<0||earned>160||total<earned||total>160||light<0||light>100||!Arrays.asList("walnut","oak","forest").contains(wood))throw new Exception("Invalid case snapshot");
        JSONArray items=source.optJSONArray("items"),clean=new JSONArray();if(items==null||items.length()>160)throw new Exception("Invalid case trophies");Set<String> seen=new HashSet<>();
        for(int i=0;i<items.length();i++){JSONObject item=items.getJSONObject(i);String id=item.optString("id"),art=item.optString("art"),title=item.optString("title");int shelf=item.optInt("shelf",-1);if(!id.matches("[a-z]+-\\d{1,9}")||!seen.add(id)||!BadgeCaseRenderer.ART.contains(art)||title.isEmpty()||title.length()>100||shelf<0||shelf>39)throw new Exception("Invalid trophy");JSONObject row=new JSONObject().put("id",id).put("art",art).put("title",title).put("shelf",shelf);
            for(String key:new String[]{"x","width","height","contact"}){double n=item.optDouble(key,Double.NaN);double min=key.equals("width")?36:key.equals("height")?40:0,max=key.equals("width")?160:key.equals("height")?180:key.equals("contact")?18:100;if(!Double.isFinite(n)||n<min||n>max)throw new Exception("Invalid trophy position");row.put(key,n);}String facing=item.optString("facing","right");if(!Arrays.asList("left","right").contains(facing))throw new Exception("Invalid trophy facing");row.put("facing",facing);clean.put(row);
        }
        JSONObject snapshot=new JSONObject().put("wood",wood).put("light",light).put("earned",earned).put("total",total).put("items",clean);
        if(!getContext().getSharedPreferences("nth-adventure-widgets",0).edit().putString("case",snapshot.toString()).commit())throw new Exception("Widget storage unavailable");AdventureWidgetProvider.refreshCases(getContext());call.resolve();
    }catch(Exception e){call.reject("Trophy widgets could not refresh.",e);}});}
    @PluginMethod public void requestPin(PluginCall call){String kind=call.getString("kind","");Class<?> provider=kind.equals("steps")?StepsWidgetProvider.class:kind.equals("steps-wide")?StepsWideWidgetProvider.class:kind.equals("case")?TrophyWidgetProvider.class:kind.equals("case-large")?TrophyLargeWidgetProvider.class:null;if(provider==null){call.reject("Choose a widget style.");return;}getActivity().runOnUiThread(()->{try{AppWidgetManager m=AppWidgetManager.getInstance(getContext());boolean requested=Build.VERSION.SDK_INT>=26&&m.isRequestPinAppWidgetSupported()&&m.requestPinAppWidget(new ComponentName(getContext(),provider),null,null);JSObject r=new JSObject();r.put("requested",requested);call.resolve(r);}catch(Exception e){call.reject("Add the widget from your Android home screen's Widgets menu.",e);}});}
}
