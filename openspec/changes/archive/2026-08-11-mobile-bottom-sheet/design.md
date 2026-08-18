## Context

On desktop, `#controls` is a floating 320px panel (`position:absolute; top:10px; left:10px`) over a full-viewport map. The mobile `@media (max-width:600px)` rule only widens it to `calc(100% - 20px)` and makes it scrollable — so on a phone it covers essentially the whole screen and the map is invisible. The map uses `height:100vh`, which on mobile browsers includes the URL-bar area and clips the bottom. The controls DOM is already ordered sensibly (header → search → filters → group & sort → tours → footer), and Filters/Group & Sort already start collapsed. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Map always visible on mobile, with controls as a bottom sheet (peek + expanded)
- Sheet scrolls internally; map doesn't scroll when sheet is open
- Fix `100vh` clipping via dynamic viewport height
- Desktop layout completely unchanged

**Non-Goals:**
- No drag-to-resize gestures in v1 (tap/handle/chevron only) — avoids map-pan gesture conflicts and keeps scope small
- No changes to filters, group/sort, tour list rendering, or map markers
- No tablet-specific layout (the 600px breakpoint is reused as-is)

## Decisions

### D1: Tap-only sheet toggle (no drag in v1)
Expand/collapse via a grab handle + chevron button on the sheet. No pointer-drag resize.
- **Rationale**: a draggable sheet needs pointer capture, velocity/snap logic, and — the hard part — distinguishing "drag the sheet" from "pan the map" (both vertical). Tap-only sidesteps that entirely and is robust on mobile.
- **Alternative considered**: full drag-to-resize — deferred; can be layered on later if the tap UX feels lacking.

### D2: Peek ≈ 38% of `100dvh`, expanded ≈ 90%
Peek shows search + the three section toggles; expanded shows everything with the tour list scrolling. Both keep a visible map strip at top.
- **Rationale**: 38% fits search + toggles comfortably while leaving ~62% map; 90% leaves the map's top strip (and map controls) reachable.
- **Alternative considered**: fixed px heights — rejected; `dvh`-relative heights adapt to phone/variable viewports.

### D3: Sheet is `position: fixed` at bottom on mobile
`#controls` becomes `position:fixed; bottom:0; left:0; right:0` with the two height states, `border-radius` top corners, and `overflow-y:auto` on the sheet body. The tour list keeps its own scroll but within the sheet's scroll container (no nested-fight: sheet scrolls, list scrolls, map fixed).
- **Rationale**: fixed positioning is the simplest reliable sheet; the existing collapsible sections work unchanged inside it.
- **Alternative considered**: transforming `#controls` to `position:absolute` within a full-viewport map container — rejected; fixed is simpler and the map is already full-viewport.

### D4: Map height `100dvh` (fallback `100vh`)
Set `#map { height: 100vh; height: 100dvh; }` so modern mobile browsers use the dynamic viewport. The map stays full-screen behind the sheet.
- **Rationale**: fixes the URL-bar clipping bug without JS.
- **Alternative considered**: JS-driven height on `resize`/`visualViewport` — rejected; `dvh` is the standard, supported fix.

### D5: Add a handle element + simplify mobile header
Add a small grab handle (`.sheet-handle`) at the top of `#controls`, shown only on mobile. On mobile, hide the `⌘K` hint (no keyboard) and consider hiding the footer/last-synced or letting it scroll within the sheet.
- **Rationale**: minimal DOM addition; desktop is unaffected since the handle is mobile-only CSS.
- **Alternative considered**: reusing the existing filters-toggle as the expand trigger — rejected; a dedicated, obvious handle is clearer.

### D6: Dropdown layers above the sheet
Filter dropdowns are `position:absolute` inside `.dropdown`. With the sheet scrolling, ensure open dropdowns aren't clipped by `overflow` — keep `z-index` above the sheet body and accept in-sheet scrolling for long lists.
- **Rationale**: dropdowns within a scrolling sheet are acceptable; a full `position:fixed` popover is overkill for v1.

## Risks / Trade-offs

- [Tap-only feels less native than drag] → Acceptable for v1; drag can be layered later without changing the sheet's structure.
- [Expanded sheet covers most of the map] → The top strip stays visible and the map remains interactive; users can collapse quickly.
- [Nested scroll (sheet + tour list)] → The tour list already scrolls internally; within the sheet body this is one scroll container with a child that also scrolls — standard and acceptable.
- [100dvh browser support] → Progressive: `100vh` declared first, `100dvh` overrides where supported.

## Migration Plan

1. Add `.sheet-handle` element to `#controls` in `index.html`.
2. Rewrite the `@media (max-width:600px)` block in `styles.css` to make `#controls` a fixed bottom sheet with peek/expanded heights, internal scroll, and `100dvh` map height.
3. Wire the handle/chevron toggle in `main.js` (toggle a class, update aria).
4. Hide the mobile `⌘K` hint and adjust header/footer as needed.
5. Verify in browser device emulation: map visible on load, peek → expand → collapse, list scrolls internally, map doesn't scroll when sheet open.

## Open Questions

None — requirements and approach are settled. Drag-to-resize is explicitly deferred (Non-Goals).
