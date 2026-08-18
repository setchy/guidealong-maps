## Purpose

Surfaces data-quality problems during the tour sync so operators notice when the scraped total doesn't match the site's reported count, or when completed-tour entries reference titles that no longer exist in the dataset.

## ADDED Requirements

### Requirement: Warn on dataset total mismatch

After fetching, the pipeline SHALL compare the number of tours it parsed against the total the site reports (e.g. "131 Results Found"). If they differ, it SHALL emit a warning showing both numbers.

#### Scenario: Counts match
- **WHEN** the parsed tour count equals the site's reported total
- **THEN** no warning is emitted

#### Scenario: Counts differ
- **WHEN** the parsed tour count differs from the site's reported total
- **THEN** a warning is emitted showing the parsed count, the reported total, and the difference

### Requirement: Warn on completed.json entries with no dataset match

The pipeline SHALL compare `completed.json` titles against the titles in `tours.json`. For each entry whose title matches no tour, it SHALL emit a warning listing the unmatched title (and its completed date, if any). Where a likely renamed equivalent exists, the warning SHALL suggest it.

#### Scenario: All completed tours match
- **WHEN** every `completed.json` title exists in `tours.json`
- **THEN** no warning is emitted

#### Scenario: Unmatched completed tour
- **WHEN** a `completed.json` title matches no tour in `tours.json`
- **THEN** a warning lists the unmatched title, and suggests any likely renamed tour title found in the dataset

#### Scenario: Missing completed file
- **WHEN** `completed.json` is absent or unreadable
- **THEN** the pipeline skips the comparison without error
