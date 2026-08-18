## 1. Inventory phase

- [x] 1.1 Create `lib/inventory.js`: parse page 1 of `/tour-list/` (tours + reported total + pagination settings), fetch pages 2..N via `admin-ajax.php`, de-dup by URL
- [x] 1.2 Union inventory with existing `tours.json` (add new tours, keep existing ones not returned, merge missing detail/geocode fields from existing), preserve the count-mismatch warning
- [x] 1.3 Keep the optional `FETCH_DRIVER=browser` headless driver behind the same interface (load `/tour-list/`, click through pagination, scrape)
- [x] 1.4 Verify: running inventory alone leaves `tours.json` count at 131 and adds no duplicates

## 2. Details phase (incremental)

- [x] 2.1 Create `lib/enrich.js`: compute work set = tours with missing `start`/`location`; fetch each `/tour/<slug>/` as plain HTML; parse with cheerio
- [x] 2.2 Add pacing: configurable base delay between requests (e.g. 1–2s)
- [x] 2.3 Add exponential backoff on 403/firewall (bounded retries, stop with warning when exhausted)
- [x] 2.4 Persist each tour to `tours.json` as it completes (per-tour resume)
- [x] 2.5 Verify: second run skips tours already enriched; a simulated 403 mid-batch stops gracefully and the next run resumes

## 3. Geocode phase (isolated)

- [x] 3.1 Move `geocode-tours.js` → `lib/geocode.js`; compute work set = tours missing coordinates only
- [x] 3.2 Verify: geocode runs only for tours without lat/lng and leaves the rest untouched

## 4. Orchestrator + cleanup

- [x] 4.1 Rewire `lib/index.js` to run inventory → details → geocode in order, then completed.json warnings
- [x] 4.2 Delete `lib/fetch-tour-list.js`, `lib/enrich-tour-details.js`, `scripts/merge-tours.js`, and the `mergeExistingDetails` function
- [x] 4.3 Run `pnpm lint` and fix issues

## 5. Verification

- [x] 5.1 Run the full `pnpm fetch:tours`; confirm 131 tours retained and no data loss
- [x] 5.2 Confirm details/geocode resume behavior across two runs
- [x] 5.3 Confirm dataset-total and completed.json warnings still appear as expected
