# Nth FootPrints working queue

GitHub is authoritative. Current prototype: **0.3.5**.

Completed foundations: vertical photo stack and three-tab layout, local footprint editing/media, native camera + device GPS, supported photo GPS inspection, safe areas, automatic starter cleanup, `.nthbackup` preparation/save/restore progress, original-photo export, the multi-pin atlas, draft map position selection, nearest saved places, chronological in-app release notes, the Android home-screen widget, multiple photos per footprint with persisted main-photo selection, photo thumbnail map pins, and the original Android/web app icon.

## Remaining order

1. **Backward navigation (next).** Android Back should unwind the current view: dismiss the top dialog/pin picker first, respect active-transfer commit rules, return from editing to the originating footprint where appropriate, return from secondary tabs to the journal, and only then leave the app. Include browser navigation/history behavior. This interpretation follows the user’s request and remains to be implemented/tested.
2. **Independent widgets / different locations.** Let each Android widget instance choose a different saved footprint, preserve that selection by widget ID, support changing the selection, and handle deleted selected places. Latest-visit mode remains available. Current widgets all show the latest visit.
3. **Online address and business search (provider dependency).** Select a provider, usage limits and key/proxy arrangement before adding external address/POI discovery; preserve manual coordinates. No public Nominatim search endpoint is bundled or queried.
4. **Offline map packages.** Choose an offline-capable provider/data license, package format, storage limits and download/removal flow. The current public OSM raster tile service is for interactive online viewing and will not be used for bulk offline packages.
5. **Integrated navigation.** Routing, rerouting, turn instructions and voice guidance, building on the selected map/routing data. Current Directions links open an external maps app/browser.
6. **Larger collections and Android lifecycle recovery.** Move large media out of in-memory base64 state, stream backup archives, and recover unsaved camera drafts after Android destroys the activity.

## Original icon shipped in 0.3.5

An original forest-green, paper and brass icon combines a footprint with a tilted instant-photo frame and compass glint. Native adaptive foreground/background resources support Android launcher masks, with an explicit monochrome layer for themed icons on Android 13+. Legacy and round PNGs cover five Android density buckets; matching SVG, PNG, maskable and Apple touch assets are provided for the web app. The generated Capacitor launcher resource names are overridden during Android preparation. Source geometry lives in native/icon-design.json; npm run icons regenerates the complete set using pinned Sharp. Physical launcher/themed-icon testing remains necessary.

## Photo map pins shipped in 0.3.4

Map pins show the selected main photo in a 44 px square face; places without a usable photo retain the footprint icon. Each local derived preview is 96 × 96 JPEG, generated one at a time only for pins inside the current map viewport. Panning requests newly visible previews; a 48-entry cache reuses recent images and prunes filtered/deleted/changed originals. Hidden/destroyed maps cancel pending work and ignore stale results. Preview errors preserve the icon; selected outlines, pin-to-memory activation, list access for overlapping locations, coordinates, attribution and directions are retained. Photo changes do not refit an otherwise unchanged map. Originals and backup data are unchanged; preview generation does not upload images. Physical-device map/photo/gesture testing remains necessary.

## Multiple photos shipped in 0.3.3

The opened footprint has a photo section directly after its coordinates, a right-aligned Upload more photos control, and thumbnails. Swipe left/right across its top photo, use arrows/keyboard, or select a thumbnail; the last viewed photo is saved as the main Photo Journal/Favorites/widget image. Additional photo imports leave footprint coordinates/date alone. The editor can replace/remove the selected photo while retaining the others. Export Photo exports the saved selected original. Up to 30 photos per footprint, 20 MB each; the existing total 150 MB backup limit remains. Full journal backups now use format version 2, contain each original gallery image once, and preserve cover selection; version 1 backups still import. Older app versions reject version 2 instead of silently losing extra photos.

## Widget shipped in 0.3.2

A resizable Android home-screen widget shows the latest visited footprint and the total journal count, opens its details, and starts a new footprint. Add it through Preferences or Android’s widget picker. The app mirrors a bounded JPEG preview plus the footprint ID, title, visit date and count to private native storage after successful journal writes and at startup. The widget reads this snapshot without starting the WebView or requesting GPS/network access. Save/delete/restore refresh the snapshot; multiple copies show the same latest visit. Activity shortcuts queue until local storage is ready and open dialogs have closed so they do not discard unsaved drafts. Empty/deleted journals use a placeholder and a journal shortcut. This release does not include widget stack swiping, selecting a different pinned footprint, or a home-screen carousel. Physical launcher and process-restart tests remain necessary.

## Deferred until testing ends

**Persistent APK signing**, deferred by the user on October 15, 2026. Configure a securely stored signing key in GitHub Actions so future builds can update in place. Android version names/codes are prepared; current builds retain temporary debug signing. The connector cannot administer repository secrets, so secure key installation will need a one-time account-side step.

Continue device checks for camera/location permissions, audio, safe areas, native save/restore and map gestures. Automated checks and compilation do not replace those checks.

A separate HTC Locations reference is still needed to finish its feature inventory. Complete parity is not claimed. **KMZ stays omitted** in favor of the Nth-specific backup format.
