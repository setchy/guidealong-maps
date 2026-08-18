## Why

Map pin popovers are text-only — no visual preview of each tour. The tour hero images are available on the accessible `/tour-list/` page (each list item carries the hero via a lazy-loaded `img[data-lazy-src]`), and the data model already reserves a `details.thumbnail` field that is always left empty. Unlike the tour detail pages (which are 403-blocked by the site firewall), the tour-list is reachable, so heroes can be captured without fighting the block.

## What Changes

- **Capture hero image URLs from tour-list items**: during inventory, read each item's hero image (`img[data-lazy-src]`, falling back to `src`), and store the URL in the tour's `details.thumbnail` in `src/data/tours.json`.
- **Prefer the full-size hero**: strip WordPress's `-{w}x{h}` size suffix from the captured URL (e.g. `Classic-Southwest-800x900.jpg` → `Classic-Southwest.jpg`) so the popover shows the full-quality image; fall back to the sized URL when the pattern doesn't match.
- **Backfill existing tours**: treat `details.thumbnail` as data preserved through the existing inventory/merge step, so previously scraped tours gain heroes on the next `pnpm fetch:tours` run.
- **Render in the popover**: `buildInfoContent` shows the thumbnail at the top of each map pin popover, falling back to the current text-only layout when a tour has no image.

## Capabilities

### New Capabilities
- `tour-list-hero-images`: Capture each tour's hero image URL from the tour-list page during fetch and render it in the map pin popover.

### Modified Capabilities
<!-- No existing specs change; this capability is new. -->

## Impact

- `lib/inventory.js` — `parseTourItem` captures the hero image URL from the list item and stores it in `details.thumbnail`.
- `lib/index.js` — include `thumbnail` in the existing-details merge so it survives partial runs.
- `src/main.js` — `buildInfoContent` renders the hero image in the popover.
- `src/data/tours.json` — regenerated with `details.thumbnail` populated for tours captured from the tour-list.
- `package.json` — no new dependencies.
- No changes to marker rendering, geocoding, or the tour list.

Note: this supersedes the deferred `tour-hero-images-for-map-pins` change, which attempted to download heroes from the firewall-blocked tour detail pages.
