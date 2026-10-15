# Nth FootPrints working queue

GitHub is authoritative. Current prototype: **0.3.9**.

Completed foundations: vertical photo stack and three-tab layout, local footprint editing/media, native camera + device GPS, supported photo GPS inspection, safe areas, automatic starter cleanup, `.nthbackup` preparation/save/restore progress, original-photo export, the multi-pin atlas, draft map position selection, nearest saved places, chronological in-app release notes, the Android home-screen widget, multiple photos per footprint with persisted main-photo selection, photo thumbnail map pins, the original Android/web app icon, shared Android/browser backward navigation, independent widget locations, online address/named-business search, and downloadable USGS offline map areas.

## Remaining order

1. **Larger collections and Android lifecycle recovery (next).** Move large media out of in-memory base64 state, stream backup archives, and recover unsaved camera drafts after Android destroys the activity.
2. **Worldwide detailed offline coverage.** Add an offline-capable global dataset/provider and package import or download flow. USGS detailed coverage is U.S.-focused.

## Skipped by user choice

**Integrated navigation**, skipped on October 15, 2026. Keep the existing Directions handoff to the external map app/browser; do not build internal routing, rerouting, turn instructions or voice guidance unless requested again.

## Offline map areas shipped in 0.3.9

Map & directions and Preferences open the offline map manager. Choose a located saved footprint, a 4/10/20 km square, and Town (z13) or Street (z15) detail. A bounded explicit download retrieves zoom 0 through the requested level from the public-domain USGS Topo service. Detailed coverage is focused on the United States; worldwide detailed offline coverage remains a provider/data dependency. The public OSM online tile service is never used for download packages.

Progress reports tile count and actual bytes. Downloads are sequential, paced by 120 ms, with 20-second per-tile timeouts and no automatic retries. Limits: 600 tiles, 50 MB per area, 8 areas, 200 MB total. Each tile is written as a Blob to a separate IndexedDB database. Ready metadata commits only after the expected tile count is present. Cancellation/errors remove staged data; startup removes orphaned tiles from interrupted downloads. Back cancels downloads safely and blocks during final commit/removal. Downloads must stay in the foreground; process-death resumption is not included.

Use View for a saved area, or Downloaded maps in the atlas to preview while online. Both atlas and draft position picker automatically use local tiles when offline. Missing areas are hatched, with no network fallback. Town tiles enlarge at higher zoom without adding detail; pin positions, photos and filtering stay available. Areas can be removed independently, including overlapping packages. Maps are device cache outside journal backups and are removed by app-data clearance/uninstall; a journal restore does not delete downloads. Integrated routing/voice and offline address search are not included.

User confirmed the offline maps work on Android on October 15, 2026. More restart/storage testing can continue alongside development.

179 automated checks pass. Chromium offline reload/local-tile rendering, cancellation and removal passed with no page errors; a complete 17-tile live USGS download validated.

Sources: https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer and https://www.usgs.gov/faqs/what-are-terms-uselicensing-map-services-and-data-national-map . Attribution remains on offline maps and in the manager. Physical Android airplane-mode, restart and storage testing remain necessary.

## Address and named-business search shipped in 0.3.8

Choose a location now supports explicit Photon searches for an address or named place/business, preferably including the town or city. Select a result to preview on the map, then Use this spot applies its coordinates to the draft. Optional empty-field filling preserves existing names/addresses; moving the pin clears the result metadata, while Cancel/Back leaves the editor alone. Full Save is still required.

The no-key Photon public demo is used for modest prototype traffic under its reasonable-use policy. Requests have a five-result limit, 1.5-second minimum interval, Retry-After handling, no automatic retry and a 12-second timeout. Up to ten recent queries are cached only in memory for five minutes. No credentials, GPS bias, journal or media are sent. UI attribution names Photon/OpenStreetMap. Service availability and OSM business coverage are limited; a dedicated service or contracted provider remains necessary before broad distribution. Public Nominatim endpoints are not used.

159 automated checks pass. Live address/place and named-business requests returned HTTP 200 with CORS for web and Android origins; the actual search controller normalized the business response. Physical Android/browser keyboard, preview and Back interaction still need testing.

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
