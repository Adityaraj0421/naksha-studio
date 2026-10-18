---
description: "Run all naksha quality checks and report the plugin's health status, or diagnose misrouted roles from local session transcripts with --transcripts."
argument-hint: "[--fix] [--transcripts [path]]"
allowed-tools: ["Bash", "Read", "Glob", "Grep", "Write", "mcp__plugin_playwright_playwright__browser_navigate", "mcp__figma-console__figma_get_status", "mcp__stitch__list_projects"]
---

# /naksha-doctor

Run a full health check of the naksha plugin — structural validation, metadata consistency, behavioral smoke, and legacy branding guard. Report each check as ✅ PASS or ❌ FAIL with specific remediation for any failures.

## Arguments

- No argument: run all checks and show the status report
- `--fix`: after showing failures, output step-by-step remediation instructions for each failed check
- `--transcripts [path]`: skip the health checks and run **Transcript Mode** (see the end of this file). It reads recent Claude Code session transcripts, finds naksha runs that misfired, and proposes regression evals in `.naksha/proposed-evals.json`. `path` is a transcript `.jsonl` file or a folder of them; without it, the current project's folder under `~/.claude/projects/` is used.

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

## Step 2.6: Project Memory Check

Look for `.naksha/project.json` in the current directory and up to 3 parent directories.

- **Not found** → record `NO_PROJECT` (informational — the plugin may be running outside a project directory)
- **Found, has `schema_version: "5"`** → record `V5`
- **Found, missing `schema_version`** → record `V4` (v4 project — eligible for v5 upgrade)

Record this result for the health report. This check is **informational** — v4 projects are valid, they just lack v5 memory features.

## Step 2.7: Reel Toolchain Check

Probe the toolchain `/design-reel` needs to render video. **Informational** — its absence
does not make the plugin unhealthy; it means `/design-reel` is unavailable until set up.

```bash
command -v node >/dev/null 2>&1 && echo "node $(node -v)" || echo "node MISSING"
command -v ffmpeg >/dev/null 2>&1 && echo "ffmpeg OK" || echo "ffmpeg MISSING"
[ -d packages/naksha-reel/node_modules ] && echo "reel-deps INSTALLED" || echo "reel-deps NOT_INSTALLED"
```

- All present → record `READY`.
- node or ffmpeg missing → record `UNAVAILABLE` (cannot render).
- node + ffmpeg present but `reel-deps NOT_INSTALLED` → record `SETUP_NEEDED` (one-time
  `npm install` in `packages/naksha-reel`, done automatically on first `/design-reel` run).

When not `READY`, add this line to the report's Note section:
`Note: /design-reel requires Node + ffmpeg + packages/naksha-reel. See docs/reel-setup.md.`

## Step 3: Build the health report

Parse each script's output and exit code. Present results in this format when all quality checks pass:

```
╔═══════════════════════════════════════╗
║       naksha doctor                   ║
╚═══════════════════════════════════════╝

  ✅  validate-structure    9/9 checks passed
  ✅  verify-metadata       all counts consistent
  ✅  behavioral-smoke      fixtures passing
  ✅  guard-legacy-branding no banned strings found

  ──────────────────────────────────────
  MCPs         playwright  ✅ AVAILABLE
               figma       ✅ AVAILABLE
               stitch      ✅ AVAILABLE
  ──────────────────────────────────────
  Memory       schema      ✅ v5 (project.json found)
  ──────────────────────────────────────
  Reel         toolchain   ✅ READY (/design-reel)
  ──────────────────────────────────────

  ══════════════════════════════════════
  Status: HEALTHY — 4/4 checks passed
  ══════════════════════════════════════
```

Show the Reel row from the Step 2.7 result: `READY` → `✅ READY (/design-reel)`;
`SETUP_NEEDED` → `⚠  setup needed — npm install runs on first /design-reel`;
`UNAVAILABLE` → `❌ UNAVAILABLE — node/ffmpeg missing (see docs/reel-setup.md)`.

Show the Memory row based on Step 2.6 result:
- `V5` → `✅ v5 (project.json found)`
- `V4` → `⚠  v4 — run /naksha-doctor --fix to upgrade to v5`
- `NO_PROJECT` → `ℹ  no project.json — run /naksha-init to set up`

When any quality check fails, show ❌ and a one-line summary. The HEALTHY/UNHEALTHY status and N/4 count is based on script checks only — MCP and memory availability are shown separately as environment probes:

```
╔═══════════════════════════════════════╗
║       naksha doctor                   ║
╚═══════════════════════════════════════╝

  ✅  validate-structure    9/9 checks passed
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
  Memory       schema      ⚠  v4 — run /naksha-doctor --fix to upgrade to v5
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
- `role-quality-contracts`: run `node scripts/check-role-contracts.js` for the list. Each named role reference needs a `## Quality Contract` section with `### Red flags` (3–5 items), `### Excuses to reject` (2–4 excuses, each with a rebuttal) and `### Evidence of done` (3–5 items). Copy the layout from any complete reference, such as `skills/design/references/ui-designer.md`, and write content specific to that role

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

**Project memory — no project.json found:**
- Run `/naksha-init` from the project root directory to create `.naksha/project.json` and set up brand and framework context.

**Project memory — v4 schema detected:**
- When project.json exists but has no `schema_version` field, it is a v4 project.
- To upgrade: read the current `.naksha/project.json`, add these four fields, and write it back:
  ```json
  "schema_version": "5",
  "constraints": {},
  "component_patterns": [],
  "browser_findings": []
  ```
  Preserve all existing v4 fields (`name`, `brand`, `framework`, `tokenFormat`, `createdAt`, etc.) unchanged. Report:
  ```
  [MEMORY] project.json upgraded: v4 → v5 (schema_version, constraints, component_patterns, browser_findings added)
  ```
- Alternatively, re-run `/naksha-init` — it now upgrades automatically while keeping all brand and framework values.

## Transcript Mode (`--transcripts [path]`)

Find naksha runs that went wrong in past sessions, so each one becomes a regression eval. This mode skips Steps 2–4.

`PLUGIN_ROOT` below means `${CLAUDE_PLUGIN_ROOT}` when it is set, or the root found in Step 1 otherwise. Unlike Step 1, **stay in the user's project directory**: the default transcript folder is worked out from the current directory, and `.naksha/` belongs to the project.

**Privacy: transcript content stays on this machine.** Transcripts hold everything said and done in a session. In this mode:
- Read transcripts only with the local scanner below. Never upload, fetch, or send transcript content anywhere, and never call an MCP or web tool with it.
- Show the user only short excerpts (the scanner caps them and masks emails, API keys and long tokens).
- Write only `.naksha/proposed-evals.json`, with eval prompts rewritten so they hold no names, emails, URLs, file paths, customer data or secrets.

### T1. Scan the transcripts

```bash
node "$PLUGIN_ROOT/scripts/scan-transcripts.js" [path] --limit 20
```

- Without `path`, the scanner reads `~/.claude/projects/<project>/`, where `<project>` is the current directory with every character that isn't a letter or digit replaced by `-` (`/Users/me/app` → `-Users-me-app`).
- Add `--subagents` to include subagent transcripts (`<session>/subagents/*.jsonl`).
- Turns that look like work on naksha itself (editing `skills/design/` or `commands/`, or reading naksha's files from inside the working directory) are skipped and counted as `devTurnsSkipped`. Add `--include-dev` only if the user asks for them.
- Exit code 2 with an `error` field, or `counts.files` of 0, means no transcripts were found. Tell the user where you looked, ask for a path, and stop.

The output is JSON with `counts` and `invocations`. Each invocation has the `task` (redacted and capped), the `command` used (if any), `rolesLoaded` (role references read), `rolesNamed` (roles mentioned in the reply, with counts), `keywordRoles` and `keywordRolesNotLoaded` (roles whose routing keywords appear in the task), `filesWritten`, and an `output` excerpt.

The transcript format is not a published contract. The scanner skips lines it can't parse and records without a recognisable message, and counts both. Always report the counts. If `unparseable` is more than 10% of `lines`, warn that the format may have changed and that the results may be incomplete.

### T2. Load what "right" looks like

- Routing rules: the team assembly table and **Rules** in Step 3 of `$PLUGIN_ROOT/skills/design/SKILL.md`.
- Each role's `activate` text: `$PLUGIN_ROOT/adapters/roles.json`.
- Each role's Quality Contract: `node "$PLUGIN_ROOT/scripts/check-role-contracts.js" --json`. If this exits non-zero, a contract is broken. Say so, suggest plain `/naksha-doctor`, and skip check M3 below.

### T3. Classify each invocation

Check each invocation against the three misfire types. `keywordRoles` is a keyword hint, not a verdict, so confirm every flag against the routing rules and the task's actual intent. A task that mentions "email" in passing ("add an email field to the signup form") doesn't need the Email Designer.

| Type | Flag it when | Typical evidence |
|---|---|---|
| **M1 Misrouted** | A role the routing rules call for was never activated, or an activated role has no connection to the task (its `activate` text doesn't match anything asked), or a standard task was staffed with more than 4 roles for no stated reason | `keywordRolesNotLoaded` confirmed by a Step 3 rule; e.g. a "welcome email" task that loaded only the UI Designer |
| **M2 Silent role** | A role was activated (in `rolesLoaded`, or named in the team line of the reply) but the output contains nothing from its domain | Motion Designer named, but no durations, easing or transitions anywhere in the output or written files |
| **M3 Missing evidence** | For an activated role, 2 or more of its **Evidence of done** items appear neither in the output nor in `filesWritten` | UI Designer activated, but no contrast ratios and no previews at 375/768/1440 |

For M2 and M3, read the files in `filesWritten` that still exist locally before deciding. Evidence often lives in the written HTML, CSS or docs rather than in the reply. An item counts as present only if the artifact itself is there ("contrast 4.6:1 for body text"), not just a mention ("checked contrast").

Don't flag an invocation when:
- the user explicitly narrowed the scope ("just the copy", "quick sketch, skip the specs"),
- the turn was cut off, errored, or has an empty output (count it as **incomplete** instead), or
- the task was a question about naksha rather than design work.

### T4. Propose one regression eval per misfire

Use the `evals/evals.json` entry shape, **without `id`** (ids are assigned when a maintainer merges):

```json
{
  "name": "regression-email-routing-welcome-email",
  "role": "skills/design/references/email-designer.md",
  "prompt": "Design a welcome email for new signups to a project management app",
  "expected_output": "Routes to the Email Designer and Email Copywriter and delivers a table-based HTML email with subject line and preheader",
  "assertions": [
    { "name": "activates-email-designer", "description": "Reads email-designer.md or names the Email Designer in the team" },
    { "name": "activates-email-copywriter", "description": "Subject line, preview text and body copy come from the Email Copywriter" },
    { "name": "table-layout", "description": "HTML uses table layout with inline styles, not flexbox or grid" },
    { "name": "client-test-evidence", "description": "Includes a client test matrix or names the clients checked" }
  ]
}
```

- `name`: `regression-<area>-<short-slug>`, kebab-case, unique within the file.
- `command`: include only when the invocation used a command; use the bare command name (`/design-review`).
- `role`: the reference of the role at the centre of the misfire (the one that should have activated, stayed silent, or lacked evidence).
- `prompt`: a **generalized rewrite** of the task, never a verbatim copy. Keep the design intent and the keywords that should trigger routing; replace names, brands, URLs, paths and data with neutral stand-ins.
- `assertions`: 4–6 checkable items. For M1, assert the right roles activate (and, if relevant, that the wrong one doesn't). For M2, assert the silent role produces a concrete artifact in its domain. For M3, turn the missing **Evidence of done** items into assertions.

### T5. Write `.naksha/proposed-evals.json`

Create `.naksha/` in the current project directory if needed. If the file already exists, read it first and append: skip any eval whose `name` or `prompt` already appears, and never remove or rewrite existing entries. Write this shape:

```json
{
  "skill_name": "design",
  "generated_by": "/naksha-doctor --transcripts",
  "generated_at": "<ISO 8601 timestamp>",
  "source": { "transcripts": "<folder or file scanned>", "files_scanned": 0, "invocations": 0 },
  "evals": [],
  "misfires": [
    { "eval": "<eval name>", "type": "M1|M2|M3", "session": "<session id>", "timestamp": "<when it ran>", "detail": "<one line, no transcript quotes>" }
  ]
}
```

**Never edit `evals/evals.json`.** The proposals are for the user to review. To adopt one, a maintainer copies it into `evals/evals.json`, gives it the next free `id`, and runs `bash scripts/run-evals.sh`. If nothing misfired, don't create or touch the file.

### T6. Report

```
╔═══════════════════════════════════════╗
║       naksha doctor — transcripts     ║
╚═══════════════════════════════════════╝

  Scanned    20 transcript files · 4,717 lines (0 unparseable, 2,248 non-message records skipped)
  Found      6 naksha runs in 4 sessions · 2 development turns skipped

  ❌ M1 misrouted        1   "welcome email" task never reached the Email Designer
  ❌ M2 silent role      1   Motion Designer named, no motion spec produced
  ❌ M3 missing evidence 2   UI Designer: no contrast ratios, no 375/768/1440 previews
  ✅ clean               2
  ⚠  incomplete          0

  Proposed 4 regression evals → .naksha/proposed-evals.json (review before merging)
  Transcript content stayed on this machine.
```

List each misfire as one line: date, command (or "design skill"), type, role, and the reason. Don't quote more than a short phrase of the original task.

## Notes

- Run from the project directory — the plugin root is where `meta/stats.json` lives
- The doctor does not auto-fix anything — it diagnoses and guides. The only file it writes is `.naksha/proposed-evals.json`, and only in Transcript Mode
- For a fast structural check only: `node scripts/validate-structure.js`
- For a full local quality sweep: `bash scripts/quality-check.sh`
- Transcript Mode reads local files only. The scanner's options are listed in the header comment of `scripts/scan-transcripts.js`
