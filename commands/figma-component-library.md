---
name: figma-component-library
description: Generate a complete component library in Figma from a design system config — atoms, molecules, and organisms with all variants, auto layout, and component properties
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
triggers:
  - component library
  - figma library
  - design system figma
  - build component library
  - create components figma
  - generate components
  - atoms molecules organisms
  - figma components
arguments: "$ARGUMENTS"
---

# /figma-component-library

Generate an entire component library in Figma — atoms → molecules → organisms — from a design system config or a description. Produces named components with auto layout, variant groups, component properties, and correct layer naming conventions.

**Usage:** `/figma-component-library <description or config>`

**Examples:**
- `/figma-component-library SaaS product with blue primary, minimal style`
- `/figma-component-library e-commerce: product cards, cart, checkout forms`
- `/figma-component-library --config design-tokens.json`
- `/figma-component-library --scope atoms` — generate only atom-level components

**Flags:**
- `--scope atoms | molecules | organisms | full` (default: full)
- `--style minimal | bold | corporate | playful | dark-tech` (default: minimal)
- `--config <file>` — read color/typography tokens from a JSON file
- `--framework` — output companion React/TypeScript interface spec alongside Figma output

---

## Step 1: Parse Input

Extract from `$ARGUMENTS`:

1. **Product context**: What is being built? (SaaS, e-commerce, dashboard, mobile app, etc.)
2. **Brand signals**: Any color, style, or tone mentioned → use as seed for token generation
3. **Scope flag**: `--scope` determines which tiers to generate
4. **Config file**: If `--config` is provided, read token values; otherwise generate sensible defaults
5. **Style flag**: Maps to a visual personality (see style table in Step 2)

If no brand color is provided, default to a neutral blue (#3B82F6) with slate grays.

---

## Step 2: Generate Token Foundation

Before building components, establish the token system that all components will reference.

### Color Tokens

Generate a complete semantic token set from the brand color:

```
--color-brand-50 through --color-brand-900   (tints/shades)
--color-neutral-50 through --color-neutral-950

Semantic aliases:
--color-interactive         (brand-600 default)
--color-interactive-hover   (brand-700)
--color-interactive-active  (brand-800)
--color-interactive-subtle  (brand-50)
--color-surface             (#ffffff)
--color-surface-raised      (neutral-50)
--color-surface-overlay     (neutral-100)
--color-border              (neutral-200)
--color-border-strong       (neutral-400)
--color-text-primary        (neutral-900)
--color-text-secondary      (neutral-600)
--color-text-disabled       (neutral-400)
--color-text-inverse        (#ffffff)
--color-focus-ring          (brand-600 + 25% alpha)
--color-success             (#22c55e)
--color-warning             (#f59e0b)
--color-error               (#ef4444)
--color-info                (brand-500)
```

### Typography Tokens

```
--font-family-sans: system-ui, -apple-system, sans-serif
--font-family-mono: ui-monospace, monospace

Scale: xs(12) sm(14) base(16) lg(18) xl(20) 2xl(24) 3xl(30) 4xl(36)

--text-display: 3xl/1.2/semibold
--text-heading-1: 2xl/1.3/semibold
--text-heading-2: xl/1.4/semibold
--text-heading-3: lg/1.5/medium
--text-body: base/1.6/regular
--text-body-sm: sm/1.5/regular
--text-label: sm/1.4/medium
--text-caption: xs/1.4/regular
--text-code: sm mono/1.6/regular
```

### Spacing + Radius Tokens

```
Spacing: 2 4 6 8 12 16 20 24 32 40 48 64 80 96 (px)
Aliases: --space-1 through --space-24

Border radius: --radius-sm(4) --radius-md(8) --radius-lg(12) --radius-xl(16) --radius-full(9999)
Shadows: --shadow-sm --shadow-md --shadow-lg
```

**Style modifiers:**

| Style | Primary color | Radius | Type weight | Personality |
|-------|--------------|--------|-------------|-------------|
| minimal | neutral blue | md | regular | Clean, lots of whitespace |
| bold | vibrant brand | lg | semibold | High-contrast, assertive |
| corporate | navy/slate | sm | regular | Conservative, structured |
| playful | warm/colorful | xl | medium | Rounded, friendly |
| dark-tech | blue-gray dark | md | medium | Dark surface, accent glow |

---

## Step 3: Plan the Component Hierarchy

Determine which components to generate based on `--scope`:

### Atoms (single-purpose primitives)

| Component | Variants / States | Key props |
|-----------|------------------|-----------|
| **Button** | Size: sm/md/lg · Variant: primary/secondary/ghost/danger · State: default/hover/focus/disabled/loading | label, icon-left, icon-right, full-width |
| **Badge** | Variant: default/success/warning/error/info · Size: sm/md | label, dot indicator |
| **Tag** | Removable: yes/no · Size: sm/md | label, on-remove |
| **Icon** | Size: 16/20/24px | name (placeholder frame) |
| **Avatar** | Size: xs/sm/md/lg/xl · Type: image/initials/placeholder | initials, image-src |
| **Spinner** | Size: sm/md/lg · Color: brand/neutral/white | — |
| **Divider** | Orientation: horizontal/vertical · Style: solid/dashed | label (optional) |
| **Tooltip** | Position: top/bottom/left/right | content |
| **Checkbox** | State: unchecked/checked/indeterminate/disabled | label, description |
| **Radio** | State: unselected/selected/disabled | label, description |
| **Toggle** | State: off/on/disabled | label |
| **Input** | State: default/focus/error/disabled · Size: sm/md/lg | label, placeholder, hint, error-msg, icon |
| **Textarea** | State: default/focus/error/disabled · Resize: vertical/none | label, hint, error-msg, row-count |
| **Select** | State: default/open/selected/error/disabled | label, placeholder, options |
| **Link** | Variant: default/subtle · State: default/hover/visited | label, external indicator |
| **Code** | Display: inline/block | content, language |
| **Skeleton** | Shape: text/circle/rectangle · Size: sm/md/lg | width, height |

### Molecules (composed from atoms)

| Component | Description |
|-----------|-------------|
| **Card** | Surface container: header area, body, optional footer, shadow, border |
| **Form Field** | Input/Select/Textarea + Label + Hint + Error message (atomic wrapper) |
| **Input Group** | Input + prefix icon/text + suffix button (e.g., search bar, URL field) |
| **Search** | Input Group preconfigured for search: icon, clear button, submit |
| **Navigation Item** | Icon + label + optional badge + active/hover states |
| **Breadcrumb** | Path segments with separators, current page highlighted |
| **Pagination** | Prev/Next buttons + page numbers + current page indicator |
| **Alert** | Icon + title + description + dismiss button. Variants: info/success/warning/error |
| **Toast** | Compact alert for notifications. Position: top-right/bottom-center |
| **Modal** | Overlay + dialog container + header + body + footer + close button |
| **Dropdown Menu** | Trigger + positioned list of menu items with icons and keyboard nav |
| **Tabs** | Tab bar + content panels. Variants: line/filled/pill |
| **Accordion** | Expandable sections with animated chevron |
| **Stat Card** | KPI card: label + value + trend indicator + sparkline area |
| **User Row** | Avatar + name + email/role + optional actions (for tables/lists) |
| **Empty State** | Illustration placeholder + heading + body + CTA (for zero-content views) |
| **Progress** | Bar or ring. Variants: determinate/indeterminate. Labeled optional. |

### Organisms (full sections / page-level)

| Component | Description |
|-----------|-------------|
| **Navigation Bar** | Logo + nav items + CTA button + avatar menu. Responsive: hamburger at mobile |
| **Sidebar** | Logo + nav section groups + user footer. Collapsible at 1024px |
| **Page Header** | Breadcrumb + title + subtitle + action button row |
| **Data Table** | Column headers with sort + rows + checkbox selection + pagination + empty state |
| **Form Section** | Titled form group with grid layout, field components, submit/cancel |
| **Hero Section** | Headline + subheadline + CTA buttons + media area |
| **Feature Grid** | Icon + heading + body for 3–4 feature highlights |
| **Pricing Card** | Plan name + price + feature list + CTA button |
| **Auth Form** | Sign in / sign up form with social login options |
| **Settings Panel** | Grouped settings rows with labels, descriptions, and control components |

---

## Step 4: Build the Library Structure

### Figma Page Layout

Organize the library across named pages:

```
Page 1: Foundation     — Color swatches, type specimens, spacing grid, shadows
Page 2: Atoms          — All atom components in a grid layout
Page 3: Molecules      — All molecule components
Page 4: Organisms      — All organism components
Page 5: Templates      — Example page compositions (optional, with --scope full)
```

### Section Layout Within Each Page

Group components in labeled sections:

```
[Section: Buttons]
  Button/Primary/Default · Button/Primary/Hover · Button/Primary/Focus · Button/Primary/Disabled
  Button/Secondary/Default · ...
  Button/Ghost/Default · ...
  Button/Danger/Default · ...
  [Row below] Sizes: Small · Medium · Large

[Section: Form Controls]
  Input/Default · Input/Focus · Input/Error · Input/Disabled
  ...
```

### Component Naming Convention

```
ComponentName/Variant/State

Examples:
  Button/Primary/Default
  Button/Primary/Disabled
  Input/Error/sm
  Card/Elevated/Default
  Navigation/Sidebar/Collapsed
```

---

## Step 5: Build Each Component (Figma API)

For each component in scope, generate a `figma_execute` block.

**Key construction principles:**

1. **Always use auto layout** — no absolute positioning. Set `layoutMode: "HORIZONTAL"` or `"VERTICAL"`, `primaryAxisSizingMode`, `counterAxisSizingMode`, `paddingLeft/Right/Top/Bottom`, `itemSpacing`

2. **Use component properties** for variants — `addComponentProperty()` with VARIANT, TEXT, BOOLEAN, INSTANCE_SWAP types

3. **Layer naming** — PascalCase for frames (`ButtonLabel`), lowercase kebab for groups (`icon-left`), `_` prefix for hidden utility layers

4. **Fill with tokens** — use `setFillStyleId()` / `setTextStyleId()` if local styles exist; otherwise use raw `fills` arrays with semantic hex values matching the token system

5. **Z-ordering** — backgrounds go behind content via `parent.insertChild(0, bg)`

6. **States via variants** — combine into component set with `figma.combineAsVariants()`

### Example: Button Component

```javascript
// figma_execute block — Button atom
async function createButton(parent) {
  const states = ['Default', 'Hover', 'Focus', 'Disabled', 'Loading'];
  const variants = [];

  for (const state of states) {
    const btn = figma.createComponent();
    btn.name = `State=${state}`;
    btn.layoutMode = 'HORIZONTAL';
    btn.primaryAxisSizingMode = 'AUTO';
    btn.counterAxisSizingMode = 'AUTO';
    btn.paddingLeft = 16; btn.paddingRight = 16;
    btn.paddingTop = 10; btn.paddingBottom = 10;
    btn.itemSpacing = 8;
    btn.cornerRadius = 8;

    // Background fill by state
    const bg = state === 'Disabled' ? '#94A3B8' :
               state === 'Hover'    ? '#2563EB' :
               state === 'Focus'    ? '#3B82F6' : '#3B82F6';
    btn.fills = [{ type: 'SOLID', color: hexToRgb(bg) }];

    // Label text
    const label = figma.createText();
    await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
    label.characters = 'Button';
    label.fontSize = 14;
    label.fills = state === 'Disabled'
      ? [{ type: 'SOLID', color: hexToRgb('#FFFFFF'), opacity: 0.5 }]
      : [{ type: 'SOLID', color: hexToRgb('#FFFFFF') }];
    btn.appendChild(label);

    // Focus ring effect
    if (state === 'Focus') {
      btn.effects = [{
        type: 'DROP_SHADOW',
        color: { r: 0.23, g: 0.51, b: 0.96, a: 0.4 },
        offset: { x: 0, y: 0 },
        radius: 0,
        spread: 3,
        visible: true,
        blendMode: 'NORMAL'
      }];
    }

    variants.push(btn);
  }

  const set = figma.combineAsVariants(variants, parent);
  set.name = 'Button/Primary';
  return set;
}
```

---

## Step 6: Output

### Always output

1. **Figma execution plan** — describe what will be created on each page, component count, variant count
2. **`figma_execute` code blocks** — ready to run with Figma Desktop Bridge MCP

### When `--framework` is used, also output

A TypeScript interface spec for each component:

```typescript
// Button component interfaces
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  label: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  isLoading?: boolean;
  isDisabled?: boolean;
  isFullWidth?: boolean;
  onClick?: () => void;
}

// Badge
interface BadgeProps {
  variant: 'default' | 'success' | 'warning' | 'error' | 'info';
  size: 'sm' | 'md';
  label: string;
  hasDot?: boolean;
}
```

### Output structure

```
## Component Library: [Product Name]

### Token Foundation
[Color palette preview | Typography scale | Spacing grid]

### Atoms (N components)
[Component name] — [variants] × [states] = [total frames]
...

### Molecules (N components)
...

### Organisms (N components)
...

### Figma Execution
[figma_execute code blocks for each component]

### What's Next
/figma-sync — check for drift between this library and any existing code
/design-handoff — generate developer documentation for the library
/design-framework — generate companion React/Vue/Svelte component code
```

---

## MCP Fallback

If Figma Desktop Bridge is unavailable:

1. Output the **HTML/CSS component gallery** instead — a single-page reference showing all components styled with CSS custom properties matching the token system
2. Provide the **Figma API code** in code blocks for manual pasting into Figma's Plugin Console
3. Note: Install Figma Desktop Bridge for live creation — see `MCP-SETUP.md`

---

## What's Next

- `/figma-sync` — detect drift between the library and existing code
- `/design-handoff` — generate comprehensive developer documentation
- `/design-framework react-tailwind` — generate companion React components
- `/component-docs` — auto-generate Storybook-style component docs from the library
- `/ab-variants` — create A/B test variants from any component in the library
