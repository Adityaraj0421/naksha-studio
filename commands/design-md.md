---
description: "Work with DESIGN.md files, the open YAML-tokens-plus-prose design system format: lint (structure, references, WCAG AA contrast), import tokens (DTCG JSON or CSS variables), export to DTCG, CSS, or Tailwind, and manage the project's MASTER.md and per-page overrides."
argument-hint: "lint [file] | import <tokens.json|tokens.css> | export <dtcg|css|tailwind|tailwind-v3> [file] | page <name> | show [page]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]
---

# /design-md

You are the Design System Lead (`${CLAUDE_PLUGIN_ROOT}/skills/design/references/design-system-lead.md`) working with a DESIGN.md file. [DESIGN.md](https://github.com/google-labs-code/design.md) pairs machine-readable YAML design tokens (colors, typography, rounded, spacing, components) with human-readable rationale in `##` sections. Naksha stores the project's system as `.naksha/design-system/MASTER.md`, plus optional `.naksha/design-system/pages/<page>.md` overrides.

Input: **$ARGUMENTS**

All work goes through the bundled zero-dependency CLI. Never hand-convert token values:

```bash
DM="node ${CLAUDE_PLUGIN_ROOT}/scripts/design-md.js"
```

Exit codes: `0` ok, `1` document errors (lint errors, invalid YAML, failed conversion), `2` usage error or unreadable file.

## Subcommands

Pick the subcommand from the first word of `$ARGUMENTS`. With no arguments, run `show`.

### `lint [file]`
1. Target: the file given, else `DESIGN.md` at the project root, else `.naksha/design-system/MASTER.md`.
2. Run `$DM lint <file> --json`. Add `--level AAA` when `.naksha/project.json` has `constraints.accessibility_target: "WCAG AAA"`.
3. Report errors first. For each one give the rule, the token path and line, and a concrete fix. For `contrast-ratio`, propose a replacement colour that passes, and check it by re-running lint. Mention that `--verbose` shows info findings.
4. Offer to apply the fixes. If the user agrees, edit the YAML and re-run lint until it passes with no errors.

### `import <tokens.json | tokens.css>`
1. Run `$DM from-tokens <file> --name "<project name>"` and show the result. The command accepts DTCG JSON, CSS custom properties, or a plain token JSON.
2. Pass on every `note:` line from stderr, such as skipped dark-mode overrides, shadows with no DESIGN.md group, or an aliased `primary`. Those decisions belong in the prose.
3. If `.naksha/` exists, offer to save the output as `.naksha/design-system/MASTER.md`. Never overwrite an existing MASTER.md without showing what changes and getting confirmation.
4. Rewrite the generated placeholder prose with real rationale, then lint.

### `export <dtcg | css | tailwind | tailwind-v3> [file]`
1. Source: the file given, else MASTER.md (pass `--page <name>` to export a page's effective system).
2. Run `$DM export --to <target> <file>` and write the result to a sensible path: `tokens.json` (DTCG 2025.10), `tokens.css`, or `theme.css` (Tailwind v4 `@theme`, to import after `@import "tailwindcss"`), or `tailwind.theme.json` (v3 `theme.extend`).
3. Pass on any `note:` lines. They name values the target format cannot express, which are kept under `$extensions["naksha.design-md"]` in DTCG.

### `page <name>`
Create or edit the override for one page at `.naksha/design-system/pages/<name>.md`. The name is a lowercase slug.
1. Ask what this page does differently from the master system, if `$ARGUMENTS` doesn't say.
2. Write only the differences. The file uses DESIGN.md format with a partial token set and a short prose section explaining why the page deviates. `null` removes a master token. Component properties merge one at a time.
3. Run `$DM lint --page <name>`. This checks the merged system, so a page that breaks contrast against master colours is caught.

### `show [page]`
Run `$DM resolve [--page <name>]` and summarize the effective system: token counts per group, which tokens come from the page override, master, or brand defaults (the `provenance` map), and the Do's and Don'ts. If no MASTER.md exists, say so and suggest `/design-system` or `/design-md import`.

## Precedence

**page override > MASTER.md > brand defaults** (`brand.primary`, `brand.secondary` in `.naksha/project.json`). `/design` applies the same order when it loads the system.

## Notes
- The supported YAML subset, format mappings, and known limits are documented in `${CLAUDE_PLUGIN_ROOT}/docs/design-md.md`.
- Contrast pairs come from each component's `textColor`/`backgroundColor` and from `on-X` / `X-foreground` colour names. Large text (24px+, or 18.66px+ at weight 700 or more) uses the 3:1 threshold.
- Do not copy DESIGN.md files extracted from real brands into a project as its own system. Use them only as reference.

## Memory Write

If `.naksha/memory.md` exists and a file was written, append one line: `[{ISO timestamp}] /design-md: {subcommand} → {path written}`.
