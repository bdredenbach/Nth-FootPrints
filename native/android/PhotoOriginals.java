package com.nthexperience.footprints;

import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Locale;

/** Read only the photos selected by the user; never replace absent GPS with device GPS. */
public final class PhotoOriginals {
    private PhotoOriginals() {}
    public static String[] imageTypes(String[] accepts, boolean capture) {
        if (capture || accepts == null || accepts.length == 0) return null;
        ArrayList<String> types = new ArrayList<>();
        for (String raw : accepts) for (String part : (raw == null ? "" : raw).split(",")) {
            String type = part.trim().toLowerCase(Locale.ROOT);
            if (!type.startsWith("image/")) return null;
            types.add(type);
        }
        return types.isEmpty() ? null : types.toArray(new String[0]);
    }
    public static Uri readableOriginal(Context context, Uri selected, boolean permission) {
        if (!permission || Build.VERSION.SDK_INT < 29) return selected;
        Uri media = selected;
        try {
            Uri converted = MediaStore.getMediaUri(context, selected);
            if (converted != null) media = converted;
        } catch (Exception ignored) { /* Cloud/already-media URIs need no document conversion. */ }
        try {
            Uri original = MediaStore.setRequireOriginal(media);
            try (InputStream stream = context.getContentResolver().openInputStream(original)) {
                if (stream != null) return original;
            }
        } catch (Exception ignored) { /* Provider/permission may allow only its supplied copy. */ }
        return selected;
    }
}
