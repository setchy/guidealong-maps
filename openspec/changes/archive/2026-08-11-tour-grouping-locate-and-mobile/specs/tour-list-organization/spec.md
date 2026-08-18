## Purpose

Lets users organize the tour list into groups (by completion status or tour category) and sort it (by title, completion date, or distance from their location) with per-group counts and computed distances shown in the list.

## ADDED Requirements

### Requirement: Group By control

The UI SHALL provide a "Group by" control with at least the options `None`, `Status`, and `Category`. Selecting `Status` groups tours into `Completed` and `Not Completed`. Selecting `Category` groups tours by their `category` field (`National Park`, `Bundle`, `Walking`, `Driving`). Selecting `None` renders a flat list.

#### Scenario: Group by Status
- **WHEN** the user selects Group by = Status
- **THEN** the tour list is split into a "Completed" group and a "Not Completed" group

#### Scenario: Group by Category
- **WHEN** the user selects Group by = Category
- **THEN** the tour list is split into groups for each tour category, ordered with the most tours first

#### Scenario: Group by None
- **WHEN** the user selects Group by = None
- **THEN** the tour list renders as a single flat list with no group headers

### Requirement: Sort By control

The UI SHALL provide a "Sort by" control with at least the options `Title`, `Completed date`, and `Distance`. Sorting SHALL apply within each group when grouping is active, and to the whole list when grouping is `None`.

#### Scenario: Sort by Title
- **WHEN** the user selects Sort by = Title
- **THEN** tours are ordered alphabetically by title (A-Z)

#### Scenario: Sort by Completed date
- **WHEN** the user selects Sort by = Completed date
- **THEN** completed tours are ordered by completion date, newest first, with completed tours lacking a date sorted alphabetically after dated tours, and not-completed tours after all completed tours

#### Scenario: Sort by Distance
- **WHEN** the user selects Sort by = Distance and a location has been captured
- **THEN** tours are ordered by distance from the captured location, nearest first, with tours lacking coordinates placed last

### Requirement: Tours missing a sort key fall back to title sort

Within any sort mode, tours for which the selected sort key is unavailable SHALL be ordered alphabetically by title and placed after tours that have the key.

#### Scenario: Undated completed tours
- **WHEN** sorting by completed date
- **THEN** completed tours with a null date are placed after dated completed tours and ordered alphabetically

#### Scenario: Ungeocoded tours under distance sort
- **WHEN** sorting by distance
- **THEN** tours without coordinates are placed at the end, ordered alphabetically

### Requirement: Group headers show counts

When grouping is active, each group header SHALL display the group name and the number of tours in the group, e.g. "Completed (26)".

#### Scenario: Count on group header
- **WHEN** the list is grouped
- **THEN** each group header shows the count of tours within that group

### Requirement: Distance displayed in list items

When the user sorts by distance, each list item SHALL display the computed distance from the captured location in the item's metadata line. Tours without coordinates SHALL display a placeholder instead of a number.

#### Scenario: Distance shown for located tours
- **WHEN** sorting by distance and a location is captured
- **THEN** each geocoded tour item shows its distance, e.g. "12.4 mi"

#### Scenario: Placeholder for ungeocoded tours
- **WHEN** a tour has no coordinates under distance sort
- **THEN** the item shows a placeholder (e.g. "—") instead of a distance
