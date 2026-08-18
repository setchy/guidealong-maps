## Why

GuideAlong already has a mobile bottom sheet, but its initial state is too large and its behavior does not yet provide the map-first interaction established in Wander Atlas. Refining the existing controls into a compact peek and a fixed expanded state will keep the map visible while preserving the current search, filter, grouping, sorting, and tour-browsing workflow.

## What Changes

- Make the mobile controls start as a compact bottom-sheet peek rather than a 38dvh panel that can immediately expose the tour list.
- Expand the sheet to a fixed, scrollable data area when the user taps its peek control.
- Collapse an expanded sheet when the user taps the map outside map controls.
- Preserve map pan and zoom gestures outside the sheet, with sheet interactions isolated from the map.
- Keep search, filters, Group & Sort, Tours, and the existing footer in one sheet rather than introducing a separate mobile filter/navigation system.
- Support phones and narrow tablets through a broader mobile breakpoint, including portrait and landscape layouts.
- Use the dynamic viewport height and safe-area spacing so the map and controls are not hidden by mobile browser chrome or device insets.
- Leave the desktop floating controls panel and its behavior unchanged.

## Capabilities

### New Capabilities

### Modified Capabilities

- `mobile-responsive-layout`: Change the mobile layout contract to a map-first sheet with compact peek, fixed expansion, broader narrow-screen coverage, and safe-area support.
- `mobile-bottom-sheet`: Change sheet state, map-tap collapse, touch ownership, viewport sizing, and internal scrolling requirements to match the refined mobile interaction.

## Impact

- `src/index.html`: adjust the map sizing markup and mobile sheet accessibility/interaction affordances as needed.
- `src/styles.css`: revise the mobile breakpoint, sheet heights, scrolling boundaries, safe-area spacing, map sizing, and touch presentation.
- `src/main.js`: refine sheet state handling and collapse behavior while preserving the existing filter and tour-list logic.
- No API, data format, dependency, or desktop layout changes.
