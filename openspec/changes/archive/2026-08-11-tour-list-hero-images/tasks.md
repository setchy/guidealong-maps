## 1. Hero image capture (inventory)

- [x] 1.1 In `lib/inventory.js` `parseTourItem`, locate the tour's item container via `closest('.tourmaster-tour-medium-inner, .tourmaster-item-list, .tourmaster-tour-medium')` and select its first `<img>`.
- [x] 1.2 Read the hero image URL from `data-lazy-src` → `data-src` → `src`, ignoring `data:` SVG placeholder srcs, and resolve relative URLs against `https://guidealong.com`.
- [x] 1.3 Strip the WordPress size suffix (`-\d+x\d+(?=\.[a-z]+$)`) to prefer the full-size hero, keeping the URL unchanged when the pattern doesn't match.
- [x] 1.4 Store the resulting URL in `details.thumbnail` (leave empty when no usable image is found).

## 2. Data preservation

- [x] 2.1 In `lib/index.js`, add `thumbnail` to the existing-details merge key list so existing tours keep/backfill heroes across partial runs.

## 3. Map pin popover rendering

- [x] 3.1 In `src/main.js` `buildInfoContent`, render the hero image at the top of the popover when `d.thumbnail` is present, with `alt` set to the (attribute-escaped) tour title, `loading="lazy"`, and `width: 100%` styling consistent with the existing popup markup.
- [x] 3.2 Keep the existing text-only popover layout when `d.thumbnail` is empty or missing (no image, no error).

## 4. Regenerate data and verify

- [x] 4.1 Run `pnpm fetch:tours` to regenerate `src/data/tours.json` with populated `details.thumbnail` values.
- [x] 4.2 Verify every non-empty `details.thumbnail` is an absolute URL, matches its tour's slug/title, and that `tours.json` remains sorted by title.
- [x] 4.3 Run `pnpm lint` and confirm no lint errors.
