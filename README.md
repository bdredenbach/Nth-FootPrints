# Nth FootPrints

A personal travel journal by Nth Experience. Prototype **0.3.0**.

**[Open Nth FootPrints](https://bdredenbach.github.io/Nth-FootPrints/)**

GitHub Pages serves this repository from `main` / root. The root entry page opens the app in `dist/`; all app resources and the service worker use paths relative to that directory.

Browse your memories in a vertically swipeable photo stack. Tap a photo to open its place details, notes, rating and voice recording.

## Included

- Three tabs: Photo Journal, Map & Directions, and Favorites.
- Create, edit and delete footprints with an original photo, visit date, category, rating, notes, website and phone number.
- Record or attach a voice note.
- Preview and apply embedded photo GPS from supported JPEG, PNG and WebP files; optionally use the photo date.
- Take photo + locate, current-device GPS capture and manual coordinates.
- A multi-pin atlas for located footprints, search/category filters, pin-to-memory opening, fit-all and external directions.
- Search, category filters and sorting.
- Browser-local IndexedDB storage and app-shell caching.
- Portable app-specific `.nthbackup` export/restore for places, media and preferences. No KMZ.
- Original illustrated starter memories that clear automatically when you save a personal footprint; edited examples are kept.
- Backup & Restore and Preferences above search, with two appearance themes.

## Run locally

The browser application uses static ES modules with a locally bundled Leaflet 1.9.4 map library; it does not load JavaScript from a CDN. The APK workflow installs the pinned Capacitor camera/location plugins and bundles their bridge. Serve `dist/` over localhost or HTTPS, for example:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. Camera, microphone, geolocation and installation support depend on the browser and permissions. Data is local to the browser/origin; export a backup before changing devices or clearing browser storage.

## Checks

Node.js 20+:

```sh
npm test
```

Automated checks cover backup round trips, merge behavior, vertical gesture handling including capture changes from photo/caption targets, and geotag parsing. Phone camera/GPS behavior and visual animation still require device testing.

## Project layout

- `dist/`: the application and original assets; no build step required.
- `docs/FEATURE-INVENTORY.md`: reference evidence, implementation notes, limitations and roadmap.
- `docs/BACKUP-FORMAT.md`: the versioned portable backup contract.
- `tests/`: Node tests and small original, generated image fixtures.

The browser prototype and Android debug APK share the same journal UI. Download the latest successful Build Android APK artifact from GitHub Actions. Native widgets, nearby search, downloadable offline maps and integrated turn-by-turn navigation remain on the roadmap. See docs/ROADMAP.md for the working queue. Geotags are saved with footprint records; original photo bytes are preserved.

HTC apps and videos were used as behavioral references. No HTC assets, application code, APKs or reference videos are included.

Android builds account for system status/navigation bars and display cutouts, with safe-area spacing around the app and its fixed bottom tabs. The APK workflow builds on changes to app or Android-build files as well as manual runs.

## Android photo capture (0.2.6)

The large photo area chooses an existing gallery image and reads available embedded GPS without substituting your current location. **Take photo + locate** opens the Android camera through Capacitor Camera 8.0.0, attaches the result, then requests a fresh device location through Geolocation 8.0.0. Allow camera and location access when prompted; precise location gives better results. Coordinates are stored in the footprint, not written into image EXIF. A failed location lookup keeps the photo and allows retry/manual entry; cancelling the camera preserves the previous draft.

Install the newly built APK for these native changes; refreshing GitHub Pages cannot update an installed APK. The browser retains its capture-input fallback, whose camera behavior depends on the browser. Android may discard the unsaved editor if it kills the app while the external camera is open; saved journal entries remain intact.

## Deck counter (0.2.7)

Deck numbers count down from the collection total in the current display order: with two footprints, the newest card shows 02/02 and the older card shows 01/02. The deck heading, card captions and screen-reader announcements use the same number. This changes display numbering only; visit dates, sort order and saved footprints are unchanged.

The current workflow uses each hosted runner's generated debug signing key. These test APKs cannot update an installed build signed by another runner. Export a .nthbackup before uninstalling, install the new APK, then restore the backup. A persistent, securely stored signing key is still needed for reliable updates.

## Backup save dialog (0.2.8)

Use **Backup & restore → Create backup → Save backup…**. Preparation shows the current footprint, count, file size and percentage. Android opens its system save-file picker; after you choose a destination, the app writes the backup in bounded chunks and confirms the completed filename. Cancellation and write errors keep your journal unchanged and attempt to remove an incomplete new document. If the storage provider refuses deletion, the dialog tells you to remove the incomplete file. Browser file-picker support is used when available; other browsers explicitly say a download was requested rather than claiming the file was saved.

Restore uses the same progress panel and retains the validation/merge preview before saving changes. The portable .nthbackup v1 format and original attached media are unchanged. Native save-file handling uses a local Capacitor BackupFiles plugin with Android ACTION_CREATE_DOCUMENT and no broad storage permission. Physical-device save/cancel/cloud-provider testing is still required.

**Existing test installations:** older APKs lack the save-file handler, and their discarded signing keys prevent updating them in place. Do not uninstall an existing journal before securing its data. A USB rescue helper is provided in tools/android-journal-rescue.py for a computer with Android platform tools; it makes a raw backup of the debug APK's IndexedDB files before any reinstall. This is a recovery archive, not a .nthbackup import file.

## Export Photo (0.2.9)

A footprint's detail button is now **Export Photo**. It opens the save picker for the attached image itself, retaining its original JPEG, PNG, WebP or GIF bytes and embedded metadata. The filename uses the place name and visit date. Footprints without an attached photo disable the action. Android uses the native document picker with an image MIME type; the website uses an image save picker or download. The progress dialog reports photo saving and cancellation. Full journal .nthbackup exports remain under Backup & restore. Footprint coordinates are not newly embedded in photo EXIF.

## Multi-pin atlas (0.3.0)

Map & directions displays all located footprints in the current search/category view. Tap a footprint pin to open its photo/details, or select a place in the list to focus its pin and reveal directions. Show all pins fits the collection again. Entries without coordinates stay in the list with an Add a location action. Pins at the same coordinates remain separate and can be selected through the list. Trips crossing the date line fit around the shorter longitude arc.

The Leaflet library, styles and original footprint icons are bundled locally. Map background tiles need internet and carry visible OpenStreetMap attribution. Offline or failed tiles leave your saved pins and place list available. There are no offline map downloads or tile prefetch jobs. Tile requests occur only while the map is visible; ordinary browser HTTP caching is respected. Android's user agent identifies Nth FootPrints. The APK version name now follows package.json, and its version code follows the workflow run number. Persistent signing is still the next update-safety task.

67 automated checks pass, including coordinate/date-line handling, marker selection/filtering, hidden/offline behavior, tile failures and cleanup. Real Leaflet touch/layout/provider behavior still needs phone testing. Third-party notices are in THIRD_PARTY_NOTICES.md.
