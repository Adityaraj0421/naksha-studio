# Design Spec: Tutorial Mode Full Refresh (v3.18.0)

**Date:** 2026-03-17
**Status:** Approved
**Scope:** Part A of two-part roadmap (Tutorial Refresh → Community Contributions)

---

## Problem

`commands/design-tutorial.md` was authored at v2.9.0 with 26 commands. The plugin is now at v3.17.0 with 46 commands. Three categories of drift exist:

1. **Stats drift** — welcome screen header says "v2.9.0 · 26 commands"; all command count references are stale
2. **Missing wings** — AI Visual Gen (5 commands) and Print/PDF (3 commands) have no tutorial tracks
3. **Stale command table** — Step 4 "Explore more" lists 26 commands across 8 groups; 20 commands are entirely absent

---

## Approach

Single-file comprehensive edit of `commands/design-tutorial.md`. One commit, one version bump to v3.18.0. No new files created.

---

## Section 1: Stats & Welcome Screen

**Header update:**
```
║                    Welcome to Naksha                      ║
║                    v3.18.0 · 46 commands                  ║
```

**Command overview — 2 new rows added:**
```
AI Visual Gen    /gen-image /gen-video /gen-audio /gen-moodboard /prompt-refine
Print / PDF      /pdf-report /print-layout /print-audit
```

**Track menu — 2 new tracks inserted, `full` renumbered:**
```
7. ai-visual-gen  15 min  Generate images, video briefs, audio specs, moodboards
8. print-pdf      15 min  Build a print layout, PDF report, preflight audit
9. full           40 min  Complete tour: all wings, all workflows (~40 min)
```

---

## Section 2: New Tracks

### TRACK: ai-visual-gen

**Goal:** Generate an image prompt → produce a video brief → build a moodboard.

**Exercise 1 — Generate an Image**
```
/gen-image hero illustration for a SaaS landing page: abstract, minimal, blue palette
```
> The AI Image Director produces a structured prompt optimized for Midjourney/DALL-E/Firefly — negative prompts, aspect ratio, style references, seed suggestions.

**Exercise 2 — Write a Video Brief**
```
/gen-video 15-second product launch teaser. Tone: confident, modern. No voiceover.
```
> The AI Video Director outputs a shot-by-shot brief with scene timing, motion direction, music mood, and color grading notes.

**Exercise 3 — Build a Moodboard**
```
/gen-moodboard brand moodboard for the SaaS product above. Style: clean tech, trustworthy.
```
> Assembles visual direction references — typography pairings, color story, photography style, UI texture — as a structured brief.

**Suggested next:** `/design-tutorial print-pdf` or `/design-tutorial full`

---

### TRACK: print-pdf

**Goal:** Design a print layout → generate a multi-page PDF report → run a preflight audit.

**Exercise 1 — Create a Print Layout**
```
/print-layout business card for Naksha — name: Alex Rivera, title: Design Lead. Minimal style.
```
> The Print Designer applies bleed/trim/safe-zone geometry, CMYK color documentation, and CSS Paged Media rules. Production-ready CSS.

**Exercise 2 — Generate a PDF Report**
```
/pdf-report quarterly design system status report. Sections: Executive Summary, Token Changes, Component Updates, Accessibility Score.
```
> Multi-page layout with `@page` rules, named pages, running headers/footers, TOC, and widows/orphans control.

**Exercise 3 — Run a Preflight Audit**
```
/print-audit [paste the business card CSS from Exercise 1]
```
> Two-phase audit — Phase 1: bleed geometry, CMYK, font embedding, page-break rules. Phase 2: brand-fit (if brand context provided).

**Suggested next:** `/design-tutorial full`

---

## Section 3: Step 4 Command Table

Replace "All 26 commands" with the full current list (46 commands), organized by wing:

```
  All 46 commands:

  Core Design     /design /design-review /design-critique /design-qa
                  /design-system /brand-kit /brand-strategy
                  /design-sprint /design-present /design-handoff

  Figma           /figma /figma-create /figma-responsive /figma-prototype
                  /figma-sync /figma-component-library /ab-variants /site-to-figma

  QA & Audit      /ux-audit /accessibility-audit /lint-design /component-docs

  Social          /social-content /social-campaign /social-analytics

  Email           /email-template /email-campaign /email-audit

  Data Viz        /chart-design /dashboard-layout /data-viz-audit

  Framework       /design-framework

  AI Visual Gen   /gen-image /gen-video /gen-audio /gen-moodboard /prompt-refine

  Print / PDF     /pdf-report /print-layout /print-audit

  Media           /illustration-system /motion-design /presentation-design /video-script

  Templates       /design-template

  Tutorial        /design-tutorial
```

"Suggested next tracks" footers updated to route to the 2 new tracks where contextually relevant.

---

## Section 4: `full` Track Expansion (12 → 16 steps)

4 new exercises (marked ★) inserted in logical sequence. No existing steps removed.

```
1.  UI Foundation       /design a minimal landing page hero
2.  Design Review       /design-review [paste hero output]
3.  Token Extraction    /design-system extract tokens from the hero
4.  Brand Kit           /brand-kit generate brand system from color #3B82F6. SaaS product.
5.  Framework Export    /design-framework react-tailwind [paste hero HTML]
6.  Template            /design-template landing-page --style minimal
7.  Figma Creation      /figma-create a hero section with the brand kit above
8.  Social              /social-content Instagram Story: launch announcement
9.  ★ AI Image          /gen-image hero illustration for the product above. Style: minimal, abstract, blue
10. ★ AI Moodboard      /gen-moodboard brand visual direction. Tone: trustworthy, modern
11. Email               /email-template welcome email with the brand kit above
12. Data Viz            /chart-design user signups last 30 days as a line chart
13. Dashboard           /dashboard-layout growth dashboard: signups KPI, revenue KPI, activation, chart
14. ★ Print Layout      /print-layout business card with the brand kit above. Name: Alex Rivera, Design Lead
15. ★ PDF Report        /pdf-report design system status report. Sections: Summary, Token Changes, Coverage
16. Handoff             /design-handoff generate developer spec for everything above
```

**Track header:** `"Complete tour: all wings, all workflows (~40 min)"`

---

## Version Bump: v3.18.0

**stats.json:** version → 3.18.0 (roles/commands/knowledge_lines/reference_files unchanged)

**CHANGELOG entry:**
```
## v3.18.0 (2026-03-17)
### Changed
- /design-tutorial fully refreshed for v3.17.0 state: 46 commands, all wings represented
- Welcome screen updated: version badge, command count, 2 new wing rows (AI Visual Gen, Print/PDF)
- 2 new tutorial tracks: `ai-visual-gen` (3 exercises) and `print-pdf` (3 exercises)
- `full` track expanded: 12 → 16 steps, adding AI image, AI moodboard, print layout, PDF report exercises
- Step 4 command table refreshed: 26 → 46 commands organized across 12 wings
```

**Files changed:** `commands/design-tutorial.md`, `meta/stats.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `CHANGELOG.md`, `README.md`, `docs/plugin-directory-submission.md`, `MCP-SETUP.md`, `CONTRIBUTING.md`

---

## Out of Scope

- New evals for tutorial tracks (tutorial command is interactive by nature — not easily smoke-tested)
- Community contributions pipeline (Part B — separate spec)
- Any changes to existing tracks (quick-start, ui, figma, social, email, data-viz)
