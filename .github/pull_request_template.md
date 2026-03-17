## What does this PR do?

<!-- Brief description of the change -->

## Type of change

- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New command or agent
- [ ] Skill improvement
- [ ] Documentation update
- [ ] Other (describe below)

## Components affected

- [ ] `commands/` — slash commands
- [ ] `agents/` — subagents
- [ ] `skills/design/` — core skill or references
- [ ] `scripts/` — shell scripts
- [ ] `hooks/` — session hooks
- [ ] `evals/` — test cases

## Checklist — All PRs

- [ ] Tested locally end-to-end
- [ ] `validate-structure` CI passes (if touching commands, references, or meta/stats.json)
- [ ] Reference paths use `${CLAUDE_PLUGIN_ROOT}/skills/design/references/`
- [ ] No hardcoded file paths (portable across installs)

## Checklist — New command (complete if adding a command)

- [ ] Command file added to `commands/` with `.md` extension
- [ ] Frontmatter includes: `description`, `allowed-tools`, role references
- [ ] `meta/stats.json` `commands` count incremented
- [ ] Eval case added in `evals/`

## Checklist — New role (complete if adding a role)

- [ ] Role definition added to `skills/design/SKILL.md` (roles are virtual — no separate file)
- [ ] `meta/stats.json` `roles` count incremented
- [ ] At least one command references the new role

## Checklist — Knowledge/reference update (complete if adding a reference file)

- [ ] Reference file added to `skills/design/references/`
- [ ] `meta/stats.json` `reference_files` count incremented
- [ ] Existing commands that benefit from it updated to reference it
