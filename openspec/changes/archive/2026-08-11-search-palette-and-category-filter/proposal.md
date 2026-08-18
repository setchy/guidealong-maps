## Why

The left sidebar currently opens with both Filters and Group & Sort expanded, pushing the tour list down and forcing users to scroll to reach content. The tour-type filter exposes raw scraped types (Driving/Walking only) that don't match the richer categories (National Park, Bundle) users group by. And the only way to search is the inline field at the top of the sidebar — a fast keyboard-driven search palette would match how users actually look things up.

## What Changes

- **Collapse Filters and Group & Sort on initial load** on all screen sizes (not just mobile). Both sections render collapsed; the tour list and map are visible immediately.
- **Cmd+K search palette**: a keyboard-activated overlay (Cmd/Ctrl+K) that focuses a search field, filters tours by title/description as you type, lists matches, and lets the user pick one to pan/zoom/open on the map. Esc closes; Enter selects. Includes a visible "search" affordance and hint text for discoverability.
- **Tour type filter uses categories**: the "Tour type" filter options become the normalized categories (`Driving`, `Walking`, `National Park`, `Bundle`), matching the Group & Sort categories, instead of raw scraped types.
- **Docs: Netlify deployment**: update the README to document Netlify as the deployment host (production deploy and per-PR preview branches) instead of GitHub Pages.
- **Official site link + data freshness**: add a footer link to the official GuideAlong tours website and show when `tours.json` was last synced, from a `lastSynced` timestamp written by the fetch script.

## Capabilities

### New Capabilities
- `sidebar-collapse-on-load`: Filters and Group & Sort sections start collapsed on initial load on all viewports.
- `command-search-palette`: A Cmd/Ctrl+K overlay that searches tours and selects a result to focus it on the map.
- `category-filter`: The tour type filter filters by normalized category instead of raw scraped tour type.
- `data-freshness-and-site-link`: A footer showing the last-synced timestamp of `tours.json` and a link to the official GuideAlong site.

### Modified Capabilities
<!-- No main specs exist yet; this change introduces the capabilities above. -->

## Impact

- `src/index.html` — tour type filter options replaced with categories; new search palette markup; section default state collapsed.
- `src/main.js` — `getSelectedTourType`/`computeFilteredTours` switch from `details.tourType` to `category`; collapse defaults for Filters and Group & Sort; keyboard handler (Cmd/Ctrl+K, Esc, arrow keys, Enter) wiring the palette to search + map focus; fetch `meta.json` for last-synced timestamp.
- `src/styles.css` — palette overlay styles (backdrop, input, list, selected row), collapsed-section default.
- `src/data/tours.json` — unchanged; `category` already present from the fetch pipeline.
- `src/data/meta.json` — new file written by the fetch script with `lastSynced`.
- `lib/index.js` — write `src/data/meta.json` alongside `tours.json` with the sync timestamp.
- `README.md` — deployment section rewritten for Netlify (production + preview branches); remove GitHub Pages references.
- `.github/workflows/deploy-pages.yml` — already removed on `main` (commit `cc1f754`); no action needed here.
- No new dependencies — keyboard/palette implemented in vanilla JS.
