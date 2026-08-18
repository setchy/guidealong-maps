## Why

Map pin popups are text-only (title, location, duration, etc.) — the tour's hero image, the most compelling visual of each trip, is never shown. The data model already reserves a `details.thumbnail` field, but the fetch pipeline always leaves it empty, so there is nowhere for the popup to read an image from.

## What Changes

- **Extract hero images at fetch time**: during detail enrichment, read each tour's hero image URL from its tour page (`og:image` meta tag, with the tour-list item thumbnail as a fallback).
- **Download images locally**: fetch the hero image into `src/assets/tours/<slug>.<ext>` and store the relative path in `details.thumbnail` in `tours.json`. Local copies avoid hotlinking to GuideAlong's servers and work offline for the static site.
- **Backfill existing tours**: treat a missing `details.thumbnail` as a reason to (re)fetch a tour's details so already-scraped tours get thumbnails on the next `pnpm fetch:tours` run.
- **Render in the popup**: `buildInfoContent` shows the thumbnail at the top of each map pin popup, falling back to the current text-only layout when a tour has no thumbnail (failed download or no image on the page).

## Capabilities

### New Capabilities
- `tour-hero-images`: Fetch-time capture and local download of each tour's hero image stored in `details.thumbnail`, plus map-pin popup rendering of that thumbnail.

### Modified Capabilities
<!-- No existing specs change; this capability is new. -->

## Impact

- `lib/enrich.js` — extract the hero image URL from the detail page, download it, and backfill `details.thumbnail` for tours missing one.
- `src/main.js` — `buildInfoContent` renders the thumbnail in the map pin popup.
- `src/data/tours.json` — regenerated with `details.thumbnail` populated for tours that have a hero image.
- `src/assets/tours/` — new directory holding downloaded hero images.
- `package.json` — no new dependencies expected (Node 18+ `fetch` and `node:fs`).
- No changes to marker rendering, geocoding, or the tour list.

Note: this builds on the detail-enrichment phase introduced by the in-progress `phased-resumable-tour-fetch` change.
