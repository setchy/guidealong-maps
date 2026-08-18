## Context

The current pipeline fuses inventory discovery, per-tour detail enrichment, and geocoding into `lib/index.js` with helper modules (`fetch-tour-list.js`, `enrich-tour-details.js`, `geocode-tours.js`). Experience over the last session showed: (1) the site's Inkline firewall rate-limits by IP — both plain `fetch` and headless Chromium get 403s, while a real interactive browser (or a non-flagged IP) passes; (2) a 131-request detail batch re-triggers the firewall mid-run; (3) `mergeExistingDetails` was added to survive partial failures, and `scripts/merge-tours.js` was a one-off paste helper. `tours.json` currently holds 131 tours (100 page-1 + 31 merged page-2), 101/131 with `location`, 128/131 geocoded. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Three independent, resumable phases: inventory → details → geocode
- Each phase only processes tours still needing its output
- Rate-limit-aware detail fetching (pacing + exponential backoff + graceful stop)
- Remove unused/bolted-on code: `mergeExistingDetails`, `scripts/merge-tours.js`, and the browser driver if not the effective path
- Keep the existing dataset-total and completed.json warnings

**Non-Goals:**
- No UI changes
- No change to the `tours.json` schema
- No new data source for the catalog (still `/tour-list/` only)
- No change to geocoding semantics (Google Maps SDK, as today)

## Decisions

### D1: Three modules, one thin orchestrator
```
lib/index.js            thin runner: inventory → details → geocode
lib/inventory.js        Phase 1: URL/title discovery from /tour-list/ (+ total)
lib/enrich.js           Phase 2: per-tour detail fetch (start/location/...)
lib/geocode.js          Phase 3: Google Maps for missing coords
lib/check-data.js       warnings (unchanged)
lib/log.js              logging (unchanged)
```
Each phase reads `tours.json`, computes its own work set (tours missing that phase's data), processes, and writes back.
- **Rationale**: separates the workloads with very different rate-limit budgets; a phase can be run/instrumented on its own; the orchestrator stays trivial.
- **Alternative considered**: keeping the current single script with flags — rejected; the fused script is what caused the firewall/data-loss problems.

### D2: Incremental work-set per phase (union is a field-merge, not replace)
```
inventory:  URL set from /tour-list/  → union with existing tours:
              - add new URLs
              - keep existing tours not returned (pagination blocked)
              - merge missing detail/geocode fields from existing for common URLs
details:    tours where start==="" and location===""  → fetch each page
geocode:    tours where lat==null or lng==null       → geocode each
```
The inventory union MUST merge per-field (fill missing `start`/`location`/`duration`/`audioPoints`/`tourType`/`description` and geocode from the previous file) because inventory builds fresh objects with empty details; without the merge a page-1 tour's enriched data is wiped on every run. This is not the old `mergeExistingDetails` glue — it is the inventory phase's defined upsert behavior, and it runs before details/geocode so retained tours are also enriched.
- **Rationale**: resumability by construction; a partial/blocked run leaves completed work intact and the next run finishes the rest.
- **Alternative considered**: replacing existing entries wholesale on union — rejected; that is what caused the data-loss bug.

### D3: Detail fetching: plain `fetch` + cheerio, with pacing + backoff
Tour pages are server-rendered static HTML; cheerio parses `Location:`/`Start:` spans without a browser or AJAX. Fetching uses:
- configurable base delay between requests (e.g. 1–2s)
- exponential backoff (e.g. ×2 up to a cap) on 403/firewall responses, bounded retries
- graceful stop with a warning when retries are exhausted
- each tour saved to `tours.json` as it completes (so resume is per-tour)
- **Rationale**: empirically, both plain fetch and headless Chromium are 403'd by the firewall; fetch+cheerio is lighter, dependency-free for details, and resumable. A browser adds extraction value only if JS rendering were required (it isn't here).
- **Alternative considered**: Playwright browser for details — rejected as the primary path (also 403'd, heavier); kept only as an optional fallback if a future site change requires JS.

### D4: Inventory keeps `admin-ajax.php` pagination + browser driver optional
Page 1 is static HTML. Pages 2..N use the site's `tourmaster_tour_ajax` endpoint with the page's settings (as today). The existing headless-browser driver is retained as an optional `FETCH_DRIVER=browser` fallback (it was verified to work from a non-flagged context) but is not the default.
- **Rationale**: inventory is cheap (≈2 requests); the AJAX path mirrors the site and works when not blocked. The browser driver stays behind the same interface for environments where http is blocked.
- **Alternative considered**: dropping the browser driver entirely — rejected; it's already written and may help in CI/non-flagged runs, but it is not the default path.

### D5: Remove `scripts/merge-tours.js`
The page-2 tours it merged are already in `tours.json` (131 total). The inventory phase now handles the full set; the paste helper has no ongoing role.
- **Rationale**: dead code after the refactor; removing reduces surface area.

## Risks / Trade-offs

- [Firewall blocks detail pages mid-batch] → Mitigation: per-tour persistence + exponential backoff + resume next run; no data loss, bounded retries.
- [Inventory AJAX blocked (as seen) → only 100 of 131 fetched natively] → Mitigation: inventory unions with existing `tours.json`, so the 31 merged page-2 tours are retained; count-mismatch warning flags the gap. A non-flagged IP/CI run fills it natively.
- [Backoff makes slow runs slower] → Trade-off accepted: a slower run that completes is better than a fast one that gets IP-blocked and loses work.
- [Removing the merge helper could drop tours if inventory returns fewer than expected] → Mitigation: D2's inventory step is a union (add new, keep existing), not a replace.

## Migration Plan

1. Add `lib/inventory.js` (move + simplify list/pagination logic from `fetch-tour-list.js`; union with existing `tours.json`).
2. Add `lib/enrich.js` (move + incrementalize `enrich-tour-details.js`; add pacing/backoff/per-tour save).
3. Move `geocode-tours.js` → `lib/geocode.js` (incremental work-set only).
4. Rewire `lib/index.js` to call the three phases; delete `fetch-tour-list.js`, `enrich-tour-details.js`, `scripts/merge-tours.js`, and `mergeExistingDetails`.
5. Run `pnpm fetch:tours`; confirm 131 tours retained, details/geocode resume behavior, and warnings still fire.

## Open Questions

None — approach is settled. Whether the optional browser inventory driver is exercised depends on the firewall at run time; both paths are designed.
