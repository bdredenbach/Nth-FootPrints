package com.nthexperience.footprints;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.HashSet;
import java.util.Set;

public class FootprintWidgetProvider extends AppWidgetProvider {
    static final String PREFS = "nth-widget";
    static final String SNAPSHOT = "snapshot";
    static final String ACTION = "com.nthexperience.footprints.WIDGET";
    static final String EXTRA_ACTION = "nth_widget_action";
    static final String EXTRA_ID = "nth_widget_id";
    static final String EXTRA_WIDGET = "nth_widget_instance";
    static String selectionKey(int widgetId) { return "selection_" + widgetId; }
    static SharedPreferences preferences(Context context) { return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }
    static int[] widgetIds(Context context) {
        int[] ids = AppWidgetManager.getInstance(context).getAppWidgetIds(new ComponentName(context, FootprintWidgetProvider.class));
        java.util.Arrays.sort(ids); return ids;
    }
    static boolean owns(Context context, int id) { for (int widgetId : widgetIds(context)) if (widgetId == id) return true; return false; }
    static String selection(Context context, int widgetId) { return preferences(context).getString(selectionKey(widgetId), ""); }
    static Set<String> selectedIds(Context context) {
        Set<String> ids = new HashSet<>();
        for (int widgetId : widgetIds(context)) { String id = selection(context, widgetId); if (!id.isEmpty()) ids.add(id); }
        return ids;
    }
    static PendingIntent launch(Context context, int widgetId, String action, String id) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(ACTION);
        intent.setData(new Uri.Builder().scheme("nthfootprints").authority("widget").appendPath(Integer.toString(widgetId)).appendPath(action).appendPath(id).build());
        intent.putExtra(EXTRA_ACTION, action); intent.putExtra(EXTRA_ID, id); intent.putExtra(EXTRA_WIDGET, widgetId);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, widgetId, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    static Bitmap thumbnail(String encoded) {
        if (encoded == null || !encoded.startsWith("data:image/jpeg;base64,") || encoded.length() > 200000) return null;
        try {
            byte[] bytes = Base64.decode(encoded.substring(encoded.indexOf(',') + 1), Base64.DEFAULT);
            BitmapFactory.Options bounds = new BitmapFactory.Options(); bounds.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(bytes, 0, bytes.length, bounds);
            if (bounds.outWidth < 1 || bounds.outHeight < 1 || bounds.outWidth > 384 || bounds.outHeight > 240) return null;
            return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (Exception e) { return null; }
    }
    static JSONObject snapshot(Context context) {
        try { return new JSONObject(preferences(context).getString(SNAPSHOT, "{}")); }
        catch (Exception e) { return new JSONObject(); }
    }
    static JSONObject record(JSONObject state, String id) {
        JSONObject latest = state.optJSONObject("record");
        if (id.isEmpty()) return latest;
        if (latest != null && id.equals(latest.optString("id"))) return latest;
        JSONArray records = state.optJSONArray("records");
        if (records != null) for (int i = 0; i < records.length(); i++) {
            JSONObject r = records.optJSONObject(i); if (r != null && id.equals(r.optString("id"))) return r;
        }
        return null;
    }
    static RemoteViews views(Context context, int widgetId, JSONObject state) {
        String selected = selection(context, widgetId);
        JSONObject record = record(state, selected);
        String id = record == null ? "" : record.optString("id", "");
        boolean hasRecord = id.matches("[a-zA-Z0-9_-]{1,100}"), pinned = !selected.isEmpty();
        int count = Math.max(0, state.optInt("count", 0));
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.footprint_widget);
        views.setTextViewText(R.id.widget_title, hasRecord ? record.optString("title") : pinned ? "Choose another footprint." : "Your next story starts here.");
        String subtitle = !hasRecord ? (pinned ? "Selected footprint unavailable · tap Choose" : state.has("count") ? "Save your first footprint" : "Open FootPrints to load your journal") :
            (record.optBoolean("sample") ? "Illustrated sample · " : pinned ? "Pinned footprint · " : "Latest visit · ") + record.optString("visited");
        views.setTextViewText(R.id.widget_subtitle, subtitle);
        views.setTextViewText(R.id.widget_count, count + (count == 1 ? "\nfootprint" : "\nfootprints"));
        Bitmap image = hasRecord ? thumbnail(record.optString("thumbnail", "")) : null;
        if (image != null) views.setImageViewBitmap(R.id.widget_photo, image);
        else views.setImageViewResource(R.id.widget_photo, R.drawable.widget_placeholder);
        views.setContentDescription(R.id.widget_photo, hasRecord ? "Open " + record.optString("title") : pinned ? "Choose another footprint for this widget" : "Open Nth FootPrints");
        PendingIntent open = launch(context, widgetId, hasRecord ? "open" : pinned ? "configure" : "journal", id);
        views.setOnClickPendingIntent(R.id.widget_root, open); views.setOnClickPendingIntent(R.id.widget_photo, open); views.setOnClickPendingIntent(R.id.widget_title, open);
        views.setOnClickPendingIntent(R.id.widget_count, launch(context, widgetId, "journal", ""));
        views.setOnClickPendingIntent(R.id.widget_add, launch(context, widgetId, "new", ""));
        views.setOnClickPendingIntent(R.id.widget_choose, launch(context, widgetId, "configure", ""));
        return views;
    }
    static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context); JSONObject state = snapshot(context);
        for (int id : widgetIds(context)) manager.updateAppWidget(id, views(context, id, state));
    }
    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        JSONObject state = snapshot(context); for (int id : ids) manager.updateAppWidget(id, views(context, id, state));
    }
    @Override public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        manager.updateAppWidget(id, views(context, id, snapshot(context)));
    }
    @Override public void onDeleted(Context context, int[] ids) {
        SharedPreferences.Editor edit = preferences(context).edit(); for (int id : ids) edit.remove(selectionKey(id)); edit.apply();
    }
    @Override public void onRestored(Context context, int[] oldIds, int[] newIds) {
        SharedPreferences prefs = preferences(context); SharedPreferences.Editor edit = prefs.edit();
        String[] selections = new String[oldIds.length];
        for (int i = 0; i < oldIds.length; i++) { selections[i] = prefs.getString(selectionKey(oldIds[i]), ""); edit.remove(selectionKey(oldIds[i])); }
        for (int i = 0; i < Math.min(oldIds.length, newIds.length); i++) edit.putString(selectionKey(newIds[i]), selections[i]);
        edit.apply(); refresh(context);
    }
}
