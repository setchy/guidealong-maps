## 1. Warnings infrastructure

- [x] 1.1 Add a `warn(msg)` helper to `lib/log.js` (styled distinctly from `log`/`error`)

## 2. Paginated fetch from /tour-list/ (single source)

- [x] 2.1 Parse the reported total (e.g. "131 Results Found"), pagination settings, and page count from the static `/tour-list/` page
- [x] 2.2 Implement page-1 parsing (existing logic) returning tours plus reported total + settings
- [x] 2.3 Implement the page-fetch driver: fetch page N via the site's `/tour-list/` pagination (`tourmaster_tour_ajax` + settings + `option {name:"paged", value:N}`) with browser-like headers, parse `content` with cheerio
- [x] 2.4 Merge pages, de-duplicating by tour URL; space requests with a configurable delay
- [x] 2.5 Stop gracefully with a warning if a request is blocked (403/firewall response); do not retry aggressively
- [x] 2.6 Provide a browser fallback driver (`FETCH_DRIVER=browser`) that loads `/tour-list/` in headless Chromium and clicks through the same pagination (still single-source)
- [x] 2.7 Wire driver selection into `lib/index.js`
- [x] 2.8 Add `mergeExistingDetails` in `lib/index.js` so a partial/blocked fetch never drops tours or wipes existing detail/geocode fields (runs before enrichment so retained tours are also enriched)
- [x] 2.9 Merged the 31 page-2 tours (pasted HTML) into `tours.json`; count now 131 matching the site total

## 3. Dataset total warning

- [x] 3.1 After merging, compare parsed count vs reported total; emit a warning showing both when they differ
- [x] 3.2 Verify: with a full fetch the counts match (no warning); simulate a mismatch to confirm the warning appears

## 4. completed.json remap warnings

- [x] 4.1 Load `completed.json`; for each title with no exact match in `tours.json`, emit a warning listing the unmatched title and date
- [x] 4.2 Add a token-overlap similarity hint to suggest likely renamed equivalents in `tours.json`
- [x] 4.3 Skip silently (no warning, no error) when `completed.json` is missing or unreadable
- [x] 4.4 Verify: current `completed.json` entries (e.g. Hawaii renames already applied) produce no warnings; an intentionally-broken title produces one

## 5. Verification

- [ ] 5.1 Run the full sync and confirm `tours.json` count matches the site-reported total (~131) — 131 confirmed; page-2 AJAX still firewall-blocked so a full automated fetch yields 100 and retains 31 from the existing file
- [x] 5.2 Run lint (Biome) and fix issues
- [ ] 5.3 Confirm no firewall block is triggered during a normal run (spacing + headers effective) — the 131-page batch enrichment triggers the rate limiter; enrichment needs gentler pacing or the browser driver

## 6. Known gaps (firewall-limited)

- [ ] 6.1 ~30 tours still missing `start`/`location` (bundles + pages 403'd mid-batch); re-run enrichment from a non-flagged IP or via the browser driver once the block lifts
- [ ] 6.2 Page-2 fetch via `admin-ajax.php` still 403 from this IP; the merged 31 tours carry the catalog, but a future run should fetch them natively
