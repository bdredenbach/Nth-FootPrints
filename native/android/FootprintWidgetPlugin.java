package com.nthexperience.footprints;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.JSObject;
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
        // Consume extras on the Activity too: rotation/recreation must not replay an action.
        intent.removeExtra(FootprintWidgetProvider.EXTRA_ACTION);
        intent.removeExtra(FootprintWidgetProvider.EXTRA_ID);
        if (!("new".equals(action) || "journal".equals(action) ||
            ("open".equals(action) && id != null && id.matches("[a-zA-Z0-9_-]{1,100}")))) return;
        pendingLaunch = new JSObject();
        pendingLaunch.put("action", action);
        if ("open".equals(action)) pendingLaunch.put("id", id);
        notifyListeners("launchAvailable", new JSObject());
    }

    @Override protected void handleOnNewIntent(Intent intent) { captureLaunch(intent); }

    @PluginMethod public synchronized void takeLaunchAction(PluginCall call) {
        JSObject result = pendingLaunch == null ? new JSObject() : pendingLaunch;
        pendingLaunch = null;
        call.resolve(result);
    }

    @PluginMethod public void updateSnapshot(PluginCall call) {
        worker.execute(() -> {
            try {
                Integer count = call.getInt("count");
                JSObject record = call.getObject("record");
                if (count == null || count < 0 || count > 10000 || (count > 0 && record == null)) throw new Exception("Invalid widget snapshot.");
                JSONObject snapshot = new JSONObject(); snapshot.put("count", count);
                if (count > 0) {
                    String id = record.getString("id", ""), title = record.getString("title", ""), date = record.getString("visited", "");
                    if (!id.matches("[a-zA-Z0-9_-]{1,100}") || title.isEmpty() || title.length() > 160 || !date.matches("\\d{4}-\\d{2}-\\d{2}")) throw new Exception("Invalid widget footprint.");
                    String image = record.getString("thumbnail", "");
                    if (image.length() > 200000 || (!image.isEmpty() && FootprintWidgetProvider.thumbnail(image) == null)) throw new Exception("Invalid widget photo.");
                    JSONObject clean = new JSONObject();
                    clean.put("id", id); clean.put("title", title); clean.put("visited", date);
                    clean.put("sample", record.getBoolean("sample", false)); clean.put("thumbnail", image);
                    snapshot.put("record", clean);
                }
                if (!getContext().getSharedPreferences(FootprintWidgetProvider.PREFS, Context.MODE_PRIVATE).edit()
                    .putString(FootprintWidgetProvider.SNAPSHOT, snapshot.toString()).commit()) throw new Exception("Widget storage unavailable.");
                FootprintWidgetProvider.refresh(getContext());
                call.resolve();
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
