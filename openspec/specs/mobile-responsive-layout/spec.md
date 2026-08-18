# mobile-responsive-layout Specification

## Purpose

Makes the sidebar-based tour explorer usable on small screens by adding a proper viewport declaration and responsive styles so controls don't cover the map or clip their own content.

## Requirements

### Requirement: Viewport meta tag

The page SHALL declare a responsive viewport so mobile browsers render the layout at device width instead of a scaled desktop layout.

#### Scenario: Mobile rendering
- **WHEN** the page is loaded in a mobile browser
- **THEN** the layout is rendered at the device's viewport width

### Requirement: Mobile controls panel

On narrow screens (at most 900px wide), the controls SHALL be presented as a map-first bottom sheet rather than a desktop-sized panel. The sheet SHALL start as a compact peek and expand to a fixed-height, internally scrollable state so Filters, Group & Sort, Tours, and the footer remain reachable without clipping. The map SHALL remain visible above the sheet in both states.

#### Scenario: Narrow viewport
- **WHEN** the viewport width is at most 900px
- **THEN** the controls are shown as a bottom sheet, the map fills the available viewport behind it, and the sheet leaves a visible map area above it

#### Scenario: Sheet content reachable
- **WHEN** the sheet is expanded on a narrow screen
- **THEN** all controls sections are reachable by scrolling within the sheet without scrolling the page or map

#### Scenario: Desktop layout preserved
- **WHEN** the viewport is wider than 900px
- **THEN** the controls remain the existing floating panel and the mobile sheet layout is not applied

### Requirement: Filters collapsed by default on mobile

On narrow screens, the Filters section SHALL start collapsed so the map-first peek remains compact. The user SHALL be able to expand it after expanding the sheet.

#### Scenario: Initial load on mobile
- **WHEN** the page loads on a viewport width of at most 900px
- **THEN** the Filters section is collapsed and the map remains visible

#### Scenario: User expands filters
- **WHEN** the user taps the Filters toggle on a narrow screen
- **THEN** the Filters section expands within the sheet to show the filter controls
