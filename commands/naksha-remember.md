---
description: "Record a design constraint, component pattern, or decision to persistent project memory — naksha commands will use it as context from this point forward."
argument-hint: "<decision> [; <decision2> ; ...]"
allowed-tools: ["Read", "Write", "Bash", "Glob"]
---

# /naksha-remember $ARGUMENTS

You are the **Project Memory Architect** for naksha. Your job is to take design decisions stated in plain English, classify each one into the right structured field in `.naksha/project.json`, and persist them so that all other naksha commands receive them as context automatically.

Input: **$ARGUMENTS**

## Step 0: Parse Input

Split `$ARGUMENTS` on semicolons (`;`) to get individual decisions. Trim whitespace from each. If only one input and no semicolon, treat it as a single decision. Preserve the original wording — classification is done in Step 2.

Examples of valid input:
- `/naksha-remember grid is 8px`
- `/naksha-remember no dark mode; RTL support is out of scope`
- `/naksha-remember card layout: white background, 8px radius, 16px padding; target WCAG AA`

## Step 1: Find and Read Project Memory

Search up to 3 directory levels for `.naksha/project.json`:

```bash
current="$PWD"
for i in {0..3}; do
  [ -f "$current/.naksha/project.json" ] && echo "$current/.naksha/project.json" && break
  current=$(dirname "$current")
done
```

**If not found:** stop and show:
```
  No project memory found.
  Run /naksha-init to set up your project, then use /naksha-remember to record decisions.
```

**If found:** read the full JSON. Extract all existing v5 fields to avoid clobbering them:
- `constraints` (full object) — default to `{}` if absent
- `component_patterns` (array) — default to `[]` if absent
- `schema_version` — note whether already "5" or absent (v4)

Store the project file path as `project_json_path`.
Store `.naksha/memory.md` path as `memory_path`.

## Step 2: Classify Each Decision

For each decision in the parsed list, classify it into one target field using the rules below. Classification is done by semantic matching against the decision text — be generous in matching intent, not just literal keywords.

---

### Field: `constraints.grid`

**Signals:** mentions grid unit, base spacing, spacing system baseline, "4px", "8px", "grid is", "spacing unit", "base unit is"

**Pattern:** extract the px value
- "grid is 8px" → `"8px"`
- "base spacing unit: 4" → `"4px"`
- "we use an 8-point grid" → `"8px"`

---

### Field: `constraints.dark_mode`

**Signals:** mentions dark mode explicitly

- Negative: "no dark mode", "skip dark mode", "dark mode is out of scope", "we're not doing dark mode", "single theme only" → `false`
- Positive: "support dark mode", "dark mode required", "implement dark mode", "dark mode is in scope" → `true`

---

### Field: `constraints.min_contrast_ratio`

**Signals:** mentions contrast ratio, WCAG contrast, color contrast requirement

- "min contrast 4.5:1" → `4.5`
- "WCAG AA contrast" → `4.5` (AA body text standard)
- "WCAG AAA" → `7.0`
- "large text contrast 3:1" → `3.0`
- Extract the number directly if stated

---

### Field: `constraints.breakpoints`

**Signals:** mentions breakpoints, responsive breakpoints, viewport widths, mobile/tablet/desktop breakpoints

- "breakpoints at 768, 1024, 1280" → `[768, 1024, 1280]`
- "mobile 640, tablet 768, desktop 1024" → `[640, 768, 1024]`
- "standard tailwind breakpoints (sm: 640, md: 768, lg: 1024, xl: 1280)" → `[640, 768, 1024, 1280]`
- Extract numbers as integers

---

### Field: `constraints.max_content_width`

**Signals:** mentions max width, maximum content width, container max, layout max, page max

- "max content width 1280px" → `1280`
- "max layout width is 1440" → `1440`
- "container capped at 960" → `960`
- Extract as integer

---

### Field: `constraints.accessibility_target`

**Signals:** mentions accessibility standard, WCAG target, a11y requirement, screen reader, compliance level

- "target WCAG AA" → `"WCAG AA"`
- "WCAG 2.1 AA compliance" → `"WCAG AA"`
- "must be WCAG AAA" → `"WCAG AAA"`
- Standardize to `"WCAG AA"` or `"WCAG AAA"` or the stated standard

---

### Field: `constraints.out_of_scope` (array — append)

**Signals:** explicitly marks something as excluded, ruled out, or deferred

- "RTL support is out of scope" → append `"RTL support"`
- "no print styles" → append `"print styles"`
- "IE11 not supported" → append `"IE11 support"`
- "skip email digests for now" → append `"email digests"`
- "we're not building a mobile app" → append `"mobile app"`

Extract the subject (what is out of scope), normalize to a short phrase.

---

### Field: `component_patterns` (array — append a ComponentPattern entry)

**Signals:** describes a recurring visual pattern for a specific UI component or layout; uses words like "always", "pattern", "component", or names a UI primitive

Component name signals: card, button, badge, chip, tag, modal, dialog, drawer, sidebar, nav, navigation, header, footer, form, input, table, avatar, tooltip, dropdown, menu, tab, accordion, alert, banner, toast, notification, skeleton, empty state, loading state

- "cards use white background, 1px border, 8px radius, 16px padding" → ComponentPattern
- "primary button is always 40px tall, full-radius" → ComponentPattern
- "nav is sticky at top with 60px height" → ComponentPattern
- "modal overlays use 0.6 opacity black backdrop" → ComponentPattern

**Build a ComponentPattern object:**
- `name`: kebab-case slug of the component (e.g. `"card-layout"`, `"primary-button"`, `"sticky-nav"`)
- `description`: rewrite as a clean one-sentence description of the pattern
- `example`: omit (no file reference available from text input)
- `recorded_at`: current ISO timestamp
- `source_command`: `"/naksha-remember"`

---

### Field: `constraints.notes` (array — append, catch-all)

**Use when:** the decision is a genuine design constraint or rule but doesn't fit any of the structured fields above.

- "all external links must open in new tab" → append note
- "use system fonts as fallback on all pages" → append note
- "never use pure black (#000) for text" → append note
- "brand photos only, no stock" → append note

**Do not use for:** things that are clearly out of scope (use `out_of_scope`) or things that clearly belong to a component (use `component_patterns`).

---

### Ambiguous inputs

If a decision could fit two fields, prefer the more specific one:
- Specific structured field > `constraints.notes`
- `component_patterns` > `constraints.notes`
- `constraints.out_of_scope` > `constraints.notes`

If genuinely unclear, classify into `constraints.notes` and note the ambiguity in the output.

---

## Step 3: Build the Updated Values

For each classified decision:

**Scalar fields** (`constraints.grid`, `constraints.dark_mode`, `constraints.min_contrast_ratio`, `constraints.max_content_width`, `constraints.accessibility_target`):
- New value replaces existing value (if any)
- Note in output if overwriting an existing value (e.g. "⚠ Updating grid from 4px → 8px")

**Array fields** (`constraints.out_of_scope`, `constraints.notes`):
- Start with existing array (from Step 1 read)
- Append the new item
- The patch value is the complete updated array

**Component patterns** (`component_patterns`):
- Start with existing array (from Step 1 read)
- Append the new ComponentPattern entry
- If `component_patterns` is at 50 entries, remove the oldest entry (by `recorded_at`) before appending
- The patch value is the complete updated array

**schema_version**:
- If the project file does not already have `"schema_version": "5"`, add it

**updatedAt**:
- Get current timestamp: `date -u +"%Y-%m-%dT%H:%M:%SZ"`
- Always update `updatedAt` to the current timestamp

## Step 4: Output

Present a summary before emitting memory blocks:

```
╔══════════════════════════════════════════════════════════════╗
║  naksha-remember                                             ║
╚══════════════════════════════════════════════════════════════╝

  Project: {project name}

  Saving {N} decision(s):

  ┌──────────────────────────────────────────────────────────┐
  │ {field path}                                             │
  │ → {new value or appended item}                          │
  └──────────────────────────────────────────────────────────┘

  {... one box per decision ...}

{If any existing value is being overwritten:}
  ⚠  Overwriting: {field} was "{old value}" → "{new value}"

  All decisions saved to project memory.
  Run /naksha-status to review your full project context.
```

**Format values in the box:**
- String: show as `"value"`
- Boolean: show as `true` / `false`
- Number: show as `4.5`
- Array append: show as `[...existing, "new item"]`
- ComponentPattern: show as `component_patterns: append {name} — {description}`

## Step 5: Memory Write — Emit Structured Blocks

Emit one `<!-- naksha-memory-update -->` block per field being updated. Emit `schema_version` and `updatedAt` blocks if needed.

**For scalar fields:**
```html
<!-- naksha-memory-update
{"type": "project_json_patch", "path": "{field.path}", "value": {value}}
-->
```

**For array fields (always include the full updated array):**
```html
<!-- naksha-memory-update
{"type": "project_json_patch", "path": "{field.path}", "value": ["existing item 1", "existing item 2", "new item"]}
-->
```

**For component_patterns (full updated array):**
```html
<!-- naksha-memory-update
{
  "type": "project_json_patch",
  "path": "component_patterns",
  "value": [
    {
      "name": "{name}",
      "description": "{description}",
      "recorded_at": "{ISO timestamp}",
      "source_command": "/naksha-remember"
    }
  ]
}
-->
```

**schema_version (if v4 project):**
```html
<!-- naksha-memory-update
{"type": "project_json_patch", "path": "schema_version", "value": "5"}
-->
```

**updatedAt:**
```html
<!-- naksha-memory-update
{"type": "project_json_patch", "path": "updatedAt", "value": "{ISO timestamp}"}
-->
```

**Rules:**
- One block per path — do not merge multiple changes into one block
- Array values in JSON must be valid JSON arrays (quoted strings, no trailing commas)
- Boolean values: `true` / `false` (not `"true"` / `"false"`)
- Number values: bare numbers (not quoted)
- Emit all blocks at the end of your response, after the output box

## Step 6: Append to memory.md

If `.naksha/memory.md` exists: append one line summarizing all decisions saved in this invocation.

Format:
```
[{ISO timestamp}] /naksha-remember: {terse summary of all changes, ≤100 chars total}
```

If multiple decisions were saved, summarize concisely:
```
[2026-05-29T15:00:00Z] /naksha-remember: grid 8px, no dark mode, WCAG AA target
[2026-05-29T15:05:00Z] /naksha-remember: card-layout pattern, RTL out of scope
```

Single decision examples:
```
[2026-05-29T15:00:00Z] /naksha-remember: constraints.grid = "8px"
[2026-05-29T15:00:00Z] /naksha-remember: dark_mode = false (explicitly ruled out)
[2026-05-29T15:00:00Z] /naksha-remember: out_of_scope += "RTL support"
```

Keep the summary ≤ 100 characters (after timestamp and `/naksha-remember: `). Truncate if needed.

## Notes

- **Overwrite vs. append**: scalar fields overwrite; array fields always append. If the user says "actually grid is 4px" and it was already "8px", that is a deliberate overwrite — note it but do not block it.
- **No project? No write.** If `.naksha/project.json` does not exist, do not create it here — that is `/naksha-init`'s job. Tell the user to run `/naksha-init` first.
- **Classification is transparent.** Always show the field path and value before writing. The user can correct a misclassification by re-running with a more specific phrasing, or by running `/naksha-init` to edit structured fields directly.
- **component_patterns vs. out_of_scope.** "We don't use modals" → `out_of_scope` ("modal component"). "Modals always use 0.6 opacity backdrop" → `component_patterns` (the "modal-backdrop" pattern). The difference: exclusion vs. specification.
- **When /naksha-remember is best.** This command is for decisions you've already made and want to persist. For discovering what your codebase already uses, run `/design-system`. For researching what others do, run `/naksha-browse`.
