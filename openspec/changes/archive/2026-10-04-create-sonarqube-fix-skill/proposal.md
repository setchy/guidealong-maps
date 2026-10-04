# Proposal

## Why

The repo was taken from 37 → 0 open SonarCloud issues using a repeatable formula: one branch + one draft PR per Sonar rule, PR titles shaped `type(sonar): <description> (<rule>)`, filtered-Sonar-issue links in every PR body, per-branch lint/test verification, and an iterate-until-zero loop that also absorbs the issues Sonar re-analysis surfaces on merged code. That playbook currently lives only in conversation history. Packaging it as a reusable **global agent skill** lets any codebase benefit from the same auditable workflow instead of rediscovering it.

## What Changes

- Introduce a global agent skill `sonarqube-fix` installed at `~/.agents/skills/sonarqube-fix/SKILL.md` — **global only, not vendored into this repo** (the repo is not the target; any codebase using the skill gets the same playbook).
- Skill content covers:
  - **Discovery**: query the SonarCloud issues API (the web UI is a JS app and can't be scraped), grouped by rule.
  - **Planning**: one branch + one draft PR per rule; vulnerabilities/bugs first.
  - **PR conventions**: title `type(sonar): <description> (<rule>)`; body with summary, changes, tests, and a mandatory link to the filtered issues (`?rules=<RULE_URL_ENCODED>`), created as drafts.
  - **Verification**: lint + tests + smoke-require per branch, checked back into the PR.
  - **Iterate-until-0**: re-query after merges; absorb regressions from your own fixes and analyzer limitations.
  - **Per-rule cheat sheet**: encoding the gotchas observed here (S5696 → DOM construction, S9382 → sequential promise chains, S3776 → helper extraction, S3403 → boolean stop flag, S7780/S7781 interplay, SRI + WCAG details, and more).
  - **OpenSpec integration**: read `openspec/config.yaml`; optionally track a cleanup as an OpenSpec change (one task per rule).
- This OpenSpec change documents the intent and content requirements of the global skill; it does **not** add the skill file to this repository.
- No production code, runtime behavior, or dependencies change.

## Capabilities

### New Capabilities
None — this is a developer-tooling/docs change and the change sets `skip_specs: true`. Specs describe application behavior; the skill does not alter application behavior, so creating a delta spec would invent a requirement purely to satisfy validation.

### Modified Capabilities
None.

## Impact

- **Dev tooling only**: the global skill file at `~/.agents/skills/sonarqube-fix/SKILL.md`.
- **No files are committed or added to this repository** — the change's planning artifacts are the only repo footprint.
- No runtime/build impact on the application, no new dependencies, no CI changes.
- OpenSpec meta-impact: new change directory `openspec/changes/create-sonarqube-fix-skill/`.