# Nth FootPrints

A personal travel journal by Nth Experience. Prototype **0.11.0**.

**Existing installed test APK:** keep it installed until its journal is secured. If the old 150 MB exporter fails, use the [phone-only rescue guide](docs/PHONE-RESCUE.md) before replacing differently signed builds.

**[Open Nth FootPrints](https://bdredenbach.github.io/Nth-FootPrints/)**

GitHub Pages serves this repository from `main` / root. The root entry page opens the app in `dist/`; all app resources and the service worker use paths relative to that directory.

Browse your memories in a vertically swipeable photo stack. Tap a photo to open its place details, notes, rating and voice recording.

## Included

- Contextual first-visit tutorial cards that highlight the actual controls in each area, remember dismissed tips and support reset/disable from Preferences.

- Places: borderless area search with contextual suggestions, selected-category/radius discovery, a center marker, Explore around here and source-aware trip visit drafts.
- Borderless controls and italic feature hints, with visible selected, disabled and focus states.
- Three tabs: Photo journal, Map & directions, and Places. Favorites remain available in Journal tools.
- Trips & journeys with Exploration, 84 Milestones, Journeys and a movable trophy case; covers, dates, stops and membership filtering remain available.
- Journal care finds unfinished visits for review and editing.
- Create, edit and delete footprints with an original photo, visit date, category, rating, notes, website and phone number.
- Keep return visits to one place, each with its own date, story, rating, photos, voice note, coordinates and trips.
- Record or attach a voice note.
- Preview and apply embedded photo GPS from supported JPEG, PNG and WebP files; optionally use the photo date.
- Take photo + locate, current-device GPS capture and manual coordinates.
- A multi-pin atlas for located footprints, search/category filters, pin-to-memory opening, fit-all and external directions.
- Search, category filters and sorting.
- Browser-local IndexedDB storage and app-shell caching.
- Portable app-specific `.nthbackup` export/restore for places, media and preferences. No KMZ.
- Original illustrated starter memories that clear automatically when you save a personal footprint; edited examples are kept.
- Backup & Restore and Preferences above search, with two appearance themes.


## Exploration, milestones and the trophy case — 0.9.0

Trips & journeys contains **Exploration**, **Milestones**, **Journeys** and **Trophies**. Exploration has a three-column summary: Places visited, States visited, Countries visited, Places revisited, Visits remembered, Photos, Days remembered, Stories kept and Journeys. Places are distinct saved footprints; revisited places have at least two active visits. States includes provinces and reviewed regions, grouped with their country. Country/region totals use saved labels, not live location or inferred travel. Journey progress requires an active journey with a saved visit.

**84 milestones in fourteen collections** cover distinct places (8), regions (6), countries (6), photos (8), visits with stories (6), revisited places (6), distinct remembered days (6), nonempty journeys (6), total visits (7) and visits with voice notes (5). Progress is recomputed from active saved entries; deleted visits and journeys do not contribute, and removing entries can relock a badge. Demo memories are excluded. There are no streaks or location monitoring for achievements. Step collections add accumulated steps (6), best daily total (5), active days with at least 1,000 steps (5), and days reaching the goal recorded with their first observed steps (4).

The badge case uses eight original transparent 512px WebP trophies, a responsive wood cabinet with three shelves per case, and up to 40 shelves for the full collection. Arrange case enables pointer/touch dragging and arrow-key movement. Width, height, position, shelf contact, shelf selection and facing controls adapt Reader’s decoration model; dimensions are constrained to fit a shelf. Choose smoked walnut, golden oak or forest lacquer and adjust cabinet lighting. Put away and redisplay earned badges; locked badges show progress. Save case persists validated numeric placement/preferences with the journal; unsaved changes are guarded and failed saves remain retryable. Journal backups include the layout. Restoring appearance/preferences controls whether incoming case settings replace the current case; old backups do not erase an existing case.

Journal tools has **On this day**, **Timeline**, **Journal care** and **Nearby memories**. Journal care finds exact active visits without stories, photos, coordinates, addresses, country/region labels or journey membership and opens the chosen visit for editing. It never fills or modifies entries automatically.

Shelf behavior was adapted from [Nth Reader](https://github.com/bdredenbach/Nth-Reader/tree/937acb3aa4b50f6ada1fef69981a55b2a5d23979), particularly `js/shelf.js` (`decorEl`, pointer drag) and `js/customize.js` (`itemControlsEl`, `sliderRow`). FootPrints retains its own storage, navigation and theme. See [badge artwork and generation prompts](docs/BADGE-ART.md).


## Steps, widgets and journal care — 0.10.0

- **Android step counter:** Exploration → Today’s footsteps → Start counting steps. Physical activity and notification permission are requested at this action, never at startup. The native step-counter sensor feeds a health foreground service with an ongoing notification and Pause tracking. No GPS trail, accelerometer guessing or imported historical steps. Daily counts, recorded lifetime total, goal and seven-day view are local to the device, outside journal backups. A new session rebases before counting, preventing paused or pre-activation steps from being added. Reboots/counter resets rebase safely; out-of-order sensor events are ignored. Resume in the app after system interruptions. Updates can lag while the hardware/system batches events.
- **Home-screen widgets:** Preferences has five styles: resizable photo, compact steps (2×2), wide steps (4×1), wide trophy case (4×2) and gallery case (4×4). Actual cells depend on the launcher; all resize. Multiple instances can coexist. Trophy widgets mirror the current earned/displayed case, geometry, facing, finish and lighting, with per-instance page state. They render from a small validated native snapshot and bundled WebPs, so they work without a running WebView or network. Step widgets read the native ledger, update while tracking and support platform refresh while paused. Widget taps open the correct counter, case or footprint. Widgets never enable tracking.
- **Manual journal order:** Journal tools → Reorder footprints. Hold a grip for 350 ms, drag and release; movement buttons support keyboard/accessibility use. Save order selects My order. It composes with filters and persists in journal preferences/backups without changing visit dates, stories, originals or update times. New entries appear after ranked ones. Restore appearance/preferences controls whether incoming order replaces the current order.
- **13 Journal care checks:** category review, story, photo, map pin, address, country, state/province, journey, tags, rating, voice note, website and phone. Missing optional details are prompts for review, not errors. Since categories cannot be empty, Other is offered for review until an editor save confirms or changes it. The optional shared categoryReviewed flag survives backups and return-visit edits.
- **Cabinet refinement:** visible artwork bases meet the contact plane using measured transparent margins. Saved contact/size/placement values remain intact. Cabinet bevels, subdued grain, illumination and brass plaques replace the previous floating presentation.

Native implementation follows [Android motion-sensor guidance](https://developer.android.com/develop/sensors-and-location/sensors/sensors_motion), [health foreground-service requirements](https://developer.android.com/develop/background-work/services/fgs/service-types#health), [notification permissions](https://developer.android.com/develop/ui/views/notifications/notification-permission) and [widget sizing](https://developer.android.com/develop/ui/views/appwidgets/layouts). Reader’s native bookshelf widget was inspected for its resize-aware Canvas/snapshot approach; FootPrints uses its own case renderer and permission-gated counter. Hardware/background counting and launcher appearance require a physical Android check.

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

Run `npm run test:large` for the real 2.28 GB archive/restore/native-verification regression.

Automated checks cover backup round trips, merge behavior, vertical gesture handling including capture changes from photo/caption targets, and geotag parsing. Phone camera/GPS behavior and visual animation still require device testing.

## Project layout

- `dist/`: the application and original assets; no build step required.
- `docs/FEATURE-INVENTORY.md`: reference evidence, implementation notes, limitations and roadmap.
- `docs/BACKUP-FORMAT.md`: the versioned portable backup contract.
- `tests/`: Node tests and small original, generated image fixtures.

The browser prototype and Android debug APK share the same journal UI. Download the latest successful Build Android APK artifact from GitHub Actions. USGS offline map areas are available in 0.3.9; worldwide detailed offline providers remain on the roadmap. Integrated navigation is skipped by user choice; Directions keeps its external map handoff. See docs/ROADMAP.md for the working queue. Geotags are saved with footprint records; original photo bytes are preserved.

HTC apps and videos were used as behavioral references. No HTC assets, application code, APKs or reference videos are included.

Android builds account for system status/navigation bars and display cutouts, with safe-area spacing around the app and its fixed bottom tabs. The APK workflow builds on changes to app or Android-build files as well as manual runs.

## Android photo capture (0.2.6)

The large photo area chooses an existing gallery image and reads available embedded GPS without substituting your current location. **Take photo + locate** opens the Android camera through Capacitor Camera 8.0.0, attaches the result, then requests a fresh device location through Geolocation 8.0.0. Allow camera and location access when prompted; precise location gives better results. Coordinates are stored in the footprint, not written into image EXIF. A failed location lookup keeps the photo and allows retry/manual entry; cancelling the camera preserves the previous draft.

Install the newly built APK for these native changes; refreshing GitHub Pages cannot update an installed APK. The browser retains its capture-input fallback, whose camera behavior depends on the browser. Android may discard the unsaved editor if it kills the app while the external camera is open; saved journal entries remain intact.

## Deck counter (0.2.7)

Deck numbers count down from the displayed footprint total in the current display order: with two footprints, the newest card shows 02/02 and the older card shows 01/02. The deck heading, card captions and screen-reader announcements use the same number. This changes display numbering only; visit dates, sort order and saved footprints are unchanged.

The current workflow uses each hosted runner's generated debug signing key. These test APKs cannot update an installed build signed by another runner. Export a .nthbackup before uninstalling, install the new APK, then restore the backup. A persistent, securely stored signing key is still needed for reliable updates.

## Backup save dialog (0.2.8)

Use **Backup & restore → Create backup → Save backup…**. Preparation shows the current footprint, count, file size and percentage. Android opens its system save-file picker; after you choose a destination, the app writes the backup in bounded chunks and confirms the completed filename. Cancellation and write errors keep your journal unchanged and attempt to remove an incomplete new document. If the storage provider refuses deletion, the dialog tells you to remove the incomplete file. Browser file-picker support is used when available; other browsers explicitly say a download was requested rather than claiming the file was saved.

Restore uses the same progress panel and retains the validation/merge preview before saving changes. The portable .nthbackup v1 format and original attached media are unchanged. Native save-file handling uses a local Capacitor BackupFiles plugin with Android ACTION_CREATE_DOCUMENT and no broad storage permission. Physical-device save/cancel/cloud-provider testing is still required.

**Existing test installations:** older APKs lack the save-file handler, and their discarded signing keys prevent updating them in place. Do not uninstall an existing journal before securing its data. A USB rescue helper is provided in tools/android-journal-rescue.py for a computer with Android platform tools; it makes a raw backup of the debug APK's IndexedDB files before any reinstall. This is a recovery archive, not a .nthbackup import file.

## Export Photo (0.2.9)

A footprint's detail button is now **Export Photo**. It opens the save picker for the attached image itself, retaining its original JPEG, PNG, WebP or GIF bytes and embedded metadata. The filename uses the place name and visit date. Footprints without an attached photo disable the action. Android uses the native document picker with an image MIME type; the website uses an image save picker or download. The progress dialog reports photo saving and cancellation. Full journal .nthbackup exports remain under Backup & restore. Footprint coordinates are not newly embedded in photo EXIF.

## Multi-pin atlas (0.3.0)

Map & directions displays all located footprints in the current search/category view. Tap a footprint pin to open its photo/details, or select a place in the list to focus its pin and reveal directions. Show all pins fits all displayed footprints again. Entries without coordinates stay in the list with an Add a location action. Pins at the same coordinates remain separate and can be selected through the list. Trips crossing the date line fit around the shorter longitude arc.

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

Search uses the Photon public demo at https://photon.komoot.io/api/ with OpenStreetMap data. Two live probes returned HTTP 200 with wildcard CORS, including a named-business response normalized by the app controller. The UI shows provider/data attribution and explains that queries are sent when Search is pressed. Requests omit credentials/referrers and never include journal records or media. Starting in 0.8.1, Places Search uses permission-based approximate device coordinates for location bias; the editor’s independent position search retains its existing no-bias behavior. No API key or billing account is configured.

This provider permits reasonable usage but gives no availability guarantee and may throttle or ban extensive traffic. The prototype uses explicit submission, five results, at least 1.5 seconds between network requests, Retry-After cooldown, no automatic retry, a 12-second timeout, and a transient ten-query/five-minute memory cache. Responses are bounded to 256 KiB. A dedicated Photon service or contracted provider is required before wider/high-volume distribution; the endpoint is centralized in dist/place-search.js. Public Nominatim endpoints are not queried. Business coverage depends on named places in OpenStreetMap and is not a complete business directory.

159 automated checks pass, covering requests, parsing/escaping, bad and empty responses, rate limits, caching, timeouts, cancellation, stale responses, draft-only previews and preserving existing text, alongside existing navigation/gallery/widget behavior. Live HTTP/CORS checks complement these tests; browser and physical Android keyboard/map/search interaction still need user testing. Offline USGS map areas shipped in 0.3.9; draft recovery shipped in 0.3.10; larger media libraries and streamed backups are next.

## Offline maps (0.3.9)

Open Map & directions → Offline maps, or Preferences → Offline maps. Choose a saved footprint with coordinates, a 4/10/20 km area, and Town or Street detail, then Download area. Progress shows tile count and actual size; Cancel removes incomplete tiles. View centers a saved area; Downloaded maps previews local data while connected. The atlas and position picker switch to saved USGS topographic tiles offline. Detailed coverage is U.S.-focused. Unavailable tiles are hatched; no online fallback runs in downloaded-map mode.

Starting in 0.8.1 there is no app-set total-byte, per-package-byte, tile-count or saved-area-count cap; actual app storage capacity determines when downloads must stop. Per-image validation and paced, cancellable transfers remain. Missing USGS detail is recorded as limited coverage while available map levels are saved. Remove deletes just that map package. Downloads stay on this device outside journal backups; uninstall/clear data removes them. Keep the app open during a download; interrupted packages are cleaned up at startup. Search and external directions still need a connection. No integrated routing or voice guidance is included.

179 Node/Java/IndexedDB checks pass. Chromium tests passed mobile layout, package save, local tile decode, offline shell reload, persisted maps, safe cancellation, and removal with no page errors. A complete 17-tile live USGS area downloaded and validated. Real Android airplane-mode/restart testing remains necessary. USGS data licensing/source details are in THIRD_PARTY_NOTICES.md.

## Recovery drafts and Nth icon (0.3.10)

Unfinished editor work is retained locally with field values, favorite, gallery/cover and completed audio attachments. Wait for “Draft saved on this device,” then an app restart can offer Resume editing or Discard draft. Untouched blank editors create no recovery item. Native camera launch first checkpoints the draft; returned Android camera results are handled through Capacitor App's restored-result listener. Recovered camera photos clear the old coordinates and ask for an explicit location choice. A result arriving after Resume is offered through Recover returned camera photo, without replacing newer text.

Journal Save and matching draft cleanup commit together. Failed saves retain recovery. Explicit discard removes the draft and its media. If the original record changed or disappeared, the recovered draft saves as a new footprint. Recovery uses local device storage outside backups; it cannot survive uninstall/clear-data or recreate an unfinished voice recording/file read or a camera image Android never returns. Larger saved-media libraries and streamed backups remain next.

The icon now reads Nth where the lower dash was, across Android and web variants. 204 automated checks pass plus Chromium recovery scenarios; physical Android camera/process-death and launcher testing remain necessary. Integrated navigation is skipped by user choice; Directions retains its external map handoff.

## Trips & journeys (0.4.0)

Use **Trips & journeys** above the journal to create a trip and select its saved footprints. Save the selection, choose any stop as the cover, and browse the trip or view its pins on the map. Dates follow the earliest and latest visit. The trip selector works across all three tabs and combines with the existing search/category filters. New footprints default to the selected trip; the editor also allows membership in several journeys. Deleting a journey keeps its footprints and photos.

Trip metadata and memberships save atomically. Full backups now use format 3 with original media, covers and trip deletion markers; format 1/2 backups still import. App versions before 0.4.0 reject format 3. Recovery drafts retain trip selections and can still read older drafts. Limits: 20 journeys per footprint and 1,000 journey entries including deletion markers. Existing media/backup limits apply.

All ten proposed journal features are shipped across 0.4.0, 0.4.1 and 0.5.0. See [the working queue](docs/ROADMAP.md) for scope, current status and the carried-forward media/backup and global offline-map work.

219 automated checks pass; mobile/desktop Chromium checked the complete trip workflow, restart recovery, fresh backup restore and removal without photo loss. Android device testing remains necessary.

## Return visits (0.4.1)

Open a footprint and tap **Log return visit**. Each visit keeps its own date, notes, rating, gallery, voice note, coordinates and trips. Choose a date from the visit selector to view or edit an earlier memory. Place name, category, favorite and contact details are shared. Use **Use this photo in journal** to choose a cover; latest-visit sorting and widgets keep the latest date. The map retains one place, anchored to its original coordinates or a located return when the original has no position. Directions can use the selected visit’s coordinates.

**Delete this visit** leaves the place and its other visits. At least one visit must remain; the separate Delete place control removes everything for that place. Journeys use only the visits assigned to them, with matching dates and photos; their counts remain unique places. Trip manager selection adds to the latest visit and removal clears that trip from all visits of the place.

Full backups now use format 4, preserving every original, visit selection and removal marker without duplicating gallery cover bytes. Formats 1/2/3 still import. Older apps reject format 4. Overlapping backups merge visits independently and respect newer edits/removals. Recovery drafts retain add-versus-edit visit mode and accept previous drafts; changed parents recover to new footprints. Limits are 200 visit entries including removal markers, 30 photos per visit, 20 journeys per visit and 150 MB per backup.

242 automated checks pass, with phone/desktop, native-style camera restart and offline browser checks. Physical Android testing remains necessary. The remaining eight features ship together in 0.5.0.


## Journal suite (0.5.0)

Brad requested the remaining eight ideas in one release. Open **Journal tools** from the toolbar or Preferences:

- **Memories:** earlier-year visits on this month/day, with an optional home card. No scheduled system notifications.
- **Timeline:** a month calendar or chronological visit list, with date/query/trip filters. Repeated visits stay separate.
- **Exploration (Trips & journeys):** places visited, states, countries, revisits, photos, days and years. Milestones and Trophies have their own pills. Country/region totals use the reviewed labels in a place's editor; tap a label to filter saved pins. Coordinates can suggest empty labels online; manual entries are preserved.
- **Nearby:** explicitly enable 250/500/1,000 m reminders for earlier visits. Permission is requested on enable. Checks stop when the app is hidden/paused and resume without prompting. There are no background alerts or recorded location trails. Per-place reminders have a 24-hour cooldown; consent and cooldowns stay on this device and never enter backups.

**Import photos** reads supported embedded date/GPS locally, skips exact original duplicates, and proposes groups only when embedded dates match and GPS points are within 100 m of the first photo (nearby) or match to five decimal places (same location). In automatic modes missing metadata stays separate and is shown for review. Choose “All selected photos in one footprint” to explicitly combine up to 30 unique photos with one shared name/date/location/story, even without GPS or with different dates; the first detected date/GPS are proposed for review and location is optional. This mode always creates one new footprint and hides per-group destinations. Individual-photo mode is also available. Changing grouping rebuilds selected photos locally without reading or selecting them again; edited review fields require confirmation before being reset. Review each date, per-photo GPS and new-place/return-visit target before one atomic save. Optional “Use the same location” assigns chosen reviewed coordinates to checked visits (including missing-GPS photos), grouping by reviewed date; dates stay separate, galleries split at 30, conflicting destinations/labels are rejected, and Undo restores the prior review. Stories and tags are combined; group titles follow the reference visit for its date or the first selected visit on other dates. Original media is unchanged; no current GPS is assigned to old photos. Limits: 60 files, 20 MB each, 30 photos per visit; no separate aggregate byte cap. Originals stage sequentially into the media database before one atomic final save. Total capacity depends on device free space and the WebView/browser storage quota. Reading can be cancelled; failed saves preserve the review and existing journal.

Add up to 30 personal tags plus country/region labels under **Tags & place labels** in the editor. Labels belong to the place and survive return visits, recovery and backup.

Visit details offer **Memory card** (PNG) and **Geotagged copy** (JPEG using that visit's coordinates). Trip details offer **Create PDF book**, including full paginated stories and optionally all matching visit photos. Prepare and preview before Save. Cards/PDFs default to hiding address/GPS; an area-only or exact-location choice is explicit. Titles, stories and visible photo content can still identify a place. Exports strip original image metadata; saved originals remain byte-for-byte unchanged. Geotagged JPEG copies bake in orientation, add the selected GPS, and limit the long edge to 4,096 px. The original **Export Photo** action still saves the original.

Books are A4 image pages, so story text is not searchable/selectable; glyph coverage follows device fonts. Limits: 100 visits, 300 pages, 80 MB. Cards visibly mark shortened stories; books keep full stories or fail before offering a partial file. Exports run locally and use the existing Android save dialog, now with PDF MIME support.

Full backups now use **format 5**, restore formats 1–4, and include labels and the memories preference. Theme/memories restore only when appearance is checked. Retired saved-filter settings in older files are ignored. Device nearby permission, recovery drafts and downloaded maps remain outside backups. Existing 150 MB backup and media storage limits apply.

272 automated checks pass, including actual Java save-plugin execution with Android fakes. Mobile/desktop Chromium checks cover legacy restore, all eight tools, labels after restart, failed-save retry, cancellation, privacy, local JPEG/PNG/PDF exports, nearby pause/resume and fresh format-5 restore. Physical Android testing remains necessary. Larger media/streamed backups, worldwide detailed offline map coverage and permanent signing remain as described in [the working queue](docs/ROADMAP.md).


## Streamlined controls and visit maps (0.5.1)

New footprint and Tag share the first row. Below search/trip/sort, the four utility buttons run left to right: Journal tools, Trips & journeys, Backup & restore, Preferences. Both rows fit narrow phones; all controls keep their existing actions.

Visit details remove the redundant Use this photo in journal shortcut and shared-fields help paragraph. Swipes/thumbnails still select the journal photo; Delete this visit remains. Located visits gain a small map below their coordinates. Tapping it closes the detail stack, clears filters that could exclude the place and opens Map & directions with that place selected, centered on the chosen visit's coordinates. Return visits can therefore open their own position; this changes only the map display. Missing-coordinate visits omit the preview.

The preview shares the atlas's online OpenStreetMap attribution and downloaded USGS tile policy. It loads only on screen, pauses when covered/hidden, and cleans up on visit changes or closure. It has no pan/zoom gestures; the button is keyboard accessible. Offline missing tiles remain hatched with a working map handoff. Backups and original place/visit data are unchanged.

275 automated checks pass, plus browser checks at 360/393/680/1280 px, selected initial/return-visit coordinates, nested navigation, overlay cleanup and offline restart/handoff. Physical Android testing remains necessary.


## Places discovery (0.6.0)

**Places** replaces Favorites in the bottom/side navigation and takes the folded-map icon. Map & directions now has a location-pin icon and continues to show your saved journal. **Saved favorites** remains available inside Journal tools. The old category bar is removed from journal, saved maps and favorites.

Places has **Food & Drink**, **Things to do**, **Shopping**, **Services** and **Other**. Expand Choose a type of place for the screenshot's 38 subcategories: restaurants, bars, coffee, brunch, dessert, takeout, delivery; parks, gyms, art, attractions, nightlife, live music, movies, museums, libraries; groceries, beauty supplies, car dealers, home/garden, apparel, shopping centers, electronics, sporting goods, convenience stores; hotels, ATMs, beauty salons, car rental/repair/wash, dry cleaning, charging, gas, hospitals/clinics, mail/shipping, parking and pharmacies. These depend on mapped tags; missing tags can omit a business from a narrow type. Other covers mapped miscellaneous amenities and historic places outside these groups.

The map initially centers on your latest located personal footprint without sending a lookup. Tap **Search this area**, use the single **Refresh** control, or explicitly **Use my location**. Location permission is requested only for that button. Changing a category/type or radius then requests that area; moving the map waits for Search this area. The map fits the selected 1/2/5 km search radius, with a visible boundary. Panning or zooming does not fetch listings. Approximate search centers are rounded to three decimals before sharing with the Overpass API service, and this is explained beside the controls. Searches never include journal stories, record IDs or photos. Pending location/search results are ignored after leaving, pausing or changing intent. The community endpoint is `https://overpass-api.de/api/interpreter`; its availability/coverage varies, and a dedicated service is required before wider distribution. There is no automatic provider failover.

Pins use the original footprint icon; no third-party photos are scraped. Results sort by straight-line distance from the search center, append 30 at a time as you scroll, and have a Load more button for keyboard access. One bounded query yields at most 600 candidates; busy-area truncation is disclosed. Narrow the type/area for more precise results. Named duplicate representations within 25 m and repeated OSM IDs are collapsed, and private/no-access or disused/abandoned places are omitted where tagged. Node coordinates or mapped area centers are used; area centers may not be entrances.

Tap a pin or list item for a blurred-backdrop footprint-style listing with mapped description, hours, cuisine, phone, website, map, source credit and Directions. **Save as footprint** opens a reviewable editor with name, new category, coordinates, address, phone/website and country/region when present. Your date defaults to today; no visit story, rating or photo is fabricated. Saving is explicit. The prefilled draft checkpoints immediately and recovers its source across restart. Existing saved source IDs offer Open saved footprint and Log return visit instead of silently creating duplicates. Existing unsourced places are never automatically merged by proximity.

Existing category labels remain intact in records/backups/recovery. New entries use the five new categories; an existing older category is retained as an option when editing that record. Portable backup **v6** accepts v1–v5 and adds a validated `placeSource` reference; older-labeled files cannot contain new source/category fields. Recovery metadata v5 reads v1–v4. Source credit survives edits/returns, backup/restore and appears on sourced cards/books. Originals remain unchanged.

Prototype lookup bounds: one active request, at least 3 seconds between starts, 45-second client/15-second query timeout, 2 MB response, 600 candidates, 30 in-memory result sets with 30-minute network freshness, and per-device/local-day caps of 50 successful searches, 100 actual attempts and 5 MB. Failed and cancelled requests do not spend the successful-search allowance; attempt/bandwidth protection and increasing failure backoff still apply. Returning to a loaded category restores its session cache even after freshness expires, until evicted; Refresh explicitly fetches updates. Complete broad queries also answer narrower types/radii locally. A failed refresh retains the previous results, which are labeled while another category loads. Legacy attempt metadata migrates without assuming it represents successful searches. Only day/success/attempt/byte budget metadata persists, outside backups; no search history/location trail is stored. No automatic retries after service failures. Cached results may still be browsed in-session offline; new lookups need internet. Offline reload retains saved footprints and downloaded maps, not discovery results.

286 automated checks pass, including category/query/normalization, unsafe metadata, cancellation, budgets, legacy backup compatibility and source recovery. Phone/desktop Chromium at 360/393/1280 px verifies explicit initial lookup, map/list agreement, scrolling, source-prefilled restart/save, saved-source recognition, favorites access, v6 backup and offline restart. Public NYC API checks returned HTTP 200 with CORS and real listings. Physical Android testing remains necessary.

References: https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL , https://wiki.openstreetmap.org/wiki/Map_features , https://dev.overpass-api.de/overpass-doc/en/preface/commons.html , https://www.openstreetmap.org/copyright .


### Places refinement (0.6.1)

One Refresh control replaces the saved-origin dropdown and lower retry link, and retries map tiles plus the current area. Map framing follows the selected radius; a circle makes that area visible. Loaded categories and complete group/subtype searches reuse the session cache; previous pins/listings remain labeled while a new category is pending or fails. The map’s zoom does not start external searches. Failed/cancelled lookups do not spend successful-search credit, while provider attempt/bandwidth limits and cooldowns remain.

290 automated checks pass. Phone/desktop Chromium covers initial framing, no automatic startup query, zoom without requests, category/subtype cache reuse, failed refresh retention, separate success/attempt accounting, offline cached switching, radius reuse and listing-to-editor prefill. Provider migration is not part of this build: Geoapify is the recommended candidate for a dedicated nearby search service, with an account/key and attributed data reuse; it still mainly uses OSM coverage.


### Geoapify Places (0.6.2)

Places now queries `https://api.geoapify.com/v2/places` using the owner-configured project key in `dist/places-config.js`. The owner authorized this client-visible key in the public web/APK source. No key entry is needed in the app. The key is sent in an `X-API-Key` header, outside request URLs and journal backups. Project restrictions/quotas apply across clients using that key; local device counters are not account-wide billing enforcement.

Explicit search sends a fixed category whitelist, rounded three-decimal area center, radius, proximity bias and limit. One bounded request loads at most 500 candidates; the list appends 30 at a time locally, with a busy-area notice at the cap. All five groups and 38 subtypes remain. Brunch, delivery, takeout and live music use mapped tags where the provider has no exact equivalent; no capability is invented. Provider categories supplement raw OSM tags and enriched address/contact/hours/country/region fields fill reviewable drafts. Missing fields remain empty. Other contains miscellaneous mapped categories outside the main four.

Overpass is no longer contacted for Places, and its old device allowance does not consume Geoapify search allowance. The new counter separately bounds 50 completed lookups, 100 actual attempts and 50 MB per local day; each response is at most 2 MB, with one active request, 3-second pacing, failure backoff, Retry-After and a 45-second timeout. These are app guardrails, not a guarantee about the provider’s credit accounting. Cached category switching, complete broad-to-narrow filtering, explicit refresh, previous-result retention, radius framing and no zoom-triggered requests remain. No automatic provider failover or retries.

Existing OSM node/way/relation IDs are retained, so places saved through Overpass are recognized. New source metadata retains Geoapify attribution (`via: geoapify`) and accepts a validated opaque Geoapify ID when no OSM reference is supplied. Source links use fixed hosts, never API request URLs. Required provider/data credits appear in discovery, saved details and sourced cards/books. Portable backup v7 imports v1–v6 and rejects Geoapify metadata in older-labeled files; recovery v6 reads v1–v5. No key is copied into recovery or backups. Directions still opens the external map app.

297 automated checks pass, including GeoJSON/category normalization, invalid metadata/URLs/IDs, authorization/quota errors, cache retention, legacy source recognition, source-credit recovery and old/new backup compatibility. Responsive browser regression checks cover cached categories, errors, offline session reuse, framing and editor prefill. Live public NYC fixtures returned HTTP 200 with actual listings; CORS preflight accepts the API-key header for the Android localhost origin.

Provider references: https://apidocs.geoapify.com/docs/places/ , https://www.geoapify.com/places-api/ , https://www.geoapify.com/pricing/ . Earlier sections describe historical releases; this section supersedes the Overpass Places provider/bounds.


### Saved Places searches (0.6.3)

Completed searches now persist in a separate `nth-places-searches` IndexedDB database. Places restores the last successful category/type/radius/area when reopened, without requesting GPS or contacting Geoapify. Expand **Saved searches** above the map to recall an older area. Results show the original last-updated time; **Refresh** explicitly requests new data. Saved results can be reused even when old or offline. Base-map availability remains independent and may require downloaded maps.

Up to 30 searches / 20 MB are retained, evicting least-recently-used entries when full. A failed or cancelled refresh never replaces a good snapshot. Clear saved searches removes discovery history only; it leaves footprints, original media, downloads and API budget counters intact. Storage failure retains usable session results and clearly identifies that they could not be kept for reopening. Searches remain local to this device, outside journal backups; clearing app storage or uninstalling removes them. The first search must be loaded once in this release; earlier in-memory pulls cannot be recovered from the old app.

Matching uses category, subtype, radius and area. A center shift of up to 100 m reuses the original saved circle, and the map/distance labels follow that original center. A complete larger circle may answer a fully covered smaller circle. Truncated broad results cannot substitute for missing subtype/area searches. Cache identity includes the local subtype, fixing a collision when two types use identical provider request bodies but different local filtering. Persistent rows are validated and sanitized before use; no API key or raw provider payload is stored. Attribution and source IDs remain intact. There is no timed eviction or automatic online refresh; the timestamp makes old listings clear.

306 automated checks pass. Browser checks at 360/393/1280 px verify cold restoration, recall of a simulated 40-day-old snapshot during an offline shell restart, small GPS drift without a lookup, switching saved categories, saving a source-prefilled footprint, clearing history without touching the journal/budget, and a subsequent explicit refresh. No backup schema change: portable v7 and recovery v6 remain. Shell v30 caches the new store module.

### Reviewed batch grouping (0.6.4)

Two automatic date/GPS modes, per-photo date and coordinate details, and explicit shared-location grouping with Undo. No backup schema change: portable v7 and recovery v6 remain. Shell v31 refreshes the import controls.

Validation for 0.6.4: 311 automated checks pass. Browser checks at 360, 393 and 1280 px cover strict grouping, per-photo coordinates, missing GPS, explicit shared-location merge and Undo, a failed save followed by correction, and unchanged original photos after saving.

### Tags without saved collections (0.6.5)

The collection selector, Journal tools tab/editor, saved-rule filtering and merge logic are removed. Tags, trips, favorites, search, exploration and the batch importer stay available. Old saved-filter settings are discarded on load/restore and omitted from new backups; a failed optional cleanup write leaves the journal usable and retries removal on the next normal save. Footprints, visits, tags, media and journey metadata are preserved. Portable backup v7 still imports v1–v7, and recovery metadata remains v6. Shell v32 refreshes the app.

Validation for 0.6.5: 308 automated checks pass. Browser checks at 360/393/1280 px cover loading old settings without changing records/media, tag/trip/map/favorites filters, all four Journal tools tabs, retained batch import, rejected backup recovery, v5 restore with appearance both off/on, new exports without retired settings and restart. A simulated cleanup quota failure leaves the journal usable; a later normal save completes the cleanup.

### One footprint for a photo batch (0.6.6)

“All selected photos in one footprint” groups the entire deduplicated batch into one new footprint, including photos with missing GPS or different dates. Review one shared set of fields and a strip showing every included photo. First detected photo date and GPS are proposals only; missing dates start as today and missing GPS stays empty. Limits: 30 unique photos per footprint; larger one-footprint requests stop with an explanation and never silently split or drop photos. Other automatic modes still require date/GPS matches. Changing the dropdown regroups the selected originals locally; edited fields are protected by a confirmation. Original files and backup/recovery schemas stay unchanged.

Validation for 0.6.6: 313 automated checks pass. Browser checks at 360/393/1280 px reproduce the six-photo/no-GPS report, save exactly one footprint with unchanged original bytes, verify no per-group destinations, regroup without rereading files, preserve edits when a regroup is cancelled, retry a failed save, and retain duplicate protection. Direct and regrouped 31-photo requests stop safely; 30 photos form one review. Existing strict/nearby/manual grouping and Undo checks also pass.

### Aligned journal controls (0.6.7)

The Tag heading is visually hidden while remaining accessible. New footprint and the tag dropdown share a 44 px height, aligning their top and bottom edges on phones and desktop. Shell v34 refreshes the layout; filtering and journal data are unchanged.

Browser validation for 0.6.7 at 320/360/393/684/1280 px confirms matching 44 px control heights and top/bottom edges, no visible Tag label row, retained accessible naming and keyboard order, working tag filtering and no row overflow.


### Journal filters and photo location labels (0.6.8)

New footprint, All tags and All footprints share the first row. Tag and footprint selectors have no permanent border; keyboard focus remains visible. Latest visit sorting sits alongside search, also borderless. Filters still compose and journeys remain available in All footprints.

The editor and batch review offer 249 pre-populated country/territory choices without a network dependency. United States offers 50 states, DC and five territories; Canada offers all 13 provinces/territories. Other countries use a region text field, and “Other / enter manually” preserves custom regions for the U.S./Canada. Existing custom/legacy country and region strings survive opening, draft recovery and saving. Changing the country explicitly clears its previous region.

Applying detected photo GPS, a chosen map/search point or fresh device location can fill empty country/state labels via Geoapify reverse geocoding. Located batch groups do the same. Review labels before saving. Manually entered labels are never replaced by a late result or a changed point. Fully automatic labels can follow a changed point during that editing session. The optional retry button uses the same cache. Lookup failures/offline mode do not block saving or manual choices.

Reverse lookup sends only the selected coordinates and configured key, not photos, filenames, stories or the journal. Requests are serialized at one per second with a 10-second timeout, a separate persistent 100-attempt daily safety cap, same-point in-flight deduplication and a 100-point local label cache. It does not spend the Places successful-search counter, though both use the project's provider credits. Closed/changed review groups cancel queued work before a request. Local lookup cache and counters remain outside portable backups; saved country/region strings remain inside them. Portable v7 and recovery v6 are unchanged. Shell v35 includes the two new offline modules.

Android image file inputs use the system Files/Documents chooser and request ACCESS_MEDIA_LOCATION on Android 10+. Grant it to permit embedded photo GPS when the source supports original media. Selected document URIs are converted to their equivalent MediaStore URI where supported and requested with setRequireOriginal; unreadable/unsupported originals fall back to the supplied selected copy. Camera capture, audio selection and backup file selection retain their existing paths. No broad gallery permission, image rewriting or substitution of today's device position is used. Shared/resized/cloud copies may lack GPS even when a gallery knows the original location; missing metadata cannot be reconstructed from those bytes. Choose an original local photo or assign the location manually.

Validation: 319 automated checks, including actual Java chooser/helper classes compiled against API boundary mocks, pass. Browser checks at 320/360/393/684/1280 px verify filter alignment, borderless controls and offline country/subdivision choices. Full flows cover photo GPS autofill, changed coordinates, manual/stale-response protection, offline labels, draft recovery, original-byte preservation in one-footprint batch import and located batch autofill. The Android workflow compiles against the real SDK; permission/provider behavior still needs testing on a physical phone.


### Enlarged photos — 0.6.9

Tap the two diagonal double-ended arrows in the corner of a saved footprint's photo or an editor's selected-photo preview. A full-screen view fits the complete original image without cropping. Pinch, double-tap, use the zoom controls or a mouse wheel to zoom up to 5×, then drag to inspect. Fit resets the view; previous/next buttons or horizontal swipes at fitted size browse that visit's photos locally. Enlarged browsing never changes the saved cover, attachment bytes, visit metadata or unfinished form fields. The button stays hidden when no real photo is attached.

Close, Escape, browser Back or Android Back returns to the parent footprint/editor; focus returns to the corner button. Browser Forward reconstructs the view from its parent. Arrow keys browse when fitted and pan while zoomed; +/− zoom and 0 fits. Controls respect device insets, viewport rotation and reduced screen sizes. The image reference and gesture state are cleared on close. No external image service or fullscreen permission is required; local photos work offline.

Validation: 322 automated checks pass. Browser checks at 360×800, 393×852, 1280×900 and 844×390 verify actual touch pinch, pan, double-tap, whole-image fitting, orientation changes, local gallery browsing, Back/Forward, focus return and unchanged originals/cover/editor fields. Additional checks cover offline viewing, safe-area insets and failed-image feedback. Portable backup v7 and recovery v6 remain unchanged; shell v36 caches the new viewer module.


## 0.7.0 — binary originals and streamed backups

Original photos/audio now live once in a dedicated content-addressed Blob store; journal records keep small references. Existing journals migrate atomically on first opening, with original bytes, visits, labels and choices retained. A failed migration leaves the legacy journal intact and offers an actionable message; metadata-only edits never rewrite existing media.

Create backup writes a ZIP64 archive directly in bounded chunks. Android uses 64-bit counters and confirms a closed, exact-length file only after reading it back for SHA-256 verification. Restore checks index/paths/CRC/media identities, stages attachments separately and publishes the merged journal atomically. Cancellation, failed storage writes and interrupted staging preserve the old journal. Legacy JSON v1–v7 and recovery v6 remain supported. Browsers with direct save pickers stream; download-only browsers have a bounded 128 MiB fallback. Existing individual-attachment limits remain 20 MiB.

The real capacity regression writes and restores 128 file-backed transport fixtures: 2,281,806,590 archive bytes / 2,281,701,376 original bytes, beyond the signed 32-bit boundary. Node runs with a 96 MiB heap; native Java ZIP64 read/CRC/SHA verification runs with 32 MiB. This proves transport and byte integrity in the test environment, not physical-phone timings. The workflow repeats this test before packaging.

Responsive browser checks at 360/393/1280 px cover migration, original photo viewing/export, archive saving, missing/reordered multi-part inputs, cold reload and binary draft recovery. The unchanged 0.6.9 bundle and a legacy database also exercise a read-only rescue: five forced small volumes restore successfully and leave the old database byte-identical. The Python helper's actual CDP/WebSocket transport passes against that old app context. Physical Android wireless pairing/document providers still need validation.

**Existing installed test APKs:** their signing certificates differ, so a new binary cannot simply update the old app in place. Do not uninstall its only journal copy. A compatibility rescue writes numbered parts through the old handler, and the new reader accepts them together. See [phone-only rescue steps](docs/PHONE-RESCUE.md). It requires a user-authorized local debugging connection; no journal data is uploaded. Private signing-key continuity remains a separate testing/release task.

## 0.8.0 — independent imports and place descriptions

A selected photo or archive slice is copied into an app-owned Blob before storage. This prevents a later original-file change or expired document permission from breaking photo reads and backups. Each attachment remains bounded to 20 MiB; whole journals are still streamed. Restoring the same complete backup overwrites its verified media keys, repairing 0.7.0 file-linked originals without duplicating footprints. Existing inaccessible copies require that restore; an update cannot recover bytes whose document access was already lost. Keep the manual backup until the corrected journal exports successfully.

Places request mapped descriptions only when opened, use exact provider/OSM identity to reject neighbouring coordinate results, cache available and unavailable descriptions on this device, and keep saving available offline or on lookup failure. A saved description becomes the editable story in the new footprint. Searches and description lookups have separate bounded budgets; no website scraping or generated descriptions are used.

## Photo import progress and larger batches (0.8.3)

Photo import now uses the same transfer-panel design as Backup: a progress bar, percentage, file count, current filename, processed size and cancellation. A ready screen leads into review; final saving is shown separately and cannot be interrupted midway. Photos stay on this device. The old 80 MB selection cap is removed, retaining 60 photos at 20 MiB each (up to 1.17 GiB by those limits), with 30 photos per visit. Larger journals can use repeated batches; there is no fixed app-wide media byte cap. Actual capacity depends on WebView/browser quota and device free space; the picker displays the reported storage allowance as an estimate, not guaranteed free space.

Each original is copied into binary media storage before the next photo is processed. Review scopes protect staged originals from other saves and restore cleanup. Cancellation, failed preparation, replaced reviews and discarded reviews release only their unused originals; published journal data remains intact. Final writes publish all reviewed visits atomically; a failed final write retains the review for retry. Duplicate matching uses content keys even if storage has refreshed a photo URL.

Validation: 362 automated checks, including a real 96 MiB batch through binary storage, scoped cleanup, cancellation and injected write failure. Browser checks cover a 96 MiB import/save, duplicate-only import, cancellation, storage failure and the transfer layout at 320/360/412/684/1280 px. These are desktop Chromium checks; device-specific capacity and Android performance still need physical-phone testing.

## Contextual first-visit tutorial (0.8.5)

The chapter-style introduction has been replaced with small coaching cards that appear when a user first reaches each area. The actual control is highlighted; each card explains that control while the current screen remains visible. Back/Next stays within that area’s short set of tips. Got it, Dismiss these tips and Android Back remember only that area. Returning to a dismissed area leaves it clear, including after app restart. There is no chapter selector or up-front full-app tour.

Separate introductions cover the journal, map, Places, footprint editor, detected photo GPS, details/visits, location picker, photo import, imported-visit review, journey list/detail, each Journal tools tab, offline maps, backups, exports, discovered-place preview, photo viewer and Preferences. New review/metadata/journey sections trigger when they become visible, including after asynchronous work. Transfer and permission work suppress unrelated tips. Coach placement follows the real target and respects viewport size, theme and safe-area insets.

After the first main-screen introduction is dismissed, a location explanation offers Allow location or Continue without location. Android requests permission without obtaining or storing a startup position; existing precise/approximate access is reused. Permission denial and disabled services retain retry/continue choices. Photo-location metadata remains separate, and original-photo GPS is never replaced by current device coordinates. Nearby memories remains its own opt-in.

Preferences offers Show tips when I visit a new area, Reset tutorial tips and explicit Location access. First-visit state is device-local and outside journal backups. The old chapter-guide completion flag does not suppress the new contextual introductions. Blocked local storage still remembers dismissals for the running session.

Validation: 376 automated checks pass. Browser flows cover first/repeat visits, per-area persistence, disable/reset, native Back/history forward, permission choices, photo GPS, individual tool tabs, import review, photo viewer, offline maps, backup and asynchronous journey creation. Coaching cards fit 320/360/412/684/1280 px in both themes, including a 320 × 568 screen and simulated Android safe-area insets. Android permission/provider behavior still needs physical-phone testing.

## Address and story from a chosen spot (0.9.0)

Find or choose a location → Use this spot now fills a blank Address or area from a manually selected/adjusted map pin, including when no search result is selected. Selected search results can also fill a blank name/address immediately. A matched mapped place description can fill The story when available. The picker’s checked text option covers name, address and story and is available for both search selections and manual pins. Unchecking it keeps text fields untouched. Country/state labeling retains its existing separate lookup.

Reverse address lookup uses Geoapify, with bounded responses, timeout, a short request queue, per-session caching and a daily request safety budget. Photon results retain validated OpenStreetMap identities and mapped descriptions. Description lookup uses a Geoapify place ID or exact OSM ID, and validates returned identity before copying text. A manual pin may supply a story only when reverse lookup identifies a named mapped amenity within 10 m, or a named containing building with zero reported distance. Streets, distant neighbours and unidentified points do not lend their stories. There is no invented biography or generic web-page scraping.

Lookups run in the background; status identifies pending or unavailable details. Review the address and story before saving. Existing authored text remains intact. Each field has edit/version protection, including explicit clearing and programmatic changes. A newer chosen location can replace or clear only earlier untouched automatic text. Coordinates, editor session, save state and request generation guard late replies, so closing, changing or saving a draft cannot update another footprint. Automatic values use the normal draft/save path.

Validation: 388 automated checks pass. Full browser editor flows verify manual-pin and selected-place filling, saved values, exact-identity requests, rejection of a neighbour’s description, typing during lookup, cancellation/new-draft protection, lookup failure retaining coordinates and opting out. API responses are mocked for deterministic browser checks; live address/description coverage varies by place and connection.


## Health Connect and trophies — 0.11.0

- Exploration → Today’s footsteps → Health Connect offers Connect, step source, Share FootPrints phone steps, Sync now, Manage access, Disconnect and an offline privacy explanation.
- Requests only READ_STEPS and, when sharing is chosen, WRITE_STEPS. Supports partial grants and revocation. Android 14+ uses built-in Health Connect; earlier compatible devices need its installed/up-to-date provider. The stable Jetpack client is pinned to 1.1.0. No health history or background-read permission is requested.
- Combined source uses Health Connect’s aggregate API for today and six preceding days. It accounts for duplicate overlapping sources according to the user’s priorities. Sync runs on opening/returning to the foreground and about once a minute while Trips & journeys is open; widgets use the last cached date-specific count and show when it was refreshed. No wearable connection is made directly by FootPrints.
- Sharing exports only actual sensor intervals collected after sharing is enabled, with local start/end zone offsets and automatic phone metadata. A private SQLite queue combines minute samples, persists retries, and upserts stable installation/minute IDs with monotonically increasing count versions. New sensor values arriving during a write stay pending. The running pedometer checks writes once a minute and on pause; foreground Sync retries without tracking. No imported total, guessed historical timestamps, calories, weight, photos, journal text or GPS is exported. Existing 0.10.0 daily-only data is not backfilled because its real intervals were not saved.
- Lose It! can read shared steps after its own Health Connect step permission is enabled. Its sync timing and calorie calculations remain under Lose It!’s control; the complete cross-app flow requires phone testing.
- Step progress keeps each day’s best observed total once, never a sum of phone and connected counts. The goal target freezes with that day’s first positive observation. Earned step progress stays local and can survive a source change or disconnect; journal deletion does not change it. Disconnect revokes access and clears cached connected totals/pending exports, leaving already shared Health Connect records for the user to delete there if desired. Journal backups exclude step history; Android backup/device-transfer rules also exclude health preferences, derived widget snapshots and the export database.
- All visible Badges labels become Trophies while storage keys and widget deep links stay compatible. Existing 64 rules are unchanged; 20 attainable step milestones bring the collection to 84. Forty shelves support the expanded collection and saved placements.
- Native step widgets use brass progress rings, subtle illumination and source-aware status. Photo widget actions have no button backgrounds: equal-width Footprints count | Choose footprint | + New footprint, with slim vertical separators and stacked labels.

Implementation references: [Android setup](https://developer.android.com/health-and-fitness/health-connect/get-started), [step aggregation](https://developer.android.com/health-and-fitness/health-connect/aggregate-data), [write and retry guidance](https://developer.android.com/health-and-fitness/health-connect/write-data), [stable SDK](https://developer.android.com/jetpack/androidx/releases/health-connect), [Lose It! integration](https://loseit.zendesk.com/hc/en-us/articles/47650100219028-Using-Health-Connect-With-Lose-It).
