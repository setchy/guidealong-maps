# Tasks

## 1. Data migration

- [x] 1.1 Convert the 26 entries in `src/data/completed.json` from `{ title, completedDate }` to `{ url, completedDate }`, resolving each title 1:1 against `tours.json`; verify with a node one-liner that every `url` exists in `tours.json`, that no entry carries a `title` field, and that all `completedDate` values are preserved
- [x] 1.2 Add a dataset-consistency test (`test/completed-data.test.js`) asserting every `completed.json` URL exists in `tours.json` and no entry has a `title` field; verify `pnpm test` passes
- [x] 1.3 Update `CONTRIBUTING.md` — the `completed.json` example and guidance now use URL keying and explain the sync-time remap behavior; verify the documented example exactly matches the new format and the file is consistent

## 2. Render-layer matching (src/main.js)

- [x] 2.1 Change `loadCompletedTours` to build a `Set` of completed URLs from `entry.url` (keeping full records in `completedToursData`); verify by grep that no completed reader consumes `entry.title`
- [x] 2.2 Replace every title-based completed check — `computeFilteredTours`, card render status, `buildInfoContent` date, count footer, `getCompletedInfo`, Status group/sort, and the status column — with URL lookups (`completedUrls.has(t.url)` / find by `url`); verify `grep -n "ct\.title === \|includes(t\.title)\|\.title === title" src/main.js` returns nothing and the dev server renders a known completed tour (e.g. ACADIA) green with its completion date
- [x] 2.3 Confirm completed-date display and sorting still behave with `getCompletedInfo` keyed by URL, for dated vs. undated entries; verify via the Status grouping and "Sort by Completed date" controls in the running site

## 3. Fetch-time staleness resolution (lib/)

- [x] 3.1 Extend `lib/check-data.js` to key the completed-tour warning on URLs/slugs: accept completed entries with `url`, tokenize slug paths for similarity (reuse/adapt `tokenOverlap`), keep the 0.8 threshold plus a runner-up margin, and warn with stale URL + date + suggested successor; verify unit tests cover a stale-URL suggestion and a no-candidate case (`node --test`)
- [x] 3.2 Create `lib/completed.js` exporting `resolveCompletedStaleness(completed, tours, fetchImpl)` implementing redirect resolution: probe stale URLs with manual redirect handling, exact successor lookup, slug-similarity canonicalization (single high-confidence winner only), the non-Bundle gate, and write-back of remapped entries preserving entry order and `completedDate`; verify unit tests with a stub `fetchImpl` cover 301->exact remap, 301->similarity remap, 301->Bundle warn, 404 warn, and runner-up-tie warn
- [x] 3.3 Wire `resolveCompletedStaleness` into `lib/index.js` after `tours.json` is written, persisting `completed.json` only when entries changed, and add remapped/warned counts to the fetch summary; verify `node --test` passes and a dry run against the migrated `completed.json` reports 0 remaps and 0 warnings

## 4. Integration verification

- [x] 4.1 Run `pnpm lint` and `pnpm test`; verify both pass clean
- [x] 4.2 Run `pnpm fetch:tours` once and verify the summary reports 0 remapped / 0 requiring manual remap and `completed.json` shows no git diff, confirming the migration and resolution path are both stable