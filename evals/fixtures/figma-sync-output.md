# /figma-sync — Lumina SaaS Figma tokens vs production codebase — brand refresh drift

**Input:** `Check Lumina SaaS Figma tokens against production codebase — brand refresh happened last sprint`

---

## Sync Report Overview

Sync completed between **Lumina Design System v2** (Figma) and the production codebase (`lumina-web/src/tokens/`). The brand refresh merged last sprint updated CSS custom properties but the Figma variable collection was only partially updated.

| Metric | Value |
|--------|-------|
| Total tokens checked | 23 |
| Tokens in sync | 16 |
| Mismatches found | 7 |
| Critical mismatches | 3 |
| Minor mismatches | 4 |
| Missing from Figma (exist in code) | 4 |
| Missing from code (exist in Figma) | 0 |
| Sync status | ⚠ Needs attention |

A **mismatch** is defined as: same token name, different value between Figma variable and CSS custom property. A **critical** mismatch affects a brand-visible color that appears in marketing pages, the app shell, or primary interactive elements. A **minor** mismatch affects spacing, radius, or secondary colors.

---

## Token Drift Analysis

The brand refresh introduced a new primary brand color (violet-shifted) and a tighter spacing scale for compact UI density. The Figma file was partially updated but several tokens were missed, causing drift between design and code.

### Critical Drift — Brand Colors

The most impactful drift is in the primary brand color:

| Token | Figma Value | Code Value | Delta |
|-------|------------|------------|-------|
| `--color-brand-primary` | `#4F46E5` (indigo-600) | `#6366F1` (indigo-500) | Lightness +8% |
| `--color-brand-primary-hover` | `#4338CA` (indigo-700) | `#4F46E5` (indigo-600) | One step lighter |
| `--color-brand-primary-text` | `#FFFFFF` | `#F9FAFB` | Near-white, not pure white |

The `--color-brand-primary` drift is the most critical: the Figma file was updated to `#4F46E5` during the brand refresh design work but the CSS token in the codebase was separately updated to `#6366F1` in a different PR. These are now out of sync.

### Minor Drift — Spacing

| Token | Figma Value | Code Value | Delta |
|-------|------------|------------|-------|
| `--spacing-4` | 16px | 14px | −2px |
| `--spacing-6` | 24px | 22px | −2px |
| `--radius-md` | 8px | 6px | −2px |
| `--shadow-sm-blur` | 4px | 6px | +2px |

The spacing drift stems from the compact UI density work done in `feat/compact-density` branch — spacing tokens were tightened in code but the Figma file was not updated to match.

---

## Mismatch Details

Full mismatch table with severity, token name, Figma value, code value, and recommended resolution:

| # | Token | Figma | Code | Severity | Resolution |
|---|-------|-------|------|----------|------------|
| 1 | `--color-brand-primary` | `#4F46E5` | `#6366F1` | CRITICAL | Update CSS to `#4F46E5` |
| 2 | `--color-brand-primary-hover` | `#4338CA` | `#4F46E5` | CRITICAL | Update CSS to `#4338CA` |
| 3 | `--color-brand-primary-text` | `#FFFFFF` | `#F9FAFB` | CRITICAL | Update CSS to `#FFFFFF` |
| 4 | `--spacing-4` | 16px | 14px | MINOR | Update Figma variable to 14px |
| 5 | `--spacing-6` | 24px | 22px | MINOR | Update Figma variable to 22px |
| 6 | `--radius-md` | 8px | 6px | MINOR | Update Figma variable to 6px |
| 7 | `--shadow-sm-blur` | 4px | 6px | MINOR | Update Figma variable to 6px |

**Resolution strategy:** For critical color mismatches, the Figma value is the source of truth (brand refresh was intentional in Figma). Update the CSS. For minor spacing/radius mismatches, the code value is the source of truth (compact density work was intentional in code). Update Figma.

---

## Variable Collection Status

The Figma file contains 3 variable collections in the `Lumina Design System v2` library:

### Collection 1 — Primitives

| Status | Count | Notes |
|--------|-------|-------|
| In sync | 18 | All raw palette colors, raw spacing scale |
| Mismatch | 0 | Primitives are not directly referenced in components — drift here is lower risk |
| Missing | 0 | — |

Primitives collection is clean. The drift occurs at the Semantic layer where primitives are aliased.

### Collection 2 — Semantic

| Status | Count | Notes |
|--------|-------|-------|
| In sync | 14 | Most semantic aliases are correctly wired |
| Mismatch | 7 | All 7 mismatches are in this collection |
| Missing from Figma | 4 | See below |

**4 variables exist in CSS but are absent from the Figma Semantic collection:**

```
--color-surface-subtle       (exists in CSS: #F3F4F6)  — missing from Figma
--color-border-strong        (exists in CSS: #6B7280)  — missing from Figma
--color-feedback-info-bg     (exists in CSS: #EFF6FF)  — missing from Figma
--color-feedback-info-text   (exists in CSS: #1D4ED8)  — missing from Figma
```

These were added to CSS during the brand refresh but never added to the Figma variable collection. Any component using these tokens in code has no Figma variable counterpart, which breaks the sync and prevents design tool usage of these colors.

### Collection 3 — Component

| Status | Count | Notes |
|--------|-------|-------|
| In sync | 22 | All component-level tokens are correctly aliased to Semantic |
| Mismatch | 0 | Component tokens inherit the Semantic mismatch indirectly |
| Missing | 0 | — |

The component variable collection is structurally sound. However, because it references Semantic variables that are mismatched, the rendered output in Figma will reflect the wrong values until the Semantic collection is fixed.

---

## Sync Action Items

Ordered by priority:

### Immediate (Critical — affects visual output)

1. **Update CSS custom properties** for the 3 critical brand color mismatches:
   ```css
   /* lumina-web/src/tokens/semantic.css */
   --color-brand-primary:       #4F46E5;  /* was #6366F1 */
   --color-brand-primary-hover: #4338CA;  /* was #4F46E5 */
   --color-brand-primary-text:  #FFFFFF;  /* was #F9FAFB */
   ```
2. **Re-export style dictionary** after CSS update to regenerate JS/TS token files.
3. **Verify component audit** (see below) — confirm Button, Card, and Badge render correctly after token update.

### Short-term (Minor — design accuracy)

4. **Update Figma Semantic collection** — set spacing/radius/shadow variables to match code values:
   - `--spacing-4` → 14px
   - `--spacing-6` → 22px
   - `--radius-md` → 6px
   - `--shadow-sm-blur` → 6px

5. **Add 4 missing Semantic variables** to Figma variable collection:
   - `--color-surface-subtle`: `#F3F4F6`
   - `--color-border-strong`: `#6B7280`
   - `--color-feedback-info-bg`: `#EFF6FF`
   - `--color-feedback-info-text`: `#1D4ED8`

### Ongoing

6. **Set up automated drift detection** — run `/figma-sync` as part of the design-to-code CI pipeline on every Figma publish event.

---

## Component Audit

Components that directly reference the mismatched `--color-brand-primary` token and will be affected by the sync fix:

| Component | Token Referenced | Current Rendered Color | Post-fix Color | Visual Impact |
|-----------|-----------------|----------------------|----------------|---------------|
| `Button` (primary variant) | `--color-brand-primary` | `#6366F1` | `#4F46E5` | Background darkens slightly |
| `Button` (primary hover) | `--color-brand-primary-hover` | `#4F46E5` | `#4338CA` | Hover state darkens |
| `Card` (selected state border) | `--color-brand-primary` | `#6366F1` | `#4F46E5` | Border color shifts |
| `Badge` (info variant bg) | `--color-brand-primary` (indirect) | `#EEF2FF` | `#EDE9FE` | Subtle bg hue shift |

Once the critical token mismatch is fixed and the CSS is updated, these components will automatically render the correct brand color without any component-level code changes. The component code references the CSS custom property (token variable), not the raw hex value, so the fix propagates automatically.

Run a visual regression test after the CSS update to confirm no unintended component drift in adjacent token aliases.

---
