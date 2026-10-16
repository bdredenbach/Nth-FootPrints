package com.nthexperience.footprints;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;
import java.util.ArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** File inputs keep their browser API; Android requests selected original photo bytes. */
public final class PhotoWebChromeClient extends BridgeWebChromeClient {
    private final Bridge owner;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final ActivityResultLauncher<String> permission;
    private final ActivityResultLauncher<Intent> picker;
    private ValueCallback<Uri[]> callback;
    private Intent request;
    private long generation;

    public PhotoWebChromeClient(Bridge bridge) {
        super(bridge);
        owner = bridge;
        permission = bridge.registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> launch());
        picker = bridge.registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
            final long token = generation;
            if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { finish(token, null); return; }
            Intent data = result.getData();
            ArrayList<Uri> selected = new ArrayList<>();
            if (data.getClipData() != null) {
                int count = Math.min(data.getClipData().getItemCount(), 61);
                for (int i=0;i<count;i++) { Uri uri=data.getClipData().getItemAt(i).getUri(); if(uri!=null)selected.add(uri); }
            } else if (data.getData() != null) selected.add(data.getData());
            if (selected.isEmpty()) { finish(token, null); return; }
            final boolean allowed = canReadLocation();
            worker.execute(() -> {
                Uri[] uris = new Uri[selected.size()];
                for (int i=0;i<uris.length;i++) uris[i] = PhotoOriginals.readableOriginal(owner.getContext(), selected.get(i), allowed);
                owner.getActivity().runOnUiThread(() -> finish(token, uris));
            });
        });
    }
    public void dispose() {
        finish(generation, null); generation++; worker.shutdownNow();
    }
    private boolean canReadLocation() {
        return Build.VERSION.SDK_INT < 29 || owner.getContext().checkSelfPermission(Manifest.permission.ACCESS_MEDIA_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }
    private void finish(long token, Uri[] uris) {
        if (token != generation) return;
        ValueCallback<Uri[]> current = callback; callback = null; request = null;
        if (current != null) current.onReceiveValue(uris);
    }
    private void launch() {
        if (callback == null || request == null) return;
        try { picker.launch(request); } catch (Exception error) { finish(generation, null); }
    }
    @Override
    public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> result, WebChromeClient.FileChooserParams params) {
        String[] types = PhotoOriginals.imageTypes(params.getAcceptTypes(), params.isCaptureEnabled());
        if (types == null) return super.onShowFileChooser(view, result, params);
        if (callback != null) callback.onReceiveValue(null);
        generation++; callback = result;
        request = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        request.addCategory(Intent.CATEGORY_OPENABLE);
        request.setType("image/*");
        request.putExtra(Intent.EXTRA_MIME_TYPES, types);
        request.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE);
        request.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        request.putExtra(MediaStore.EXTRA_ACCEPT_ORIGINAL_MEDIA_FORMAT, true);
        if (Build.VERSION.SDK_INT >= 29 && !canReadLocation()) {
            try { permission.launch(Manifest.permission.ACCESS_MEDIA_LOCATION); } catch (Exception error) { launch(); }
        } else launch();
        return true;
    }
}
