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
| Photo Journal | Vertical full-collection stack with search/category filters; descriptions open with the memory |
| Journal filters, favorites, six categories, text search and sorting | Implemented across the journal and map views |
| Create/edit/delete with date, rating, address, notes, phone, website | Implemented |
| Original photo gallery per place | Implemented in 0.3.3, up to 30 photos, 20 MB each; persisted main image, horizontal browsing and per-photo export |
| One voice note per place, recording or audio upload | Implemented, requires browser microphone support/permission, 20 MB limit |
| GPS capture and manual coordinates | Implemented, requires location permission for capture; Take photo + locate pairs a new camera attachment with a fresh location fix |
| Photo geotagging | Read embedded GPS from JPEG/PNG/WebP EXIF; preview and explicitly apply coordinates; optional original visit date; re-read existing saved photos |
| Multi-pin atlas | Implemented in 0.3.0; photo thumbnails added in 0.3.4; fit-all, pin-to-memory, list selection, filters, missing-location entries and external directions |
| Directions | External Google Maps destination link, not integrated navigation |
| Local editor recovery | Shipped in 0.3.10: text, gallery/cover, favorite and completed audio drafts, plus matching returned Android camera photos; Resume/Discard after restart |
| Trips & journeys | Shipped in 0.4.0: multi-journey membership, chosen cover, automatic dates, chronological stops, trip filters/map, atomic persistence and backups |
| Journal persistence | IndexedDB on the current browser/origin; browser clearance removes data |
| Offline map areas | Shipped in 0.3.9: USGS topographic areas, detailed U.S. coverage, progress/cancel/removal, local atlas and picker rendering |
| App shell caching | Service worker; full offline installation/auth behavior not verified |
| Back Up Journal / Restore Journal | Implemented, app-specific .nthbackup v3; v1 and v2 imports supported |
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

Media bytes are kept in base64 data URLs without recompression. This first implementation has a 150 MB backup limit, 20 MB per attachment, and loads the journal in memory. A native file-based media store and streaming archive exporter are required before claiming large collection support. Browser media codec playback varies by platform.

## Validation
Node syntax checks, HTML asset/ID checks and domain tests cover backup round-trip including exact attachment bytes, invalid/incompatible data rejection, revision merge rules, repeated restore, and search/filter/sort. 114 Node tests pass across data, gestures, metadata, native export orchestration and map-controller logic. GPS fixtures are original generated JPEG/PNG/WebP files whose metadata was independently checked using Pillow. Tests include hemisphere signs, zero coordinates, little/big byte order, malformed offsets, invalid rational denominators, missing GPS, media preservation and geotag backup round trips. No browser-control skill is available in this environment; no browser visual QA, direct device testing, live tile-loading test or PWA installation test has been performed here. Map controller tests use a fake Leaflet/DOM boundary, without fetching public tiles. Deployment success is checked separately.

## Geotagging behavior
Photo metadata is read locally. The location preview provides coordinates and an optional external map link; no map request occurs until the user opens it. Existing editor coordinates and the date are unchanged until the user applies the photo location. Original photo date is separately opt-in. Missing or malformed metadata never defaults to the current location. The camera action is explicitly labeled Take photo + locate and requests a fresh device location after a successful attachment. A location error keeps the photo and lets the user enter coordinates manually. Pending location results cannot overwrite later manual edits, an applied photo geotag or another editing session. Save waits for active location requests to finish or for the user to enter coordinates manually.

Geotags belong to the footprint record and survive backups; the app does not rewrite EXIF into the original photo. GIF and HEIC GPS reading, XMP-only location tags, reverse-geocoded addresses remain outside this step; map pin placement was added in 0.3.1. Metadata references: [ExifTool GPS tag documentation](https://exiftool.org/TagNames/GPS.html) and [Library of Congress EXIF format description](https://wwws.loc.gov/preservation/digital/formats/fdd/fdd000618.shtml).

## 0.2.1 gallery correction
The supplied 218917.mp4 screen recording (~13.6 seconds) was sampled at twelve points to inspect the reported distinction between swiping directly on cards and in surrounding space. The event handler treated a bubbled lostpointercapture from a touched child as the deck losing capture. It now cancels only when the deck itself is the event target. Regression tests first reproduced the failure on photo/caption targets while surrounding-space gestures succeeded, then passed after this change. Up/down swipes, genuine capture cancellation and tap-to-open are covered. Phone/browser reproduction of the finished correction remains to be checked.

Removed the gallery's entire place-detail preview panel and centered the journal stack. Place descriptions and voice-note playback now appear only in the opened memory dialog; titles, dates and the collection counter remain on the cards. Saved notes and other data are unchanged.

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
The memory deck now numbers each card as total minus its current index. With Latest visit sorting, the newest of two footprints is 02/02 and the older is 01/02. Heading, front/rear captions and accessible announcements agree. Sorting, swipes, local records and backup format are unchanged. Numbers remain relative to the displayed collection after search/filtering, rather than permanent record identifiers.

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

## 0.4.0 trip collections

Trips & journeys groups footprints without copying photos. Names/descriptions and explicit cover stop IDs live beside records in the same journal state; records retain journey IDs. Member selection is searchable, and a single footprint may belong to up to 20 journeys. Dates/stop order derive from footprint visit dates. Trip selection composes across Journal, Favorites and Map with search/categories/sort. Removing a journey retains the records/media and saves a deletion marker; removing a footprint or membership repairs covers. Metadata and membership writes share the serialized atomic journal transaction. Recovery drafts now include memberships and retain compatibility with previous drafts.

Full backup format 3 round trips trips, deletion markers, covers, memberships and originals. Earlier backup formats import as journals without trips. Restore keeps newer versions and reconciles deleted groups and unavailable covers. Up to 1,000 journey entries (including markers); original gallery/backup bounds remain. All ten new ideas are approved; the remaining nine are queued in docs/ROADMAP.md, beginning with return visits. They are not yet implemented.

218 automated checks and mobile/desktop Chromium end-to-end trip checks passed, with no page errors. Physical Android trip/Back/restore testing remains necessary.
