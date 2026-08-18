## Purpose

Adds a hero image preview to each map pin popover by capturing the tour's hero image URL from the tour-list page during the data fetch, so users see a visual of each trip.

## ADDED Requirements

### Requirement: Hero image captured from tour-list item

The fetch pipeline SHALL capture each tour's hero image URL from its tour-list item during inventory, and SHALL store the URL in the tour's `details.thumbnail` field in `src/data/tours.json`.

#### Scenario: Tour-list item has a hero image
- **WHEN** the fetch pipeline inventories a tour whose list item exposes a hero image (`img[data-lazy-src]` or `img[src]`)
- **THEN** the hero image URL is stored in `details.thumbnail`

#### Scenario: Tour-list item has no usable image
- **WHEN** the fetch pipeline inventories a tour whose list item has no hero image URL
- **THEN** `details.thumbnail` is left empty and the tour remains otherwise unchanged

### Requirement: Full-size hero preferred

When the captured hero URL ends in a WordPress size suffix (`-{width}x{height}.ext`), the pipeline SHALL strip the suffix to reference the full-size image; if the pattern does not match, the captured URL is used as-is.

#### Scenario: Sized URL
- **WHEN** the captured URL is `.../Classic-Southwest-800x900.jpg`
- **THEN** `details.thumbnail` stores `.../Classic-Southwest.jpg`

#### Scenario: Unsized URL
- **WHEN** the captured URL has no `-{w}x{h}` suffix
- **THEN** `details.thumbnail` stores the URL unchanged

### Requirement: Map pin popover shows hero image

The map pin popover SHALL render the tour's hero image when `details.thumbnail` is present, shown at the top of the popover above the tour details.

#### Scenario: Thumbnail present
- **WHEN** a user opens the popover for a tour that has a `details.thumbnail`
- **THEN** the popover displays the hero image at the top, followed by the existing tour details

#### Scenario: Thumbnail missing
- **WHEN** a user opens the popover for a tour without a `details.thumbnail`
- **THEN** the popover renders the existing text-only layout with no image and no error
