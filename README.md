# Nth FootPrints

A personal travel journal by Nth Experience. Prototype **0.3.9**.

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

The browser prototype and Android debug APK share the same journal UI. Download the latest successful Build Android APK artifact from GitHub Actions. USGS offline map areas are available in 0.3.9; worldwide detailed offline providers and integrated turn-by-turn navigation remain on the roadmap. See docs/ROADMAP.md for the working queue. Geotags are saved with footprint records; original photo bytes are preserved.

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

The Leaflet library, styles and original footprint icons are bundled locally. Map background tiles need internet and carry visible OpenStreetMap attribution. Offline or failed tiles leave your saved pins and place list available. The online OpenStreetMap service is never used for offline download jobs; 0.3.9 adds separate explicit USGS downloads. Tile requests occur only while the map is visible; ordinary browser HTTP caching is respected. Android's user agent identifies Nth FootPrints. The APK version name now follows package.json, and its version code follows the workflow run number. Persistent signing is deferred until testing is finished.

114 automated checks pass, including coordinate/date-line handling, marker selection/filtering, hidden/offline behavior, tile failures and cleanup. Real Leaflet touch/layout/provider behavior still needs phone testing. Third-party notices are in THIRD_PARTY_NOTICES.md.

## Location tools and version history (0.3.1)

In the footprint editor, **Choose on map** opens a separate draft position picker. Pan beneath the fixed pin, tap a spot, or center on current GPS. **Use this spot** copies coordinates to the editor; **Save footprint** is still required to persist them. Cancel leaves the draft coordinates unchanged. Manual coordinate entry and photo GPS remain available.

In Map & directions, **Nearest to me** requests a current position and sorts the filtered saved-place list by straight-line distance. Places without coordinates remain available for editing. **Clear distances** restores the selected visit/name/rating order. This is local distance calculation, not online business discovery or routing; current GPS is held in memory only. Late GPS results cannot replace a newer manual selection or affect a closed picker/view.

**What’s in this version?** now opens a compact release history from 0.2.2 to the current version, oldest first, with shipped features and a separate list of planned work. Release data lives in dist/releases.js.

## Android home-screen widget (0.3.2)

In the APK, open **Preferences → Add home-screen widget**, or long-press your home screen and choose **Widgets → Nth FootPrints**. The widget shows your latest visited footprint and journal count. Tap the image/title to open that footprint, or **New footprint** to open a new editor. Save/delete/restore refresh it; Preferences also has a manual refresh. All widget copies show the same latest visit. A small derived preview is stored privately for the launcher; original photos, coordinates and backups are unchanged. Widget shortcuts wait until open dialogs close to avoid losing drafts. The website has no Android widget controls.

## Multiple photos per footprint (0.3.3)

Open a footprint and find **Upload more photos** below the coordinates, aligned to the right. Select JPG, PNG, WebP or GIF photos. Swipe left/right over the large photo, use its arrows, or choose a thumbnail; the viewed photo is saved as the main journal image and appears in Favorites and the widget. Additional imports leave the location and visit date unchanged. In Edit, choose a thumbnail to replace/remove that photo without losing the others. Export Photo saves the selected original. Up to 30 photos per footprint and 20 MB each; backups retain the 150 MB total limit.

New `.nthbackup` files use format version 2 so all gallery images and the selected cover survive transfer. Version 1 backups still restore. Older app releases reject version 2 files. The archive includes each original image once, without recompression.

Independent widget locations shipped in 0.3.7. See docs/ROADMAP.md.

## Photo map pins (0.3.4)

Map pins now show each footprint’s selected main photo in a small square. Tap to open its memory; the footprint icon remains for places with no usable photo. Pins refresh when the main photo changes. Local 96 × 96 previews are generated one at a time for visible pins and cached within a fixed limit, leaving original photos and backups intact. Filters, selected outlines, same-location list access and directions remain available. The map background still requires internet; previews use local attached photos.

114 automated checks pass. Android map appearance, touch interaction and photo rendering still need device testing. Backward navigation shipped in 0.3.6.

## Original app icon (0.3.5)

The app now has its own icon: a brass footprint inside a warm-paper instant-photo frame on forest green, with a small compass glint. Android includes adaptive color and monochrome themed variants, round/legacy density assets, and matching browser/PWA/Apple touch icons. Launcher shape and wallpaper tint are controlled by Android and your launcher.

Source artwork is native/icon-design.json. After installing development dependencies, run npm run icons to regenerate both Android and web assets. The Android workflow runs this step automatically before bundling and copies the icon resources with the existing native resource preparation. The generated Capacitor launcher icons are replaced by the Nth assets.

114 automated behavior checks pass. Icon verification checks legacy sizes, XML references, opaque maskable backgrounds and foreground/monochrome safe-area bounds; color and themed masks were visually inspected. Physical launcher appearance and icon cache refresh remain to be tested.

## Backward navigation (0.3.6)

Android Back, browser Back/Forward, Escape and dialog close controls share the same history. Back dismisses the top dialog or map pin picker first. Editing keeps the footprint beneath it; Save or Back returns to that footprint. Leaving Map or Favorites returns to the journal and its prior card. Back at the journal minimizes the Android app to the home screen. Switching secondary tabs replaces the secondary history entry.

Unsaved editor changes require confirmation before discarding. Back waits during a footprint save or the final file/database commit of a transfer, and requests safe cancellation during cancellable transfers. Browser history can reopen saved footprints and clean editor drafts; deleted history targets show a message. Forward never repeats a backup export or restore. The browser reload/close prompt protects active drafts/transfers when supported. Unsaved drafts are not persisted across process destruction.

129 automated checks cover navigation history, nested dialogs, repeated Back, dirty drafts, asynchronous saves, transfer protections and existing gallery/map/widget behavior. Android compilation and package checks complement these; physical Back gestures, keyboard dismissal, browser dialogs and launcher resume still need device testing. Independent widget locations shipped in 0.3.7.

## Independent widget locations (0.3.7)

Add multiple Android home-screen widgets. Tap **Choose** on each widget, select a saved footprint in Preferences, and tap **Save choice**. That widget is highlighted in the list. Each instance keeps its own choice; **Latest visit** remains available and is the default for new and existing unconfigured widgets. Tap the widget photo to open that memory, or **New footprint** to create another. You can also manage every instance under Preferences and use Refresh widgets after adding or removing widgets.

Selections are stored by Android widget ID in private native preferences and survive app/provider recreation. Android restore remaps old widget IDs to new IDs. Deleting an instance removes only its choice. Deleting a pinned footprint leaves a placeholder asking for another choice, without silently showing another location; restoring the same footprint ID makes it available again. Choices are device home-screen settings and are not part of the portable journal backup.

Only latest and explicitly pinned records receive derived native photo previews. Preview work is sequential and reused through a 32-entry cache; every RemoteViews update contains one bounded image for one widget. Save, delete, restore and cover changes refresh the snapshots. Configure shortcuts wait behind editors/transfers and can focus Preferences when it is already open.

142 automated checks pass, including execution of the real Java provider and plugin against Android API fakes to check per-instance content, tap targets, persistence, deletion and restore-ID collisions. APK compilation/package checks are additional validation. Physical home-screen layout, resize, process restart and launcher restore still require device testing. Address and named-business search shipped in 0.3.9.

## Address and business search (0.3.9)

In New footprint or Edit, open **Find or choose a location**. Enter an address or a business/place name plus its town or city, then tap **Search**. Choose one of up to five results to preview the pin; check its location and tap **Use this spot**. **Fill empty name and address fields** is optional and never replaces existing text. Save the footprint normally to keep the change. Moving the pin away clears the result’s name/address association. Cancel or Back leaves the editor unchanged.

Search uses the Photon public demo at https://photon.komoot.io/api/ with OpenStreetMap data. Two live probes returned HTTP 200 with wildcard CORS, including a named-business response normalized by the app controller. The UI shows provider/data attribution and explains that queries are sent when Search is pressed. Requests omit credentials/referrers and do not include GPS coordinates, journal records or media. No API key or billing account is configured.

This provider permits reasonable usage but gives no availability guarantee and may throttle or ban extensive traffic. The prototype uses explicit submission, five results, at least 1.5 seconds between network requests, Retry-After cooldown, no automatic retry, a 12-second timeout, and a transient ten-query/five-minute memory cache. Responses are bounded to 256 KiB. A dedicated Photon service or contracted provider is required before wider/high-volume distribution; the endpoint is centralized in dist/place-search.js. Public Nominatim endpoints are not queried. Business coverage depends on named places in OpenStreetMap and is not a complete business directory.

159 automated checks pass, covering requests, parsing/escaping, bad and empty responses, rate limits, caching, timeouts, cancellation, stale responses, draft-only previews and preserving existing text, alongside existing navigation/gallery/widget behavior. Live HTTP/CORS checks complement these tests; browser and physical Android keyboard/map/search interaction still need user testing. Offline USGS map areas shipped in 0.3.9; integrated navigation is next.

## Offline maps (0.3.9)

Open Map & directions → Offline maps, or Preferences → Offline maps. Choose a saved footprint with coordinates, a 4/10/20 km area, and Town or Street detail, then Download area. Progress shows tile count and actual size; Cancel removes incomplete tiles. View centers a saved area; Downloaded maps previews local data while connected. The atlas and position picker switch to saved USGS topographic tiles offline. Detailed coverage is U.S.-focused. Unavailable tiles are hatched; no online fallback runs in downloaded-map mode.

Limits are 8 areas, 600 tiles and 50 MB per area, and 200 MB total. Remove deletes just that map package. Downloads stay on this device outside journal backups; uninstall/clear data removes them. Keep the app open during a download; interrupted packages are cleaned up at startup. Search and external directions still need a connection. No integrated routing or voice guidance is included.

179 Node/Java/IndexedDB checks pass. Chromium tests passed mobile layout, package save, local tile decode, offline shell reload, persisted maps, safe cancellation, and removal with no page errors. A complete 17-tile live USGS area downloaded and validated. Real Android airplane-mode/restart testing remains necessary. USGS data licensing/source details are in THIRD_PARTY_NOTICES.md.
