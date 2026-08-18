## Why

The current fetch pipeline (`lib/index.js` + `lib/fetch-tour-list.js` + `lib/enrich-tour-details.js`) runs inventory discovery, per-tour detail enrichment, and geocoding as one fused script. That conflation caused real problems: the 131-request detail batch re-triggers the site's firewall mid-run, `mergeExistingDetails` was bolted on to survive partial failures, and both http and headless-browser drivers are entangled in one module. The two workloads have very different rate-limit profiles (inventory ≈ 2 requests; details ≈ 131 requests) and should be separate, resumable phases.

## What Changes

- **Split the pipeline into three independent, resumable phases**:
  1. **Inventory**: discover the full set of tour URLs + titles from `/tour-list/` (page 1 + pagination), compare against the site-reported total.
  2. **Details**: for each URL not yet enriched, fetch `/tour/<slug>/`, parse `start`/`location`/etc. with cheerio, skip already-complete tours, persist incrementally.
  3. **Geocode**: Google Maps SDK for tours missing coordinates (unchanged behavior, isolated).
- **Make each phase incremental**: a phase only processes tours that still need that phase's data, so an interrupted run resumes from where it left off instead of re-fetching everything.
- **Rate-limit-aware detail fetching**: configurable delay plus exponential backoff on 403/firewall responses; stop gracefully with a warning rather than hammering.
- **Remove unused/bolted-on code paths**:
  - Delete the `mergeExistingDetails` retention glue (incremental phases make it unnecessary).
  - Remove the `scripts/merge-tours.js` paste-merge helper (its page-2 data is already in `tours.json`; inventory phase handles the full set).
  - Drop the headless-browser driver unless it's the most effective option — evidence shows Chromium also gets 403'd, so plain `fetch` + cheerio is the primary method for both inventory and details.
- **Keep the existing warnings** (dataset-total mismatch, completed.json remap) working.

## Capabilities

### New Capabilities
- `incremental-tour-sync`: The tour data pipeline runs as independent, resumable phases (inventory → details → geocode), each processing only tours that still need its output.
- `rate-limited-page-fetching`: Fetching tour pages uses polite pacing and exponential backoff so runs survive the site's firewall without losing data.

### Modified Capabilities
- `tour-fetch-all-pages`: re-scoped from "fetch all pages of /tour-list/" to the inventory phase that discovers the full URL set; the detail-fetching moves to `incremental-tour-sync`.

## Impact

- `lib/index.js` — thin orchestrator calling three phases; each returns how many tours it processed/completed.
- `lib/inventory.js` (new) — inventory discovery: `/tour-list/` page 1 + pagination, reported-total comparison, de-dup by URL.
- `lib/enrich.js` (new, replaces `enrich-tour-details.js`) — incremental per-tour detail fetch with pacing + backoff + resume.
- `lib/geocode.js` (new, moves `geocode-tours.js`) — geocoding only missing coordinates.
- `lib/fetch-tour-list.js` — removed/replaced by `inventory.js` (its browser driver and AJAX page loop move into inventory, simplified).
- `lib/check-data.js` — unchanged (warnings).
- `scripts/merge-tours.js` — removed.
- `src/data/tours.json` — schema unchanged; single source of truth that phases read/write incrementally.
- No UI changes; `pnpm fetch:tours` remains the entrypoint.
