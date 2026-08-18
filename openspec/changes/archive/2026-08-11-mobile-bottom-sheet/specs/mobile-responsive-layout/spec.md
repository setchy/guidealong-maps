## MODIFIED Requirements

### Requirement: Mobile controls panel

On small screens (at most 600px wide), the controls SHALL be presented as a bottom sheet that leaves the map visible, with peek and expanded states. The sheet SHALL be scrollable so all sections (Filters, Group & Sort, Tours) remain reachable without clipping.

#### Scenario: Narrow viewport
- **WHEN** the viewport width is at most 600px
- **THEN** the controls are shown as a bottom sheet and the map remains visible behind it

#### Scenario: Sheet content reachable
- **WHEN** the sheet is expanded on a small screen
- **THEN** all controls sections are reachable by scrolling within the sheet
