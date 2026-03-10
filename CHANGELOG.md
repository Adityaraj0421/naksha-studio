# Changelog

All notable changes to Design Studio are documented here.

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
