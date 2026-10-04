## Purpose

Surfaces data-quality problems during the tour sync so operators notice when the scraped total doesn't match the site's reported count, or when completed-tour entries reference titles that no longer exist in the dataset.

## Requirements

### Requirement: Warn on dataset total mismatch

After fetching, the pipeline SHALL compare the number of tours it parsed against the total the site reports (e.g. "131 Results Found"). If they differ, it SHALL emit a warning showing both numbers.

#### Scenario: Counts match
- **WHEN** the parsed tour count equals the site's reported total
- **THEN** no warning is emitted

#### Scenario: Counts differ
- **WHEN** the parsed tour count differs from the site's reported total
- **THEN** a warning is emitted showing the parsed count, the reported total, and the difference
