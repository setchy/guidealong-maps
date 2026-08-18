## Purpose

Fetches every page of the `/tour-list/` page so `tours.json` contains all tours the site lists, not just those rendered on the first page. `/tour-list/` is the single source of tour data.

## ADDED Requirements

### Requirement: Fetch all pages of the tour list

The fetch pipeline SHALL retrieve tours from every page of `/tour-list/`, not only the first page. It SHALL discover the total number of results (or pages) from the page, and SHALL combine tours from all pages into a single de-duplicated set keyed by tour URL.

#### Scenario: Multi-page catalog
- **WHEN** the tour list has more results than fit on one page
- **THEN** the pipeline fetches each remaining page and includes their tours in the combined output

#### Scenario: Single-page catalog
- **WHEN** all results fit on one page
- **THEN** the pipeline fetches only that page and does not make extra requests

#### Scenario: De-duplication
- **WHEN** the same tour URL appears across pages or fetches
- **THEN** the combined set contains only one entry for that URL

### Requirement: Fetch remaining pages via the tour list's own pagination

For pages after the first, the pipeline SHALL use the same pagination mechanism the site uses for `/tour-list/` (the `tourmaster_tour_ajax` endpoint with the page's settings), falling back gracefully if the mechanism cannot be used.

#### Scenario: Pagination used
- **WHEN** fetching page 2 or later
- **THEN** the pipeline uses the site's pagination mechanism and parses tours from the returned content

#### Scenario: Pagination unavailable
- **WHEN** the pagination endpoint cannot be reached or returns no usable content
- **THEN** the pipeline logs a warning and continues with the tours it already has

### Requirement: Single source of tour data

The pipeline SHALL fetch tour data only from `/tour-list/` (page 1 static HTML plus its pagination). It SHALL NOT assemble the catalog by fetching individual tour pages or other endpoints.

#### Scenario: No secondary fetching
- **WHEN** collecting the full tour set
- **THEN** the pipeline uses only `/tour-list/` and its pagination

### Requirement: Rate-limit-aware fetching

The pipeline SHALL avoid triggering the site's firewall by spacing requests with a delay, sending browser-like request headers, and stopping gracefully on transient failures.

#### Scenario: Delay between requests
- **WHEN** fetching multiple pages
- **THEN** requests are spaced by a configurable delay

#### Scenario: Firewall block
- **WHEN** a page request is blocked (e.g. HTTP 403 or a firewall response)
- **THEN** the pipeline stops fetching further pages and logs a warning rather than retrying aggressively or crashing
