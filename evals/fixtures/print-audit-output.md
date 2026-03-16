# /print-audit output — Lumina SaaS Invoice

**Input:** Invoice HTML for Lumina SaaS — A4, single-page. Issues: no bleed definition, RGB brand colors, system fonts only, no page break rules. Brand context provided: Lumina navy (#1e3a5f), orange (#ff8000), Inter typeface.

---

## Phase 1 — Preflight Audit

**bleed + safe-zone check**

❌ **bleed:** Not defined. `.invoice-wrapper { background: #1e3a5f; }` stops at the element content edge — no artboard or bleed setup. A 3mm white gap will appear on all edges after cutting.
   Fix: Set artboard to trim + 6mm (`216 × 303mm` for A4). Apply `position: absolute; inset: 0` to the background layer.

❌ **safe-zone:** No explicit safe zone constraints. Logo placed at `padding: 5mm` from page edge — less than the 6mm minimum (bleed + safe) required.
   Fix: Constrain all live content inside `.content-area { margin: 6mm; }`.

---

**cmyk color audit**

❌ **cmyk:** 3 undocumented color values found:
- `background: #1e40af` — no CMYK documentation. Web blue; converts to C:93 M:78 Y:0 K:10, may shift from intended Lumina navy.
- `color: rgb(234, 88, 12)` — RGB notation used directly. Replace with hex + CMYK comment.
- `border-color: #e5e7eb` — undocumented.

Fix:
```css
:root {
  --brand-navy:   #1e3a5f;  /* C:88 M:74 Y:0  K:22 */
  --brand-orange: #ff8000;  /* C:0  M:50 Y:100 K:0  */
  --border-gray:  #e5e7eb;  /* C:0  M:0  Y:0   K:10 */
}
```

---

**font-embed audit**

❌ **font-embed:** `font-family: Arial, sans-serif` — no `@font-face` declaration found. Arial may not embed in CSS-to-PDF workflows.

Fix:
```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: block;
}
body { font-family: 'Inter', Arial, sans-serif; }
```

---

**page-break + flow audit**

❌ **page-break:** No `break-inside`, `widows`, or `orphans` rules. Multi-line tables can split across pages.

Fix:
```css
.invoice-table { break-inside: avoid; }
p { widows: 2; orphans: 2; }
```

---

## Phase 2 — brand-fit Review

Brand context provided (Lumina navy #1e3a5f, orange #ff8000, Inter typeface).

**brand-fit findings:**

✅ **Color direction**: Navy header consistent with Lumina brand primary.
❌ **Color accuracy**: Header uses `#1e40af` instead of Lumina navy `#1e3a5f`. Diverges on press.
❌ **Typography**: `Arial` used instead of brand typeface Inter.
✅ **Hierarchy**: Invoice number and date right-aligned against logo — correct.

---

## rewrite

```css
/* rewrite — Phase 1 + Phase 2 fixes applied */

@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: block; /* print/PDF: ensures font loads before capture */
}

:root {
  /* FIX: Replaced #1e40af with Lumina navy — CMYK-verified */
  --brand-navy:   #1e3a5f;  /* C:88 M:74 Y:0 K:22 */
  --brand-orange: #ff8000;  /* C:0 M:50 Y:100 K:0 */
  --border-gray:  #e5e7eb;  /* C:0 M:0 Y:0 K:10 */
  --bleed: 3mm;
  --safe:  3mm;
}

/* FIX: Background extends to bleed edge via two-layer architecture */
.invoice-bg {
  position: absolute;
  inset: 0;
  background: var(--brand-navy);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* FIX: Content constrained inside safe zone */
.content-area {
  position: absolute;
  inset: calc(var(--bleed) + var(--safe));
  font-family: 'Inter', Arial, sans-serif;
}

/* FIX: Page break protection */
.invoice-table { break-inside: avoid; }
p { widows: 2; orphans: 2; }
```
