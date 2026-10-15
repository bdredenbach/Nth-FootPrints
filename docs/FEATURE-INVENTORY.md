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
| Journal persistence | IndexedDB on the current browser/origin; browser clearance removes data |
| App shell caching | Service worker; full offline installation/auth behavior not verified |
| Back Up Journal / Restore Journal | Implemented, app-specific .nthbackup v2; v1 imports supported |
| Individual photo export | Export Photo saves original JPEG, PNG, WebP or GIF; full journal backups remain in Backup & restore |
| Theme | Warm paper / Evening ink |
| Native Android test package | Implemented with Capacitor 8; persistent signing remains to do |
| Android home-screen widget | Implemented in 0.3.2; latest-visit preview, open-memory and new-footprint shortcuts; physical launcher testing pending |
| Nearby place/address search | Planned; provider selection required |
| Downloadable offline maps, integrated routing, turn-by-turn, voice guidance | Planned; provider/data/licensing and implementation needed |
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

Map assets are vendored with Leaflet's BSD-2-Clause license; original Nth footprint icons avoid decoding every full-resolution photo just to draw pins. Sidebar thumbnails load lazily. Map initialization waits for located places, hidden/offline maps detach their tile layer, and destroyed maps detach listeners. Tile failure/connection status leaves saved places available. Background tiles use normal HTTP caching, visible attribution and an identifiable native user agent. No bulk download, tile prefetch or offline-area feature is implemented. The app shell cache includes only bundled same-origin assets. References: https://leafletjs.com/reference.html and https://operations.osmfoundation.org/policies/tiles/ .

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

114 behavior tests pass. Manual asset verification covers PNG dimensions, XML/manifest references, safe-zone geometry, opaque maskable backgrounds and rendered regular/round/themed previews at launcher sizes. Android compilation and packaged-icon checks are separate from physical launcher testing. Backward navigation is next. Reference: https://developer.android.com/develop/ui/compose/system/icon_design_adaptive .
