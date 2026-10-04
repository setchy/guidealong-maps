# Design

## Context

- `src/data/completed.json` is hand-maintained, 26 entries of `{ title, completedDate }`; `src/main.js` matches them by exact `title` at render time across filter, grouping/sorting info, card status, and the status footer.
- `src/data/tours.json` has 140 tours, each with a unique `url`; the fetch pipeline (`lib/index.js`, `lib/inventory.js`) already treats `url` as the identity (dedupe, merge, retain), and `slugOf()` already exists in inventory.
- `lib/check-data.js` runs `warnOnUnmatchedCompleted(completed, titles)` after each sync using title-token overlap (GENERIC_TOKENS, 0.8 threshold) with suggestions only — no writes.
- Repo history confirms: display titles drift freely; walking-tour slugs were renamed (`/tour/old-faithful/` -> `/tour/yellowstone-old-faithful-geyser-basin-walk/`, etc.); and every retired slug on guidealong.com 301-redirects to its successor (verified 8/8, two targets typo'd vs. the canonical catalog slug).
- See proposal.md - Why for motivation.

## Goals / Non-Goals

**Goals:**
- Single durable identity for completed tours (URL), so title drift can never break the mapping.
- Match-by-URL at render time; no client-side heuristics.
- Sync-time resolution of stale completed URLs by following redirects, auto-remapping only unambiguous 1:1 non-Bundle successors.
- URL-keyed warnings with suggestions for everything not auto-remapped.

**Non-Goals:**
- No semantic inference for Bundles: "completed a constituent tour" is never auto-interpreted as "completed the Bundle". Bundle completion stays a separate human decision (as completed.json models today).
- No new scraping fields, no new dependencies, no authoritative ID beyond the URL (guidealong.com exposes no stable public post ID).
- No fuzzy matching at render time; similarity is a sync-time diagnostic only.

## Decisions

### D1: URL is the identity key in completed.json

Entry shape changes `{ title, completedDate }` -> `{ url, completedDate }`; `completedDate` stays optional/nullable. The `title` field is dropped.

- **Why**: The site renders titles from `tours.json`, so `completed.json` never needs a title for display; a mutable title field would reintroduce exactly the drift this change removes. JSON has no comments, so there is no way to keep a title "for readability" without it becoming stale.
- **Alternative considered**: keep `title` as an informational label. Rejected — driftable duplicate; the fetch-time warning already prints the resolved tour title alongside the URL, preserving human readability in pipeline output.

### D2: Render matching is a URL set lookup

`main.js` maintains `completedTours` as a `Set` of completed URLs (built from `completed.json`), while `completedToursData` keeps the full records. Every current `title === ...` site becomes a URL lookup: `completedUrls.has(t.url)` for status and `completedToursData.find((c) => c.url === t.url)` for the date. `getCompletedInfo` takes a `t.url` argument; existing call sites already have `t.url` in scope. No new client-side fetch or file.

### D3: Sync-time resolution follows redirects, auto-remap with gates

After `tours.json` is written in `lib/index.js`, build the catalog URL set and check each completed entry whose URL is absent:

1. Probe the stale URL with Node `fetch` (manual-redirect, `redirect: "manual"` or handling the response directly), reusing the inventory `User-Agent`. Only mismatched entries are probed — a normal sync does zero extra requests.
2. A 30x status with a `location` header is the site's mapping. Normalize (strip fragment/query/trailing slash) and look up the successor URL in the catalog.
3. If the successor URL is not an exact catalog URL (observed: typo'd redirect targets like `geyese` vs. catalog `geyser`), resolve via slug-similarity against catalog slugs — single high-confidence winner only (extend the existing token-overlap machinery to slug tokens; keep a confidence threshold and require a clear gap over the runner-up).
4. **Bundle gate**: if the resolved successor's catalog `category` is `Bundle` (or its title encodes bundle/combo), do not auto-remap; warn.
5. Auto-remap: rewrite that entry's `url` to the resolved catalog URL, preserving `completedDate`. Write `completed.json` back once if any entry changed (2-space indent + trailing newline, matching existing file conventions and `tours.json` output), keeping entry order stable for small git diffs.
6. Any entry with no redirect (404) or an unverified probe (403/network error) goes to the warning path — never auto-remapped.

The summary reports remapped vs. warned counts so the sync log and the git diff explain the write-back.

- **Alternative considered**: warnings-only (status quo of the archived change). Rejected — a confirmed redirect is machine-verified ground truth, unlike a similarity guess; the issue asks to *prevent* drift, not keep reporting it.
- **Alternative considered**: an `aliases.json` table consulted at render. Rejected — redirects make the site's mapping self-maintaining at sync time; a hand-maintained alias file is extra state with no benefit once completed.json itself is normalized.

### D4: Similarity/suggestion machinery is re-keyed to slugs

`tokenOverlap` currently tokenizes title text with GENERIC_TOKENS. Extend it (or add a slug-tokenizer) so suggestions and the D3.3 canonicalization compare slug tokens (`/tour/old-faithful/` -> `{old, faithful}`, catalog `yellowstone-old-faithful-geyser-basin-walk` -> `{yellowstone, old, faithful, geyser, basin, walk}`; overlap 1.0). Keep the 0.8 threshold and add a runner-up margin so only an unambiguous winner is suggested or auto-applied.

### D5: Completed-tour diagnostics move to the completed-tour-identity capability

`warnOnUnmatchedCompleted` re-keys from titles to URLs/slugs (stale URL, completion date, suggested successor). The `fetch-data-warnings` capability keeps only dataset-total mismatch; the completed-tour warning requirement is removed from it in this change (see delta spec) since the behavior relocated.

### D6: Bundle redirects stop and warn

If guidealong.com ever 301s an individual tour URL *into* a Bundle page (absorption), the bundle gate (D3.4) surfaces it as a warning instead of silently changing what "completed" means. The successful observed redirects were 1:1, non-bundle — this gate is defensive now and correctness-preserving later.

## Risks / Trade-offs

- [Redirect probes hit the site] -> Probing happens only for mismatched entries (not a normal full scan); paced with delays and reusing the inventory UA headers; a blocked/403 probe is treated as unverified and warned, never cascading.
- [Redirect target differs from canonical catalog slug (typos observed)] -> Similarity step (D3.3/D4) resolves to the canonical catalog URL; only a single high-confidence winner is applied, otherwise warn with suggestion.
- [Auto-remap writes a hand-edited file `completed.json`, which the prior change deliberately avoided] -> Strict gates (confirmed 301 + unique 1:1 + non-Bundle + exact-or-high-confidence resolution) and a sync summary that reports every write; git diff makes the change auditable.
- [Persistent 404 entries would warn every sync (noise)] -> A genuinely dead tour needs owner attention; the warning names it and its date, and the count summary keeps it compact.
- [Similarity misfires if two catalog slugs tie] -> Runner-up margin (D4) required; ties fall through to the warning path with both candidates suggested.

## Migration Plan

- **Deploy**: no runtime deploy (static site). The change itself includes the migration: rewrite `completed.json`'s 26 entries from title to URL (all resolve 1:1 against the current catalog — verified no human judgment needed). Render and sync code update in the same change.
- **Verify**: run `pnpm fetch:tours` after the migration — expect zero warnings and zero remaps (every completed URL exact-matches), plus an intact empty summary. Exercise the resolution path in tests with a fabricated stale URL (unit tests for the resolver + warning formatter).
- **Rollback**: `git revert` restores the title-keyed file and matching; no data loss since completedDate is preserved throughout. No backward-compatibility shim in `main.js` is warranted for a 26-entry internally-owned file.

## Open Questions

None that would change the specs, approach, or tasks. The one future unknown — a redirect pointing into a Bundle — is handled by a defined gate (D3.4/D6), and per-side 404 semantics are defined (warning path).