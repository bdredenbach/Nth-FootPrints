# Nth FootPrints working queue

GitHub is authoritative. Current prototype: **0.3.0**.

Completed foundations: vertical photo stack and three-tab layout, local footprint editing/media, native camera + device GPS, supported photo GPS inspection, safe areas, automatic starter cleanup, `.nthbackup` preparation/save/restore progress, original-photo export, and the multi-pin atlas.

## Remaining order

1. **Update-safe APKs.** Configure a persistent, securely stored signing key in GitHub Actions so new builds can update the app in place. Android version names/codes are prepared in 0.3.0; permanent signing is still missing. The connector cannot administer repository secrets, so secure key installation will need a one-time account-side step.
2. **Location tools.** Address/nearby-place search and choosing or correcting a position on the map. Choose providers and usage limits before adding network lookups; preserve manual coordinates.
3. **Android home-screen widget.** Show a saved footprint and open its detail/capture flow. Establish the native data bridge and widget refresh behavior first.
4. **Offline map packages.** Choose an offline-capable provider/data license, package format, storage limits and download/removal flow. The current public OSM raster tile service is for interactive online viewing and will not be used for bulk offline packages.
5. **Integrated navigation.** Routing, rerouting, turn instructions and voice guidance, building on the selected map/routing data. Current Directions links open an external maps app/browser.
6. **Larger collections and Android lifecycle recovery.** Move large media out of in-memory base64 state, stream backup archives, and recover unsaved camera drafts after Android destroys the activity.

Continue device checks for camera/location permissions, audio, safe areas, native save/restore and map gestures. Automated checks and compilation do not replace those checks.

A separate HTC Locations reference is still needed to finish its feature inventory. Complete parity is not claimed. **KMZ stays omitted** in favor of the Nth-specific backup format.
