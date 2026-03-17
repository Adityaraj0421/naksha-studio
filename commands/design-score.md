---
description: "Quantitative 0–100 design quality score across Accessibility, Usability, Visual Quality, and Token Compliance."
argument-hint: "[url | file-path | nodeId | --screenshot <path>]"
allowed-tools: ["Read", "Glob", "Bash", "mcp__plugin_playwright_playwright__browser_navigate", "mcp__plugin_playwright_playwright__browser_take_screenshot", "mcp__plugin_playwright_playwright__browser_snapshot"]
---

# /design-score

Score a design across four dimensions: Accessibility (25pts), Usability (25pts), Visual Quality (25pts), Token Compliance (25pts). Total: 0–100.

## Scoring Model

Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/ux-researcher.md` — focus on "Nielsen's Heuristics" and "WCAG AA Checklist" sections before scoring.

Check for `.naksha/project.json` (search up to 3 directory levels). If found, read `brand.primary`, `brand.secondary`, `brand.font`, and `tokenFormat` for Token Compliance scoring context.

### Dimension 1: Accessibility (0–25 pts)

Score each criterion with partial credit proportional to how many elements pass:

| Criterion | Max | Score |
|-----------|-----|-------|
| Primary text contrast ≥ 4.5:1; large text ≥ 3:1 (WCAG SC 1.4.3) | 6 | |
| UI component contrast ≥ 3:1 — buttons, inputs, focus rings (SC 1.4.11) | 4 | |
| All interactive elements have visible focus state (SC 2.4.7) | 4 | |
| Touch targets ≥ 44×44px on mobile interactive elements (SC 2.5.5) | 4 | |
| No information conveyed by color alone (SC 1.4.1) | 4 | |
| Form inputs have programmatic labels, not placeholder-only (SC 1.3.1) | 3 | |

### Dimension 2: Usability (0–25 pts)

Score each of Nielsen's 10 heuristics 0–3:
- **3** = Pass: design consistently applies this principle
- **2** = Minor issue: mostly works, 1–2 friction points
- **1** = Major issue: frequent violations affecting most users
- **0** = Critical fail: heuristic is systematically violated

| # | Heuristic | Score (0–3) |
|---|-----------|------------|
| 1 | Visibility of system status | |
| 2 | Match between system and real world | |
| 3 | User control and freedom | |
| 4 | Consistency and standards | |
| 5 | Error prevention | |
| 6 | Recognition rather than recall | |
| 7 | Flexibility and efficiency of use | |
| 8 | Aesthetic and minimalist design | |
| 9 | Help users recognize, diagnose, and recover from errors | |
| 10 | Help and documentation | |

Usability score = `round((sum / 30) × 25)`

### Dimension 3: Visual Quality (0–25 pts)

Score each sub-criterion 0–5:
- **5** = Excellent: consistent, intentional, high craft
- **3–4** = Good: mostly consistent with minor lapses
- **1–2** = Weak: noticeable inconsistencies
- **0** = Poor: systematic problem

| Sub-criterion | Max | Score |
|---------------|-----|-------|
| Spacing consistency (8pt grid or consistent scale; no arbitrary values) | 5 | |
| Typography hierarchy (H1/H2/body visually distinct in size and weight) | 5 | |
| Color usage (limited palette, harmonious, brand-consistent) | 5 | |
| Whitespace and visual noise (breathing room; no clutter; clear focus) | 5 | |
| Primary action prominence (CTA clearly dominant over secondary actions) | 5 | |

### Dimension 4: Token Compliance (0–25 pts)

**If `.naksha/project.json` exists** (check `tokenFormat`, `brand.primary`, `brand.font`):

| Sub-criterion | Max | Score |
|---------------|-----|-------|
| Color values from token system — no raw hex/rgb/hsl | 5 | |
| Typography from token system — no hardcoded font-family or arbitrary px sizes | 5 | |
| Spacing from token system — values on 8pt scale (4/8/12/16/20/24/32/40/48/64px) | 5 | |
| Component variants consistent — same border-radius, padding across similar components | 5 | |
| Interactive states consistent — hover/focus/active applied uniformly | 5 | |

**If no project config:** Score visual consistency instead (same patterns used for same purposes throughout the design).

## Input Handling

**URL:** Use `browser_navigate` to load the page, `browser_snapshot` for DOM structure, `browser_take_screenshot` for visual analysis.

**Local file path (.html, .css):** Read the file directly.

**`--screenshot <path>`:** Read the image file. Score visually — note that some accessibility criteria require code inspection and will be marked "partial — code review needed".

**Figma node ID:** Use Figma MCP if available. Otherwise ask for a screenshot.

**MCP Fallback:** If Playwright is unavailable, ask for `--screenshot <path>` or a local HTML file.

## Output Format

```
╔══════════════════════════════════════════════════════════╗
║  Design Score                                            ║
╚══════════════════════════════════════════════════════════╝

  Overall:   [score]/100   [grade]

  Accessibility:       [n]/25  [bar]  [pct]%
  Usability:           [n]/25  [bar]  [pct]%
  Visual Quality:      [n]/25  [bar]  [pct]%
  Token Compliance:    [n]/25  [bar]  [pct]%

  Grade: [A/B/C/D/F] — [label]

━━━ Top Issues (Sorted by Impact) ━━━━━━━━━━━━━━━━━━━━━━━━

  🔴  [Critical] [Dimension]: [specific issue]
  🟡  [Major]   [Dimension]: [specific issue]
  🟢  [Minor]   [Dimension]: [specific issue]

  (List up to 5 issues: critical first, then major, then minor)

━━━ Score Details ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Accessibility breakdown:
  [criterion] .............. [n]/[max]pts — [pass/partial/fail]

  Usability breakdown:
  [heuristic] .............. [n]/3 — [key observation]

  Visual Quality breakdown:
  [sub-criterion] ........... [n]/5 — [note]

  Token Compliance breakdown:
  [sub-criterion] ........... [n]/5 — [note]

━━━ Score Methodology ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Accessibility (25pts):    WCAG 2.1 AA contrast, focus, targets, labels, color-only
  Usability (25pts):        Nielsen's 10 heuristics, each 0–3, normalized to 25
  Visual Quality (25pts):   spacing, typography, color, whitespace, CTA prominence
  Token Compliance (25pts): CSS var/token adherence or visual consistency

  Scoring model v1.0 · naksha /design-score
```

**Score bar:** 20 chars. `filled = round((score/25)*20)`. Use `█` for filled, `░` for empty.
Example: 17/25 → filled=round((17/25)×20)=14 → `██████████████░░░░░░`

**Grade labels:**
- A (90–100): Production ready
- B (80–89): Minor polish needed
- C (70–79): Meaningful improvements needed
- D (60–69): Significant issues — do not ship
- F (<60): Requires redesign in key areas

## Notes

- Scoring is holistic judgment guided by the rubric — not purely mechanical
- When scoring from a screenshot only, mark criteria requiring code inspection as "partial — code review needed"
- A score is a communication tool, not a verdict. Always include the specific issues that explain each deduction
- Re-run after making changes to track improvement over time
