---
description: "Run multi-command design pipelines. Subcommands: run <name> [input], list, show <name>, new."
argument-hint: "run <pipeline-name> [brief] | list | show <name> | new"
allowed-tools: ["Read", "Write", "Bash", "Glob", "mcp__plugin_playwright_playwright__browser_navigate", "mcp__plugin_playwright_playwright__browser_take_screenshot", "mcp__plugin_playwright_playwright__browser_snapshot"]
---

# /pipeline

You are the Pipeline Orchestrator for naksha-studio. Parse `$ARGUMENTS` to determine the subcommand and act accordingly.

## Argument Parsing

Split `$ARGUMENTS` on whitespace:
- First word → **subcommand** (`run`, `list`, `show`, or `new`)
- Second word → **pipeline name** (for `run` and `show`)
- Remaining words → **user input / brief** (for `run`)

If no subcommand is given, display the usage block below and stop:

```
Usage:
  /pipeline run <name> [brief]   — Execute a named pipeline
  /pipeline list                 — List all available pipelines
  /pipeline show <name>          — Show pipeline definition and steps
  /pipeline new                  — Interactively create a new pipeline

Examples:
  /pipeline run launch-prep "redesign the checkout page"
  /pipeline run research-and-design "https://stripe.com build checkout"
  /pipeline list
  /pipeline show research-and-design
  /pipeline new
```

## v5 Pipeline YAML Schema

Pipelines are YAML files. v5 extends the v4 schema with new step types and memory fields — all additions are backward-compatible.

```yaml
name: my-pipeline
description: What this pipeline does
version: "2"        # optional: marks v5.2 schema. Absent = v4 (still valid)
on-error: stop      # stop | continue

steps:
  # v4 command step (unchanged):
  - command: design
    args: "$INPUT"
    description: "Design the component"
    pass-output-as: context    # pass this step's output to the next step

  # v5 command step (adds memory_read and memory_write):
  - command: design-review
    pass-output-as: context
    description: "Review with full project constraints"
    memory_read: ["constraints", "component_patterns"]  # prepend these fields as context
    memory_write: component_patterns                    # write step output to this path

  # v5 browser step (NEW — requires Playwright MCP):
  - type: browser
    mode: research             # research | inspect
    url: https://stripe.com
    name: "Capture Stripe patterns"
    memory_write: browser_findings   # always writes to browser_findings
```

**`memory_read:`** — list of `project.json` fields to explicitly inject as context before this step runs. Useful for documenting intent and ensuring specific fields are available even in steps that don't read context by default.

**`memory_write:`** — for `browser:` steps: always `browser_findings`. For `command:` steps: a dot-notation path in `project.json` to record this step's output summary. The orchestrator emits a `project_json_patch` block after the step.

**`type: browser` step** — navigates a URL with Playwright, extracts design patterns, and writes findings to `browser_findings`. Skips gracefully when Playwright is unavailable (step is marked SKIPPED in summary). The captured patterns flow as context to the *following* command step (like `pass-output-as: context` for browser steps).

---

## Subcommand: `list`

1. Use Glob to find built-in pipelines: `${CLAUDE_PLUGIN_ROOT}/skills/design/pipelines/*.yaml`
2. Use Glob to find user-defined pipelines: `.naksha/pipelines/*.yaml` (skip silently if the directory does not exist)
3. Read each YAML file and extract: `name`, `description`, `version` (if present), and the `steps` array length.
4. For step count: include all step types (command + browser). Annotate v5 pipelines with `[v5]`.
5. Display a formatted table:

```
Available Pipelines
───────────────────────────────────────────────────────────────────────
 Name                    Steps  Tag           Description
───────────────────────────────────────────────────────────────────────
 launch-prep               4    (built-in)    Full pre-launch design pass
 brand-audit               3    (built-in)    Complete brand health check
 component-build           3    (built-in)    Build a component end-to-end
 social-launch             3    (built-in)    Full social media launch
 research-and-design       3    (built-in) [v5]  Browser research → design → review
 design-score-track        3    (built-in) [v5]  Score → remember improvements
 <user-name>               N    (project)     <description>
───────────────────────────────────────────────────────────────────────
```

6. End with:

> Create your own: `/pipeline new`  ·  Inspect any: `/pipeline show <name>`
> User pipelines live in `.naksha/pipelines/` — same YAML format, project-local.

---

## Subcommand: `show <name>`

1. Resolve the pipeline file using this search order:
   - `.naksha/pipelines/<name>.yaml` (user-defined, project-local)
   - `${CLAUDE_PLUGIN_ROOT}/skills/design/pipelines/<name>.yaml` (built-in)
2. If not found, output:
   > Pipeline '<name>' not found. Run `/pipeline list` to see available pipelines.
   Then stop.
3. Read the YAML and display a structured view:

```
Pipeline: <name>  [built-in | project]  {[v5] if version: "2"}
Description: <description>
Error handling: <on-error value>

Steps:
┌───────┬──────────────────────┬──────────────────┬──────────┬─────────────────────────────────────────┐
│ Step  │ Command / Type       │ Input            │ Memory   │ Description                             │
├───────┼──────────────────────┼──────────────────┼──────────┼─────────────────────────────────────────┤
│  1    │ /design              │ $INPUT (brief)   │          │ Create comprehensive design             │
│  2    │ 🌐 browser:research  │ captures url     │ →findings│ Capture competitor patterns             │
│  3    │ /design-review       │ prev step output │ ←constr. │ Review against project constraints      │
│  4    │ /design-handoff      │ prev step output │          │ Prepare developer handoff docs          │
└───────┴──────────────────────┴──────────────────┴──────────┴─────────────────────────────────────────┘
```

- For `command:` steps: Command column shows `/{command}`. Memory column shows `←{memory_read fields}` if set, `→{memory_write path}` if set, or blank.
- For `browser:` steps: Command column shows `🌐 browser:{mode}`. Input column shows the target URL. Memory column shows `→browser_findings`.

For step 1: Input column shows `$INPUT (user brief)`.
For subsequent steps: Input column shows `output from step N-1`.

4. End with:

> Run with `/pipeline run <name> [your brief]`

---

## Subcommand: `run <name> [input]`

### Phase 1 — Resolve & Display Plan

1. Resolve the pipeline file:
   - `.naksha/pipelines/<name>.yaml`
   - `${CLAUDE_PLUGIN_ROOT}/skills/design/pipelines/<name>.yaml`
2. If not found:
   > Pipeline '<name>' not found. Run `/pipeline list` to see available pipelines.
   Stop.
3. Read the YAML. Display the full plan before executing:

```
Pipeline: <name>
Description: <description>

Steps to run:
  1. /<command>  — <description>
  2. /<command>  — <description>
  ...

Input: "<user brief>"
```

4. Ask the user for confirmation:

> Ready to run this pipeline? Reply **yes** to proceed, or provide a revised brief.

Wait for user confirmation before executing any steps.

---

### Phase 2 — Sequential Execution

Execute steps one at a time. For each step N of TOTAL:

#### For `command:` steps

**Before the step:**
```
▸ Step N/TOTAL: Running /<command>...
```

If the step has `memory_read:` fields, note:
```
  ↳ Injecting context: {field1}, {field2} from project memory
```

**Passing input:**
- Step 1: Use the user's brief/input as the argument to the command.
- Step 2+: State explicitly — "Using output from step N-1 as context for /<command>." Then invoke the command with that context.
- If the previous step was a `browser:` step, state: "Using browser capture findings from step N-1 as design reference."

**After the step succeeds:**
```
✓ Step N/TOTAL complete.
```

If the step has `memory_write:` set, emit at the end of the step:
```html
<!-- naksha-memory-update
{"type": "project_json_patch", "path": "{memory_write value}", "value": "{terse summary of this step's key output, ≤200 chars}"}
-->
```

#### For `browser:` steps

**Before the step:**
```
▸ Step N/TOTAL: Browser capture — {mode} {url}
```

**Execute:**
1. Probe Playwright availability: attempt `mcp__plugin_playwright_playwright__browser_navigate` with `url: "about:blank"`.
2. **If Playwright unavailable:**
   ```
   ⚠  Step N/TOTAL: SKIPPED — Playwright not available.
      Browser capture requires the Playwright MCP server.
      Continuing pipeline without browser context.
   ```
   Mark the step as SKIPPED. Continue to the next step. Pass no browser context forward.
3. **If Playwright available:**
   - Navigate to the URL: `mcp__plugin_playwright_playwright__browser_navigate`
   - Capture: `mcp__plugin_playwright_playwright__browser_take_screenshot` + `mcp__plugin_playwright_playwright__browser_snapshot`
   - Extract 3–7 design patterns from what's visible (same logic as `/naksha-browse`)
   - Display a compact findings summary:
     ```
     ✓ Step N/TOTAL: Captured {N} patterns from {url}
       → {pattern-name-1}: {description}
       → {pattern-name-2}: {description}
       [up to 5 patterns shown inline]
     ```
   - Emit a `browser_finding_write` memory block at end of response (same as `/naksha-browse` Step 7b)
   - Store the findings as the "output" of this step — the next command step receives them as context

**If a step fails and `on-error: stop` is set:**
```
✗ Step N failed. Pipeline stopped.
  To resume: run /<next-command> with the output from step N-1 as your context.
```
Do not continue to subsequent steps. Jump to the Manual Fallback section for remaining steps.

---

### Phase 3 — Aggregated Summary Report

After all steps complete (or stop on error), produce this report:

```
══════════════════════════════════════════════════
  Pipeline Complete: <name>
  Steps: {completed}/TOTAL  {(N skipped) if any were skipped}
══════════════════════════════════════════════════

Step-by-step outputs:

  Step 1 — /<command>
  <2–3 sentence summary of key outputs from this step>

  Step 2 — 🌐 browser:{mode}  [SKIPPED — Playwright unavailable]
  (No browser context captured. Run /naksha-browse separately.)

  Step 3 — /<command>
  <2–3 sentence summary of key outputs from this step>

  ... (one entry per step; SKIPPED steps shown with reason)

What to do next:
  • <suggest 2–3 related commands based on what the pipeline produced>
══════════════════════════════════════════════════
```

For pipelines that included browser steps: if any were SKIPPED, add:
```
  ℹ  To run the full pipeline with browser vision:
     Install Playwright MCP: npx @playwright/mcp@latest
     Then re-run: /pipeline run <name> [brief]
```

Tailor the "What to do next" suggestions to the pipeline that was run. Examples:
- After `launch-prep`: suggest `/figma-create`, `/design-present`, `/design-system`
- After `brand-audit`: suggest `/brand-kit`, `/design-system`, `/lint-design`
- After `component-build`: suggest `/component-docs`, `/figma-component-library`, `/design-qa`
- After `social-launch`: suggest `/social-content`, `/social-analytics`, `/gen-image`

---

## If Pipeline Execution Fails

If automatic pipeline execution is unable to proceed, generate a manual fallback from the pipeline's steps. The steps below are dynamically derived from the pipeline definition — replace the command names and descriptions with the actual pipeline's steps:

```
Manual Fallback — run each command in order, passing the output of each
step as context to the next:

  1. /<step-1-command> [your brief]
  2. /<step-2-command> [use output from step 1 as context]
  3. /<step-3-command> [use output from step 2 as context]
  4. /<step-4-command> [use output from step 3 as context]
```

Generate this list dynamically for whichever pipeline is being run — do not hardcode step names.

For `browser:` steps in the fallback list, render them as:
```
  N.   (Browser capture — run /naksha-browse {url} first, then use the findings as context for the next step)
```

---

---

## Subcommand: `new`

Interactively guides the user to create a new pipeline YAML, then writes it to `.naksha/pipelines/<name>.yaml`.

### Step 1 — Ask for pipeline goal

> "What should this pipeline accomplish? (e.g., 'research a competitor and then design an alternative', or 'full pre-launch review')"

Wait for the user's answer. Store as `pipeline_goal`.

### Step 2 — Suggest a step sequence

Based on the goal, propose a step sequence (3–6 steps). Show the proposal before asking for confirmation:

```
Here's a step sequence for "{pipeline_goal}":

  1. 🌐 browser:research  https://example.com  — capture competitor patterns
  2. /design              — design with captured patterns as reference
  3. /design-review       — review against project constraints
  4. /design-score        — quantitative quality score

Does this look right? Reply yes to build it, or describe changes.
```

If the user describes changes, adjust the sequence. Repeat until confirmed.

**Guidance on step selection:**
- If the goal mentions "research", "competitor", "inspiration", "browse", or a URL → include a `browser:research` step first
- If the goal mentions "inspect", "localhost", "my UI" → include a `browser:inspect` step
- If the goal mentions "score" or "quality check" → include `/design-score`
- If the goal mentions "constraints" or "rules" → add `memory_read: ["constraints"]` to relevant steps
- If the goal mentions "save" or "remember" → add `memory_write: component_patterns` to the design step

### Step 3 — Collect step details

For each step in the proposed sequence, ask only what's needed:

**For `browser:` steps:**
- URL: "What URL should I capture?" (if not already clear from the goal)
- Mode: auto-detect (`research` for external, `inspect` for localhost) — only ask if ambiguous

**For `command:` steps:** No additional questions needed — defaults are sufficient.

### Step 4 — Ask for pipeline name

> "What should this pipeline be named? (kebab-case, e.g. `competitor-research`, `checkout-redesign`)"

Validate: only lowercase letters, numbers, hyphens. No spaces.

### Step 5 — Write the YAML

Ensure `.naksha/pipelines/` directory exists:
```bash
mkdir -p .naksha/pipelines
```

Build the YAML file from the collected steps. Example output for a research-and-design pipeline:

```yaml
name: competitor-checkout
description: Research Stripe checkout, then design an alternative
version: "2"
steps:
  - type: browser
    mode: research
    url: https://stripe.com/payments
    name: "Capture Stripe checkout patterns"
    memory_write: browser_findings
  - command: design
    args: "$INPUT"
    description: "Design checkout with Stripe patterns as reference"
    memory_read: ["browser_findings", "constraints"]
  - command: design-review
    pass-output-as: context
    description: "Review against project constraints"
    memory_read: ["constraints", "component_patterns"]
  - command: design-score
    pass-output-as: context
    description: "Quantitative quality score"
on-error: stop
```

Write to `.naksha/pipelines/<name>.yaml` using the Write tool.

### Step 6 — Confirm and offer to run

```
╔══════════════════════════════════════════════════════════╗
║  Pipeline created: {name}                                ║
╚══════════════════════════════════════════════════════════╝

  Saved to: .naksha/pipelines/{name}.yaml
  Steps: {N}  |  Version: v5.2 (browser-capable)

  Run now?  /pipeline run {name} [your brief]
  Inspect:  /pipeline show {name}
```

---

## Notes

- Pipeline YAML files use `pass-output-as: context` to signal that a step should receive the prior step's output. Honor this when passing context between steps.
- User-defined pipelines in `.naksha/pipelines/` take precedence over built-in pipelines of the same name.
- `browser:` steps require Playwright MCP. They skip gracefully when unavailable — the pipeline continues, just without browser context.
- `memory_read:` is additive context injection on top of whatever the command already reads natively (Track B). Use it when you want to be explicit or to inject context into commands that don't natively read project memory.
- `memory_write:` on command steps captures a terse summary of that step's output to a project.json path. Useful for cross-session tracking. On browser steps, it always means `browser_findings`.
- If `$ARGUMENTS` is empty or unrecognized, show the usage block from the top of this file.
- See `docs/pipeline-failure-modes.md` for full error handling reference.
