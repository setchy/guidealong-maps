## Purpose

Derives a normalized category for every tour during the fetch pipeline so the UI can group and filter tours by how users think about them, separate from the raw scraped tour type.

## Requirements

### Requirement: Category derived at fetch time

The fetch pipeline SHALL derive and persist a top-level `category` field for every tour in `tours.json`. The category SHALL be one of `National Park`, `Bundle`, `Walking`, or `Driving`. The raw scraped `details.tourType` SHALL remain unchanged.

#### Scenario: Category assigned to each tour
- **WHEN** the fetch pipeline processes a tour
- **THEN** the tour has a `category` value of exactly one of `National Park`, `Bundle`, `Walking`, or `Driving`

#### Scenario: Raw tour type preserved
- **WHEN** a tour with a messy raw type (e.g. "Half Day", "Driving Hybrid", "Driving & Walking") is fetched
- **THEN** its `details.tourType` is written unchanged and its `category` reflects the normalized classification

### Requirement: Category detection order

Category derivation SHALL check tour title patterns in the following order: `National Park`, then `Bundle`, then `Walking`, then fall back to `Driving`. A tour whose title matches "national park" SHALL NOT be categorized as a Bundle, Walking, or Driving.

#### Scenario: National park tours classified first
- **WHEN** a tour title contains "National Park"
- **THEN** its category is `National Park`, regardless of other title keywords

#### Scenario: Bundle tours classified before type keywords
- **WHEN** a tour title contains "bundle" or "combo" but not "national park"
- **THEN** its category is `Bundle`

#### Scenario: Walking tours
- **WHEN** a tour title contains a walking keyword (e.g. "walk", "walking") but matches no earlier category
- **THEN** its category is `Walking`

#### Scenario: Fallback to Driving
- **WHEN** a tour title matches no category keyword
- **THEN** its category is `Driving`
