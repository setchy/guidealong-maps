## Purpose

Hosts the tour controls on mobile as a bottom sheet with peek and expanded states, so the map stays visible and usable while search, filters, and the tour list remain reachable.

## ADDED Requirements

### Requirement: Controls appear as a bottom sheet on mobile

On small screens (at most 600px wide), the controls SHALL be presented as a bottom sheet overlaid on the map, not as a full-screen panel. The map SHALL remain visible behind the sheet.

#### Scenario: Map visible on load
- **WHEN** the page loads on a viewport width of at most 600px
- **THEN** the map occupies the viewport and the controls are shown as a sheet at the bottom, leaving a visible strip of map above

#### Scenario: Desktop unchanged
- **WHEN** the viewport is wider than 600px
- **THEN** the controls remain the existing floating panel and the bottom sheet is not applied

### Requirement: Peek and expanded states

The bottom sheet SHALL have two states: a collapsed "peek" state showing search and the section toggles, and an expanded state showing the full controls including the tour list. The user SHALL be able to switch between them.

#### Scenario: Peek state
- **WHEN** the sheet is collapsed
- **THEN** search and the section toggles are visible and a larger portion of the map remains visible

#### Scenario: Expand
- **WHEN** the user activates the sheet handle or its chevron
- **THEN** the sheet expands to near-full height and the tour list is visible

#### Scenario: Collapse
- **WHEN** the user activates the sheet handle or its chevron while expanded
- **THEN** the sheet returns to the peek state

### Requirement: Sheet scrolls internally

When expanded, the sheet SHALL scroll its own content (including the tour list) without scrolling the page or the map. The map SHALL NOT scroll when the sheet is open.

#### Scenario: Internal list scroll
- **WHEN** the expanded sheet's content overflows
- **THEN** the sheet scrolls internally while the map stays fixed

### Requirement: Map uses dynamic viewport height

The map SHALL use the dynamic viewport height so it isn't clipped behind mobile browser chrome.

#### Scenario: Mobile browser chrome
- **WHEN** the page is viewed in a mobile browser
- **THEN** the map's height tracks the dynamic viewport (e.g. `100dvh`) so the bottom of the map is not hidden behind the URL bar
