## Context

The current `fetchTourList()` only parses page 1 of `https://guidealong.com/tour-list/` (the static HTML renders ~100 of the "131 Results Found"). Investigation found:
- The site's pagination is **AJAX-only**: page-number links carry `data-ajax-name="paged"` and no `href`; page 2+ load via `admin-ajax.php` (`tourmaster_tour_ajax`). There is no URL-based pagination.
- The site's Inkline firewall **403s `admin-ajax.php` (and `/wp-json/`, sitemaps) from script clients and headless Chromium** on a flagged IP, while real interactive browsers pass. So relying on a single lightweight HTTP driver is fragile.
- Data is fetched from a **single source: `/tour-list/`** (page 1 static HTML + its own AJAX pagination for later pages). No crawling of individual tour pages or secondary sources.

See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Fetch all pages of `/tour-list/` so `tours.json` matches the site's total (~131)
- Use `/tour-list/` as the single source of tour data (page 1 + its pagination)
- Avoid triggering the firewall; stop gracefully rather than hammering if blocked
- Warn on dataset-total mismatches and on `completed.json` titles with no dataset match
- Keep the change self-contained in `lib/`

**Non-Goals:**
- No UI changes
- No changes to geocoding/enrichment behavior or the `tours.json`/`meta.json` schema
- No auto-remapping of `completed.json` — warnings only, since renames need human confirmation
- **No secondary data sources** — no crawling individual tour pages, no REST/sitemap/other endpoints

## Decisions

### D1: Page 1 from static HTML; remaining pages via `/tour-list/`'s own pagination
Parse page 1 from `/tour-list/` static HTML (as today). Read the reported total ("N Results Found") and pagination (`data-settings`, `num-fetch`) from the page, then request pages 2..N using the site's own pagination mechanism (`admin-ajax.php` action `tourmaster_tour_ajax` with the page's `settings` object and `option {name:"paged", value:i}`). Parse each response's `content` with cheerio and merge, de-duplicating by URL.
- **Rationale**: mirrors the site's own behavior and keeps `/tour-list/` as the single source; preserves existing parsing logic. The pagination is AJAX-only — page-number links have `data-ajax-name` and no `href`, and there is no URL-based page 2.
- **Alternative considered**: WordPress REST API, sitemaps, crawling individual tour pages — all rejected (firewall-blocked or secondary sources; the change is single-source by requirement).

### D2: Reliability driver — lightweight HTTP with browser-like headers, with a browser fallback
The deciding evidence: raw Node fetch to `admin-ajax.php` gets blocked from a flagged IP, but a real browser session does not. So:
1. **Primary**: Node `fetch` with browser-like `User-Agent`, `Referer: https://guidealong.com/tour-list/`, `Origin`, and `X-Requested-With`. Space requests by a configurable delay and stop on a 403/firewall response, warning instead of retrying.
2. **Fallback** (`FETCH_DRIVER=browser`): drive a headless Chromium via Playwright — load `/tour-list/`, click each page number, scrape rendered tour items. Same single source, different transport.
- **Rationale**: lightweight-first keeps the dependency footprint small; the browser fallback is the escalation if blocking persists, still fetching only `/tour-list/`.
- **Trade-off**: adds `playwright-core` as a devDependency only for the fallback; the driver is swappable behind one function.

### D3: Count mismatch warning from the reported total
Extract the reported total from the page (e.g. the "131 Results Found" element). After merging all pages, if `parsedCount !== reportedTotal`, log a warning with both numbers and the delta. This is purely advisory; the sync still writes whatever was parsed.
- **Alternative considered**: hard-failing on mismatch — rejected; a mismatch may be benign and shouldn't block the sync.

### D4: completed.json remap warnings
After building the tour list, load `completed.json`, and for each entry with no exact title match in `tours.json`, emit a warning. Attempt a token-overlap title-similarity match to suggest a likely renamed equivalent. Missing/unreadable `completed.json` is silently skipped.
- **Alternative considered**: auto-rewriting `completed.json` — rejected; renames need human confirmation (see Non-Goals).

### D5: New `warn()` log helper
Add `warn(msg)` to `lib/log.js` (distinct from `log`/`error`) so warnings stand out in output.

## Risks / Trade-offs

- [Firewall blocks `admin-ajax.php` from the running client/IP] → Mitigation: the browser fallback (D2) is the escalation; the script surfaces a clear warning and stops gracefully. From a non-flagged IP/CI the lightweight driver should work.
- [AJAX response shape changes (tourmaster/WordPress update)] → Mitigation: parse defensively (extract `h3 a[href*=tour/]` from `content`), and the count-mismatch warning (D3) catches silent loss.
- [Delays slow the sync] → Trade-off accepted: a few seconds per page is minor vs. getting IP-blocked. Delays are configurable.
- [Similarity hint may suggest a wrong rename] → Mitigation: it's a hint in a warning, not an automatic change; exact match is always preferred.

## Migration Plan

1. Add `warn()` to `lib/log.js` (done).
2. Rework `fetchTourList()` to paginate `/tour-list/`: page 1 static + pages 2..N via the site's AJAX, de-duplicating by URL, with configurable delay and graceful stop on block. Browser driver as the fallback.
3. In `lib/index.js`: pass reported total + parsed count to a warning check; add the `completed.json` comparison (done).
4. Run the sync; verify `tours.json` count matches the reported total and warnings appear as expected.

## Open Questions

None — requirements and approach are settled. The change fetches all pages of `/tour-list/` from that single source.


