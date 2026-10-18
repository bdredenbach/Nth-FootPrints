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
    static int maxShelf(JSONObject state){int max=0;JSONArray rows=state.optJSONArray("items");if(rows!=null)for(int i=0;i<rows.length();i++){JSONObject r=rows.optJSONObject(i);if(r!=null)max=Math.max(max,Math.min(23,r.optInt("shelf",0)));}return max;}
    private static void fill(Canvas c,float l,float t,float r,float b,int color){paint.setShader(null);paint.setColor(color);c.drawRect(l,t,r,b,paint);}
    private static void gradient(Canvas c,float l,float t,float r,float b,int a,int z){paint.setShader(new LinearGradient(l,t,r,b,a,z,Shader.TileMode.CLAMP));c.drawRect(l,t,r,b,paint);paint.setShader(null);}
    private static void text(Canvas c,String text,float x,float y,float size,int color,boolean serif){paint.setShader(null);paint.setColor(color);paint.setTextSize(size);paint.setTypeface(serif?Typeface.create("serif",Typeface.NORMAL):Typeface.create("sans-serif",Typeface.NORMAL));c.drawText(text,x,y,paint);}
    private static String shorten(String s,float width){while(s.length()>1&&paint.measureText(s)>width)s=s.substring(0,s.length()-1);return s;}
    private static synchronized Bitmap image(Context c,String name)throws Exception{Bitmap b=art.get(name);if(b==null){if(!ART.contains(name))throw new Exception("Unknown trophy");try(InputStream in=c.getAssets().open("public/assets/badges/"+name+".webp")){b=BitmapFactory.decodeStream(in);}if(b==null)throw new Exception("Trophy image unavailable");art.put(name,b);}return b;}
    private static float bottom(String art){return (art.equals("footsteps")||art.equals("journey")||art.equals("journal")?18:art.equals("camera")?25:art.equals("globe")?6:art.equals("mountain")?7:art.equals("compass")?11:10)/512f;}
    static synchronized Bitmap cabinet(Context context,JSONObject state,int page,int rows,int w,int h)throws Exception{
        Bitmap out=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);Canvas c=new Canvas(out);String wood=state.optString("wood","walnut");int frame=Color.parseColor(wood.equals("oak")?"#A67844":wood.equals("forest")?"#244438":"#583B2A"),back=Color.parseColor(wood.equals("oak")?"#50402E":wood.equals("forest")?"#152C23":"#211D18"),ledge=Color.parseColor(wood.equals("oak")?"#9B713F":wood.equals("forest")?"#315746":"#65452F");
        gradient(c,0,0,w,h,frame,Color.rgb(24,26,20));float frameWidth=16,top=38,inner=w-frameWidth*2,shelf=(h-top-14)/rows,scale=inner/300f;float light=Math.max(0,Math.min(1,(float)state.optDouble("light",65)/100));
        text(c,"NTH FOOTPRINTS",frameWidth,25,13,GOLD,false);String count=state.optInt("earned",0)+" / "+state.optInt("total",64)+" BADGES";paint.setTextSize(12);text(c,count,w-frameWidth-paint.measureText(count),25,12,CREAM,false);
        JSONArray items=state.optJSONArray("items");for(int row=0;row<rows;row++){float y=top+row*shelf,plane=y+shelf-28;int shelfIndex=page*rows+row;fill(c,frameWidth,y,w-frameWidth,plane,back);
            for(float grain=y+12;grain<plane;grain+=15)fill(c,frameWidth,grain,w-frameWidth,grain+1,0x08CDB080);
            paint.setShader(new RadialGradient(w/2f,y-15,inner*.8f,new int[]{Color.argb((int)(95*light),255,228,181),0x00FFE4B5},null,Shader.TileMode.CLAMP));c.drawRect(frameWidth,y,w-frameWidth,plane,paint);paint.setShader(null);
            gradient(c,frameWidth,plane,w-frameWidth,y+shelf,ledge,Color.rgb(32,30,23));fill(c,frameWidth,plane,w-frameWidth,plane+2,0x66DFBD83);fill(c,frameWidth+inner*.12f,y+1,w-frameWidth-inner*.12f,y+3,Color.argb((int)(220*light),255,230,184));
            if(items!=null)for(int i=0;i<items.length();i++){JSONObject v=items.optJSONObject(i);if(v==null||v.optInt("shelf",-1)!=shelfIndex)continue;String name=v.optString("art","");if(!ART.contains(name))continue;float width=Math.min((float)v.optDouble("width",84)*scale,inner*.44f),height=Math.min((float)v.optDouble("height",98)*scale,Math.max(30,shelf-45)),center=frameWidth+Math.max(width/2,Math.min(inner-width/2,inner*(float)v.optDouble("x",50)/100));
                float base=plane+height*bottom(name)+((float)v.optDouble("contact",5)-5)*scale;
                paint.setColor(0x77000000);c.drawOval(new RectF(center-width*.36f,plane-3,center+width*.36f,plane+3),paint);
                paint.setAlpha(255);c.save();if(v.optString("facing","right").equals("left"))c.scale(-1,1,center,base-height/2);c.drawBitmap(image(context,name),null,new RectF(center-width/2,base-height,center+width/2,base),paint);c.restore();
                float plaque=Math.min(145,inner*.3f);gradient(c,center-plaque/2,plane+5,center+plaque/2,plane+25,0xFF665133,0xFF29231B);paint.setTextSize(10);String title=shorten(v.optString("title","Badge"),plaque-10);float tw=paint.measureText(title);text(c,title,center-tw/2,plane+19,10,CREAM,false);
            }
        }
        if(items==null||items.length()==0){text(c,"Your adventures belong here.",35,h*.55f,Math.min(24,w/24f),CREAM,true);text(c,"Open FootPrints to see your earned badges.",35,h*.55f+30,14,GOLD,false);}return out;
    }
    static synchronized Bitmap steps(JSONObject state,int w,int h){Bitmap out=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);Canvas c=new Canvas(out);gradient(c,0,0,w,h,Color.rgb(43,72,57),Color.rgb(18,38,30));fill(c,18,18,w-18,20,0x55CDAE79);float x=32;boolean tall=h>400;long steps=state.optLong("today",0),total=state.optLong("total",0);int goal=state.optInt("goal",6000);text(c,"NTH FOOTPRINTS",x,48,16,GOLD,false);text(c,"TODAY’S FOOTSTEPS",x,tall?92:85,16,CREAM,false);
        if(!tall){fill(c,0,0,w,h,Color.rgb(27,50,39));text(c,"NTH FOOTPRINTS",x,28,13,GOLD,false);String number=String.format(Locale.getDefault(),"%,d",steps);float numberSize=Math.min(90,h*.42f);paint.setTextSize(numberSize);while(paint.measureText(number)>w*.47f){numberSize-=2;paint.setTextSize(numberSize);}text(c,number,x,h-37,numberSize,CREAM,true);float right=w*.55f;text(c,"STEPS TODAY",right,54,15,CREAM,false);text(c,!state.optBoolean("available",true)?"Sensor unavailable":state.optBoolean("running")?"Counting":"Paused · tap to resume",right,85,16,GOLD,false);text(c,String.format(Locale.getDefault(),"Goal %,d",goal),right,112,14,CREAM,false);fill(c,x,h-18,w-x,h-14,0x4464775F);fill(c,x,h-18,x+(w-2*x)*Math.min(1,steps/(float)Math.max(1,goal)),h-14,GOLD);return out;}float baseline=h*.47f,size=Math.min(120,w*.19f);String value=String.format(Locale.getDefault(),"%,d",steps);paint.setTextSize(size);while(paint.measureText(value)>w*.77f){size-=2;paint.setTextSize(size);}text(c,value,x,baseline,size,CREAM,true);
        text(c,!state.optBoolean("available",true)?"Step sensor unavailable":state.optBoolean("running")?"Counting your steps":"Paused · tap to resume",x,baseline+38,19,GOLD,false);
        float barY=h-79;fill(c,x,barY,w-x,barY+5,0x4464775F);fill(c,x,barY,x+(w-2*x)*Math.min(1,steps/(float)Math.max(1,goal)),barY+5,GOLD);text(c,String.format(Locale.getDefault(),"Goal %,d · %,d recorded in total",goal,total),x,h-42,16,CREAM,false);return out;}
}
