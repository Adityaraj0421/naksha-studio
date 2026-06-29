# Changelog

All notable changes to naksha are documented here.

## v5.1.1 — `/design-reel` wipe fix (2026-06-29)

**Fixed:** the before/after wipe in redesign mode (`--url`) had its sides inverted — the BEFORE label sat over the redesigned page and AFTER over the original. The wipe now keeps BEFORE on the left and reveals AFTER in from the right, matching the labels. Caught by an end-to-end redesign run (a live dashboard) that the fixture test couldn't expose. Added a code comment so the clip direction can't be silently re-inverted.

## v5.1.0 — Watch the Team: `/design-reel` (2026-06-29)

naksha can now record its own design team working. `/design-reel` turns a `/design` run into a share-able vertical (9:16) + landscape (16:9) video — the 26-role team redesigning a screen, captioned, live. The team is the hook: no single-voice AI design tool can show a Creative Director, UX Designer, and UI Designer each making a distinct, visible change to the page you just designed.

**New command:**
- `/design-reel <task> [--url <page>]` — runs `/design`, then renders the result as a reel. Outputs `reel-9x16.mp4` + `reel-16x9.mp4`, ready to post, with a "produced by naksha · a re-enactment" honesty end card. `--url` captures a live page for a real before/after wipe; without it, the reel shows the freshly built page (auto-detect mode).

**Architecture (spiked before building):**
- **Extract, don't emit.** Passive in-run beat emission appended to `/design` proved unreliable (38% across 8 page types, fails by *omission* — 3/8 emitted zero). A dedicated, schema-forced extraction pass run *after* `/design` is 100% reliable (5/5, avg 5.4 roles). Contract: `docs/reel-beats.md`.
- **Local committed renderer.** `packages/naksha-reel` (`@naksha/reel`) is an image-driven Remotion composition invoked with local `node` — no `npx`, no network at render time. naksha core stays zero-build; the toolchain is opt-in and installs on first use.
- **Guardrails:** role normalization to a canonical set, caption clamp (≤95 chars), dedupe-by-role, and a **≥3 min-beat gate** that refuses to ship a thin clip.

**Supporting changes:**
- `/naksha-doctor` gains a reel-toolchain probe (node / ffmpeg / package) with a status row.
- `docs/reel-beats.md` (data contract) and `docs/reel-setup.md` (toolchain + troubleshooting).
- `scripts/reel-render-smoke.sh` — CI-safe smoke test (unit tests + render + gate rejection); skips cleanly when the opt-in package isn't installed.
- Capability notes added to all platform adapters (Cursor, Windsurf, Gemini, Copilot).
- **63 commands** (was 62).

## v5.0.0 — Project Memory & Design Agent (2026-05-29)

Naksha now remembers your project. Two new commands and a persistent memory system let you capture design constraints, browser research findings, and component patterns once — and have them flow automatically into every subsequent design command.

**New commands:**
- `/naksha-browse <url>` — Browser-vision design research. Captures a live URL via Playwright (screenshots + DOM analysis), extracts layout patterns, typography, color palette, and UX patterns, then writes structured `browser_findings` to `.naksha/project.json`. Context is automatically injected into future design commands. Skips gracefully when Playwright MCP is unavailable.
- `/naksha-remember <constraint>` — Persist a design constraint or component pattern to project memory. Classifies input as `constraint` (grid, WCAG level, no-dark-mode) or `component_pattern` (Button variants, Card structure) and patches the relevant field in `.naksha/project.json`.

**v5 memory schema (`schema_version: "5"`):**
- `constraints: {}` — key/value design constraints (grid, accessibility level, motion policy, etc.)
- `component_patterns: []` — named component patterns with structure and usage notes
- `browser_findings: []` — FIFO queue (cap 20) of browser research captures with URL, mode, patterns, and timestamp

**Stop hook memory processor:**
- Rewrote the Stop hook from a one-liner to a full memory-write processor
- Commands emit `<!-- naksha-memory-update { ... } -->` blocks during sessions
- On session end, the hook scans for these blocks and applies them to `.naksha/project.json`
- Two block types: `project_json_patch` (set value at dot-notation path, creates intermediate keys) and `browser_finding_write` (prepend to findings array, FIFO cap 20)
- Errors logged with project path attribution to `~/.naksha/hook-errors.log`
- Follow-up suggestion: if the session involved design work, the hook suggests one or two relevant naksha commands

**Memory context in 5 existing commands (Track B):**
- `/design` — injects active constraints + recent browser findings into the Design Manager's initial brief
- `/brand-kit` — reads `brand.primary`, `brand.secondary`, `brand.voice` as seeded inputs instead of prompting
- `/design-system` — reads preferred `tokenFormat` from memory; skips the format question when present
- `/design-score` — Token Compliance dimension reads known component patterns and constraints
- `/accessibility-audit` — reads WCAG level constraint (e.g. `wcag_level: AA`) and applies it to scoring
- `/naksha-status` — displays `schema_version`, `constraints`, `component_patterns`, and `browser_findings` in addition to existing brand/framework context

**Pipeline v5 (Track C):**
- Pipeline YAML steps can now specify `type: browser` (runs `/naksha-browse`) and `type: memory_write` (runs `/naksha-remember`)
- Two new pipeline templates: `research-and-design` (browse → design → score → handoff) and `design-score-track` (score → critique → accessibility → report)
- `/pipeline new <name>` command: interactive pipeline wizard that generates a custom YAML
- `docs/pipeline-failure-modes.md`: reference doc for pipeline step failure handling and fallback rendering

**`/naksha-init` v4→v5 migration:**
- Detects existing v4 projects (no `schema_version` field) on re-run
- Adds `schema_version: "5"`, `constraints: {}`, `component_patterns: []`, `browser_findings: []` while preserving all v4 fields
- Reports "Upgraded to v5 schema." in the Step 5 summary

**`/naksha-doctor` v5 schema detection:**
- New Step 2.6: Project Memory Check — reads `.naksha/project.json` and records `NO_PROJECT`, `V5`, or `V4`
- Health report adds a Memory row: `✅ v5` / `⚠ v4 — run /naksha-doctor --fix` / `ℹ no project.json — run /naksha-init`
- `--fix` guidance added for both NO_PROJECT (→ `/naksha-init`) and V4 (→ inline migration instructions)

**Platform adapter updates:**
- All 4 adapters (GEMINI.md, .windsurfrules, .cursor/rules/naksha.mdc, .github/copilot-instructions.md) now document the 4 v5 memory commands with examples and Playwright dependency note

**Quality gate (guard-counts.sh):**
- New `guard-counts.sh` script wired into `quality-check.sh` (5th gate): asserts canonical command count and knowledge-line floor across all adapters, install.sh, marketplace.json, docs, and naksha-help.md — prevents metadata drift from silently recurring

**Stats:** 62 commands · 26 roles · 15,261 knowledge lines

---

## v4.8.0 — Tooling & Orchestration Polish (2026-03-17)

**MCP availability check in `/naksha-doctor`:**
- 5th health probe: Playwright MCP and Figma MCP availability tested on every doctor run
- Reports `AVAILABLE` / `UNAVAILABLE` per MCP as an informational panel — not a quality gate
- Maps each unavailable MCP to the commands that depend on it (so users know what falls back)
- `--fix` mode extended with MCP setup remediation instructions

**Agent model optimization:**
- `design-token-extractor` and `design-lint` agents switched from `model: inherit` to `model: haiku`
- Both are mechanical scan-and-report tasks with no judgment requirements — haiku reduces cost and latency without quality loss

**Context7 MCP integration:**
- `/design-framework` now calls Context7 (step 2.5) before generating code — resolves library ID, queries latest API docs for the target framework (React/Vue/Svelte/Next.js/Astro), and applies any version-specific breaking changes
- `/design-system` now calls Context7 before token generation — fetches current Tailwind theme config and Style Dictionary transform docs; respects `tokenFormat` from `.naksha/project.json`
- Both commands include graceful fallback when Context7 is unavailable

---

## v4.7.0 — Design Intelligence (2026-03-17)

**`/design-score` command (60th command):**
- Quantitative 0–100 score across 4 dimensions: Accessibility (25pts), Usability (25pts), Visual Quality (25pts), Token Compliance (25pts)
- Grade scale: A (90–100 production ready) → F (<60 requires redesign)
- Inputs: URL (Playwright), local file, `--screenshot <path>`, or Figma node ID
- Output: `╔ Design Score ╗` card with ASCII progress bars per dimension, grade, top-5 issues sorted by impact, per-dimension breakdown, score methodology footer
- Reads `.naksha/project.json` for brand token context in Token Compliance scoring

**`design-critic` agent upgraded (170 → 227 lines):**
- Added **Scoring Calculation** step — derives all 4 dimension scores from pass findings before writing the final output
- Added **Pass 4: Token Compliance** — scans for hardcoded color/typography/spacing values vs. token system; 5 sub-criteria × 5pts each; fallback to visual consistency when no token system present
- Final output now opens with `━━━ Design Score Summary ━━━` block: overall score, per-dimension bars, grade
- Updated `━━━ Overall Assessment ━━━` to include Usability Y/25, Visual Quality, and Token Compliance (replaces old "Heuristics Score: X/30")
- Scoring model is identical to `/design-score` — critic and score outputs are directly comparable

**Evals (IDs 157–160, total: 161):**
- ID 157: `design-score-landing-page` — URL input, 6 assertions
- ID 158: `design-score-screenshot-mode` — screenshot input, code-inspection limits noted, 5 assertions
- ID 159: `design-critic-produces-score-summary` — upgrade validation, 6 assertions
- ID 160: `design-critic-token-compliance-pass` — Pass 4 presence + token guidance, 5 assertions

---

## v4.6.0 — CI/CD & Community Health (2026-03-17)

**CI/CD:**
- New workflow `quality-check.yml`: runs behavioral-smoke + guard-legacy-branding on PRs touching fixtures, commands, or CI scripts — posts collapsible failure details as PR comment
- CI coverage now: validate-structure (structural), quality-check (behavioral + branding), design-check (CSS/HTML) — three orthogonal workflows

**`/naksha-doctor` command (59th command):**
- Runs all 4 quality scripts (validate-structure, verify-metadata, behavioral-smoke, guard-legacy-branding) and produces a `╔ naksha doctor ╗` health report
- `--fix` flag adds per-check remediation instructions for every failure type
- Added to SKILL.md routing ("doctor", "health check", "validate plugin", "diagnose naksha") and Stop hook suggestions

**Community health:**
- `.github/labels.yml`: 17 canonical label definitions (Triage, Workflow, Area groups)
- `scripts/sync-labels.sh`: idempotent label sync via `gh label create/edit`
- Created labels: `wishlist`, `claimed`, `ci`, `commands`, `agents`, `knowledge`, `evals`, `wing`
- `CONTRIBUTING.md`: added `## Building a Wing` — 7-step wing checklist (role reference → commands → SKILL.md → evals → fixtures → platform adapters → stats), PR requirements, examples from 3 existing wings

---

## v4.5.0 — Knowledge Depth Pass (2026-03-17)

**Conversational Designer reference deepened:**
- Added 2 new Reference-Sourced Insights: Nielsen Norman Group chatbot UX research (structured quick replies lift task completion 30–40%, quick-win onboarding strategy), Microsoft Bot Framework (narrow scope reliability, first-utterance vocabulary teaching)
- Added 1 new Advanced Pattern: Conversation Analytics & Continuous Improvement Loop (6-metric instrumentation table, bi-weekly review cycle, fallback log clustering)
- Upgraded Handoffs from bullet points to rich deliverables format with explicit "Deliver:" lines

**Spatial Designer reference deepened:**
- Deepened all 4 existing Reference-Sourced Insights to multi-paragraph format: Apple visionOS HIG (adaptive layout, defaultSize/minSize/maxSize), W3C WebXR (session entry/exit design, 3-state feature detection), W3C Immersive Web (AR anchor 3-tier fallback, surface type feedback), Google Daydream (3DoF constraints, hybrid capability flags)
- Added 2 new Reference-Sourced Insights: Meta Quest Developer Center (natural affordance transfer, hand presence, 50ms microinteraction latency), Microsoft Mixed Reality (vergence-accommodation conflict, angular type scaling, depth jitter rules)
- Added 1 new Advanced Pattern: Spatial Audio as UI Feedback (6-trigger feedback hierarchy, directionality rules, earcon design, SSML integration)

**Compliance Designer reference deepened:**
- Added 2 new Reference-Sourced Insights: CPPA CCPA Enforcement (exact link text, GPC Sec-GPC:1 compliance, opt-out confirmation requirements), eIDAS QES (SES/AES/QES three-tier table, QES multi-step identity verification pre-flow)
- Added 1 new Advanced Pattern: Consent Version Migration & Re-Consent Flows (when re-consent is required, blocking modal pattern, consequence-first rejection, audit trail append-only rules)

**Knowledge total:** ~13,800 lines across 32 reference files

---

## v4.4.0 — Discovery & Polish (2026-03-17)

**Version-agnostic assets:**
- Removed version badge from `assets/social-preview.svg` — design is now evergreen
- Updated stale stat numbers in social preview to current values with `+` notation (26+ roles, 57+ commands, 13,500+ lines, 7 agents)
- Removed `v3.5.0` text from `demos/demo.svg` — replaced with `naksha-studio` wordmark

**New command:**
- `/naksha-help` — contextual quick-reference: browse all 11 categories, list per-category commands, or get a reference card for any specific command (58th command)

**Wiring:**
- `naksha-help` added to SKILL.md trigger phrases and command table
- `naksha-help` added to Stop hook suggestions

## v4.3.0 — Agent Upgrades (2026-03-17)

**New agents:**
- `design-token-extractor` — reads CSS/SCSS/Tailwind configs, extracts and categorizes design tokens, outputs CSS vars/Tailwind/Style Dictionary. Reads `.naksha/project.json` for preferred format.
- `design-critic` — 3-pass UX critique: Pass 1 Nielsen's 10 heuristics (severity-rated), Pass 2 accessibility spot-check, Pass 3 content quality (microcopy, errors, tone, hierarchy). Playwright-enabled for live URLs. Reads `.naksha/` brand voice.

**Upgraded agents:**
- `accessibility-auditor` — Playwright URL capture (live site auditing), `.naksha/` brand color contrast awareness, WCAG 2.2 new criteria (2.5.7, 2.5.8, 3.2.6, 3.3.7)
- `design-qa` — Playwright viewport simulation (375/768/1280px breakpoints), `.naksha/` token format + framework context, Tailwind arbitrary value detection

**Stats:** 7 agents (+2) · 57 commands · 26 roles

## v4.2.0 — Eval Quality & CI Hardening (2026-03-17)

**Eval quality:**
- Upgraded v4.1.0 tutorial evals (IDs 140–145) from shallow keyword checks to rich 6-assertion format
- All 146 evals now follow consistent named-assertion pattern

**CI hardening — 3 new validate-structure checks (5 → 8):**
- Check 6: `pipeline-yaml-structure` — validates all pipeline YAML files have name, description, steps, and command fields
- Check 7: `skill-command-sync` — ensures every command in `commands/` is referenced in `skills/design/SKILL.md`
- Check 8: `command-allowed-tools` — enforces `allowed-tools:` frontmatter on all 57 command files; fixed 17 commands that were missing it
- Updated stale comment in Check 4 (previously said "17/46 commands lack allowed-tools" — now all 57 are compliant)

## v4.1.0 — Tutorial Depth & Pipeline Library (2026-03-17)

**Tutorial expansion:**
- 3 new tutorial tracks: `conversational` (chatbot → VUI → pipeline), `spatial` (visionOS → AR → competitive audit), `compliance` (GDPR → HIPAA → project memory)
- `full` track expanded 16 → 19 steps (chatbot, GDPR, and /pipeline run launch-prep added)
- Welcome Screen updated with tracks 10–12 and Frontier Wings / Memory & Pipelines rows
- Footer tracks list updated with all 12 tracks

**Pipeline library:**
- 3 new built-in pipelines: `design-tokens` (design-system → brand-kit → design-framework), `email-launch` (email-template → email-campaign → email-audit), `ar-prototype` (design-spatial → design-ar-overlay → competitive-audit)
- Total: 7 pipelines in `skills/design/pipelines/`

## v4.0.0 (2026-03-17)

The biggest naksha release — four pillars that transform the plugin from a stateless command toolkit into a project-aware, vision-capable, pipeline-driven design operations platform with three new frontier wings.

**Stats:** 26 roles (+3), 57 commands (+11), 13,500+ knowledge lines (+1,000), 32 reference files (+3)

### Added — Pillar 1: Project Memory
- **`/naksha-init`** — interactive project setup wizard; writes `.naksha/project.json` (brand colors, font, framework, token format) and creates `.naksha/memory.md` (append-only decision log)
- **`/naksha-status`** — display current project context and last 10 design decisions from memory
- **SessionStart hook**: `detect-design-context.sh` now walks up 3 directory levels for `.naksha/project.json` and prepends a "Project Memory" section to session context
- Memory write-back in `/design`, `/brand-kit`, `/design-system` — significant decisions appended to `.naksha/memory.md` automatically

### Added — Pillar 2: Agentic Pipelines
- **`/pipeline`** — meta-command: `run <name>` executes multi-step design pipelines sequentially; `list` enumerates available pipelines; `show <name>` previews pipeline definition
- **4 built-in pipeline definitions** in `skills/design/pipelines/`: `launch-prep` (design → accessibility-audit → design-review → design-handoff), `brand-audit`, `component-build`, `social-launch`

### Added — Pillar 3: Vision-Powered Reviews
- **`/design-compare <url1> <url2>`** — capture two URLs via Playwright, side-by-side visual analysis, "Steal This" recommendation table
- **`/competitive-audit <url>`** — extract color palette, type system, layout grid, UX patterns, quality-rated recommendations
- **`/design-review`** enhanced: non-Figma URLs auto-captured via Playwright before analysis
- **`/design-critique`** enhanced: `--screenshot <path>` flag for vision-mode heuristic review

### Added — Pillar 4: Frontier Wings

**Conversational Design Wing**
- **`skills/design/references/conversational-designer.md`** — 400+ lines: dialog flow design, chatbot UI patterns (bubbles, quick replies, typing indicators, carousels), VUI principles (wake word, SSML, barge-in, earcons), persona systems, multi-modal design
- **`/design-chatbot`** — complete chatbot/assistant UI spec: persona & voice, dialog flow map (4 paths), message bubble UI, component library, error states, accessibility (WCAG 2.1 AA)
- **`/design-voice-ui`** — voice interface spec: wake word flows, confirmation patterns, screen companion layout (hybrid), SSML guidelines, earcon design, no-input handling

**Spatial & AR Design Wing**
- **`skills/design/references/spatial-designer.md`** — 468+ lines: visionOS/Vision Pro HIG (window types, ornaments, depth layers), WebXR design patterns, input methods (gaze/pinch/hand/voice), comfort guidelines, spatial typography with Dynamic Type, lighting-aware design
- **`/design-spatial`** — spatial computing spec: window type selection, depth hierarchy document, ornament placement (attachmentAnchor-based), spatial typography scale, interaction model, comfort checklist
- **`/design-ar-overlay`** — AR overlay spec: anchor strategy, world tracking UI (3 states), instruction card patterns, scan state designs, confirmation overlays, occlusion handling

**Compliance Design Wing**
- **`skills/design/references/compliance-designer.md`** — 636 lines: GDPR/CCPA consent UX, Privacy Control Center, HIPAA healthcare UI (PHI handling, session timeout, audit logs), PCI DSS payment forms (iframe isolation, 3DS), ADA/EN 301 549 compliance, regulated industry patterns
- **`/design-gdpr`** — GDPR/CCPA consent flow spec: 3 cookie banner variants, consent flow, privacy control center wireframe, data deletion request flow (5-step), jurisdiction-split compliance checklists
- **`/design-compliance`** — `--regulation <hipaa|pci|ada>` flag; HIPAA: PHI field marking, session timeout (15 min), audit log UI, access control display; PCI: card field isolation, tokenization flow, 3DS challenge UI; ADA: 508 compliance checklist, focus management, screen reader live regions

### Updated
- **`skills/design/SKILL.md`** — 6 locations updated: trigger phrases (+25 new terms), examples (+11), command table (+11 rows in 5 new sections), team table (new "Frontier Wing Specialists" section with 3 roles), routing rules (+6 bullets, +9 team assembly examples), output formats (+9 rows)
- **`hooks/hooks.json`** — Stop hook suggestion list updated with all 11 new commands
- **Platform adapters** — all 4 updated to 26 roles / 57 commands / 13,500+ lines: `GEMINI.md`, `.cursor/rules/naksha.mdc`, `.windsurfrules`, `.github/copilot-instructions.md`

### Tests
- **20 new eval entries** (IDs 120–139) covering all 11 new commands in `evals/evals.json`
- **11 new smoke fixtures** in `evals/fixtures/` with corresponding `check_fixture` rows in `behavioral-smoke.sh`

---

## v3.19.0 (2026-03-17)
### Added
- **Wishlist issue template**: `.github/ISSUE_TEMPLATE/wishlist-item.yml` — YAML form with Wing/Area, What to build, Why it matters, Acceptance criteria, Difficulty, Related files fields. Auto-labels issues with `wishlist`.
- **Validate structure script**: `scripts/validate-structure.js` — checks command count, reference count, version consistency, command frontmatter completeness, and no empty command files. Runnable locally: `node scripts/validate-structure.js`.
- **Validate structure CI**: `.github/workflows/validate-structure.yml` — triggers on PRs touching `commands/**`, `skills/design/references/**`, `.claude-plugin/plugin.json`, or `meta/stats.json`. Posts PR comment with failure details.
- **CONTRIBUTING.md "Finding Work" section**: label system docs, issue links, claim/release instructions.
- **CONTRIBUTING.md "Definition of Done" section**: contribution checklist in prose with rationale for each item.
- **PR template expanded**: per-contribution-type checklists for new command, new role, and knowledge/reference updates.

---

## v3.18.0 (2026-03-17)
### Changed
- `/design-tutorial` fully refreshed for v3.17.0 state: 46 commands, all wings represented
- Welcome screen updated: version badge (v2.9.0 → v3.18.0), command count (26 → 46), 2 new wing rows (AI Visual Gen, Print/PDF)
- 2 new tutorial tracks: `ai-visual-gen` (3 exercises: gen-image, gen-video, gen-moodboard) and `print-pdf` (3 exercises: print-layout, pdf-report, print-audit)
- `full` track expanded: 12 → 16 steps, adding AI image, AI moodboard, print layout, PDF report exercises
- Step 4 command table refreshed: 26 → 46 commands organized across 12 wings
- Track list renumbered: `full` moves from 7 → 9 to accommodate the 2 new tracks

---

## v3.17.0 (2026-03-17)

### Added
- **Template Gallery**: `/design-template` with no arguments now shows a rich catalog of all 10 template categories — each with name, section breakdown, best-for tags, and an example command with style flags
- 5 new SKILL.md discovery trigger phrases (`Browse available templates`, `What templates are available?`, `Show me template options`, `Template list`, `Available templates`)
- 2 new behavioral evals (ids 118–119): `template-gallery-noargs`, `template-gallery-discovery-phrase`. Total: 120 evals
- 1 new smoke fixture (`template-gallery-output`). Total: 49 fixtures

### Fixed
- `plugin.json` description corrected from "42 commands, 11,000+ lines" to "46 commands, 12,500+ lines"

---

## [3.16.0] — 2026-03-17

Source-Anchoring Completion — adds ## Reference-Sourced Insights to deployment.md,
the last role file missing this section.

### Added
- `## Reference-Sourced Insights` to: deployment (LCP, CLS, INP, font-best-practices)

### Updated
- `meta/stats.json` — knowledge_lines 12,500 → 12,545

---

## [3.15.0] — 2026-03-16

Wing Completion Pass 2 — adds ## Handoffs + ## Advanced Patterns + ## Full Coverage to 5 role reference files.

### Added
- All 3 sections to: design-system-lead, figma-creation, growth-analytics-specialist,
  social-media-copywriter, social-media-strategist

### Updated
- `meta/stats.json` — knowledge_lines ~11,915 → ~12,500

---

## [3.14.0] — 2026-03-16

Wing Completion Pass 1 — adds ## Handoffs section to 9 role reference files.

### Added
- `## Handoffs` to: content-designer, deployment, figma-workflow, product-designer,
  social-media-designer, ui-designer, ux-designer, ux-researcher, video-content-producer

### Updated
- `meta/stats.json` — knowledge_lines 11,820 → 11,915

---

## [3.13.0] — 2026-03-16

Agent Commands — surfaces 4 previously-hidden QA agents as slash commands, growing the command count from 42 to 46.

### Added
- `/lint-design [nodeId]` — Figma design quality linter (orphan colors, spacing, contrast, auto-layout)
- `/design-critique [nodeId]` — UX heuristic review against Nielsen's 10 heuristics + visual audit
- `/design-qa <file>` — HTML/CSS implementation QA (responsive, token compliance, states, motion)
- `/accessibility-audit <file>` — Full WCAG AA audit (contrast, keyboard nav, semantic HTML, ARIA)
- 4 new smoke fixtures; 8 new evals (ids 110–117)

### Updated
- `skills/design/SKILL.md` — 4 new routing examples + 4 new Plugin Commands table rows
- `meta/stats.json` — commands 42 → 46

---

## [3.12.0] — 2026-03-16

Quality Infrastructure — achieves 100% smoke fixture coverage (22/42 → 42/42) across all 42 commands and fills eval gaps for under-tested commands, growing the eval suite from 84 to 110.

### Added
- 21 new smoke fixtures covering: ab-variants, component-docs, design-handoff, design-present, design-sprint, ux-audit, figma-create, figma-prototype, figma-responsive, figma-sync, figma-component-library, social-content, social-campaign, social-analytics, brand-kit, brand-strategy, illustration-system, motion-design, presentation-design, site-to-figma, video-script
- 26 new evals (ids 84–109): +2 for commands at 0 evals (design-handoff, design-present, design-sprint, figma-component-library, figma-prototype, brand-strategy), +1 for 14 commands at 1 eval

### Updated
- `scripts/behavioral-smoke.sh` — 21 new `check_fixture` lines; smoke coverage 22/42 → 42/42 (100%)

---

## [3.11.0] — 2026-03-16

Framework Wing Completion — completes `framework-specialist.md` with three standard sections (Handoffs, Advanced Patterns, Full Coverage), upgrades the smoke line to 6 keywords, and adds four evals covering Vue, Svelte, Astro, and the design-to-framework chain.

### Added
- `framework-specialist.md` — added `## Handoffs` (Design System Lead, Frontend Developer, Design Manager handoff paths), `## Advanced Patterns` (compound components, polymorphic `as` prop, `cva` compound variants, Next.js Server/Client boundary, Astro island hydration strategy, Svelte 5 rune migration), `## Full Coverage` (5 framework scenarios: React+Tailwind dashboard, Vue product card, Svelte form, Next.js App Router page, Astro landing with React island)
- Evals 80–83: `design-framework-vue`, `design-framework-svelte`, `design-framework-astro`, `design-to-framework-chain`

### Updated
- `scripts/behavioral-smoke.sh` — `design-framework-output.md` smoke line upgraded: 3 keywords → 6 (`component,tsx,props,tailwind,interface,cn`), min headers 2 → 3, min chars 150 → 300

---

## [3.10.0] — 2026-03-16

Print/PDF Wing — one new Print Designer role and three new commands covering the full print design lifecycle: document layout, single-artifact layout, and preflight audit.

### Added
- `skills/design/references/print-designer.md` — new role: Print Designer, full-completion with all 12 standard sections including Advanced Patterns (multi-page document flow, VDP, responsive→print degradation, bleed-aware image placement) and Full Coverage (invoice, annual report, certificate, brochure, business card, packaging scenarios)
- `/pdf-report` command — generates multi-page print-ready document layouts with CSS `@page` named pages, running headers/footers, master template, typography system, and preflight checklist
- `/print-layout` command — designs single print artifacts (business cards, certificates, flyers, brochures) with correct bleed/safe zone setup, CMYK color documentation, and HTML/CSS output
- `/print-audit` command — two-phase preflight audit: Phase 1 (always) checks bleed, safe zone, CMYK mode, font embedding, and page break rules; Phase 2 (conditional) audits brand consistency when brand context is provided
- `evals/fixtures/pdf-report-output.md`, `print-layout-output.md`, `print-audit-output.md` — smoke fixtures
- Evals 76–79: pdf-report, print-layout business card, print-audit standalone, print-audit with brand

### Updated
- `scripts/behavioral-smoke.sh` — smoke coverage 19/39 → 22/42
- `skills/design/SKILL.md` — Print Designer added to role list; `/pdf-report`, `/print-layout`, `/print-audit` added to commands table; print trigger keywords added
- `meta/stats.json` — version 3.9.0 → 3.10.0, roles 22 → 23, commands 39 → 42

---

## [3.9.0] — 2026-03-16

Data Viz Wing Completion — polished the Dashboard Architect role file and added a new `/data-viz-audit` command covering chart quality (always) and dashboard layout fit (conditional).

### Added
- `/data-viz-audit` command — two-phase audit: Phase 1 (Data Viz Designer) covers chart type selection, accessible palette, annotations, and anti-patterns; Phase 2 (Dashboard Architect) covers dashboard fit, hierarchy placement, and filter alignment — runs only when dashboard context is provided
- `evals/fixtures/data-viz-audit-output.md` — smoke fixture for `/data-viz-audit`
- Evals 74–75: `/data-viz-audit` chart-only and dashboard-context scenarios

### Updated
- `skills/design/references/dashboard-architect.md` — added missing `## Advanced Patterns` (drill-through navigation, real-time refresh, cross-filter coordination, progressive disclosure) and `## Full Coverage` (5 dashboard type scenarios, empty/loading/error states, mobile degradation at 375px, export patterns)
- `scripts/behavioral-smoke.sh` — smoke coverage 18/38 → 19/39
- `skills/design/SKILL.md` — `/data-viz-audit` added to commands table; 7 new data viz audit trigger keywords added
- `meta/stats.json` — version 3.8.0 → 3.9.0, commands 38 → 39

---

## [3.8.0] — 2026-03-16

### Added
- `/email-audit` command — full-spectrum two-phase email audit: Phase 1 (Email Designer) covers 12 technical criteria with corrected HTML for critical issues; Phase 2 (Email Copywriter) covers AIDA body audit, subject line scoring, and targeted rewrites
- `evals/fixtures/email-audit-output.md` — smoke fixture for `/email-audit`
- Evals 72–73: `/email-audit` technical and copy/strategy scenarios

### Updated
- `skills/design/references/email-designer.md` — added missing `## Handoffs`, `## Advanced Patterns`, `## Full Coverage` sections (MJML component system, ESP conditional blocks, retina image technique, GIF first-frame rule, full client rendering matrix)
- `scripts/behavioral-smoke.sh` — smoke coverage 17/37 → 18/38
- `skills/design/SKILL.md` — `/email-audit` added to commands table; 7 new email audit trigger keywords added
- `meta/stats.json` — version 3.7.0 → 3.8.0, commands 37 → 38

---

## [3.7.0] — 2026-03-16

AI Visual Gen Wing — four new specialist roles and five new commands covering the full generative AI stack: image, video, audio/voiceover, and cross-tool prompt engineering.

### Added

- **AI Image Director** (`skills/design/references/ai-image-director.md`) — tool selection matrix (MJ/DALL-E/Ideogram/Firefly/SD), prompt anatomy, brand consistency system, iteration protocol, platform output specs
- **AI Video Director** (`skills/design/references/ai-video-director.md`) — tool selection matrix (Runway/Kling/Sora/Pika/Luma), shot prompt structure, consistency across shots, transition planning, platform specs
- **AI Audio & Voice Producer** (`skills/design/references/ai-audio-voice-producer.md`) — ElevenLabs/Murf/Suno, voice brief template, music brief template, video sync timing, FTC + EU AI Act compliance
- **AI Prompt Engineer** (`skills/design/references/ai-prompt-engineer.md`) — modular prompt architecture, brand prompt library system, cross-tool translation, seed management, 8-failure-mode diagnosis
- `/gen-image` — brand-aligned image prompt pack (tool selection + 6-element anatomy + 2 variations + seed strategy)
- `/gen-video` — shot-by-shot video prompt pack (tool selection + shot structure + consistency notes + platform checklist)
- `/gen-audio` — AI audio brief (voiceover or music, timing cues, compliance note)
- `/gen-moodboard` — 3 visual directions with 4–6 prompts each + brand rationale
- `/prompt-refine` — annotated prompt critique + optimized version + cross-tool variant
- Smoke fixtures (sentinel): gen-image, gen-video, gen-audio, gen-moodboard, prompt-refine (smoke coverage: 17/37)

### Updated

- `SKILL.md` — 4 new roles added to description + AI gen trigger keywords + 5 new routing examples
- `plugin.json` — version 3.6.0 → 3.7.0; keywords expanded with 24 AI gen terms
- `meta/stats.json` — roles 18→22, commands 32→37, reference_files 24→28
- `illustration-director.md` — handoff note to AI Image Director
- `video-content-producer.md` — handoff notes to AI Video Director + AI Audio & Voice Producer
- `brand-strategist.md` — handoff note to AI Image Director for moodboarding

---

## [3.6.0] — 2026-03-16

Framework Routing + Marketplace Install — `/design` now auto-routes to `/design-framework` based on settings, and Claude Code 2.1.72+ users can install via the marketplace.

### Added

- `.claude-plugin/marketplace.json` — enables `/plugin marketplace add` installation for Claude Code 2.1.72+ (fixes #4)
- Framework routing in `/design` — `--framework` flag and `js_framework`/`output_format` settings now auto-invoke `/design-framework` for component output; priority ladder: flag → `js_framework` → `output_format` → null (HTML only)
- Smoke test fixtures for 6 more commands: email-template, email-campaign, chart-design, design-template, design-tutorial, dashboard-layout (smoke coverage: 12/32 commands)

### Fixed

- `/design` Step 0 now reads `js_framework` and `output_format` from `settings.local.md` (previously only checked `--framework` flag in `$ARGUMENTS`)
- `/design` Step 5 now writes output to canonical `design-output.html` for reliable `/design-framework` handoff

---

## [3.5.0] — 2026-03-15

Multi-Platform Expansion — Naksha design team now works in Cursor, Windsurf, Gemini CLI, and VS Code Copilot alongside Claude Code.

### Added

- **Cursor rules** (`.cursor/rules/naksha.mdc`) — glob-matched design rules for CSS/HTML/TSX/SVG files; includes full team roster, token architecture, accessibility rules, dark mode patterns
- **Windsurf rules** (`.windsurfrules`) — full design system rules loaded at session start; covers all 18 roles, color/typography/spacing systems, component state requirements, email and social specs
- **Gemini CLI context** (`GEMINI.md`) — reference-style design team guide; role tables, platform specs, output format guide, token architecture, social media dimensions
- **GitHub Copilot instructions** (`.github/copilot-instructions.md`) — code-pattern-heavy guide with typed React examples, email HTML structure, CSS token patterns, accessibility checklist

### Changed

- `README.md` — Quick Start expanded with install instructions for all 5 platforms; platform badges added; file tree updated to list all 24 reference files
- `CONTRIBUTING.md` — title corrected to "Contributing to Naksha"; Platform Adapters section added with maintenance guide
- `MCP-SETUP.md` — command count corrected (19 → 32)

### Stats

- **Platforms**: 1 (Claude Code) → 5 (+Cursor, Windsurf, Gemini CLI, Copilot)
- **Adapter files**: 4 new files
- **Knowledge lines**: ~11,000 (unchanged — adapters reference same role knowledge)

---

## [3.4.0] — 2026-03-15

Agency Expansion — 5 new specialist roles complete the full product and marketing visual coverage.

### Added

- **Motion Designer role** (`motion-designer.md`) — micro-interactions, page transitions, CSS animation, duration/easing system, reduced motion accessibility, FLIP technique
- **Presentation Designer role** (`presentation-designer.md`) — pitch deck structure, slide systems, data storytelling, 10-slide pitch framework, assertion-evidence pattern
- **Brand Strategist role** (`brand-strategist.md`) — positioning framework, visual identity systems, brand architecture models, voice/tone spectrum, brand audit
- **Illustration Director role** (`illustration-director.md`) — icon system design, SVG standards, style taxonomy, spot illustration composition, optical adjustment rules
- **Video/Content Producer role** (`video-content-producer.md`) — video scripts, storyboarding, hook formulas, short-form pacing, product demo framework, repurposing matrix
- **5 new commands**: `/motion-design`, `/presentation-design`, `/brand-strategy`, `/illustration-system`, `/video-script`
- **5 new eval cases** (ids 42–46) — one per new role, testing decision-making depth
- **SKILL.md updated** — 5 new roles added to Design Manager routing, new trigger keywords, new routing examples

### Stats

- **Roles**: 13 → 18 (+5)
- **Commands**: 27 → 32 (+5)
- **Evals**: 41 → 46 (+5)
- **Knowledge base**: ~9,500 lines → ~11,000 lines (+16%)

---

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
