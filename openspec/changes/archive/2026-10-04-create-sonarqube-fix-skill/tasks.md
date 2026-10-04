# Tasks

## 1. Author the global skill

- [x] 1.1 Author the canonical `SKILL.md` at `~/.agents/skills/sonarqube-fix/SKILL.md` and verify the file's YAML frontmatter parses with a `name: sonarqube-fix` and a non-empty `description` (e.g. parse the `---`-delimited block)
- [x] 1.2 Verify the playbook sections are present by checking the file contains the key headings: discovery (`1. Discover`), per-rule planning, PR title/body conventions, verification, iterate-until-zero, and the per-rule cheat-sheet table

## 2. Confirm global registration

- [x] 2.1 Verify the installed path exists (`ls ~/.agents/skills/sonarqube-fix/SKILL.md` succeeds)
- [x] 2.2 Confirm the harness registers the skill: the available-skills inventory lists id `sonarqube-fix` with its description (reload the agent if the inventory doesn't show it yet)

## 3. Validate end-to-end

- [x] 3.1 Validate the OpenSpec change: run `openspec validate` and confirm it passes, including the `skip_specs: true` declaration
- [x] 3.2 Sanity-check the trigger path: confirm the skill description mentions Sonar* so a user pasting a SonarCloud issues URL selects this skill's discovery step
- [x] 3.3 Confirm the change adds no files to this repository: `git status` shows only the `openspec/changes/create-sonarqube-fix-skill/` directory from this change