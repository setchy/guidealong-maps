## Context

The app is a static, dependency-light site (MapLibre GL JS v6 via ES module, vanilla JS, no build step). `main.js` is a single module with a central `updateAll()` pipeline that filters tours then renders markers and a flat list. Tour data lives in `tours.json` (scraped by `lib/`) and completed dates in `completed.json`. There is no viewport meta tag and no responsive CSS today. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Keep grouping/sorting as pure client-side transforms in the existing `updateAll()` pipeline
- Persist tour `category` in the data layer at scrape time so the UI and any future consumers share one source of truth
- Use only MapLibre built-ins (`GeolocateControl`, `AttributionControl`) — no new dependencies
- Deliver mobile fixes via one viewport meta tag plus a single small-screen media query

**Non-Goals:**
- No changes to marker rendering or map behavior when grouping/sorting (markers stay flat)
- No client-side category derivation (category comes from data; `details.tourType` untouched)
- No backend/server changes beyond the existing fetch script
- No map clustering, terrain, or styling overhaul

## Decisions

### D1: Category derived in `lib/fetch-tour-list.js`, stored top-level
A `deriveCategory(title)` helper runs when a tour object is first built (`fetchTourList()`), writing `category` at the top level of each tour in `tours.json`. Detection order: `National Park` → `Bundle` → `Walking` → `Driving`, all via title regex.
- **Rationale**: classification logic lives next to the scrape; consumers (UI today, anything else later) read one field instead of re-implementing heuristics. Top-level (not `details`) because it's a tour classification, sibling to `title`.
- **Alternative considered**: client-side derivation in `main.js` — rejected; duplicates logic and the user explicitly wanted it in fetch logic.

### D2: Grouping/sorting as pure functions feeding `renderTourList`
Extend the pipeline: `computeFilteredTours()` → `sortTours()` → `groupTours()` → `renderTourList(grouped)`. `groupTours` returns an ordered array of `{ key, label, count, tours }`; headers carry counts. Sorting applies within each group; tours missing the sort key fall back to title order (undated completed tours sort after dated ones; ungeocoded tours sort last under distance).
- **Rationale**: keeps `plotToursOnMap` operating on the same flat filtered array — grouping is a list-only concern.
- **Alternative considered**: sorting markers too — rejected, no user value for 100 markers.

### D3: Locate-me via MapLibre `GeolocateControl` + stored position
Add `GeolocateControl` to the map; capture `geolocate` events into a module-level `userLocation`. Distance sort is computed client-side with haversine on `t.geocode.lat/lng`. Selecting "Distance" before a fix triggers the control's locate.
- **Rationale**: `GeolocateControl` already handles permission UI, accuracy, and map centering — no custom code needed.
- **Alternative considered**: raw `navigator.geolocation` — rejected; duplicates MapLibre's control surface.

### D4: Attribution collapsed via explicit `AttributionControl({ compact: true })`
Construct the map with `attributionControl: false` and add `new AttributionControl({ compact: true })`. Attribution remains present and expandable (OpenFreeMap ToS requires it to exist), just collapsed on load.
- **Alternative considered**: CSS-hiding the control — rejected, hides rather than collapses and risks ToS issues.

### D5: Mobile via viewport meta + one media query
Add `<meta name="viewport" content="width=device-width, initial-scale=1">` to `index.html`. Add a `@media (max-width: 600px)` block: `#controls` near-full-width and `overflow-y: auto`; Filters section default-collapsed on load (add a `collapsed` class for small screens in `initMap`).
- **Rationale**: minimal, CSS-first, fixes the two concrete bugs (scaled rendering, clipped panel).

## Risks / Trade-offs

- [Category misclassification if GuideAlong renames tours] → Detection is title-regex based; if titles change, re-running `pnpm fetch:tours` re-derives. Hybrid "Driving & Walking" tours collapse into Bundle/Driving today (no overlaps in current dataset); revisit if such a tour appears.
- [Geolocation permission denied] → Distance sort degrades gracefully: control keeps working for centering, list shows a clear "locate" state instead of crashing.
- [Compact attribution may be missed by users] → It's a single tap to expand; OpenFreeMap usage is preserved.
- [tours.json regeneration churn] → The scrape adds one field; `git diff` will show 100 small additions. Non-breaking for the UI (older data without `category` still renders, defaulting to `Driving` via fallback in the group function).

## Migration Plan

1. Update `lib/fetch-tour-list.js` with `deriveCategory`; run `pnpm fetch:tours` to regenerate `tours.json`.
2. Add viewport meta + media query + attribution/locate wiring (CSS + HTML + map init).
3. Add Group & Sort UI and pipeline transforms in `main.js`.
4. Manual test in desktop + mobile emulation; no rollback complexity (fully client-side, `git revert` suffices).

## Open Questions

None — requirements and approach are settled.
