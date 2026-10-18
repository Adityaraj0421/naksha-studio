## Project Memory Commands (v5)

Naksha keeps persistent project context in `.naksha/project.json`. These commands build and query it:

- **`/naksha-browse <url>`** — capture design patterns from a URL (your running UI in inspect mode, or an external site in research mode) and save them to project memory. Requires the Playwright MCP; skips gracefully without it.
- **`/naksha-remember <decision>`** — save a design constraint or component pattern in plain English:
  - `/naksha-remember grid is 8px; no dark mode; WCAG AA required`
  - `/naksha-remember primary button: 40px height, full-radius pill, primary-500 fill`
- **`/naksha-status`** — view all saved context: brand settings, constraints, component patterns, and browser research.
- **`/naksha-init`** — set up or update project context; re-running on a v4 project upgrades it to the v5 schema.

`/design`, `/design-review`, `/design-score`, `/design-system`, and `/brand-kit` read project memory automatically, so saved constraints and patterns apply without repeating them.

**Design system files (v6)** — `.naksha/design-system/MASTER.md` holds the project design system in the open [DESIGN.md](https://github.com/google-labs-code/design.md) format (YAML tokens plus prose), with optional `pages/<page>.md` overrides. Precedence: page override > MASTER.md > brand defaults. `/design-md` lints, imports (DTCG JSON or CSS variables) and exports (DTCG, CSS, Tailwind) them; `/design` reads them before building.

**Taste memory (v5.3)** — naksha learns which design directions you like:

- **`/design-variants <task> [--count 2-5]`** — build 2–5 clearly different directions for the same brief (default 3), side by side in `naksha-variants/index.html`. When you have a taste profile, most directions lean into it and one "Wildcard" deliberately doesn't.
- **`/naksha-taste approve|reject <direction> [because …]`** — record your verdicts; with no arguments, show your taste profile. `/design` and `/design-variants` then default to the traits you approve and avoid the ones you reject. Taste is a preference: your request, constraints, and brand always win. Older signals fade (half weight after 90 days, ignored after 180).
- **`/naksha-vote helpful|needs-work <subject> [because …]`** (v6) — vote on a variant, design, review finding or command run. Votes stay in `.naksha/votes.jsonl` and are never sent anywhere; `/naksha-vote consolidate` turns them into taste observations with counts and evidence, and `/naksha-vote calibrate` shows where eval judges passed work you said needs work. Share only with `/naksha-vote export --redact`.

**Also:** `/design-reel` records the design team working and renders a shareable 9:16 + 16:9 video reel. It needs Node and `packages/naksha-reel`; where that toolchain is absent, the command is documentation only.
