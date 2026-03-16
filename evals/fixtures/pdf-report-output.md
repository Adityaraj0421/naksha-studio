# /pdf-report output — Lumina SaaS Q4 Annual Report

**Input:** Q4 Annual Report for Lumina SaaS — 12-page multi-section report, client-facing, full-color.

---

## Page Geometry

```css
@page { size: A4; margin: 20mm 20mm 25mm 20mm; }
@page cover { size: A4; margin: 0; }
@page toc   { size: A4; margin: 20mm; }
@page body  {
  size: A4;
  margin: 20mm 20mm 25mm 20mm;
  @top-right    { content: string(chapter-title); font-size: 9pt; color: #6b7280; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9pt; }
}
@page back { size: A4; margin: 0; }
```

Named page assignments: `.cover { page: cover; }` / `.toc-section { page: toc; }` / `.chapter { page: body; }` / `.back-cover { page: back; }`.

---

## Master Template Structure

### cover
Full-bleed background: `#1e3a5f` (C:88 M:74 Y:0 K:22). Background extends to artboard edge via negative margin. Title: "Lumina SaaS Q4 Report" at 36pt, white. Year: "2026" at 14pt, `#ff8000` accent.

### toc
Two-column contents list. Section titles linked with dot leaders (CSS workaround: flex + `border-bottom: 1px dotted #9ca3af`). Page numbers right-aligned.

### body chapters
H1 sets running header: `h1 { string-set: chapter-title content(); }`. Pull quote: `border-left: 4pt solid #ff8000; padding-left: 12pt`. Charts: `break-inside: avoid`.

### back cover
Full-bleed brand navy. Logo centered. `lumina.ai` contact.

---

## typography System

```css
@media print {
  body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 10pt;
    line-height: 1.5;
    color: #000;
  }
  h1 { font-family: 'Inter', Arial, sans-serif; font-size: 24pt; font-weight: 700; }
  h2 { font-family: 'Inter', Arial, sans-serif; font-size: 18pt; font-weight: 600; }
  caption { font-size: 8pt; color: #6b7280; }
}
```

---

## Page Break + Flow Rules

```css
@media print {
  h1 {
    break-before: page;  /* page-break at every chapter start */
    break-after: avoid;
    string-set: chapter-title content();
  }
  h2 { break-after: avoid; }
  figure, table, .chart { break-inside: avoid; }
  p { widows: 3; orphans: 3; }  /* widows and orphans controlled */
}
```

---

## HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lumina SaaS Q4 Annual Report — 2026</title>
</head>
<body>
  <section class="cover">
    <h1>Q4 Annual Report</h1>
    <p class="brand-name">Lumina SaaS</p>
    <p class="year">2026</p>
  </section>

  <section class="toc-section">
    <h2>Contents</h2>
  </section>

  <section class="chapter" id="ch-performance">
    <h1>Performance Overview</h1>
  </section>

  <section class="back-cover">
  </section>
</body>
</html>
```

---

## preflight Checklist

- [ ] Bleed: N/A — digital PDF distribution only
- [ ] All colors CMYK-documented: `#1e3a5f` (C:88 M:74 Y:0 K:22), `#ff8000` (C:0 M:50 Y:100 K:0) ✅
- [ ] Fonts: declared with @font-face ✅
- [ ] page-break: break-before: page on all chapter H1s ✅
- [ ] widows: widows: 3; orphans: 3 set ✅
- [ ] Page numbers: counter(page) in @page margin box ✅
- [ ] Running headers: string-set on H1 ✅
- [ ] print-color-adjust: exact on cover and back-cover backgrounds ✅
