## MODIFIED Requirements

### Requirement: Controls appear as a bottom sheet on mobile

On narrow screens (at most 900px wide), the controls SHALL be presented as a bottom sheet overlaid on the map, not as a full-height or near-full-screen panel. The map SHALL remain visible behind the sheet, and the sheet SHALL respect the device's bottom safe area when one is present.

#### Scenario: Map visible on load
- **WHEN** the page loads on a viewport width of at most 900px
- **THEN** the map occupies the viewport and the controls are shown as a compact sheet at the bottom, leaving a substantial visible area of map above

#### Scenario: Desktop unchanged
- **WHEN** the viewport is wider than 900px
- **THEN** the controls remain the existing floating panel and the bottom-sheet behavior is not applied

### Requirement: Peek and expanded states

The bottom sheet SHALL have two fixed states: a compact collapsed peek showing the sheet affordance, search, and tour summary controls, and an expanded state showing the full controls including the tour list. The user SHALL be able to switch between them without arbitrary resizing.

#### Scenario: Peek state
- **WHEN** the sheet is collapsed
- **THEN** the sheet occupies only its compact peek height, search and the sheet's summary controls remain usable, and a substantial portion of the map remains visible

#### Scenario: Expand
- **WHEN** the user activates the sheet handle, peek control, or chevron
- **THEN** the sheet expands to its defined fixed height and the tour list is reachable

#### Scenario: Collapse
- **WHEN** the user activates the sheet handle, peek control, or chevron while expanded
- **THEN** the sheet returns to the compact peek state

### Requirement: Sheet collapses on map interaction

When the expanded sheet is open, tapping the map outside map controls SHALL collapse the sheet. Map interactions within the map area SHALL continue to support normal pan and zoom gestures.

#### Scenario: User taps the map
- **WHEN** the expanded sheet is open and the user taps the map outside a map control
- **THEN** the sheet collapses to the peek state

#### Scenario: User pans or zooms the map
- **WHEN** the user performs a pan or zoom gesture on the map outside the sheet
- **THEN** the map responds normally and the sheet does not intercept the gesture

### Requirement: Sheet scrolls internally

When expanded, the sheet SHALL scroll its own content, including the tour list, without scrolling the page or the map. Interactions inside the sheet SHALL not be interpreted as map gestures.

#### Scenario: Internal list scroll
- **WHEN** the expanded sheet's content overflows and the user scrolls within it
- **THEN** only the sheet content scrolls while the map remains fixed

### Requirement: Map uses dynamic viewport height

The map SHALL use the dynamic viewport height so it is not clipped behind mobile browser chrome, and the sheet SHALL include bottom safe-area spacing where required by the device.

#### Scenario: Mobile browser chrome
- **WHEN** the page is viewed in a mobile browser with browser chrome or a bottom device inset
- **THEN** the map tracks the dynamic viewport and the sheet's controls remain accessible above the device inset
