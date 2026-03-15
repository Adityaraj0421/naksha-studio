---
description: "Design a complete presentation deck — pitch deck, product demo, or internal presentation — with slide system, layouts, and visual hierarchy."
argument-hint: "[deck type: pitch/product/internal/report] [slide count or topic] [brand colors optional]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
---

# /presentation-design

You are designing a complete presentation deck. This command handles the full arc: narrative structure, slide system design, layout specifications, visual hierarchy, and a slide-by-slide content outline.

Input: **$ARGUMENTS**

Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/presentation-designer.md` for slide system rules, typography minimums, chart selection, pitch deck frameworks, and color guidance.

## Process

### 1. Parse Deck Type and Scope

From `$ARGUMENTS`, extract:
- **Deck type**: `pitch` / `product` / `internal` / `report` (default: `pitch`)
- **Slide count or topic**: number of slides or subject matter
- **Brand colors**: hex values or color names if provided (optional)
- **Audience**: investor / team / executive / customer (infer from context if not stated)

If deck type is ambiguous, infer from topic keywords:
- "seed round", "investor", "raise" → `pitch`
- "demo", "walkthrough", "product tour" → `product`
- "quarterly", "OKR", "board", "report" → `internal`

### 2. Load Presentation Designer Reference

Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/presentation-designer.md` and apply:
- Narrative arc table for the deck type
- Slide type content rules (headline assertion, word limits)
- Typography minimums (title ≥ 32pt, body ≥ 20pt)
- Safe zone margins for the target format
- Chart type selection for any data slides

### 3. Define Deck Structure

Output a narrative arc + slide list before designing any individual slide:

```
Deck: [Title]
Type: [pitch/product/internal/report]
Slides: [N]
Audience: [investor/team/executive/customer]

Narrative arc:
  Hook     → Slide 1-2: [purpose]
  Insight  → Slide 3: [purpose]
  Solution → Slide 4-5: [purpose]
  Proof    → Slide 6-7: [purpose]
  Ask      → Slide 8-10: [purpose]
```

For pitch decks, default to the 10-slide framework from the reference unless a different count is specified.

### 4. Design Slide System

Define the visual system before content:

**Grid**: 12-column, content area columns 2–11, safe zone margins per target format
**Aspect ratio**: 16:9 (1920×1080) unless specified
**Typography**:
- Title: [font] [size]pt, weight [weight]
- Body: [font] [size]pt, weight [weight]
- Caption: [font] 16pt, weight regular
- Callout stat: [font] 60–80pt, weight bold

**Color palette**:
- Background: [value] ([dark/light/gradient])
- Primary text: [value]
- Accent 1 (primary): [value] — for CTAs, key callouts
- Accent 2 (secondary): [value] — for supporting data

If brand colors are provided in arguments, derive the palette from them. If not provided, default to a dark background system (#0f0f0f background, white text, one brand accent).

### 5. Generate Slide-by-Slide Content Outline

For every slide, output:

```
## Slide [N]: [Slide Type]

**Headline (assertion)**: [Exact headline text — conclusion, not topic]
**Layout**: [layout name from reference — e.g., split left/right, full-bleed, 3-column]
**Body content**: [bullet points or description of content elements]
**Visuals**: [chart type / screenshot / diagram / photo — with annotation strategy]
**Word count**: [N] / [max for this type]
**Speaker notes**: [What the presenter says — not on the slide]
```

Apply the 1-idea-per-slide rule strictly. If content for a slide exceeds its word limit, split into two slides.

For data slides, specify the chart type from the reference (trend→line, comparison→bar, composition→pie/treemap, relationship→scatter) and include at least one callout annotation directive.

### 6. Output Template Code or Figma Structure

Based on the output format appropriate for the deck type, provide one of:

**If Figma is available** (via `figma_get_status`):

Generate a Figma auto-layout structure for each slide type:
```javascript
figma_execute: `
  // Create master slide frame
  const slide = figma.createFrame();
  slide.resize(1920, 1080);
  slide.name = "Slide [N] — [Type]";
  // Apply background fill
  // Add text layers with specified font sizes
  // Add placeholder shapes for visuals
`
```

**If generating HTML/Markdown output**:

Produce a structured slide template per slide type with annotated layout zones:

```html
<!-- Slide N: [Type] -->
<section class="slide slide--[type]" style="aspect-ratio: 16/9;">
  <header class="slide__headline">[Headline assertion]</header>
  <div class="slide__body">
    <!-- [Content description] -->
  </div>
  <aside class="slide__notes" hidden>[Speaker notes]</aside>
</section>
```

Include a minimal CSS system with:
- Safe zone padding variables
- Typography scale (title/body/caption/stat)
- Color palette custom properties
- Slide type modifier classes

### 7. Deliver Speaker Notes Framework

For each slide, provide a speaker notes template with:
- **Opening line**: What to say as the slide appears
- **Key point**: The one thing the audience must retain
- **Transition**: Bridge sentence to the next slide

Format as a compact table:

| Slide | Opening | Key Point | Transition |
|-------|---------|-----------|------------|
| 1 — Cover | "Today I want to talk about…" | Context setter | "Let's start with the problem…" |
| 2 — Problem | "Every [audience] knows this pain…" | Pain + cost | "Which is why we built…" |
| … | … | … | … |

## MCP Fallback

If Figma is unavailable or not connected:
- Skip Figma execution steps
- Output the complete slide deck as structured markdown with layout annotations in comments
- Include an HTML template block for each unique slide type (cover, content, data, team, ask)
- Label each block with the grid columns and font sizes the designer should apply

If preview server is unavailable:
- Write the HTML output to `./[deck-name]-presentation.html` for manual browser viewing

## What's Next

After designing the presentation:
- `/brand-kit` — establish or refine the brand palette used in the deck
- `/design-present` — generate an interactive HTML presentation from Figma screens for live delivery
- `/design` — build any product screenshots or UI visuals referenced in the deck slides
