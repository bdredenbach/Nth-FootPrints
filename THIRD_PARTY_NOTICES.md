# Third-party notices

## Leaflet 1.9.4

Leaflet is included locally in `dist/vendor/leaflet/` under the BSD 2-Clause license. Its complete copyright and license notice is retained in `dist/vendor/leaflet/LICENSE`.

Source: https://www.npmjs.com/package/leaflet/v/1.9.4 and https://github.com/Leaflet/Leaflet/tree/v1.9.4 . The distribution stylesheet's PNG references were inlined as data URLs so it has no additional image-file dependency. The unused JavaScript source-map reference was removed; the library and license notice are otherwise retained.

## OpenStreetMap

Online map background tiles are supplied by OpenStreetMap contributors at `https://tile.openstreetmap.org`. Attribution remains visible in the map. The application does not bundle OSM map tiles or provide offline/prefetch downloads from this service.

- Data copyright/license: https://www.openstreetmap.org/copyright
- Tile usage policy: https://operations.osmfoundation.org/policies/tiles/
- Privacy policy: https://osmfoundation.org/wiki/Privacy_Policy

Original Nth artwork and footprint icons remain separate from the map library and map data. HTC artwork or application code is not distributed.

## Photon place search

The application calls the Photon public demo service at https://photon.komoot.io/api/ for explicit address and named-place searches. Data is from © OpenStreetMap contributors under the Open Database License: https://www.openstreetmap.org/copyright . The picker displays attribution with links to Photon and OpenStreetMap. No Photon server code is bundled.

Photon’s operator welcomes reasonable request volumes, may throttle or ban extensive use, gives no availability guarantee and can change the service without notice. This prototype limits request frequency/results, handles throttling, caches a small number of queries in memory and does not automatically retry. Use a dedicated service or contracted provider before broader distribution. Queries are sent on explicit Search; saved journal records and media are not sent.

Upstream project/policy: https://github.com/komoot/photon . API: https://github.com/komoot/photon/blob/master/docs/api-v1.md .

## USGS Topo offline maps

Map services and data available from U.S. Geological Survey, National Geospatial Program. The National Map services/data are free and public domain. Offline areas download USGS Topo raster tiles; no USGS logo is used. Detailed coverage is U.S.-focused.

Service/source credits: https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer
Terms: https://www.usgs.gov/faqs/what-are-terms-uselicensing-map-services-and-data-national-map

## fake-indexeddb

Development-only IndexedDB behavioral test implementation, version 6.2.4, Apache-2.0. Not bundled into the app. https://github.com/dumbmatter/fakeIndexedDB


## Nearby place listings (0.6.0)

Discovery queries the public Overpass API, currently https://overpass-api.de/api/interpreter , for OpenStreetMap data under the Open Database License (ODbL): https://www.openstreetmap.org/copyright . Attribution appears beside results, in listing/saved-place details, source metadata in backups, and sourced memory cards/trip books. The UI identifies the approximate-area lookup before use. No third-party place photos or logos are scraped or bundled. Provider software is remote, not distributed in this app. Public instance usage is bounded for this testing prototype; dedicated hosting/provider capacity is required before wider distribution. Operator guidance: https://dev.overpass-api.de/overpass-doc/en/preface/commons.html .
