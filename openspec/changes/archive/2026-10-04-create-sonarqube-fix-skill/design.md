# Design

## Context

See proposal.md — Why. The Sonar-fixing playbook was proven end-to-end on this repo (17 rules → 17 branches/PRs → 0 open issues, including follow-up rounds for analyzer re-analysis). This change packages that playbook as a reusable **global agent skill** and records the decision trail.

## Goals / Non-Goals

**Goals**
- One canonical `SKILL.md` describing the full fix workflow.
- Installed globally where the agent harness picks it up automatically (registered as an available skill).
- **Not** stored in this repository — global-only by explicit user decision.
- Validated: frontmatter parses, file present, harness lists the skill.

**Non-Goals**
- Bundling the skill into the application package or shipping it to users of the site.
- Automating the workflow in CI (it is an agent-assisted process).
- Covering SonarQube *Server* (self-hosted) specifics beyond noting the same API surface.

## Decisions

1. **Global skill vs repo-local runbook**
   - **Decision:** a global agent skill at `~/.agents/skills/sonarqube-fix/SKILL.md`, mirroring the existing `find-skills` skill in the same directory.
   - **Why:** the harness scans `~/.agents/skills/` and auto-registers skills there (`find-skills` proves the convention), making it reusable across all codebases. A repo-local `docs/` runbook would be project-bound and harder to invoke automatically.
   - **Alternative rejected:** bare markdown runbook committed to the repo (not discoverable by the harness, not reusable).

2. **Skill format: OpenCode/agent `SKILL.md`**
   - **Decision:** YAML frontmatter (`name`, `description`) plus Markdown instructions.
   - **Why:** the `description` is what the harness matches against user requests (see `find-skills`); without it the skill can't auto-trigger.
   - **Alternative rejected:** plain Markdown file with no frontmatter.

3. **Global-only: no repo copy**
   - **Decision:** the canonical `SKILL.md` lives only at `~/.agents/skills/sonarqube-fix/SKILL.md`. It is **not** vendored into this (or any specific) repository.
   - **Why:** the skill is meant to be reusable across codebases; this repo is just where it was authored and proven. Committing it here would read as "owned by this project" and would need syncing.
   - **Trade-off:** the user-level file is outside git, so it isn't versioned by this repo. Accepted per the user's explicit direction; back up/version it wherever the user manages their global agent config.

4. **`skip_specs: true`**
   - **Decision:** no delta spec.
   - **Why:** existing specs under `openspec/specs/` describe application behavior (map, tours, search, fetching…). A dev-process skill changes no system behavior. The proposal guidance forbids inventing requirements merely to satisfy validation.
   - **Alternative rejected:** a synthetic `developer-tooling/…` capability spec — no precedent in this repo and no behavioral requirement to pin.

## Risks / Trade-offs

- **Harness may not register the skill until reload** → Mitigation: apply step confirms the skill is listed in the agent inventory after placement; the check is part of tasks.md.
- **Global file is outside git and machine-local** → Mitigation: this change documents the canonical content and requirements so it can be recreated anytime; the install path is stated in the proposal and design.
- **No in-repo version** → Accepted trade-off per explicit user direction (global-only). Content changes are folded into the installed file directly.

## Migration Plan

1. Apply: create/verify `~/.agents/skills/sonarqube-fix/SKILL.md` with the playbook content.
2. Verify: frontmatter parses, `ls` shows the file, harness inventory lists `sonarqube-fix`.
3. Rollback: delete the user-home directory — no repository or application impact.

## Open Questions

None. Deferrable details (wording of future cheat-sheet entries, additional rules) can be folded in by re-applying the tasks.