# Naksha Memory Schema

The `.naksha/` directory is the canonical project context system for naksha-studio. It stores project metadata and decision history in two simple, machine-readable files: `project.json` (project config) and `memory.md` (append-only decision log).

This document is the single source of truth for the `.naksha/` schema specification. It defines every field, type, validation rule, and usage pattern for both files.

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

### Design Philosophy

- **Two files, one concern each**: `project.json` = static config; `memory.md` = dynamic history
- **Append-only log**: Ensures auditability; no edit/delete complexity
- **Machine-readable defaults**: JSON + line-delimited format = easy to parse and extend
- **Human-readable design**: Timestamps, command names, summaries are all legible in plain text
- **No sync overhead**: Both files are local; no network calls required

---
