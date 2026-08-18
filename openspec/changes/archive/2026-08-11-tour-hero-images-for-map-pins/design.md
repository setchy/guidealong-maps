## Context

`lib/enrich.js` already fetches each `/tour/<slug>/` page (server-rendered HTML) during the detail phase to capture `start`/`location`, but discards everything else. The tour data model reserves `details.thumbnail`, and `lib/inventory.js` explicitly leaves it empty ("Thumbnail fetching is disabled for now"). The map popup (`buildInfoContent` in `src/main.js`) renders text only. See proposal.md for motivation.

Two in-progress changes reshape this pipeline: `phased-resumable-tour-fetch` splits fetch into inventory → details → geocode phases with incremental resume, and `fetch-all-tours-with-warnings` handles full-set discovery and warnings. This design rides on the detail-enrichment phase so hero-image capture happens in the same single fetch of each tour page.

## Goals / Non-Goals

**Goals:**
- Capture a hero image for each tour during the existing detail fetch, download it locally, and store its relative path in `details.thumbnail`.
- Backfill thumbnails for tours already enriched (missing `start`/`location` is no longer the only trigger for detail re-fetch).
- Render the thumbnail at the top of each map pin popup with a clean fallback when absent.
- Reuse the existing pacing/backoff and incremental-persist patterns from the enrich phase.

**Non-Goals:**
- No cropping, resizing, or format conversion of images — store GuideAlong's original hero as-is.
- No popup image in the tour list rows (out of scope; the list remains text-only).
- No lazy-loading logic beyond the browser's native `loading="lazy"` on `<img>`.
- No remote-URL storage (images are always downloaded locally).

## Decisions

**1. Extract the hero image from the tour page's `og:image` meta tag.**
Each server-rendered tour page includes `<meta property="og:image" content="...">`, which reliably points at the tour's hero image and is already present for social sharing. Cheerio reads it in the same parse pass that captures `start`/`location`.
- Fallback: the tour-list item in inventory already contains the tour's image element; use its `src` when the detail page has no `og:image`.
- Alternative considered: scraping `img` elements inside the page hero markup — brittle against theme markup changes, so `og:image` wins.

**2. Download images locally into `src/assets/tours/` rather than storing the remote URL.**
The site is served from `./src`, so `assets/tours/<slug>.<ext>` is directly addressable and works offline. Local copies also avoid hotlinking to GuideAlong's CDN from the static site.
- Filename: derive from the tour URL slug (e.g. `/tour/banff-driving-tour/` → `banff-driving-tour`), sanitized, with extension taken from the image's `Content-Type` (defaulting to `.jpg`).
- File naming is idempotent — re-running the fetch overwrites the same file, so incremental runs never accumulate stale images.
- Alternative considered: storing the remote URL in `thumbnail` and hotlinking — rejected (offline static deploy, hotlink/CORS risk, user explicitly wants a download).

**3. Backfill: treat missing `thumbnail` as an enrich trigger.**
The enrich phase's pending filter currently selects tours missing `start` AND `location`. Extend it to also select tours missing `details.thumbnail`. Because image capture runs in the same request as `start`/`location` capture, the incremental-resume and backoff logic already in place covers image downloads for free, and one pass backfills everything.

**4. Render the image in `buildInfoContent`.**
Prepend a sized `<img>` block to the popup HTML when `d.thumbnail` is truthy, with `loading="lazy"` and `alt` set to the tour title. Empty `thumbnail` short-circuits to today's text-only layout. Popup width already constrains content, so a `width: 100%` image with rounded corners fits the existing styling (small inline `style` consistent with the rest of the popup markup).

## Risks / Trade-offs

- [Site firewall blocks image requests] → Images come from GuideAlong's CDN, not the blocked AJAX/sitemap endpoints; the detail page fetch already succeeds, and downloads reuse the same pacing/backoff. Failed downloads leave `thumbnail` empty and popup falls back gracefully.
- [Repo size grows with ~131 images] → GuideAlong's heroes are already web-optimized; `src/assets/tours/` may be large but is static content served directly by Netlify. No action unless size becomes a problem.
- [`og:image` absent on some pages] → Fallback to the inventory item image; if neither exists, `thumbnail` stays empty and the popup renders unchanged.
- [Non-image response / content-type mismatch] → Validate the response content type before writing; skip and warn on mismatch.

## Migration Plan

- Deploy is static: add `src/assets/tours/`, regenerate `tours.json` via `pnpm fetch:tours`, and ship the new images with the site. No schema migration — `details.thumbnail` already exists.
- Rollback: revert the UI change in `buildInfoContent` and/or the enrich changes; stale thumbnails in `tours.json` are harmless if the popup ignores them.

## Open Questions

None.
