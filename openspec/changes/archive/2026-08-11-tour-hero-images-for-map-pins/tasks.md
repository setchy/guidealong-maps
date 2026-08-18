## 1. Hero image capture and download

> Deferred: hero-image fetching is blocked by GuideAlong's site firewall (tour pages return 403). Revisit once the fetch issue is resolved.

- [ ] 1.1 In `lib/enrich.js`, extend `parseTourDetail` to read the page's `<meta property="og:image">` URL and return it alongside `start`/`location`.
- [ ] 1.2 Add a fallback source: when a tour page has no `og:image`, use the tour-list item image `src` captured by `lib/inventory.js` (currently disabled at line 79-80).
- [ ] 1.3 Derive the local filename from the tour URL slug (e.g. `/tour/banff-driving-tour/` → `banff-driving-tour`), sanitized, with the extension taken from the image's `Content-Type` (default `.jpg`).
- [ ] 1.4 Download the hero image into `src/assets/tours/` during detail enrichment, validating the response content type and warning (via `lib/log.js` `warn`) and skipping on non-image or failed responses.
- [ ] 1.5 Ensure `src/assets/tours/` exists (create the directory if missing) before writing downloads.
- [ ] 1.6 Set `details.thumbnail` to the relative path (`assets/tours/<slug>.<ext>`) on each tour after a successful download; leave it empty on failure.
- [ ] 1.7 Extend the enrich pending filter in `enrichTours` to also select tours missing `details.thumbnail`, so already-scraped tours are backfilled on the next run.

## 2. Map pin popup rendering

- [ ] 2.1 In `src/main.js` `buildInfoContent`, render the hero image at the top of the popup when `d.thumbnail` is present, with `alt` set to the tour title, `loading="lazy"`, and `width: 100%` styling consistent with the existing popup markup.
- [ ] 2.2 Keep the existing text-only popup layout when `d.thumbnail` is empty or missing (no image, no error).

## 3. Regenerate data and verify

- [ ] 3.1 Run `pnpm fetch:tours` to regenerate `src/data/tours.json` with populated `details.thumbnail` values and downloaded images in `src/assets/tours/`.
- [ ] 3.2 Verify every non-empty `details.thumbnail` in `tours.json` points at a file that exists under `src/assets/tours/`, and spot-check a popup in the running UI (`pnpm start`) shows the image.
- [ ] 3.3 Run `pnpm lint` and confirm no lint errors.
- [x] 3.4 Sort `tours` by title after the inventory/merge step (before detail enrichment) so incremental phase writes keep `tours.json` in stable alphabetical order, avoiding large git deltas on partial runs.
