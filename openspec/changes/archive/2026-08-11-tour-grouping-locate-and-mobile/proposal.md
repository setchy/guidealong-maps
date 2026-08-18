## Why

The tour list is a flat, always-title-sorted list with no way to organize the dataset beyond filtering. Users want different lenses on the data — group by status or tour category, sort by completion date or distance from their location. Separately, the map shows an expanded attribution watermark on load, and the layout is unusable on mobile (no viewport meta tag, controls clip content). The tour type data itself is messy (hybrid values, "Half Day" as a type), and "bundle"/"national park" are not first-class categories.

## What Changes

- **Fetch logic** (`lib/fetch-tour-list.js`): derive a `category` field at scrape time — `"National Park" | "Bundle" | "Walking" | "Driving"` — stored top-level on each tour in `tours.json`. The raw `details.tourType` remains untouched.
- **Group By / Sort By controls**: a new collapsible "Group & Sort" section between Filters and Tours with two dropdowns — Group by (None/Status/Category) and Sort by (Title/Completed date/Distance).
- **Grouped tour list**: render group headers with per-group counts (e.g. "Completed (26)"); sort applies within groups; tours missing the sort key fall back to title sort.
- **Locate me**: a map control that requests geolocation, stores the user's position, and enables sorting tours by distance (nearest first) with computed distances shown in the list.
- **Attribution**: attribution control loads collapsed ("ⓘ") instead of expanded on load.
- **Mobile responsiveness**: add `<meta name="viewport">`, a `@media (max-width: 600px)` stylesheet block making the controls panel near-full-width and scrollable, and default-collapse the Filters section on mobile.
- **README cleanup**: reorganize and tighten the README to reflect the current stack (MapLibre, root `.env`, GitHub Pages workflow, Group & Sort, locate-me).

## Capabilities

### New Capabilities
- `tour-categorization`: Deriving a normalized `category` for each tour during the fetch pipeline (`National Park | Bundle | Walking | Driving`), persisted in `tours.json`.
- `tour-list-organization`: Grouping the tour list by Status or Category, sorting by Title, Completed date, or Distance, group headers with counts, and distance display.
- `map-locate-and-attribution`: A locate-me control that captures the user's position for distance sorting, and a collapsed-on-load attribution control.
- `mobile-responsive-layout`: Viewport meta tag and responsive styling so the sidebar layout works on small screens.

### Modified Capabilities
<!-- No existing specs to modify; this is the first change with specs. -->

## Impact

- `lib/fetch-tour-list.js` — add `category` derivation (no schema change elsewhere in the pipeline; `tours.json` gains one field per tour, requires re-running `pnpm fetch:tours`).
- `src/data/tours.json` — regenerated with `category` field.
- `src/main.js` — add group/sort state, grouping/sorting/haversine logic, distance display, locate-me wiring, geolocation handling.
- `src/index.html` — new Group & Sort section, viewport meta tag.
- `src/styles.css` — group header styles, mobile media query.
- `src/data/completed.json` — unchanged (consumed as-is; null dates sort last).
- `README.md` — reorganized and rewritten to match current architecture.
- MapLibre GL JS v6 (already in use) — `GeolocateControl` and `AttributionControl` are existing named exports, no new dependency.
- GitHub Pages workflow — unaffected.
