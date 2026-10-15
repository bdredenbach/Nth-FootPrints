package com.nthexperience.footprints;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.widget.RemoteViews;
import org.json.JSONObject;

public class FootprintWidgetProvider extends AppWidgetProvider {
    static final String PREFS = "nth-widget";
    static final String SNAPSHOT = "snapshot";
    static final String ACTION = "com.nthexperience.footprints.WIDGET";
    static final String EXTRA_ACTION = "nth_widget_action";
    static final String EXTRA_ID = "nth_widget_id";

    static PendingIntent launch(Context context, String action, String id) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(ACTION);
        intent.setData(new Uri.Builder().scheme("nthfootprints").authority("widget").appendPath(action).appendPath(id).build());
        intent.putExtra(EXTRA_ACTION, action);
        intent.putExtra(EXTRA_ID, id);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, action.equals("new") ? 1 : 2, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static Bitmap thumbnail(String encoded) {
        if (encoded == null || !encoded.startsWith("data:image/jpeg;base64,") || encoded.length() > 200000) return null;
        try {
            byte[] bytes = Base64.decode(encoded.substring(encoded.indexOf(',') + 1), Base64.DEFAULT);
            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(bytes, 0, bytes.length, bounds);
            if (bounds.outWidth < 1 || bounds.outHeight < 1 || bounds.outWidth > 384 || bounds.outHeight > 240) return null;
            return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (Exception e) { return null; }
    }

    static RemoteViews views(Context context) {
        JSONObject state;
        try { state = new JSONObject(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(SNAPSHOT, "{}")); }
        catch (Exception e) { state = new JSONObject(); }
        JSONObject record = state.optJSONObject("record");
        String id = record == null ? "" : record.optString("id", "");
        boolean hasRecord = id.matches("[a-zA-Z0-9_-]{1,100}");
        int count = Math.max(0, state.optInt("count", 0));
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.footprint_widget);
        views.setTextViewText(R.id.widget_title, hasRecord ? record.optString("title") : "Your next story starts here.");
        String subtitle = !hasRecord ? (state.has("count") ? "Save your first footprint" : "Open FootPrints to load your journal") :
            (record.optBoolean("sample") ? "Illustrated sample · " : "Latest visit · ") + record.optString("visited");
        views.setTextViewText(R.id.widget_subtitle, subtitle);
        views.setTextViewText(R.id.widget_count, count + (count == 1 ? " footprint" : " footprints"));
        Bitmap image = hasRecord ? thumbnail(record.optString("thumbnail", "")) : null;
        if (image != null) views.setImageViewBitmap(R.id.widget_photo, image);
        else views.setImageViewResource(R.id.widget_photo, R.drawable.widget_placeholder);
        views.setContentDescription(R.id.widget_photo, hasRecord ? "Open " + record.optString("title") : "Open Nth FootPrints");
        PendingIntent open = launch(context, hasRecord ? "open" : "journal", id);
        views.setOnClickPendingIntent(R.id.widget_root, open);
        views.setOnClickPendingIntent(R.id.widget_photo, open);
        views.setOnClickPendingIntent(R.id.widget_title, open);
        views.setOnClickPendingIntent(R.id.widget_add, launch(context, "new", ""));
        return views;
    }

    static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, FootprintWidgetProvider.class));
        if (ids.length > 0) manager.updateAppWidget(ids, views(context));
    }

    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        manager.updateAppWidget(ids, views(context));
    }
    @Override public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        manager.updateAppWidget(id, views(context));
    }
}
