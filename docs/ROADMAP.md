# Nth FootPrints working queue

GitHub is authoritative. Current prototype: **0.4.0**.

Completed foundations: vertical photo stack and three-tab layout, local footprint editing/media, native camera + device GPS, supported photo GPS inspection, safe areas, automatic starter cleanup, `.nthbackup` preparation/save/restore progress, original-photo export, the multi-pin atlas, draft map position selection, nearest saved places, chronological in-app release notes, the Android home-screen widget, multiple photos per footprint with persisted main-photo selection, photo thumbnail map pins, the original Android/web app icon, shared Android/browser backward navigation, independent widget locations, online address/named-business search, downloadable USGS offline map areas, and local editor/camera draft recovery.

## Approved journal feature roadmap

Brad approved all ten ideas on October 15, 2026. Deliver one tested feature release at a time, continuing the existing phone-testing cadence. This is the approved product queue; queued does not mean shipped.

1. **Trips & journeys — shipped in 0.4.0.** Group existing/new footprints into journeys, choose a cover, keep a description, derive dates, browse chronological stops and filter the atlas.
2. **Return visits — next.** Separate dated visits to the same place, with their own notes/photos, while retaining one place identity.
3. **On this day memories.** An optional anniversary card, with notifications optional rather than assumed.
4. **Photo batch import.** Read supported embedded dates/locations, propose groupings and let the user review before saving.
5. **Timeline and calendar.** Browse memories by date, month and journey.
6. **Exploration map and statistics.** Visited countries/states/places, milestones and personal exploration summaries.
7. **Geotag exported photo copies.** Write the footprint coordinates into a new exported copy; preserve the saved original.
8. **Personal tags and smart collections.** Flexible labels and saved filters beyond the current fixed categories.
9. **Shareable memory cards and trip books.** Export a card or PDF with a deliberate location/privacy choice.
10. **Opt-in proximity memories.** A “you’ve been here before” reminder, with explicit permission/settings and practical battery/privacy limits.

## Existing engineering queue

- **Larger collections and streamed backups.** Move saved journal media out of in-memory base64 state and stream backup archives. Recovery shipped in 0.3.10; unfinished live voice recording and in-flight file selections remain outside recovery.
- **Worldwide detailed offline coverage.** Add an offline-capable global dataset/provider and package import or download flow. USGS detailed coverage is U.S.-focused.

## Trips & journeys shipped in 0.4.0

Trips & journeys opens from the journal tools without changing the three main tabs. Create a name/description, select existing footprints using a searchable list, and save the selection explicitly. A footprint can belong to several journeys (up to 20). The footprint editor also offers trip membership and defaults a new footprint to the active trip filter. A chosen stop supplies the journey cover; its current main photo follows gallery edits. The fallback uses the first photographed stop, or the first stop if no photos exist. Dates derive from the first/last visit, and the stop list is chronological. Browse footprints and View on map clear unrelated search/category filters and select the journey; the trip selector then composes with the existing search, categories, Favorites and sorting.

Deleting a journey retains every footprint and attachment. Removed journeys retain lightweight deletion markers so restoring an older backup cannot revive them. Footprint removal/membership changes repair unavailable covers. Trip metadata, memberships and preferences save together in one journal transaction, using the shared serialized write queue. Failed writes preserve the previous state. Journey forms guard unsaved changes, block editing during writes and follow Android/browser Back. Editing a footprint inside a journey retains the journey underneath.

Full `.nthbackup` format 3 contains journeys, deletion markers, memberships, original gallery/audio and preferences. Formats 1 and 2 still import; older app versions reject format 3. Restore merges journey metadata separately by its update time, then removes references to deleted/missing journeys and repairs covers. Up to 1,000 journey entries including deletion markers; existing 10,000-backup-record, 30-photo and 150 MB limits remain. Recovery draft metadata version 2 includes selected journey IDs; previous version 1 drafts still resume. Recovery drafts and offline tiles remain outside journal backups.

218 automated Node/Java/IndexedDB checks pass. Chromium mobile and desktop checks cover creation, member selection through searches, date range/cover, map filtering, unsaved form guards, editor membership after restart, original-photo backup/fresh restore, deletion without media loss, restoring an older backup and reload. No page errors occurred. Physical Android checks remain for this release.

## Skipped by user choice

**Integrated navigation**, skipped on October 15, 2026. Keep the existing Directions handoff to the external map app/browser; do not build internal routing, rerouting, turn instructions or voice guidance unless requested again.

## Draft recovery and Nth icon shipped in 0.3.10

The editor writes a local recovery draft after 250 ms of idle input, with explicit checkpoints before native camera launch, on pause/page hide, and after completed photo/location changes. Startup offers Resume editing and Discard draft. Partial text/coordinates, favorite, photo gallery, selected cover and completed audio attachments are retained without creating a journal record. Blank untouched editors are not persisted. The draft is device-local and is not part of journal backups; clearing app data/uninstalling removes it.

Draft metadata, attachment Blobs, a matching returned-camera sidecar and bounded closed-draft IDs share the existing journal object store. Metadata-only typing reuses media references; key-only cleanup avoids loading the saved journal/media. Successful journal Save clears the matching draft and attachments in the same IndexedDB transaction. Failed journal saves retain recovery; explicitly discarded drafts cannot be resurrected by stale writes. A pending startup draft prevents another editor from silently replacing it, including widget New shortcuts. Changed/deleted source records recover as new footprints after refreshing saved state.

The Capacitor App restored-result listener persists returned camera descriptors and then copies the image into a Blob, associated only with the startup draft's pending capture token. Duplicate/unrelated/stale results are ignored. A returned photo is applied on Resume, or offered explicitly if the user has already resumed editing. Coordinates are cleared when applying a recovered capture; a later current-location fix is never silently assigned to an earlier photo. Failed camera reads remain retryable. Recovery requires that Android returns the camera result; photos never delivered by Android, unfinished voice recordings and uncompleted file reads cannot be reconstructed. Broader media/backup memory work remains queued.

The existing icon's lower dash is replaced by original vector Nth lettering. Regular, round, adaptive, themed, maskable and web icons share the new geometry. 204 automated Node/Java/IndexedDB checks pass. Chromium checked save/reload/resume/discard with photo/audio/favorite/text, native-style process-restart and late camera events, no silent GPS, atomic save cleanup, and conflict-to-new behavior with no page errors. Icon previews were checked at launcher sizes and in the themed variant. Physical Android process-death/camera/launcher testing remains necessary.

Reference: https://capacitorjs.com/docs/apis/app#addlistenerapprestoredresult- .

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

A shared history controller handles Android Back through Capacitor App, browser Back/Forward, Escape and close buttons. Dialogs unwind one at a time, including the map position picker. Editing keeps its footprint underneath and returns there after Save or confirmed discard; journal card position is retained across tabs. Map/Favorites share a journal parent; Android Back at the journal minimizes the app. Dirty drafts ask before leaving, saves and transfer commits block departure, and cancellable transfers stop safely. Restoring a history entry does not re-run an export or restore. Deleted records are removed from restored routes. Browser unload prompts offer additional protection where supported; process-death draft recovery was subsequently added in 0.3.10. 129 automated checks pass. Physical Android Back/keyboard/launcher and browser history testing remain necessary.

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
