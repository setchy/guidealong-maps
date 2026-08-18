## Purpose

Aligns the tour type filter with the normalized tour categories so filtering and grouping use the same vocabulary (Driving, Walking, National Park, Bundle) instead of raw scraped types.

## ADDED Requirements

### Requirement: Tour type filter options are categories

The "Tour type" filter SHALL offer options matching the tour `category` values present in the dataset: `Driving`, `Walking`, `National Park`, `Bundle`, plus an "All" option.

#### Scenario: Category options shown
- **WHEN** the user opens the tour type filter
- **THEN** the options are "All", "Driving", "Walking", "National Park", and "Bundle"

### Requirement: Filter matches on category

Selecting a tour type option SHALL filter tours to those whose `category` equals the selected value. Tours lacking a `category` SHALL be treated as `Driving`.

#### Scenario: Filter by category
- **WHEN** the user selects a category (e.g. "National Park")
- **THEN** only tours with that `category` are shown in the list and on the map

#### Scenario: Filter by all
- **WHEN** the user selects "All"
- **THEN** all tours are shown regardless of category

#### Scenario: Tour without category
- **WHEN** a tour has no `category` field and the user selects "Driving"
- **THEN** the tour is included, as it defaults to `Driving`

### Requirement: Category options derived from data

The filter options SHALL be derived from the distinct `category` values in the loaded tour data, so options stay in sync if the dataset changes.

#### Scenario: Options reflect dataset
- **WHEN** tours load
- **THEN** the tour type filter options are built from the distinct categories found in the data
