# Spec Delta

## Purpose

Tracks completed GuideAlong tours by their stable catalog URL instead of mutable display titles, and keeps those references current when the source site renames, repacks, or bundles tours.

## ADDED Requirements

### Requirement: Completed entries use stable URL identity
`completed.json` entries SHALL identify tours by the tour's URL as recorded in `tours.json`, and SHALL NOT rely on the tour's display title for matching. Each entry SHALL record the tour URL and an optional completion date.

#### Scenario: Entry format uses URL not title
- **WHEN** a completed tour is recorded
- **THEN** its entry contains the tour's `tours.json` URL and an optional `completedDate`, and no title field is used for matching

#### Scenario: Title change does not break matching
- **WHEN** a tour's display title changes but its URL does not
- **THEN** the completed entry still matches because it references the URL

### Requirement: Completion matches by URL
The site SHALL consider a tour completed when a completed entry's URL equals the tour's URL.

#### Scenario: Renamed tour stays completed
- **WHEN** a tour is displayed and a completed entry holds the same URL
- **THEN** the tour renders as completed with its recorded completion date

#### Scenario: Unmatched URL is not completed
- **WHEN** a tour has no completed entry holding its URL
- **THEN** the tour renders as not completed

### Requirement: Stale completed URLs resolve via site redirects
During a sync, the pipeline SHALL compare completed-entry URLs against the URLs in `tours.json`. For each completed URL absent from the catalog, the pipeline SHALL follow the site's HTTP response to determine whether the tour moved: a redirect reveals the successor tour.

#### Scenario: Redirect to a non-Bundle catalog tour
- **WHEN** a completed URL is absent from the catalog and its request redirects to a unique catalog tour's URL and that tour is not a Bundle
- **THEN** the pipeline updates the completed entry's URL to that catalog tour's URL and preserves its completion date

#### Scenario: Redirect target differs from the canonical slug
- **WHEN** the redirect target is not itself a catalog URL but slug similarity identifies a single catalog tour as the successor and that tour is not a Bundle
- **THEN** the pipeline updates the completed entry to that catalog tour's URL

#### Scenario: Redirect into a Bundle
- **WHEN** the successor revealed by the redirect is a Bundle tour
- **THEN** the pipeline does not auto-remap the entry and warns instead

### Requirement: Completion drift is reported with suggestions
For completed entries that cannot be auto-remapped, the sync SHALL emit a warning that names the stale URL, its completion date if any, and a suggested successor where one can be identified. Completed-entry staleness SHALL never fail the sync silently.

#### Scenario: Dead URL with a similar catalog tour
- **WHEN** a completed URL returns no redirect and high-confidence similarity identifies a single catalog tour
- **THEN** the sync warns with the stale URL and suggests the matching catalog tour

#### Scenario: Dead URL with no candidate
- **WHEN** a completed URL returns no redirect and no catalog tour is a similarity match
- **THEN** the sync warns with the stale URL and no suggestion