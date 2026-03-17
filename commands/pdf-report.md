---
name: pdf-report
description: Generate a multi-page print-ready report or document layout with page geometry, master template, typography system, and CSS @media print + @page output.
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
triggers:
  - pdf report
  - generate report
  - annual report
  - document layout
  - print report
  - multi-page document
  - page layout
  - print document
arguments: "<subject> for <brand> — <document type and page count>"
---

# /pdf-report $ARGUMENTS

You are activating the **Print/PDF Wing** in report mode: Print Designer, producing a multi-page print-ready document with CSS `@page` geometry, named pages, master template, and a full preflight checklist.

---

## Process

### 1. Parse Input

Extract from `$ARGUMENTS`:
- **Subject** — what the report covers (e.g., "Q4 performance", "annual review", "project proposal")
- **Brand name** — used for color references and logo placement
- **Document type** — annual report / project report / proposal / invoice / other (default: annual report)
- **Page count** — specific number or "auto" (generate all necessary sections)

Identify:
- **Primary audience**: internal (colleagues) / client-facing / regulatory / public
- **Color preference**: full-color / two-color / black and white (default: full-color)

---

### 2. Page Geometry

Set up the `@page` rules for all named page types:

```css
@page { size: A4; margin: 20mm 20mm 25mm 20mm; }
@page cover { size: A4; margin: 0; }
@page toc   { size: A4; margin: 20mm; }
@page body  {
  size: A4; margin: 20mm 20mm 25mm 20mm;
  @top-right   { content: string(chapter-title); font-size: 9pt; color: #6b7280; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9pt; }
}
@page back { size: A4; margin: 0; }
```

Apply page assignments: `.cover { page: cover; }` / `.toc { page: toc; }` / `.chapter { page: body; break-before: page; }` / `.back { page: back; }`.

---

### 3. Master Template Structure

Define HTML structure for all 4 page types:
- **Cover**: full-bleed hero `<div>` (background extends to artboard edge via negative margin + `print-color-adjust: exact`), title H1, brand name, report date
- **TOC**: two-column list with leaders (use flex + `border-bottom: 1px dotted #9ca3af` as CSS workaround for `leader(dotted)`)
- **Section page**: `<header>` with H1 (sets `string-set: chapter-title content()`), body column at 60–75 chars per line, pull quote margin area
- **Back cover**: brand lockup centered, contact details, bleed background

---

### 4. Section Structure

Apply page break and flow rules:

```css
@media print {
  h1 { break-before: page; break-after: avoid; string-set: chapter-title content(); }
  h2 { break-after: avoid; }
  figure, table, .callout, .chart { break-inside: avoid; }
  p { widows: 3; orphans: 3; }
}
```

Define heading hierarchy: H1 = section title (24pt), H2 = subsection (18pt), H3 = callout (14pt).

---

### 5. Typography System

```css
@media print {
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 10pt; line-height: 1.5; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h1 { font-family: 'Inter', Arial, sans-serif; font-size: 24pt; font-weight: 700; line-height: 1.2; }
  h2 { font-family: 'Inter', Arial, sans-serif; font-size: 18pt; font-weight: 600; }
  h3 { font-family: 'Inter', Arial, sans-serif; font-size: 14pt; font-weight: 600; }
  caption, .footnote { font-size: 8pt; color: #6b7280; }
}
```

Column width: target 60–75 chars per line. For A4 with 20mm margins, single-column body at `~170mm` width ≈ 70 chars at 10pt Georgia.

---

### 6. Full CSS + HTML Output

Output a complete, self-contained HTML document with:
- `<!DOCTYPE html>` + `<html lang="en">`
- `<style>` block with all `@page` rules, screen styles, and `@media print` overrides
- Semantic section elements: `<section class="cover">`, `<section class="toc">`, `<section class="chapter">` for each section, `<section class="back">`
- All brand colors documented with CMYK breakdown in CSS comments
- VDP token comments if variable data is needed: `--recipient-name: "[REPLACE]"; /* C: recipient name */`

---

### 7. Preflight Checklist

Output this checklist at the end of every `/pdf-report` response:

```
## Print Preflight

- [ ] Bleed: defined (or N/A — digital distribution only)
- [ ] All colors CMYK-documented in CSS comments
- [ ] Fonts declared with @font-face (not relying on system fonts)
- [ ] Page breaks: break-before: page on all chapter H1s
- [ ] Widows/orphans: widows: 3; orphans: 3 set on body copy
- [ ] Page numbers: counter(page) present in @page margin box
- [ ] Running headers: string-set on H1 elements
- [ ] print-color-adjust: exact set on body (inherits to all elements)
```

---

### MCP Fallback

**Without Preview MCP**: Output the complete HTML as a fenced code block. Advise: save as `.html`, open in Chrome, use File → Print → Save as PDF. For full `@page` margin box support (running headers/footers), use WeasyPrint or Paged.js.

**With Preview MCP**: Write to a temp file, start the preview server, confirm the layout renders before outputting the final version.

---

## What's Next

- `/print-layout` — design a single-page print artifact (business card, certificate, flyer)
- `/print-audit` — audit an existing print layout for bleed, CMYK, font embedding, and page break issues
- `/design-system` — extract the typography and color tokens from this report into a reusable token set
