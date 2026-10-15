# Nth FootPrints — prototype update, 0.2

## Product direction
An original Nth Experience travel journal inspired by the functional ideas of HTC Footprints and HTC Locations. Warm paper, forest-green navigation, brass accents, original illustrated sample memories, layered photo cards. No HTC code or artwork is included in the app. Android is the intended eventual packaged platform; this first build is a private browser prototype of the UI and data flows, not an APK.

## Reference evidence
The supplied HtcFootprints.apk.zip and HtcFootprintsWidget.apk.zip are APK containers (356 and 77 archive entries respectively). Inspected filenames/layouts include camera capture, detail/edit screens, media panels, voice-record dialog, search, sorting, map display, import/export, navigation, phone and URL controls, categories and favorites. File names indicate intended controls; they do not prove complete runtime behavior.

Initially, twenty evenly spaced frames were inspected from each supplied video, not a complete frame-by-frame audit. For the vertical-stack update, a further 24 frames between 8.8 and 11.8 seconds in 218915.mp4 were inspected to study the front card lifting and tipping away as the next card is revealed. 218911.mp4 (~135 s) shows the Android app/widget and capture flow. 218912.mp4 (~134 s) shows a list, ratings/categories/date, place details, coordinates and map interactions. 218915.mp4 (~31 s) shows a Windows Mobile variant with a layered photo deck, card transition, details and an audio playback row. These versions are treated as separate references rather than assumed to be identical releases.

A separate HTC Locations APK/manual/video is not supplied. Claims of complete feature parity are deferred until that inventory is established.

## First prototype
| Capability | Status |
|---|---|
| Instant-photo deck with vertical swipe, mouse drag/wheel and Up/Down keys | Implemented, 3D lift-and-tip transition with reduced-motion fallback |
| All Places | Stationary, viewport-fitted full-collection stack; no grid, search/filter toolbar or detail panel on this page |
| Journal filters, favorites, six categories, text search and sorting | Implemented; All Places always includes the full collection |
| Create/edit/delete with date, rating, address, notes, phone, website | Implemented |
| One original photo attachment per place | Implemented, 20 MB limit |
| One voice note per place, recording or audio upload | Implemented, requires browser microphone support/permission, 20 MB limit |
| GPS capture and manual coordinates | Implemented, requires location permission for capture; Take photo + locate pairs a new camera attachment with a fresh location fix |
| Photo geotagging | Read embedded GPS from JPEG/PNG/WebP EXIF; preview and explicitly apply coordinates; optional original visit date; re-read existing saved photos |
| Individual coordinate map | OpenStreetMap embedded map, needs network |
| Directions | External Google Maps destination link, not integrated navigation |
| Journal persistence | IndexedDB on the current browser/origin; browser clearance removes data |
| App shell caching | Service worker; full offline installation/auth behavior not verified |
| Back Up Journal / Restore Journal | Implemented, app-specific .nthbackup v1 |
| Individual memory export | Implemented, same .nthbackup format |
| Theme | Warm paper / Evening ink |
| Native Android package, widget | Planned |
| Full multi-pin atlas, nearby place search | Planned |
| Downloadable offline maps, integrated routing, turn-by-turn, voice guidance | Planned; provider/data/licensing and implementation needed |
| KMZ import/export | Omitted at user request |

## Prototype boundaries
The original SVG examples and their notes are explicitly labeled samples. Users can remove untouched samples without removing their own places or edited samples. No reverse geocoding, embedded EXIF writing, cloud sync, account system, map tile downloads or routing engine is implemented. Photos and voice notes remain local to the journal unless the user exports them. Opening an external map sends the selected coordinates to that map service. The private prototype is owner-only through Sites hosting.

Media bytes are kept in base64 data URLs without recompression. This first implementation has a 150 MB backup limit, 20 MB per attachment, and loads the journal in memory. A native file-based media store and streaming archive exporter are required before claiming large collection support. Browser media codec playback varies by platform.

## Validation
Node syntax checks, HTML asset/ID checks and domain tests cover backup round-trip including exact attachment bytes, invalid/incompatible data rejection, revision merge rules, repeated restore, and search/filter/sort. Nineteen tests pass across backup/data, gesture control and photo metadata. GPS fixtures are original generated JPEG/PNG/WebP files whose metadata was independently checked using Pillow. Tests include hemisphere signs, zero coordinates, little/big byte order, malformed offsets, invalid rational denominators, missing GPS, media preservation and geotag backup round trips. No browser-control skill is available in this environment; no browser visual QA, device testing, microphone/GPS testing, map loading test or PWA installation test has been performed. Deployment success is checked separately.

## Geotagging behavior
Photo metadata is read locally. The location preview provides coordinates and an optional external map link; no map request occurs until the user opens it. Existing editor coordinates and the date are unchanged until the user applies the photo location. Original photo date is separately opt-in. Missing or malformed metadata never defaults to the current location. The camera action is explicitly labeled Take photo + locate and requests a fresh device location after a successful attachment. A location error keeps the photo and lets the user enter coordinates manually. Pending location results cannot overwrite later manual edits, an applied photo geotag or another editing session. Save waits for active location requests to finish or for the user to enter coordinates manually.

Geotags belong to the footprint record and survive backups; the app does not rewrite EXIF into the original photo. GIF and HEIC GPS reading, XMP-only location tags, reverse-geocoded addresses and map pin placement remain outside this step. Metadata references: [ExifTool GPS tag documentation](https://exiftool.org/TagNames/GPS.html) and [Library of Congress EXIF format description](https://wwws.loc.gov/preservation/digital/formats/fdd/fdd000618.shtml).

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
