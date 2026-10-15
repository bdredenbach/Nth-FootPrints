# Nth FootPrints working queue

GitHub is authoritative. Current prototype: **0.3.7**.

Completed foundations: vertical photo stack and three-tab layout, local footprint editing/media, native camera + device GPS, supported photo GPS inspection, safe areas, automatic starter cleanup, `.nthbackup` preparation/save/restore progress, original-photo export, the multi-pin atlas, draft map position selection, nearest saved places, chronological in-app release notes, the Android home-screen widget, multiple photos per footprint with persisted main-photo selection, photo thumbnail map pins, the original Android/web app icon, shared Android/browser backward navigation, and independent widget locations.

## Remaining order

1. **Online address and business search (next; provider dependency).** Select a provider, usage limits and key/proxy arrangement before adding external address/POI discovery; preserve manual coordinates. No public Nominatim search endpoint is bundled or queried.
2. **Offline map packages.** Choose an offline-capable provider/data license, package format, storage limits and download/removal flow. The current public OSM raster tile service is for interactive online viewing and will not be used for bulk offline packages.
3. **Integrated navigation.** Routing, rerouting, turn instructions and voice guidance, building on the selected map/routing data. Current Directions links open an external maps app/browser.
4. **Larger collections and Android lifecycle recovery.** Move large media out of in-memory base64 state, stream backup archives, and recover unsaved camera drafts after Android destroys the activity.

## Independent widget locations shipped in 0.3.7

Each home-screen widget can pin one saved footprint or follow Latest visit. Choose on a widget opens and highlights its controls in Preferences; Save choice commits that instance’s selection. Selections persist by widget ID, migrate on Android widget restore and are removed when that instance is deleted. Deleted selected footprints show a chooser placeholder; restoring their record ID restores their content. Photo/title/save/delete/restore changes refresh the native snapshots, and tapping a widget opens its own footprint. Snapshot media is limited to latest and selected records, with sequential local previews and a bounded in-memory cache. Shortcuts preserve open editor/transfer flows. Choices are home-screen settings outside journal backups. 142 automated checks pass, including real Java provider/plugin execution with Android fakes; physical launcher testing remains necessary.

## Backward navigation shipped in 0.3.6

A shared history controller handles Android Back through Capacitor App, browser Back/Forward, Escape and close buttons. Dialogs unwind one at a time, including the map position picker. Editing keeps its footprint underneath and returns there after Save or confirmed discard; journal card position is retained across tabs. Map/Favorites share a journal parent; Android Back at the journal minimizes the app. Dirty drafts ask before leaving, saves and transfer commits block departure, and cancellable transfers stop safely. Restoring a history entry does not re-run an export or restore. Deleted records are removed from restored routes. Browser unload prompts offer additional protection where supported; process-death draft recovery remains queued. 129 automated checks pass. Physical Android Back/keyboard/launcher and browser history testing remain necessary.

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
