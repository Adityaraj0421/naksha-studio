# Naksha Memory Schema

The `.naksha/` directory is the canonical project context system for naksha-studio. It stores project metadata and decision history in two simple, machine-readable files: `project.json` (project config) and `memory.md` (append-only decision log).

This document is the single source of truth for the `.naksha/` schema specification. It defines every field, type, validation rule, and usage pattern for both files.

> **Schema version:** v4 fields are documented in the tables below. v5 additive fields (`constraints`, `component_patterns`, `browser_findings`, `schema_version`) are documented in the [v5 Field Additions](#v5-field-additions-optional) section. v4 `project.json` files are valid v5 documents — all new fields are optional. See [types/v5.ts](../types/v5.ts) for the TypeScript type contract.

## File Structure

```
{project-root}/
├── .naksha/
│   ├── project.json          # Project configuration (created by /naksha-init)
│   ├── memory.md             # Append-only decision log
│   ├── session-brief.md      # Generated ≤ 2 KB brief (PreCompact hook) — safe to gitignore
│   └── design-system/        # Optional (v6): design system in DESIGN.md format
│       ├── MASTER.md         #   project-wide system (written by /design-system, /design-md)
│       └── pages/<page>.md   #   optional per-page overrides
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

### v5.3 Field Additions: Taste (optional)

Learned design taste, written by `/naksha-taste` and by verdicts given during `/design-variants`. Read by `/design`, `/design-variants`, and `/naksha-status`. Taste is a preference, not a rule: the request, `constraints`, and brand always win.

```json
"taste": {
  "signals": [
    {
      "verdict": "approved",
      "direction": "Editorial layout with a serif display face and generous whitespace",
      "traits": ["editorial", "serif display", "airy layout"],
      "context": "pricing page",
      "reason": "the type hierarchy is clear",
      "recorded_at": "2026-10-18T12:00:00Z",
      "source_command": "/naksha-taste"
    }
  ]
}
```

| Field | Type | Required | Written by | Description |
|-------|------|----------|------------|-------------|
| `taste.signals` | array | No | `/naksha-taste`, `/design-variants` | Reactions to design directions. **Cap: 30 (oldest evicted).** |
| `taste.signals[].verdict` | `"approved"` \| `"rejected"` | Yes (entry) | — | The user's verdict. Only recorded when the user actually gave one. |
| `taste.signals[].direction` | string | Yes (entry) | — | What the direction looks like, ≤ 140 chars |
| `taste.signals[].traits` | string[] | Yes (entry) | — | 2–6 lowercase trait tags from the vocabulary in `commands/naksha-taste.md` |
| `taste.signals[].context` | string | No | — | What was being designed (e.g. `"pricing page"`) |
| `taste.signals[].reason` | string | No | — | The user's reason, ≤ 140 chars; never invented |
| `taste.signals[].recorded_at` | ISO 8601 | Yes (entry) | — | Drives decay: ≤ 90 days weight 1, 91–180 days 0.5, older 0 (kept, ignored) |
| `taste.signals[].source_command` | string | Yes (entry) | — | `/naksha-taste` or `/design-variants` |
| `taste.signals[].vote_id` | string | No | `/design-variants` | v6: id of the vote recorded for the same reaction in `.naksha/votes.jsonl`. Consolidation counts the vote and skips the signal, so one reaction never counts twice. |

**Applying taste:** sum the weights per trait, separately for approved and rejected signals. The strongest approved traits become defaults; the strongest rejected traits are avoided. A trait in both lists is *conflicted*: the newer verdict wins, unless the signals have different `context` values (context-dependent taste is legitimate). No migration is needed: `taste` is optional and absent on older files.

### v6 Field Additions: Budgets (optional)

Spending limits for naksha runs, written by `/naksha-stats budget`. Read by `scripts/naksha-stats.js` (used by `/naksha-stats` and by the pre-flight checks in `/design-reel` and `/pipeline`). Budgets only produce warnings; they never block a command. Spend is estimated from local Claude Code transcripts at API list prices (see [cost-and-budgets.md](cost-and-budgets.md)).

```json
"budgets": {
  "monthly_usd": 20,
  "per_command_usd": { "/design-reel": 1.5, "/pipeline": 3 },
  "warn_at": 0.8
}
```

| Field | Type | Required | Written by | Description |
|-------|------|----------|------------|-------------|
| `budgets` | object | No | `/naksha-stats budget` | Absent or `{}` = no budgets. |
| `budgets.monthly_usd` | number > 0 | No | — | Estimated USD for this project per calendar month (UTC). |
| `budgets.per_command_usd` | object | No | — | Map of `"/command"` → the most one run of it should cost, in USD (number > 0). Keys without a leading `/` are accepted. Always written as the full object. |
| `budgets.warn_at` | number in (0, 1] | No | — | Fraction of a budget at which to warn. Default `0.8`. |

**Evaluation:** month-to-date spend in the current project is compared with `monthly_usd`: at or above `warn_at` → `WARN`; above 100% → `OVER BUDGET`. For `per_command_usd`, the most expensive run of that command this month is compared with its limit in the same way. Invalid values are ignored and reported (e.g. a negative amount, or `warn_at` outside 0–1, which falls back to `0.8`). No migration is needed: `budgets` is optional and absent on older files.

### v6 Field Additions: Taste Observations (optional)

Evidence-backed summaries of taste, one per trait, produced by `node scripts/votes.js consolidate` from Helpful / Needs-work votes on designs and variants (see [v6 Votes](#v6-votes-nakshavotesjsonl)) plus `taste.signals`. Written through the usual `taste.observations` memory-update block by `/naksha-taste consolidate` and `/naksha-vote`; read by `/naksha-taste` (profile view) and `/design-variants`.

```json
"taste": {
  "signals": [ … ],
  "observations": [
    {
      "trait": "serif display",
      "helpful": 5,
      "needs_work": 1,
      "confidence": 0.5,
      "first_seen": "2026-07-02T09:14:00Z",
      "updated_at": "2026-10-18T12:00:00Z",
      "evidence": ["v_20261018T115812Z_h_3fa9c1", "s_20260702T091400Z_a_9c0e11d2", "…"]
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taste.observations` | array | No | One entry per trait. **Cap: 40** (lowest active weight dropped first). |
| `trait` | string | Yes (entry) | Lowercase trait tag from the `/naksha-taste` vocabulary |
| `helpful` | number | Yes (entry) | Σ age weight of Helpful votes and approved signals in `evidence` (multiples of 0.5) |
| `needs_work` | number | Yes (entry) | Σ age weight of Needs-work votes and rejected signals in `evidence` |
| `confidence` | number 0–1 | Yes (entry) | `|helpful − needs_work| / (helpful + needs_work + 2)`. One vote = 0.33; 5 helpful vs 1 needs work = 0.5; 0 when nothing is active. |
| `first_seen` | ISO 8601 | Yes (entry) | Earliest evidence ever seen for this trait (kept across consolidations) |
| `updated_at` | ISO 8601 | Yes (entry) | When the evidence set last changed (unchanged if a consolidation adds nothing) |
| `evidence` | string[] | Yes (entry) | Vote and signal ids, newest first. **Cap: 50.** |

**Refined, not overwritten.** Consolidation starts from the existing observations and merges new evidence into them, so evidence survives after the raw vote rotates out of `votes.jsonl` or the signal is evicted by the 30-signal cap. Ids are self-describing so counts can always be recomputed from `evidence` alone:

- vote ids: `v_<UTC yyyymmddThhmmssZ>_<h|n>_<6 hex>` (`h` = helpful, `n` = needs work)
- signal ids: `s_<recorded_at as yyyymmddThhmmssZ>_<a|r>_<8-hex FNV-1a of direction + traits>` (deterministic, so re-running never double counts)

**Decay** is the same as for signals: ≤ 90 days weight 1, 91–180 days 0.5, older 0 (kept as history, ignored). Counts are recomputed from evidence timestamps on every run, so an observation fades on its own as its evidence ages.

**What counts.** Only votes on `design` and `variant` subjects that carry traits (on the vote, or resolved from `naksha-variants/variants.json` by variant letter and `run_id`). The latest vote per subject wins; a superseded vote is removed from evidence. A signal with a `vote_id` that matches a stored vote is skipped. Findings and command runs never feed taste.

**Applying observations:** a trait with `helpful > needs_work` and `confidence ≥ 0.5` is a leaning trait; `needs_work > helpful` with `confidence ≥ 0.5` is an avoided trait. Below 0.5 it is a hint only. Observations sit alongside the per-signal profile; explicit requests, `constraints` and brand still win.

**Why a memory block and not a direct write.** Inside a Claude session the Stop hook stays the single writer of `project.json`, so the observations block cannot race the `taste.signals` block emitted in the same turn. `votes.js consolidate --write` exists for terminal use outside a session; it writes atomically (temp file + rename).

## v6 Votes (`.naksha/votes.jsonl`)

Helpful / Needs-work votes on designs, variants, review findings and command runs. Written by `/naksha-vote`, `/design-variants` (when you react to a variant) and the dashboard Votes panel, all through `scripts/votes.js`. One JSON object per line, append-only, local only — **nothing is ever sent anywhere.** Sharing is opt-in via `votes.js export --redact`, which writes a file you can send yourself.

```json
{"id":"v_20261018T120501Z_n_9b1c55","ts":"2026-10-18T12:05:01Z","verdict":"needs_work","reason":"B and C feel too similar","subject":{"kind":"variant","ref":"C@vr-20261018T1150Z","command":"/design-variants","traits":["glassmorphism","vivid palette"]},"source":"command"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | `v_<UTC yyyymmddThhmmssZ>_<h\|n>_<6 hex>`, assigned by the script (never taken from input) |
| `ts` | ISO 8601 | Yes | UTC, second precision, assigned by the script |
| `verdict` | `"helpful"` \| `"needs_work"` | Yes | `needs-work` is accepted on input and normalised |
| `reason` | string | No | ≤ 280 chars, whitespace and control characters collapsed. Never invented. |
| `subject.kind` | `"design"` \| `"variant"` \| `"finding"` \| `"command_run"` | Yes | What was voted on |
| `subject.ref` | string | Yes | ≤ 200 chars. Unique per artifact version: variants `"{letter}@{run_id}"` (from `variants.json`), designs `"design-output.html@{mtime}"`, findings their `id` from `naksha-review/findings.json`, command runs a run id |
| `subject.command` | string | No | e.g. `"/design-review"` |
| `subject.role` | string | No | Owning role, e.g. a finding's `owner_role` |
| `subject.eval` | string | No | Eval name this vote calibrates (letters, digits, `. _ : / -`, ≤ 120) |
| `subject.traits` | string[] | No | 1–6 lowercase trait tags; feeds taste consolidation |
| `source` | `"command"` \| `"dashboard"` \| `"cli"` | Yes | Where the vote came from |

**Rules**

- **Latest vote per subject wins** (`kind` + `ref`, case-insensitive ref; calibration also keys on `eval`). Changing your mind or double-clicking never counts twice; earlier lines stay in the file for history.
- **Rotation:** when `votes.jsonl` reaches **1,000** lines it is renamed to `votes.1.jsonl` (replacing the previous archive) and a fresh file starts. Readers use both, so 1,000–2,000 votes are retained. Observations keep their evidence after rotation.
- **Malformed lines** are skipped and counted, never fatal.
- **Git:** if you commit `.naksha/`, consider adding `.naksha/votes*.jsonl` and `.naksha/votes-export-*.json` to `.gitignore` — votes are personal by default.

**Variant manifest.** `/design-variants` writes `naksha-variants/variants.json` so votes can find a variant's traits: `{ "run_id", "task", "created_at", "variants": [{ "letter", "name", "file", "rationale", "traits", "dimensions", "wildcard" }] }`. Each variant file also carries `<meta name="naksha-traits" content="…">`. Both are read defensively; without them, variant votes need explicit traits.

**Judge calibration.** `votes.js calibrate --results <file>` compares votes that carry `subject.eval` with LLM-judge verdicts. Minimal results shape (a top-level array, or an object with a `results` array; `pass`/`passed` booleans are accepted in place of `judge_verdict`):

```json
[{ "eval": "design-variants-distinct-directions", "assertion": "pairwise-distinctness", "judge_verdict": "pass", "run_id": "run-42" }]
```

An eval (or one run of it) counts as *pass* only if none of its rows failed. A vote whose `subject.ref` equals a `run_id` is compared with that run; otherwise with the whole file. The report gives the disagreement rate, the evals where people said **Needs work but the judge passed** (tighten these), the reverse (check for over-strict or flaky assertions), and evals voted on but missing from the results.

**Redacted export.** `votes.js export --redact` writes `.naksha/votes-export-<date>-redacted.json` with emails → `[email]`, URLs → `[url]`, absolute, home and Windows paths and relative file paths → `[path]`, token-like strings (mixed letters and digits, 32+ chars, or `sk-`/`ghp_`-style prefixes) → `[secret]`, and `+`-prefixed phone numbers → `[phone]`, in reasons, refs and roles. **Limits:** it cannot recognise names, company or product names, street addresses, or phone numbers without a leading `+`; read the file before sharing it.

### v6 Addition: Design System Files (optional)

`.naksha/design-system/` stores the project's design system as [DESIGN.md](design-md.md) files: YAML design tokens plus prose. It is a directory next to `project.json`, not a `project.json` field, so no schema migration is needed and older projects simply don't have it.

| Path | Written by | Read by | Content |
|------|-----------|---------|---------|
| `.naksha/design-system/MASTER.md` | `/design-system`, `/design-md import` | `/design` (Step 0.6), `/design-md`, `/design-system` | A complete, standalone-valid DESIGN.md (spec `alpha`): `name`, `colors` (incl. `primary`), `typography`, `rounded`, `spacing`, `components`, plus prose sections |
| `.naksha/design-system/pages/<page>.md` | `/design-md page <page>` | `/design` when designing that page | A partial DESIGN.md holding only the tokens and prose that differ for one page. `<page>` is a lowercase slug (`[a-z0-9][a-z0-9-]*`) |

**Precedence:** page override > MASTER.md > brand defaults (`brand.primary` and `brand.secondary` in `project.json`, used only when MASTER.md doesn't define `colors.primary` / `colors.secondary`). In a page override, `null` removes a master token, and `typography`/`components` entries merge one property at a time.

**Validation:** `node scripts/design-md.js lint .naksha/design-system/MASTER.md` checks one file. `node scripts/design-md.js lint --page <page>` checks the merged system. `node scripts/design-md.js resolve --page <page>` prints the effective tokens with per-token provenance. `designSystemPath` in `project.json` keeps pointing at the code token file (e.g. `tokens.css`); MASTER.md is always found at the fixed path above.

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

## session-brief.md (generated)

`.naksha/session-brief.md` is written by the PreCompact hook (`scripts/precompact-brief.sh` → `scripts/lib/session-brief.js`) just before Claude Code compacts a conversation. It summarises what can be derived deterministically from disk: project name, brand tokens, stack, constraints, taste leanings (age-weighted as in the taste section above), the last 5 `memory.md` entries, and the 5 most recently modified design files (`design-output.html`, `naksha-variants/`, `naksha-review/`). It is hard-capped at **2048 bytes**.

The SessionStart hook injects a compact index (≤ 600 chars: project name, brand, framework, and counts of constraints, patterns, taste signals, browser findings, and memory entries). When the session `source` is `compact` or `resume` and the brief is less than 24 hours old (by file mtime), the hook also injects the brief. Commands never write this file. It is overwritten wholesale on every compaction, so it is safe to gitignore.

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
2. **`design-system/` readers** (v6, optional): `/design` loads `MASTER.md` and the matching `pages/<page>.md` override (see [v6 Addition](#v6-addition-design-system-files-optional)).
3. **`memory.md` readers**: Context-aware commands (e.g., `/design-next`, `/gen-image`, `/design-audit`) read the memory log to understand prior decisions and avoid redundant suggestions.

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

The hook is a plain Node script (`scripts/memory-apply-hook.js`), not a model call, and it never blocks the end of a turn. It:

- reads only transcript lines added since its last run for that session (the byte offset is kept in `.naksha/.memory-hook.json`), so each block is applied exactly once;
- takes blocks only from the assistant's own text — never from tool results or user messages — and ignores blocks inside ``` code fences, so quoting an example does not write anything;
- checks the top-level field of `path` against the ProjectBrain fields in [types/v5.ts](../types/v5.ts) and refuses `__proto__`, `prototype` and `constructor` segments;
- applies `browser_finding_write` by prepending the finding, dropping entries older than 30 days and capping the list at 20;
- writes `.naksha/project.json` atomically (temp file + rename). Failed or malformed blocks are logged to `~/.naksha/hook-errors.log` and skipped; if `project.json` is not valid JSON, nothing is written and the blocks are retried on the next Stop once it is fixed. `memory.md` entries are still written directly via the `Write` tool and must be ≤100 characters.

See [types/v5.ts](../types/v5.ts) — `MemoryUpdateBlock` type — for the full block schema.

### Design Philosophy

- **Two files, one concern each**: `project.json` = static config; `memory.md` = dynamic history
- **Append-only log**: Ensures auditability; no edit/delete complexity
- **Machine-readable defaults**: JSON + line-delimited format = easy to parse and extend
- **Human-readable design**: Timestamps, command names, summaries are all legible in plain text
- **No sync overhead**: Both files are local; no network calls required

---
