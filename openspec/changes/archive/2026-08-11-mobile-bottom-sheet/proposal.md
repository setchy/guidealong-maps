## Why

On mobile (≤600px), the controls panel is made near-full-width and near-full-height but still sits as an overlay on top of the map, so it covers the entire screen and the map is never visible. The desktop "map + floating panel" pattern was rescaled instead of replaced. This makes the app unusable on phones — the primary map surface is hidden behind the controls.

## What Changes

- **Bottom-sheet layout on mobile**: replace the full-screen controls overlay with a bottom sheet. The map remains full-viewport behind it, always visible.
- **Peek / expanded states**: the sheet starts collapsed to a "peek" strip showing the search box and section toggles (about 35-40% of viewport height). Tapping the sheet header/handle (or a chevron) expands it to near-full height for browsing the tour list. Both states keep the map's top strip visible.
- **Viewport height fix**: the map uses `100dvh` instead of `100vh` so it doesn't get cut off behind mobile browser chrome (URL bar).
- **Internal scroll**: the expanded sheet scrolls its own content (tour list already has internal scroll); the map does not scroll when the sheet is open.
- **Desktop unchanged**: the floating 320px panel on desktop stays as-is; the sheet is a mobile-only transformation.

## Capabilities

### New Capabilities
- `mobile-bottom-sheet`: A mobile-only bottom sheet that hosts the controls, with peek and expanded states, keeping the map visible.

### Modified Capabilities
- `mobile-responsive-layout`: the "Mobile controls panel" requirement changes from a near-full-width overlay panel to a bottom sheet that leaves the map visible.

## Impact

- `src/styles.css` — mobile media query replaced with bottom-sheet styles: fixed positioning, peek/expanded heights, handle, internal scroll, `100dvh` for the map.
- `src/index.html` — add a sheet handle/grab element; optionally simplify the controls header on mobile.
- `src/main.js` — wire the peek/expanded toggle (tap on handle/header/chevron); ensure the map container uses dynamic viewport height; possibly hide the desktop-only `⌘K` hint on mobile.
- No changes to tour data, filters, map markers, or desktop layout.
