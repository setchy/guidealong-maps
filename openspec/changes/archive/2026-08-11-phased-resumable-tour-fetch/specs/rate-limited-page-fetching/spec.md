## Purpose

Fetches tour pages from the site's server-rendered HTML with polite pacing and exponential backoff, so a multi-page run survives the site's rate-limit firewall without losing completed work.

## ADDED Requirements

### Requirement: Paced page fetching

When fetching multiple tour pages, the pipeline SHALL space requests by a configurable delay between each request.

#### Scenario: Delay between requests
- **WHEN** fetching multiple tour pages in sequence
- **THEN** each request is spaced by the configured delay

### Requirement: Exponential backoff on firewall block

When a page request returns a 403 or a firewall response, the pipeline SHALL pause with exponential backoff and retry a bounded number of times. If still blocked, it SHALL stop the current batch and log a warning, preserving already-saved work.

#### Scenario: Transient block
- **WHEN** a request is blocked (403/firewall) but later requests could succeed
- **THEN** the pipeline waits with increasing delay and retries up to a bounded limit

#### Scenario: Persistent block
- **WHEN** retries are exhausted or the block is clearly persistent
- **THEN** the pipeline stops fetching and logs a warning without crashing

### Requirement: Fetch tour pages as plain HTML

Tour detail pages SHALL be fetched as ordinary server-rendered HTML and parsed with cheerio (no site AJAX endpoint required for details).

#### Scenario: Detail page parsed
- **WHEN** a `/tour/<slug>/` page is fetched successfully
- **THEN** its `start`/`location` (and other available fields) are extracted from the rendered HTML

#### Scenario: No AJAX for details
- **WHEN** enriching a tour's details
- **THEN** the pipeline uses the tour page's plain HTML, not the site's admin AJAX endpoint
