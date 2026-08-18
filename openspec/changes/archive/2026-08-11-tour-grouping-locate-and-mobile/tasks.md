## 1. Data layer: category in fetch pipeline

- [x] 1.1 Add `deriveCategory(title)` helper to `lib/fetch-tour-list.js` with detection order National Park → Bundle → Walking → Driving
- [x] 1.2 Write `category` at the top level of each tour object in `fetchTourList()`
- [x] 1.3 Run `pnpm fetch:tours` to regenerate `src/data/tours.json` with `category` on all tours
- [x] 1.4 Verify: all 100 tours have a valid `category`; distribution matches Driving 53 / National Park 22 / Bundle 15 / Walking 10; `details.tourType` unchanged

## 2. Map controls: locate-me and attribution

- [x] 2.1 Construct the map with `attributionControl: false` and add `new AttributionControl({ compact: true })`
- [x] 2.2 Add `GeolocateControl` to the map and capture `geolocate` events into a module-level `userLocation`
- [x] 2.3 Verify: attribution loads collapsed ("ⓘ") and expands on click; locate-me centers map and stores position; permission-denied path is handled without errors

## 3. Mobile responsiveness

- [x] 3.1 Add `<meta name="viewport" content="width=device-width, initial-scale=1">` to `src/index.html`
- [x] 3.2 Add `@media (max-width: 600px)` block in `src/styles.css` making `#controls` near-full-width and `overflow-y: auto`
- [x] 3.3 Default-collapse the Filters section on small screens on load (set `collapsed` class when `window.innerWidth <= 600`)
- [x] 3.4 Verify in browser device emulation: map visible on load, panel scrollable, filters expandable

## 4. Group & Sort UI

- [x] 4.1 Add "Group & Sort" collapsible section to `src/index.html` between Filters and Tours with Group by and Sort by dropdowns
- [x] 4.2 Add `src/styles.css` styles for the new section and group headers (incl. per-group counts)
- [x] 4.3 Implement pure `sortTours(tours, sortKey, userLocation)` and `groupTours(sortedTours, groupKey)` functions in `src/main.js`
- [x] 4.4 Wire Group by (None/Status/Category) and Sort by (Title/Completed date/Distance) controls into `updateAll()`; keep `plotToursOnMap` on the flat filtered array
- [x] 4.5 Add haversine distance computation and show computed distance (e.g. "12.4 mi") in list item metadata when sorting by distance; placeholder ("—") for ungeocoded tours
- [x] 4.6 Render group headers with counts (e.g. "Completed (26)"); sort within groups; tours missing the sort key fall back to title sort
- [x] 4.7 Selecting "Distance" sort without a captured location triggers the locate flow

## 5. README cleanup

- [x] 5.1 Rewrite README to reflect current stack: MapLibre (no API key for UI), root `.env` + `.env.template` for server-side geocoding
- [x] 5.2 Document the GitHub Pages deploy workflow and the Group & Sort / locate-me UI
- [x] 5.3 Remove stale references (Google Maps in the UI, `src/config` paths, outdated data-file examples)

## 6. Verification

- [x] 6.1 Run `pnpm lint` and fix any issues
- [x] 6.2 Manually test: each Group by option, each Sort by option, distance sort with located position, permission-denied behavior, and mobile layout
