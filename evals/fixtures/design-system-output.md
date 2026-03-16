# /design-system — Lumina Design Tokens

**Prompt:** Extract and formalize a design system from the Lumina SaaS analytics landing page.

Mode: **C — Extract from Existing Code** (plus Mode A expansion for full 3-tier system)

---

## Token Architecture

Three-tier system following the Design System Lead methodology:

```
Tier 1 — Primitives:  raw values (shade scales, spacing steps, type scale)
Tier 2 — Semantic:    purpose-mapped tokens (primary, surface, text, status)
Tier 3 — Component:   component-scoped tokens (button, card, input, nav)
```

---

## Primitive Tokens

### Color Primitives

```css
:root {
  /* Navy scale */
  --navy-50:  #EEF2F7;
  --navy-100: #D5E0ED;
  --navy-200: #ACC2DB;
  --navy-300: #82A3C8;
  --navy-400: #5885B5;
  --navy-500: #1E3A5F;  /* brand primary */
  --navy-600: #1A3356;
  --navy-700: #152B47;
  --navy-800: #102237;
  --navy-900: #0B1928;
  --navy-950: #06101A;

  /* Blue (accent) scale */
  --blue-50:  #EFF6FF;
  --blue-100: #DBEAFE;
  --blue-400: #60A5FA;
  --blue-500: #3B82F6;
  --blue-600: #2563EB;
  --blue-700: #1D4ED8;

  /* Neutral scale */
  --neutral-50:  #F9FAFB;
  --neutral-100: #F3F4F6;
  --neutral-200: #E5E7EB;
  --neutral-300: #D1D5DB;
  --neutral-400: #9CA3AF;
  --neutral-500: #6B7280;
  --neutral-600: #4B5563;
  --neutral-700: #374151;
  --neutral-800: #1F2937;
  --neutral-900: #111827;
}
```

### Typography Primitives

```css
:root {
  --font-family-base: 'Inter', system-ui, sans-serif;

  /* Type scale */
  --font-size-xs:   0.75rem;   /* 12px */
  --font-size-sm:   0.875rem;  /* 14px */
  --font-size-base: 1rem;      /* 16px */
  --font-size-lg:   1.125rem;  /* 18px */
  --font-size-xl:   1.25rem;   /* 20px */
  --font-size-2xl:  1.5rem;    /* 24px */
  --font-size-3xl:  1.875rem;  /* 30px */
  --font-size-4xl:  2.25rem;   /* 36px */
  --font-size-5xl:  3rem;      /* 48px */
  --font-size-hero: 3.5rem;    /* 56px */

  /* Font weights */
  --font-weight-regular:  400;
  --font-weight-medium:   500;
  --font-weight-semibold: 600;
  --font-weight-bold:     700;
}
```

### Spacing Primitives (8px base grid)

```css
:root {
  --space-1: 4px;    --space-2: 8px;    --space-3: 12px;
  --space-4: 16px;   --space-5: 20px;   --space-6: 24px;
  --space-8: 32px;   --space-10: 40px;  --space-12: 48px;
  --space-16: 64px;  --space-20: 80px;  --space-24: 96px;
}
```

---

## Semantic Tokens

```css
:root {
  /* Interactive */
  --color-action:       var(--blue-500);
  --color-action-hover: var(--blue-600);

  /* Surfaces */
  --color-bg:           var(--neutral-50);
  --color-surface:      #FFFFFF;
  --color-surface-alt:  var(--neutral-100);

  /* Text */
  --color-text-primary:   var(--neutral-900);
  --color-text-secondary: var(--neutral-500);
  --color-text-disabled:  var(--neutral-400);
  --color-text-inverse:   #FFFFFF;

  /* Brand */
  --color-brand-primary: var(--navy-500);
  --color-brand-accent:  var(--blue-500);

  /* Status */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error:   #EF4444;
  --color-info:    var(--blue-500);

  /* Typography semantic */
  --text-hero:    var(--font-size-hero) / 1.1  var(--font-weight-bold);
  --text-heading: var(--font-size-4xl) / 1.2   var(--font-weight-semibold);
  --text-body:    var(--font-size-base) / 1.6  var(--font-weight-regular);
  --text-caption: var(--font-size-sm) / 1.4    var(--font-weight-medium);
}
```

---

## Component Tokens

### Button

```css
:root {
  --btn-height-sm: 32px;
  --btn-height-md: 40px;
  --btn-height-lg: 48px;
  --btn-padding-x: var(--space-4);
  --btn-radius:    8px;
  --btn-font-size: var(--font-size-sm);
  --btn-font-weight: var(--font-weight-semibold);

  /* Primary variant */
  --btn-primary-bg:    var(--color-action);
  --btn-primary-text:  var(--color-text-inverse);
  --btn-primary-hover: var(--color-action-hover);
}
```

### Card

```css
:root {
  --card-padding:  var(--space-6);
  --card-radius:   12px;
  --card-shadow:   0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06);
  --card-border:   1px solid var(--neutral-200);
  --card-bg:       var(--color-surface);
}
```

### Input

```css
:root {
  --input-height:    40px;
  --input-padding-x: var(--space-3);
  --input-radius:    8px;
  --input-border:    1px solid var(--neutral-300);
  --input-font-size: var(--font-size-base);
}
```

---

## Hardcoded Values Found (Migration Map)

During extraction, 3 hardcoded values were detected that should reference tokens:

| Location | Hardcoded | Replace with |
|----------|-----------|--------------|
| `.footer-text` | `color: #9CA3AF` | `color: var(--color-text-secondary)` |
| `.pricing-badge` | `background: #60A5FA` | `background: var(--blue-700)` |
| `.hero-section` | `padding: 88px 0` | `padding: var(--space-24) 0` (+ 2 custom) |

---

## What's Next

- `/brand-kit` — generate a complete visual brand reference page using these tokens
- `/design` — build new pages with the token system fully applied
- `/figma-sync` — keep code tokens in sync with Figma over time
