## Context

The app is a static, vanilla-JS MapLibre site with no build step or framework. `main.js` is a single module with a central `updateAll()` pipeline (filter → sort/group → render). Sections (Filters, Group & Sort, Tours) are collapsible via `.collapsed` classes. Currently Filters only defaults collapsed on mobile (`window.innerWidth <= 600`), Group & Sort always starts expanded, and the tour type filter compares against raw `details.tourType` ("Driving"/"Walking" only). Tours already carry a normalized `category` field (`Driving | Walking | National Park | Bundle`). The tour list's per-item click already pans/zooms the map and opens the popup via `markerIndexByKey`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Collapse Filters and Group & Sort on every initial load, on all viewports
- Add a keyboard-driven search palette (Cmd/Ctrl+K) reusing existing search + map-focus logic
- Make the tour type filter operate on `category`, with options derived from the data
- Stay dependency-free (vanilla JS, no new libraries)

**Non-Goals:**
- No persistence of section collapse state across sessions
- No fuzzy-search library, full-text index, or server-side search — simple substring match on the loaded array is sufficient (100 tours)
- No changes to the fetch pipeline or `tours.json` schema (`category` already exists)
- No changes to grouping/sorting behavior
- No hosting config/CI changes for Netlify in this change — only the README documentation of Netlify (production + preview branches) is in scope

## Decisions

### D1: Collapse via existing `.collapsed` classes, applied in `initMap`
The HTML already marks sections collapsible; the change is to start them collapsed. In `initMap`, after wiring toggles, add the `collapsed` class to `#filtersSection` and `#groupSortSection` and set their toggles' `aria-expanded="false"` unconditionally (removing the mobile-only `window.innerWidth <= 600` guard).
- **Rationale**: one-line-per-section change, reuses existing toggle listeners and CSS, consistent on all viewports.
- **Alternative considered**: HTML default `collapsed` class — rejected because JS-driven state keeps single source of truth and still lets the first click expand correctly.

### D2: Search palette as a static overlay in `index.html` + plain DOM in `main.js`
Add a hidden overlay (`#searchPalette`) with backdrop, input, results list, and hint footer. `main.js` wires:
- `Cmd/Ctrl+K` (and the search button) → open + focus
- `Esc` → close
- input `input` event → filter tours (title/description substring, same matcher as `computeFilteredTours`), cap at ~10 results, render list
- ArrowUp/Down → move highlight; Enter → select highlighted; click → select
- select → reuse the existing tour-item click behavior (look up marker via `markerIndexByKey`, `map.flyTo`, `marker.togglePopup()`), then close
- use the full `allTours` array (not currently filtered) so the palette searches everything
- **Rationale**: static overlay + vanilla DOM matches the codebase style, no framework; reuse of `markerIndexByKey` avoids duplicating map-focus logic.
- **Alternative considered**: making the palette a `<dialog>` — rejected for simplicity and consistent styling with existing dropdowns; plain divs keep control over styling.

### D3: Tour type filter driven by `category`, options derived from data
Replace the static Driving/Walking radios in `#tourTypeDropdownContent` with options generated from distinct `t.category` values (plus "All"), sorted. `getSelectedTourType` keeps returning the selected value or `"all"`. `computeFilteredTours` changes its type match from `d.tourType === type` to `(t.category || "Driving") === type`.
- **Rationale**: single source of truth (data-derived), matches Group & Sort vocabulary, and the `|| "Driving"` fallback handles legacy tours without `category`.
- **Alternative considered**: hardcoding the four categories — rejected; deriving from data keeps it correct as the dataset changes.

### D4: README documents Netlify deployment
Rewrite the README deployment section to describe Netlify as the host: production deploy from the main branch and per-PR preview branches, publishing the `./src` directory with no build step. Remove GitHub Pages references. `.github/workflows/deploy-pages.yml` was already deleted on `main` (commit `cc1f754`), so no workflow changes are needed.
- **Rationale**: keeps docs accurate with the current hosting setup.
- **Alternative considered**: adding Netlify config files (e.g. `netlify.toml`) — rejected as out of scope for a docs update.

## Risks / Trade-offs

- [Collapsed-by-default hides filter controls from new users] → The toggle labels remain visible ("Filters", "Group & Sort") and the palette's search affordance gives an obvious entry point; users click to expand.
- [Palette searches raw `allTours` ignoring active filters] → Intentional: the palette is a global "jump to tour" tool, not a filter refinement. Selecting a tour will also update the map; note this in README if it confuses.
- [`category` missing on stale data] → Falls back to `Driving` in both filter and grouping; `pnpm fetch:tours` regenerates `category` for all tours.
- [Cmd+K conflicts with browser/extension shortcuts] → Only intercepts when the page has focus; Esc still closes. No `preventDefault` unless the palette is open (or Cmd+K to open, which is safe to intercept).

## Migration Plan

1. Update `initMap` collapse defaults.
2. Add palette markup + CSS; wire keyboard/selection in `main.js`.
3. Regenerate tour type filter options from `category`; update `computeFilteredTours`.
4. Lint (Biome) and manual browser test (palette open/close/navigate/select; filter options; collapse defaults).

## Open Questions

None — requirements and approach are settled.
