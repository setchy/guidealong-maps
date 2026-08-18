## 1. Mobile Sheet Markup and Sizing

- [x] 1.1 Make the mobile sheet affordance semantic and keyboard/touch accessible, including accurate expanded/collapsed labels and state attributes.
- [x] 1.2 Remove or adjust the inline map height that prevents the responsive stylesheet from applying dynamic viewport sizing.
- [x] 1.3 Confirm the existing controls DOM order remains suitable for the compact peek and expanded sheet without duplicating search or filter controls.

## 2. Responsive Sheet Styling

- [x] 2.1 Replace the 600px mobile breakpoint with the 900px map-first breakpoint while preserving the desktop floating-panel rules above it.
- [x] 2.2 Implement the compact approximately 88px peek state and fixed approximately 62dvh expanded state with a transition and visible map area in both states.
- [x] 2.3 Make the expanded sheet content internally scrollable, keep the tour list reachable, and prevent page/map scrolling from the sheet content.
- [x] 2.4 Add `100vh` fallback plus `100dvh` map sizing and safe-area bottom spacing for the sheet controls and footer.
- [x] 2.5 Define mobile touch and stacking boundaries so sheet controls remain above the map while MapLibre controls and map gestures remain usable outside the sheet.

## 3. Sheet Interaction Behavior

- [x] 3.1 Refine the existing sheet toggle to support the handle, peek/header affordance, and chevron while synchronizing the expanded state and accessibility attributes.
- [x] 3.2 Collapse an expanded sheet when the user taps the map outside MapLibre controls, popups, and other map UI.
- [x] 3.3 Ensure sheet interactions do not trigger map collapse or map gestures, while preserving existing filter, grouping, sorting, and tour selection behavior.

## 4. Verification

- [x] 4.1 Run `pnpm lint` and fix any issues introduced by the responsive changes.
- [ ] 4.2 Manually verify 375px portrait: compact peek on load, visible map, expansion, internal scrolling, filter access, and map-tap collapse.
- [ ] 4.3 Manually verify 844px landscape and a narrow tablet viewport: no clipping, usable map gestures, safe-area spacing, and reachable sheet content.
- [ ] 4.4 Manually verify a viewport wider than 900px: desktop panel position, dimensions, controls, and behavior remain unchanged.
