## Purpose

Shows users when the tour dataset was last refreshed and gives a direct link to the official GuideAlong tours site, so they can verify data freshness and explore tours beyond this map.

## ADDED Requirements

### Requirement: Last-synced timestamp written at fetch time

The fetch pipeline SHALL write a `lastSynced` timestamp to `src/data/meta.json` whenever `tours.json` is regenerated, reflecting when the sync completed.

#### Scenario: Fetch writes timestamp
- **WHEN** the fetch script runs successfully
- **THEN** `src/data/meta.json` contains a `lastSynced` value matching the completion time

### Requirement: UI displays last-synced timestamp

The UI SHALL read `meta.json` and display a human-readable "last synced" date. If the file is missing or unreadable, the UI SHALL fall back gracefully without an error.

#### Scenario: Timestamp shown
- **WHEN** the page loads and `meta.json` is present
- **THEN** a human-readable last-synced date is displayed in the footer

#### Scenario: Missing meta file
- **WHEN** `meta.json` is missing or cannot be fetched
- **THEN** the footer renders without a timestamp (no error state)

### Requirement: Official site link

The UI SHALL include a link to the official GuideAlong tours website (`https://guidealong.com/tour-list`) in the footer.

#### Scenario: Link present
- **WHEN** the page is rendered
- **THEN** a link to the official GuideAlong tours site is shown in the footer
