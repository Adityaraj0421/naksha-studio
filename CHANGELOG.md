# Changelog

All notable changes to Design Studio are documented here.

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
