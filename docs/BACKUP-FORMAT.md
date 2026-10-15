# Nth FootPrints portable backup v1

User-facing actions: **Back Up Journal**, **Restore Journal**, and **Export** on an individual footprint. Files use `.nthbackup`, following Nth Reader's portable-collection pattern. The extension does not imply cross-app compatibility.

The first version is a UTF-8 JSON document, not KMZ and not a ZIP container:

```json
{"app":"nth-footprints","formatVersion":1,"createdAt":"ISO timestamp","settings":{"theme":"paper"},"records":[]}
```

Each place includes a stable ID, title, category, visit date, 0–5 rating, favorite flag, address, optional paired latitude/longitude, notes, phone, HTTP(S) website, update timestamp, optional original image/audio data URLs, and optional original bundled sample illustration key. Original photo/audio bytes are not recompressed. No HTC media is included. No access tokens or user account credentials are exported.

Restore reads and validates the complete backup before any write. It rejects foreign app IDs, unknown format versions, malformed records, duplicate IDs, unsupported media URLs, unsafe website schemes, invalid dates and invalid coordinate pairs. The preview reports new footprints, newer revisions and entries already current. Restore merges by stable ID: incoming wins only when its update timestamp is newer; unrelated existing places stay. Theme restoration is optional and unchecked by default. The merge is committed in one IndexedDB transaction; storage errors leave the previous state intact. Progress is shown and cancellation is available during preparation. The final database transaction is brief and cannot be cancelled after it starts.

Individual export uses the same container with one record. A deleted footprint may return if an older backup containing it is imported later; v1 has no deletion tombstones. Imports from other Nth apps are rejected. Backups are unencrypted and contain private place and media information; the backup UI explains they are portable files.

Prototype limits: 150 MB per backup, 20 MB per attachment, 10,000 imported records. JSON/base64 has memory overhead, so this is a foundation rather than the final large-library transfer implementation. Future archive versions should store unchanged binary media alongside a manifest, support sequential transfer and checksums, and include an explicit migration path from v1. No cross-app format compatibility is claimed without inspecting the other apps' actual schemas.
