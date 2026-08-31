## 1. Dependency

- [x] 1.1 Add `picocolors` dependency to `package.json` and verify `pnpm install` succeeds

## 2. Colorized logging helpers

- [x] 2.1 Extend `lib/log.js` with colorized helpers — `phase`, `progress`, `success`, and a `summary` box helper using `picocolors` — and verify the module loads (`node -e "require('./lib/log')"`)
- [x] 2.2 Route the existing `warn` output through yellow and `error` through red, wrapping the same messages, and verify a manual call displays the color codes

## 3. Phase and progress colorization

- [x] 3.1 Update `lib/index.js` phase announcement lines to use the `phase` helper (inventory=cyan, details=magenta, geocode=yellow) and the final "Saved" lines to use `success`, then verify `pnpm fetch:tours` prints colored phase headers
- [x] 3.2 Update `lib/enrich.js` per-tour lines to use `progress` (cyan counter) and the completed/blocked summary to stay readable, then verify output for a run with pending tours
- [x] 3.3 Update `lib/geocode.js` per-tour geocode attempts/results to use `progress`, then verify output for a run requiring geocoding
- [x] 3.4 Update `lib/inventory.js` pagination warnings to route through the colored `warn`, then verify warnings render yellow

## 4. Consolidated fetch summary

- [x] 4.1 In `lib/index.js`, after all three phases and the file writes, compute a category breakdown from the final `tours` array and print a boxed summary (total tours, category counts, per-phase stats) using the `summary` helper, then verify `pnpm fetch:tours` prints the summary block last

## 5. Verification

- [x] 5.1 Run `pnpm fetch:tours` and confirm: colored phase headers, colored progress counters, yellow warnings, red errors (if any), a green success save, and the boxed summary at the end — with plain (uncolored) output when piped to a file
