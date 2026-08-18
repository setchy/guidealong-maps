## Why

The fetch pipeline (`pnpm fetch:tours`) only reads the first page of GuideAlong's tour list, so `tours.json` is missing tours. The site reports "131 Results Found" but only ~100 render in the static HTML — the rest load via the site's AJAX pagination (`tourmaster_tour_ajax`). Repeated or rapid requests to the site also trigger its Inkline firewall, which blocks our IP. Separately, `completed.json` contains titles that no longer match the current `tours.json` (e.g. "MAUI TOURS" → "MAUI BUNDLE"), silently dropping completed-tour highlighting.

## What Changes

- **Fetch all pages**: `fetchTourList()` will parse page 1 from the static HTML, discover the reported total ("N Results Found"), then **crawl tour pages as plain HTML** — seeding URLs from page 1 plus footer/related/bundle links, fetching each `/tour/<slug>/` page (no `admin-ajax.php`), parsing its details, and following new tour links until the set closes. Tours are merged and de-duplicated by URL.
- **Rate-limit protection**: tour-page requests will be spaced with a configurable delay and browser-like headers, and stop gracefully (with a warning) if the firewall blocks mid-crawl instead of failing or hammering.
- **Avoid the AJAX endpoint**: the site's pagination is AJAX-only (`admin-ajax.php`), which the firewall blocks from script clients and headless browsers; individual tour pages are server-rendered plain HTML and avoid it entirely.
- **Dataset total warning**: after fetching, warn if the number of tours parsed differs from the site's reported total (e.g. "131 Results Found").
- **completed.json remap warning**: warn when entries in `completed.json` don't match any title in `tours.json`, suggesting likely renames so users can remap them.
- **Reliable fetch driver**: weigh the most dependable way to drive the fetch. Evidence so far: the site's Inkline firewall blocks `admin-ajax.php`, `/wp-json/`, and sitemaps from scripts/headless browsers, but individual tour pages are plain server-rendered HTML reachable from a normal client. The design uses a plain-HTML crawl as the primary mechanism.

## Capabilities

### New Capabilities
- `tour-fetch-all-pages`: Fetch the complete tour list across all paginated pages via the site's AJAX endpoint, de-duplicated, with rate-limit-aware fetching.
- `fetch-data-warnings`: Emit warnings during `pnpm fetch:tours` for dataset total mismatches and for `completed.json` entries that no longer match `tours.json` titles.

### Modified Capabilities
<!-- No existing specs change; both capabilities are new. -->

## Impact

- `lib/fetch-tour-list.js` — pagination-aware fetch with AJAX follow-up pages, de-duplication, delay/backoff, and browser-like headers.
- `lib/index.js` — call the new fetch logic; compare parsed count against reported total and warn on mismatch; load `completed.json` and warn on unmatched titles.
- `lib/log.js` — reuse for warnings (add a warn helper if absent).
- `src/data/tours.json` — regenerated; may gain tours currently missing (target ~131).
- `src/data/meta.json` — unchanged mechanism; still written on successful sync.
- `package.json` — may add a headless-browser driver dependency if the reliability evaluation selects it over lightweight HTTP.
- No UI changes — this is fetch-pipeline and reporting only.
