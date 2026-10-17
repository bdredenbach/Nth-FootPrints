# Nth FootPrints streamed archive v1 / legacy journal schema v7

**Backup & restore → Create backup → Save backup…** now saves a ZIP64 STORE archive with the `.nthbackup` extension. The first entry is `nth-footprints-backup.json`; `media/<identity>.bin` entries contain exact original image/audio bytes, without recompression or base64 expansion. Each unique content/type identity occurs once. Export Photo, geotagged copies, cards and PDF books remain separate exports.

The index identifies `app: "nth-footprints"`, `archiveVersion: 1`, a `journal` object using the existing `formatVersion: 7` metadata, and `media` rows `{key, path, type, size}`. Journal attachment fields contain `nth-media:<64 hexadecimal characters>` references. Identity is SHA-256 over MIME type plus the SHA-256 hex digest of the original bytes. This binds both bytes and MIME. The ZIP CRC checks physical entry contents independently. Derived cover aliases are omitted; gallery order and cover indexes remain metadata.

ZIP64 local and central records use 64-bit sizes/offsets with known lengths and CRC values. No data descriptor or full-archive buffer is needed. Entries stream in 192 KiB acknowledged writes; the small central directory is emitted last. Android counts bytes with `long`, closes the stream, then reopens the actual destination for bounded SHA-256 verification. Completion requires both exact length and matching digest. Browser direct file writers stream the same archive and confirm only after close. Browsers without a direct save picker retain a bounded 128 MiB download fallback; larger exports explain the supported Android/desktop route rather than buffering a multi-gigabyte Blob.

Legacy JSON remains app-specific UTF-8 JSON with `app: "nth-footprints"` and `formatVersion` 1–7. Its original 150 MiB input bound remains because that path parses the whole string. Old apps cannot read archive v1 even though the extension remains `.nthbackup`; the updated app identifies archives from their bytes.

Place records contain stable IDs and shared title, category, favorite, address, phone, HTTP(S) website, optional tags/country/region and update clock. The original top-level date, rating, notes, paired GPS, photos/coverIndex, completed audio and trip memberships form the first visit. Additional `visits` have stable independent IDs, timestamps and their own visit fields. Lightweight removed-visit markers prevent older backups reviving them. At least one active visit must remain. A journal-photo reference can choose a surviving visit/photo. Derived photo aliases are omitted so original media are stored once per visit. Legacy single-photo records remain readable.

Journeys retain title, description, cover and independent update/removal clocks. Membership belongs to visits; removing a journey retains all places and media.

## Compatibility

The current reader accepts archive v1 and legacy JSON versions 1–7. Version 1 is single-photo, 2 adds galleries, 3 journeys, 4 return visits 5 labels/memories and retired saved-filter settings 6 new place categories/source references, and 7 Geoapify source attribution. Fields requiring a newer schema are rejected in older-labeled files instead of silently discarded. For the older installed debug APKs with different signing certificates, follow PHONE-RESCUE.md before replacement; do not uninstall the only journal copy.

## Restore and save behavior

The index validates before preview: app/version, unique IDs, dates/clocks, categories, media, paired finite GPS ranges, bounded labels, visit references and safe URLs. Preview reports new/newer/current places. During archive restore each media entry is CRC-checked and identity-checked, staged in the binary store, then committed records are published in one transaction. Staged media never replaces the visible journal early. Cancellation/failure removes unpublished media; startup collects interrupted staging. Active staging is protected from unrelated metadata-save collection. Shared place fields and visits merge by their separate clocks; journey metadata merges independently. Deleted journeys/visits are not revived by older backups. A merge removing every visit is rejected. Unavailable covers/memberships are repaired. Whole-place deletion still has no tombstone, so an older backup can restore a deleted place.

The appearance checkbox restores theme and memories preference; unchecked keeps current appearance. Nearby permission/cooldowns, widget choices, recovery drafts and downloaded maps never enter backups. Backups contain unencrypted private stories/media/GPS.

Changes serialize through one journal queue and commit together in IndexedDB. Errors preserve previous state and recovery. Preparation can cancel; a started commit cannot. Batch import validates all reviewed groups before one write and retains review on failure. Android files save through the document picker in bounded acknowledged chunks; completion follows stream closure. Cancel/failure attempts incomplete-file cleanup and reports cleanup failure. PDF/image/backup MIME types match filenames; no broad storage permission is added.

## Bounds

No 150 MiB aggregate limit for streamed archives. File sizes must be exact safe JavaScript integers; actual capacity depends on storage/provider limits. Current real capacity regression writes/restores 2,281,806,590 archive bytes containing 2,281,701,376 original-media bytes, then checks them with Android-compatible Java ZIP64/CRC and SHA-256 routines under a 32 MiB heap. This is transport/byte-integrity coverage, not a physical-phone performance claim. Metadata index and central directory each have a 32 MiB bound; at most 100,000 original-media entries. Existing record bounds remain: 10,000 imported places, 200 visit entries per place including markers, 30 photos per visit, 20 journeys per visit, 1,000 journey entries. Each place allows 30 tags of 40 characters, country 80 and region 100. Individual attachment upload limit is 20 MB. Supported photos: JPG/PNG/WebP/GIF. Batch import allows 60 files at 20 MiB each, with no separate aggregate byte cap as of 0.8.3. Originals stage sequentially into the media store under independent review scopes; discarded/failed reviews clean unused media, while one final atomic journal transaction publishes the reviewed visits. Actual total storage depends on device free space and browser/WebView quota. Local IndexedDB v2 separates `journal` metadata and content-addressed `media` Blobs. Legacy migration is atomic and idempotent; a failed migration preserves the complete old state and permits a rescue export. Existing-media bytes are not rewritten for metadata-only edits. Recovery drafts remain v6 and retain their separate Blob records. Missing published media stops loading instead of silently dropping attachments. No cross-app compatibility is claimed.


## Place discovery source (v6)

Optional shared-place `placeSource` is `{ "provider":"openstreetmap", "type":"node|way|relation", "id":"positive numeric ID" }`. Only those provider/type values and bounded numeric strings are allowed; source URLs are constructed against openstreetmap.org. The source belongs to the place, not each visit, and survives edits, returns and restore. New categories are Food & Drink, Things to do, Shopping, Services and Other. Older Travel/Nature/Dining/Culture/Everyday values remain valid for existing records and recovery; no category migration rewrites the journal. Earlier-labeled backups cannot contain new categories or source references. Discovery result caches, provider budgets and area choices are outside backups.


## Geoapify place attribution (v7)

OSM sources may add `"via":"geoapify"` without changing provider/type/id identity. When no OSM identity is supplied, `{ "provider":"geoapify", "id":"bounded hexadecimal place ID" }` preserves the provider identity. Credits are generated from this validated metadata and retained in saved details and sourced card/book exports. The `via` value is restricted to geoapify, source URLs use fixed attribution/source hosts, and older-labeled backups reject Geoapify metadata. Version 6 sources without `via` remain accepted. The API key and request budget are outside backups and recovery drafts; editor recovery metadata v6 retains the new source fields while reading earlier draft versions.


Saved Places searches (0.6.3) live in a separate local IndexedDB database and are not journal records or portable backup content. They retain approximate-area search metadata, normalized public POI listings, provider/source attribution and timestamps across ordinary app restarts. No API key is stored in that cache. Uninstalling/clearing app data removes it; journal backup/restore does not transfer saved searches. Clear saved searches does not touch journal state or lookup-budget metadata.

## 0.6.5 retired settings compatibility

The saved collections feature is removed. `settings.collections` in older device state or backups is an ignored legacy field; its rules no longer validate, run, merge or appear in UI. New exports contain only supported appearance/memory preferences. Removing these optional settings does not require a schema bump: backup v7 still accepts v1–v7, preserving valid footprints, visits, tags, journeys, sources and attachment bytes. Restoring appearance remains optional. Loading attempts to clear retired settings atomically; if that cleanup alone fails, the app stays usable with the sanitized settings in memory and the next successful normal save drops them. Recovery metadata remains v6.


### 0.6.8 location controls

Country dropdowns and U.S./Canadian region choices still serialize the existing country/region strings. Custom labels round-trip unchanged; no backup/recovery migration is required. A hidden original region input retains the normal editor field name. The reverse-geocoding cache (`nth-region-labels-v1`) and separate usage counter (`nth-region-usage-v1`) are local conveniences outside portable backups. Lookup results cannot overwrite manual edits or committed records. Android original-media selection preserves supplied photo bytes; absent source GPS is never synthesized in the original attachment.


## Compatibility rescue volumes

Numbered `.part-001-of-002.nthbackup` files are consecutive byte ranges of one ZIP64 archive, each at most 140 MiB. Select every part together; the app validates the set and orders it numerically into a file-backed composite Blob. Missing, duplicate or mixed sets are rejected before reading/staging. These are compatibility volumes, not independently restorable backups or generic multi-disk ZIP files. The read-only legacy rescue uses the old APK's existing document save handler and does not upgrade its database. See PHONE-RESCUE.md for the required device-side transfer before replacing differently signed test builds.
