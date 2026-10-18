package com.nthexperience.footprints;

import android.app.PendingIntent;
import android.appwidget.*;
import android.content.*;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONObject;

public class AdventureWidgetProvider extends AppWidgetProvider {
    static final String PAGE="com.nthexperience.footprints.CASE_PAGE";
    static final Class<?>[] PROVIDERS={StepsWidgetProvider.class,StepsWideWidgetProvider.class,TrophyWidgetProvider.class,TrophyLargeWidgetProvider.class};
    static void refresh(Context c){refreshSteps(c);refreshCases(c);}
    static void refreshSteps(Context c){refresh(c,0,2);c.getSharedPreferences("nth-adventure-widgets",0).edit().putString("steps_date",PedometerStore.date(System.currentTimeMillis())).apply();}static void refreshCases(Context c){refresh(c,2,4);}
    private static void refresh(Context c,int from,int to){AppWidgetManager m=AppWidgetManager.getInstance(c);for(int i=from;i<to;i++)for(int id:m.getAppWidgetIds(new ComponentName(c,PROVIDERS[i])))update(c,m,id,PROVIDERS[i]);}
    static JSONObject snapshot(Context c){try{return new JSONObject(c.getSharedPreferences("nth-adventure-widgets",0).getString("case","{}"));}catch(Exception e){return new JSONObject();}}
    static PendingIntent page(Context c,int widgetId,Class<?> provider,int direction){Intent i=new Intent(c,provider).setAction(PAGE).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,widgetId).putExtra("direction",direction);i.setData(android.net.Uri.parse("nthfootprints://case/"+widgetId+"/"+direction));return PendingIntent.getBroadcast(c,widgetId,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    static void update(Context c,AppWidgetManager m,int id,Class<?> provider){
        try{boolean steps=provider==StepsWidgetProvider.class||provider==StepsWideWidgetProvider.class,large=provider==TrophyLargeWidgetProvider.class;
        Bundle options=m.getAppWidgetOptions(id);int width=options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,large?300:240),height=options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,large?320:150);
        int imageWidth=600,imageHeight=Math.max(180,Math.min(800,Math.round(600f*Math.max(60,height-(steps?0:44))/Math.max(120,width))));
        RemoteViews v=new RemoteViews(c.getPackageName(),R.layout.adventure_widget);v.setViewVisibility(R.id.adventure_controls,steps?View.GONE:View.VISIBLE);
        int current=c.getSharedPreferences("nth-adventure-widgets",0).getInt("page_"+id,0);String description;
        if(steps){com.getcapacitor.JSObject state=PedometerStore.status(c);v.setImageViewBitmap(R.id.adventure_art,BadgeCaseRenderer.steps(state,imageWidth,imageHeight));description=state.optLong("today",0)+" steps today. "+(state.optString("source").equals("health")?"Health Connect, last refreshed "+new java.util.Date(state.optLong("lastRead",0)):(state.optBoolean("running")?"Phone tracking enabled":"Phone tracking paused"))+". Open step counter.";}
        else{JSONObject state=snapshot(c);int rows=large&&height>=220?3:1,maxShelf=BadgeCaseRenderer.maxShelf(state),pages=Math.max(1,(maxShelf+rows)/rows);current=Math.floorMod(current,pages);v.setImageViewBitmap(R.id.adventure_art,BadgeCaseRenderer.cabinet(c,state,current,rows,imageWidth,imageHeight));v.setTextViewText(R.id.adventure_page,"Case "+(current+1)+" / "+pages);v.setOnClickPendingIntent(R.id.adventure_prev,page(c,id,provider,-1));v.setOnClickPendingIntent(R.id.adventure_next,page(c,id,provider,1));description=state.optInt("earned",0)+" of "+state.optInt("total",84)+" trophies earned. Trophy case "+(current+1)+" of "+pages;}
        PendingIntent launch=FootprintWidgetProvider.launch(c,id,steps?"steps":"badges","");v.setOnClickPendingIntent(R.id.adventure_root,launch);v.setOnClickPendingIntent(R.id.adventure_art,launch);v.setOnClickPendingIntent(R.id.adventure_page,launch);v.setContentDescription(R.id.adventure_art,description);m.updateAppWidget(id,v);
        }catch(Exception ignored){/* Keep the previously rendered widget; opening the app can retry its snapshot. */}
    }
    @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){for(int id:ids)update(c,m,id,getClass());}
    @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager m,int id,Bundle options){update(c,m,id,getClass());}
    @Override public void onReceive(Context c,Intent i){super.onReceive(c,i);if(PAGE.equals(i.getAction())){int id=i.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,-1);AppWidgetManager m=AppWidgetManager.getInstance(c);boolean owned=false;for(int known:m.getAppWidgetIds(new ComponentName(c,getClass())))if(known==id)owned=true;if(!owned)return;int old=c.getSharedPreferences("nth-adventure-widgets",0).getInt("page_"+id,0),direction=i.getIntExtra("direction",0);if(direction!=1&&direction!=-1)return;c.getSharedPreferences("nth-adventure-widgets",0).edit().putInt("page_"+id,old+direction).apply();update(c,m,id,getClass());}}
    @Override public void onDeleted(Context c,int[] ids){SharedPreferences.Editor e=c.getSharedPreferences("nth-adventure-widgets",0).edit();for(int id:ids)e.remove("page_"+id);e.apply();}
    @Override public void onRestored(Context c,int[] oldIds,int[] newIds){SharedPreferences p=c.getSharedPreferences("nth-adventure-widgets",0);int[] values=new int[oldIds.length];for(int i=0;i<oldIds.length;i++)values[i]=p.getInt("page_"+oldIds[i],0);SharedPreferences.Editor e=p.edit();for(int id:oldIds)e.remove("page_"+id);for(int i=0;i<Math.min(oldIds.length,newIds.length);i++)e.putInt("page_"+newIds[i],values[i]);e.apply();refresh(c);}
}
