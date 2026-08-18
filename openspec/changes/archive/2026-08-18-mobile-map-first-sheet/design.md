## Context

See proposal.md for the product motivation. The app is a static vanilla-JS MapLibre viewer. `#controls` is currently a desktop floating panel that becomes a fixed sheet at `max-width: 600px`; the existing sheet already has an `expanded` class and header/chevron toggle, while the map container still carries an inline `100vh` height. Filters, Group & Sort, and Tours are existing collapsible sections and must remain in their current DOM order.

## Goals / Non-Goals

**Goals:**

- Make the mobile presentation map-first across phones, landscape devices, and narrow tablets.
- Reuse the existing controls and sheet state rather than creating a parallel mobile filter UI.
- Give the sheet a small, predictable peek state and a fixed expanded state.
- Keep map gestures and sheet scrolling distinct.
- Preserve desktop styles and behavior above the mobile breakpoint.

**Non-Goals:**

- No drag-to-resize behavior or arbitrary sheet heights.
- No redesign of filters, grouping, sorting, tour data, markers, or popups.
- No new runtime dependencies or framework migration.

## Decisions

### D1: Broaden the mobile breakpoint to 900px

Use the Wander Atlas breakpoint for the sheet presentation so narrow tablets and landscape phones receive the map-first layout. Desktop remains the existing floating panel above 900px.

- **Alternative considered:** Keep 600px. Rejected because the current layout can still be cramped and clipped on 601-900px screens, especially in landscape.

### D2: Use two fixed sheet heights

Use a compact fixed peek height of approximately `88px` and an expanded height of approximately `62dvh`, with a sensible maximum for larger narrow screens. The peek includes the handle/header and search or tour summary affordances; the expanded state exposes the existing controls and list.

- **Rationale:** A small peek preserves map context and makes the sheet feel like a secondary surface. A fixed expanded state avoids the complexity and gesture conflicts of dragging.
- **Alternative considered:** Keep `38dvh` peek and `90dvh` expanded. Rejected because the current peek exposes too much data and the expanded state obscures most of the map.

### D3: Keep one controls surface

Keep search, Filters, Group & Sort, Tours, and the footer in `#controls`. Mobile-specific presentation changes will use the existing section collapse behavior instead of duplicating controls into floating menus.

- **Rationale:** GuideAlong's primary workflow uses the map and tour explorer together; one sheet keeps filtering and browsing discoverable without adding a second navigation layer.
- **Alternative considered:** Add separate floating View and Filters menus like Wander Atlas. Rejected for this product because GuideAlong has no equivalent multi-view navigation and its filter controls are already cohesive.

### D4: Use explicit sheet interaction boundaries

The sheet remains fixed over the map with an internally scrollable body. Sheet controls stop propagation where needed, while map taps outside MapLibre controls collapse an expanded sheet. MapLibre retains ownership of pan and zoom gestures in the map area.

- **Rationale:** The map is the primary surface, so tapping it should restore map context without disabling normal gestures.
- **Alternative considered:** Collapse only through the sheet handle/header. Rejected because users need a fast way to get the map back after browsing.

### D5: Use dynamic viewport sizing and safe-area insets

Remove the competing inline map height or otherwise ensure the mobile CSS can apply `100vh` fallback followed by `100dvh`. Add bottom padding based on `env(safe-area-inset-bottom)` to the sheet's usable content/footer area.

- **Rationale:** `100dvh` handles mobile browser chrome, while safe-area padding prevents controls from sitting beneath home indicators.
- **Alternative considered:** JavaScript `visualViewport` sizing. Rejected because CSS viewport units provide the simpler progressive solution.

### D6: Preserve the existing desktop cascade

Keep desktop rules as the default and scope all sheet changes, safe-area adjustments, and mobile affordance visibility under the mobile media query. The existing desktop `#controls` position, width, and max-height remain unchanged.

## Risks / Trade-offs

- [A fixed expanded sheet can obscure markers] → Start compact, retain a visible map strip, and collapse on map tap.
- [A 900px breakpoint changes tablet presentation] → Use the same two-state interaction and verify both portrait and landscape widths; desktop remains unchanged above the breakpoint.
- [Nested sheet and tour-list scrolling can feel inconsistent] → Keep the sheet body as the primary scroll boundary and constrain the tour list only where required by the existing list layout.
- [Map clicks may be confused with popup/control clicks] → Exclude MapLibre controls and popup content from collapse handling.
- [Older browsers may not support `dvh`] → Declare `100vh` before `100dvh` as a fallback.

## Migration Plan

1. Update the mobile markup affordance and map sizing source so the sheet has a semantic toggle and dynamic sizing can take effect.
2. Replace the existing small-screen CSS values with the 900px map-first breakpoint, compact/expanded heights, scroll boundaries, touch boundaries, and safe-area spacing.
3. Refine the existing sheet toggle logic and add map-tap collapse behavior without changing tour/filter state.
4. Run lint and manually verify 375px portrait, 844px landscape, and narrow-tablet sizes, plus a desktop viewport above 900px.
5. Roll back by reverting the mobile-only markup, CSS, and sheet interaction changes; no persisted data or API migration is required.
