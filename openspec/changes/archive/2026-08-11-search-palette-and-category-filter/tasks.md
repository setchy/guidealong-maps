## 1. Collapse sections on load

- [x] 1.1 In `initMap`, add the `collapsed` class to `#filtersSection` and `#groupSortSection` and set both toggles' `aria-expanded="false"` on every load, removing the `window.innerWidth <= 600` guard
- [ ] 1.2 Verify: Filters and Group & Sort start collapsed on desktop and mobile; toggles expand and re-collapse them

## 2. Cmd+K search palette

- [x] 2.1 Add search palette markup to `src/index.html`: a visible search affordance/button (labeled with ⌘K) plus a hidden overlay with backdrop, input, results list, and footer hint
- [x] 2.2 Add `src/styles.css` styles for the palette (overlay, backdrop, input, results, highlighted row, hint)
- [x] 2.3 Implement palette open/close in `src/main.js`: Cmd/Ctrl+K and the search button open + focus input; Esc closes; backdrop click closes
- [x] 2.4 Implement live filtering: as the user types, match tours by title/description substring against `allTours`, cap at ~10 results, show "no results" when empty
- [x] 2.5 Implement selection: ArrowUp/Down highlight results, Enter selects highlighted, click selects; selecting pans/zooms the map, opens the tour popup (reuse `markerIndexByKey` + `map.flyTo` + `marker.togglePopup()`), and closes the palette
- [ ] 2.6 Verify: open via shortcut and button, type to filter, navigate with arrows, select via Enter and click, close via Esc/backdrop

## 3. Category-based tour type filter

- [x] 3.1 Replace the static Driving/Walking options in `#tourTypeDropdownContent` with options generated from distinct `t.category` values (plus "All"), sorted
- [x] 3.2 Update `setupTourTypeFilter`/`updateTourTypeDropdownButtonText` to populate and label from categories
- [x] 3.3 Update `computeFilteredTours` to match `(t.category || "Driving") === type` instead of `d.tourType === type`
- [ ] 3.4 Verify: filter options match categories (Driving, Walking, National Park, Bundle); selecting each filters list and map correctly; "All" shows everything

## 4. README docs: Netlify deployment

- [ ] 4.1 Rewrite the README deployment section to document Netlify: production deploy from the main branch and per-PR preview branches (base directory `./src`, no build step)
- [ ] 4.2 Remove GitHub Pages references from the README (intro line, deployment section, any links)

## 5. Last-synced timestamp + official site link

- [x] 5.1 Update `lib/index.js` to write `src/data/meta.json` with a `lastSynced` timestamp alongside `tours.json`
- [x] 5.2 Run `pnpm fetch:tours` (via `node ./lib/index.js`) to generate `src/data/meta.json`
- [x] 5.3 Add a footer to `src/index.html` with the last-synced timestamp element and a link to `https://guidealong.com/tour-list`
- [x] 5.4 Fetch `meta.json` in `src/main.js`, format `lastSynced` for display, and populate the footer; handle missing/unreadable meta gracefully
- [x] 5.5 Add footer styles to `src/styles.css` and verify the timestamp and link render

## 6. Verification

- [ ] 6.1 Run lint (Biome) and fix any issues
- [ ] 6.2 Manual browser test: collapse defaults, palette keyboard + mouse flows, category filter behavior, footer timestamp + site link, and mobile layout
