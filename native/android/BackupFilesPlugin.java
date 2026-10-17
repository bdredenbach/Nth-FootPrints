package com.nthexperience.footprints;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "BackupFiles")
public class BackupFilesPlugin extends Plugin {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private volatile boolean picking;
    private volatile Session active;

    private static class Session {
        String id, name;
        Uri uri;
        OutputStream stream;
        long expected, written;
        boolean verify;
        volatile boolean cancelled;
        java.security.MessageDigest digest=BackupIO.digest();
    }

    @PluginMethod
    public void begin(PluginCall call) {
        if (picking || active != null) { call.reject("Another export is still active."); return; }
        String name = call.getString("name", "");
        long size = call.getLong("size", (long)call.getInt("size", -1));
        if (!name.matches("[A-Za-z0-9._-]{1,160}\\.(nthbackup|jpg|jpeg|png|webp|gif|pdf)") || size < 1 || size > BackupIO.MAX_SAFE_BYTES) {
            call.reject("Invalid export name or size."); return;
        }
        picking = true;
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        String extension = name.substring(name.lastIndexOf('.') + 1);
        String mime = extension.equals("pdf") ? "application/pdf" : extension.equals("nthbackup") ? "application/octet-stream" :
            (extension.equals("jpg") || extension.equals("jpeg")) ? "image/jpeg" : "image/" + extension;
        intent.setType(mime);
        intent.putExtra(Intent.EXTRA_TITLE, name);
        try { startActivityForResult(call, intent, "documentChosen"); }
        catch (Exception e) { picking = false; call.reject("Android could not open the save-file picker.", e); }
    }

    @ActivityCallback
    private void documentChosen(PluginCall call, ActivityResult result) {
        if (call == null) { picking = false; return; }
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            picking = false; call.reject("Export cancelled.", "CANCELLED"); return;
        }
        Uri uri = result.getData().getData();
        worker.execute(() -> {
            Session s = new Session();
            s.id = UUID.randomUUID().toString(); s.uri = uri;
            s.expected = call.getLong("size", (long)call.getInt("size", -1)); s.verify="sha256".equals(call.getString("verification", "")); s.name = call.getString("name");
            try {
                s.stream = getContext().getContentResolver().openOutputStream(uri, "wt");
                if (s.stream == null) throw new java.io.IOException("No document stream");
                active = s; picking = false;
                JSObject ret = new JSObject(); ret.put("id", s.id); call.resolve(ret);
            } catch (Exception e) {
                boolean removed = discard(s); picking = false;
                call.reject(removed ? "The selected folder could not be written. Choose another location." : "The file could not be opened. Remove the incomplete file from the chosen folder.", e);
            }
        });
    }

    private Session session(PluginCall call) {
        Session s = active;
        return s != null && s.id.equals(call.getString("id")) ? s : null;
    }

    @PluginMethod
    public void append(PluginCall call) {
        worker.execute(() -> {
            Session s = session(call);
            if (s == null) { call.reject("This export is no longer active."); return; }
            try {
                String encoded = call.getString("data", "");
                if (encoded.length() > 256 * 1024) throw new java.io.IOException("Chunk exceeds limit");
                byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
                if(s.cancelled)throw new java.io.IOException("Export cancelled.");
                long next=BackupIO.add(s.written,bytes.length,s.expected);
                s.stream.write(bytes); s.digest.update(bytes); s.written=next;
                JSObject ret = new JSObject(); ret.put("bytes", s.written); call.resolve(ret);
            } catch (Exception e) {
                boolean removed = discard(s); active = null;
                call.reject(removed ? "Android could not finish writing the file. Check free space or choose another folder." : "Export failed. Remove the incomplete file from the chosen folder before retrying.", e);
            }
        });
    }

    @PluginMethod
    public void finish(PluginCall call) {
        worker.execute(() -> {
            Session s = session(call);
            if (s == null) { call.reject("This export is no longer active."); return; }
            try {
                if (s.written != s.expected) throw new java.io.IOException("Incomplete export");
                s.stream.flush(); s.stream.close(); s.stream = null;
                if(s.verify&&BackupIO.verify(getContext().getContentResolver().openInputStream(s.uri),s.digest.digest(),()->s.cancelled)!=s.expected)throw new java.io.IOException("Saved backup has an incorrect size.");
                try (Cursor c = getContext().getContentResolver().query(s.uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
                    if (c != null && c.moveToFirst()) s.name = c.getString(0);
                } catch (Exception ignored) { }
                active = null;
                JSObject ret = new JSObject(); ret.put("name", s.name); ret.put("bytes", s.written); ret.put("verified",s.verify); call.resolve(ret);
            } catch (Exception e) {
                boolean removed = discard(s); active = null;
                call.reject(removed ? "The file could not be completed. Please retry." : "The file was not completed. Remove the incomplete file from the chosen folder.", e);
            }
        });
    }

    private boolean discard(Session s) {
        try { if (s.stream != null) s.stream.close(); } catch (Exception ignored) { }
        try { return DocumentsContract.deleteDocument(getContext().getContentResolver(), s.uri); }
        catch (Exception ignored) { return false; }
    }

    @PluginMethod
    public void abort(PluginCall call) {
        Session pending=session(call);if(pending!=null)pending.cancelled=true;
        worker.execute(() -> {
            Session s = session(call);
            if (s != null) {
                boolean removed = discard(s); active = null;
                if (!removed) { call.reject("Remove the incomplete file from the chosen folder."); return; }
            }
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        if(active!=null)active.cancelled=true;
        worker.execute(() -> { if (active != null) { discard(active); active = null; } });
        worker.shutdown();
    }
}
