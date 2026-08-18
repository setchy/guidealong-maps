## Purpose

Adds a locate-me control that captures the user's position for distance-based sorting, and collapses the map attribution control so it loads as a compact icon instead of an expanded watermark.

## Requirements

### Requirement: Locate me control

The map SHALL include a locate-me control that requests the user's geolocation and captures the resulting position for use by the tour list's distance sort.

#### Scenario: User locates
- **WHEN** the user activates the locate-me control and grants permission
- **THEN** the user's coordinates are captured and the map centers on them

#### Scenario: Permission denied
- **WHEN** the user activates the locate-me control and permission is denied or unavailable
- **THEN** the app continues to function without a location, and distance sort is unavailable with a clear indication

### Requirement: Distance sort requires a captured location

The tour list SHALL offer a distance sort only when a location has been captured. Selecting distance sort without a captured location SHALL trigger the locate-me flow.

#### Scenario: Distance sort without location
- **WHEN** the user selects Sort by = Distance but no location has been captured
- **THEN** the app triggers the locate-me flow, and if a location is obtained, the list sorts by distance

### Requirement: Attribution collapsed on load

The map attribution control SHALL load in its collapsed (compact) state so only a compact indicator is visible until the user expands it. Attribution SHALL remain present and accessible.

#### Scenario: Collapsed attribution
- **WHEN** the map loads
- **THEN** the attribution control is shown collapsed as a compact icon rather than an expanded text panel

#### Scenario: Attribution remains accessible
- **WHEN** the user clicks the collapsed attribution indicator
- **THEN** the full attribution text is shown
