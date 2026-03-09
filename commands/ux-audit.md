---
description: "Audit a Figma file against a design brief — checks page structure, frame naming, sizes, styles, components, and content compliance."
argument-hint: "[brief text or 'check current file']"
allowed-tools: ["Read", "Bash", "Glob", "Grep", "mcp__*"]
---

# /ux-audit

You are running a compliance audit of a Figma file against a design brief. This checks whether a Figma deliverable meets all specified requirements.

Input: **$ARGUMENTS**

## Process

### 1. Parse the Brief

Extract structured requirements from the user's brief text. Look for:

| Category | What to extract |
|----------|----------------|
| **Pages** | Required page names, count, ordering |
| **Frames** | Frame naming conventions, required sizes (e.g., 1440×900) |
| **Components** | Required component types, variant states, naming patterns |
| **Styles** | Required color palette (hex values), text styles (font, size, weight) |
| **Content** | Required sections, headings, text content, annotations |
| **Variables/Tokens** | Required design tokens, variable collections |
| **Naming** | Specific naming conventions (e.g., `S3-A`, `Brand/Primary`) |

If the brief is unclear on specifics, state your assumptions before auditing.

### 2. Connect to Figma

```
figma_get_status → verify connection
figma_get_file_data(depth: 1, verbosity: 'summary') → get file overview
```

If not connected, guide the user to open the Desktop Bridge plugin.

### 3. Structural Audit

Check page and frame structure against requirements:

```javascript
// Get all pages
figma_execute: `
  const pages = figma.root.children.map(p => ({
    name: p.name,
    id: p.id,
    childCount: p.children.length
  }));
  return pages;
`
```

For each required page:
- Does it exist with the correct name?
- Does it contain the expected frames?

For each required frame:
- Check name matches exactly
- Check dimensions: `frame.width` and `frame.height`
- Check it's on the correct page

### 4. Style Audit

Check Figma styles against requirements:

```javascript
// Get all local styles
figma_execute: `
  const paintStyles = (await figma.getLocalPaintStylesAsync()).map(s => ({
    name: s.name,
    id: s.id,
    paints: s.paints
  }));
  const textStyles = (await figma.getLocalTextStylesAsync()).map(s => ({
    name: s.name,
    id: s.id,
    fontSize: s.fontSize,
    fontName: s.fontName
  }));
  return { paintStyles, textStyles };
`
```

For each required color:
- Does a Paint Style exist with the correct name?
- Does the color value match the required hex?

For each required text style:
- Does a Text Style exist with the correct name?
- Do font family, size, and weight match?

### 5. Component Audit

Check components against requirements:

```javascript
// Find all component sets
figma_execute: `
  await figma.loadAllPagesAsync();
  const sets = figma.root.findAllWithCriteria({ types: ['COMPONENT_SET'] });
  return sets.map(cs => ({
    name: cs.name,
    id: cs.id,
    page: cs.parent?.parent?.name || cs.parent?.name,
    variants: cs.children.map(v => v.name)
  }));
`
```

For each required component:
- Does a COMPONENT_SET exist with the correct name?
- Does it have all required variants?
- Are variant names following the `Property=Value` convention?

### 6. Content Audit

Check text content, sections, and annotations:

```javascript
// Get text content from a specific page
figma_execute: `
  const page = await figma.getNodeByIdAsync('PAGE_ID');
  const textNodes = page.findAllWithCriteria({ types: ['TEXT'] });
  return textNodes.map(t => ({
    characters: t.characters.substring(0, 100),
    parent: t.parent?.name,
    fontSize: t.fontSize
  }));
`
```

For each required content element:
- Does the expected heading/section title exist?
- Is required body text present?
- Are annotations/callouts where they should be?

### 7. Visual Audit

Take screenshots and analyze visually:

```
figma_capture_screenshot(pageNodeId) → for each page
```

Check each screenshot for:
- Layout alignment and spacing consistency
- Visual hierarchy (headings larger than body text)
- Color usage matching the palette
- No obvious visual defects (overlapping elements, cut-off text)
- Content completeness (no placeholder/lorem ipsum unless intentional)

### 8. Variable/Token Audit (if applicable)

If the brief requires design tokens or variables:

```
figma_get_variables(format: 'summary') → get variable overview
```

Check:
- Required variable collections exist
- Required variables within each collection
- Values match specifications
- Modes are set up correctly (e.g., Light/Dark)

### 9. Generate Report

Compile findings into a structured compliance report:

```markdown
## Compliance Audit Report

### Summary
- **File**: [file name]
- **Brief**: [brief summary]
- **Score**: X / Y requirements met
- **Status**: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL

### Detailed Results

| # | Category | Requirement | Status | Notes |
|---|----------|-------------|--------|-------|
| 1 | Structure | Page "Cover" exists | ✅ | — |
| 2 | Structure | Frame "S3-A" at 1440×900 | ✅ | 1440×900 confirmed |
| 3 | Styles | Color "Brand/Primary" = #1B3A5C | ✅ | — |
| 4 | Components | Button with 5 variants | ⚠️ | 4/5 variants found |
| 5 | Content | Critique notes present | ❌ | Section missing |

### Missing Items
[List each missing requirement with specific fix instructions]

### Recommendations
[Optional improvements beyond the brief requirements]
```

## Scoring

- **✅ PASS**: Requirement fully met
- **⚠️ PARTIAL**: Requirement partially met (exists but incomplete/incorrect)
- **❌ FAIL**: Requirement not met

Final score = (PASS count) / (Total requirements) × 100

## Notes

- Use `figma.getNodeByIdAsync()` (async) for all node lookups — dynamic page access requires it
- Use `figma.loadAllPagesAsync()` before searching across pages
- Take screenshots using `figma_capture_screenshot` for current-state validation
- If a requirement is ambiguous, note both your interpretation and the result
- Keep the report factual — report what IS vs what SHOULD BE, without editorializing
