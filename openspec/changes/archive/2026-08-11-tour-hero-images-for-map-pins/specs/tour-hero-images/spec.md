## Purpose

Adds each tour's hero image to the map pin popup by capturing and locally downloading the image during the tour data fetch pipeline, so users see a visual preview of each trip.

## ADDED Requirements

### Requirement: Hero image captured at fetch time

The fetch pipeline SHALL extract each tour's hero image URL from its tour page when enriching details, and SHALL store the downloaded image's relative path in the tour's `details.thumbnail` field in `src/data/tours.json`.

#### Scenario: Tour page has a hero image
- **WHEN** the fetch pipeline enriches a tour whose page contains a hero image (`og:image`)
- **THEN** the image is downloaded and `details.thumbnail` is set to the local relative path of the downloaded file

#### Scenario: Tour has no hero image
- **WHEN** the fetch pipeline enriches a tour whose page has no usable hero image
- **THEN** `details.thumbnail` is left empty and the tour remains otherwise unchanged

### Requirement: Existing tours backfilled

The fetch pipeline SHALL treat a tour with a missing `details.thumbnail` as needing detail enrichment, so previously scraped tours are backfilled on the next run.

#### Scenario: Tour already has details but no thumbnail
- **WHEN** `pnpm fetch:tours` runs and a tour has `start`/`location` but no `details.thumbnail`
- **THEN** the pipeline re-fetches that tour's page to capture and download its hero image

### Requirement: Map pin popup shows hero image

The map pin popup SHALL render the tour's hero image when `details.thumbnail` is present, shown at the top of the popup above the tour details.

#### Scenario: Thumbnail present
- **WHEN** a user opens the popup for a tour that has a `details.thumbnail`
- **THEN** the popup displays the hero image at the top, followed by the existing tour details

#### Scenario: Thumbnail missing
- **WHEN** a user opens the popup for a tour without a `details.thumbnail`
- **THEN** the popup renders the existing text-only layout with no image and no error
