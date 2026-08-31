## Context

The tour sync pipeline lives in `lib/` as three phases (`index.js` orchestrates, `inventory.js`, `enrich.js`, `geocode.js` each handle one phase). All output goes through shared helpers in `lib/log.js`: `log`, `warn`, `error`, `sleep`. `index.js` also calls validation helpers in `lib/check-data.js`.

Currently everything renders as plain text. The design goal is cosmetic: better visual hierarchy for phase transitions, progress, and a final summary. No data behavior changes.

## Goals / Non-Goals

**Goals:**
- Colorize phase headers, progress counters, warnings, errors, and success lines
- Add a consolidated summary at the end of a run (total tours, category breakdown, per-phase stats)
- Keep it lightweight and TTY-aware (colors degrade gracefully when piped to a file)

**Non-Goals:**
- No new public API or package consumers — this is an internal CLI tool
- No behavior changes to the fetch/enrich/geocode logic itself
- No persistent logging (file logs, structured JSON output) — just nicer stdout

## Decisions

### 1. Use `picocolors` for terminal colors

**Rationale:** Side-effect-free, zero-dependency (so no transitive bloat), ~8KB, exports simple named helpers (`pc.bold`, `pc.cyan`, etc.). It auto-disables colors when stdout is not a TTY, so `pnpm fetch:tours > log.txt` yields clean plain text.

**Alternatives considered:**
- **Raw ANSI escape codes** — works but imperative and easy to get wrong (forgotten resets, no auto-TTY detection). Rejected for maintainability.
- **`chalk`** — widely used but heavier (~15KB+ with deps) and adds noise for such a small tool.
- **`kleur`** — similar to `picocolors`; either is fine. Chose `picocolors` for its tiny size and no-dependency guarantee.

### 2. Extend `lib/log.js` with colorized helpers

Keep existing `log`/`warn`/`error` signatures (they're called from many modules) but add new semantic helpers alongside them so call sites read clearly:

- `phase(title)` → bold + distinct color per phase (inventory=cyan, details=magenta, geocode=yellow)
- `progress(prefix, message)` → cyan `[i/n]` counter, normal message text
- `success(message)` → green
- `warn`/`error` → yellow/red (upgrade the existing ones)
- `summary(lines)` → renders the boxed summary block

Each helper composes via `picocolors` and may fall back to plain `log` when the caller doesn't want color.

### 3. Keep per-tour progress lines lightweight

The per-tour lines in `enrich.js` (`[3/12] Banff done (start=true...)`) and `geocode.js` (`[3/12] OK 51.0,-114.0`) get the `progress` treatment: cyan counter, rest left readable. This adds scannability without drowning the output or making long multi-hundred-line runs noisy.

### 4. Summary computed in `index.js` after all phases

Compute categories by iterating the final `tours` array and grouping by `category`. The summary prints total count, category breakdown, and per-phase stats (from values already logged: enrich counts, geocode ok/errors). Since the pipeline already writes `tours.json` and `meta.json`, the boxed summary is the last thing printed, giving a clean end-of-run visual.

### 5. Do not color the `check-data` warnings' logic — only their presentation

`warnOnTotalMismatch` and `warnOnUnmatchedCompleted` keep their logic; they only need to route through the new colored `warn`. No code restructuring of `check-data.js` beyond the log call it already makes.

## Risks / Trade-offs

- **[Colors lost when piped]** → `picocolors` auto-detects non-TTY and strips codes, so redirected output stays readable. No action needed.
- **[Config values duplicated across phases]** → Phase colors are centralized in `log.js` so the palette is consistent and easy to tune in one place.
- **[New dependency]** → `picocolors` is the smallest reasonable choice; it adds essentially no surface area and is pinned in `package.json`.
