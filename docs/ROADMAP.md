# Nth FootPrints working queue

GitHub is authoritative. Current prototype: **0.3.2**.

Completed foundations: vertical photo stack and three-tab layout, local footprint editing/media, native camera + device GPS, supported photo GPS inspection, safe areas, automatic starter cleanup, `.nthbackup` preparation/save/restore progress, original-photo export, the multi-pin atlas, draft map position selection, nearest saved places, chronological in-app release notes, and the Android home-screen widget.

## Remaining order

1. **Multiple photos per footprint (next).** Add a photo section immediately after the coordinates in the opened footprint, with an Upload more photos button on its right, aligned right. Browse photos left/right inside the large photo at the top of the detail page. The photo left selected becomes that footprint’s main Photo Journal image and persists across closing/reopening. Preserve the original photo bytes and existing single-photo entries; include all photos and the selected cover in backup/restore. Export Photo should export the currently viewed photo. Adding extra images must not silently change the footprint’s location. This is queued, not shipped in 0.3.2.
2. **Online address and business search (provider dependency).** Map position editing and nearest saved footprints shipped in 0.3.1. Select a provider, usage limits and key/proxy arrangement before adding external address/POI discovery; preserve manual coordinates. No public Nominatim search endpoint is bundled or queried. This dependency was bypassed to advance the self-contained Android widget in 0.3.2.
3. **Offline map packages.** Choose an offline-capable provider/data license, package format, storage limits and download/removal flow. The current public OSM raster tile service is for interactive online viewing and will not be used for bulk offline packages.
4. **Integrated navigation.** Routing, rerouting, turn instructions and voice guidance, building on the selected map/routing data. Current Directions links open an external maps app/browser.
5. **Larger collections and Android lifecycle recovery.** Move large media out of in-memory base64 state, stream backup archives, and recover unsaved camera drafts after Android destroys the activity.

## Widget shipped in 0.3.2

A resizable Android home-screen widget shows the latest visited footprint and the total journal count, opens its details, and starts a new footprint. Add it through Preferences or Android’s widget picker. The app mirrors a bounded JPEG preview plus the footprint ID, title, visit date and count to private native storage after successful journal writes and at startup. The widget reads this snapshot without starting the WebView or requesting GPS/network access. Save/delete/restore refresh the snapshot; multiple copies show the same latest visit. Activity shortcuts queue until local storage is ready and open dialogs have closed so they do not discard unsaved drafts. Empty/deleted journals use a placeholder and a journal shortcut. This release does not include widget stack swiping, selecting a different pinned footprint, or a home-screen carousel. Physical launcher and process-restart tests remain necessary.

## Deferred until testing ends

**Persistent APK signing**, deferred by the user on October 15, 2026. Configure a securely stored signing key in GitHub Actions so future builds can update in place. Android version names/codes are prepared; current builds retain temporary debug signing. The connector cannot administer repository secrets, so secure key installation will need a one-time account-side step.

Continue device checks for camera/location permissions, audio, safe areas, native save/restore and map gestures. Automated checks and compilation do not replace those checks.

A separate HTC Locations reference is still needed to finish its feature inventory. Complete parity is not claimed. **KMZ stays omitted** in favor of the Nth-specific backup format.
