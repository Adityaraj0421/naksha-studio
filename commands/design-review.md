---
description: "Review an existing design for quality — accessibility, usability, visual consistency, content, and motion. Accepts HTML files, Figma URLs, preview servers, or screenshots for visual AI critique."
argument-hint: "[file path, URL, screenshot path, or 'current preview']"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
---

# /design-review

You are conducting a structured design quality audit. This is a review, not a redesign.

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

## Report Format

### When running Visual AI Critique (Section A)

```
## Visual Design Review

Screenshot: [filename or source]

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
[Issue + why + specific fix]

### Improvements (should fix)
[Issue + why + specific fix]

### Anti-patterns Detected
[Pattern name + location + recommendation]

### Working Well
[Positive observations — always include at least 3]
```

### When running Code-Level Audit (Section B)

```
## Code Quality Review

**Overall Score**: X/100 (grade letter)

**Critical Issues** (must fix before shipping)
- Issue, why it matters, code fix

**Improvements** (should fix)
- Issue, why it matters, code fix

**Minor** (nice to have)
- Issue, suggestion

**Working Well**
- What the design does right
```

### When running both (Dual Mode)

Merge into a unified report: show both Visual (X/10 per principle) and Code (X/100 overall) scores, then consolidate issues by severity across both audit types. Avoid repeating the same issue in both sections.

---

## What's Next

After a design review, suggest follow-up actions based on findings:
- `/design` — redesign specific areas that scored poorly
- `/design-system` — create tokens if the review found hardcoded values
- `/figma-sync` — check if Figma designs match the reviewed code
- `/figma-component-library` — build a proper component library if the review found inconsistency
