# Framework Specialist

Translates design studio HTML/CSS output into idiomatic, production-ready component code for specific frontend frameworks. Knows each framework's conventions deeply — not just syntax, but idiomatic patterns, file structure, and tooling defaults.

---

## When to Activate

Activate when the user specifies `--framework` flag or mentions a framework explicitly:
- "build this in React with Tailwind"
- "convert to Vue components"
- "I'm using Next.js App Router"
- "output as Svelte components"
- "we use Astro"

---

## Supported Frameworks

### React + Tailwind CSS

**File structure:**
```
src/
  components/
    Button.tsx        # atomic component
    Card.tsx
  pages/ or app/      # Next.js or CRA
  lib/
    utils.ts          # cn() utility
  styles/
    globals.css       # Tailwind directives
```

**Component pattern:**
```tsx
import { cn } from '@/lib/utils'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // base styles
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        // variants
        {
          'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'primary',
          'border border-input bg-background hover:bg-accent': variant === 'secondary',
          'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
        },
        // sizes
        {
          'h-8 px-3 text-sm': size === 'sm',
          'h-10 px-4 text-sm': size === 'md',
          'h-11 px-8 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
```

**cn() utility (required):**
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Tailwind config for design tokens:**
```js
// tailwind.config.ts
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        border: 'hsl(var(--border))',
      },
    },
  },
}
```

**CSS variables (globals.css):**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --primary: 222 47% 11%;
    --primary-foreground: 210 40% 98%;
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --border: 214 32% 91%;
    --radius: 0.5rem;
  }
  .dark {
    --primary: 210 40% 98%;
    --primary-foreground: 222 47% 11%;
    --background: 222 47% 11%;
    --foreground: 210 40% 98%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;
    --border: 217 33% 17%;
  }
}
```

**Key patterns:**
- Use `cn()` for conditional classes — never template literals
- Keep components in `src/components/`, pages in `src/app/` (Next.js) or `src/pages/`
- TypeScript interfaces for all props, no `any`
- Compound components with `export const X = { Root, Header, Body }` for complex UI
- `forwardRef` for form inputs and interactive elements
- `'use client'` directive only when needed (Next.js App Router)

---

### Vue 3 + UnoCSS

**File structure:**
```
src/
  components/
    UiButton.vue      # prefix components with "Ui" for base components
    UiCard.vue
  composables/
    useTheme.ts
  pages/
    index.vue         # Nuxt or Vue Router
```

**Component pattern (Composition API + `<script setup>`):**
```vue
<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<template>
  <button
    :class="[
      'inline-flex items-center justify-center rounded-md font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      {
        'bg-primary text-white hover:bg-primary-700': variant === 'primary',
        'border border-gray-300 hover:bg-gray-50': variant === 'secondary',
        'hover:bg-gray-100': variant === 'ghost',
      },
      {
        'h-8 px-3 text-sm': size === 'sm',
        'h-10 px-4 text-sm': size === 'md',
        'h-11 px-8 text-base': size === 'lg',
      },
    ]"
    :disabled="disabled"
    @click="emit('click', $event)"
  >
    <slot />
  </button>
</template>
```

**UnoCSS config:**
```ts
// uno.config.ts
import { defineConfig, presetUno, presetWebFonts } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetWebFonts({ fonts: { sans: 'Inter' } }),
  ],
  theme: {
    colors: {
      primary: {
        DEFAULT: '#2563eb',
        700: '#1d4ed8',
      },
    },
  },
})
```

**Key patterns:**
- `<script setup>` is the modern default — avoid Options API
- `defineProps<T>()` + `withDefaults` for typed props
- Composables for shared logic (prefix with `use`)
- Auto-import components via unplugin-vue-components
- `v-bind` class objects for conditional classes

---

### Svelte 5

**File structure:**
```
src/
  lib/
    components/
      Button.svelte
      Card.svelte
    utils.ts
  routes/
    +page.svelte      # SvelteKit
```

**Component pattern (Svelte 5 runes):**
```svelte
<script lang="ts">
  interface Props {
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    onclick?: (e: MouseEvent) => void
    children?: import('svelte').Snippet
  }

  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    onclick,
    children,
  }: Props = $props()

  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors'

  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'border border-gray-300 bg-white hover:bg-gray-50',
    ghost: 'hover:bg-gray-100',
  }

  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-8 text-base',
  }
</script>

<button
  class="{baseClasses} {variantClasses[variant]} {sizeClasses[size]}"
  {disabled}
  {onclick}
>
  {@render children?.()}
</button>

<style>
  :global(:root) {
    --color-primary: #2563eb;
    --color-primary-dark: #1d4ed8;
  }
</style>
```

**Key patterns:**
- Use `$props()` rune (Svelte 5) — not `export let` (deprecated)
- `$state()` for reactive local state
- `$derived()` for computed values
- `{@render children?.()}` for snippets (replaces `<slot>`)
- CSS modules or `<style>` blocks for component-scoped styles
- SvelteKit: `+page.svelte`, `+layout.svelte`, `+page.ts` for data loading

---

### Next.js App Router

**File structure:**
```
app/
  layout.tsx          # root layout with providers
  page.tsx            # home route
  (routes)/
    dashboard/
      page.tsx
      layout.tsx
components/
  ui/                 # shadcn/ui or custom atomic components
  features/           # feature-specific composed components
lib/
  utils.ts
  actions.ts          # Server Actions
public/
```

**Server vs Client components:**
```tsx
// app/page.tsx — Server Component (default, no 'use client')
import { HeroSection } from '@/components/features/HeroSection'
import { fetchHomeData } from '@/lib/data'

export default async function HomePage() {
  const data = await fetchHomeData()  // direct async/await, no useEffect
  return <HeroSection data={data} />
}

// components/features/InteractiveWidget.tsx — Client Component
'use client'
import { useState } from 'react'

export function InteractiveWidget() {
  const [open, setOpen] = useState(false)
  return <button onClick={() => setOpen(!open)}>Toggle</button>
}
```

**Key patterns:**
- Default to Server Components — only add `'use client'` for interactivity
- Data fetching in Server Components with direct `await fetch()` or ORM calls
- Server Actions for mutations: `export async function submitForm(formData: FormData) {}`
- `loading.tsx` for Suspense boundaries, `error.tsx` for error boundaries
- `metadata` export for SEO in each `page.tsx`
- Collocate components with routes they're exclusively used in

---

### Astro

**File structure:**
```
src/
  layouts/
    BaseLayout.astro
  components/
    Button.astro        # static component
    Counter.tsx         # interactive island (React/Svelte/Vue)
  pages/
    index.astro
    blog/
      [slug].astro      # dynamic routes
  content/
    blog/               # content collections
public/
```

**Astro component pattern:**
```astro
---
// Button.astro — runs at build time
interface Props {
  variant?: 'primary' | 'secondary'
  href?: string
}

const { variant = 'primary', href } = Astro.props
const Tag = href ? 'a' : 'button'
---

<Tag
  href={href}
  class:list={[
    'btn',
    { 'btn-primary': variant === 'primary' },
    { 'btn-secondary': variant === 'secondary' },
  ]}
>
  <slot />
</Tag>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-weight: 500;
    transition: background-color 150ms;
  }
  .btn-primary {
    background: var(--color-primary);
    color: white;
  }
</style>
```

**Interactive islands:**
```astro
---
// Only load JS for interactive parts — "island architecture"
import Counter from '../components/Counter.tsx'
---

<Counter client:load />         <!-- loads immediately -->
<Counter client:idle />         <!-- loads when browser is idle -->
<Counter client:visible />      <!-- loads when scrolled into view -->
```

**Key patterns:**
- `.astro` files for static/SSG content, UI framework files (`.tsx`) for islands
- `client:*` directives control when island JS loads — default to `client:visible`
- Content Collections for type-safe markdown: `getCollection('blog')`
- Zero JS by default — only islands ship JavaScript

---

## Framework Detection

Detect the target framework from:
1. `--framework` flag in command: `react-tailwind`, `vue`, `svelte`, `nextjs`, `astro`
2. `settings.local.md` `js_framework` and `css_framework` fields
3. Auto-detection context: look for `package.json` keywords (`next`, `nuxt`, `svelte`, `astro`)

Framework aliases to recognize:
- `react`, `react-tailwind`, `react-tw` → React + Tailwind
- `vue`, `vue3`, `nuxt` → Vue 3 + UnoCSS
- `svelte`, `sveltekit` → Svelte 5 + SvelteKit
- `next`, `nextjs`, `next-app` → Next.js App Router + Tailwind
- `astro` → Astro + Tailwind

---

## Output Format by Framework

| Framework | Output | File Extension | Notes |
|-----------|--------|---------------|-------|
| React + Tailwind | TSX component + globals.css + tailwind.config.ts | `.tsx` | Include cn() utility |
| Vue 3 + UnoCSS | SFC + uno.config.ts | `.vue` | Composition API + `<script setup>` |
| Svelte 5 | Svelte component | `.svelte` | Use runes ($props, $state) |
| Next.js App Router | Server Component + Client Component split | `.tsx` | Annotate which is server/client |
| Astro | Astro component + optional island | `.astro` + `.tsx` | Minimal JS by default |

---

## QA Checklist

Before delivering framework output:
- [ ] Props are typed (TypeScript) — no `any`
- [ ] Component is self-contained (no external imports that don't exist)
- [ ] Dark mode support included (CSS vars or Tailwind dark: prefix)
- [ ] Responsive at all breakpoints
- [ ] Interactive states (hover, focus, disabled) implemented
- [ ] Accessibility: ARIA attributes, keyboard nav, semantic HTML preserved
- [ ] Framework-idiomatic patterns used (not just HTML copied into JSX)
- [ ] Named exports for tree-shaking (no default exports on utilities)

---

## Handoffs

Framework Specialist hands off to:
- **Design System Lead** — before conversion, if the source HTML has undocumented color tokens or spacing values. Design System Lead extracts and names them before the Specialist maps them to framework equivalents.
- **Frontend Developer** — after conversion, delivers `.tsx` / `.vue` / `.svelte` / `.astro` files with a setup note (packages to install, config additions). Frontend Developer handles integration into the project scaffold.
- **Design Manager** — reports which framework was resolved so subsequent commands in the same session (`/design-review`, `/design-handoff`) can use framework-aware output format.

---

## Advanced Patterns

**Compound component pattern (Radix-style)**
Components that share state without prop drilling. Use `React.createContext` + a parent component that provides context, with sub-components (`Card.Header`, `Card.Body`, `Card.Footer`) consuming it via `useContext`. In Vue, use `provide`/`inject`. In Svelte 5, use a `$state` rune in a shared module.

**Polymorphic `as` prop**
Allows callers to change the rendered element without changing the component:
```tsx
interface ButtonProps<T extends React.ElementType = 'button'> {
  as?: T
  children: React.ReactNode
}
export function Button<T extends React.ElementType = 'button'>({
  as,
  children,
  ...props
}: ButtonProps<T> & Omit<React.ComponentPropsWithoutRef<T>, keyof ButtonProps<T>>) {
  const Component = as ?? 'button'
  return <Component {...props}>{children}</Component>
}
```
Use when a design element should render as `<a>`, `<button>`, or `<div>` depending on context.

**Compound variants with `cva`**
For components with multiple independent variant axes (e.g., `intent` × `size` × `disabled`), use `cva` (class-variance-authority) to declare all combinations declaratively instead of nested conditionals:
```tsx
const button = cva('base-classes', {
  variants: {
    intent: { primary: '...', secondary: '...' },
    size: { sm: '...', md: '...', lg: '...' },
  },
  compoundVariants: [
    { intent: 'primary', size: 'lg', class: 'extra-large-primary' },
  ],
  defaultVariants: { intent: 'primary', size: 'md' },
})
```

**Server/Client component boundary strategy (Next.js App Router)**
Default to Server Components. Move to Client Component only when you need:
- `useState`, `useEffect`, `useReducer`
- Browser-only APIs (`window`, `localStorage`)
- Event listeners (`onClick`, `onChange`)
Mark the boundary as low as possible in the tree — a page can be a Server Component with a single Client Component island for interactive parts.

**Island hydration strategy (Astro)**
Static structure goes in `.astro`. Interactive elements become React/Svelte/Vue components with `client:` directive:
- `client:load` — hydrate immediately on page load (use for above-the-fold interactive UI)
- `client:idle` — hydrate when browser is idle (use for secondary interactive elements)
- `client:visible` — hydrate when component enters viewport (use for below-the-fold, saves JS)

Default to `client:visible` unless immediate interaction is required.

**Svelte 5 rune migration path**
Svelte 5 replaces the `$:` reactive syntax with explicit runes. Key pairs:
- `let count = 0` + `$: doubled = count * 2` → `let count = $state(0)` + `let doubled = $derived(count * 2)`
- `export let name` → `let { name } = $props()`
- `createEventDispatcher` → `let { onclick } = $props()` (events become props)
- `<slot />` → `{@render children?.()}`

---

## Full Coverage

Add exactly these 5 worked examples in order:

**React + Tailwind — SaaS dashboard page**
Input: HTML dashboard with sidebar nav, header with user menu, main area with stat cards and a data table.
Output: `DashboardLayout.tsx` (Server Component), `Sidebar.tsx` (Server), `UserMenu.tsx` (Client — dropdown state), `StatCard.tsx` (Server), `DataTable.tsx` (Client — sort/filter state).
Watch for: Don't make the entire layout a Client Component because one dropdown needs state. Isolate the interactive island.

**Vue 3 + UnoCSS — e-commerce product card**
Input: HTML product card with image, title, price, color swatches, add-to-cart button.
Output: `ProductCard.vue` with `<script setup lang="ts">`, typed `defineProps`, `defineEmits` for cart event, `ref` for selected color state. UnoCSS utility classes replace inline styles.
Watch for: `defineEmits` type must match the parent's `@add-to-cart` handler signature. Don't use Options API.

**Svelte 5 — interactive form**
Input: HTML multi-step form with validation state and error messages.
Output: `MultiStepForm.svelte` using `$state` for step and field values, `$derived` for validation errors, `$effect` for side effects (localStorage save). Use `{@render}` for step slot content.
Watch for: `$effect` runs after every reactive update — scope it tightly. Don't use `onMount` (Svelte 4 pattern).

**Next.js App Router — page with static header + client data table**
Input: HTML analytics page with a static page header and a filterable/sortable data table.
Output: `page.tsx` (Server Component, no `'use client'`) + `DataTable.tsx` (Client Component with `'use client'`, `useState` for filters). `metadata` export on the page.
Watch for: The `metadata` export is only valid in Server Components. The Client Component cannot export `metadata`.

**Astro — marketing landing with React island CTA**
Input: HTML landing page with hero, features grid, pricing section, and an interactive pricing toggle (monthly/annual).
Output: `LandingPage.astro` (static hero + features + pricing layout) + `PricingToggle.tsx` (React island with `client:visible`). Astro props typed with `interface Props`.
Watch for: Astro components don't support client-side state — the toggle must be a React/Svelte/Vue island. Pass initial data as props from the `.astro` parent to the island.

---

## Reference-Sourced Insights

### Modern CSS Reset Baseline (From Josh W. Comeau)

Every React/Vue/Svelte/Next.js/Astro project should start with this modern CSS reset. It replaces outdated resets (Eric Meyer's is 15+ years old) with modern, well-reasoned rules:

```css
/* 1. Intuitive box-sizing — must-have */
*, *::before, *::after { box-sizing: border-box; }

/* 2. Remove default margin */
* { margin: 0; }

/* 3. Enable keyword animations for height: auto transitions */
/* Not animation-related — a sizing hint; does not belong inside prefers-reduced-motion */
html { interpolate-size: allow-keywords; }

body {
  /* 4. WCAG requires line-height ≥ 1.5 for body text */
  line-height: 1.5;
  /* 5. Better font rendering on macOS (Apple disabled subpixel antialiasing in macOS Mojave) */
  -webkit-font-smoothing: antialiased;
}

/* 6. Media elements: block by default, never overflow container */
img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

/* 7. Form controls inherit font — prevents mismatched font in inputs */
input, button, textarea, select { font: inherit; }

/* 8. Prevent text overflow on long words */
p, h1, h2, h3, h4, h5, h6 { overflow-wrap: break-word; }

/* 9. Better line-wrapping */
p { text-wrap: pretty; }
h1, h2, h3, h4, h5, h6 { text-wrap: balance; }

/* 10. Root stacking context — prevents z-index bugs in React/Next.js */
#root, #__next { isolation: isolate; }
```

**Key insight:** `interpolate-size: allow-keywords` (rule 3) enables `height: 0px` to `height: auto` CSS transitions without JavaScript. It is a **sizing hint, not an animation** — do not wrap it in `prefers-reduced-motion`. Browser support has expanded significantly since early 2025; check caniuse.com before relying on it, and place reduced-motion guards on the actual `transition` or `animation` declarations that use it, not on this rule. Fallback (no animation) is acceptable where unsupported.

**Why `box-sizing: border-box` is non-negotiable:** Without it, a `width: 100%` element with padding overflows its container. This is so universally correct that `*` selector application has zero performance impact.

---

### Tailwind CSS v4 Changes (From Tailwind Blog)

Tailwind CSS v4.0 (January 2025) is a breaking change from v3. Key differences when outputting framework code:

**v4 config is CSS-first, not JS-first:**
```css
/* tailwind.config.ts is GONE in v4 — config lives in globals.css */
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.5 0.2 240);
  --font-sans: "Inter", sans-serif;
  --radius-md: 0.375rem;
}
```

**v4 uses CSS custom properties natively:**
- Design tokens are defined as `--*` variables in `@theme` block
- No more `hsl(var(--primary))` indirection — use `oklch()` or direct hex
- All spacing/color/typography tokens auto-generate utility classes

**v4 content detection is automatic:**
- No more `content: ['./src/**/*.{ts,tsx}']` in config
- v4 scans files automatically via the Vite/PostCSS plugin

**Check user's Tailwind version before generating config:** If `package.json` shows `"tailwindcss": "^4.x"`, use CSS-based config. If `"^3.x"`, use the JS config pattern from the existing reference.

**Tailwind Plus (formerly Tailwind UI):** All UI blocks in Tailwind Plus are now available in plain HTML (not just React/Vue), with vanilla JavaScript for interactive components (dialogs, dropdowns, etc.) — as of July 2025. Note: Tailwind Plus is a **paid subscription product** — verify the user has an active license before recommending its component library.

---

### shadcn/ui Integration Patterns (From shadcn/ui docs)

shadcn/ui is a copy-paste component library — it installs components into your project (not as a dependency), making them fully customizable. When a user says "use shadcn" or their project has a `components/ui/` folder, follow these patterns:

**Install pattern:**
```bash
npx shadcn@latest add button card dialog
```
This copies the component source into `components/ui/button.tsx` — you own the code.

**Component customization:** shadcn components use the `cn()` utility and CVA (Class Variance Authority) for variant management:
```tsx
// shadcn Button source pattern (v4 style)
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)
```

**Theming:** shadcn uses CSS variables in `globals.css` for all colors. The `<Theme accentColor="..." grayColor="..." radius="...">` approach (Radix Themes) is the alternative if using `@radix-ui/themes` instead of shadcn.

**shadcn vs Radix Themes:** shadcn = headless primitives + Tailwind classes you control. Radix Themes = pre-styled components with a theme wrapper. If the user's project uses `@radix-ui/themes`, use the `<Theme>` wrapper and import pre-styled components directly.

---

### Radix UI Themes (From Radix Themes docs)

When user mentions `@radix-ui/themes` (not just `@radix-ui/react-*` primitives):

**Setup:**
```tsx
// root layout
import '@radix-ui/themes/styles.css'
import { Theme } from '@radix-ui/themes'

export default function Layout({ children }) {
  return (
    <html>
      <body>
        <Theme accentColor="blue" grayColor="slate" radius="medium" scaling="100%">
          {children}
        </Theme>
      </body>
    </html>
  )
}
```

**Component usage (no class names needed):**
```tsx
import { Flex, Button, Text, Card } from '@radix-ui/themes'

<Card>
  <Flex direction="column" gap="2">
    <Text size="3" weight="bold">Title</Text>
    <Button variant="solid">Action</Button>
  </Flex>
</Card>
```

**Theme configuration props:**
- `accentColor`: `"blue" | "crimson" | "green" | ...` (29 options)
- `grayColor`: `"slate" | "mauve" | "sand" | "olive" | ...`
- `radius`: `"none" | "small" | "medium" | "large" | "full"`
- `scaling`: `"90%" | "95%" | "100%" | "105%" | "110%"`

**Dark mode:** Wrap sections in `<Theme appearance="dark">` or apply the `dark` class to `<html>`.

---

### Algorithmic Layout Patterns (From Every Layout)

Every Layout (Heydon Pickering & Andy Bell) teaches layout primitives that work without `@media` breakpoints — the browser decides. Apply these patterns when generating framework components:

**The Stack:** Consistent vertical spacing between siblings using `gap` or the lobotomized owl selector (`* + * { margin-top: var(--space) }`). Use for any vertical flow of content.

**The Sidebar layout:** Main content + fixed-width sidebar that wraps when the container is too narrow. Pure CSS, no breakpoints:
```css
.with-sidebar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.sidebar { flex-basis: 240px; flex-grow: 1; }
.not-sidebar { flex-basis: 0; flex-grow: 999; min-width: 50%; }
```
This wraps the sidebar below main content when the container shrinks below the `min-width` threshold — no `@media` query required.

**The Switcher:** N items in a row that automatically stack when the container is too narrow:
```css
.switcher { display: flex; flex-wrap: wrap; gap: 1rem; }
.switcher > * { flex-basis: calc((30rem - 100%) * 999); flex-grow: 1; }
```

**The Center:** Horizontally centered container with max-width and padding:
```css
.center { max-width: var(--measure, 65ch); margin-inline: auto; padding-inline: 1rem; }
```

**The Grid:** Auto-fill grid that adapts to content:
```css
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr)); gap: 1rem; }
```

**Principle:** These layouts work in any framework because they're CSS-only. Prefer these intrinsic layout patterns over media-query-based breakpoint grids when building framework-agnostic components.

---
