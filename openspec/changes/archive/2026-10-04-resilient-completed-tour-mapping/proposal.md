# Proposal

## Why

`completed.json` records completed tours by **title**, and the site matches them against `tours.json` by exact title. GuideAlong renames, repacks, and bundles tours frequently, so titles drift and completed-tour highlighting silently disappears. Repo history shows both display titles *and* tour slugs change over time, but the slug (URL) is far more stable, and when an old URL dies the site itself 301-redirects it to its successor. Matching by title is the fragile link.

## What Changes

- **`completed.json` entries are keyed by URL instead of title** — `{ "url": "...", "completedDate": "..." }` (**BREAKING** data-format change to the file; the fetch pipeline and render layer update in the same change, so nothing external depends on the old shape).
- **Render-time matching switches from title to URL**: a tour shows as completed when its `tours.json` URL matches a completed entry.
- **Fetch-time staleness resolution**: when a completed URL no longer matches `tours.json`, the pipeline detects it and follows the URL's HTTP redirect. An unambiguous 1:1 successor that exists in the catalog and is **not a Bundle** is auto-written back into `completed.json`. Ambiguous cases (404, Bundle successor, canonical-catalog mismatch) emit a warning with a suggested successor for manual remap — no silent drift.
- **The completed-tour warning moves from title-based to URL-based** and reports whether a stale entry was auto-remapped or needs manual attention.
- **Existing completions are migrated 1:1** from title to URL in one step — all 26 current entries resolve to a unique tour today, so no human judgment is needed for the migration.

## Capabilities

### New Capabilities

- `completed-tour-identity`: governs how completed-tour records identify and match tours in the catalog — the URL identity contract for `completed.json`, match-by-URL at render time, and fetch-time resolution of stale URLs (redirect-following, auto-remap of unambiguous non-Bundle successors, and warnings for ambiguous cases).

### Modified Capabilities

- `fetch-data-warnings`: its requirement "Warn on completed.json entries with no dataset match" is superseded — title-based completed-tour matching and warnings move to the new `completed-tour-identity` capability, which owns both the matching and its diagnostics. The dataset-total mismatch requirement is unchanged.

## Impact

- `src/data/completed.json` — format change plus a one-time migration of the 26 existing entries (title -> URL).
- `src/main.js` — completed matching changes from `title` to `url` (load, filter, group/sort info, info-content, status).
- `lib/check-data.js` — completed-tour warning re-keyed to URLs; token-overlap suggestion logic applied to slugs for canonical-mismatch cases.
- `lib/index.js` — staleness check on completed URLs; HTTP redirect following; auto-remap write-back to `completed.json`; shifted warning/summary reporting.
- `CONTRIBUTING.md` — document the new `completed.json` format.
- No new dependencies; uses the existing Node `fetch` and the existing slug/token machinery.