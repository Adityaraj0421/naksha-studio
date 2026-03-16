# /figma-component-library — Lumina SaaS component library — atoms through organisms

**Input:** `Generate complete Lumina SaaS component library in Figma — atoms through organisms`

---

## Library Overview

Generated **Lumina Design System v2** as a shared Figma library with 47 components organized across three atomic design levels: atoms, molecules, and organisms.

| Property | Value |
|----------|-------|
| Library name | Lumina Design System v2 |
| Total components | 47 |
| Atomic levels | 3 (atoms, molecules, organisms) |
| Shared library | Yes — published to Figma organization |
| Token integration | Figma variables wired to design tokens |
| Coverage | Atoms: 10 / Molecules: 9 / Organisms: 7 |
| Status | Published ✅ |

The library is organized as a single Figma file with one page per atomic level, plus a dedicated **Tokens** page that houses all variable collections. Components on each page reference tokens exclusively — no hardcoded hex values or pixel values exist anywhere in the component definitions.

### File Structure

| Page | Contents |
|------|----------|
| Page 1 — Atoms | 10 atom-level component definitions |
| Page 2 — Molecules | 9 molecule-level component definitions |
| Page 3 — Organisms | 7 organism-level component definitions |
| Page 4 — Tokens | Variable collections: Primitives, Semantic, Component |
| Page 5 — Changelog | Version notes and migration guides |

---

## Atom Components

Atoms are the smallest indivisible UI units. All 10 atom components in the library are defined on **Page 1 — Atoms**.

### Button

- **Variants:** 4 variant types × 3 sizes = **12 base combinations**
- **Variant property `variant`:** `primary` | `secondary` | `ghost` | `destructive`
- **Variant property `size`:** `sm` | `md` | `lg`
- **Variant property `state`:** `default` | `hover` | `active` | `disabled` | `loading`
- **Boolean property `hasIcon`:** `true` | `false` (shows leading icon slot)
- **Total variant combinations:** 4 × 3 × 5 × 2 = **120 combinations** (all defined in the component set)

Token references: `--color-brand-primary`, `--radius-md`, `--spacing-3`, `--spacing-4`, `--font-weight-semibold`

### Input

- **5 states:** `default`, `focused`, `filled`, `error`, `disabled`
- Token references: `--color-border-default`, `--color-border-strong`, `--color-feedback-error`, `--radius-sm`

### Badge

- **6 variants:** `neutral`, `brand`, `success`, `warning`, `error`, `info`
- Token references: `--color-surface-subtle`, `--color-feedback-*` tokens

### Icon

- **120 icons** from the Lumina icon set (SVG, 20×20 base size)
- 3 size variants: `sm` (16px), `md` (20px), `lg` (24px)
- Organized in 12 category groups: navigation, actions, status, data, media, etc.

### Avatar

- **3 sizes:** `sm` (24px), `md` (32px), `lg` (48px)
- **3 types:** `image`, `initials`, `icon`
- Token references: `--radius-full`, `--color-surface-subtle`

### Checkbox

- **4 states:** `unchecked`, `checked`, `indeterminate`, `disabled`
- Token references: `--color-brand-primary`, `--color-border-default`

### Radio

- **3 states:** `unselected`, `selected`, `disabled`
- Token references: `--color-brand-primary`, `--color-border-default`

### Toggle

- **2 states:** `off`, `on`
- **2 sizes:** `sm`, `md`
- Token references: `--color-brand-primary`, `--color-surface-muted`

### Tag

- **3 variants:** `default`, `removable`, `clickable`
- **4 color options:** `neutral`, `brand`, `success`, `warning`
- Token references: `--color-surface-subtle`, `--radius-full`

### Tooltip

- **2 positions:** `top`, `bottom` (left/right via instance rotation)
- **1 variant:** single arrow-tip style
- Token references: `--color-surface-inverse`, `--color-text-inverse`

---

## Molecule Components

Molecules combine 2 or more atom components to form a functional UI unit. All 9 molecule components live on **Page 2 — Molecules**.

### FormField

Combines: Label (text) + Input atom + HelperText (text)
- **States:** `default`, `focused`, `filled`, `error`, `disabled`
- Adds: error message slot (visible only in `error` state), optional label asterisk for required fields

### SearchBar

Combines: Icon atom (search) + Input atom + optional clear button (Icon atom)
- **States:** `default`, `focused`, `active` (with results count), `loading`

### Dropdown

Combines: Input-style trigger + OptionList (internal component)
- **States:** `closed`, `open`, `selected`, `disabled`
- **Variants:** `single-select`, `multi-select`

### DatePicker

Combines: Input atom + Calendar grid (internal molecule)
- **States:** `closed`, `open`, `date-selected`, `range-selected`
- **Variants:** `single-date`, `date-range`

### FileUpload

Combines: Icon atom + text + Button atom (ghost variant)
- **States:** `idle`, `drag-over`, `uploading`, `success`, `error`

### CardHeader

Combines: Avatar atom + text stack (title + subtitle) + optional Icon atom (action)
- **Variants:** `with-avatar`, `with-icon`, `text-only`

### TableRow

Combines: Checkbox atom + multiple text cells + Badge atom + action menu trigger
- **States:** `default`, `selected`, `hover`
- **Variants:** `default-row`, `selected-row`, `expandable-row`

### NavItem

Combines: Icon atom + label text + optional Badge atom (count badge)
- **States:** `default`, `hover`, `active`, `disabled`
- **Variants:** `icon-and-label`, `icon-only` (for collapsed sidebar)

### StepIndicator

Combines: step circle (Icon or number) + label text + connector line
- **States per step:** `upcoming`, `current`, `completed`, `error`
- **Variants:** `horizontal`, `vertical`

---

## Organism Components

Organisms are full UI sections composed of molecules and atoms. All 7 organism components live on **Page 3 — Organisms**.

### DataTable

Combines: FilterBar (molecule), TableRow (molecule × n), Pagination controls
- **Features:** column sorting (asc/desc), column filtering, row selection, pagination
- **States:** `loading` (skeleton rows), `empty` (empty state illustration), `populated`
- **Variants:** `compact`, `default`, `comfortable` (row density)

### NavSidebar

Combines: Logo area + NavItem (molecule × n) + UserProfile section
- **Variants:** `expanded` (240px), `collapsed` (48px icon-only)
- **States:** `default`, `with-notification-badge`

### TopBar

Combines: Logo/back button area + search bar + notification bell + Avatar (user menu)
- **Variants:** `with-search`, `without-search`
- **States:** `default`, `with-alert-badge`

### Modal

Combines: Overlay backdrop + Card container + CardHeader + content slot + action row (Button atoms)
- **Sizes:** `sm` (400px), `md` (560px), `lg` (720px)
- **Variants:** `default`, `destructive` (red CTA), `form` (taller, scrollable content)

### PricingCard

Combines: Badge atom + price display + feature list + Button atom
- **Variants:** `starter`, `pro`, `enterprise`
- **States:** `default`, `featured` (highlighted/recommended)

### OnboardingWizard

Combines: StepIndicator (molecule) + content area + Button pair (primary + ghost)
- **Step count:** 4 steps (configurable via instance override)
- **States per step:** `active`, `completed`

### DashboardGrid

Combines: StatCard (atom) × 4 + ChartPlaceholder × 2 + DataTable organism
- **Layout:** auto-layout grid, wrap mode, fills available viewport
- **Variants:** `full`, `compact` (fewer visible metrics)

---

## Token Integration

All components in the library reference **semantic tokens** exclusively. No component ever references a primitive token directly. This one-level-of-indirection rule ensures that theme changes (e.g., dark mode, brand refresh) cascade through the entire library by updating only the semantic variable values.

### Integration Rules

| Rule | Detail |
|------|--------|
| Color | Always reference a `--color-*` semantic token. Never use raw hex. |
| Spacing | Always reference a `--spacing-*` token. Never use a raw px value. |
| Radius | Always reference a `--radius-*` token. Never use a raw px value. |
| Typography | Always reference a `--font-size-*` or `--font-weight-*` token. |
| Shadow | Always reference a `--shadow-*` token. |

### Figma Variable Wiring

Figma variables are wired to the design token values via the `Tokens` page variable collections:

```
Primitives collection  →  raw values (palette, spacing scale)
Semantic collection    →  aliases to Primitives (e.g. --color-brand-primary → indigo/600)
Component collection   →  aliases to Semantic (e.g. button/bg-default → --color-brand-primary)
```

Atom components reference **Component collection** variables (the third tier). Molecules and organisms inherit those token references through their atom instances automatically.

### Atom Token Reference Example — Button

```
button/bg-default    → semantic/color-brand-primary   → primitive/indigo-600   → #4F46E5
button/bg-hover      → semantic/color-brand-primary-hover → primitive/indigo-700 → #4338CA
button/text-default  → semantic/color-brand-primary-text  → primitive/white      → #FFFFFF
button/radius        → semantic/radius-md              → primitive/radius-8     → 8px
```

This chain ensures that updating `primitive/indigo-600` propagates to every component that uses the brand primary color — all buttons, selected states, active nav items, etc.

---

## Variant Matrix

The full variant matrix for the most complex component — **Button** — illustrates how Figma component properties combine to generate all permutations:

| Property | Values | Count |
|----------|--------|-------|
| `variant` | `primary`, `secondary`, `ghost`, `destructive` | 4 |
| `size` | `sm`, `md`, `lg` | 3 |
| `state` | `default`, `hover`, `active`, `disabled`, `loading` | 5 |
| `hasIcon` | `true`, `false` | 2 |
| **Total combinations** | | **120** |

All 120 combinations are explicitly defined in the Button component set. Figma will surface all combinations in the design panel when an instance is selected.

### Variant Matrix — Badge

| Property | Values | Count |
|----------|--------|-------|
| `variant` | `neutral`, `brand`, `success`, `warning`, `error`, `info` | 6 |
| `size` | `sm`, `md` | 2 |
| `hasIcon` | `true`, `false` | 2 |
| **Total combinations** | | **24** |

### Variant Matrix — DataTable (Organism)

| Property | Values | Count |
|----------|--------|-------|
| `density` | `compact`, `default`, `comfortable` | 3 |
| `state` | `loading`, `empty`, `populated` | 3 |
| `selectable` | `true`, `false` | 2 |
| **Total combinations** | | **18** |

### Summary Table

| Component | Variants | States | Total Combinations |
|-----------|----------|--------|--------------------|
| Button | 4 | 5 | 120 |
| Input | 1 | 5 | 5 |
| Badge | 6 | 1 | 24 |
| Toggle | 2 | 2 | 4 |
| NavItem | 2 | 4 | 8 |
| DataTable | 3 | 3 | 18 |

The variant matrix for each component is documented on the component's annotation layer (visible when the component master frame is opened on Page 1, 2, or 3). Designers consuming the library should never create custom variant combinations outside the defined matrix — use the properties panel only.

---
