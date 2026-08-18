## 1. Markup

- [x] 1.1 Add a `.sheet-handle` grab element at the top of `#controls` in `src/index.html`, plus a chevron affordance for expand/collapse
- [x] 1.2 Confirm the controls DOM order (header → search → filters → group & sort → tours → footer) supports the sheet; adjust only if needed

## 2. Styles: bottom sheet on mobile

- [x] 2.1 Replace the `@media (max-width:600px)` block in `src/styles.css` with `#controls` as `position:fixed; bottom:0; left:0; right:0`, top-rounded corners, and `overflow-y:auto`
- [x] 2.2 Add peek state (~38% of `100dvh`) and expanded state (~90% of `100dvh`) via a class (e.g. `.expanded`), with a transition
- [x] 2.3 Make the map use `height:100vh; height:100dvh;` so it isn't clipped behind mobile browser chrome
- [x] 2.4 Hide the mobile-only `⌘K` hint; keep the search input usable on mobile
- [x] 2.5 Ensure open filter dropdowns render above the sheet content (z-index / scroll handling)

## 3. Behavior

- [x] 3.1 Wire the handle/chevron toggle in `src/main.js`: tap toggles peek ↔ expanded, updates `aria-expanded`/`aria-hidden` where applicable
- [x] 3.2 Confirm the map does not scroll when the sheet is expanded (sheet scrolls internally, tour list keeps its internal scroll)
- [x] 3.3 Verify no desktop regression: the floating 320px panel is unchanged above 600px

## 4. Verification

- [x] 4.1 Run `pnpm lint` and fix any issues
- [x] 4.2 Manual browser test (device emulation ~375px): map visible on load, peek shows search + toggles, expand shows full controls, list scrolls internally, map doesn't scroll when sheet open, desktop layout unchanged
