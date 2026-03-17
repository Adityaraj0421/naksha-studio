# Tutorial Mode Full Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh `/design-tutorial` from stale v2.9.0/26-command state to current v3.17.0/46-command state, adding 2 new tracks and expanding the `full` track from 12 to 16 steps.

**Architecture:** Single-file edit of `commands/design-tutorial.md` in 5 sequential sections (welcome screen → ai-visual-gen track → print-pdf track → command table → full track), followed by the standard 8-file version bump to v3.18.0.

**Tech Stack:** Markdown only. No new scripts, no new fixtures, no code changes. Verification is a line-count sanity check + manual diff review.

**Spec:** `docs/superpowers/specs/2026-03-17-tutorial-refresh-design.md`

---

## Chunk 1: Update commands/design-tutorial.md

### Task 1: Update Welcome Screen Header and Command Overview

**Files:**
- Modify: `commands/design-tutorial.md` (lines 51–80, welcome screen block)

- [ ] **Step 1: Update version badge in the welcome screen header**

Find in `commands/design-tutorial.md`:
```
║                         v2.9.0 · 26 commands                    ║
```
Replace with:
```
║                         v3.18.0 · 46 commands                   ║
```

- [ ] **Step 2: Add 2 new wing rows to the command overview table**

Find the command overview block (the `━━━ What it can do ━━━` section). After the last existing row:
```
  Templates                /design-template (10 production-ready layouts)
```
Add:
```
  AI Visual Gen            /gen-image /gen-video /gen-audio /gen-moodboard /prompt-refine
  Print / PDF              /pdf-report /print-layout /print-audit
```

- [ ] **Step 3: Update the track menu — insert 2 new tracks and renumber `full`**

Find:
```
  7. full         30 min  Complete tour: all wings, all workflows (~30 min)
```
Replace with:
```
  7. ai-visual-gen  15 min  Generate images, video briefs, audio specs, moodboards
  8. print-pdf      15 min  Build a print layout, PDF report, preflight audit
  9. full           40 min  Complete tour: all wings, all workflows (~40 min)
```

- [ ] **Step 4: Verify welcome screen changes look correct**

Run:
```bash
grep -n "commands\|full\|ai-visual\|print-pdf" commands/design-tutorial.md | head -20
```
Expected: lines showing "46 commands", "ai-visual-gen", "print-pdf", and "full" with updated timing.

- [ ] **Step 5: Commit**

```bash
git add commands/design-tutorial.md
git commit -m "feat(tutorial): update welcome screen to v3.18.0 state — 46 commands, 2 new wing rows, 9 tracks"
```

---

### Task 2: Add ai-visual-gen Track

**Files:**
- Modify: `commands/design-tutorial.md` (insert after `### TRACK: data-viz` block, before `### TRACK: full`)

- [ ] **Step 1: Insert the ai-visual-gen track block**

Find the line:
```
### TRACK: full
```
Insert the following block immediately before it:

```markdown
### TRACK: ai-visual-gen

**Goal:** Generate an image prompt → produce a video brief → build a moodboard.

---

**Exercise 1 of 3 — Generate an Image**

Run this command now:

```
/gen-image hero illustration for a SaaS landing page: abstract, minimal, blue palette
```

> **What to watch for:** The AI Image Director produces a structured prompt optimized for Midjourney/DALL-E/Firefly — negative prompts, aspect ratio, style references, and seed suggestions. Output is a ready-to-paste generation prompt, not a generic description.

Once you see the output, continue to Exercise 2.

---

**Exercise 2 of 3 — Write a Video Brief**

Run:

```
/gen-video 15-second product launch teaser. Tone: confident, modern. No voiceover.
```

> **What to watch for:** The AI Video Director outputs a shot-by-shot brief with scene timing, motion direction, music mood, and color grading notes — everything a motion designer needs without a briefing call.

---

**Exercise 3 of 3 — Build a Moodboard**

Run:

```
/gen-moodboard brand moodboard for the SaaS product above. Style: clean tech, trustworthy.
```

> **What to watch for:** The moodboard command assembles visual direction references — typography pairings, color story, photography style, UI texture — as a structured brief you can drop into Figma or hand to a visual designer.

---

**AI Visual Gen track complete.** You've seen:
- `/gen-image` → structured generation prompt optimized for AI tools
- `/gen-video` → shot-by-shot motion brief
- `/gen-moodboard` → brand visual direction brief

**Suggested next tracks:**
- `/design-tutorial print-pdf` for the print/PDF pipeline
- `/design-tutorial full` for the complete tour

---
```

- [ ] **Step 2: Verify track was inserted correctly**

Run:
```bash
grep -n "TRACK: ai-visual-gen\|TRACK: full\|TRACK: data-viz" commands/design-tutorial.md
```
Expected: `ai-visual-gen` appears between `data-viz` and `full`.

- [ ] **Step 3: Commit**

```bash
git add commands/design-tutorial.md
git commit -m "feat(tutorial): add ai-visual-gen track — gen-image, gen-video, gen-moodboard exercises"
```

---

### Task 3: Add print-pdf Track

> **⚠️ Sequential dependency:** This task must run after Task 2 has fully completed. The `ai-visual-gen` block must already exist in the file so that `### TRACK: full` remains the unique insertion anchor below the two new tracks.

**Files:**
- Modify: `commands/design-tutorial.md` (insert after `### TRACK: ai-visual-gen` block, before `### TRACK: full`)

- [ ] **Step 1: Insert the print-pdf track block**

Find the line:
```
### TRACK: full
```
Insert the following block immediately before it (after the ai-visual-gen track):

```markdown
### TRACK: print-pdf

**Goal:** Design a print layout → generate a multi-page PDF report → run a preflight audit.

---

**Exercise 1 of 3 — Create a Print Layout**

Run this command now:

```
/print-layout business card for Naksha — name: Alex Rivera, title: Design Lead. Minimal style.
```

> **What to watch for:** The Print Designer applies bleed/trim/safe-zone geometry, CMYK color documentation, and CSS Paged Media rules. Output is production-ready CSS you can send straight to a print vendor.

Once you see the output, continue to Exercise 2.

---

**Exercise 2 of 3 — Generate a PDF Report**

Run:

```
/pdf-report quarterly design system status report. Sections: Executive Summary, Token Changes, Component Updates, Accessibility Score.
```

> **What to watch for:** Multi-page layout with `@page` rules, named pages, running headers/footers, TOC, and widows/orphans control. The kind of report that usually requires InDesign — generated in one command.

---

**Exercise 3 of 3 — Run a Preflight Audit**

Take the business card CSS from Exercise 1 and run:

```
/print-audit [paste the business card CSS from Exercise 1]
```

> **What to watch for:** Two-phase audit — Phase 1 always runs (bleed geometry, CMYK values, font embedding, page-break rules). Phase 2 runs if brand context is provided. Output is a scored preflight checklist with specific fixes.

---

**Print / PDF track complete.** You've seen:
- `/print-layout` → production-ready CSS with bleed, CMYK, and CSS Paged Media
- `/pdf-report` → multi-page report with `@page` rules, TOC, and running headers
- `/print-audit` → two-phase preflight audit

**Suggested next:**
- `/design-tutorial full` for the complete tour

---
```

- [ ] **Step 2: Verify track was inserted correctly**

Run:
```bash
grep -n "TRACK: print-pdf\|TRACK: ai-visual-gen\|TRACK: full" commands/design-tutorial.md
```
Expected: order is `ai-visual-gen` → `print-pdf` → `full`.

- [ ] **Step 3: Commit**

```bash
git add commands/design-tutorial.md
git commit -m "feat(tutorial): add print-pdf track — print-layout, pdf-report, print-audit exercises"
```

---

### Task 4: Refresh Step 4 Command Table

**Files:**
- Modify: `commands/design-tutorial.md` (Step 4 "Explore more" section)

- [ ] **Step 1: Replace the stale command table**

Find the block that begins:
```
  All 26 commands:
```
Replace the entire command table (from `All 26 commands:` through the last wing row) with:

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

- [ ] **Step 2: Verify command count in table**

Run:
```bash
grep -o "/[a-z-]*" commands/design-tutorial.md | sort -u | wc -l
```
This counts unique slash command references in the file. Should be ≥ 46 (some commands appear in both tracks and the table).

- [ ] **Step 3: Update the inline "Run /design-tutorial" footer to mention new tracks**

Find:
```
  Run /design-tutorial <track> to explore another wing.
```
Replace with:
```
  Run /design-tutorial <track> to explore another wing.
  Tracks: quick-start · ui · figma · social · email · data-viz · ai-visual-gen · print-pdf · full
```

- [ ] **Step 4: Commit**

```bash
git add commands/design-tutorial.md
git commit -m "feat(tutorial): refresh Step 4 command table — 26 → 46 commands across 12 wings"
```

---

### Task 5: Expand `full` Track (12 → 16 Steps)

**Files:**
- Modify: `commands/design-tutorial.md` (`### TRACK: full` section)

- [ ] **Step 1: Update the `full` track header**

Find:
```
**Goal:** Complete tour of all 8 design wings.
```
Replace with:
```
**Goal:** Complete tour of all design wings — UI, Figma, Social, AI Visual Gen, Email, Data Viz, Print/PDF, and Handoff.
```

- [ ] **Step 2: Insert 2 AI Visual Gen steps (steps 9–10) after the Social step, and renumber displaced steps**

The current step 8 is:
```
8. **Social** → `/social-content Instagram Story: launch announcement for the product above`
```
After that line, insert:
```
9. **★ AI Image** → `/gen-image hero illustration for the product above. Style: minimal, abstract, blue palette`
10. **★ AI Moodboard** → `/gen-moodboard brand visual direction for the product above. Tone: trustworthy, modern`
```

Then apply these 4 find/replace operations in order to renumber the displaced steps (old 9–12 → 11–14). At this point Handoff becomes 14 (not 16 — that happens after Step 3 inserts two more items):

Find: `9. **Email**`  → Replace: `11. **Email**`
Find: `10. **Data Viz**`  → Replace: `12. **Data Viz**`
Find: `11. **Dashboard**`  → Replace: `13. **Dashboard**`
Find: `12. **Handoff**`  → Replace: `14. **Handoff**`

- [ ] **Step 3: Insert 2 Print/PDF steps (steps 14–15) after the Dashboard step**

> **⚠️ Sequential dependency:** This step must run after Step 2 has completed. The find target `13. **Dashboard**` only exists after Step 2's renumbering.

After:
```
13. **Dashboard** → `/dashboard-layout growth dashboard: signups KPI, revenue KPI, activation rate, chart area`
```
Insert:
```
14. **★ Print Layout** → `/print-layout business card with the brand kit above. Name: Alex Rivera, Design Lead`
15. **★ PDF Report** → `/pdf-report design system status report. Sections: Summary, Token Changes, Component Coverage`
```
Then rename the current `14. **Handoff**` → `16. **Handoff**`:

Find: `14. **Handoff**`  → Replace: `16. **Handoff**`

- [ ] **Step 4: Verify the full track now has exactly 16 numbered steps**

Run:
```bash
awk '/### TRACK: full/,/### Task|## Step 4/' commands/design-tutorial.md | grep -E "^[0-9]+\." | wc -l
```
Expected output: `16`

- [ ] **Step 5: Update the `full` track description line**

In the track menu (welcome screen, already updated in Task 1), the timing was already updated to `~40 min`. Confirm the `full` track's inline goal comment also reads `~40 min` if present.

Run:
```bash
grep "30 min\|40 min" commands/design-tutorial.md
```
Expected: no remaining `30 min` references for the `full` track.

- [ ] **Step 6: Commit**

```bash
git add commands/design-tutorial.md
git commit -m "feat(tutorial): expand full track 12 → 16 steps — add AI image, AI moodboard, print layout, PDF report"
```

---

### Task 6: Final Sanity Check on design-tutorial.md

- [ ] **Step 1: Check total line count grew appropriately**

Run:
```bash
wc -l commands/design-tutorial.md
```
Expected: original was ~400 lines; new file should be ~550–600 lines (2 new tracks ~80 lines each + 4 new full steps ~20 lines + table expansion ~30 lines).

- [ ] **Step 2: Confirm no stale "26 commands" or "v2.9.0" references remain**

Run:
```bash
grep -n "26 commands\|v2\.9\.0\|2\.9\.0\|30 min" commands/design-tutorial.md
```
Expected: no output (zero matches).

- [ ] **Step 3: Confirm all 9 tracks are present**

Run:
```bash
grep "### TRACK:" commands/design-tutorial.md
```
Expected:
```
### TRACK: quick-start
### TRACK: ui
### TRACK: figma
### TRACK: social
### TRACK: email
### TRACK: data-viz
### TRACK: ai-visual-gen
### TRACK: print-pdf
### TRACK: full
```

---

## Chunk 2: Version Bump to v3.18.0

### Task 7: Bump All Version Files

**Files:**
- Modify: `meta/stats.json`
- Modify: `.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `docs/plugin-directory-submission.md`
- Modify: `MCP-SETUP.md`
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Bump meta/stats.json**

Replace the entire file content with:
```json
{"version":"3.18.0","roles":23,"commands":46,"knowledge_lines":12545,"reference_files":29}
```

- [ ] **Step 2: Bump .claude-plugin/plugin.json version field**

Find: `"version": "3.17.0"`
Replace with: `"version": "3.18.0"`

- [ ] **Step 3: Bump .claude-plugin/marketplace.json version field**

Find: `"version": "3.17.0"`
Replace with: `"version": "3.18.0"`

- [ ] **Step 4: Prepend CHANGELOG entry**

After the `# Changelog` header and blank line, insert:

```markdown
## v3.18.0 (2026-03-17)
### Changed
- `/design-tutorial` fully refreshed for v3.17.0 state: 46 commands, all wings represented
- Welcome screen updated: version badge (v2.9.0 → v3.17.0), command count (26 → 46), 2 new wing rows (AI Visual Gen, Print/PDF)
- 2 new tutorial tracks: `ai-visual-gen` (3 exercises: gen-image, gen-video, gen-moodboard) and `print-pdf` (3 exercises: print-layout, pdf-report, print-audit)
- `full` track expanded: 12 → 16 steps, adding AI image, AI moodboard, print layout, PDF report exercises
- Step 4 command table refreshed: 26 → 46 commands organized across 12 wings
- Track list renumbered: `full` moves from 7 → 9 to accommodate the 2 new tracks

```

- [ ] **Step 5: Bump version references in README.md**

Run:
```bash
grep -n "3\.17\.0" README.md
```
Replace each `3.17.0` occurrence with `3.18.0`.

- [ ] **Step 6: Bump version in docs/plugin-directory-submission.md**

Run:
```bash
grep -n "3\.17\.0" docs/plugin-directory-submission.md
```
Replace each `3.17.0` occurrence with `3.18.0`.

- [ ] **Step 7: Bump version in MCP-SETUP.md**

Run:
```bash
grep -n "3\.17\.0" MCP-SETUP.md
```
Replace each `3.17.0` occurrence with `3.18.0`.

- [ ] **Step 8: Bump version in CONTRIBUTING.md**

Run:
```bash
grep -n "3\.17\.0" CONTRIBUTING.md
```
Replace each `3.17.0` occurrence with `3.18.0`.

- [ ] **Step 9: Verify all version files read 3.18.0**

Run:
```bash
grep -r "3\.17\.0" .claude-plugin/ meta/ README.md docs/plugin-directory-submission.md MCP-SETUP.md CONTRIBUTING.md CHANGELOG.md
```
Expected: no output (zero matches — all bumped to 3.18.0).

- [ ] **Step 10: Commit version bump**

```bash
git add meta/stats.json .claude-plugin/plugin.json .claude-plugin/marketplace.json CHANGELOG.md README.md docs/plugin-directory-submission.md MCP-SETUP.md CONTRIBUTING.md
git commit -m "chore: bump version to v3.18.0 — tutorial refresh release"
```

---

### Task 8: Create GitHub Release

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Create git tag**

```bash
git tag v3.18.0
git push origin v3.18.0
```

- [ ] **Step 3: Create GitHub release**

```bash
gh release create v3.18.0 \
  --title "v3.18.0 — Tutorial Mode Full Refresh" \
  --notes "## What's new

### /design-tutorial fully refreshed
The tutorial command was last updated at v2.9.0 with 26 commands. It now reflects the current v3.17.0 state.

**2 new tracks:**
- \`ai-visual-gen\` — Generate images, video briefs, and moodboards (3 exercises)
- \`print-pdf\` — Build print layouts, PDF reports, and run preflight audits (3 exercises)

**\`full\` track expanded:** 12 → 16 steps, now covering all wings including AI Visual Gen and Print/PDF

**Command table refreshed:** 26 → 46 commands organized across 12 wings

**Welcome screen updated:** version badge, command count, 2 new wing rows"
```

- [ ] **Step 4: Verify release published**

```bash
gh release view v3.18.0
```
Expected: shows release with title "v3.18.0 — Tutorial Mode Full Refresh".
