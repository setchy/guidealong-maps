## Context

`lib/inventory.js` parses `/tour-list/` (accessible — HTTP 200) into tour objects with an always-empty `details.thumbnail`. The map popover (`buildInfoContent` in `src/main.js`) renders text only. The prior `tour-hero-images-for-map-pins` change tried to pull heroes from individual `/tour/<slug>/` pages, but those are 403-blocked by the site firewall; the tour-list is not, so heroes are captured there instead. See proposal.md for motivation.

Verified against the live tour-list:
- 100/100 list items expose a hero `<img>`.
- Real URLs live in `img[data-lazy-src]`; a minority already have a real `img[src]` (most use an SVG lazy-load placeholder).
- The image sits in `.tourmaster-tour-medium-inner` (reached via `closest('.tourmaster-tour-medium-inner, .tourmaster-item-list, .tourmaster-tour-medium')`), NOT in the `closest('div')` that `parseTourItem` currently uses for text fields.
- Stripping the `-{w}x{h}` suffix (e.g. `Classic-Southwest-800x900.jpg` → `Classic-Southwest.jpg`) yields the full-size hero; stripped URLs return HTTP 200 `image/jpeg`.

## Goals / Non-Goals

**Goals:**
- Capture a per-tour hero image URL from the tour-list page during inventory and store it in `details.thumbnail`.
- Show the hero at the top of the map pin popover, falling back to the current text-only layout when absent.
- Keep `tours.json` sorted (already handled by the existing up-front sort in `lib/index.js`).

**Non-Goals:**
- No downloading of images — the remote URL is stored and hotlinked (tour-list and `wp-content/uploads` are both reachable, so no firewall workaround needed).
- No crop/resize/format conversion — store the full-size hero as provided by GuideAlong.
- No hero images in the tour list rows (popover only).
- No changes to the firewall-blocked tour-detail enrichment path.

## Decisions

**1. Capture the hero URL in `parseTourItem` (inventory), not enrichment.**
The tour-list is the only reachable source, and it's already parsed during inventory. Enrichment (`lib/enrich.js`) only handles `start`/`location` from detail pages and must stay untouched. Selector: climb from the title link to the item container via `closest('.tourmaster-tour-medium-inner, .tourmaster-item-list, .tourmaster-tour-medium')`, take the first `<img>`, and read `data-lazy-src` → `data-src` → `src` (ignoring `data:` placeholder srcs).
- Alternative considered: deriving hero URLs from detail pages (`og:image`) — rejected: detail pages are 403-blocked.

**2. Strip the WordPress size suffix for the full-size hero.**
WordPress serves sized variants as `name-{w}x{h}.ext`. Replace `-\d+x\d+` immediately before the extension (e.g. `-800x900.jpg` → `.jpg`). Only apply when the pattern matches; otherwise keep the URL as-is. Verified stripped URLs resolve.
- Alternative considered: using the sized `-800x900` URL directly — simpler but lower quality in a large popover.

**3. Store the remote URL in `details.thumbnail` and preserve it via the existing merge.**
`details.thumbnail` is the reserved field the popover reads. Add `thumbnail` to the existing-details merge key list in `lib/index.js` so already-scraped tours keep/backfill heroes across partial runs. No new schema — the field already exists and always renders as an empty string today.
- Alternative considered: local download (as the deferred change planned) — rejected because detail-page fetches needed for `og:image` are blocked.

**4. Render in `buildInfoContent`.**
Prepend a sized `<img src="<thumbnail>">` with `alt` = tour title and `loading="lazy"`, using small inline `style` consistent with the existing popup markup. `loading="lazy"` defers loading until the popover opens; empty `thumbnail` short-circuits to today's text-only layout. Escape the title for the `alt` attribute (the value is scraped site content).

## Risks / Trade-offs

- [Hotlinking GuideAlong's CDN] → URLs are absolute and load fine (verified 200); the site is static and can't easily mitigate hotlink breaks except by a broken image. Acceptable per the "save the image src" requirement; can be replaced with local downloads later.
- [Image fails to load / URL rotates] → The `<img>` falls back to the text-only layout visually (broken image icon at worst). Captured URLs are re-scraped on every fetch run, so `tours.json` self-heals on the next sync.
- [Some list items lack images] → `thumbnail` stays empty and the popover renders unchanged (spec'd).
- [Only page 1 of the tour-list is parsed today (~100 of ~131 tours)] → Existing inventory behavior (full-set discovery is tracked by the in-progress `fetch-all-tours-with-warnings` change); this change adds hero capture per item for whatever items inventory returns.

## Migration Plan

- Static deploy: regenerate `tours.json` via `pnpm fetch:tours`, ship the updated JSON (no binary assets). Rollback: revert the `buildInfoContent` change and/or clear `thumbnail` in `tours.json` — stale URLs are harmless if the popover ignores them.

## Open Questions

None.
