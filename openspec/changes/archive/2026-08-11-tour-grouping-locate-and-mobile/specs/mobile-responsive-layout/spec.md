## Purpose

Makes the sidebar-based tour explorer usable on small screens by adding a proper viewport declaration and responsive styles so controls don't cover the map or clip their own content.

## ADDED Requirements

### Requirement: Viewport meta tag

The page SHALL declare a responsive viewport so mobile browsers render the layout at device width instead of a scaled desktop layout.

#### Scenario: Mobile rendering
- **WHEN** the page is loaded in a mobile browser
- **THEN** the layout is rendered at the device's viewport width

### Requirement: Mobile controls panel

On small screens (at most 600px wide), the controls panel SHALL occupy near-full width and SHALL be scrollable so all sections (Filters, Group & Sort, Tours) remain reachable without clipping.

#### Scenario: Narrow viewport
- **WHEN** the viewport width is at most 600px
- **THEN** the controls panel is near-full-width and its content is scrollable

### Requirement: Filters collapsed by default on mobile

On small screens, the Filters section SHALL start collapsed so the map is visible on initial load. The user SHALL be able to expand it.

#### Scenario: Initial load on mobile
- **WHEN** the page loads on a viewport width of at most 600px
- **THEN** the Filters section is collapsed while the map remains visible

#### Scenario: User expands filters
- **WHEN** the user taps the Filters toggle on a small screen
- **THEN** the Filters section expands to show the filter controls
