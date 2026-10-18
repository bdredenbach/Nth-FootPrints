package com.nthexperience.footprints;

import android.content.Context;
import android.graphics.*;
import org.json.*;
import java.io.InputStream;
import java.util.*;

final class BadgeCaseRenderer {
    static final Set<String> ART=new HashSet<>(Arrays.asList("footsteps","globe","mountain","camera","journal","homecoming","compass","journey"));
    private static final Map<String,Bitmap> art=new HashMap<>();
    private static final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);
    private static final int CREAM=Color.rgb(244,235,213),GOLD=Color.rgb(205,171,110);
    static int maxShelf(JSONObject state){int max=0;JSONArray rows=state.optJSONArray("items");if(rows!=null)for(int i=0;i<rows.length();i++){JSONObject r=rows.optJSONObject(i);if(r!=null)max=Math.max(max,Math.min(39,r.optInt("shelf",0)));}return max;}
    private static void fill(Canvas c,float l,float t,float r,float b,int color){paint.setShader(null);paint.setColor(color);c.drawRect(l,t,r,b,paint);}
    private static void gradient(Canvas c,float l,float t,float r,float b,int a,int z){paint.setShader(new LinearGradient(l,t,r,b,a,z,Shader.TileMode.CLAMP));c.drawRect(l,t,r,b,paint);paint.setShader(null);}
    private static void text(Canvas c,String text,float x,float y,float size,int color,boolean serif){paint.setShader(null);paint.setColor(color);paint.setTextSize(size);paint.setTypeface(serif?Typeface.create("serif",Typeface.NORMAL):Typeface.create("sans-serif",Typeface.NORMAL));c.drawText(text,x,y,paint);}
    private static String shorten(String s,float width){while(s.length()>1&&paint.measureText(s)>width)s=s.substring(0,s.length()-1);return s;}
    private static synchronized Bitmap image(Context c,String name)throws Exception{Bitmap b=art.get(name);if(b==null){if(!ART.contains(name))throw new Exception("Unknown trophy");try(InputStream in=c.getAssets().open("public/assets/badges/"+name+".webp")){b=BitmapFactory.decodeStream(in);}if(b==null)throw new Exception("Trophy image unavailable");art.put(name,b);}return b;}
    private static float bottom(String art){return (art.equals("footsteps")||art.equals("journey")||art.equals("journal")?18:art.equals("camera")?25:art.equals("globe")?6:art.equals("mountain")?7:art.equals("compass")?11:10)/512f;}
    static synchronized Bitmap cabinet(Context context,JSONObject state,int page,int rows,int w,int h)throws Exception{
        Bitmap out=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);Canvas c=new Canvas(out);String wood=state.optString("wood","walnut");int frame=Color.parseColor(wood.equals("oak")?"#A67844":wood.equals("forest")?"#244438":"#583B2A"),back=Color.parseColor(wood.equals("oak")?"#50402E":wood.equals("forest")?"#152C23":"#211D18"),ledge=Color.parseColor(wood.equals("oak")?"#9B713F":wood.equals("forest")?"#315746":"#65452F");
        gradient(c,0,0,w,h,frame,Color.rgb(24,26,20));float frameWidth=16,top=38,inner=w-frameWidth*2,shelf=(h-top-14)/rows,scale=inner/300f;float light=Math.max(0,Math.min(1,(float)state.optDouble("light",65)/100));
        text(c,"NTH FOOTPRINTS",frameWidth,25,13,GOLD,false);String count=state.optInt("earned",0)+" / "+state.optInt("total",84)+" TROPHIES";paint.setTextSize(12);text(c,count,w-frameWidth-paint.measureText(count),25,12,CREAM,false);
        JSONArray items=state.optJSONArray("items");for(int row=0;row<rows;row++){float y=top+row*shelf,plane=y+shelf-28;int shelfIndex=page*rows+row;fill(c,frameWidth,y,w-frameWidth,plane,back);
            for(float grain=y+12;grain<plane;grain+=15)fill(c,frameWidth,grain,w-frameWidth,grain+1,0x08CDB080);
            paint.setShader(new RadialGradient(w/2f,y-15,inner*.8f,new int[]{Color.argb((int)(95*light),255,228,181),0x00FFE4B5},null,Shader.TileMode.CLAMP));c.drawRect(frameWidth,y,w-frameWidth,plane,paint);paint.setShader(null);
            gradient(c,frameWidth,plane,w-frameWidth,y+shelf,ledge,Color.rgb(32,30,23));fill(c,frameWidth,plane,w-frameWidth,plane+2,0x66DFBD83);fill(c,frameWidth+inner*.12f,y+1,w-frameWidth-inner*.12f,y+3,Color.argb((int)(220*light),255,230,184));
            if(items!=null)for(int i=0;i<items.length();i++){JSONObject v=items.optJSONObject(i);if(v==null||v.optInt("shelf",-1)!=shelfIndex)continue;String name=v.optString("art","");if(!ART.contains(name))continue;float width=Math.min((float)v.optDouble("width",84)*scale,inner*.44f),height=Math.min((float)v.optDouble("height",98)*scale,Math.max(30,shelf-45)),center=frameWidth+Math.max(width/2,Math.min(inner-width/2,inner*(float)v.optDouble("x",50)/100));
                float base=plane+height*bottom(name)+((float)v.optDouble("contact",5)-5)*scale;
                paint.setColor(0x77000000);c.drawOval(new RectF(center-width*.36f,plane-3,center+width*.36f,plane+3),paint);
                paint.setAlpha(255);c.save();if(v.optString("facing","right").equals("left"))c.scale(-1,1,center,base-height/2);c.drawBitmap(image(context,name),null,new RectF(center-width/2,base-height,center+width/2,base),paint);c.restore();
                float plaque=Math.min(145,inner*.3f);gradient(c,center-plaque/2,plane+5,center+plaque/2,plane+25,0xFF665133,0xFF29231B);paint.setTextSize(10);String title=shorten(v.optString("title","Trophy"),plaque-10);float tw=paint.measureText(title);text(c,title,center-tw/2,plane+19,10,CREAM,false);
            }
        }
        if(items==null||items.length()==0){text(c,"Your adventures belong here.",35,h*.55f,Math.min(24,w/24f),CREAM,true);text(c,"Open FootPrints to see your earned trophies.",35,h*.55f+30,14,GOLD,false);}return out;
    }
    private static void ring(Canvas c,float x,float y,float radius,float fraction){
        paint.setShader(null);paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(9);paint.setColor(0x334E705B);c.drawCircle(x,y,radius,paint);paint.setStrokeCap(Paint.Cap.ROUND);paint.setColor(GOLD);c.drawArc(new RectF(x-radius,y-radius,x+radius,y+radius),-90,360*Math.min(1,Math.max(0,fraction)),false,paint);paint.setStyle(Paint.Style.FILL);paint.setStrokeCap(Paint.Cap.BUTT);
    }
    static synchronized Bitmap steps(JSONObject state,int w,int h){
        Bitmap out=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);Canvas c=new Canvas(out);gradient(c,0,0,w,h,0xFF304B3A,0xFF14271F);
        paint.setShader(new RadialGradient(w*.9f,0,w*.85f,new int[]{0x338DAB80,0x008DAB80},null,Shader.TileMode.CLAMP));c.drawRect(0,0,w,h,paint);paint.setShader(null);
        float x=32;boolean tall=h>400;long steps=state.optLong("today",0);int goal=state.optInt("goal",6000);boolean health="health".equals(state.optString("source"));
        String status=health?state.optBoolean("readGranted")?"Health Connect · synced":"Health Connect · access needed":!state.optBoolean("available",true)?"Sensor unavailable":state.optBoolean("running")?"Phone counter · counting":"Phone counter · paused";
        String sync=health?(state.optLong("lastRead",0)>0?"Updated "+new java.text.SimpleDateFormat("MMM d, h:mm a",Locale.getDefault()).format(new java.util.Date(state.optLong("lastRead"))):"Open app to sync"):"Tap to open your footsteps";
        text(c,"NTH FOOTPRINTS",x,tall?43:29,tall?16:13,GOLD,false);fill(c,x,tall?60:40,w-x,tall?61:41,0x338E9A74);
        if(!tall){
            float radius=Math.min(52,h*.23f),centerY=h*.56f;ring(c,w-89,centerY,radius,steps/(float)Math.max(1,goal));String percent=Math.round(Math.min(1,steps/(float)Math.max(1,goal))*100)+"%";paint.setTextSize(19);text(c,percent,w-89-paint.measureText(percent)/2,centerY+7,19,CREAM,false);
            String value=String.format(Locale.getDefault(),"%,d",steps);float size=Math.min(87,h*.36f);paint.setTextSize(size);while(paint.measureText(value)>w*.59f){size-=2;paint.setTextSize(size);}text(c,value,x,h*.62f,size,CREAM,true);
            text(c,"STEPS TODAY",x,h*.62f+24,13,GOLD,false);text(c,status,x,h-24,13,CREAM,false);text(c,health?sync:String.format(Locale.getDefault(),"Goal %,d",goal),x,h-7,11,0xFFB7C5B2,false);return out;
        }
        float centerY=h*.43f,radius=Math.min(w*.35f,h*.23f);ring(c,w/2f,centerY,radius,steps/(float)Math.max(1,goal));String value=String.format(Locale.getDefault(),"%,d",steps);float size=Math.min(112,w*.18f);paint.setTextSize(size);while(paint.measureText(value)>radius*1.7f){size-=2;paint.setTextSize(size);}float tw=paint.measureText(value);text(c,value,(w-tw)/2,centerY+size*.2f,size,CREAM,true);
        String label="STEPS TODAY";paint.setTextSize(15);text(c,label,(w-paint.measureText(label))/2,centerY+size*.2f+34,15,GOLD,false);
        text(c,status,x,h-99,18,CREAM,false);text(c,String.format(Locale.getDefault(),"Daily goal · %,d",goal),x,h-63,16,GOLD,false);fill(c,x,h-45,w-x,h-44,0x338E9A74);text(c,sync,x,h-20,13,0xFFB7C5B2,false);return out;
    }
}
