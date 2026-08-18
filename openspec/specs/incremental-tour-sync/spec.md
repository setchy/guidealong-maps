## Purpose

Runs the tour data pipeline as three independent, resumable phases — inventory, details, geocode — each processing only tours that still need its output, so interrupted runs resume without data loss or re-fetching.

## Requirements

### Requirement: Phased pipeline

The tour data sync SHALL run as three distinct phases executed in order: inventory (discover tour URLs/titles), details (enrich each tour from its page), geocode (fill coordinates). Each phase SHALL only process tours that still need that phase's data.

#### Scenario: Full sync
- **WHEN** `pnpm fetch:tours` runs
- **THEN** it runs inventory, then details, then geocode in order

#### Scenario: Details skipped when complete
- **WHEN** the details phase runs and a tour already has `start`/`location`
- **THEN** that tour's page is not fetched again

#### Scenario: Geocode skipped when complete
- **WHEN** the geocode phase runs and a tour already has coordinates
- **THEN** that tour is not geocoded again

### Requirement: Resumable across runs

If a sync is interrupted (e.g. process killed or firewall block), a later run SHALL continue from the remaining work rather than re-doing completed tours.

#### Scenario: Resume after interruption
- **WHEN** a run is interrupted partway through the details phase and a new run starts
- **THEN** tours whose details were already saved are skipped, and only remaining tours are fetched

#### Scenario: No data loss on failure
- **WHEN** a phase fails partway through
- **THEN** work already completed and saved is preserved in `tours.json`

### Requirement: Single source of truth

All three phases SHALL read and write the same `tours.json` file. No phase SHALL maintain a separate tour store.

#### Scenario: Shared file
- **WHEN** any phase runs
- **THEN** it reads the current `tours.json`, applies only its phase's changes, and writes it back
