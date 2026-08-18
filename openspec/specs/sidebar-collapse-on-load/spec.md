## Purpose

Lets users reach the tour list and map immediately by starting the sidebar's Filters and Group & Sort sections collapsed on every initial load.

## Requirements

### Requirement: Sections collapsed on initial load

On initial page load, the Filters section and the Group & Sort section SHALL render collapsed (content hidden), on all viewport widths. Their toggle controls SHALL remain visible and functional.

#### Scenario: Initial load on desktop
- **WHEN** the page loads on a desktop viewport
- **THEN** the Filters section and Group & Sort section are collapsed, and the tour list is visible

#### Scenario: Sections can be expanded
- **WHEN** the user activates a section's toggle
- **THEN** that section expands to show its controls, and the toggle reflects the expanded state

#### Scenario: Sections can be re-collapsed
- **WHEN** the user activates a section's toggle while it is expanded
- **THEN** that section collapses again

### Requirement: Section collapse state is per-session only

The collapsed state SHALL reset to collapsed on each page load; it SHALL NOT be persisted across visits.

#### Scenario: Fresh visit starts collapsed
- **WHEN** the user reloads the page after previously expanding a section
- **THEN** both sections start collapsed again
