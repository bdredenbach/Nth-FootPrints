# Nth FootPrints portable backup v2

User-facing actions are **Backup & restore → Create backup → Save backup…** and **Restore**. **Export Photo** saves an image, separately from full-journal backup. Files use `.nthbackup`; this does not imply compatibility with other Nth apps.

The backup is UTF-8 JSON, not KMZ or a ZIP container:

```json
{"app":"nth-footprints","formatVersion":2,"createdAt":"ISO timestamp","settings":{"theme":"paper"},"records":[]}
```

Each place includes a stable ID, title, category, visit date, 0–5 rating, favorite flag, address, optional paired latitude/longitude, notes, phone, HTTP(S) website, update timestamp, optional original image/audio data URLs, and optional bundled sample illustration key. No HTC media or credentials are included. Photos/audio are not recompressed.

Gallery records store `photos`, an ordered array of original image data URLs, and `coverIndex`, a zero-based main-photo selection. An empty array uses index zero. The selected image is derived into `photo` in app state for cards/widgets/export; this alias is omitted from gallery backups so the same original is not stored twice. Legacy single-photo records can still use `photo` without gallery fields.

## Compatibility

Version 2 readers accept version 1 single-photo backups and version 2 backups. Gallery fields in a file labeled version 1 are rejected. Older app releases reject version 2 backups instead of silently discarding extra photos. Normal database loading validates and preserves both legacy and gallery records without changing original media.

## Restore and save behavior

Restore validates the entire file before any write, rejecting foreign app IDs, unsupported versions, malformed records, duplicate IDs, invalid image arrays/cover selections, unsafe website schemes, invalid dates and incomplete/out-of-range coordinates. The preview reports new places, newer revisions and already-current entries. Incoming records replace matching IDs only when their update timestamp is newer; unrelated existing places stay. Theme restoration is optional. The merge commits in one IndexedDB transaction; errors preserve the existing state. Preparation can be cancelled; a started commit cannot.

Gallery uploads read every selected file before one commit. A cancelled/invalid batch attaches nothing. A cover selection updates the record revision and saves automatically. Backup and Export Photo wait for pending cover writes. Journal mutations serialize so gallery, favorite, restore and settings updates preserve one another.

Android saves through its document picker and bounded acknowledged chunks. Progress reaches success only after stream closure. Cancel/write failure attempts to delete the incomplete newly created document and reports cleanup failure. No broad storage permission is added.

## Limits

150 MB per full backup, 20 MB per attachment in upload flows, 30 photos per footprint and 10,000 imported records. JPG, PNG, WebP and GIF photos are supported. Base64 JSON and in-memory media retain prototype overhead; a binary media store and streaming archive remain on the roadmap. Backups are unencrypted. Deleted footprints may return when restoring older backups because neither format has deletion tombstones. No cross-app compatibility is claimed.
