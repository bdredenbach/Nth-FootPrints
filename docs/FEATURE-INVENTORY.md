# Nth FootPrints — prototype update, 0.2

## Product direction
An original Nth Experience travel journal inspired by the functional ideas of HTC Footprints and HTC Locations. Warm paper, forest-green navigation, brass accents, original illustrated sample memories, layered photo cards. No HTC code or artwork is included in the app. The current prototype is a static browser app and a Capacitor Android test APK, maintained in GitHub.

## Reference evidence
The supplied HtcFootprints.apk.zip and HtcFootprintsWidget.apk.zip are APK containers (356 and 77 archive entries respectively). Inspected filenames/layouts include camera capture, detail/edit screens, media panels, voice-record dialog, search, sorting, map display, import/export, navigation, phone and URL controls, categories and favorites. File names indicate intended controls; they do not prove complete runtime behavior.

Initially, twenty evenly spaced frames were inspected from each supplied video, not a complete frame-by-frame audit. For the vertical-stack update, a further 24 frames between 8.8 and 11.8 seconds in 218915.mp4 were inspected to study the front card lifting and tipping away as the next card is revealed. 218911.mp4 (~135 s) shows the Android app/widget and capture flow. 218912.mp4 (~134 s) shows a list, ratings/categories/date, place details, coordinates and map interactions. 218915.mp4 (~31 s) shows a Windows Mobile variant with a layered photo deck, card transition, details and an audio playback row. These versions are treated as separate references rather than assumed to be identical releases.

A separate HTC Locations APK/manual/video is not supplied. Claims of complete feature parity are deferred until that inventory is established.

## First prototype
| Capability | Status |
|---|---|
| Instant-photo deck with vertical swipe, mouse drag/wheel and Up/Down keys | Implemented, 3D lift-and-tip transition with reduced-motion fallback |
| Photo Journal | Vertical full-journal stack with search/category filters; descriptions open with the memory |
| Journal filters, favorites, six categories, text search and sorting | Implemented across the journal and map views |
| Create/edit/delete with date, rating, address, notes, phone, website | Implemented |
| Original photo gallery per place | Implemented in 0.3.3, up to 30 photos per visit, 20 MB each; persisted main image, horizontal browsing and per-photo export |
| One voice note per visit, recording or audio upload | Implemented, requires browser microphone support/permission, 20 MB limit |
| GPS capture and manual coordinates | Implemented, requires location permission for capture; Take photo + locate pairs a new camera attachment with a fresh location fix |
| Photo geotagging | Read embedded GPS from JPEG/PNG/WebP EXIF; preview and explicitly apply coordinates; optional original visit date; re-read existing saved photos |
| Multi-pin atlas | Implemented in 0.3.0; photo thumbnails added in 0.3.4; fit-all, pin-to-memory, list selection, filters, missing-location entries and external directions |
| Directions | External Google Maps destination link, not integrated navigation |
| Local editor recovery | Shipped in 0.3.10: text, gallery/cover, favorite and completed audio drafts, plus matching returned Android camera photos; Resume/Discard after restart |
| Trips & journeys | Shipped in 0.4.0: multi-journey membership, chosen cover, automatic dates, chronological stops, trip filters/map, atomic persistence and backups |
| Return visits | Shipped in 0.4.1: one place with dated visits, independent media/story/rating/location/trips, visit selection/edit/removal, latest sorting/widget, independent backup merge and recovery |
| Journal persistence | IndexedDB on the current browser/origin; browser clearance removes data |
| Offline map areas | Shipped in 0.3.9: USGS topographic areas, detailed U.S. coverage, progress/cancel/removal, local atlas and picker rendering |
| App shell caching | Service worker; full offline installation/auth behavior not verified |
| Back Up Journal / Restore Journal | Implemented, app-specific .nthbackup v5; v1–v4 imports supported |
| Individual photo export | Export Photo saves original JPEG, PNG, WebP or GIF; full journal backups remain in Backup & restore |
| Theme | Warm paper / Evening ink |
| Native Android test package | Implemented with Capacitor 8; persistent signing remains to do |
| Android home-screen widget | Implemented in 0.3.2; latest-visit preview, open-memory and new-footprint shortcuts; physical launcher testing pending |
| Address/named-business search | Shipped in 0.3.8 using Photon; explicit online queries in the position picker |
| Worldwide detailed offline maps | Still queued; U.S. offline map viewing shipped in 0.3.9 |
| Integrated routing, turn-by-turn, voice guidance | Skipped by user choice; Directions opens the external map app |
| KMZ import/export | Omitted at user request |

## Prototype boundaries
The original SVG examples and their notes are explicitly labeled samples. Users can remove untouched samples without removing their own places or edited samples. No reverse geocoding, embedded EXIF writing, cloud sync, account system, map tile downloads or routing engine is implemented. Photos and voice notes remain local to the journal unless the user exports them. Opening an external map sends the selected coordinates to that map service. GitHub Pages serves the public browser app; journal data remains local to its browser/app storage.

Media bytes are kept in base64 data URLs without recompression. This first implementation has a 150 MB backup limit, 20 MB per attachment, and loads the journal in memory. A native file-based media store and streaming archive exporter are required before claiming large media library support. Browser media codec playback varies by platform.

## Validation
Node syntax checks, HTML asset/ID checks and domain tests cover backup round-trip including exact attachment bytes, invalid/incompatible data rejection, revision merge rules, repeated restore, and search/filter/sort. 114 Node tests pass across data, gestures, metadata, native export orchestration and map-controller logic. GPS fixtures are original generated JPEG/PNG/WebP files whose metadata was independently checked using Pillow. Tests include hemisphere signs, zero coordinates, little/big byte order, malformed offsets, invalid rational denominators, missing GPS, media preservation and geotag backup round trips. No browser-control skill is available in this environment; no browser visual QA, direct device testing, live tile-loading test or PWA installation test has been performed here. Map controller tests use a fake Leaflet/DOM boundary, without fetching public tiles. Deployment success is checked separately.

## Geotagging behavior
Photo metadata is read locally. The location preview provides coordinates and an optional external map link; no map request occurs until the user opens it. Existing editor coordinates and the date are unchanged until the user applies the photo location. Original photo date is separately opt-in. Missing or malformed metadata never defaults to the current location. The camera action is explicitly labeled Take photo + locate and requests a fresh device location after a successful attachment. A location error keeps the photo and lets the user enter coordinates manually. Pending location results cannot overwrite later manual edits, an applied photo geotag or another editing session. Save waits for active location requests to finish or for the user to enter coordinates manually.

Geotags belong to the footprint record and survive backups; the app does not rewrite EXIF into the original photo. GIF and HEIC GPS reading, XMP-only location tags, reverse-geocoded addresses remain outside this step; map pin placement was added in 0.3.1. Metadata references: [ExifTool GPS tag documentation](https://exiftool.org/TagNames/GPS.html) and [Library of Congress EXIF format description](https://wwws.loc.gov/preservation/digital/formats/fdd/fdd000618.shtml).

## 0.2.1 gallery correction
The supplied 218917.mp4 screen recording (~13.6 seconds) was sampled at twelve points to inspect the reported distinction between swiping directly on cards and in surrounding space. The event handler treated a bubbled lostpointercapture from a touched child as the deck losing capture. It now cancels only when the deck itself is the event target. Regression tests first reproduced the failure on photo/caption targets while surrounding-space gestures succeeded, then passed after this change. Up/down swipes, genuine capture cancellation and tap-to-open are covered. Phone/browser reproduction of the finished correction remains to be checked.

Removed the gallery's entire place-detail preview panel and centered the journal stack. Place descriptions and voice-note playback now appear only in the opened memory dialog; titles, dates and the footprint counter remain on the cards. Saved notes and other data are unchanged.

## 0.2.2 navigation simplification
Removed the entire introductory heading block (eyebrow, slogan, subtitle and atlas edition label) and the second, All Places tab. The three remaining tabs are Photo Journal, Map & Directions and Favorites. The journal retains the working vertical stack and search/category filters; full descriptions remain in the clicked-photo dialog. Old #places bookmarks open the journal. Removed references to the deleted heading IDs so navigation and startup continue to render correctly.

## 0.2.3 GitHub-first updates and starter cleanup
GitHub main is the authoritative source from this release onward; updates are deployed through its GitHub Pages build. Removed the sample explanation and manual Remove samples control. Backup & Restore and Preferences now share one static toolbar above search on all screen sizes, with the duplicate mobile row removed.

Saving a personal footprint automatically removes untouched starter records in the same IndexedDB transaction. Cancelled or invalid edits do not commit changes. Edited starter records are preserved. Loading older journals or restoring backups with personal records also clears untouched starters; deleting the last personal footprint does not reseed the journal. Starter identification uses the three known example IDs and original update timestamp, so unrelated entries are never removed based on their title or illustration alone.

## 0.2.4 compact journal action row
Removed the top header containing “Your world, collected.” and moved New Footprint to the left of Backup & Restore and Preferences in the existing row above search. The row wraps on narrow displays rather than clipping controls. The New Footprint button keeps its existing action and element ID; no saved journal data or gesture logic changed.

## 0.2.5 Android safe areas
The first test APK drew controls under the Android status/navigation bars. The UI now consumes Capacitor SystemBars --safe-area-inset-* CSS variables, with browser env() fallbacks on all four edges. Page content starts below the status bar. On phones the bottom tab bar's total height includes the navigation inset while preserving its 68px tab area, and content/toasts reserve that same space. Side rails and dialogs also respect the available safe area.

The APK configuration explicitly enables SystemBars CSS inset handling and light system icons; a native-only forest-green strip behind the status icons keeps them legible. The native flag is applied only to the bundled HTML. No fixed status-bar or Android-navigation-bar pixel size is assumed. The build workflow now also runs for pushes changing app/build sources.

Source and build-preparation checks validate the configuration; device spacing, rotation and both gesture/three-button navigation require a new APK test. Reference: https://capacitorjs.com/docs/apis/system-bars .

## 0.2.6 Android camera and GPS
Gallery selection remains a separate original-file picker with local EXIF inspection. The packaged camera button explicitly calls the Capacitor Camera 8.0.0 native camera source; it no longer relies on WebView file-input capture support. A successful capture attaches the photo and requests fresh native device coordinates, displaying the reported accuracy. Old coordinates are cleared for a newly captured photo before requesting a fix, so failure cannot reuse an unrelated pin. Permission denial keeps the photo available for manual location entry. GPS results still respect editor/request versions and later manual edits. Native plugins are declared in package dependencies so Capacitor discovers and registers them during Android generation.

The browser uses its existing capture-input and geolocation fallbacks. Safe areas from 0.2.5 remain in place. Phone camera launch, permission dialogs and GPS need confirmation on a physical Android device. Camera output may be encoded by the native plugin; gallery bytes are preserved as supplied by Android (which may redact location metadata). Geotags are stored in the journal record. No location permission is requested for gallery-only selection. Activity-death recovery for an unsaved capture draft is not yet implemented.

## 0.2.7 reverse deck numbering
The memory deck now numbers each card as total minus its current index. With Latest visit sorting, the newest of two footprints is 02/02 and the older is 01/02. Heading, front/rear captions and accessible announcements agree. Sorting, swipes, local records and backup format are unchanged. Numbers remain relative to the displayed footprints after search/filtering, rather than permanent record identifiers.

## 0.2.8 native backup saving and transfer dialog
Replaced APK anchor-download export with an app-local Android Storage Access Framework plugin. Backups are validated/packed in the existing JSON v1 format, then saved through an explicit Save backup action and ACTION_CREATE_DOCUMENT. The bridge opens a new document, accepts bounded base64 byte chunks, checks the expected byte count, and confirms success only after the output stream closes. JS waits for each acknowledged write; its progress tracks actual transferred bytes. Cancel/write failure closes and attempts to delete the incomplete newly created document, never a prior journal record. Cleanup failure is visible. No broad storage access permission is added.

The shared dialog now retains the operation, filename, footprint being packed, counts, size, percentage, progress, cancellation and final result. Restore shows read/validation/commit progress while retaining preview and atomic merge. Closing/cancellation is blocked during final document closure or journal commit. Native builds with no save plugin report an error and never fall back to a WebView download. Web File System Access is used when available; plain browser downloads are accurately described as requested rather than confirmed saved.

51 automated checks cover prior features plus chunk fidelity, deferred completion, cancellation, disk/write failures, cleanup failures, browser paths, missing native support and dialog state. Native Android compilation is checked separately; system picker/provider behavior needs device testing. Existing APK data cannot be migrated by an incompatible-signature update. The optional USB helper preserves a raw debug-app journal archive without uninstalling it.

## 0.2.9 Export Photo
Replaced the detail dialog's individual-backup Export action with Export Photo. The action decodes the stored image data URL to a typed Blob without resizing, recompressing or adding overlays. Existing metadata and original bytes are retained; the journal's separate coordinates are not newly written into EXIF. Native saving now allows a strict filename/extension list for backups and supported photo types and selects the matching MIME type. Browser save filters also use the image's extension and MIME type. Sample illustrations and footprints with no photo disable this action.

Photo export opens the save picker directly, reusing cancellation, chunked writing, progress and confirmed completion. Whole-journal backups are unchanged. Tests cover real JPEG/PNG/WebP fixture bytes, GIF preservation, filenames, missing photos, browser picker options and photo-dialog routing.

## 0.3.0 multi-pin atlas
Replaced the single-place map iframe with a locally bundled Leaflet 1.9.4 atlas. All valid located footprints in the current search/category view appear together. Zero coordinates are retained, missing/invalid pairs are excluded from pins, and missing-location footprints stay actionable in the list. Pin activation opens the memory; list selection focuses and highlights the matching pin. Fit-all, selected directions, same-coordinate list access and shorter date-line bounds are included. Display longitude adjustments never change stored coordinates. Non-spatial edits preserve the viewport.

Map assets are vendored with Leaflet's BSD-2-Clause license; original Nth footprint icons avoid decoding every full-resolution photo just to draw pins. Sidebar thumbnails load lazily. Map initialization waits for located places, hidden/offline maps detach their tile layer, and destroyed maps detach listeners. Tile failure/connection status leaves saved places available. Background tiles use normal HTTP caching, visible attribution and an identifiable native user agent. This release had no offline-area feature; 0.3.9 adds bounded USGS packages while OSM remains online-only. The app shell cache includes only bundled same-origin assets. References: https://leafletjs.com/reference.html and https://operations.osmfoundation.org/policies/tiles/ .

The APK workflow also sets the Android version name from package.json and version code from the workflow run number. Permanent signing is not configured yet. The current remaining order is maintained in ROADMAP.md.


## 0.3.1 location tools and version history
A separate Leaflet dialog lets the user choose/correct the editor's draft location. The fixed pin targets the map center, supports tap, touch/keyboard pan and optional device GPS, and normalizes wrapped longitudes without changing unrelated record fields. Use this spot applies draft coordinates; only the normal footprint save writes IndexedDB. Closing/cancelling discards the selection. Empty drafts require an intentional map interaction or GPS fix before applying. Offline map backgrounds/error/retry behave as in the atlas, with no tile prefetch.

Nearest to me uses the existing native/browser device access boundary, then computes great-circle distances locally over the current filtered saved places. Missing-location entries stay editable below located ones. Clear distances restores the global sort order. The temporary origin is not persisted, no background GPS tracking is added, and this feature does not discover unsaved businesses or calculate driving routes. View cancellation and request tokens reject stale results; map selection similarly invalidates earlier device fixes.

The footer and dialog now say What's in this version? A chronological, oldest-first release list is sourced from releases.js, covers the known GitHub releases from 0.2.2 through 0.3.1, and marks the current release. Dates/descriptions are based on repository commits. Planned features remain separate. Signing is explicitly deferred at the user's request until testing ends.

80 automated checks cover existing features plus distances across zero/date line/antipodes, filter composition, missing positions, async permission/stale/cancel flows, map picking/offline/cleanup, draft application, linked list rendering, and release ordering/version consistency. Tests use fake map/DOM boundaries; physical Android and real map gesture/layout testing remain necessary.

## 0.3.2 Android widget; multiple photos queued

The native widget uses RemoteViews and private snapshot storage. It shows one latest-visited footprint and the journal count, updates after successful journal writes, and remains available while the app is stopped. It uses a 384 × 240 derived JPEG preview; original photos are unchanged. No GPS or network activity runs in the widget. Snapshot failure cannot roll back a committed journal. Pending widget actions wait for storage and open dialogs. A launcher pin request is not described as successful placement until the user completes the system prompt. Empty state, invalid/deleted shortcuts and preview failures have safe fallbacks. Native compilation and JS boundary checks do not replace launcher/device testing.

The user’s multi-photo specification is recorded in ROADMAP.md as next. Its placement is after the detail coordinates, with right-aligned upload, horizontal browsing of the top photo and persisted selection as the main card image. It is not implemented in this release.

Widget implementation reference: https://developer.android.com/develop/ui/views/appwidgets .

## 0.3.3 photo galleries

Additional uploads are placed after the detail coordinates, aligned right. Original photo arrays retain a selected cover index; the existing photo field is a derived selected-photo alias for journal/cards/widgets/export. Legacy single-photo records are supported without rewriting their media. The editor retains additional images while replacing or removing the selected photo. Gallery imports are atomic per batch and never automatically apply image GPS. Late/cancelled reads cannot attach to another detail page. Horizontal gestures leave vertical scrolling available; arrows, keyboard and thumbnails provide alternatives.

Rapid cover changes coalesce and persist in order. Other record/settings/restore changes use a serialized mutation queue so a cover write cannot overwrite a concurrent favorite or restore. Database failures roll back the viewed cover and report the error. Backups and photo exports wait for pending cover writes. Backup format 2 includes each gallery original once and the selected cover index; v1 backups remain readable and older apps reject v2. See BACKUP-FORMAT.md.

104 automated checks pass, including real photo-fixture byte round trips, malformed gallery rejection, legacy import, cover selection/export/widget coupling, pending-write export, queued concurrent changes, photo removal/replacement, cancelled uploads and horizontal gesture handling. HTML/assets and native bridge preparation are checked separately. No browser visual QA was possible because the local browser binary is unavailable; layout, Android multi-select file picking and gestures still need a phone test.

## 0.3.4 photo thumbnail map pins

The atlas now replaces its fallback pin face with a small square preview of the selected main photo. A local JPEG renderer creates 96 × 96 crops, shared with the widget renderer (whose existing 384 × 240 output remains unchanged). Photo bytes and backup format are untouched. Sources are restricted to supported local image data URLs; place titles stay in accessible attributes and never enter image HTML. Missing, malformed or failed images retain the original Nth footprint icon.

Preview work runs sequentially for visible pin coordinates. Map movement adds newly visible photos; a 48-entry LRU cache bounds retained derived images and removes filtered/deleted/changed source entries. Hide/filter/destroy abort active loads and reject stale completions. Failures are cached to avoid repeated original decode attempts until the source changes. No external image request or photo upload is introduced; offline local photo previews remain possible. Leaflet continues to manage the same spatial positions, short date-line arc, selection, filters, attribution and pin/list actions. Non-spatial updates preserve the viewport.

114 automated checks pass, including visible-area loading, sequential processing, selected-cover changes, cache eviction, stale/aborted results, failed previews, safe image sources, fixed-size cropping and actual atlas DOM-boundary wiring. Browser visual QA is still unavailable locally; native compilation and APK checks are separate from physical Android map testing.

## 0.3.5 original app icon

Original vector geometry combines the footprint identity with a photo frame and compass glint. Android resources include a full-bleed forest background and separate foreground on a 108 dp canvas, plus a dedicated monochrome stencil. The foreground and monochrome geometry fit within the central safe circle under tested masks. Android 26+ uses adaptive XML; Android 33+ adds the monochrome layer; five density buckets supply regular/round legacy PNGs. No HTC assets or stock Capacitor logo is used for the app’s resolved launcher icon.

The web manifest has regular 192/512 PNGs, maskable 192/512 PNGs with an opaque full-bleed background, and an SVG fallback. HTML adds a 32 px favicon and 180 px Apple touch icon. All are generated from native/icon-design.json with pinned Sharp 0.35.5 and committed for direct GitHub Pages hosting; the APK workflow regenerates them before bundling. The existing resource-copy step supplies native icons. The sidebar’s static version label was corrected to the current release. Journal media, backup format and photo-map behavior are unchanged.

114 behavior tests pass. Manual asset verification covers PNG dimensions, XML/manifest references, safe-zone geometry, opaque maskable backgrounds and rendered regular/round/themed previews at launcher sizes. Android compilation and packaged-icon checks are separate from physical launcher testing. Backward navigation shipped in 0.3.6. Reference: https://developer.android.com/develop/ui/compose/system/icon_design_adaptive .

## 0.3.6 backward navigation

Android Back uses the official Capacitor App 8.0.0 plugin and the same route stack as browser Back/Forward, dialog close controls and Escape. Nested dialogs, the draft pin picker, Edit-to-footprint return, secondary-tab-to-journal return and journal card restoration are included. Android root Back minimizes to the launcher. Rapid Back is ignored while a local transition is pending; browser traversals serialize asynchronous rendering. Forward reconstructs saved-record dialogs without replaying transfers, and prunes deleted record targets.

Editor snapshots track form values, favorite, gallery/cover, audio and pending camera/GPS/recording work. Leaving a dirty editor requires discard confirmation; closing its position picker does not discard it. Database saves and final backup/photo file or restore commits block departure. Other transfers request cancellation and keep the dialog until cancellation is safe. Browser unload prompts protect drafts and transfers where the browser permits them. Drafts were memory-only in this release; local recovery was subsequently added in 0.3.10.

129 Node behavior tests cover route unwinding/Forward, denial and bounce-back, rapid browser traversals, dirty drafts, save ordering, transfer guards, missing records, native listener wiring and widget launch errors, alongside existing feature checks. Device Back gestures, keyboard handling, native permission/file dialogs and launcher resume need physical testing. Reference: https://capacitorjs.com/docs/apis/app .

## 0.3.7 independent widget locations

Android widgets have independent persistent record selections, with Latest visit as the default. Each widget has Choose and New footprint controls. Choose focuses its row in Preferences, where the user selects a footprint and saves. Instance-specific PendingIntent URIs isolate photo, create and configuration actions. Removed footprints show a chooser placeholder, while other widgets retain their memories. Existing v0.3.2 snapshots remain usable.

Native selections use widget-ID keys in private preferences. onDeleted removes only affected selections; onRestored reads old selections before writing new IDs so overlapping restore IDs cannot overwrite one another. Per-widget RemoteViews updates avoid combining many bitmaps in one binder transaction. Mirrored records contain only latest plus currently selected footprints, with 384 × 240 JPEG previews capped at 200,000 encoded characters each. JavaScript creates previews sequentially, caches up to 32 sources, prunes unused entries and ignores superseded refreshes. Originals remain in the journal. Home-screen choices are not exported with journal backups.

142 checks pass. New checks cover independent targets, duplicate selections, cover changes, deletion/restore, selection races, failed refreshes, preference saves and launch deferral. The actual Java provider and plugin are compiled and run with small Android API fakes for separate content, click identity, persisted choices, deletion, provider recreation and restored-ID collisions. Real Android compilation and packaged-resource verification complement these checks; launcher layout, resizing, process restart, gestures and OS restore require physical testing. Reference: https://developer.android.com/develop/ui/views/appwidgets/advanced .

## 0.3.8 online location search

The draft map picker includes an address/named-business search form. Searches run only on explicit submit. Up to five validated GeoJSON Point results show escaped names and formatted addresses; selecting one previews it on the map. Use this spot writes coordinates to the editor draft and can fill empty name/address fields. Existing text is preserved, and moving away from the result clears its text association. Cancel/Back aborts search without touching the editor. Search does not request GPS or replace Nearest saved places.

Provider: Photon’s public demo, https://photon.komoot.io/api/ . Verified reasonable-use policy and API schema in the upstream documentation. The prototype uses no key or billing arrangement; a dedicated service is needed before high-volume distribution. The endpoint is centralized. Fetch uses omitted credentials, no referrer, no-store, redirect rejection and a 12-second deadline. A 1.5-second minimum request interval, HTTP 429/Retry-After cooldown, transient bounded cache and no automatic retries reduce service load. Responses are bounded to 256 KiB; malformed/out-of-range data is rejected. Stale, cancelled and timed-out responses cannot change current results. No public Nominatim endpoint is queried.

159 Node/Java checks pass. New tests cover normalization, deduplication, coordinate order, formatting, bounded fields, HTML escaping, empty/offline input, explicit requests, no location/media transmission, cache expiry/eviction, throttling, cancellation, late responses, timeout, service errors, body size, draft application, text preservation and moving/closing the pin picker. Two live service probes returned HTTP 200 and wildcard CORS; a real named-business response was processed by the app’s search controller. Native compilation/package verification is additional validation; phone and browser UI interactions need device testing. References: https://github.com/komoot/photon and https://github.com/komoot/photon/blob/master/docs/api-v1.md .

## 0.3.9 offline map areas

USGS Topo raster downloads and a separate Blob-based IndexedDB store support bounded packages around saved places. Areas commit only after their expected tile count is present; interrupted staging is removed on startup. Sequential paced requests, per-tile deadlines, image/size checks, storage limits and cancellation prevent uncontrolled downloads. Back blocks while cleanup or commit completes. Overlapping areas remain independent. Both Leaflet views share a local GridLayer: missing tiles hatch, Town tiles enlarge to Street zoom, stale results are ignored, and object URLs are revoked on unload. Opening a saved area takes precedence over pending automatic map fitting. Journal media and backup format are unchanged.

179 automated checks pass, including actual IndexedDB persistence/recreation and transactional failure paths. Chromium verified the phone-sized manager, completed download, local tile images, offline app reload and persisted area, cancellation and removal without page errors. Live USGS validation downloaded all 17 tiles for a Little Falls area (620,971 bytes). Android airplane-mode, process restart and storage behavior need device testing. Detailed offline coverage outside the United States remains queued.

## 0.3.10 editor recovery and Nth wordmark

Persisted recovery covers partial form input, favorite, photo galleries/cover, and completed voice attachments. Snapshot metadata reuses separately stored Blob media in the existing journal object store; typing does not rewrite photo bytes. Pre-camera and background checkpoints supplement 250 ms autosave. Save and matching draft cleanup share a journal transaction; closed-draft IDs prevent late writes from resurrecting saved/discarded work. Changed/deleted source footprints recover into a new record. Recovery remains local and outside backups.

App restored-camera results are associated with the startup capture token, persisted first as a descriptor and then copied into a Blob. Resume applies the photo with cleared coordinates; a late return offers an explicit action and preserves current editor text. Cancellation, duplicate events, failed reads and stale/discarded destinations preserve the existing draft/journal. Android must deliver the result; active recording/file reads remain unrecoverable. Larger journal media and streaming backup work is still queued.

Original Nth outline lettering replaces the dash in the icon, including an even-odd cutout for the Android themed variant. 204 automated checks and Chromium restart/resume/discard/camera/conflict scenarios pass. Physical Android process-death, camera return and launcher behavior need phone testing.

## 0.4.0 trips

Trips & journeys groups footprints without copying photos. Names/descriptions and explicit cover stop IDs live beside records in the same journal state; records retain journey IDs. Member selection is searchable, and a single footprint may belong to up to 20 journeys. Dates/stop order derive from footprint visit dates. Trip selection composes across Journal, Favorites and Map with search/categories/sort. Removing a journey retains the records/media and saves a deletion marker; removing a footprint or membership repairs covers. Metadata and membership writes share the serialized atomic journal transaction. Recovery drafts now include memberships and retain compatibility with previous drafts.

Full backup format 3 round trips trips, deletion markers, covers, memberships and originals. Earlier backup formats import as journals without trips. Restore keeps newer versions and reconciles deleted groups and unavailable covers. Up to 1,000 journey entries (including markers); original gallery/backup bounds remain. All ten ideas subsequently shipped across 0.4.0, 0.4.1 and 0.5.0; see docs/ROADMAP.md for current scope.

219 automated checks and mobile/desktop Chromium end-to-end trip checks passed, with no page errors. Physical Android trip/Back/restore testing remains necessary.

## 0.4.1 return visits

Existing place fields remain the initial visit; return entries add separate dates, ratings, notes, photo galleries/cover, audio, coordinates and journey IDs. Shared title/category/favorite/address/contact details retain one place identity. The detail selector switches visits without duplicating the map place; the editor supports new returns and specific existing visits. Journal cover selection is separate from the latest visit date, which drives sorting and widgets. Place pins use the original position with located-return fallback. Removing one visit keeps the others and leaves a deletion marker; the last active visit cannot be removed independently. Full place deletion remains explicit.

Trip dates/photos and note searches include only matching member visits when a trip is selected; place counts remain unique. The trip manager adds membership to the latest visit or removes it from all visits in that trip. Recovery metadata version 3 retains visit editor mode and accepts previous metadata; changed/deleted parents recover to new places. Backup format 4 stores originals once per visit and merges each visit using its own update/removal clock. Formats 1/2/3 import. A merge that would leave no active visits is rejected before persistence. Up to 200 entries per place including markers, 30 photos per visit, one completed audio note per visit, 20 journeys per visit and 150 MB total backup size.

242 automated checks pass. Phone/desktop Chromium, native-style restored-camera and changed-parent draft recovery, offline return saving/restart and fresh backup restore passed without page errors. Physical Android checks remain. The remaining eight features ship in 0.5.0.


## 0.5.0 journal suite

| Feature | Current behavior |
| --- | --- |
| On this day | Earlier-year same-month/day visits; optional home card, no scheduled notifications |
| Batch import | Local EXIF/date/GPS review, exact duplicate skipping, bounded 100 m/day groups or individual photos, new/return targets and atomic save |
| Timeline/calendar | Month/day and all-date visit browsing with query/trip filters and independent return visits |
| Exploration | Unique places, visits, photos, days, years and milestones; user country/region labels filter saved map pins |
| Tags | 30 tags per place and shared country/region labels; tag, journey, search and favorite filters compose |
| Geotagged copies | New upright JPEG up to 4,096 px with selected-visit GPS; original unchanged; original-photo export retained |
| Memory cards/books | PNG card or A4 image-page PDF, preview and explicit privacy choice default hidden, full paginated book stories and optional all photos |
| Nearby memories | Opt-in visible-app watch, 250/500/1,000 m, no trail/background alerts, 24-hour local cooldown, stop/pause/resume handling |
| Portability/recovery | Backup v5 accepts v1–v4; labels/preferences retained; recovery metadata v4 accepts v1–v3 |

Import limits: 60 files, 20 MB each, 30 photos per visit; no separate aggregate byte cap as of 0.8.3. Device storage/quota applies. Book limits: 100 visits, 300 pages, 80 MB; text is rasterized and font coverage follows the device. Cards indicate shortened text. PDF save uses the existing Android bounded-chunk document picker with the correct MIME type. Nearby consent/cooldowns, recovery drafts and offline maps stay outside journal backups. Labels are entered by the user, not inferred from boundaries. Original-photo metadata is not copied into cards/PDF images; titles/stories/photo pixels can still reveal locations.

272 automated checks pass. Combined phone/desktop browser tests cover all eight features, failed batch-write rollback/retry, read cancellation, label draft recovery, legacy/fresh backup restore, deletion protection and nearby lifecycle. Exported GPS is independently decoded; PDF pages are rendered and checked through the full long story. Physical Android checks remain.


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

## 0.6.5 — tags as the personal organizer

Removed saved collections throughout the application: toolbar selector, Journal tools tab/editor, rule evaluation, lifecycle draft state and restore merge controls. Tags, trips, favorites, search, timeline, exploration, nearby memories and reviewed photo batch import remain. Loading and restoring omit legacy saved-filter settings; new backups omit them too. Original footprints, return visits, labels, journeys and media remain unchanged. Old v1–v7 backups remain readable.

### Explicit one-footprint photo import — 0.6.6

The grouping dropdown offers “All selected photos in one footprint”: one shared review and one new footprint for up to 30 unique photos, regardless of missing GPS or differing dates. Its shared date/GPS start from the first detected values, or today/no location when absent. Per-group saved-place destinations and manual date-based grouping controls are hidden in this mode. Every included image is previewed; no photos are silently split or dropped. Switching modes reuses the selected original media; edited fields require confirmation before rebuilding. Existing duplicate skipping, atomic saves, cancellation and automatic GPS/date modes remain. Backup v7 and recovery v6 are unchanged; shell v33 refreshes the UI.

## 0.6.7 — aligned create and tag controls

Removed the visible Tag label row, retaining the screen-reader label. New footprint and the tag selector share a 44 px height; the existing responsive row, keyboard access and tag filtering remain. No data or backup changes.


## 0.6.8 — journal filters and location labels

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


## Places discovery centers and borderless controls (0.8.0)

- Submit the borderless Places search to Photon, then choose among up to five location suggestions with available town/state/country context. The italic hint reads “Search places, towns or street”. Typing alone does not send requests. Selecting a suggestion clears the local results text filter and uses the existing Geoapify discovery/cache pipeline with the selected group, subtype and radius.
- A temporary brass bullseye marks the discovery center separately from footprint listing pins and the radius circle. It follows searched, recalled, GPS and manually selected map areas; listing refreshes do not remove it.
- “Explore around here” closes the preview and searches around that listing with the same category, subtype and radius. It does not write to the journal.
- “Add to a trip” offers active journeys and opens a reviewable footprint draft with that journey checked. Existing sources use a new return-visit draft on the same place. Saving the draft commits membership through the existing journal transaction and recovery system. With no journeys, the preview explains where to create one.
- Buttons, dropdowns, file-picker controls and map zoom buttons have no borders. Selected controls retain background fills; chosen gallery thumbnails use a brass background. Keyboard focus uses an outline. Static explanatory hints use italic styling; live status/error text and stories keep their usual styles.
- Regression: six new Node checks cover discovery parameter preservation, exploration without writes, source/trip prefill, saved-source return visits, removed journeys, late description responses, editor draft capture and search-specific feedback. Browser QA uses mocked provider results and exercises the full new-place and return-visit save flows, search cancellation on tab change, mobile/desktop layouts and both themes. Live provider coverage and phone behavior remain device checks.


## Proximity search, capacity-based offline maps and aligned map tools (0.8.1)

Places Search invokes the existing device permission/fix flow only after an explicit valid online search. It accepts approximate permission, requests no new prompt for an existing grant, and can use a recent approximate fix. Permission-dialog pause/resume retains search intent while requests wait for the app to be visible. Editing the query, cancelling, changing area or leaving Places discards late location results. Denial leaves text search usable, with an existing discovery center as optional fallback. Approximate coordinates (three decimals) bias Photon’s documented lat/lon/zoom/location_bias_scale search; up to 20 normalized candidates are cached per query/bias cell, with five shown. Closest and name ordering are local and remain consistent with suggestion selection. Discovery still uses the chosen result as its category/radius center; listing distances identify the device and search center separately.

The offline-map database keeps existing downloads. App caps of 200 MB total, eight areas, 50 MB/package and 600 tiles/package are removed. Original area-size/detail choices, bounded per-image decoding, pacing, deadlines and cancellation remain. Actual database quota failures roll back only the new area. Startup cleanup reads keys instead of loading all tile blobs; retrieval uses a cursor rather than materializing every overlapping blob. Storage persistence is requested when supported.

USGS HTTP 404/204 tiles are unavailable coverage, not a complete-package failure. A partial package commits its exact saved count and bytes, requested count, missing count and highest available level; an all-missing package does not commit. 429/5xx, malformed images, timeouts and storage failures still clean staging. Overview fallback is bounded to eight enlarged levels and checks saved geographic bounds, including date-line crossings, so another region’s global tile cannot fill an unrelated location. View opens at an available level. The manager discloses limited detail and actual saved storage; worldwide detailed coverage is still a provider limitation.

Use my location and Refresh have matching 44 px heights and equal widths. Atlas tools use two aligned actions, with the downloaded-maps checkbox on its own row. Controls stay borderless; feature hints remain italic.

Primary references: https://github.com/komoot/photon/blob/master/docs/api-v1.md and https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer?f=pjson . Live “Dunkin donuts” search with bias at 42.5,-70.9 returned five Salem/Swampscott branches ordered by device distance (0.9–1.9 km). Live Moraine Lake check at 51.32,-116.18 saved 15 of 19 planned tiles (585,613 bytes, available through zoom 12), retained four missing-detail entries and reopened stored map data successfully. Browser QA covers location-biased requests, local sorting, new and return-visit trip drafts, equal action dimensions, toolbar layout, partial offline download and local viewing without a connection. Android permission dialogs, physical-device storage exhaustion and location quality still need phone validation.


## Compact map header (0.8.2)

The atlas header contains only the two existing map actions in one 44 px button row. Pin counts and the downloaded-maps checkbox move together into the footer above the map status/guidance. Footer items wrap on narrow screens and longer count labels; the checkbox retains a 44 px touch row. Existing IDs, counts, toggle behavior and retry handling remain. Ready-map explanatory guidance uses italic styling; loading/errors remain standard.

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

## Shipped in 0.10.0 — steps, widgets, ordering and care

Opt-in Android sensor counting uses a health foreground service, visible pause notification, persistent device ledger, goal and seven-day view. Four new resizable step/case widget variants supplement the photo widget, with saved case mirroring and independent page state. Reorder footprints supports long-press dragging and movement buttons; My order persists in backups. Journal care has 13 checks and explicit category review. Transparent artwork margins align trophy bases with the premium cabinet shelves. Hardware/background and launcher checks remain user device validation.


## Health Connect and trophies — 0.11.0

- Exploration → Today’s footsteps → Health Connect offers Connect, step source, Share FootPrints phone steps, Sync now, Manage access, Disconnect and an offline privacy explanation.
- Requests only READ_STEPS and, when sharing is chosen, WRITE_STEPS. Supports partial grants and revocation. Android 14+ uses built-in Health Connect; earlier compatible devices need its installed/up-to-date provider. The stable Jetpack client is pinned to 1.1.0. The APK minimum is Android 8.0 (API 26); Health Connect needs Android 9 or newer. No health history or background-read permission is requested.
- Combined source uses Health Connect’s aggregate API for today and six preceding days. It accounts for duplicate overlapping sources according to the user’s priorities. Sync runs on opening/returning to the foreground and about once a minute while Trips & journeys is open; widgets use the last cached date-specific count and show when it was refreshed. No wearable connection is made directly by FootPrints.
- Sharing exports only actual sensor intervals collected after sharing is enabled, with local start/end zone offsets and automatic phone metadata. A private SQLite queue combines minute samples, persists retries, and upserts stable installation/minute IDs with monotonically increasing count versions. New sensor values arriving during a write stay pending. The running pedometer checks writes once a minute and on pause; foreground Sync retries without tracking. No imported total, guessed historical timestamps, calories, weight, photos, journal text or GPS is exported. Existing 0.10.0 daily-only data is not backfilled because its real intervals were not saved.
- Lose It! can read shared steps after its own Health Connect step permission is enabled. Its sync timing and calorie calculations remain under Lose It!’s control; the complete cross-app flow requires phone testing.
- Step progress keeps each day’s best observed total once, never a sum of phone and connected counts. The goal target freezes with that day’s first positive observation. Earned step progress stays local and can survive a source change or disconnect; journal deletion does not change it. Disconnect revokes access and clears cached connected totals/pending exports, leaving already shared Health Connect records for the user to delete there if desired. Journal backups exclude step history; Android backup/device-transfer rules also exclude health preferences, derived widget snapshots and the export database.
- All visible Badges labels become Trophies while storage keys and widget deep links stay compatible. Existing 64 rules are unchanged; 20 attainable step milestones bring the collection to 84. Forty shelves support the expanded collection and saved placements.
- Native step widgets use brass progress rings, subtle illumination and source-aware status. Photo widget actions have no button backgrounds: equal-width Footprints count | Choose footprint | + New footprint, with slim vertical separators and stacked labels.

Implementation references: [Android setup](https://developer.android.com/health-and-fitness/health-connect/get-started), [step aggregation](https://developer.android.com/health-and-fitness/health-connect/aggregate-data), [write and retry guidance](https://developer.android.com/health-and-fitness/health-connect/write-data), [stable SDK](https://developer.android.com/jetpack/androidx/releases/health-connect), [Lose It! integration](https://loseit.zendesk.com/hc/en-us/articles/47650100219028-Using-Health-Connect-With-Lose-It).
