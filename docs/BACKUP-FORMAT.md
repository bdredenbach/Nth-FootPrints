# Nth FootPrints portable backup v7

**Backup & restore → Create backup → Save backup…** saves UTF-8 JSON with the `.nthbackup` extension, not a ZIP/KMZ. Original media are not recompressed. **Export Photo**, geotagged copies, cards and PDF books are separate exports.

```json
{"app":"nth-footprints","formatVersion":7,"createdAt":"ISO timestamp","settings":{"theme":"paper","memories":true,"collections":[]},"journeys":[],"records":[]}
```

Place records contain stable IDs and shared title, category, favorite, address, phone, HTTP(S) website, optional tags/country/region and update clock. The original top-level date, rating, notes, paired GPS, photos/coverIndex, completed audio and trip memberships form the first visit. Additional `visits` have stable independent IDs, timestamps and their own visit fields. Lightweight removed-visit markers prevent older backups reviving them. At least one active visit must remain. A journal-photo reference can choose a surviving visit/photo. Derived photo aliases are omitted so original media are stored once per visit. Legacy single-photo records remain readable.

Journeys retain title, description, cover and independent update/removal clocks. Membership belongs to visits; removing a journey retains all places and media. Smart collections retain a stable ID, title, validated filter rule and update/removal clock. Rules can select query, tag, category, country/region, trip, date bounds, minimum rating, favorites and located visits. Date/rating/trip constraints must match the same visit. Deleted collection markers win ties; local edit clocks increase even after device clock rollback.

## Compatibility

The current reader accepts versions 1–7. Version 1 is single-photo, 2 adds galleries, 3 journeys, 4 return visits 5 labels/collections/memories 6 new place categories/source references, and 7 Geoapify source attribution. Fields requiring a newer schema are rejected in older-labeled files instead of silently discarded. Older applications reject newer backup versions; export a fresh backup before updating or replacing a test APK.

## Restore and save behavior

The entire file validates before any write: app/version, unique IDs, dates/clocks, categories, media, paired finite GPS ranges, bounded labels/rules, visit references and safe URLs. Preview reports new/newer/current places. Shared place fields and visits merge by their separate clocks; journey and collection metadata merge independently. Deleted journeys/visits/collections are not revived by older backups. A merge removing every visit is rejected. Unavailable covers/memberships are repaired. Whole-place deletion still has no tombstone, so an older backup can restore a deleted place.

Collections always merge as journal content. The appearance checkbox separately restores theme and memories preference; unchecked keeps current appearance. Nearby permission/cooldowns, widget choices, recovery drafts and downloaded maps never enter backups. Backups contain unencrypted private stories/media/GPS.

Changes serialize through one journal queue and commit together in IndexedDB. Errors preserve previous state and recovery. Preparation can cancel; a started commit cannot. Batch import validates all reviewed groups before one write and retains review on failure. Android files save through the document picker in bounded acknowledged chunks; completion follows stream closure. Cancel/failure attempts incomplete-file cleanup and reports cleanup failure. PDF/image/backup MIME types match filenames; no broad storage permission is added.

## Bounds

150 MB per full backup, 10,000 imported places, 200 visit entries per place including markers, 30 photos per visit, 20 journeys per visit, 1,000 journey entries and 100 smart collection entries including markers. Each place allows 30 tags of 40 characters, country 80 and region 100. Individual attachment upload limit is 20 MB. Supported photos: JPG/PNG/WebP/GIF. Batch import adds a 60-file/80 MB raw bound. Base64 JSON and in-memory media retain prototype overhead; binary media and streamed backups remain queued. No cross-app compatibility is claimed.


## Place discovery source (v6)

Optional shared-place `placeSource` is `{ "provider":"openstreetmap", "type":"node|way|relation", "id":"positive numeric ID" }`. Only those provider/type values and bounded numeric strings are allowed; source URLs are constructed against openstreetmap.org. The source belongs to the place, not each visit, and survives edits, returns and restore. New categories are Food & Drink, Things to do, Shopping, Services and Other. Older Travel/Nature/Dining/Culture/Everyday values remain valid for existing records, collection rules and recovery; no category migration rewrites the journal. Earlier-labeled backups cannot contain new categories or source references. Discovery result caches, provider budgets and area choices are outside backups.


## Geoapify place attribution (v7)

OSM sources may add `"via":"geoapify"` without changing provider/type/id identity. When no OSM identity is supplied, `{ "provider":"geoapify", "id":"bounded hexadecimal place ID" }` preserves the provider identity. Credits are generated from this validated metadata and retained in saved details and sourced card/book exports. The `via` value is restricted to geoapify, source URLs use fixed attribution/source hosts, and older-labeled backups reject Geoapify metadata. Version 6 sources without `via` remain accepted. The API key and request budget are outside backups and recovery drafts; editor recovery metadata v6 retains the new source fields while reading earlier draft versions.
