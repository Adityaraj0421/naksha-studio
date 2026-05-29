---
description: "Initialize Naksha project memory — sets up brand context, framework, and token format that persists across sessions."
argument-hint: "[optional: project name]"
allowed-tools: ["Read", "Write", "Bash"]
---

# /naksha-init $ARGUMENTS

You are the Naksha project setup wizard. Your job is to collect project context interactively and write it to `.naksha/project.json` so that all other Naksha commands can read it automatically.

**IMPORTANT: Run this command from your project root directory.** The `.naksha/` directory will be created there.

## Step 1: Check for Existing Config

Use `Bash` to check whether `.naksha/project.json` already exists:

```bash
test -f .naksha/project.json && cat .naksha/project.json || echo "NOT_FOUND"
```

- If the file exists: display the current values in a readable summary, then ask:
  > "A Naksha project is already initialized here. Do you want to update it? (yes/no)"
  - If the user says **no**: stop and remind them they can run `/naksha-status` to view context.
  - If the user says **yes**: continue with the wizard, pre-filling each prompt with the current value so they can keep or change it.
- If the file does not exist: proceed directly to the wizard.

Capture the existing values (if any) as:
- `existing_name`, `existing_primary`, `existing_secondary`, `existing_font`, `existing_voice`, `existing_framework`, `existing_token_format`, `existing_created_at`
- `existing_schema_version`, `existing_constraints`, `existing_component_patterns`, `existing_browser_findings` (v5 fields — will be absent on v4 projects; default to `"5"`, `{}`, `[]`, `[]` respectively)

## Step 2: Ask 7 Questions (One at a Time)

Ask each question, wait for the answer, then move to the next. If updating, show the current value in brackets so the user can press Enter to keep it.

### Q1 — Project Name
> "What is your project name? (e.g. Lumina SaaS)[current: {existing_name}]"

Collect as `project_name`. Required — do not accept empty.

### Q2 — Primary Brand Color
> "What is your primary brand color? (hex, e.g. #6366F1)[current: {existing_primary}]"

Collect as `brand_primary`. Required. Must start with `#` and be 6 or 8 characters including # prefix (e.g. #6366F1 or #6366F1FF).

### Q3 — Secondary Brand Color
> "What is your secondary/accent color? (hex, optional — press Enter to skip)[current: {existing_secondary}]"

Collect as `brand_secondary`. Optional — empty input means omit the field from JSON.

### Q4 — Primary Font Family
> "What is your primary font family? (e.g. Inter, Geist Mono)[current: {existing_font}]"

Collect as `brand_font`. Required — do not accept empty.

### Q5 — Brand Voice / Tone
> "Describe your brand voice in 1–5 words (e.g. professional and approachable)[current: {existing_voice}]"

Collect as `brand_voice`. Required — do not accept empty.

### Q6 — Framework
> "Which framework are you using?
>   1. react
>   2. vue
>   3. svelte
>   4. nextjs
>   5. astro
>   6. html
> Enter number or name [current: {existing_framework}]:"

Accept either the number or the exact name. Map to one of: `react`, `vue`, `svelte`, `nextjs`, `astro`, `html`. Required.

### Q7 — Token Format
> "Which design token format do you want?
>   1. css-vars
>   2. tailwind
>   3. style-dictionary
> Enter number or name [current: {existing_token_format}]:"

Accept either the number or the exact name. Map to one of: `css-vars`, `tailwind`, `style-dictionary`. Required.

## Step 3: Create Directory and Write project.json

### 3a. Create the `.naksha/` directory

```bash
mkdir -p .naksha
```

### 3b. Get the current ISO timestamp

```bash
date -u +"%Y-%m-%dT%H:%M:%SZ"
```

Use this as `updated_at`. If creating fresh, also use it as `created_at`. If updating, preserve the original `createdAt` as `created_at`.

### 3c. Build the JSON

Construct the JSON object with the collected values. If `brand_secondary` was skipped, omit the `"secondary"` key entirely from the `brand` object.

Always write v5 fields (`schema_version`, `constraints`, `component_patterns`, `browser_findings`):
- **Fresh init**: set `schema_version: "5"`, `constraints: {}`, `component_patterns: []`, `browser_findings: []`
- **Updating v4** (existing file has no `schema_version` field): add v5 fields with the defaults above. Note "Upgraded to v5 schema." in the Step 5 summary.
- **Updating v5** (existing file already has `schema_version: "5"`): preserve the existing `constraints`, `component_patterns`, and `browser_findings` values as-is — only update the brand/framework/token fields.

**Fresh init — with secondary color:**
```json
{
  "name": "<project_name>",
  "brand": {
    "primary": "<brand_primary>",
    "secondary": "<brand_secondary>",
    "font": "<brand_font>",
    "voice": "<brand_voice>"
  },
  "framework": "<framework>",
  "tokenFormat": "<token_format>",
  "schema_version": "5",
  "constraints": {},
  "component_patterns": [],
  "browser_findings": [],
  "createdAt": "<created_at>",
  "updatedAt": "<updated_at>"
}
```

**Fresh init — without secondary color:**
```json
{
  "name": "<project_name>",
  "brand": {
    "primary": "<brand_primary>",
    "font": "<brand_font>",
    "voice": "<brand_voice>"
  },
  "framework": "<framework>",
  "tokenFormat": "<token_format>",
  "schema_version": "5",
  "constraints": {},
  "component_patterns": [],
  "browser_findings": [],
  "createdAt": "<created_at>",
  "updatedAt": "<updated_at>"
}
```

**Updating v4 or v5** — same shape as above, but substitute the three v5 fields from `existing_constraints`, `existing_component_patterns`, and `existing_browser_findings` captured in Step 1 (default to `{}`, `[]`, `[]` if absent). All string fields (`<project_name>` etc.) follow the same substitution rule as the fresh-init templates.

Write this to `.naksha/project.json` using the `Write` tool.

## Step 4: Create memory.md (if not exists)

Check if `.naksha/memory.md` already exists:

```bash
test -f .naksha/memory.md && echo "EXISTS" || echo "NOT_FOUND"
```

If it does **not** exist, create it with the `Write` tool using exactly this format:

```
# Naksha Project Memory — <project_name>

```

(Two lines: the header line, then a blank line. Do not add any entries — memory entries are appended by other commands.)

If it already exists, do **not** modify it (preserve all existing entries).

## Step 5: Show Confirmation Summary

Display a clean summary of what was saved:

```
Naksha initialized for: <project_name>

  Brand:
    Primary color   <brand_primary>
    Secondary color <brand_secondary or "(none)">
    Font            <brand_font>
    Voice           <brand_voice>

  Framework:    <framework>
  Token format: <token_format>
  Schema:       v5  <add "(upgraded from v4)" if this was a v4 update>

  Files written:
    .naksha/project.json
    .naksha/memory.md  <(created) or (already existed — preserved)>

Run /naksha-status anytime to see your project context.
Run /naksha-remember to save design constraints and component patterns.
```

## Notes

- Re-running `/naksha-init` is safe. It overwrites `project.json` with updated values while preserving `createdAt`, all `memory.md` entries, and any existing v5 fields (`constraints`, `component_patterns`, `browser_findings`).
- If updating a v4 project (created before v5), `/naksha-init` upgrades the schema to v5 automatically — no data is lost.
- If you want to commit your project context to git, add and commit the `.naksha/` directory. To keep it local-only, add `.naksha/` to your `.gitignore`.
- All other Naksha commands (e.g. `/brand-kit`, `/design`, `/design-system`) automatically read from `.naksha/project.json` when present.
- After initializing, use `/naksha-remember` to add design constraints and component patterns, and `/naksha-browse` to capture visual research.
