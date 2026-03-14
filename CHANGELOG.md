# Changelog

All notable changes to naksha are documented here.

## [3.3.0] — 2026-03-14

Rebrand — design-studio becomes naksha.

### Changed

- Plugin renamed from `design-studio` to `naksha`
- Visual identity updated to Naksha brand (`#E8633A`, `#1A1A2E`, Inter, 3×3 circle mark)
- README header rewritten with Naksha logo mark, wordmark, and tagline
- `assets/social-preview.svg` regenerated with Naksha dark/orange identity
- `assets/social-preview.html` source updated with Naksha identity
- `assets/demo.svg` updated with naksha name and v3.3.0 label
- `skills/design/SKILL.md` prose reference updated
- `CONTRIBUTING.md` install path updated
- `.github/workflows/design-check.yml` PR comment URL updated
- GitHub repository renamed: `design-studio` → `naksha-studio`

No functional changes — all 27 commands, 13 roles, agents, hooks, and evals are unchanged.

---

## [3.2.0] — 2026-03-14

Role Depth Expansion — 10 role reference files upgraded with expert-level patterns and full domain coverage.

### Changed

- **10 role files expanded**: `ui-designer`, `ux-designer`, `product-designer`, `content-designer`, `data-viz-designer`, `ux-researcher`, `figma-workflow`, `deployment`, `email-copywriter`, `social-media-designer` — each gains `## Advanced Patterns` and `## Full Coverage` sections
- **Expert-level patterns added per role**: dark mode token strategy, component state taxonomy, JTBD framework, error message formula, chart type decision tree, qual vs. quant decision guide, auto-layout edge cases, Core Web Vitals optimisation per metric, subject line formula library, platform-specific safe zone guide
- **Full Coverage added per role**: complete form state matrix, navigation pattern decision guide, edge case mapping methodology, discovery phase checklist, chart type reference, research ops checklist, component audit methodology, performance budget framework, email type reference, platform format reference
- **Knowledge base**: ~6,000 lines → ~9,500 lines (+58%)
- **10 new eval cases** (ids 32–41) — one per role, testing decision-making depth
- plugin.json version bumped to 3.2.0

---

## [3.1.0] — 2026-03-13

AI Design Critique with Screenshots — enhances `/design-review` with visual analysis mode.

### Changed

- **`/design-review` command enhanced**: Now accepts screenshots (`.png`, `.jpg`, `.gif`, `.webp`) and Figma URLs as input for visual AI critique. Two modes:
  - **Visual AI Critique Mode** (Section A): Scores the design against 6 visual principles — Visual Hierarchy, Alignment & Grid, Color & Contrast, Typography, Proximity & Grouping, Balance & Composition — each scored 0–10 with explicit rubrics. Detects 7 common anti-patterns (wall of text, button soup, icon ambiguity, etc.). Produces per-principle score table.
  - **Code-Level Audit** (Section B): Existing 5-audit code analysis (accessibility, usability heuristics, visual consistency, content, motion) — unchanged.
  - **Dual Mode**: When both a visual and code source are available (preview server), runs both and merges findings into unified report.
- plugin.json version bumped to 3.1.0
- SKILL.md: `/design-review` description updated to mention screenshot/visual AI critique support

---

## [3.0.0] — 2026-03-13

Figma Component Library Generator — adds `/figma-component-library` command.

### Added

- **`/figma-component-library` command**: Generate a complete Figma component library from a brand description or design token config. Covers full atomic design hierarchy: 18 atoms (Button, Badge, Input, Checkbox, Toggle, Avatar, Tooltip, Skeleton, etc.), 16 molecules (Card, Alert, Modal, Tabs, Dropdown, Stat Card, Pagination, etc.), 10 organisms (Nav Bar, Sidebar, Data Table, Hero Section, Form Section, Pricing Card, etc.). All components use auto layout, component properties, and variant groups. Produces 5-page Figma structure (Foundation, Atoms, Molecules, Organisms, Templates) with consistent PascalCase layer naming. Supports `--scope`, `--style`, `--config`, and `--framework` flags. MCP fallback outputs HTML component gallery + pasteable Figma Plugin Console code.

### Changed

- plugin.json version bumped to 3.0.0, 27 commands
- SKILL.md: `/figma-component-library` added to commands table; component library routing example and activation rule added; output formats table updated
- README: badge 26→27, command in table and details section, "Full design system" workflow entry
- hooks.json Stop hook: Figma Library section added

---

## [2.9.0] — 2026-03-13

Interactive Tutorial Mode — adds `/design-tutorial` command with 7 learning tracks.

### Added

- **`/design-tutorial` command**: Guided tour of Design Studio with 7 tracks — `quick-start` (5 min: 3 commands in action), `ui` (build component → tokens → handoff), `figma` (create → responsive → prototype), `social` (post → campaign → analytics), `email` (template → sequence), `data-viz` (chart → dashboard), `full` (30-min complete tour of all 8 wings). Each track produces real output via live command exercises. Welcome screen on bare invocation with numbered track menu.

### Changed

- plugin.json version bumped to 2.9.0, 26 commands
- SKILL.md: `/design-tutorial` added to commands table; tutorial trigger rule added to activation rules; tutorial → `/design-tutorial` routing example added; output formats table updated
- README: badge 25→26, `/design-tutorial` in commands table and details section, "First-time user" workflow entry added
- hooks.json Stop hook: Tutorial section added with `/design-tutorial` suggestion

---

## [2.8.0] — 2026-03-13

CI/CD Design Checks — GitHub Action that runs design linting on every PR touching HTML/CSS.

### Added

- **`.github/workflows/design-check.yml`**: GitHub Actions workflow triggers on PRs modifying HTML/CSS/SCSS. Runs design lint, posts score badge + issue table as PR comment (updates on re-run), fails CI if score is below threshold. Changed files passed via `CHANGED_FILES` env var (not shell interpolation) to prevent command injection.
- **`scripts/design-lint.js`**: Portable Node.js linter. Works in CI (`CHANGED_FILES` env var) and locally (`node scripts/design-lint.js <files>`). 10 checks: HTML lang, img alt, semantic HTML, button-vs-div, viewport meta, form labels, hardcoded hex colors, fixed pixel widths, inline styles, missing breakpoints. Outputs `design-lint-report.json` with score (0–100), issue list, pass/fail/warning counts. Score = 100 − (errors × 10) − (warnings × 3). Default fail threshold: 70.
- **`.design-lint.json.example`**: Configuration reference — `failThreshold`, check toggles, `ignorePatterns` for dist/vendor files.

### Changed

- plugin.json version bumped to 2.8.0
- README: CI/CD section added with badge usage and local run instructions

---

## [2.7.0] — 2026-03-13

Data Visualization Wing — adds `/chart-design`, `/dashboard-layout`, and 2 specialist roles.

### Added

- **`/chart-design` command**: Design any chart or data visualization — selects chart type from a 16-type matrix, applies colorblind-safe accessible palettes (sequential/diverging/categorical), adds annotations, outputs production-ready HTML/CSS/JS with Chart.js. Supports `--library` flag for D3, Recharts, Visx, or vanilla SVG. Includes ARIA accessibility for SVG and canvas charts.
- **`/dashboard-layout` command**: Build complete dashboard layouts — sidebar navigation, KPI card row, primary/secondary chart areas, filter bar with date range selectors, responsive data tables with sorting/pagination. Supports `--type` (analytics/operational/executive/admin/monitoring) and `--style` modifiers. Outputs semantic HTML/CSS with CSS custom properties, responsive breakpoints, and dark mode.
- **`data-viz-designer.md` reference** (~230 lines): Chart type selection guide (16 types mapped to data relationships), color systems (sequential/diverging/categorical palettes with CSS vars), chart annotation patterns, responsive Chart.js implementation, library recommendations table (Chart.js/D3/Recharts/Visx/Highcharts/Vega-Lite), chart accessibility (ARIA, data table fallback), empty/loading/error states, QA checklist
- **`dashboard-architect.md` reference** (~250 lines): Dashboard type patterns (6 types), information hierarchy (overview→detail, progressive disclosure), CSS grid patterns (KPI row, 2/3+1/3 chart split), KPI card anatomy and CSS, filter bar design and HTML patterns, data table design with sortable columns and pagination, sidebar navigation patterns (collapsible + mobile drawer), responsive strategy per breakpoint, skeleton loading with shimmer animation, stale data indicators, QA checklist

### Changed

- plugin.json version bumped to 2.7.0, 25 commands
- SKILL.md: Data Viz Specialists section added (Data Viz Designer + Dashboard Architect); data viz trigger keywords rule added; Data Visualization Phase added to workflow; 6 new team assembly examples; `/chart-design` and `/dashboard-layout` added to commands table and output formats table
- README: badge 23→25, 2 new commands in table and details section, 2 new team table rows, 2 new workflow entries
- hooks.json Stop hook: added Data Viz section with `/chart-design` and `/dashboard-layout`

---

## [2.6.0] — 2026-03-13

Eval expansion — grows from 20 to 32 eval cases covering new commands and cross-command workflows.

### Added

- **12 new eval cases** (ids 20–31):
  - `design-framework-react-tailwind` (id 20) — TypeScript interfaces, Tailwind classes, component decomposition
  - `design-framework-nextjs-app-router` (id 21) — Server/Client component split, async data fetching
  - `email-template-welcome` (id 22) — Inline styles, table layout, VML buttons, preheader, responsive
  - `email-campaign-onboarding` (id 23) — 5-email sequence, subject lines, timing, ESP notes, A/B plan
  - `design-template-landing-page` (id 24) — CSS variables, hero, features, responsive, dark mode
  - `design-template-dashboard` (id 25) — Sidebar, KPI cards, chart area, data table, dark-tech style
  - `edge-case-dark-mode` (id 26) — prefers-color-scheme, contrast in both modes, interactive states
  - `edge-case-rtl-layout` (id 27) — CSS logical properties, dir="rtl" support, directional icons
  - `edge-case-reduced-motion` (id 28) — prefers-reduced-motion, animation disable, layout preservation
  - `workflow-design-to-framework` (id 29) — `/design` → `/design-framework` pipeline test
  - `workflow-brand-to-component-docs` (id 30) — `/brand-kit` → `/design` → `/design-review` pipeline
  - `workflow-email-social-launch` (id 31) — `/email-campaign` → `/social-campaign` coordination

### Changed

- Total eval count: 20 → 32
- plugin.json version bumped to 2.6.0

---

## [2.5.0] — 2026-03-13

Template Gallery — adds `/design-template` command and Template Gallery reference.

### Added

- **`/design-template` command**: Generate production-ready HTML templates from 10 curated categories — `landing-page`, `dashboard`, `pricing`, `auth`, `blog`, `ecommerce`, `portfolio`, `docs`, `saas`, `onboarding`. Supports `--style` modifier (minimal, bold, corporate, playful, dark-tech) and `--dark` flag
- **`template-gallery.md` reference** (~180 lines): Design standards, CSS variable system, component library (buttons, cards, badges, form inputs), layout skeletons (page/dashboard/docs), style variations with CSS recipes, copy templates per category, responsive breakpoints, QA checklist

### Changed

- plugin.json version bumped to 2.5.0, 23 commands
- SKILL.md: `/design-template` added to commands table with team assembly examples
- README: badge 22→23, `/design-template` in commands table and details, Template Gallery workflow
- Stop hook: includes `/design-template` in suggestions

---

## [2.4.0] — 2026-03-13

Email Design Wing — adds `/email-template`, `/email-campaign` commands and Email Designer + Email Copywriter roles.

### Added

- **`/email-template` command**: Generate production-ready HTML email templates — inline styles, table layout, VML bulletproof buttons, mobile-responsive, dark mode, deliverability-optimized. Supports welcome, transactional, newsletter, promotional, onboarding, re-engagement, and product-announcement types
- **`/email-campaign` command**: Plan and generate complete multi-email campaign sequences — welcome series, onboarding, product launch, promotional, re-engagement, post-purchase. Outputs campaign brief, sequence map, all HTML templates, ESP setup notes
- **`email-designer.md` reference** (~200 lines): HTML email constraints, document structure template, layout patterns (hero, two-column, feature row, footer), typography stack, color system, spacing, image best practices, deliverability checklist, ESP variable syntax, email types table, QA checklist
- **`email-copywriter.md` reference** (~200 lines): Subject line formulas, preview text rules, AIDA body structure, CTA copy patterns, tone guides per email type, multi-email sequence strategy, A/B test priorities, personalization, compliance copy (CAN-SPAM, GDPR)

### Changed

- plugin.json version bumped to 2.4.0, 22 commands
- SKILL.md: Email Designer + Email Copywriter added to team table with activation trigger rules; Email Phase added to workflow; 6 new team assembly examples
- README: `/email-template` and `/email-campaign` in commands table and details section
- Stop hook: includes `/email-template` and `/email-campaign` in suggestions

---

## [2.3.0] — 2026-03-13

Framework-specific code generation — adds `/design-framework` command and Framework Specialist role.

### Added

- **`/design-framework` command**: Convert HTML/CSS design output to idiomatic components for React+Tailwind, Vue 3+UnoCSS, Svelte 5, Next.js App Router, or Astro
- **`framework-specialist.md` reference** (~220 lines): Complete patterns for each framework — component structure, TypeScript interfaces, token mapping, idiomatic patterns, QA checklist
- **`--framework` flag in `/design`**: Detects `--framework <name>` in arguments and routes to `/design-framework` after HTML output
- **Framework keywords in plugin.json**: `react`, `vue`, `svelte`, `nextjs`, `astro`, `tailwind`, `framework`, `tsx`, `typescript`
- **2 new workflows in README**: Design-to-React and Design-to-Next.js pipelines

### Changed

- plugin.json version bumped to 2.3.0, 20 commands
- SKILL.md: Framework Specialist added to team table with activation trigger rules
- README: `/design-framework` in commands table, details section, and workflows
- Stop hook: includes `/design-framework` in suggestions

---

## [2.2.0] — 2026-03-13

Social media wing expansion — adds 3 commands, 4 specialist roles, and 3 eval cases.

### Added

- **3 new commands**: `/social-content`, `/social-campaign`, `/social-analytics`
- **4 new specialist roles**: Social Media Designer, Social Media Strategist, Social Media Copywriter, Growth/Analytics Specialist
- **3 new eval cases** (ids 17-19): `social-content-instagram-carousel`, `social-campaign-saas-launch`, `social-analytics-dashboard`
- **Social team assembly** in SKILL.md: trigger rules for "social", "Instagram", "TikTok", "LinkedIn post", "campaign", "content calendar", "hashtag", "carousel", "social analytics"

### Changed

- plugin.json version bumped to 2.2.0, description updated to 19 commands
- Stop hook updated to suggest all 19 commands (grouped: Core, Figma, Social)
- README expanded with social media team table and command descriptions

---

## [2.1.1] — 2026-03-10

Bug fixes, documentation, and quality improvements based on public review feedback.

### Fixed

- **FID → INP**: Replaced deprecated First Input Delay with Interaction to Next Paint in deployment.md (thresholds updated to <200ms / >500ms)
- **Accordion anti-pattern**: Replaced `max-height: 500px` hack with modern `grid-template-rows: 0fr → 1fr` pattern in motion-designer.md
- **Type scale mislabel**: Corrected "1.25 ratio" to "Tailwind defaults" in ui-designer.md and brand-kit.md, added clarifying note
- **SOURCE_WIDTH undeclared**: Added variable declaration in ab-variants.md figma_execute block
- **Hardcoded project names**: Replaced 'Feed'/'Saved'/'Discover' with generic nav-hiding heuristic in figma-responsive.md
- **Eval #4 broken path**: Fixed fixture reference to `./evals/fixtures/test-page.html` and created the fixture file
- **Eval #11 missing assertion**: Added `has-speaker-notes` assertion to design-presentation eval
- **Installation command**: Replaced non-existent `claude plugin add` with `git clone` in README

### Added

- **MCP-SETUP.md**: Complete guide for 4 optional MCP servers — Figma REST, Desktop Bridge, Claude Preview, Playwright — with install instructions, verification steps, and "Working Without MCP" table
- **MCP Fallback sections**: All 16 commands now have documented fallback behavior when MCP servers are unavailable
- **UX Researcher research methods**: Added usability testing protocol, card sorting guide, interview template, survey design checklist (~40 lines)
- **Eval validator script**: `scripts/run-evals.sh` validates JSON structure, counts assertions, checks fixture references
- **Eval fixture file**: `evals/fixtures/test-page.html` — landing page with intentional a11y issues for design-review eval

### Changed

- Stop hook expanded to all 16 commands (grouped: Core, Figma)
- README requirements section now links to MCP-SETUP.md
- README tone: "assembles specialists" → "loads specialized knowledge" (5 edits across README + SKILL.md)
- README directory tree expanded to show scripts/ and evals/ subdirectories

## [2.0.0] — 2025-03-10

The v2 release expands Design Studio from 4 commands to 16, adds 5 specialist agents, and introduces hooks, auto-detection, and a settings system.

### Added

- **12 new commands**: `/figma-create`, `/ux-audit`, `/design-handoff`, `/figma-responsive`, `/figma-sync`, `/design-present`, `/brand-kit`, `/component-docs`, `/figma-prototype`, `/site-to-figma`, `/ab-variants`, `/design-sprint`
- **5 specialist agents**: accessibility-auditor, design-qa, figma-creator, design-critique, design-lint
- **Hooks system**: SessionStart (auto-detection), PreToolUse (HTML validation), Stop (follow-up suggestions)
- **Auto-detection script**: Detects 15+ frameworks, build tools, CSS-in-JS libraries, component libraries, and documentation tools at session start
- **Settings system**: `settings.local.md` for user-configurable preferences (brand colors, framework, font, deploy target)
- **What's Next sections**: Every command now suggests relevant follow-up commands
- **Workflow pipelines**: 6 documented multi-command workflows (design-from-scratch, Figma-native, design-to-code, brand setup, stakeholder review, full sprint)
- **17 eval cases** with 6 assertions each covering all commands
- **2 new references**: `figma-creation.md` (693 lines — Figma Desktop Bridge API patterns) and `deployment.md` (198 lines — preview + Firebase hosting)

### Changed

- Expanded original 4 commands (`/design`, `/figma`, `/design-review`, `/design-system`) to match v2 quality standard
- SKILL.md rewritten with team assembly examples for all 16 commands + 10 agents
- README rebuilt with workflows section, configuration section, expanded knowledge table
- Detection script expanded from 5 to 15+ detection categories

## [1.0.0] — 2025-02-15

Initial release of Design Studio.

### Added

- **4 commands**: `/design`, `/design-review`, `/design-system`, `/figma`
- **9 specialist roles**: Design Manager, Creative Director, Product Designer, UX Designer, UI Designer, UX Researcher, Content Designer, Design System Lead, Motion Designer
- **7 reference files**: product-designer, ux-designer, ui-designer, ux-researcher, content-designer, design-system-lead, motion-designer
- **SessionStart hook** with basic project context detection
- **2 eval cases** for onboarding-redesign and pricing-table
- Plugin manifest, CONTRIBUTING.md, MIT License
