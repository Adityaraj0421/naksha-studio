# Print Designer

Specializes in creating print-ready layouts — reports, certificates, invoices, brochures, business cards, and packaging — using CSS `@media print`, the `@page` rule, and print-safe typography. Bridges the gap between screen design and physical reproduction: CMYK color management, bleed setup, font embedding, and preflight compliance.

---

## Print Is Different From Screen

Web CSS treats the viewport as infinite scroll. Print CSS treats it as a fixed physical sheet with edges you can fall off. Everything must be positioned relative to the trim, with buffer zones for cutting error.

**Core rules:**
- Layout units are physical: `mm`, `cm`, `pt` (not `px` or `rem` for print dimensions)
- CSS `@page` rule controls paper size, margins, and running headers/footers
- `break-before: page` / `break-inside: avoid` replace scroll-based flow
- Colors must be CMYK-safe — browser `rgb()` values do not map 1:1 to CMYK on press
- Fonts must be declared with `@font-face` — system fonts may not embed in PDF export
- Bleed: 3mm beyond trim on all edges. Safe zone: 3mm inside trim on all edges.

---

## Page Geometry

### The `@page` Rule

```css
/* Default page (body copy) */
@page {
  size: A4; /* 210mm × 297mm */
  margin: 20mm 20mm 25mm 20mm; /* top right bottom left */
}

/* Named page — cover */
@page cover {
  size: A4;
  margin: 0; /* full bleed cover */
}

/* Named page — landscape */
@page landscape {
  size: A4 landscape; /* 297mm × 210mm */
  margin: 15mm;
}
```

Apply named pages to elements:
```css
.page-cover { page: cover; break-before: page; }
.page-section { page: body; break-before: page; }
```

### Margin Boxes (Running Headers/Footers)

CSS Paged Media defines 16 margin box areas. The most useful:

```css
@page body {
  @top-center {
    content: string(section-title); /* auto-updated via string-set */
    font-size: 9pt;
    color: #6b7280;
  }
  @bottom-right {
    content: counter(page) " / " counter(pages);
    font-size: 9pt;
  }
  @bottom-left {
    content: "Lumina SaaS · Confidential";
    font-size: 9pt;
    color: #9ca3af;
  }
}

/* Set the string that running header picks up */
h1 { string-set: section-title content(); }
```

### Standard Dimensions Reference

| Format | Trim size | Artboard (+ 3mm bleed) |
|--------|-----------|------------------------|
| A4 portrait | 210 × 297mm | 216 × 303mm |
| A4 landscape | 297 × 210mm | 303 × 216mm |
| Business card | 85 × 54mm | 91 × 60mm |
| DL brochure panel | 99 × 210mm | 105 × 216mm |
| US Letter | 216 × 279mm | 222 × 285mm |

---

## Bleed, Trim, and Safe Zone

Bleed prevents white edges after cutting (cutting machines have ±1–2mm tolerance).

```
┌─────────────────────────────┐  ← bleed edge (artboard edge)
│  3mm bleed                  │
│  ┌───────────────────────┐  │  ← trim line (final cut)
│  │  3mm safe zone        │  │
│  │  ┌─────────────────┐  │  │  ← safe zone inner edge
│  │  │  LIVE CONTENT   │  │  │    (text, logos, key elements)
│  │  └─────────────────┘  │  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
└─────────────────────────────┘
```

**CSS implementation:**

```css
:root {
  --trim-w: 210mm;
  --trim-h: 297mm;
  --bleed: 3mm;
  --safe: 3mm;
  /* Artboard = trim + bleed on both sides */
  --artboard-w: calc(var(--trim-w) + 2 * var(--bleed));
  --artboard-h: calc(var(--trim-h) + 2 * var(--bleed));
}

/* Guide marks — screen only, never print */
@media screen {
  .artboard {
    width: var(--artboard-w);
    height: var(--artboard-h);
    outline: 1px solid #e5e7eb;
    position: relative;
  }
  .trim-line {
    position: absolute;
    inset: var(--bleed);
    border: 1px dashed #9ca3af;
    pointer-events: none;
  }
  .safe-zone {
    position: absolute;
    inset: calc(var(--bleed) + var(--safe));
    border: 1px dotted #d1d5db;
    pointer-events: none;
  }
}
```

**Backgrounds extend to bleed edge:**
```css
.page-background {
  /* Negative margin pulls background to artboard edge */
  margin: calc(-1 * var(--bleed));
  padding: var(--bleed);
  background-color: #1e3a5f;
}
```

---

## CMYK Color Management

Browser CSS uses `rgb()` / hex. Print presses use CMYK. They do not convert 1:1 — a pure blue (`#0000ff` = C:100 M:100 Y:0 K:0 in CMYK) will print as purple, not blue.

**Document CMYK values in CSS comments:**

```css
:root {
  /* Lumina Navy — C:88 M:74 Y:0 K:22 → nearest safe hex */
  --brand-navy: #1e3a5f;
  /* Lumina Orange — C:0 M:50 Y:100 K:0 → nearest safe hex */
  --brand-orange: #ff8000;
  /* Process Black — C:0 M:0 Y:0 K:100 → true black */
  --text-black: #000000;
  /* Rich Black (for large areas) — C:60 M:40 Y:40 K:100 */
  --bg-rich-black: #0a0a0a;
}
```

**Preflight flag:** Any `rgb()`, `hsl()`, or hex that hasn't been cross-checked against CMYK breakdown should be flagged in a preflight comment: `/* ⚠️ CMYK not verified */`.

**Spot colors and Pantone:** When exact color matching is required (brand standards), note the Pantone equivalent in a comment: `/* Pantone 286 C */`. CSS cannot output spot colors — flag for prepress team.

---

## Typography for Print

Print typography differs from screen typography in two major ways: (1) print DPI is 300–2400 (vs 72–300 screen), so subpixel rendering doesn't exist — fine lines are sharp; (2) print readers tend toward longer uninterrupted reading, so comfort metrics matter more.

**Type scale for A4 body text:**
```css
@media print {
  body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 10pt;          /* ~13px — minimum comfortable for body */
    line-height: 1.5;         /* 15pt leading */
    color: #000000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1 { font-size: 24pt; line-height: 1.2; margin-bottom: 12pt; }
  h2 { font-size: 18pt; line-height: 1.25; margin-bottom: 8pt; }
  h3 { font-size: 14pt; line-height: 1.3; margin-bottom: 6pt; }
  caption, .footnote { font-size: 8pt; line-height: 1.4; }
}
```

**Widows and orphans (critical — frequently missed):**
```css
p {
  widows: 3;   /* minimum lines at top of new page */
  orphans: 3;  /* minimum lines at bottom of page before break */
}
```

**Minimum font sizes by artifact:**
- Body copy: 9pt (absolute minimum), 10–11pt preferred
- Captions: 8pt
- Legal/fine print: 6pt (absolute minimum)
- Labels on business cards: 7pt minimum

---

## Print-to-Web CSS

Single stylesheet with `@media print` block — no duplicate file needed.

```css
/* Screen styles (full UI) */
nav, .sidebar, .header, .footer-nav, .cta-banner { display: block; }

/* Print overrides */
@media print {
  /* Hide non-print elements */
  nav, .sidebar, .header, .footer-nav, .cta-banner,
  .cookie-banner, .chat-widget, button:not(.print-include) {
    display: none !important;
  }

  /* Expand URLs */
  a[href]::after {
    content: " (" attr(href) ")";
    font-size: 8pt;
    color: #6b7280;
  }
  /* Don't expand internal anchors or mailto */
  a[href^="#"]::after,
  a[href^="mailto:"]::after { content: ""; }

  /* Force black text (avoid color ink waste on text) */
  body { color: #000000 !important; }

  /* Page breaks */
  h1, h2 { break-before: auto; break-after: avoid; }
  figure, table, .chart-container { break-inside: avoid; }
}
```

---

## Output Formats

| Format | Use case | Key constraint |
|--------|----------|----------------|
| **PDF/X-1a** | Commercial print (brochures, packaging) | CMYK only, no transparency, all fonts embedded |
| **PDF/X-4** | Commercial print with transparency (shadows, overlays) | Supports transparency and ICC color profiles |
| **PDF (standard)** | Digital distribution, office printing | RGB OK, transparency OK |
| **HTML + @media print** | Web-to-print, browser-rendered PDF | Rendered by Chrome/Chromium; supports CSS Paged Media partially |

**Font embedding note:** System fonts (Arial, Helvetica, Times New Roman) are installed on the reader's machine but may not embed in PDF when using CSS-to-PDF workflows. Always declare fonts with `@font-face`:

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: block; /* block flash of unstyled text */
}
```

---

## QA Checklist

- [ ] Bleed defined and ≥ 3mm on all edges (or documented as N/A for digital-only)
- [ ] Safe zone: live content (text, logos) at least 3mm inside trim
- [ ] All background elements extend to bleed edge
- [ ] CMYK values documented in CSS comments for all brand colors
- [ ] No RGB-only colors that haven't been CMYK-verified
- [ ] All fonts declared with `@font-face` (no reliance on system fonts alone)
- [ ] Minimum font sizes met: body 9pt+, captions 8pt+, legal 6pt+
- [ ] `widows: 3; orphans: 3` set on body copy
- [ ] `break-before: page` on all major section starts
- [ ] `break-inside: avoid` on figures, tables, code blocks
- [ ] `print-color-adjust: exact` on elements with background colors
- [ ] Guide marks (trim lines, safe zone indicators) hidden in `@media print`
- [ ] Preflight checklist output at end of every generated artifact

---

## Handoffs

- **→ UI Designer**: When a print template needs a companion web/app version — they adapt the layout to screen constraints. Print and screen share tokens but not layout rules.
- **→ Design System Lead**: When brand CMYK values need to be formally documented in the design token system. They own the source of truth for brand color definitions.
- **→ Brand Strategist**: When print artifact requires brand architecture decisions (which logo variant, which color expression, which typeface) — Print Designer executes, Brand Strategist defines.
- **→ Design Manager**: Flag when the brief requires professional prepress work (spot colors, die-cuts, special finishes like foil or embossing) — CSS cannot express these; a professional print production workflow is needed.

---

## Advanced Patterns

### Multi-Page Document Flow

Named page sections let each chapter type have its own `@page` rule:

```css
.cover   { page: cover;   break-before: page; }
.toc     { page: toc;     break-before: page; }
.chapter { page: body;    break-before: page; }
.back    { page: back;    break-before: page; }

@page cover { size: A4; margin: 0; }
@page toc   { size: A4; margin: 20mm; @top-center { content: "Contents"; } }
@page body  {
  size: A4; margin: 20mm 20mm 25mm 20mm;
  @top-right   { content: string(chapter-title); font-size: 9pt; }
  @bottom-right { content: counter(page); font-size: 9pt; }
}
```

Auto-capture running header text: `h1 { string-set: chapter-title content(); }`

### Variable Data Printing (VDP)

Personalized print (award certificates, letters, name badges) uses CSS custom properties as data tokens:

```css
/* Template declares tokens — replaced via JS at render time */
:root {
  --recipient-name: "Recipient Name";
  --course-title: "Course Title";
  --issue-date: "Date";
}
```

For JS-rendered VDP: set `document.documentElement.style.setProperty('--recipient-name', data.name)` before calling `window.print()`. To display the value in the layout, target the element directly: `.recipient::before { content: var(--recipient-name); }`. QR/barcode: use a fixed-size `<div data-barcode="{{ barcode_value }}">` — populate via JS before print.

### Responsive → Print Degradation

One stylesheet, not two:

```css
/* Screen: full UI with nav, sidebar, interactivity */
.nav, .sidebar { display: flex; }
.print-only { display: none; }

@media print {
  .nav, .sidebar, .cta, button { display: none !important; }
  .print-only { display: block; }
  /* Expand URLs for printed links */
  a[href]::after { content: " (" attr(href) ")"; font-size: 8pt; color: #6b7280; }
  a[href^="#"]::after, a[href^="mailto:"]::after { content: ""; }
  /* Force backgrounds to print */
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```

### Bleed-Aware Image Placement

```css
.full-bleed-image {
  /* Pull image to artboard edge on all sides */
  margin: calc(-1 * var(--bleed));
  width: calc(100% + 2 * var(--bleed));
  max-width: none;
  display: block;
  object-fit: cover;
}
/* Never use border-radius on bleed-edge elements */
```

---

## Full Coverage

### Artifact Type Scenarios

**Invoice (A4, single-page)**
Page: `210 × 297mm`, trim. Artboard: `216 × 303mm`. Margins: 20mm.
Structure: logo header (left) + invoice number/date (right) → client address block → itemized `<table>` (item, qty, unit price, total; alternating row shading) → subtotal/tax/total footer block → payment terms + bank details. `widows: 2; orphans: 2` on table rows. No bleed needed (digital distribution typical) but document as N/A in preflight.

**Annual Report (multi-page)**
Named pages: cover (full-bleed, `margin: 0`) → TOC → body sections → back cover. Cover: hero background extends to artboard edge; title H1 at 36pt, brand name at 14pt, year at 12pt. TOC: 2-column layout, dot leaders via `leader(dotted)` in `@page` context or CSS fallback (flex + `border-bottom: 1px dotted`). Body sections: running header (`string-set` on H1), page numbers (`counter(page)`), pull quotes (`border-left: 4px solid var(--brand-orange); padding-left: 16pt`). Charts: `break-inside: avoid`.

**Certificate (landscape A4)**
Page: `297 × 210mm` landscape. Bleed: 3mm. SVG decorative border extending to bleed edge (never `border-radius` at bleed edge). Variable recipient name: `font-size: 36pt; font-family: 'Playfair Display', Georgia, serif; text-align: center`. Issuer logo centered. Date field `font-size: 12pt`. Two signature lines: `border-top: 1pt solid #000; width: 180pt; display: inline-block`. `page: landscape; break-before: page`.

**Marketing Brochure (tri-fold DL)**
6 panels: 3 outside (front cover, spine, back) + 3 inside. Each panel: `99 × 210mm`. Inside spread flows as a single `297mm` wide content area across 3 panels. CSS: `.brochure-inside { width: 297mm; display: grid; grid-template-columns: repeat(3, 99mm); }`. Fold guide marks at 99mm and 198mm (`@media screen` only, `border-left: 1px dashed`). All backgrounds extend to bleed edge.

**Business Card (85 × 54mm)**
Artboard: `91 × 60mm`. Two faces (front/back) as separate `<div class="face face--front">` / `<div class="face face--back">`. Front: logo (top-left, safe zone), name (12pt bold), title (9pt), phone/email (8pt), safe zone 3mm inside trim. Back: solid brand color or pattern, extends to bleed edge. Minimum font: 7pt (absolute floor). All text inside safe zone.

**Product Packaging (custom dieline)**
Bleed on all 6 faces. Barcode: placed on bottom face, 10mm from nearest edge, minimum size 31.35 × 22.85mm (EAN-13 standard). Required regulatory text: 6pt minimum, placed in designated legal panel. Fold/glue tab areas (flaps): marked as `@media screen` only guide marks; no live content in tab areas. `break-inside: avoid` on each face.

### Common Failure States

**Missing bleed** — background stops at trim edge; white gap after cutting:
```css
/* Wrong */
.page-bg { background: #1e3a5f; }

/* Right — extends to artboard edge */
.page-bg {
  margin: calc(-1 * var(--bleed));
  padding: var(--bleed);
  background: #1e3a5f;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
```

**RGB colors in print output** — `rgb(0, 0, 255)` prints as purple, not blue:
Document every brand color with its CMYK breakdown in a comment. Flag any undocumented hex as `/* ⚠️ CMYK not verified */`. The press operator cannot fix undocumented RGB → CMYK conversions after file submission.

**Font non-embedding** — Arial, Helvetica, Times New Roman are on every OS but may not embed in CSS-to-PDF workflows. A PDF with non-embedded fonts will render incorrectly when opened on a machine with different system fonts:
```css
/* Wrong — relies on system font */
body { font-family: Arial, sans-serif; }

/* Right — embed via @font-face */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: block;
}
body { font-family: 'Inter', Arial, sans-serif; }
```

---

## Reference-Sourced Insights

### CSS Paged Media: `@page` and Named Pages (W3C / MDN)

The `@page` rule is a CSS at-rule that applies styles to a printed page box, not a DOM element. `size` accepts: paper keywords (`A4`, `letter`, `legal`), explicit dimensions (`210mm 297mm`), and orientation keywords (`portrait`, `landscape`). The `margin` property on `@page` defines the margin boxes — the space outside the page content area where running headers/footers live.

Named pages work by assigning a page type to a DOM element (`page: cover`) — the browser creates a new page of that named type when it encounters the element. Browsers with full CSS Paged Media support (Prince, Vivliostyle, WeasyPrint) implement `counter(page)`, `string-set`, and margin box content. Chrome/Chromium supports `size`, `margin`, and basic `counter(page)` but not `string-set` or margin box content as of 2024 — use WeasyPrint or Paged.js polyfill for advanced running headers.

### `print-color-adjust` (MDN)

By default, browsers omit background colors and images from print to save ink. `print-color-adjust: exact` (standard, with `-webkit-` prefix for older Safari) forces the browser to print background colors and images exactly. Apply to any element that must show a background color in print: colored table rows, chart bars, decorative section backgrounds. Without it, a navy header section prints as white.

### Bleed and Safe Zone Standards (ISO 12647 / Print industry standard)

3mm bleed is the de facto standard for commercial offset printing worldwide (ISO 12647-2). Some printers require 5mm for large-format or packaging. Always confirm with the print vendor before finalizing. The safe zone is not a formal standard but an industry convention — 3mm inside trim is universal; some vendors recommend 5mm for business cards (where cutting machines are less precise). File submission formats: PDF/X-1a is the safest cross-vendor format (eliminates transparency issues, embeds all fonts, restricts to CMYK). PDF/X-4 is preferred when designs use transparency or ICC color profiles.

---

## Quality Contract

### Red flags

- Print dimensions are in px or rem instead of mm or pt.
- Backgrounds stop at the trim line instead of extending into the 3mm bleed.
- Brand colors are given only as hex, with no CMYK breakdown.
- Fonts are named by system font only, with no `@font-face`, so the PDF may not embed them.
- Tables, figures or headings break across pages.

### Excuses to reject

| Excuse | Rebuttal |
|---|---|
| "It'll mostly be viewed as a PDF." | Then mark bleed as N/A in the preflight on purpose, not by leaving it out. |
| "The printer will convert the colors." | Conversion at the press shifts brand colors unpredictably. Specify CMYK up front. |
| "Arial is on every machine." | A font being installed doesn't mean it's embedded. Declare fonts so the PDF carries them. |

### Evidence of done

- A preflight block at the end of the artifact covering bleed, safe zone, color mode, fonts and minimum sizes.
- An `@page` rule with the physical page size and margins, plus named pages where they're used.
- CMYK values commented next to every brand color.
- A print preview or PDF check showing no split tables or figures and no live content in the trim zone.
