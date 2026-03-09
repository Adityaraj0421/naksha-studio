# Figma-Native Design Creation

Reference guide for creating designs directly inside Figma using the Desktop Bridge (figma-console MCP tools). This is the reverse of design-to-code — here we CREATE designs in Figma programmatically.

## Table of Contents
1. [Connection Setup](#connection-setup)
2. [Async API Requirements](#async-api-requirements)
3. [Page & Frame Creation](#page--frame-creation)
4. [Auto-Layout Mastery](#auto-layout-mastery)
5. [Component Creation](#component-creation)
6. [Style Creation](#style-creation)
7. [Variable & Token Creation](#variable--token-creation)
8. [Text Operations](#text-operations)
9. [Fill & Stroke Operations](#fill--stroke-operations)
10. [Node Manipulation](#node-manipulation)
11. [Wireframe Patterns](#wireframe-patterns)
12. [Annotation Patterns](#annotation-patterns)
13. [Screenshot Validation](#screenshot-validation)
14. [Common Pitfalls](#common-pitfalls)
15. [Helper Functions](#helper-functions)

---

## Connection Setup

### WebSocket Desktop Bridge (Preferred)

The figma-console MCP connects via WebSocket to the Figma Desktop Bridge plugin.

**Check connection:**
```
figma_get_status → check transport.active === "websocket"
```

**If not connected:**
1. User opens Figma Desktop
2. User runs the Desktop Bridge plugin: Plugins → Development → Figma Desktop Bridge
3. Re-check status — should show `connectedFile` with file name and page

**Port behavior:**
- Default port: 9223
- Falls back to 9224, 9225, etc. if port is occupied
- Zombie processes can block ports — kill with: `lsof -i :9223 | grep node | awk '{print $2}' | xargs kill`

### CDP Alternative

Launch Figma with: `open -a "Figma" --args --remote-debugging-port=9222`

Less reliable than WebSocket. Prefer Desktop Bridge.

---

## Async API Requirements

**Critical**: The Desktop Bridge plugin uses `documentAccess: "dynamic-page"`. This means:

| Sync API (WILL FAIL) | Async API (USE THIS) |
|---|---|
| `figma.getNodeById(id)` | `await figma.getNodeByIdAsync(id)` |
| `figma.getLocalPaintStyles()` | `await figma.getLocalPaintStylesAsync()` |
| `figma.getLocalTextStyles()` | `await figma.getLocalTextStylesAsync()` |
| `figma.currentPage` (sometimes) | `figma.currentPage` (usually works) |

**Always use async versions** inside `figma_execute` code blocks. All `figma_execute` code runs in an async context, so `await` works directly.

---

## Page & Frame Creation

### Creating Pages

```javascript
// Create a new page
const page = figma.createPage();
page.name = "3 — Wireframes";

// Switch to the new page
await figma.setCurrentPageAsync(page);
```

### Creating Main Frames

```javascript
// Create the main container frame for a page
const frame = figma.createFrame();
frame.name = "Wireframes";
frame.resize(1440, 3000);
frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

// Add to current page
figma.currentPage.appendChild(frame);
```

### Nested Frames with Auto-Layout

```javascript
const section = figma.createFrame();
section.name = "Header";
section.layoutMode = 'VERTICAL';
section.primaryAxisAlignItems = 'MIN';       // top-align
section.counterAxisAlignItems = 'MIN';       // left-align
section.itemSpacing = 8;
section.paddingLeft = 80;
section.paddingRight = 80;
section.paddingTop = 80;
section.paddingBottom = 40;
section.layoutSizingHorizontal = 'FILL';     // fill parent width
section.layoutSizingVertical = 'HUG';        // hug contents height
section.fills = [];                           // transparent

parentFrame.appendChild(section);
```

---

## Auto-Layout Mastery

Auto-layout is the backbone of Figma design. Understand these properties:

### Layout Direction
```javascript
frame.layoutMode = 'VERTICAL';   // stack children top-to-bottom
frame.layoutMode = 'HORIZONTAL'; // stack children left-to-right
frame.layoutMode = 'NONE';       // free positioning (no auto-layout)
```

### Sizing Behavior
```javascript
// How the frame sizes itself
frame.layoutSizingHorizontal = 'FILL';   // fill parent width
frame.layoutSizingHorizontal = 'HUG';    // shrink to fit contents
frame.layoutSizingHorizontal = 'FIXED';  // use explicit width

frame.layoutSizingVertical = 'FILL';     // fill parent height
frame.layoutSizingVertical = 'HUG';      // shrink to fit contents
frame.layoutSizingVertical = 'FIXED';    // use explicit height
```

### Alignment
```javascript
// Primary axis (direction of layout)
frame.primaryAxisAlignItems = 'MIN';           // start
frame.primaryAxisAlignItems = 'CENTER';        // center
frame.primaryAxisAlignItems = 'MAX';           // end
frame.primaryAxisAlignItems = 'SPACE_BETWEEN'; // distribute

// Cross axis (perpendicular to layout)
frame.counterAxisAlignItems = 'MIN';     // start
frame.counterAxisAlignItems = 'CENTER';  // center
frame.counterAxisAlignItems = 'MAX';     // end
```

### Spacing & Padding
```javascript
frame.itemSpacing = 16;        // gap between children
frame.paddingLeft = 24;
frame.paddingRight = 24;
frame.paddingTop = 24;
frame.paddingBottom = 24;
```

### Child Sizing in Auto-Layout
```javascript
// A child inside auto-layout:
child.layoutSizingHorizontal = 'FILL';  // stretch to fill available width
child.layoutSizingVertical = 'HUG';     // only as tall as its content
```

### Key Rule
**Auto-layout controls child POSITIONING. Frame FILLS are independent.**
- Setting `layoutMode` on a frame means children are positioned by the layout engine
- But the frame's own `fills` (background) are unaffected
- You CAN set IMAGE fills on auto-layout frames as backgrounds
- You CANNOT manually set `x`/`y` on children in auto-layout (remove auto-layout first with `layoutMode = 'NONE'`)

---

## Component Creation

### Component Sets (with Variants)

```javascript
// Step 1: Create individual variant components
const defaultVariant = figma.createComponent();
defaultVariant.name = "Property 1=Default";
defaultVariant.resize(340, 200);
// ... build the default variant contents

const hoverVariant = figma.createComponent();
hoverVariant.name = "Property 1=Hover";
hoverVariant.resize(340, 200);
// ... build the hover variant contents

// Step 2: Combine into a component set
const componentSet = figma.combineAsVariants(
  [defaultVariant, hoverVariant],
  figma.currentPage
);
componentSet.name = "Content Card";
```

### Variant Naming Convention

Variants use `PropertyName=Value` in their name:
- `Property 1=Default`
- `Property 1=Hover`
- `Property 1=Selected`
- `Size=Small, State=Active` (multi-property)

### Adding Component Properties

```javascript
// After creating a component set, add properties:
figma_add_component_property({
  nodeId: componentSet.id,
  propertyName: "Show Icon",
  type: "BOOLEAN",
  defaultValue: true
});
```

### Instantiating Components

Use `figma_instantiate_component` or `figma_search_components` first to find components:
```
figma_search_components({ query: "Button" })
→ returns componentKey and nodeId
figma_instantiate_component({ componentKey, nodeId, variant: { "Property 1": "Primary" } })
```

**Important**: Always re-search components at the start of each session. NodeIds are session-specific.

---

## Style Creation

### Color Styles (Paint Styles)

```javascript
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

const style = figma.createPaintStyle();
style.name = 'Brand/Primary/blue';        // slash-separated for grouping
style.description = 'Primary CTA color';
style.paints = [{ type: 'SOLID', color: hexToRgb('#2f49d8') }];
```

### Text Styles

```javascript
// MUST load fonts before creating text styles
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

const ts = figma.createTextStyle();
ts.name = 'Brand/Heading/L';
ts.description = 'Large heading — page titles';
ts.fontName = { family: 'Inter', style: 'Bold' };
ts.fontSize = 24;
ts.lineHeight = { value: 32, unit: 'PIXELS' };
ts.letterSpacing = { value: -0.2, unit: 'PIXELS' };
```

### Style Naming Convention

Use slash-separated names for grouping in the Figma sidebar:
```
Brand/Primary/blue          → grouped under Brand > Primary
Brand/Surface/background    → grouped under Brand > Surface
Brand/Text/primary          → grouped under Brand > Text
Brand/Heading/L             → grouped under Brand > Heading
```

### Cleaning Up Old Styles

```javascript
const oldStyles = await figma.getLocalPaintStylesAsync();
for (const s of oldStyles) {
  if (s.name.startsWith('OldPrefix/')) {
    s.remove();
  }
}
```

---

## Variable & Token Creation

### Quick Setup (Full Token System)

Use `figma_setup_design_tokens` for one-shot creation:

```json
{
  "collectionName": "Brand Tokens",
  "modes": ["Light", "Dark"],
  "tokens": [
    { "name": "color/primary", "resolvedType": "COLOR", "values": { "Light": "#2f49d8", "Dark": "#6b8aff" } },
    { "name": "color/background", "resolvedType": "COLOR", "values": { "Light": "#ffffff", "Dark": "#0f172a" } },
    { "name": "spacing/md", "resolvedType": "FLOAT", "values": { "Light": 16, "Dark": 16 } }
  ]
}
```

### Batch Creation

Use `figma_batch_create_variables` for adding to an existing collection (10-50x faster than individual calls).

### Batch Updates

Use `figma_batch_update_variables` to update values (10-50x faster than individual calls).

---

## Text Operations

### Creating Text Nodes

```javascript
// ALWAYS load fonts before creating/modifying text
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

const text = figma.createText();
text.characters = "Hello World";
text.fontSize = 14;
text.fontName = { family: 'Inter', style: 'Regular' };
text.fills = [{ type: 'SOLID', color: hexToRgb('#0a1020') }];

parentFrame.appendChild(text);
```

### Modifying Existing Text

```javascript
const node = await figma.getNodeByIdAsync('123:456');
// Must load the font the text currently uses
await figma.loadFontAsync(node.fontName);
node.characters = "New text content";
```

### Using figma_set_text Tool

Simpler for basic text changes:
```
figma_set_text({ nodeId: "123:456", text: "New content", fontSize: 16 })
```

---

## Fill & Stroke Operations

### Solid Fills

```javascript
node.fills = [{ type: 'SOLID', color: hexToRgb('#2f49d8') }];

// With opacity
node.fills = [{ type: 'SOLID', color: hexToRgb('#2f49d8'), opacity: 0.5 }];

// Transparent (no fill)
node.fills = [];
```

### Using figma_set_fills Tool

```
figma_set_fills({ nodeId: "123:456", fills: [{ type: "SOLID", color: "#2f49d8" }] })
```

### Strokes

```javascript
node.strokes = [{ type: 'SOLID', color: hexToRgb('#cfc6b3') }];
node.strokeWeight = 1;
node.strokeAlign = 'INSIDE'; // or 'OUTSIDE', 'CENTER'
```

### Corner Radius

```javascript
node.cornerRadius = 12;

// Individual corners
node.topLeftRadius = 12;
node.topRightRadius = 12;
node.bottomLeftRadius = 0;
node.bottomRightRadius = 0;
```

---

## Node Manipulation

### Resize
```
figma_resize_node({ nodeId: "123:456", width: 1440, height: 900 })
```

### Move
```
figma_move_node({ nodeId: "123:456", x: 100, y: 200 })
```

### Clone
```
figma_clone_node({ nodeId: "123:456" })
```

### Delete
```
figma_delete_node({ nodeId: "123:456" })
```

### Rename
```
figma_rename_node({ nodeId: "123:456", newName: "My Frame" })
```

### Z-Order (Layer Order)

```javascript
// Move child to back (behind other children)
parent.insertChild(0, backgroundElement);

// Move child to front
parent.appendChild(foregroundElement);
```

---

## Wireframe Patterns

### Mid-Fidelity Aesthetic

Wireframes should look intentionally mid-fi — not hi-fi with muted colors:

```javascript
// Wireframe colors
const WIRE_BG = '#f9fafb';        // light gray page
const WIRE_SURFACE = '#ffffff';    // white cards
const WIRE_PLACEHOLDER = '#e5e7eb'; // gray placeholder areas
const WIRE_TEXT = '#374151';       // dark gray text
const WIRE_TEXT_MUTED = '#9ca3af'; // light gray secondary text
const WIRE_BORDER = '#d1d5db';     // gray borders
const WIRE_ACCENT = '#6b7280';     // medium gray for accents
```

### Placeholder Conventions
- Use real text for titles and key labels
- Use gray rectangles for image placeholders
- Use gray lines for body text placeholders
- Keep shapes simple — no drop shadows, minimal corner radius
- No brand colors — everything gray-scale

### Flow Annotations

Create labeled arrows between screens:
```javascript
// Flow label between Screen A and Screen B
const flowLabel = figma.createFrame();
flowLabel.name = "Flow: User clicks a saved content card";
flowLabel.layoutMode = 'HORIZONTAL';
flowLabel.itemSpacing = 8;
flowLabel.paddingLeft = 12;
flowLabel.paddingRight = 12;
flowLabel.paddingTop = 6;
flowLabel.paddingBottom = 6;
flowLabel.fills = [{ type: 'SOLID', color: hexToRgb('#eef1fb') }];
flowLabel.cornerRadius = 16;
// Add arrow icon + text label as children
```

### Frame Naming

Follow the brief's naming convention exactly. Common patterns:
- `S3-A / Saved Redesigned` (page 3, screen A)
- `S3-B / Content Detail` (page 3, screen B)
- `S3-C / Empty State` (page 3, screen C)

---

## Annotation Patterns

### Circled Letter Badges

```javascript
function createBadge(letter, color) {
  const badge = figma.createFrame();
  badge.name = `Badge ${letter}`;
  badge.resize(28, 28);
  badge.cornerRadius = 14;
  badge.fills = [{ type: 'SOLID', color: hexToRgb(color) }];
  badge.layoutMode = 'HORIZONTAL';
  badge.primaryAxisAlignItems = 'CENTER';
  badge.counterAxisAlignItems = 'CENTER';

  const text = figma.createText();
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
  text.characters = letter;
  text.fontSize = 14;
  text.fontName = { family: 'Inter', style: 'Bold' };
  text.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  badge.appendChild(text);

  return badge;
}
```

### SVG Leader Lines

Create vector lines connecting badges to UI elements:
```javascript
const line = figma.createVector();
line.name = "Leader Line A";
line.strokeWeight = 1.5;
line.strokes = [{ type: 'SOLID', color: hexToRgb('#2f49d8') }];
line.dashPattern = [6, 4]; // dashed line
// Set vector path to connect badge position to target element
```

### Annotation Cards

```javascript
const card = figma.createFrame();
card.name = "Annotation A";
card.layoutMode = 'VERTICAL';
card.itemSpacing = 8;
card.paddingLeft = 24;
card.paddingRight = 24;
card.paddingTop = 20;
card.paddingBottom = 20;
card.cornerRadius = 12;
card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
card.strokes = [{ type: 'SOLID', color: hexToRgb('#e5e7eb') }];
card.strokeWeight = 1;

// Add: badge, title, target label, description as children
```

---

## Screenshot Validation

### After Creating Elements

Always validate visually after creation:

```
figma_capture_screenshot({ nodeId: "created_node_id", scale: 2 })
```

This uses the plugin's `exportAsync` API — shows CURRENT state (guaranteed to reflect changes).

### For REST API Screenshots

```
figma_take_screenshot({ nodeId: "node_id" })
```

Uses REST API — may show stale data. Prefer `figma_capture_screenshot` for validation.

### Full-Page Verification

```
mcp__a47e377e__get_screenshot({ nodeId: "page_frame_id", fileKey: "..." })
```

REST API tool — works without Desktop Bridge. Good for audit screenshots.

### Validation Workflow

1. Create/modify elements
2. Take screenshot with `figma_capture_screenshot`
3. Analyze the screenshot for issues (alignment, spacing, colors)
4. Fix issues
5. Re-screenshot to confirm (max 3 iterations)

---

## Common Pitfalls

### Plugin Sandbox Restrictions

The Figma plugin sandbox does NOT have:
- `atob()` / `btoa()` — use manual base64 decoder
- `Buffer` — not available
- `TextDecoder` / `TextEncoder` — not available
- `fetch()` — limited to Figma CDN only
- `XMLHttpRequest` — not available
- `require()` / `import` — not available
- Node.js APIs — not available

**For image data**: Use `figma.createImage(uint8Array)` where `uint8Array` is a `Uint8Array` of the image bytes.

### Auto-Layout Label Alignment

When labels below components are bunched together:
- **Cause**: Labels are in a HORIZONTAL auto-layout frame
- **Fix**: Set `layoutMode = 'NONE'` on the label container, then manually position each label centered under its component:
```javascript
const centerX = componentX + (componentWidth - labelWidth) / 2;
label.x = centerX;
```

### Connection Drops

WebSocket connections can drop. Recovery:
1. Check `figma_get_status` — is transport active?
2. If not, ask user to reopen Desktop Bridge plugin in Figma
3. Kill zombie processes: `lsof -i :9223-9226 | grep node`
4. Re-check status after user reopens plugin

### Font Loading

**Always load fonts before modifying text**. If you forget:
```
Error: Cannot set fontName on a text node without first loading the font
```

Fix: `await figma.loadFontAsync({ family: 'FontName', style: 'Regular' })` before any text operations.

### Dynamic Page Access

If you see: `Cannot call with documentAccess: dynamic-page`
- You're using a sync API that requires async
- Switch from `figma.getNodeById()` to `await figma.getNodeByIdAsync()`
- Switch from `figma.getLocalPaintStyles()` to `await figma.getLocalPaintStylesAsync()`

---

## Helper Functions

### hexToRgb — Convert hex color to Figma RGB

```javascript
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}
```

### createAutoLayoutFrame — Quick auto-layout setup

```javascript
function createAutoLayoutFrame(name, direction, spacing, padding) {
  const f = figma.createFrame();
  f.name = name;
  f.layoutMode = direction; // 'VERTICAL' or 'HORIZONTAL'
  f.itemSpacing = spacing;
  f.paddingLeft = padding;
  f.paddingRight = padding;
  f.paddingTop = padding;
  f.paddingBottom = padding;
  f.fills = [];
  return f;
}
```

### createText — Quick text creation

```javascript
async function createStyledText(content, size, weight, color, family = 'Inter') {
  const style = weight === 'Bold' ? 'Bold' : weight === 'Medium' ? 'Medium' : 'Regular';
  await figma.loadFontAsync({ family, style });
  const t = figma.createText();
  t.characters = content;
  t.fontSize = size;
  t.fontName = { family, style };
  t.fills = [{ type: 'SOLID', color: hexToRgb(color) }];
  return t;
}
```

### Batch Style Creator

```javascript
async function createColorStyles(styles) {
  // styles = [{ name, hex, description }, ...]
  for (const s of styles) {
    const ps = figma.createPaintStyle();
    ps.name = s.name;
    ps.description = s.description || '';
    ps.paints = [{ type: 'SOLID', color: hexToRgb(s.hex) }];
  }
}
```
