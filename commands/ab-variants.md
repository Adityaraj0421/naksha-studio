---
description: "Generate A/B test design variants from an existing Figma screen — alternate layouts, CTA placements, color treatments, and copy variations."
argument-hint: "[frame name or node ID] [what to vary: layout, cta, color, copy, or 'all'] [--stitch for Stitch engine]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
---

# /ab-variants

You are generating **A/B test design variants** from an existing Figma screen. This creates alternative versions of key design elements to enable data-driven design decisions.

Input: **$ARGUMENTS**

Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/figma-creation.md` for Figma API patterns, `${CLAUDE_PLUGIN_ROOT}/skills/design/references/ux-researcher.md` for testing methodology, and `${CLAUDE_PLUGIN_ROOT}/skills/design/references/content-designer.md` for copy variation.

## Process

### 1. Connect & Identify Source

```
figma_get_status → verify Desktop Bridge connection
```

Find the source frame and analyze its structure:
```javascript
figma_execute: `
  const frame = await figma.getNodeByIdAsync('SOURCE_ID');
  const texts = frame.findAllWithCriteria({ types: ['TEXT'] });
  const instances = frame.findAllWithCriteria({ types: ['INSTANCE'] });

  return {
    name: frame.name,
    width: Math.round(frame.width),
    height: Math.round(frame.height),
    headings: texts.filter(t => t.fontSize >= 20).map(t => ({
      id: t.id, text: t.characters?.substring(0, 60), size: t.fontSize
    })),
    ctas: texts.filter(t => {
      const parent = t.parent;
      return parent?.name?.toLowerCase().includes('button') ||
             parent?.name?.toLowerCase().includes('cta');
    }).map(t => ({
      id: t.id, text: t.characters, parentId: t.parent?.id, parentName: t.parent?.name
    })),
    components: instances.map(i => ({
      id: i.id, name: i.name, mainComponent: i.mainComponent?.name
    })),
    sections: frame.children.map(c => ({
      id: c.id, name: c.name, type: c.type, height: Math.round(c.height)
    }))
  };
`
```

Screenshot for reference:
```
figma_capture_screenshot(sourceId) → original version
```

### 2. Determine What to Vary

Based on user input or auto-detection, select variation dimensions:

| Dimension | What Changes | High-Impact Areas |
|-----------|-------------|-------------------|
| **Layout** | Section order, grid arrangement, visual hierarchy | Hero area, feature section, pricing table |
| **CTA** | Button text, color, size, position, quantity | Primary action, sign-up, pricing selection |
| **Color** | Primary accent, background, contrast treatment | Hero background, CTA button, section accents |
| **Copy** | Headlines, subheadings, value propositions, CTAs | Hero headline, feature descriptions, button labels |
| **Social Proof** | Testimonial placement, trust badges, stats | Near CTA, hero area, pricing section |

### 3. Create Variant Section

```javascript
figma_execute: `
  const source = await figma.getNodeByIdAsync('SOURCE_ID');
  const section = figma.createSection();
  section.name = 'A/B Test Variants';
  section.x = source.x;
  section.y = source.y + source.height + 120;
  section.resizeWithoutConstraints(source.width * 3 + 240, source.height + 100);
  return { sectionId: section.id };
`
```

### 4. Generate Variants

#### Mode A: Stitch Engine (preferred — when Stitch MCP is available)

Stitch's `generate_variants` produces real rendered variants with configurable creative range.

1. Identify the Stitch screen for the source. If the source came from a Stitch project (known `projectId` + `screenId`), use it directly. Otherwise, upload the Figma screenshot as a Stitch screen:
   ```
   mcp__stitch__list_projects → find active project (or create one)
   mcp__stitch__upload_screens_from_images(
     projectId: [id],
     images: [{ fileContentBase64: [base64 of source screenshot], mimeType: "image/png" }]
   )
   ```
   Note the returned `screenId`.

2. Map the user's variation intent to Stitch options:

   | User asks to vary | `aspects` | `creativeRange` |
   |---|---|---|
   | layout / structure | `["LAYOUT"]` | `EXPLORE` |
   | color / palette | `["COLOR_SCHEME"]` | `EXPLORE` |
   | copy / text / headlines | `["TEXT_CONTENT"]` | `REFINE` |
   | fonts / typography | `["TEXT_FONT"]` | `REFINE` |
   | "all" / radical | `["LAYOUT","COLOR_SCHEME","IMAGES"]` | `REIMAGINE` |
   | subtle refinements | any | `REFINE` |

3. Generate variants (async — do not retry on connection errors):
   ```
   mcp__stitch__generate_variants(
     projectId: [id],
     selectedScreenIds: [sourceScreenId],
     prompt: [variation intent from user input],
     variantOptions: {
       variantCount: 3,
       creativeRange: [mapped value],
       aspects: [mapped array]
     },
     deviceType: MOBILE
   )
   ```
   Each returned screen is a variant. Poll `mcp__stitch__get_screen` for each until `status === "COMPLETE"`.

4. Download `screenshot` and `htmlCode` for each variant via their `downloadUrl`.

5. Screenshot each variant using Playwright if available:
   ```bash
   curl -L "[screenshot.downloadUrl]" -o variant-[A|B|C].png
   ```

Skip the Figma clone steps below — go directly to Step 5 (Label Variants) using the Stitch screenshots.

#### Mode B: Figma Clone (fallback — when Stitch MCP is unavailable)

#### Variant A (Control)
Clone the original as-is:
```javascript
figma_execute: `
  const source = await figma.getNodeByIdAsync('SOURCE_ID');
  const section = await figma.getNodeByIdAsync('SECTION_ID');
  const control = source.clone();
  control.name = 'A — Control';
  section.appendChild(control);
  control.x = 40;
  control.y = 40;
  return { id: control.id };
`
```

#### Variant B — Layout Change
Common layout variations:
- **Hero**: Image left ↔ Image right
- **Grid**: 3-col → 2-col with sidebar
- **Section order**: Move testimonials above features
- **CTA position**: Above fold ↔ Below features

```javascript
figma_execute: `
  const source = await figma.getNodeByIdAsync('SOURCE_ID');
  const section = await figma.getNodeByIdAsync('SECTION_ID');
  const varB = source.clone();
  varB.name = 'B — [Variation Description]';
  section.appendChild(varB);
  varB.x = source.width + 80 + 40;
  varB.y = 40;

  // Apply layout changes...
  // e.g., reorder children, swap element positions

  return { id: varB.id };
`
```

#### Variant C — Copy/CTA Change
Common copy variations:
- **Benefit-focused**: "Save 10 hours per week" vs "Automate your workflow"
- **Action-oriented**: "Start Free Trial" vs "Get Started" vs "Try it Free"
- **Urgency**: "Join 10,000+ teams" vs "Limited time offer"
- **Question-based**: "Ready to grow?" vs "Transform your business"

```javascript
figma_execute: `
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });

  const varC = source.clone();
  varC.name = 'C — [Variation Description]';

  // Find and update CTA text
  const ctas = varC.findAll(n => n.type === 'TEXT' &&
    n.parent?.name?.toLowerCase().includes('button'));
  for (const cta of ctas) {
    cta.characters = 'New CTA Text';
  }

  // Find and update headline
  const headings = varC.findAll(n => n.type === 'TEXT' && n.fontSize >= 24);
  if (headings[0]) {
    headings[0].characters = 'Alternative Headline Copy';
  }

  section.appendChild(varC);
  return { id: varC.id };
`
```

### 5. Label Variants

Add labels above each variant:
```javascript
figma_execute: `
  await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

  const source = await figma.getNodeByIdAsync('SOURCE_ID');
  const SOURCE_WIDTH = Math.round(source.width);

  const labels = [
    { text: 'A — Control', desc: 'Original design (baseline)', x: 40 },
    { text: 'B — Layout Swap', desc: 'Hero image on right, CTA above fold', x: SOURCE_WIDTH + 120 },
    { text: 'C — Copy Variation', desc: 'Benefit-focused headline, urgency CTA', x: SOURCE_WIDTH * 2 + 200 }
  ];

  const section = await figma.getNodeByIdAsync('SECTION_ID');
  for (const l of labels) {
    const labelFrame = figma.createFrame();
    labelFrame.name = 'Label — ' + l.text;
    labelFrame.layoutMode = 'VERTICAL';
    labelFrame.itemSpacing = 4;
    labelFrame.fills = [];
    labelFrame.x = l.x;
    labelFrame.y = 8;

    const title = figma.createText();
    title.characters = l.text;
    title.fontSize = 16;
    title.fontName = { family: 'Inter', style: 'Semi Bold' };
    title.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
    labelFrame.appendChild(title);

    const desc = figma.createText();
    desc.characters = l.desc;
    desc.fontSize = 12;
    desc.fontName = { family: 'Inter', style: 'Regular' };
    desc.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
    labelFrame.appendChild(desc);

    section.appendChild(labelFrame);
  }
  return 'Labels added';
`
```

### 6. Validate

Screenshot each variant:
```
figma_capture_screenshot(controlId)  → A — Control
figma_capture_screenshot(varBId)     → B — Layout
figma_capture_screenshot(varCId)     → C — Copy
```

### 7. Report

```markdown
## A/B Test Variants Generated

**Source**: [Screen Name]
**Variants**: 3 (Control + 2 test variants)

| Variant | Change | Hypothesis |
|---------|--------|-----------|
| A — Control | Original design | Baseline measurement |
| B — Layout Swap | Hero image right, CTA above fold | Hypothesis: Earlier CTA visibility increases clicks |
| C — Copy Variation | Benefit headline, urgency CTA | Hypothesis: Benefit-focused copy improves conversion |

### Testing Recommendations
- **Metric**: Click-through rate on primary CTA
- **Sample size**: Minimum 1,000 visitors per variant
- **Duration**: 2 weeks minimum for statistical significance
- **Confidence level**: 95% (p < 0.05)

### What to Measure
| Metric | Primary/Secondary | Expected Impact |
|--------|-------------------|-----------------|
| CTA click rate | Primary | +5-15% |
| Scroll depth | Secondary | Neutral |
| Time on page | Secondary | +/- 10% |
| Bounce rate | Secondary | -5% |
```

## Variation Principles

1. **Test one variable at a time** — each variant should change only one dimension for clean attribution
2. **Keep changes meaningful** — a different shade of blue isn't worth testing; a different layout is
3. **Hypothesis first** — every variant needs a clear hypothesis for what it tests and why
4. **Respect brand** — variants should stay within brand guidelines even while testing
5. **Prioritize high-impact areas** — CTAs and headlines have more impact than footer layouts

## MCP Fallback

If Figma Desktop Bridge is unavailable:
- Skip Figma variant creation
- Output variant specs as a markdown table with hypotheses and testing recommendations
- Include layout descriptions, copy alternatives, and CTA variations as text specs

## What's Next

After generating A/B variants:
- `/figma-prototype` — add prototype connections to each variant for testing
- `/design-present` — create a presentation comparing variants for stakeholders
- `/ux-audit` — audit each variant for accessibility and usability compliance
- `/design-sprint` — run a full design sprint if the test results suggest pivoting
