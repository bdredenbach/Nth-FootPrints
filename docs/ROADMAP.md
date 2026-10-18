# Nth FootPrints working queue

GitHub is authoritative. Current prototype: **0.9.0**.

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
8. **Personal tags — shipped in 0.5.0.** Flexible labels; saved filters were removed in 0.6.5 to simplify organization.
9. **Shareable memory cards and trip books — shipped in 0.5.0.** Export a card or PDF with a deliberate location/privacy choice.
10. **Opt-in proximity memories — shipped in 0.5.0.** A “you’ve been here before” reminder, with explicit permission/settings and practical battery/privacy limits.

## Existing engineering queue

- **Larger media libraries and streamed backups — shipped in 0.7.0.** Binary originals are separated from metadata; ZIP64 backup/restore and native 64-bit verification pass the 2.28 GB transport regression. Physical-phone capacity/provider checks remain. Recovery shipped in 0.3.10; unfinished live voice recording and in-flight file selections remain outside recovery.
- **Worldwide detailed offline coverage.** Add an offline-capable global dataset/provider and package import or download flow. USGS detailed coverage is U.S.-focused.

## Journal suite shipped in 0.5.0

All remaining eight approved product ideas are implemented together. Journal tools provides anniversary memories (optional home card), month calendar/visit timeline, exploration totals/years/milestones, batch photo import and opt-in nearby memories. Existing three-tab navigation remains. Country/region totals and pin filters use user-entered shared place labels; no automatic boundary lookup or country choropleth is included. Tags compose with search, trip, category, Favorites and map filters.

Batch reading is sequential, cancellable and local. Real embedded date plus GPS within 100 m can propose a same-day group; unknown metadata remains separate and today is visibly a proposed date. Individual-photo mode is available. Exact originals already saved or repeated in the batch are skipped. New-place and explicit return-visit targets are reviewed before one atomic journal write. Failure retains the review without partial records. Bounds: 60 files, 20 MB each, 30 photos per visit; no separate aggregate byte cap as of 0.8.3. Device storage/quota applies.

Cards and trip books have an editable title and an explicit hide/area/exact location choice, defaulting to hidden. Photo content, titles and stories may still identify a location. PNG cards mark shortened text; A4 PDF books paginate full matching trip stories and optional all photos. PDFs are image pages with device-font glyph coverage, not searchable text. Bounds: 100 visits, 300 pages, 80 MB. JPEG geotag copies re-encode the selected original upright, cap the long edge at 4,096 px and write only chosen-visit GPS/orientation/description; no fabricated capture timestamp. Original media never changes. The actual native save plugin accepts PDF and confirms success only after closure.

Nearby consent is off by default, requests permission only on explicit enable, and runs only while the app is visible. Hidden/native pause stops the watch; resume checks existing permission without prompting. Radius 250/500/1,000 m, roughly minute updates, bounded accuracy, and a 24-hour per-place cooldown limit repeated checks/reminders. It records no trail, schedules no background/system alerts and stores only local preference/cooldown identifiers. These settings never restore from another device. Anniversary memories also use in-app cards rather than scheduled notifications.

Backup format 5 supports imports 1–4; labels validate before writes. The appearance checkbox controls theme/memories only; retired settings are ignored when restoring. Recovery metadata 4 retains new labels and accepts 1–3. Existing base64 media/150 MB backup bounds remain.

Validation: 272 automated Node/Java/IndexedDB checks; mobile/desktop combined UI tests, old-format restore, draft restart, quota-failure atomic retry, import cancellation/discard, per-visit filtering, privacy/metadata inspection, independent GPS reading, nine-page PDF rendering and complete-story verification, nearby pause/resume and offline shell-v25 restart, batch save and card/PDF export. Physical Android testing remains necessary. Geolocation API reference: https://capacitorjs.com/docs/apis/geolocation .

## Return visits shipped in 0.4.1

User confirmed Trips & journeys 0.4.0 worked on October 15, 2026. Return visits subsequently shipped in 0.4.1 and the user confirmed it worked. The remaining eight ship together in 0.5.0.

Open a footprint and use Log return visit. Dates, ratings, story, photo gallery/selected photo, completed audio, coordinates and trip memberships belong to that visit; title, category, favorite, address, phone and website are shared place details. Switch visits from a dated selector, edit either visit using the existing editor/camera flow, choose a visit photo for the journal or delete just that visit. At least one visit must remain; Delete place removes the entire footprint and all visits. Adding a return creates no extra place ID, map pin or widget target. Sorting and widgets use the latest visit date. A newly added visit supplies the journal cover; photo-less visits fall back to another saved photo. Original place coordinates anchor its map pin, with a located return as fallback when needed; individual visit coordinates remain visible and available to Directions.

Existing records remain their original visit without rewriting or duplicating their media. Additional visits are stored alongside it, with per-visit update clocks and lightweight removal markers. Editing an earlier visit preserves later visits. Trip membership is per visit; the trip manager adds a selected place to the latest visit and removes a deselected place from all its visits in that trip. Trips still count unique places, show the first/last dates for matching visits and use matching visit photos. Global trip filters and historical-note search include return visits. Journal/photo pin/widget previews follow the selected journal photo. Same-day returns remain distinct.

Full `.nthbackup` format 4 stores original media once per visit and includes all visit clocks, selections and removal markers. Formats 1/2/3 still restore; older apps reject format 4. Restore merges visits independently while keeping newer shared place details, and older backups cannot revive removed visits. If conflicting histories would remove every visit of a place, validation rejects the restore before writing. Recovery draft metadata version 3 retains whether the editor was adding or editing a specific visit; versions 1/2 still resume. Changed or deleted parents recover to a new footprint. Journal Save and matching recovery cleanup remain atomic. Unfinished live recording and uncompleted file reads retain the earlier recovery limitations.

Limits: 200 visit entries per place, including the original entry and removed-entry markers; up to 30 photos and one completed audio attachment per visit, 20 MB per selected media file; 20 journeys per visit; the existing 150 MB total backup bound remains. Place counts continue to count places, not visits. Larger media libraries/streamed backups remain queued.

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

User-marked layout implemented: New footprint → Tag; below search/trip/sort, Journal tools → Trips & journeys → Backup & restore → Preferences. Four utility actions stay in a row on phones, with wrapped labels. Place categories are available on Places. Removed the marked Use this photo in journal shortcut and shared-fields description from detail view; gallery selection and visit removal remain.

Located visits show a small map under GPS. It shares atlas photo pins and online/offline map backgrounds, is lazy while off screen, stops tiles while covered/hidden and destroys on close/switch. Tapping its accessible button closes nested dialogs safely, clears excluding filters and selects/focuses that visit in Map & directions. A temporary display override keeps a return visit's different coordinates/photo in the selected map pin without changing saved place data. Missing coordinates omit the preview. Offline shell v26 includes the new module.

275 automated checks and phone/desktop/offline browser verification pass. No backup/schema change. Physical Android testing remains necessary.


## 0.6.0 Places discovery

Favorites navigation becomes Places with the folded-map icon; saved Map & directions uses the location icon. Favorites remain a secondary Journal tools destination. Removed the old category bar from every saved-journal view. Places owns the five new groups and all 38 screenshot subtypes; older saved categories remain readable/editable without migration.

Live discovery uses explicit approximate-area Overpass queries, a map with footprint pins, 1/2/5 km radius, local result text filter and 30-at-a-time scrolling. Initially centers near the latest personal saved footprint with no lookup until Search this area. Explicit Use my location can request GPS and query; map panning waits for another Search this area. Pins and source-attributed modal listings open a reviewable source-prefilled editor, Directions, existing source matches or return visits. No fabricated stories/ratings/photos and no scraped images. Query/result/website/source metadata validate; stale/paused searches and location results are ignored. Provider errors do not alter the journal.

Current community provider: https://overpass-api.de/api/interpreter . Needs a dedicated service before wider distribution, per operator guidance: https://dev.overpass-api.de/overpass-doc/en/preface/commons.html . Private.coffee's endpoint returned server errors during testing; no automatic cross-provider failover is shipped. Small public NYC test requests against the selected service returned actual data and CORS.

Bounded prototype: 600 candidates, 2 MB per response, 3-second minimum request interval, 45-second client/15-second query timeout, 50 requests/5 MB per device/local day, 12 five-minute in-memory cache entries. Budget metadata only is persisted outside backups. Results aren't retained after process restart. Offline maps and saved journals continue independently. Backup v6 imports v1–v5; optional placeSource survives shared-place edits/returns and restores. Recovery metadata v5 reads previous versions. Existing pending feature queue (larger media/streamed backups, worldwide detailed offline coverage and deferred signing) remains.

286 automated checks, responsive phone/desktop discovery/save/restart/backup tests and offline checks pass. Physical Android testing remains necessary.


## 0.6.1 Places usability and search recovery

Replaced saved-origin dropdown and lower Refresh / retry link with one accessible Refresh button beside Use my location. Refresh also retries map tiles and searches the current map area after panning. The map fits the chosen radius when entering an area or changing radius, drawing its boundary; category changes do not reset zoom. Searches never depend on zoom events.

Loaded category results restore without another request, including session-stale entries. Complete group results answer narrower types and smaller radii locally; truncated group results require a new subtype lookup. Cache is bounded to 30 sets, 30-minute freshness for ordinary client searches. Explicit Refresh bypasses cache; failed refresh retains it. Previous results/pins stay labeled and visible while another category loads or fails.

Local daily successful-search allowance is 50; failures and cancellations spend no successful-search credit. Separate 100-attempt and 5 MB limits protect the community service, with 3-second minimum pacing, Retry-After and escalating failure cooldowns. Legacy attempt budget migrates without charging it as successes. No automatic external retries or provider failover.

Provider recommendation researched: Geoapify Places supports category/radius search, offset pagination and attributed cache/store reuse with Leaflet. It requires an account/key and has not been enabled. Its OSM-based coverage is not guaranteed to add missing local businesses. Google Places map and storage restrictions make it a larger change for permanent journal data. Sources: https://www.geoapify.com/places-api/ , https://www.geoapify.com/pricing/ , https://developers.google.com/maps/documentation/places/web-service/policies .


## 0.6.2 Geoapify Places

Replaced Overpass discovery with Geoapify Places and the owner-supplied client-visible project key. JSON POST plus X-API-Key header uses a fixed category whitelist, approximate area and proximity ranking; no stories/photos/record IDs are sent. All five groups/38 subtypes remain, with local mapped-tag checks for provider category gaps. Up to 500 candidates load in one bounded request and append 30 at a time in the list. Cached switching, radius framing, failed-result retention, pause/cancel guards and external Directions remain.

Geoapify has separate per-device allowance metadata: 50 successes, 100 attempts, 50 MB/day, 2 MB/response, 3-second pacing, Retry-After/backoff and 45-second timeout. Old Overpass counters do not block the new provider. Account quotas are separate and shared by clients using the configured key. No automatic retries or fallback.

Stable OSM identities preserve recognition of older saved places. Geoapify attribution and fallback provider IDs survive editor recovery, saving/return visits, cards/books and backup v7. Recovery metadata v6 reads earlier versions; backup v7 reads versions 1–6. Keys are not in backup or recovery data. Required linked credits appear in discovery and saved details.

297 automated checks plus responsive browser checks pass. Live requests used public NYC fixtures only, confirming listings and localhost CORS/key-header support. Physical Android testing remains necessary.


## 0.6.3 Saved Places searches

Completed Geoapify searches persist across app restarts in separate IndexedDB storage. Places restores the last successful area/category/type/radius without GPS or a network request. Saved searches above the map recalls recent areas; timestamps identify when listings were last fetched. Explicit Refresh updates the provider results. Old/offline snapshots remain usable. Base-map downloads are separate.

Limits are 30 queries / 20 MB, with LRU eviction. Cache identity includes the local subtype even when two provider bodies are identical. Up to 100 m of center drift reuses and displays the original saved circle; fully covered smaller circles can reuse complete larger searches. Partial/truncated broad results are not treated as complete subtype coverage. Persisted rows validate coordinates, sources, enum values, size and safe metadata before display. Failed refreshes and cancellations cannot replace successful snapshots. Storage failures identify session-only results.

Clear saved searches leaves the journal, downloads and service budget untouched. Cached area centers/listings stay on this device, outside portable journal backups; uninstalling or clearing app data removes them. Existing 0.6.2 in-memory results need a fresh initial query in 0.6.3. No backup/recovery format change. 306 automated checks and responsive restart/offline/recall/clear browser checks pass.

### Batch import grouping — 0.6.4

Automatic groups require an embedded photo date and GPS: nearby matches within 100 m of the first photo; same location matches both coordinates to five decimal places (about 1 m). Review original dates/GPS per photo. Missing metadata stays separate automatically. Optional shared-location grouping applies reviewed coordinates to checked groups, including missing GPS, with one group per reviewed date and up to 30 photos each. Conflicting destinations/labels block merging, stories/tags are retained, and Undo restores the previous review. Originals and backup formats stay unchanged.

### Simplified organization — 0.6.5

Saved collections are removed from the toolbar, Journal tools, filtering, editing and settings merges. Tags remain the personal organizing tool; trips, favorites, search and exploration retain their roles. Legacy saved-filter metadata is ignored in device state and v1–v7 restores, and is not exported again. Existing records and attachment bytes remain intact; no backup or recovery version change.

### Explicit one-footprint photo import — 0.6.6

The grouping dropdown offers “All selected photos in one footprint”: one shared review and one new footprint for up to 30 unique photos, regardless of missing GPS or differing dates. Its shared date/GPS start from the first detected values, or today/no location when absent. Per-group saved-place destinations and manual date-based grouping controls are hidden in this mode. Every included image is previewed; no photos are silently split or dropped. Switching modes reuses the selected original media; edited fields require confirmation before rebuilding. Existing duplicate skipping, atomic saves, cancellation and automatic GPS/date modes remain. Backup v7 and recovery v6 are unchanged; shell v33 refreshes the UI.


### Journal filters and location labels — 0.6.8

Borderless All tags and All footprints sit beside New footprint; sorting sits beside search. Country choices are pre-populated offline, with U.S. states/territories and Canadian provinces/territories plus manual/custom fallback. Photo/map/device coordinates can fill empty country/state labels through cached Geoapify reverse lookup, including batch review. Pending results never replace manual labels. Queued stale work is cancelled before provider use; lookup has separate bounded caching, timeout and safety budget.

Android selected-photo uploads request original media and photo-location permission through the system document chooser. Providers can still supply copies without GPS; manual location choices remain available. Original attachment bytes, saved custom labels, portable v7 and recovery v6 remain unchanged. Physical Android provider behavior needs device validation. Binary media/streamed backups, broader offline map coverage and permanent signing remain queued.


### Enlarged photos — 0.6.9

Tap the two diagonal double-ended arrows in the corner of a saved footprint's photo or an editor's selected-photo preview. A full-screen view fits the complete original image without cropping. Pinch, double-tap, use the zoom controls or a mouse wheel to zoom up to 5×, then drag to inspect. Fit resets the view; previous/next buttons or horizontal swipes at fitted size browse that visit's photos locally. Enlarged browsing never changes the saved cover, attachment bytes, visit metadata or unfinished form fields. The button stays hidden when no real photo is attached.

Close, Escape, browser Back or Android Back returns to the parent footprint/editor; focus returns to the corner button. Browser Forward reconstructs the view from its parent. Arrow keys browse when fitted and pan while zoomed; +/− zoom and 0 fits. Controls respect device insets, viewport rotation and reduced screen sizes. The image reference and gesture state are cleared on close. No external image service or fullscreen permission is required; local photos work offline.

Validation: 322 automated checks pass. Browser checks at 360×800, 393×852, 1280×900 and 844×390 verify actual touch pinch, pan, double-tap, whole-image fitting, orientation changes, local gallery browsing, Back/Forward, focus return and unchanged originals/cover/editor fields. Additional checks cover offline viewing, safe-area insets and failed-image feedback. Portable backup v7 and recovery v6 remain unchanged; shell v36 caches the new viewer module.


## 0.7.0 — binary originals and streamed backups

Original photos/audio now live once in a dedicated content-addressed Blob store; journal records keep small references. Existing journals migrate atomically on first opening, with original bytes, visits, labels and choices retained. A failed migration leaves the legacy journal intact and offers an actionable message; metadata-only edits never rewrite existing media.

Create backup writes a ZIP64 archive directly in bounded chunks. Android uses 64-bit counters and confirms a closed, exact-length file only after reading it back for SHA-256 verification. Restore checks index/paths/CRC/media identities, stages attachments separately and publishes the merged journal atomically. Cancellation, failed storage writes and interrupted staging preserve the old journal. Legacy JSON v1–v7 and recovery v6 remain supported. Browsers with direct save pickers stream; download-only browsers have a bounded 128 MiB fallback. Existing individual-attachment limits remain 20 MiB.

The real capacity regression writes and restores 128 file-backed transport fixtures: 2,281,806,590 archive bytes / 2,281,701,376 original bytes, beyond the signed 32-bit boundary. Node runs with a 96 MiB heap; native Java ZIP64 read/CRC/SHA verification runs with 32 MiB. This proves transport and byte integrity in the test environment, not physical-phone timings. The workflow repeats this test before packaging.

Responsive browser checks at 360/393/1280 px cover migration, original photo viewing/export, archive saving, missing/reordered multi-part inputs, cold reload and binary draft recovery. The unchanged 0.6.9 bundle and a legacy database also exercise a read-only rescue: five forced small volumes restore successfully and leave the old database byte-identical. The Python helper's actual CDP/WebSocket transport passes against that old app context. Physical Android wireless pairing/document providers still need validation.

**Existing installed test APKs:** their signing certificates differ, so a new binary cannot simply update the old app in place. Do not uninstall its only journal copy. A compatibility rescue writes numbered parts through the old handler, and the new reader accepts them together. See [phone-only rescue steps](PHONE-RESCUE.md). It requires a user-authorized local debugging connection; no journal data is uploaded. Private signing-key continuity remains a separate testing/release task.

## Photo import progress (0.8.3)

Backup-style transfer panel for photo preparation and final save, with photo/byte progress, filename, cancellation and review handoff. The previous 80 MB aggregate limit is removed; 60 files × 20 MiB remain, subject to device storage/quota. Independent media staging scopes keep memory tied to one original at a time and preserve concurrent review/restore media. Cancelling or discarding removes unused staging; failed final saves retain the review and prior journal. Content-key duplicate checks survive refreshed Blob URLs. 362 automated checks and a real 96 MiB browser import/save pass, with cancellation, storage failure and 320–1280 px layout checks. Physical-phone capacity remains device-specific.

## First-launch field guide (0.8.4)

Thirteen themed chapters explain FootPrints controls and workflows with paths, chapter selection, Back/Next, skip and Preferences replay. First launch opens the guide immediately; interrupted progress resumes. The final location chapter requests native permission only when Finish & allow location is chosen. Existing precise/approximate permission is reused without a fresh fix. Denial, system-services-off and unavailable access have retry/continue choices; continuing without access completes onboarding. Device-local completion is outside backups. Nearby memories stays independently opt-in. Photo-location metadata access still occurs in the original-photo chooser; imported GPS is never replaced by startup coordinates.

373 automated checks pass. All chapters fit five tested widths in both themes; browser flows verify permission order, denial, disabled services, approximate access, completion/relaunch, replay and Android Back/history navigation. Native permission/provider behavior needs a physical phone check.

## Contextual first-visit tutorials (0.8.5)

Replaces the 0.8.4 chapter tour with per-area coaching on real, highlighted controls. Areas have independent seen flags, with separate introductions for asynchronous photo metadata/import review/journey detail and each Journal tools tab. First-visit help is dismissible with remembered state, supports Android Back/history replay, respects theme/viewport/safe areas, and can be disabled/reset in Preferences. Location setup follows the first main-screen tips and remains explicitly available from Preferences. Native permission requests obtain no startup GPS fix; photo GPS and Nearby memories retain their separate behavior. Tip state stays outside backups.

376 automated tests and contextual browser flows pass across five widths and both themes. Permission denial/services off/approximate access, first/repeat visits, disable/reset, restart, Android Back/history forward, original photo GPS, import review, viewer, offline maps, backup and asynchronous journey creation are covered. Physical-phone behavior still needs checking.

## Chosen-spot address and story (0.8.6)

Use this spot now reverse-resolves a blank address for a manual map pin, while a selected search result retains its mapped identity for available description filling in The story. Manual pins can use descriptions only from a named mapped amenity within 10 m or a named building at zero reverse-lookup distance. Other streets/areas/neighbours do not lend descriptions. The checked picker option covers empty name/address/story and can be disabled.

Authored text and edits during lookup stay intact; only untouched automatic text follows a later location choice. Generation/session/coordinate/save guards prevent late replies from touching another draft or saved data. Failure leaves coordinates usable; response size, timeout, request spacing, cache and daily safety bounds apply. Description requests share the existing client with Places and prefer exact place/OSM identity. Contextual picker help and Geoapify/OSM credits are updated.

388 automated checks and full browser flows pass for manual/selected locations, persisted fills, missing/wrong descriptions, manual edits, late responses, failure and opt-out. Live coverage and Android interaction still need phone testing.

## Shipped in 0.9.0 — exploration and badges

Four Trips & journeys pills replace Exploration in Journal tools. The three-column Exploration summary separates distinct places, regions, countries, revisits and visit/media totals. Sixty-four current-journal milestone rules unlock eight families of original WebP trophy artwork. The case supports multiple pages, shelf drag and keyboard movement, Reader-style dimension/position/contact/facing sliders, finishes, lighting, hide/show and durable saved layouts included in backups. Journal care fills the fourth Journal tools pill and opens exact visits for missing-detail review. New contextual tips cover the new areas. Counts exclude removed visits, empty/deleted journeys and starter demos.
