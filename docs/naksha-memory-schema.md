# Naksha Memory Schema

The `.naksha/` directory is the canonical project context system for naksha-studio. It stores project metadata and decision history in two simple, machine-readable files: `project.json` (project config) and `memory.md` (append-only decision log).

This document is the single source of truth for the `.naksha/` schema specification. It defines every field, type, validation rule, and usage pattern for both files.

> **Schema version:** v4 fields are documented in the tables below. v5 additive fields (`constraints`, `component_patterns`, `browser_findings`, `schema_version`) are documented in the [v5 Field Additions](#v5-field-additions-optional) section. v4 `project.json` files are valid v5 documents — all new fields are optional. See [types/v5.ts](../types/v5.ts) for the TypeScript type contract.

## File Structure

```
{project-root}/
├── .naksha/
│   ├── project.json          # Project configuration (created by /naksha-init)
│   └── memory.md             # Append-only decision log
├── .gitignore                # Consider: commit .naksha/ or keep local-only
└── [other project files]
```

The `.naksha/` directory is created by the `/naksha-init` command at the project root.

## project.json Schema

### Full JSON Example

```json
{
  "name": "Lumina SaaS",
  "brand": {
    "primary": "#6366F1",
    "secondary": "#F59E0B",
    "font": "Inter",
    "voice": "professional and approachable"
  },
  "framework": "nextjs",
  "tokenFormat": "css-vars",
  "designSystemPath": "src/tokens/tokens.css",
  "createdAt": "2026-03-17T14:22:00Z",
  "updatedAt": "2026-03-17T15:01:00Z"
}
```

### Field Reference

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `name` | string | Yes | Project display name | `"Lumina SaaS"` |
| `brand.primary` | string (hex) | Yes | Primary brand color in hex format | `"#6366F1"` |
| `brand.secondary` | string (hex) | No | Secondary/accent color in hex format | `"#F59E0B"` |
| `brand.font` | string | Yes | Primary font family name | `"Inter"` |
| `brand.voice` | string | Yes | Brand voice/tone descriptor (1–2 phrases) | `"professional and approachable"` |
| `framework` | string (enum) | Yes | Target web framework | One of: `react`, `vue`, `svelte`, `nextjs`, `astro`, `html` |
| `tokenFormat` | string (enum) | Yes | Design token format for output | One of: `css-vars`, `tailwind`, `style-dictionary` |
| `designSystemPath` | string | No | Relative path to existing design system file | `"src/tokens/tokens.css"` |
| `createdAt` | ISO 8601 string | Auto | Timestamp when project was initialized (set by `/naksha-init`) | `"2026-03-17T14:22:00Z"` |
| `updatedAt` | ISO 8601 string | Auto | Timestamp of last write to any `.naksha/` file | `"2026-03-17T15:01:00Z"` |

### Validation Rules

- **`name`**: Non-empty string, 1–100 characters
- **`brand.primary`** and **`brand.secondary`**: Valid 6-digit or 8-digit hex color strings (with `#` prefix)
- **`brand.font`**: Non-empty string; may include spaces (e.g., `"Geist Mono"`)
- **`brand.voice`**: Non-empty string; 1–50 words. Should be a short tone/mood descriptor
- **`framework`**: Must be one of the exact enum values (case-sensitive lowercase)
- **`tokenFormat`**: Must be one of the exact enum values (case-sensitive lowercase with hyphens)
- **`designSystemPath`**: If provided, should be a relative path (no leading `/`)
- **`createdAt`** and **`updatedAt`**: ISO 8601 format with timezone offset (e.g., `2026-03-17T14:22:00Z`)

---

## v5 Field Additions (optional)

All fields below are **optional and additive**. Existing v4 `project.json` files are fully valid without them. They are added by v5 commands or by re-running `/naksha-init` on a v4 project.

### v5 Full JSON Example

```json
{
  "name": "Lumina SaaS",
  "brand": {
    "primary": "#6366F1",
    "secondary": "#F59E0B",
    "font": "Inter",
    "voice": "professional and approachable"
  },
  "framework": "nextjs",
  "tokenFormat": "css-vars",
  "designSystemPath": "src/tokens/tokens.css",
  "createdAt": "2026-03-17T14:22:00Z",
  "updatedAt": "2026-05-29T15:00:00Z",
  "schema_version": "5",
  "constraints": {
    "grid": "4px",
    "dark_mode": false,
    "min_contrast_ratio": 4.5,
    "breakpoints": [768, 1024, 1280],
    "max_content_width": 1280,
    "accessibility_target": "WCAG AA",
    "out_of_scope": ["dark mode", "RTL support"],
    "notes": ["Cards always use 16px padding"]
  },
  "component_patterns": [
    {
      "name": "card-layout",
      "description": "Primary content container: white background, 1px border, 8px radius, 16px padding.",
      "example": "src/components/Card.tsx",
      "recorded_at": "2026-05-29T15:00:00Z",
      "source_command": "/design"
    }
  ],
  "browser_findings": [
    {
      "captured_at": "2026-05-29T15:00:00Z",
      "mode": "research",
      "url": "https://stripe.com/settings",
      "patterns": [
        {
          "name": "left-nav settings layout",
          "description": "Settings categories in a fixed left sidebar; content scrolls independently on the right."
        }
      ],
      "source_command": "/naksha-browse"
    }
  ]
}
```

### v5 Field Reference

| Field | Type | Required | Added by | Description |
|-------|------|----------|----------|-------------|
| `schema_version` | `"5"` | No | `/naksha-init` (upgrade) | Marks this as a v5 schema file. Absent = v4. |
| `constraints` | object | No | `/naksha-remember`, `/design-system`, `/naksha-browse` | Project-level design constraints (grid, dark mode, accessibility, breakpoints, etc.) |
| `constraints.grid` | string | No | `/naksha-remember` | Base grid unit (e.g. `"4px"`, `"8px"`) |
| `constraints.dark_mode` | boolean | No | `/naksha-remember` | `false` = explicitly ruled out. Absent = not decided. |
| `constraints.min_contrast_ratio` | number | No | `/naksha-remember` | Minimum WCAG contrast ratio (e.g. `4.5` for AA) |
| `constraints.breakpoints` | number[] | No | `/design-system`, `/naksha-remember` | Target breakpoints as min-widths in px |
| `constraints.max_content_width` | number | No | `/naksha-remember` | Max content width in px |
| `constraints.accessibility_target` | string | No | `/naksha-remember` | WCAG target (e.g. `"WCAG AA"`) |
| `constraints.out_of_scope` | string[] | No | `/naksha-remember` | Explicit out-of-scope decisions |
| `constraints.notes` | string[] | No | `/naksha-remember` | Free-form constraints that don't map to a structured field |
| `component_patterns` | array | No | `/design`, `/design-review`, `/naksha-browse` | Recurring UI patterns. Cap: 50 entries (oldest evicted). |
| `component_patterns[].name` | string | Yes (entry) | — | Kebab-case pattern name (e.g. `"card-layout"`) |
| `component_patterns[].description` | string | Yes (entry) | — | One-sentence description |
| `component_patterns[].example` | string | No | — | Relative path or component name using this pattern |
| `component_patterns[].recorded_at` | ISO 8601 | Yes (entry) | — | When this pattern was recorded |
| `component_patterns[].source_command` | string | Yes (entry) | — | Which naksha command established this pattern |
| `browser_findings` | array | No | `/naksha-browse`, `/design-score`, `/design` | Browser session findings. **Cap: 20 entries (FIFO). Entries older than 30 days evicted on next write. Commands prepend only the 5 most recent as context.** |
| `browser_findings[].captured_at` | ISO 8601 | Yes (entry) | — | Capture timestamp (used for eviction) |
| `browser_findings[].mode` | `"inspect"` \| `"research"` \| `"score"` | Yes (entry) | — | `inspect` = localhost visual capture; `research` = external reference; `score` = design-score snapshot |
| `browser_findings[].url` | string | Yes (entry) | — | Target URL |
| `browser_findings[].patterns` | array | No | — | Design patterns extracted (inspect/research modes) |
| `browser_findings[].score` | object | No | — | Design score snapshot (score mode only) |
| `browser_findings[].source_command` | string | Yes (entry) | — | Which naksha command generated this finding |

### v4 → v5 Migration

**`/naksha-init` on a v4 project:**
1. Detects existing `project.json` (any valid v4 file)
2. Adds `schema_version: "5"` and empty `constraints: {}`, `component_patterns: []`, `browser_findings: []`
3. Updates `updatedAt` to current timestamp
4. Preserves all existing field values unchanged
5. Does NOT overwrite or prompt for v4 fields

**`/naksha-doctor --fix` migration:**
- Detects v4 schema (missing `schema_version` field or missing `constraints`)
- Offers migration: adds the v5 optional fields with empty defaults
- Reports: `[MEMORY] project.json upgraded: v4 → v5 (3 new optional fields added)`

## memory.md Format

### Specification

The `.naksha/memory.md` file is an **append-only decision log**. It begins with a header line and contains one timestamped decision entry per line.

**Header line:**
```
# Naksha Project Memory — {project name}
```

**Entry format (one per line after header):**
```
[{ISO timestamp}] /{command}: {decision summary}
```

### Components

- **ISO timestamp**: `[YYYY-MM-DDTHH:MM:SSZ]` (e.g., `[2026-03-17T14:22:00Z]`)
- **Command trigger**: `/{command}` (e.g., `/brand-kit`, `/design`, `/design-system`)
- **Decision summary**: Brief, terse description of the decision made (1–100 characters)

### Example File

```
# Naksha Project Memory — Lumina SaaS

[2026-03-17T14:22:00Z] /brand-kit: Primary color #6366F1, secondary #F59E0B, font Inter, mood professional
[2026-03-17T14:35:00Z] /design: Landing page — hero with split layout, CTA primary-500, Inter 48px heading
[2026-03-17T15:01:00Z] /design-system: Token format CSS vars, design system path src/tokens/tokens.css
[2026-03-17T15:30:00Z] /gen-image: AI hero image, brand-primary background, tech-forward mood
[2026-03-17T16:00:00Z] /design-audit: 3 contrast issues in footer, 1 spacing fix in mobile nav
```

### Validation Rules

- **Header**: Must be exactly `# Naksha Project Memory — {project name}` (one per file)
- **Timestamp**: ISO 8601 format, must be in UTC (Z suffix)
- **Command**: Must start with `/` and be a valid naksha command name (lowercase letters, hyphens allowed)
- **Summary**: Non-empty, max 100 characters (excluding timestamp and command)
- **Immutability**: Once written, entries are never edited or deleted (append-only)
- **One entry per line**: No line wrapping; entries must fit on a single line

## Usage

### How Commands Read From `.naksha/`

Commands that benefit from persistent context read from the two files:

1. **`project.json` readers**: Commands like `/design-audit`, `/brand-check`, and `/design-system` read the project config (name, brand colors, framework, token format) to provide tailored output.
2. **`memory.md` readers**: Context-aware commands (e.g., `/design-next`, `/gen-image`, `/design-audit`) read the memory log to understand prior decisions and avoid redundant suggestions.

### How Commands Write To `.naksha/`

Commands that make decisions write append-only entries to `memory.md`:

1. **After running**: The command's handler appends a timestamped entry to `memory.md` summarizing the key decision.
2. **Timestamp**: Always ISO 8601 UTC (e.g., generated by `new Date().toISOString()`)
3. **Command name**: The command that triggered the entry (e.g., `/brand-kit`)
4. **Summary**: Concise bullet-point or phrase recap of the decision

Example handler pseudocode:

```javascript
// After /brand-kit decision is made:
const entry = `[${new Date().toISOString()}] /brand-kit: Primary #6366F1, secondary #F59E0B, font Inter, mood professional`;
appendToMemory(entry);
```

### Project Initialization Flow

The `/naksha-init` command:

1. Prompts user for project name, brand colors, framework, token format, and optional design system path
2. Creates `.naksha/` directory (if not present)
3. Writes `project.json` with all config fields (sets `createdAt` and `updatedAt` to current timestamp)
4. Writes `memory.md` header with the project name
5. Returns success message with `.naksha/` directory location

## Notes

### Git Handling

Decide per project whether to:

- **Commit `.naksha/`**: If your team wants shared project context and decision history
- **Gitignore `.naksha/`**: If context is personal/local-only (add to `.gitignore`: `echo ".naksha/" >> .gitignore`)

The schema and files are intentionally simple and human-readable to support both workflows.

### Running /naksha-init

- Execute from **project root** (where you want `.naksha/` to live)
- Creates `.naksha/project.json` and `.naksha/memory.md` in one operation
- Safe to re-run (updates `updatedAt`, preserves existing `createdAt` and `memory.md` entries)
- On a v4 `project.json`: adds the v5 optional fields with empty defaults; no existing values changed

### Memory Write Mechanism (v5+)

v5 commands write structured updates to `project.json` via the **Claude Code Stop hook** (`hooks/hooks.json`). After a session, the hook parses the transcript for `<!-- naksha-memory-update ... -->` comment blocks:

```html
<!-- naksha-memory-update
{
  "type": "project_json_patch",
  "path": "constraints.grid",
  "value": "4px"
}
-->
```

The hook validates the `path` against this schema and patches `.naksha/project.json` atomically (`mktemp+mv`). Failed or malformed blocks are logged to `~/.naksha/hook-errors.log` and skipped. `memory.md` entries are still written directly via the `Write` tool and must be ≤100 characters.

See [types/v5.ts](../types/v5.ts) — `MemoryUpdateBlock` type — for the full block schema.

### Design Philosophy

- **Two files, one concern each**: `project.json` = static config; `memory.md` = dynamic history
- **Append-only log**: Ensures auditability; no edit/delete complexity
- **Machine-readable defaults**: JSON + line-delimited format = easy to parse and extend
- **Human-readable design**: Timestamps, command names, summaries are all legible in plain text
- **No sync overhead**: Both files are local; no network calls required

---
