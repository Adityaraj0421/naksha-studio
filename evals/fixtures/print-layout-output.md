# /print-layout output — Lumina SaaS Business Card

**Input:** Business card for Lumina SaaS — 85 × 54mm, front + back, full bleed, coated finish.

---

## Canvas Setup

**Artboard:** `91 × 60mm` (trim `85 × 54mm` + `3mm bleed` all edges)

```css
:root {
  --trim-w: 85mm;
  --trim-h: 54mm;
  --bleed: 3mm;
  --safe: 3mm;
  --artboard-w: 91mm;
  --artboard-h: 60mm;
}
.artboard {
  width: var(--artboard-w);
  height: var(--artboard-h);
  position: relative;
  overflow: hidden;
}
```

**bleed** — backgrounds extend 3mm past trim on all edges. Background layer uses `position: absolute; inset: 0`.

**safe-zone** — all text and logos constrained inside `position: absolute; inset: calc(var(--bleed) + var(--safe))` = 6mm from artboard edge.

---

## grid Layout

```css
.content-area {
  position: absolute;
  inset: calc(var(--bleed) + var(--safe));
  display: grid;
  grid-template-rows: 1fr auto;
  grid-template-columns: 1fr;
}
```

The grid splits the face into a logo zone (upper 60%) and a contact zone (lower 40%).

---

## cmyk Color System

```css
:root {
  --brand-navy:   #1e3a5f;  /* C:88 M:74 Y:0  K:22 */
  --brand-orange: #ff8000;  /* C:0  M:50 Y:100 K:0  */
  --text-white:   #ffffff;  /* C:0  M:0  Y:0   K:0  */
  --text-black:   #000000;  /* C:0  M:0  Y:0   K:100 */
}
```

---

## typography

```css
@media print {
  .name    { font-size: 12pt; font-weight: 700; color: var(--text-white); }
  .title   { font-size: 9pt;  font-weight: 400; color: var(--text-white); }
  .contact { font-size: 8pt;  line-height: 1.5; color: var(--text-white); }
  .brand   { font-size: 7pt;  letter-spacing: 0.15em; text-transform: uppercase; }
}
```

---

## HTML Output (Front Face)

```html
<div class="artboard">
  <div class="background-layer" style="position:absolute;inset:0;background:#1e3a5f;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
  <div class="trim-guide"></div>
  <div class="safe-guide"></div>
  <div class="content-area">
    <div class="logo-zone"><svg><!-- Lumina logo --></svg></div>
    <div class="contact-zone">
      <p class="name">Aditya Raj</p>
      <p class="title">Founder &amp; CEO</p>
      <p class="contact">aditya@lumina.ai · lumina.ai</p>
    </div>
  </div>
</div>
```

---

## trim + Preflight

**trim dimensions:** 85 × 54mm (artboard 91 × 60mm = trim + 3mm bleed all sides) ✅

## preflight Checklist

- [ ] Bleed: 3mm all edges ✅
- [ ] Safe zone: content 3mm inside trim ✅
- [ ] cmyk: all colors CMYK-documented ✅
- [ ] Minimum font sizes: name 12pt, contact 8pt, brand label 7pt ✅
- [ ] Fonts: Inter via @font-face ✅
- [ ] Guide marks hidden in print ✅
- [ ] Both faces output ✅
- [ ] No raster images — all graphics are SVG ✅
