## Project Memory Commands (v5)

Naksha keeps persistent project context in `.naksha/project.json`. These commands build and query it:

- **`/naksha-browse <url>`** — capture design patterns from a URL (your running UI in inspect mode, or an external site in research mode) and save them to project memory. Requires the Playwright MCP; skips gracefully without it.
- **`/naksha-remember <decision>`** — save a design constraint or component pattern in plain English:
  - `/naksha-remember grid is 8px; no dark mode; WCAG AA required`
  - `/naksha-remember primary button: 40px height, full-radius pill, primary-500 fill`
- **`/naksha-status`** — view all saved context: brand settings, constraints, component patterns, and browser research.
- **`/naksha-init`** — set up or update project context; re-running on a v4 project upgrades it to the v5 schema.

`/design`, `/design-review`, `/design-score`, `/design-system`, and `/brand-kit` read project memory automatically, so saved constraints and patterns apply without repeating them.

**Also:** `/design-reel` records the design team working and renders a shareable 9:16 + 16:9 video reel. It needs Node and `packages/naksha-reel`; where that toolchain is absent, the command is documentation only.
