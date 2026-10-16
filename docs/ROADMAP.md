# Nth FootPrints working queue

GitHub is authoritative. Current prototype: **0.5.1**.

Completed foundations: vertical photo stack and three-tab layout, local footprint editing/media, native camera + device GPS, supported photo GPS inspection, safe areas, automatic starter cleanup, `.nthbackup` preparation/save/restore progress, original-photo export, the multi-pin atlas, draft map position selection, nearest saved places, chronological in-app release notes, the Android home-screen widget, multiple photos per footprint with persisted main-photo selection, photo thumbnail map pins, the original Android/web app icon, shared Android/browser backward navigation, independent widget locations, online address/named-business search, downloadable USGS offline map areas, and local editor/camera draft recovery.

## Approved journal feature roadmap

Brad approved all ten ideas on October 15, 2026, then requested all remaining eight together after confirming return visits worked. All ten are now shipped across 0.4.0, 0.4.1 and 0.5.0. Physical Android testing of 0.5.0 is the next user check.

1. **Trips & journeys — shipped in 0.4.0.** Group existing/new footprints into journeys, choose a cover, keep a description, derive dates, browse chronological stops and filter the atlas.
2. **Return visits — shipped in 0.4.1.** Separate dated visits to the same place, with their own notes/photos, while retaining one place identity.
3. **On this day memories — shipped in 0.5.0.** An optional anniversary card, with notifications optional rather than assumed.
4. **Photo batch import — shipped in 0.5.0.** Read supported embedded dates/locations, propose groupings and let the user review before saving.
5. **Timeline and calendar — shipped in 0.5.0.** Browse memories by date, month and journey.
6. **Exploration map and statistics — shipped in 0.5.0.** Visited countries/states/places, milestones and personal exploration summaries.
7. **Geotag exported photo copies — shipped in 0.5.0.** Write the footprint coordinates into a new exported copy; preserve the saved original.
8. **Personal tags and smart collections — shipped in 0.5.0.** Flexible labels and saved filters beyond the current fixed categories.
9. **Shareable memory cards and trip books — shipped in 0.5.0.** Export a card or PDF with a deliberate location/privacy choice.
10. **Opt-in proximity memories — shipped in 0.5.0.** A “you’ve been here before” reminder, with explicit permission/settings and practical battery/privacy limits.

## Existing engineering queue

- **Larger collections and streamed backups.** Move saved journal media out of in-memory base64 state and stream backup archives. Recovery shipped in 0.3.10; unfinished live voice recording and in-flight file selections remain outside recovery.
- **Worldwide detailed offline coverage.** Add an offline-capable global dataset/provider and package import or download flow. USGS detailed coverage is U.S.-focused.

## Journal suite shipped in 0.5.0

All remaining eight approved product ideas are implemented together. Journal tools provides anniversary memories (optional home card), month calendar/visit timeline, exploration totals/years/milestones, editable smart collections, batch photo import and opt-in nearby memories. Existing three-tab navigation remains. Country/region totals and pin filters use user-entered shared place labels; no automatic boundary lookup or country choropleth is included. Tags and smart rules compose with search, trip, category, Favorites and map filters; matching date/rating/trip rules apply to one visit.

Batch reading is sequential, cancellable and local. Real embedded date plus GPS within 100 m can propose a same-day group; unknown metadata remains separate and today is visibly a proposed date. Individual-photo mode is available. Exact originals already saved or repeated in the batch are skipped. New-place and explicit return-visit targets are reviewed before one atomic journal write. Failure retains the review without partial records. Bounds: 60 files, 80 MB raw batch, 20 MB each, 30 photos per visit.

Cards and trip books have an editable title and an explicit hide/area/exact location choice, defaulting to hidden. Photo content, titles and stories may still identify a location. PNG cards mark shortened text; A4 PDF books paginate full matching trip stories and optional all photos. PDFs are image pages with device-font glyph coverage, not searchable text. Bounds: 100 visits, 300 pages, 80 MB. JPEG geotag copies re-encode the selected original upright, cap the long edge at 4,096 px and write only chosen-visit GPS/orientation/description; no fabricated capture timestamp. Original media never changes. The actual native save plugin accepts PDF and confirms success only after closure.

Nearby consent is off by default, requests permission only on explicit enable, and runs only while the app is visible. Hidden/native pause stops the watch; resume checks existing permission without prompting. Radius 250/500/1,000 m, roughly minute updates, bounded accuracy, and a 24-hour per-place cooldown limit repeated checks/reminders. It records no trail, schedules no background/system alerts and stores only local preference/cooldown identifiers. These settings never restore from another device. Anniversary memories also use in-app cards rather than scheduled notifications.

Backup format 5 supports imports 1–4; labels and smart collections validate before writes. Collection deletion markers survive restore, with monotonic local clocks even after clock rollback. Collections always merge; the appearance checkbox controls theme/memories only. Recovery metadata 4 retains new labels and accepts 1–3. Existing base64 media/150 MB backup bounds remain.

Validation: 272 automated Node/Java/IndexedDB checks; mobile/desktop combined UI tests, old-format restore, draft restart, quota-failure atomic retry, import cancellation/discard, per-visit collection composition, privacy/metadata inspection, independent GPS reading, nine-page PDF rendering and complete-story verification, nearby pause/resume and offline shell-v25 restart, batch save and card/PDF export. Physical Android testing remains necessary. Geolocation API reference: https://capacitorjs.com/docs/apis/geolocation .

## Return visits shipped in 0.4.1

User confirmed Trips & journeys 0.4.0 worked on October 15, 2026. Return visits subsequently shipped in 0.4.1 and the user confirmed it worked. The remaining eight ship together in 0.5.0.

Open a footprint and use Log return visit. Dates, ratings, story, photo gallery/selected photo, completed audio, coordinates and trip memberships belong to that visit; title, category, favorite, address, phone and website are shared place details. Switch visits from a dated selector, edit either visit using the existing editor/camera flow, choose a visit photo for the journal or delete just that visit. At least one visit must remain; Delete place removes the entire footprint and all visits. Adding a return creates no extra place ID, map pin or widget target. Sorting and widgets use the latest visit date. A newly added visit supplies the journal cover; photo-less visits fall back to another saved photo. Original place coordinates anchor its map pin, with a located return as fallback when needed; individual visit coordinates remain visible and available to Directions.

Existing records remain their original visit without rewriting or duplicating their media. Additional visits are stored alongside it, with per-visit update clocks and lightweight removal markers. Editing an earlier visit preserves later visits. Trip membership is per visit; the trip manager adds a selected place to the latest visit and removes a deselected place from all its visits in that trip. Trips still count unique places, show the first/last dates for matching visits and use matching visit photos. Global trip filters and historical-note search include return visits. Journal/photo pin/widget previews follow the selected journal photo. Same-day returns remain distinct.

Full `.nthbackup` format 4 stores original media once per visit and includes all visit clocks, selections and removal markers. Formats 1/2/3 still restore; older apps reject format 4. Restore merges visits independently while keeping newer shared place details, and older backups cannot revive removed visits. If conflicting histories would remove every visit of a place, validation rejects the restore before writing. Recovery draft metadata version 3 retains whether the editor was adding or editing a specific visit; versions 1/2 still resume. Changed or deleted parents recover to a new footprint. Journal Save and matching recovery cleanup remain atomic. Unfinished live recording and uncompleted file reads retain the earlier recovery limitations.

Limits: 200 visit entries per place, including the original entry and removed-entry markers; up to 30 photos and one completed audio attachment per visit, 20 MB per selected media file; 20 journeys per visit; the existing 150 MB total backup bound remains. Place counts continue to count places, not visits. Larger collections/streamed backups remain queued.

242 automated Node/Java/IndexedDB checks pass. Chromium phone/desktop checks cover independent galleries and trips, editing earlier visits, dirty Back protection, add/edit recovery, journal cover/latest date, trip dates and a single map place, fresh backup restore, removal and older-backup protection. Native-style process-death/returned-camera checks preserve the visit identity without requesting later GPS; conflict recovery keeps the saved parent and its history. Offline reload, return-visit saving and restart persistence pass through shell cache v24. Screens were checked at phone and desktop sizes. Physical Android testing remains necessary.

## Trips & journeys shipped in 0.4.0

Trips & journeys opens from the journal tools without changing the three main tabs. Create a name/description, select existing footprints using a searchable list, and save the selection explicitly. A footprint can belong to several journeys (up to 20). The footprint editor also offers trip membership and defaults a new footprint to the active trip filter. A chosen stop supplies the journey cover; its current main photo follows gallery edits. The fallback uses the first photographed stop, or the first stop if no photos exist. Dates derive from the first/last visit, and the stop list is chronological. Browse footprints and View on map clear unrelated search/category filters and select the journey; the trip selector then composes with the existing search, categories, Favorites and sorting.

Deleting a journey retains every footprint and attachment. Removed journeys retain lightweight deletion markers so restoring an older backup cannot revive them. Footprint removal/membership changes repair unavailable covers. Trip metadata, memberships and preferences save together in one journal transaction, using the shared serialized write queue. Failed writes preserve the previous state. Journey forms guard unsaved changes, block editing during writes and follow Android/browser Back. Editing a footprint inside a journey retains the journey underneath.

Full `.nthbackup` format 3 contains journeys, deletion markers, memberships, original gallery/audio and preferences. Formats 1 and 2 still import; older app versions reject format 3. Restore merges journey metadata separately by its update time, then removes references to deleted/missing journeys and repairs covers. Up to 1,000 journey entries including deletion markers; existing 10,000-backup-record, 30-photo and 150 MB limits remain. Recovery draft metadata version 2 includes selected journey IDs; previous version 1 drafts still resume. Recovery drafts and offline tiles remain outside journal backups.

219 automated Node/Java/IndexedDB checks pass. Chromium mobile and desktop checks cover creation, member selection through searches, date range/cover, map filtering, unsaved form guards, editor membership after restart, original-photo backup/fresh restore, deletion without media loss, restoring an older backup and reload. No page errors occurred. Physical Android checks remain for this release.

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


## 0.5.1 layout and visit map refinement

User-marked layout implemented: New footprint → Tag → Collection; below search/trip/sort, Journal tools → Trips & journeys → Backup & restore → Preferences. Four utility actions stay in a row on phones, with wrapped labels. Category filters follow. Removed the marked Use this photo in journal shortcut and shared-fields description from detail view; gallery selection and visit removal remain.

Located visits show a small map under GPS. It shares atlas photo pins and online/offline map backgrounds, is lazy while off screen, stops tiles while covered/hidden and destroys on close/switch. Tapping its accessible button closes nested dialogs safely, clears excluding filters and selects/focuses that visit in Map & directions. A temporary display override keeps a return visit's different coordinates/photo in the selected map pin without changing saved place data. Missing coordinates omit the preview. Offline shell v26 includes the new module.

275 automated checks and phone/desktop/offline browser verification pass. No backup/schema change. Physical Android testing remains necessary.
