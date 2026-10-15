package com.nthexperience.footprints;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import org.json.JSONArray;
import java.util.HashSet;
import java.util.Set;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "FootprintWidget")
public class FootprintWidgetPlugin extends Plugin {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private JSObject pendingLaunch;

    @Override public void load() { captureLaunch(getActivity().getIntent()); }

    private synchronized void captureLaunch(Intent intent) {
        if (intent == null || !FootprintWidgetProvider.ACTION.equals(intent.getAction())) return;
        String action = intent.getStringExtra(FootprintWidgetProvider.EXTRA_ACTION);
        String id = intent.getStringExtra(FootprintWidgetProvider.EXTRA_ID);
        int widgetId = intent.getIntExtra(FootprintWidgetProvider.EXTRA_WIDGET, -1);
        // Consume extras on the Activity too: rotation/recreation must not replay an action.
        intent.removeExtra(FootprintWidgetProvider.EXTRA_ACTION);
        intent.removeExtra(FootprintWidgetProvider.EXTRA_ID);
        intent.removeExtra(FootprintWidgetProvider.EXTRA_WIDGET);
        if (!(("configure".equals(action) && widgetId > 0) || "new".equals(action) || "journal".equals(action) ||
            ("open".equals(action) && id != null && id.matches("[a-zA-Z0-9_-]{1,100}")))) return;
        pendingLaunch = new JSObject();
        pendingLaunch.put("action", action);
        if ("open".equals(action)) pendingLaunch.put("id", id);
        if ("configure".equals(action)) pendingLaunch.put("widgetId", widgetId);
        notifyListeners("launchAvailable", new JSObject());
    }

    @Override protected void handleOnNewIntent(Intent intent) { captureLaunch(intent); }

    @PluginMethod public synchronized void takeLaunchAction(PluginCall call) {
        JSObject result = pendingLaunch == null ? new JSObject() : pendingLaunch;
        pendingLaunch = null;
        call.resolve(result);
    }

    @PluginMethod public void getWidgets(PluginCall call) {
        worker.execute(() -> {
            try {
                JSArray widgets = new JSArray();
                for (int widgetId : FootprintWidgetProvider.widgetIds(getContext())) {
                    JSObject widget = new JSObject(); widget.put("widgetId", widgetId);
                    String id = FootprintWidgetProvider.selection(getContext(), widgetId);
                    widget.put("recordId", id.isEmpty() ? JSONObject.NULL : id); widgets.put(widget);
                }
                JSObject result = new JSObject(); result.put("widgets", widgets); call.resolve(result);
            } catch (Exception e) { call.reject("Could not load your widgets.", e); }
        });
    }
    @PluginMethod public void setSelection(PluginCall call) {
        worker.execute(() -> {
            try {
                Integer widgetId = call.getInt("widgetId"); String id = call.getString("recordId", "");
                if (widgetId == null || !FootprintWidgetProvider.owns(getContext(), widgetId)) throw new Exception("That widget has been removed.");
                if (!id.isEmpty() && !id.matches("[a-zA-Z0-9_-]{1,100}")) throw new Exception("Choose a saved footprint.");
                if (!FootprintWidgetProvider.preferences(getContext()).edit().putString(FootprintWidgetProvider.selectionKey(widgetId), id).commit()) throw new Exception("Widget storage unavailable.");
                FootprintWidgetProvider.refresh(getContext()); call.resolve();
            } catch (Exception e) { call.reject(e.getMessage(), e); }
        });
    }
    private JSONObject cleanRecord(JSONObject record) throws Exception {
        if (record == null) throw new Exception("Invalid widget footprint.");
        String id = record.optString("id", ""), title = record.optString("title", ""), date = record.optString("visited", "");
        if (!id.matches("[a-zA-Z0-9_-]{1,100}") || title.isEmpty() || title.length() > 160 || !date.matches("\\d{4}-\\d{2}-\\d{2}")) throw new Exception("Invalid widget footprint.");
        String image = record.isNull("thumbnail") ? "" : record.optString("thumbnail", "");
        if (image.length() > 200000 || (!image.isEmpty() && FootprintWidgetProvider.thumbnail(image) == null)) throw new Exception("Invalid widget photo.");
        JSONObject clean = new JSONObject(); clean.put("id", id); clean.put("title", title); clean.put("visited", date);
        clean.put("sample", record.optBoolean("sample", false)); clean.put("thumbnail", image); return clean;
    }
    @PluginMethod public void updateSnapshot(PluginCall call) {
        worker.execute(() -> {
            try {
                Integer count = call.getInt("count"); JSObject record = call.getObject("record");
                if (count == null || count < 0 || count > 10000 || (count > 0 && record == null)) throw new Exception("Invalid widget snapshot.");
                JSONObject snapshot = new JSONObject(); snapshot.put("count", count);
                if (count > 0) snapshot.put("record", cleanRecord(record));
                Set<String> selected = FootprintWidgetProvider.selectedIds(getContext()), seen = new HashSet<>();
                JSONArray mirrors = call.getArray("records", new JSArray()), clean = new JSONArray();
                for (int i = 0; i < mirrors.length(); i++) {
                    JSONObject item = mirrors.optJSONObject(i);
                    if (item == null) throw new Exception("Invalid widget footprint.");
                    String id = item.optString("id", "");
                    if (selected.contains(id) && seen.add(id)) clean.put(cleanRecord(item));
                }
                snapshot.put("records", clean);
                if (!FootprintWidgetProvider.preferences(getContext()).edit().putString(FootprintWidgetProvider.SNAPSHOT, snapshot.toString()).commit()) throw new Exception("Widget storage unavailable.");
                FootprintWidgetProvider.refresh(getContext()); call.resolve();
            } catch (Exception e) { call.reject("Widget refresh failed.", e); }
        });
    }

    @PluginMethod public void requestPin(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
                boolean supported = Build.VERSION.SDK_INT >= 26 && manager.isRequestPinAppWidgetSupported();
                boolean requested = supported && manager.requestPinAppWidget(new ComponentName(getContext(), FootprintWidgetProvider.class), null, null);
                JSObject result = new JSObject(); result.put("requested", requested); call.resolve(result);
            } catch (Exception e) { call.reject("Use your Android home screen's Widgets menu to add Nth FootPrints.", e); }
        });
    }
}
