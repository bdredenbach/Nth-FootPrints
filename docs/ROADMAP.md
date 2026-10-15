# Nth FootPrints working queue

GitHub is authoritative. Current prototype: **0.3.3**.

Completed foundations: vertical photo stack and three-tab layout, local footprint editing/media, native camera + device GPS, supported photo GPS inspection, safe areas, automatic starter cleanup, `.nthbackup` preparation/save/restore progress, original-photo export, the multi-pin atlas, draft map position selection, nearest saved places, chronological in-app release notes, the Android home-screen widget, and multiple photos per footprint with persisted main-photo selection.

## Remaining order

1. **Photo thumbnails on map pins (next).** Show the footprint’s selected main photo in a small square marker, using bounded thumbnail previews and a footprint-icon fallback for no photo/failed preview. Retain pin selection, filtering, same-location access, attribution and accessible place names.
2. **Original app icon.** Create Nth FootPrints branding for the Android launcher: adaptive foreground/background, a monochrome variant, and matching browser/PWA icons. Replace the generated Capacitor launcher icon.
3. **Backward navigation.** Android Back should unwind the current view: dismiss the top dialog/pin picker first, respect active-transfer commit rules, return from editing to the originating footprint where appropriate, return from secondary tabs to the journal, and only then leave the app. Include browser navigation/history behavior. This interpretation follows the user’s request and remains to be implemented/tested.
4. **Independent widgets / different locations.** Let each Android widget instance choose a different saved footprint, preserve that selection by widget ID, support changing the selection, and handle deleted selected places. Latest-visit mode remains available. Current widgets all show the latest visit.
5. **Online address and business search (provider dependency).** Select a provider, usage limits and key/proxy arrangement before adding external address/POI discovery; preserve manual coordinates. No public Nominatim search endpoint is bundled or queried.
6. **Offline map packages.** Choose an offline-capable provider/data license, package format, storage limits and download/removal flow. The current public OSM raster tile service is for interactive online viewing and will not be used for bulk offline packages.
7. **Integrated navigation.** Routing, rerouting, turn instructions and voice guidance, building on the selected map/routing data. Current Directions links open an external maps app/browser.
8. **Larger collections and Android lifecycle recovery.** Move large media out of in-memory base64 state, stream backup archives, and recover unsaved camera drafts after Android destroys the activity.

## Multiple photos shipped in 0.3.3

The opened footprint has a photo section directly after its coordinates, a right-aligned Upload more photos control, and thumbnails. Swipe left/right across its top photo, use arrows/keyboard, or select a thumbnail; the last viewed photo is saved as the main Photo Journal/Favorites/widget image. Additional photo imports leave footprint coordinates/date alone. The editor can replace/remove the selected photo while retaining the others. Export Photo exports the saved selected original. Up to 30 photos per footprint, 20 MB each; the existing total 150 MB backup limit remains. Full journal backups now use format version 2, contain each original gallery image once, and preserve cover selection; version 1 backups still import. Older app versions reject version 2 instead of silently losing extra photos.

## Widget shipped in 0.3.2

A resizable Android home-screen widget shows the latest visited footprint and the total journal count, opens its details, and starts a new footprint. Add it through Preferences or Android’s widget picker. The app mirrors a bounded JPEG preview plus the footprint ID, title, visit date and count to private native storage after successful journal writes and at startup. The widget reads this snapshot without starting the WebView or requesting GPS/network access. Save/delete/restore refresh the snapshot; multiple copies show the same latest visit. Activity shortcuts queue until local storage is ready and open dialogs have closed so they do not discard unsaved drafts. Empty/deleted journals use a placeholder and a journal shortcut. This release does not include widget stack swiping, selecting a different pinned footprint, or a home-screen carousel. Physical launcher and process-restart tests remain necessary.

## Deferred until testing ends

**Persistent APK signing**, deferred by the user on October 15, 2026. Configure a securely stored signing key in GitHub Actions so future builds can update in place. Android version names/codes are prepared; current builds retain temporary debug signing. The connector cannot administer repository secrets, so secure key installation will need a one-time account-side step.

Continue device checks for camera/location permissions, audio, safe areas, native save/restore and map gestures. Automated checks and compilation do not replace those checks.

A separate HTC Locations reference is still needed to finish its feature inventory. Complete parity is not claimed. **KMZ stays omitted** in favor of the Nth-specific backup format.
