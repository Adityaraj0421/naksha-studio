---
name: print-layout
description: Design a single print artifact (business card, flyer, certificate, brochure, invoice) with correct bleed, safe zone, CMYK color system, and print-ready HTML/CSS output.
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
triggers:
  - print layout
  - business card
  - design flyer
  - print flyer
  - certificate design
  - brochure layout
  - design invoice
  - print artifact
  - print design
arguments: "<artifact type> for <brand> — <dimensions and finish>"
---

# /print-layout $ARGUMENTS

You are activating the **Print/PDF Wing** in layout mode: Print Designer, producing a single print artifact with correct bleed/safe zone setup, CMYK color documentation, and print-ready HTML/CSS.

---

## Process

### 1. Parse Input

Extract from `$ARGUMENTS`:
- **Artifact type**: business card / flyer / certificate / brochure / invoice / other
- **Brand name**: for color and logo references
- **Dimensions**: use standard for artifact type if not specified (see reference table in `print-designer.md`)
- **Finish**: coated / uncoated / digital-only (affects CMYK richness recommendations)

Set artboard: `trim + 3mm bleed on all sides`. Example: business card trim `85 × 54mm` → artboard `91 × 60mm`.

---

### 2. Canvas + Bleed Setup

```css
:root {
  --trim-w: 85mm;   /* adjust per artifact */
  --trim-h: 54mm;
  --bleed: 3mm;
  --safe: 3mm;
}
.artboard {
  width: calc(var(--trim-w) + 2 * var(--bleed));
  height: calc(var(--trim-h) + 2 * var(--bleed));
  position: relative;
  overflow: hidden;
}
/* Guide marks — screen only */
@media screen {
  .trim-guide {
    position: absolute;
    inset: var(--bleed);
    border: 0.5px dashed #9ca3af;
    pointer-events: none;
    z-index: 999;
  }
  .safe-guide {
    position: absolute;
    inset: calc(var(--bleed) + var(--safe));
    border: 0.5px dotted #d1d5db;
    pointer-events: none;
    z-index: 999;
  }
}
@media print {
  .trim-guide, .safe-guide { display: none; }
}
```

---

### 3. Grid + Safe Zone

Define the column grid **inside the safe zone** (not inside the trim):

```css
.content-area {
  position: absolute;
  inset: calc(var(--bleed) + var(--safe));
  /* All live content (text, logos) goes in here */
}
.background-layer {
  /* Backgrounds and decorative elements: extend to artboard edge */
  position: absolute;
  inset: 0;
  background: var(--brand-primary);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
```

---

### 4. CMYK Color System

Map brand colors to CMYK-safe hex equivalents and document in CSS:

```css
:root {
  /* All brand colors must have CMYK breakdown documented */
  --brand-primary: #1e3a5f;  /* C:88 M:74 Y:0 K:22 */
  --brand-accent:  #ff8000;  /* C:0 M:50 Y:100 K:0 */
  --text-primary:  #000000;  /* C:0 M:0 Y:0 K:100 — pure black */
}
/* Any color without CMYK documentation: add ⚠️ CMYK not verified */
```

Flag any pure `rgb()`, `hsl()`, or undocumented hex as a preflight warning comment.

---

### 5. Typography + Hierarchy

```css
@media print {
  .body-text  { font-size: 8pt; line-height: 1.4; } /* minimum for print artifact */
  .label-text { font-size: 7pt; line-height: 1.3; } /* absolute minimum */
  .headline   { font-size: 14pt; font-weight: 700; }
  .name-field { font-size: 12pt; font-weight: 600; }
}
```

Check characters per line on the narrowest text column — for a business card name (85mm - 6mm bleed - 6mm safe = 73mm effective), 12pt type gives ~20 chars/line, which is fine for a name. Adjust tracking (`letter-spacing`) for very short lines.

---

### 6. Full HTML/CSS Output

Output a complete, self-contained HTML document with:
- `<!DOCTYPE html>` + appropriate viewport meta (for screen preview)
- All CSS including custom properties, screen styles, and `@media print` block
- Two faces if applicable (front/back as separate `.face` divs, togglable in screen view)
- SVG for any decorative borders, icons, or graphic elements (avoids raster quality loss)
- Guide marks for trim and safe zone (`.trim-guide`, `.safe-guide`) — hidden in print

---

### 7. Preflight Checklist

```
## Print Preflight

- [ ] Bleed: 3mm on all edges (artboard = trim + 6mm)
- [ ] Safe zone: live content 3mm inside trim
- [ ] CMYK values documented for all brand colors
- [ ] Minimum font size: body 8pt, labels 7pt
- [ ] No raster images below 300 DPI equivalent
- [ ] Fonts declared with @font-face
- [ ] Fold/cut lines marked in screen view, hidden in print
- [ ] print-color-adjust: exact on .background-layer and any element with a solid background-color (inherited, but explicit is safer)
- [ ] Both faces output if front + back required
```

---

### MCP Fallback

**Without Preview MCP**: Output the HTML as a fenced code block. Advise: save as `.html`, open in Chrome, use File → Print → Save as PDF at the correct paper size with no additional margins.

**With Preview MCP**: Write to temp file, preview at artboard dimensions, confirm bleed and safe zone guide marks render correctly, then output final version.

---

## What's Next

- `/pdf-report` — generate a multi-page document layout
- `/print-audit` — audit this layout for bleed, CMYK, font embedding, and preflight compliance
- `/design-system` — extract typography and color tokens from this artifact into a reusable token set
