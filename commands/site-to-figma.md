---
description: "Capture a live website and recreate its layout in Figma as editable frames with auto-layout, styles, and proper layer structure."
argument-hint: "[URL] [options: full-page, above-fold, specific-section]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
---

# /site-to-figma

You are **reverse-engineering a live website** into an editable Figma design. This captures the site's visual structure, extracts styles, and recreates the layout as properly structured Figma frames.

Input: **$ARGUMENTS**

Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/figma-creation.md` for Figma API patterns and `${CLAUDE_PLUGIN_ROOT}/skills/design/references/ui-designer.md` for layout analysis.

## Process

### 1. Capture the Website

#### Screenshot the site
Use Playwright to capture the page:
```
mcp__plugin_playwright_playwright__browser_navigate(url)
mcp__plugin_playwright_playwright__browser_take_screenshot(type: 'png', fullPage: true)
```

#### Extract layout structure
Get the page's accessibility tree for structure:
```
mcp__plugin_playwright_playwright__browser_snapshot()
```

#### Extract computed styles
```javascript
mcp__plugin_playwright_playwright__browser_evaluate: `
  function extractStyles() {
    const sections = document.querySelectorAll('header, nav, main, section, footer, [class*="hero"], [class*="container"]');
    const results = [];

    for (const el of sections) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      results.push({
        tag: el.tagName,
        class: el.className?.toString()?.substring(0, 80),
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        styles: {
          bg: style.backgroundColor,
          color: style.color,
          fontSize: style.fontSize,
          fontFamily: style.fontFamily?.split(',')[0]?.trim(),
          fontWeight: style.fontWeight,
          padding: style.padding,
          margin: style.margin,
          gap: style.gap,
          display: style.display,
          flexDirection: style.flexDirection,
          borderRadius: style.borderRadius
        },
        textContent: el.textContent?.substring(0, 100)?.trim(),
        childCount: el.children.length
      });
    }
    return results;
  }
  return extractStyles();
`
```

#### Extract color palette
```javascript
mcp__plugin_playwright_playwright__browser_evaluate: `
  const allElements = document.querySelectorAll('*');
  const colors = new Map();
  for (const el of allElements) {
    const style = window.getComputedStyle(el);
    ['backgroundColor', 'color', 'borderColor'].forEach(prop => {
      const val = style[prop];
      if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent') {
        colors.set(val, (colors.get(val) || 0) + 1);
      }
    });
  }
  return [...colors.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([color, count]) => ({ color, count }));
`
```

#### Extract typography
```javascript
mcp__plugin_playwright_playwright__browser_evaluate: `
  const textNodes = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, button, li, label');
  const typeStyles = new Map();
  for (const el of textNodes) {
    const style = window.getComputedStyle(el);
    const key = style.fontSize + '|' + style.fontWeight + '|' + style.fontFamily?.split(',')[0];
    if (!typeStyles.has(key)) {
      typeStyles.set(key, {
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        fontFamily: style.fontFamily?.split(',')[0]?.trim()?.replace(/"/g, ''),
        lineHeight: style.lineHeight,
        sample: el.textContent?.substring(0, 40)?.trim()
      });
    }
  }
  return [...typeStyles.values()].sort((a, b) =>
    parseInt(b.fontSize) - parseInt(a.fontSize)
  );
`
```

### 1.5: Stitch Alternative Intake

Use this path if **Playwright MCP is unavailable** OR if `$ARGUMENTS` contains `--stitch`:

1. Find or create a Stitch project:
   ```
   mcp__stitch__list_projects → use first owned project, or mcp__stitch__create_project(title: "Site Capture — [domain]")
   ```

2. Generate a Stitch screen from the site description (async — do not retry on connection errors):
   ```
   mcp__stitch__generate_screen_from_text(
     projectId: [id],
     prompt: "Recreate the layout and visual style of [URL or site description]: [key sections, colors, and style noted from $ARGUMENTS]",
     deviceType: DESKTOP,
     modelId: GEMINI_3_PRO
   )
   ```
   Poll `mcp__stitch__get_screen` until `screenMetadata.status === "COMPLETE"`.

3. Download outputs:
   ```bash
   curl -L "[screenshot.downloadUrl]" -o stitch-capture.png
   curl -L "[htmlCode.downloadUrl]" -o stitch-capture.html   # if figmaExport absent
   curl -L "[figmaExport.downloadUrl]" -o stitch-export.fig  # if figmaExport present
   ```

4. If `figmaExport` is present: open in Figma Desktop → use `get_design_context` → skip Steps 3–5, go to Step 7 (Validate).

5. If only `htmlCode`: use `stitch-capture.png` as the reference screenshot for Step 6, and derive color/type styles from the HTML rather than Playwright evaluation.

### 2. Connect to Figma

```
figma_get_status → verify Desktop Bridge connection
```

### 3. Create Figma Page

```javascript
figma_execute: `
  const page = figma.createPage();
  page.name = 'Site Capture — [domain name]';
  await figma.setCurrentPageAsync(page);
  return { pageId: page.id };
`
```

### 4. Create Figma Styles

From extracted colors, create Paint Styles:
```javascript
figma_execute: `
  const colors = [/* extracted palette */];

  function rgbaToFigma(rgba) {
    const match = rgba.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
    if (match) {
      return { r: +match[1]/255, g: +match[2]/255, b: +match[3]/255 };
    }
    return null;
  }

  let created = 0;
  for (const { color, role } of colors) {
    const figmaColor = rgbaToFigma(color);
    if (figmaColor) {
      const style = figma.createPaintStyle();
      style.name = 'Captured/' + role;
      style.paints = [{ type: 'SOLID', color: figmaColor }];
      created++;
    }
  }
  return 'Created ' + created + ' paint styles';
`
```

From extracted typography, create Text Styles:
```javascript
figma_execute: `
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });

  const typeScale = [/* extracted type styles */];
  let created = 0;
  for (const t of typeScale) {
    const style = figma.createTextStyle();
    style.name = 'Captured/' + t.role;
    style.fontSize = parseInt(t.fontSize);
    style.fontName = { family: 'Inter', style: parseInt(t.fontWeight) >= 600 ? 'Bold' : parseInt(t.fontWeight) >= 500 ? 'Medium' : 'Regular' };
    created++;
  }
  return 'Created ' + created + ' text styles';
`
```

### 5. Recreate Layout Sections

For each major section (header, hero, content, footer), create a Figma frame:

```javascript
figma_execute: `
  const mainFrame = figma.createFrame();
  mainFrame.name = 'Page — [site name]';
  mainFrame.resize(1440, 900);
  mainFrame.layoutMode = 'VERTICAL';
  mainFrame.primaryAxisSizingMode = 'AUTO';
  mainFrame.layoutSizingHorizontal = 'FIXED';
  mainFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

  return { frameId: mainFrame.id };
`
```

For each section:
```javascript
figma_execute: `
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

  const parent = await figma.getNodeByIdAsync('MAIN_FRAME_ID');

  // Create section frame
  const section = figma.createFrame();
  section.name = 'Hero Section';
  section.layoutMode = 'VERTICAL';
  section.layoutSizingHorizontal = 'FILL';
  section.primaryAxisSizingMode = 'AUTO';
  section.paddingLeft = 80;
  section.paddingRight = 80;
  section.paddingTop = 64;
  section.paddingBottom = 64;
  section.itemSpacing = 24;
  section.fills = [{ type: 'SOLID', color: { r: 0.05, g: 0.05, b: 0.15 } }];

  // Add heading
  const heading = figma.createText();
  heading.characters = 'Captured Heading Text';
  heading.fontSize = 48;
  heading.fontName = { family: 'Inter', style: 'Bold' };
  heading.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  heading.layoutSizingHorizontal = 'FILL';
  section.appendChild(heading);

  // Add subheading
  const sub = figma.createText();
  sub.characters = 'Captured subheading text goes here';
  sub.fontSize = 18;
  sub.fills = [{ type: 'SOLID', color: { r: 0.7, g: 0.7, b: 0.8 } }];
  sub.layoutSizingHorizontal = 'FILL';
  section.appendChild(sub);

  parent.appendChild(section);
  return { sectionId: section.id };
`
```

### 6. Add Reference Screenshot

Place the original screenshot as an image fill on a reference frame beside the recreation:

```javascript
figma_execute: `
  const ref = figma.createFrame();
  ref.name = 'Reference Screenshot';
  ref.resize(1440, 900);
  ref.x = 1520;
  ref.y = 0;
  ref.fills = []; // Will be filled with screenshot image
  return { refId: ref.id };
`
```

### 7. Validate

Take screenshots and compare side by side:
```
figma_capture_screenshot(recreatedFrameId) → Figma version
```

Compare structure:
- [ ] Same number of major sections
- [ ] Typography hierarchy matches
- [ ] Color palette matches (within tolerance)
- [ ] Layout direction matches (horizontal/vertical)
- [ ] Spacing is proportionally similar

### 8. Report

```markdown
## Site → Figma Capture

**Source**: [URL]
**Page**: Site Capture — [domain]

### Extracted
| Asset | Count |
|-------|-------|
| Colors | 12 |
| Text Styles | 6 |
| Sections | 5 |

### Recreated Sections
| Section | Elements | Status |
|---------|----------|--------|
| Header / Nav | Logo, 4 nav items, CTA | ✅ |
| Hero | Heading, subtext, 2 buttons | ✅ |
| Features Grid | 3 feature cards | ✅ |
| Testimonials | 2 quotes | ✅ |
| Footer | Links, social, copyright | ✅ |

### Figma Styles Created
- 12 Paint Styles (Captured/*)
- 6 Text Styles (Captured/*)

### Notes
- Original font [X] replaced with Inter (closest match available)
- Images replaced with gray placeholders (add real images manually)
```

## Limitations

- **Images**: Cannot extract actual images from screenshots. Uses gray placeholders with labels.
- **Fonts**: Maps to closest available Google Font (defaulting to Inter)
- **Interactions**: Does not capture hover states or animations — static layout only
- **Complex layouts**: Grid-heavy or absolutely-positioned layouts may not auto-layout perfectly
- **Authentication**: Cannot capture pages behind login walls unless user is logged in

## MCP Fallback

If Playwright is unavailable:
- Ask the user for a screenshot of the site and manually extracted styles (colors, fonts, spacing)
- Proceed with Figma recreation from the provided inputs

If Figma Desktop Bridge is unavailable:
- Output extracted styles as CSS custom properties and JSON tokens
- Skip Figma frame creation

## What's Next

After capturing a site into Figma:
- `/figma-create` — refine the captured layout, add missing details
- `/figma-responsive` — generate mobile/tablet variants from the captured desktop frame
- `/design-system` — extract design tokens from the captured styles
- `/ab-variants` — create A/B test variants from the captured screen
