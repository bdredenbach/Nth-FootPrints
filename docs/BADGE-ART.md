# Badge artwork — 0.9.0

Eight original trophy assets were generated with the built-in image-generation tool on 2026-10-18. Each transparent PNG was converted to a 512px RGBA WebP at quality 90, retaining alpha. Runtime assets are in `dist/assets/badges/`. No generated lettering is used: titles, progress and milestone requirements are accessible live HTML. Tiers in a collection share their trophy design and have distinct titles and goal plaques.

The wood cabinet is responsive CSS, allowing each trophy to move independently. Reader reference commit: `937acb3aa4b50f6ada1fef69981a55b2a5d23979`, `js/shelf.js` decoration layout/pointer drag and `js/customize.js` itemControlsEl/sliderRow. The implementation adapts width, height, position, shelf contact and facing to FootPrints’ own state, keyboard controls and backups.

## Shared generation prompt

Use case: stylized-concept. Asset type: one premium collectible achievement trophy for Nth FootPrints, a personal travel photo journal. Subject: {SUBJECT}. Style: finely crafted realistic 3D product render, tactile raised metalwork, restrained elegant heirloom travel-club aesthetic, warm soft upper-left light, beautiful material detail. Front-facing view with very slight elevated perspective; centered single freestanding object fully visible, substantial size within a square canvas with 8% transparent padding, even baseline. Palette antique brass, deep forest green, cream and dark walnut. Genuinely transparent background, no backdrop, no floor, no lettering, no numbers, no logos, no watermark, no other objects. The trophy must read clearly at 100px.

## Subjects and saved files

- `dist/assets/badges/footsteps.webp`: a sculptural pair of tiny boot-print impressions in raised antique brass on a deep green enamel round medallion, standing on a small dark walnut plinth.
- `dist/assets/badges/globe.webp`: an exquisite miniature brass terrestrial globe with deep forest-green enamel oceans and ivory continents, on a dark walnut foot.
- `dist/assets/badges/mountain.webp`: a sculptural mountain range with ivory snowy summits, green enamel foothills and a brass sun, on a small walnut plinth.
- `dist/assets/badges/camera.webp`: a miniature vintage camera trophy with a jewel-like green glass lens, aged brass body and ivory details on a dark walnut plinth.
- `dist/assets/badges/journal.webp`: a miniature open travel journal with ivory pages, a brass fountain pen and forest-green cover, on a dark walnut plinth.
- `dist/assets/badges/homecoming.webp`: a sculptural brass looping trail curling around a small forest-green enamel house and one raised footprint, on a walnut plinth.
- `dist/assets/badges/compass.webp`: a finely crafted antique brass compass trophy with forest-green enamel face and ivory compass rose, standing upright on a dark walnut plinth.
- `dist/assets/badges/journey.webp`: a small sculptural winding brass road leading toward green enamel rolling hills, with a brass waypoint arch, on a dark walnut plinth.
