---
description: "Review an existing design for quality — accessibility, usability, visual consistency, content, and motion. Accepts HTML files, Figma URLs, preview servers, or screenshots for visual AI critique. Every finding is written to naksha-review/findings.json, re-checked by a fresh verifier subagent, and schema-validated."
argument-hint: "[file path, URL, screenshot path, or 'current preview']"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Agent", "Task", "mcp__*"]
---

# /design-review

You are conducting a structured design quality audit. This is a review, not a redesign.

**Flow:** load constraints (Step 0) → open the coverage ledger (Step 0.5) → audit (Sections A and/or B) → record findings, verify them with a fresh subagent, and validate the file (Section C) → write the report. Only confirmed findings are presented as issues; unresolved ones are listed separately and rejected ones are counted.

## Target

Target: **$ARGUMENTS**

The user will provide one of:
- **A screenshot or image file** (`.png`, `.jpg`, `.gif`, `.webp`) → **Visual AI Critique Mode** (see Section A)
- **A Figma URL** (contains `figma.com`) → screenshot it, then run Visual AI Critique + code audit
- **An HTML file path** → read it and run Code-Level Audit (Section B)
- **A running preview server** → take a screenshot for Visual AI Critique, then inspect code
- **"current preview"** → inspect whatever is currently being previewed

**Dual-mode strategy**: When both a visual and code source are available (e.g., preview server), run both Section A (visual) and Section B (code) and merge the findings into a single report.

**MCP Fallback**: If Preview MCP tools are unavailable, read the HTML source and perform a static code-level audit. If Figma MCP is unavailable, ask the user for a screenshot or file export.

---

## Step 0: Load Project Constraints

Search up to 3 directory levels for `.naksha/project.json`. If found, extract **v5 fields** to use as audit criteria throughout this review:

- `constraints.grid` → the expected base spacing unit. Flag any spacing value in the design that is NOT a multiple of this unit (e.g., if grid is `"8px"`, flag `13px`, `22px`, `7px` margins).
- `constraints.dark_mode` → if `false` and the design includes dark mode styles (`prefers-color-scheme: dark`, `[data-theme="dark"]`, etc.), flag as **constraint violation**: "Dark mode was explicitly ruled out."
- `constraints.breakpoints` → the expected responsive breakpoints. Flag missing breakpoints or breakpoints at unexpected values.
- `constraints.max_content_width` → if any layout container exceeds this value, flag it.
- `constraints.accessibility_target` → sets the required contrast threshold. `"WCAG AAA"` requires 7:1; `"WCAG AA"` requires 4.5:1. Use instead of the default 4.5:1 if `"WCAG AAA"` is set.
- `constraints.out_of_scope` → if the design implements something in this list (e.g., dark mode was out-of-scope but is present), flag as a scope violation.
- `constraints.notes` → treat each note as an expected design rule. Check for violations.
- `component_patterns` → for any component named in this list, check whether the implementation matches the recorded pattern (background, border, radius, padding, etc.). Flag mismatches as **pattern deviation**.
- `browser_findings` (5 most recent) → use as reference context — these are research findings or prior visual captures. Reference them when relevant but do not penalize for deviating from external sites.

**If constraints are loaded**, add a **Constraint Compliance** section to the report (see Report Format below) that lists each constraint and whether it passes or fails.

**If no project memory found**: run the review without constraint context — this is fine, no message needed.

---

## Step 0.5: Open the Coverage Ledger

Before auditing, list the nine review dimensions and decide for each one whether you will check it or skip it. The ledger drives the audit: tick each dimension as the sections below cover it, and do not write the report until every dimension is either **checked** or **skipped with a reason**. It becomes the `coverage` block of `naksha-review/findings.json` (Section C).

| Dimension | What counts as checking it |
|-----------|----------------------------|
| `accessibility` | WCAG checks: contrast against the threshold, alt text, semantics and landmarks, ARIA, keyboard order, touch targets |
| `visual_hierarchy` | Section A principles 1, 2, 5 and 6 (hierarchy, alignment, proximity, balance) and the anti-pattern check |
| `typography` | Type scale, line length, line height, weight use |
| `color` | Palette discipline, semantic color use, surface layers, brand color use |
| `spacing` | Spacing values against the grid (`constraints.grid` if set), rhythm between sections |
| `content` | Section B4: labels, error messages, placeholder text, tone |
| `interaction_states` | Focus, hover, active, disabled, loading and error states; feedback and error-prevention heuristics; Section B5 motion |
| `responsive` | Viewport meta, breakpoints, a second viewport, `constraints.breakpoints` and `max_content_width` |
| `tokens` | Hardcoded values that should be tokens, `component_patterns` deviations |

Typical skips: a single screenshot cannot show `interaction_states` or `tokens` ("no source code"); one viewport cannot show `responsive` behavior unless the source has media queries you can read. Write the real reason, not "N/A".

---

## Section A: Visual AI Critique (Screenshot / Vision Mode)

Use this section when the input is an image file, a Figma URL, or a captured preview screenshot.

### How to obtain the image

- **Image file provided**: Read it directly using the Read tool (Claude is multimodal — it can analyze images)
- **Figma URL**: Call `figma_get_component_image` or `figma_take_screenshot` to export the frame
- **Preview server**: Call `preview_screenshot` to capture the current state
- **"current preview"**: Call `preview_screenshot`

**Live Website URL (non-Figma):**
If `$ARGUMENTS` contains a URL that is NOT a Figma URL (doesn't contain `figma.com`):
1. Use `mcp__plugin_playwright_playwright__browser_resize` to set viewport to 1440×900
2. Use `mcp__plugin_playwright_playwright__browser_navigate` to load the URL
3. Use `mcp__plugin_playwright_playwright__browser_take_screenshot` to capture the current view
4. Resize to 390×844 and take a second screenshot for mobile view
5. Proceed with visual analysis using both screenshots as the design to review
6. Note at top of output: "Captured from live URL: {url}"

MCP Fallback: If Playwright is unavailable, ask the user to provide a screenshot file path.

### Visual Design Principles Scoring

Analyze the screenshot against the following 6 principles. Score each 0–10.

#### 1. Visual Hierarchy (0–10)
Evaluate how clearly the design communicates importance through size, weight, color, and contrast.

**What to check:**
- Is there a clear primary focal point? Can you identify the most important element within 3 seconds?
- Size contrast: Does the headline dominate the body text by a ratio of at least 1.5x?
- Weight contrast: Is bold/semibold used purposefully, not uniformly?
- Color: Are accent colors reserved for actions and key information, not decorative use?
- Whitespace: Is there breathing room around important elements, or does the layout feel cluttered?

**Scoring rubric:**
- 9–10: Immediate clear hierarchy; eye moves naturally through the layout
- 7–8: Good hierarchy with minor ambiguities
- 5–6: Some hierarchy but competing visual weights
- 3–4: Flat, hard to determine what matters most
- 0–2: No clear hierarchy; everything fights for attention

#### 2. Alignment & Grid (0–10)
Evaluate the internal consistency and spatial organization.

**What to check:**
- Do elements share invisible alignment lines? (Left edges, center axes, right edges)
- Is there a visible grid or column structure? Do elements snap to it?
- Are margins/gutters consistent throughout?
- Are related elements grouped with consistent spacing; unrelated elements separated?
- Do text baselines align across columns?

**Scoring rubric:**
- 9–10: Tight grid, all elements clearly aligned
- 7–8: Mostly aligned, 1–2 minor inconsistencies
- 5–6: Some alignment but noticeable arbitrary positioning
- 3–4: Misaligned elements, inconsistent margins
- 0–2: No visible grid discipline

#### 3. Color & Contrast (0–10)
Evaluate color usage, contrast ratios, and palette discipline.

**What to check:**
- Text-to-background contrast: body text should achieve ≥4.5:1, large text ≥3:1 (WCAG AA)
- Is the color palette limited and purposeful? (3–5 colors + neutrals is ideal)
- Are semantic colors used correctly? (red = error, green = success, not decorative)
- Is there a consistent use of surface colors (background layers)?
- Does the palette have enough contrast between the primary action color and background?

**Scoring rubric:**
- 9–10: Clear accessible palette, strong contrast, semantic color use
- 7–8: Good palette with 1 minor contrast issue
- 5–6: Palette issues or borderline contrast ratios
- 3–4: Multiple low-contrast combinations or inconsistent colors
- 0–2: Inaccessible contrast, arbitrary color use

#### 4. Typography (0–10)
Evaluate type scale, readability, and consistency.

**What to check:**
- Line length: body text should be 45–75 characters per line (not too narrow or too wide)
- Line height: body text 1.5–1.6, headings 1.1–1.3
- Type scale: is there a clear size progression? (no 3 sizes that look nearly the same)
- Font weight: are weights used purposefully? (thin body + heavy heading, not thin + thin)
- Letter spacing: not too tight (below -0.03em) or too loose for body text
- Consistency: same text elements use the same styles throughout

**Scoring rubric:**
- 9–10: Clear readable type system with good scale contrast
- 7–8: Good typography, 1 minor issue
- 5–6: Some readability concerns or inconsistency
- 3–4: Multiple readability problems
- 0–2: Hard to read, no type system discipline

#### 5. Proximity & Grouping (0–10)
Evaluate whether related items are visually grouped and unrelated items separated (Gestalt proximity principle).

**What to check:**
- Does the spacing between related items feel tighter than spacing between unrelated groups?
- Are form fields and their labels close together?
- Are action buttons placed near the content they act on?
- Do card components have internal spacing that feels different from inter-card spacing?
- Would a new user understand what belongs together by looking at the layout?

**Scoring rubric:**
- 9–10: Clear grouping, intuitive spatial relationships
- 7–8: Mostly clear, 1–2 ambiguous groupings
- 5–6: Some grouping issues causing confusion
- 3–4: Related items not clearly grouped
- 0–2: Random spatial layout, no grouping logic

#### 6. Balance & Composition (0–10)
Evaluate the overall visual weight distribution and aesthetic balance.

**What to check:**
- Is the layout balanced? (left-right, top-bottom visual weight)
- For asymmetric layouts: is the imbalance intentional and compositionally effective?
- Are there large empty areas that create tension without purpose?
- Does the layout feel complete, or are there "holes" that seem accidental?
- Is there a center of visual gravity that grounds the composition?

**Scoring rubric:**
- 9–10: Well-composed, balanced, intentional
- 7–8: Good balance, minor tension
- 5–6: Some imbalance or awkward voids
- 3–4: Clear imbalance or visual chaos
- 0–2: No compositional intent visible

### Visual Score Calculation

```
Visual Score = (Hierarchy + Alignment + Color + Typography + Proximity + Balance) / 6
```

Convert to letter grade:
- 90–100: A — Production-ready visual quality
- 80–89: B — Minor refinements needed
- 70–79: C — Several improvements needed
- 60–69: D — Significant issues
- Below 60: F — Major redesign recommended

### Pattern Library Check (Visual)

From the screenshot, identify patterns that suggest common design anti-patterns:

| Anti-pattern | Visual signal | Recommendation |
|-------------|--------------|----------------|
| Wall of text | Dense text blocks with no visual breaks | Add subheadings, bullets, or card boundaries |
| Button soup | Multiple CTAs competing at same visual weight | Use hierarchy: one primary, one secondary, rest as links |
| Card avalanche | Grid of identical cards with no visual variety | Add featured/hero card or vary layout rhythm |
| Icon ambiguity | Icons without labels | Add text labels or tooltips |
| Form intimidation | Long vertical form with no grouping | Group fields into sections with progress |
| Modal overdependence | Frequent interrupting overlays | Consider inline disclosure or new page |
| Hover-only state | Interactions not discoverable | Add subtle affordance (border, shadow, arrow) |

---

## Section B: Code-Level Audit

Use this section when the input is an HTML file, a preview server, or alongside Section A when both are available.

### 1. Accessibility Audit
Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/ux-researcher.md` — focus on the WCAG AA Checklist section.
- Check color contrast ratios using preview_inspect on text elements
- Test keyboard navigation with preview_eval (Tab key order)
- Verify semantic HTML (headings, landmarks, buttons vs divs)
- Check ARIA labels on interactive elements
- Verify touch targets are at least 44x44px

### 2. Usability Heuristic Review
Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/ux-researcher.md` — apply Nielsen's 10 heuristics.
- System status visibility (loading states, feedback)
- User control and freedom (back, undo, cancel)
- Error prevention (validation, confirmation on destructive actions)
- Consistency (same action = same visual treatment)
- Recognition over recall (visible options, labeled icons)

### 3. Visual Consistency
Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/design-system-lead.md` — use the Consistency Review Checklist.
- Sample colors, spacing, font sizes with preview_inspect
- Flag hardcoded values that should be tokens
- Check spacing consistency (no arbitrary values like 7px, 13px)
- Verify border-radius, shadow, and elevation consistency

### 4. Content Review
Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/content-designer.md` — use the Content QA Checklist.
- Button labels describe their action (not "Submit" or "Click here")
- Error messages include what happened + how to fix it
- No placeholder text remaining
- Consistent tone and terminology

### 5. Motion Review
Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/motion-designer.md` — use the Motion QA Checklist.
- Animations have clear purpose (not decorative)
- Timing follows guidelines (100-150ms micro, 200-300ms standard, 300-500ms page)
- Easing functions are appropriate (ease-out for entrances, ease-in for exits)
- Check prefers-reduced-motion support

---

## Section C: Record, Verify, and Validate Findings

Run this after Sections A/B and before writing the report. A finding the reviewer only claims is a hypothesis; the report presents what an independent check could reproduce. The format is defined in `${CLAUDE_PLUGIN_ROOT}/schemas/design-findings.schema.json` and explained in `${CLAUDE_PLUGIN_ROOT}/docs/design-findings.md`.

### C1. Write `naksha-review/findings.json`

Create `naksha-review/` in the project root and write `findings.json` (replace any file from a previous run). Record one finding per distinct problem; in Dual Mode, merge the visual and code observations of the same problem into one finding.

```json
{
  "schema_version": "1.0",
  "target": { "kind": "file", "location": "src/landing.html", "viewports": ["1440x900", "390x844"] },
  "generated_at": "2026-10-18T09:30:00Z",
  "generator": "/design-review",
  "coverage": {
    "accessibility": { "status": "checked", "notes": "contrast on 9 text pairs, tab order, landmarks" },
    "tokens": { "status": "skipped", "reason": "No stylesheet in scope; inline styles only" }
  },
  "verification": { "mode": "not-run" },
  "findings": [
    {
      "id": "F-001",
      "dimension": "accessibility",
      "severity": "major",
      "title": "Card body text #777 on white fails AA contrast",
      "criterion": "WCAG 1.4.3 Contrast (Minimum)",
      "evidence": {
        "locator": ".card p",
        "file": "src/landing.html",
        "line": 43,
        "measurement": { "metric": "contrast-ratio", "value": 4.48, "threshold": 4.5, "method": "WCAG relative luminance, #777777 on #ffffff, 14px regular" }
      },
      "recommendation": "Darken to #6b6b6b and re-check it reaches 4.5:1.",
      "owner_role": "UI Designer",
      "verdict": "needs_validation",
      "verification": { "reproduced": false, "note": "Pending independent verification." }
    }
  ]
}
```

(The `coverage` block above is abbreviated; the real file lists all nine dimensions from the ledger.)

Constraint violations from Step 0 are findings too (usually `spacing`, `tokens` or `responsive`); in the Constraint Compliance table, cite their ids.

Rules for each finding:
- **id**: `F-001`, `F-002`, … in the order found.
- **severity**: `critical` blocks a task or fails WCAG A/AA on a primary path; `major` is a clear defect a user will notice; `minor` is polish.
- **evidence** must let a stranger re-check the claim without your reasoning. Always give a `locator` (CSS selector, `file:line`, Figma node id, or screen region). For code, add `file` and `line`. For any numeric claim (contrast, size, touch target, line length, spacing) add a `measurement` with its `method`. Quote source or copy in `snippet`. Never put a number in `measurement` that came from a code comment or a guess; if you read it off a screenshot, say so in `method`. For screenshots, Figma frames and live pages, save the capture under `naksha-review/` and cite it in `evidence.screenshot` so the verifier sees the same pixels.
- **dimension** must be one the ledger marks `checked`. File WCAG contrast failures under `accessibility`; keep `color` for palette and semantic-color issues.
- **owner_role** must be a role name from `${CLAUDE_PLUGIN_ROOT}/adapters/roles.json`. Defaults: `accessibility` → UX Researcher · `visual_hierarchy`, `typography`, `color`, `responsive` → UI Designer · `spacing`, `tokens` → Design System Lead · `content` → Content Designer · `interaction_states` → UX Designer (Motion Designer for animation). Use Framework Specialist for framework-specific responsive fixes and Compliance Designer for legal or consent issues.
- Write every finding as `"verdict": "needs_validation"` with `"verification": { "reproduced": false, "note": "Pending independent verification." }`, and set the top-level `"verification": { "mode": "not-run" }`. The reviewer never marks its own findings confirmed or rejected.

### C2. Verify each finding with a fresh subagent

The reviewer is the worst judge of its own findings, so a verifier that has not seen your reasoning tries to disprove each one.

1. Use the Agent tool (named Task in older Claude Code versions) with a general-purpose subagent. Launch one verifier per finding, in parallel. With more than 10 findings, give each verifier up to 5 findings from the same dimension and tell it to judge each one on its own.
2. Give each verifier **only**: the target (`kind`, `location`, `viewports`), the contrast threshold in force (4.5:1, or 7:1 when `constraints.accessibility_target` is WCAG AAA), and the finding's `id`, `dimension`, `severity`, `title`, `criterion` and `evidence`. Do **not** pass the recommendation, the scores, other findings, or your own reasoning, and do not say which verdict you expect.
3. Use this prompt, filling in the brackets:

```
You are an independent design-review verifier. Your job is to try to DISPROVE
the finding below by re-checking the target yourself. Do not trust the
finding's numbers or line references: re-derive them from the target.

Target: [kind] [location] (viewports: [viewports])
Contrast threshold: [4.5:1 normal text, 3:1 large text (>= 24px, or >= 18.66px bold) | 7:1 / 4.5:1 for AAA]
Finding: [JSON of id, dimension, severity, title, criterion, evidence]

Checks, as they apply:
- Locator: confirm the selector, element or node exists (Grep the source; in a
  browser, count document.querySelectorAll(selector)). Read the cited line and
  confirm the snippet is there.
- Contrast: resolve the real foreground and background. Follow the cascade and
  inheritance, take the nearest ancestor background, and composite any alpha
  over it. Recompute the ratio with the command below and compare it to the
  threshold for the element's actual size and weight.
- "Missing" claims (alt, label, lang, focus style, reduced motion): search the
  whole target, including linked stylesheets, for an alternative that satisfies
  the requirement (alt="", aria-label, aria-labelledby, a wrapping <label>,
  :focus-visible, box-shadow focus rings, a prefers-reduced-motion block).
- Sizes (touch targets, font sizes, line length, spacing): recompute from the
  CSS (content + padding + border) or measure getBoundingClientRect() in a
  browser. Check the value against the grid or threshold the finding cites.
- Responsive claims: check the viewport meta and media queries; at 390px wide,
  check document.documentElement.scrollWidth > clientWidth for overflow.
- Subjective claims (hierarchy, balance, tone): look for a measurable part you
  can re-check (e.g. heading-to-body size ratio). If none exists, do not guess.

Contrast command (opaque hex colors):
node -e 'const L=h=>{h=h.replace("#","");if(h.length===3)h=[...h].map(c=>c+c).join("");return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4).reduce((s,c,i)=>s+c*[0.2126,0.7152,0.0722][i],0)};const [a,b]=process.argv.slice(1).map(L);console.log(((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)).toFixed(2))' '#777777' '#ffffff'

Verdict:
- confirmed: you reproduced the evidence yourself and it breaks the stated threshold or rule.
- rejected: you have concrete counter-evidence: the locator does not exist,
  the re-measured value passes, or an alternative already satisfies the requirement.
- needs_validation: you could neither reproduce nor disprove it (subjective,
  needs runtime state, user testing, or a tool you do not have).

Reply with JSON only:
{"id": "...", "verdict": "...", "reproduced": true|false,
 "remeasured": <number or string, omit if you did not measure>,
 "note": "<what you re-checked, the values you found, and why that gives this verdict>"}
```

4. Apply each reply to `findings.json`: set `verdict`, and set `verification` to `reproduced`, `note`, and `remeasured` when given. `reproduced` must be `true` for confirmed and `false` for rejected. If the verifier confirmed with a different value (e.g. 4.31:1, not 4.48:1), update `evidence.measurement.value` to its value and say so in the note. Then set the top-level `"verification": { "mode": "isolated-subagent", "completed_at": "<now>" }`.
5. Do not overrule a verdict yourself. If you have evidence the verifier lacked (for example a computed style from the browser), you may run one more fresh verifier with that evidence added to `evidence`; its verdict stands.

**Fallback — no subagent tool:** do the verification yourself as a separate pass. Re-read the target from disk or re-capture it (do not work from memory), apply the same checks and verdict rules to each finding, set `"mode": "same-context"`, and say in the report that verification was not independent.

### C3. Validate the file

Run the validator with Bash:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-findings.js" naksha-review/findings.json --json
```

- **Exit 0**: valid. Use its `summary` counts for the report header.
- **Exit 1**: each error gives a JSON path and the problem (unknown role name, a skipped dimension that has findings, a confirmed finding with `reproduced: false`, a missing field). Fix the file and run again, up to 3 rounds. Fix the data, never the outcome: do not delete findings or change verdicts to make the file pass. If it still fails after 3 rounds, list the remaining errors in the report.
- **Exit 2**: the validator could not run (Node missing, plugin files missing). Say "findings.json not validated" in the report and continue.

Only describe the file as validated after an exit 0.

---

## Report Format

Build the report from the verified `findings.json`, not from your first-pass notes:
- Open with one line: `**Findings**: N raised · C confirmed · V need validation · R rejected · naksha-review/findings.json (schema-valid)`, then `**Verification**: isolated subagent` (or `same context`, if the fallback ran).
- The issue sections (Critical, Improvements, Minor) list **confirmed** findings only, each prefixed with its id, e.g. `[F-003]`.
- **Needs validation** findings go in their own section after the confirmed issues, each with the verifier's note on what would settle it.
- **Rejected** findings are not listed; state how many were rejected and that the details are in `findings.json`.
- Compute scores from confirmed and needs-validation findings; rejected findings do not lower any score.
- List skipped dimensions and their reasons under **Not Reviewed**.

### When running Visual AI Critique (Section A)

```
## Visual Design Review

Screenshot: [filename or source]
**Findings**: N raised · C confirmed · V need validation · R rejected · naksha-review/findings.json (schema-valid)
**Verification**: isolated subagent

### Scores

| Principle | Score | Grade |
|-----------|-------|-------|
| Visual Hierarchy | X/10 | |
| Alignment & Grid | X/10 | |
| Color & Contrast | X/10 | |
| Typography | X/10 | |
| Proximity & Grouping | X/10 | |
| Balance & Composition | X/10 | |
| **Overall Visual** | **X/10** | **[Letter]** |

### Critical Issues (must fix)
[F-00x] [Confirmed critical issue + evidence + why + specific fix]

### Improvements (should fix)
[F-00x] [Confirmed major/minor issue + evidence + why + specific fix]

### Needs Validation
[F-00x] [Issue + what the verifier could not settle + how to settle it]

### Rejected by Verification
R finding(s) were disproved by an independent re-check and are excluded from this report and its scores. Details: naksha-review/findings.json

### Anti-patterns Detected
[Pattern name + location + recommendation]

### Working Well
[Positive observations — always include at least 3]

### Not Reviewed
[Skipped dimension — reason]

### Constraint Compliance (only if project constraints loaded)
| Constraint | Expected | Status |
|------------|----------|--------|
| grid | 8px multiples | ✅ PASS / ❌ FAIL — [specific violation] |
| dark_mode | false | ✅ PASS / ❌ FAIL — "dark mode styles found in …" |
| [etc.] | | |
```

### When running Code-Level Audit (Section B)

```
## Code Quality Review

**Overall Score**: X/100 (grade letter)
**Findings**: N raised · C confirmed · V need validation · R rejected · naksha-review/findings.json (schema-valid)
**Verification**: isolated subagent

**Critical Issues** (must fix before shipping)
- [F-00x] Issue, evidence (selector/line/measurement), why it matters, code fix

**Improvements** (should fix)
- [F-00x] Issue, evidence, why it matters, code fix

**Minor** (nice to have)
- [F-00x] Issue, suggestion

**Needs Validation**
- [F-00x] Issue, what the verifier could not settle, how to settle it

**Rejected by Verification**: R finding(s) disproved by an independent re-check; excluded from the lists and score (see naksha-review/findings.json)

**Working Well**
- What the design does right

**Not Reviewed**
- Skipped dimension — reason
```

### When running both (Dual Mode)

Merge into a unified report: show both Visual (X/10 per principle) and Code (X/100 overall) scores, then consolidate confirmed issues by severity across both audit types, followed by one Needs Validation section and the rejected count. Avoid repeating the same issue in both sections; it is one finding in `findings.json`.

---

## What's Next

After a design review, suggest follow-up actions based on findings:
- `/design` — redesign specific areas that scored poorly
- `/design-system` — create tokens if the review found hardcoded values
- `/figma-sync` — check if Figma designs match the reviewed code
- `/figma-component-library` — build a proper component library if the review found inconsistency
