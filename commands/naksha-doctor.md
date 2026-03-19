---
description: "Run all naksha quality checks and report the plugin's health status."
argument-hint: "[--fix]"
allowed-tools: ["Bash", "Read", "Glob", "mcp__plugin_playwright_playwright__browser_navigate", "mcp__figma-console__figma_get_status", "mcp__stitch__list_projects"]
---

# /naksha-doctor

Run a full health check of the naksha plugin — structural validation, metadata consistency, behavioral smoke, and legacy branding guard. Report each check as ✅ PASS or ❌ FAIL with specific remediation for any failures.

## Arguments

- No argument: run all checks and show the status report
- `--fix`: after showing failures, output step-by-step remediation instructions for each failed check

## Step 1: Locate the plugin root

Use `Glob` to find `meta/stats.json` — the directory containing it is the plugin root. All scripts are in `scripts/` relative to that root. Change to that directory before running scripts.

## Step 2: Run all quality checks

Run each script separately so results can be attributed individually. Capture output and exit code for each:

```bash
node scripts/validate-structure.js 2>&1
```

```bash
bash scripts/verify-metadata.sh 2>&1
```

```bash
bash scripts/behavioral-smoke.sh 2>&1
```

```bash
bash scripts/guard-legacy-branding.sh 2>&1
```

## Step 2.5: MCP Availability Check

Probe the two primary MCP integrations that naksha commands depend on. These checks are **informational** — they reveal whether MCP-dependent commands will work in the current environment. MCP unavailability does not make the plugin unhealthy; it means certain commands will operate in fallback mode.

**Playwright MCP:**
Attempt to call `mcp__plugin_playwright_playwright__browser_navigate` with `url: "about:blank"`.
- If the call succeeds → record `AVAILABLE`
- If the tool throws an error or is not found → record `UNAVAILABLE`

**Figma MCP:**
Attempt to call `mcp__figma-console__figma_get_status`.
- If the call succeeds → record `AVAILABLE`
- If the tool throws an error or is not found → record `UNAVAILABLE`

**Stitch MCP:**
Attempt to call `mcp__stitch__list_projects`.
- If the call succeeds → record `AVAILABLE`
- If the tool throws an error or is not found → record `UNAVAILABLE`

Record all three results for inclusion in the health report.

## Step 3: Build the health report

Parse each script's output and exit code. Present results in this format when all quality checks pass:

```
╔═══════════════════════════════════════╗
║       naksha doctor                   ║
╚═══════════════════════════════════════╝

  ✅  validate-structure    8/8 checks passed
  ✅  verify-metadata       all counts consistent
  ✅  behavioral-smoke      fixtures passing
  ✅  guard-legacy-branding no banned strings found

  ──────────────────────────────────────
  MCPs         playwright  ✅ AVAILABLE
               figma       ✅ AVAILABLE
               stitch      ✅ AVAILABLE
  ──────────────────────────────────────

  ══════════════════════════════════════
  Status: HEALTHY — 4/4 checks passed
  ══════════════════════════════════════
```

When any quality check fails, show ❌ and a one-line summary. The HEALTHY/UNHEALTHY status and N/4 count is based on script checks only — MCP availability is shown separately as an environment probe:

```
╔═══════════════════════════════════════╗
║       naksha doctor                   ║
╚═══════════════════════════════════════╝

  ✅  validate-structure    8/8 checks passed
  ❌  verify-metadata       FAIL — commands count mismatch
  ✅  behavioral-smoke      fixtures passing
  ✅  guard-legacy-branding no banned strings found

  ──────────────────────────────────────
  MCPs         playwright  ❌ UNAVAILABLE
               figma       ✅ AVAILABLE
               stitch      ✅ AVAILABLE
  ──────────────────────────────────────
  Note: /design-compare, /competitive-audit require Playwright.
  These commands will fall back to manual screenshot mode.
  ──────────────────────────────────────

  ══════════════════════════════════════
  Status: UNHEALTHY — 1/4 checks failed
  ══════════════════════════════════════

  ❌ verify-metadata failure:
  The actual number of command files in commands/ doesn't match
  the count declared in meta/stats.json.

  To fix: update meta/stats.json → commands to match the actual
  file count, then re-run /naksha-doctor.
```

Only show the MCP Note line when at least one MCP is UNAVAILABLE. Map each unavailable MCP to the commands that depend on it:
- playwright UNAVAILABLE → `/design-compare`, `/competitive-audit`, `/design-review` (URL mode), `/design-critique` (URL mode)
- figma UNAVAILABLE → `/figma-create`, `/figma-sync`, `/design-lint`, `/design-score` (Figma mode)
- stitch UNAVAILABLE → `/design` (--stitch mode), `/design-template` (--stitch mode), `/ab-variants` (Stitch engine), `/design-system` (--stitch export), `/figma` (stitch: input), `/site-to-figma` (--stitch mode)

## Step 4: Fix mode (if --fix argument present)

When `--fix` is present, after the report add a numbered remediation checklist for each failed check:

**validate-structure failures:**
- `command-count`: run `ls commands/*.md | wc -l`, update `meta/stats.json` commands field to match
- `reference-count`: run `ls skills/design/references/*.md | wc -l`, update `meta/stats.json` reference_files field
- `version-consistency`: sync `meta/stats.json` version and `.claude-plugin/plugin.json` version to the same value
- `command-frontmatter`: open each listed command file, add a `description:` frontmatter line
- `no-empty-commands`: open each listed empty file, add at minimum a description and one process step
- `pipeline-yaml-structure`: open each listed YAML file, add the missing `name:`, `description:`, `steps:`, or `command:` field
- `skill-command-sync`: open `skills/design/SKILL.md`, find the Plugin Commands table, add a row for each unlisted command
- `command-allowed-tools`: open each listed command file, add `allowed-tools: ["Read"]` to the frontmatter

**verify-metadata failures:**
- commands count mismatch: run `ls commands/*.md | wc -l` → update `meta/stats.json`
- reference_files count mismatch: run `ls skills/design/references/*.md | wc -l` → update `meta/stats.json`
- version mismatch: sync both `meta/stats.json` and `.claude-plugin/plugin.json` to the same version

**behavioral-smoke failures:**
- Each FAIL shows a fixture filename and the missing keywords/headers/chars
- If the fixture contains the SENTINEL comment, it hasn't been initialized — run the command and paste the output into the fixture file
- If the fixture has content but still fails: run the command locally and update the fixture

**guard-legacy-branding failures:**
- Each FAIL shows the file and line number with the banned string
- The file contains the pre-rename plugin name (the old name used before the March 2026 rebrand). Replace the offending string with the current brand name `naksha`.

**MCP availability (informational — not a quality gate):**
- `playwright UNAVAILABLE`: Playwright MCP is not running in this session. Ensure `mcp__plugin_playwright_playwright` is configured in your Claude Code MCP settings and the Playwright server is started.
- `figma UNAVAILABLE`: Figma MCP is not running. Ensure `mcp__figma-console` is installed and the Figma plugin bridge is active in your Figma desktop app.
- `stitch UNAVAILABLE`: Stitch MCP is not connected. Add it with:
  ```bash
  claude mcp add stitch --transport http https://stitch.googleapis.com/mcp \
    --header "X-Goog-Api-Key: YOUR_KEY" -s user
  ```
  Get your API key at https://stitch.withgoogle.com → Settings → API Keys.
- All three MCPs unavailable does not affect plugin health — it only limits vision-powered, Figma-native, and Stitch-powered commands.

## Notes

- Run from the project directory — the plugin root is where `meta/stats.json` lives
- The doctor does not auto-fix anything — it diagnoses and guides
- For a fast structural check only: `node scripts/validate-structure.js`
- For a full local quality sweep: `bash scripts/quality-check.sh`
