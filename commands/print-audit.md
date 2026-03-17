---
name: print-audit
description: Audit a print layout for bleed, safe zone, color mode, font embedding, and page break rules. Optionally audits brand consistency when brand context is provided.
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
triggers:
  - audit print
  - print audit
  - print review
  - review print
  - check bleed
  - preflight check
  - print preflight
  - audit layout
arguments: "<paste layout code or describe the print artifact> — <print spec and brand context if applicable>"
---

# /print-audit $ARGUMENTS

You are activating the **Print/PDF Wing** in audit mode: Print Designer running a two-phase preflight audit. Phase 1 always runs. Phase 2 (brand fit) runs only when brand context is provided.

---

## Process

### 1. Parse Input

Accept either:
- **(a) Pasted HTML/CSS** — full layout code
- **(b) Description** — written description of a print artifact and its design choices

Detect optional brand context: brand color palette, typography system, logo usage rules, or the explicit flag `"standalone"` meaning no brand context.

Extract:
- Artifact type (business card / invoice / brochure / certificate / report / other)
- Declared dimensions (or inferred from context)
- Color values (hex, rgb, hsl)
- Font declarations (`font-family`, any `@font-face` blocks)
- Page break rules (`break-before`, `break-inside`, `widows`, `orphans`)

---

### 2. Phase 1: Bleed + Safe Zone Audit

Check:
- Is bleed defined and ≥ 3mm on all edges? (Look for: `--bleed: 3mm`, negative margin pattern, artboard wider than trim by ≥ 6mm)
- Do background elements extend to the artboard/bleed edge?
- Is live content (text, logos, key imagery) inside the safe zone (≥ 3mm from trim)?

Output using this exact format (the word **bleed** and **safe-zone** must appear):
```
**bleed + safe-zone check**

✅ bleed: 3mm defined on all edges (artboard 91 × 60mm, trim 85 × 54mm)
✅ safe-zone: content area inside 3mm safe zone
```
or:
```
**bleed + safe-zone check**

❌ bleed: Not defined. Background stops at trim edge — white gap will appear after cutting.
   Fix: Set artboard to trim + 6mm (e.g., 91 × 60mm for a 85 × 54mm business card).
   Apply: .background-layer { position: absolute; inset: 0; }

❌ safe-zone: Logo at 1mm from trim edge — will be cut off.
   Fix: Move all live content to at least 3mm inside trim.
```

---

### 3. Phase 1: Color Mode Audit — cmyk

Scan all color values. Flag any that have not been CMYK-verified:
- `rgb()`, `hsl()`, and bare hex values without CMYK comments are suspect
- Pure `#0000ff` (C:100 M:100 Y:0 K:0) → prints as purple, not blue — flag as critical
- Red/green pairs without redundant encoding → colorblind risk + CMYK accuracy risk

Output (the word **cmyk** must appear in this section heading):
```
**cmyk color audit**

❌ --brand-blue: #0000ff — no CMYK documentation. Pure web blue converts to C:100 M:100 Y:0 K:0,
   which prints as purple-blue on press. Use a CMYK-safe alternative:
   --brand-blue: #2563eb; /* C:84 M:61 Y:0 K:8 — press-safe mid blue */

⚠️  3 other hex values have no CMYK documentation. Add /* C:X M:X Y:X K:X */ comments.
```

If all colors are CMYK-documented: `✅ cmyk: All brand colors have CMYK breakdown documented.`

---

### 4. Phase 1: Font Embedding Audit — font-embed

Check:
- Are fonts declared with `@font-face`?
- Are system fonts (Arial, Helvetica, Times New Roman, Georgia) used as the *sole* declaration (without `@font-face` companion)?

Output (the word **font-embed** must appear in this section heading):
```
**font-embed audit**

❌ font-embed: font-family: Arial — no @font-face declaration found.
   Arial may not embed in CSS-to-PDF workflows. Fix:
   @font-face {
     font-family: 'Inter';
     src: url('/fonts/Inter-Regular.woff2') format('woff2');
     font-weight: 400;
     font-display: block; /* print/PDF: block ensures font loads before capture; use swap only for live web */
   }
   body { font-family: 'Inter', Arial, sans-serif; }
```

If all fonts have `@font-face`: `✅ font-embed: All fonts declared with @font-face.`

---

### 5. Phase 1: Page Break + Document Flow — page-break

For single-page artifacts (business card, certificate): check that `break-inside: avoid` is set on the root layout element.
For multi-page documents: check `break-before: page` on section starts, `widows`/`orphans`, `break-inside: avoid` on figures/tables.

Output (the word **page-break** must appear in this section heading):
```
**page-break + flow audit**

❌ page-break: No break-before: page on chapter elements — sections will flow
   continuously without forced page breaks.
   Fix: .chapter { break-before: page; }

❌ page-break: widows and orphans not set.
   Fix: p { widows: 3; orphans: 3; }

✅ break-inside: avoid set on all figure and table elements.
```

---

### 6. Phase 2: Brand Fit (Conditional)

**If no brand context was provided**, output:
```
Phase 2 skipped (brand-fit audit) — No brand context provided. Describe the brand's color system and typography to audit brand consistency.
```

The word **brand-fit** must appear in this skip message. Do not run Phase 2 if brand context was not supplied.

**If brand context was provided**, run:
- **Color accuracy**: Do the CMYK values in the layout match the brand color system? Flag any deviation.
- **Typography**: Does the font choice and hierarchy match brand guidelines? Flag substitutions.
- **Logo treatment**: Is the logo in the correct variant (full color / mono / reversed)? Correct clear space?
- **Tone**: Does the visual weight match the brand personality? (editorial / functional / luxe / technical)

Output the brand-fit review with specific corrections where deviations are found.

---

### 7. Rewrite / Fix Output — rewrite

Output corrected CSS addressing all Phase 1 findings. If Phase 2 ran, include brand fit corrections as comments.

The word **rewrite** must appear in the section heading.

Format: fenced CSS block with `/* FIX: [reason] */` comments on changed lines.

```
**rewrite**

```css
:root {
  /* FIX: Replaced undocumented hex with CMYK-verified brand blue */
  --brand-primary: #1e3a5f;  /* C:88 M:74 Y:0 K:22 */

  /* FIX: Removed rgb() color — not CMYK-safe */
  --brand-accent: #ff8000;   /* C:0 M:50 Y:100 K:0 */

  --bleed: 3mm;
  --safe: 3mm;
}

/* FIX: Added @font-face to ensure font embedding in PDF export */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: block; /* print/PDF: block ensures font loads before capture; use swap only for live web */
}

.background-layer {
  /* FIX: Extended background to bleed edge via two-layer architecture */
  position: absolute;
  inset: 0; /* fills artboard including bleed — no negative margin needed */
  background: var(--brand-primary);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

p {
  /* FIX: Added widows/orphans rules — missing from original */
  widows: 3;
  orphans: 3;
}
```
```

---

### MCP Fallback

**Without Preview MCP**: Output the corrected CSS as a fenced code block. Advise: save as `.html`, open in Chrome, use File → Print → Save as PDF to verify the output.

**With Preview MCP**: Write the corrected layout to a temp file, start the preview server, confirm bleed guide marks and background coverage render correctly.

---

## What's Next

- `/pdf-report` — generate a corrected multi-page document from scratch
- `/print-layout` — rebuild the artifact from scratch using the audit findings as the brief
- `/design-review` — for screen/web design review (separate domain from print)
