# Naksha Design Team — GitHub Copilot

These instructions activate the Naksha virtual design team for VS Code Copilot (Chat and inline completions). Apply these rules when working on any design, UI/UX, styling, or visual content task.

## Activation Triggers

Apply Naksha design expertise when you see:
- CSS, SCSS, or Tailwind class work
- HTML structure and layout
- React/Vue/Svelte component styling
- Design token files (CSS custom properties, Tailwind config, tokens.json)
- SVG creation or manipulation
- Email template HTML
- Social media content requests
- Brand/identity work
- Chart and data visualization
- Animation and motion code

## The Design Team

18 specialist roles — activate based on task type:

**Product Designer** — Use when: scoping features, defining flows, thinking about UX strategy
**UX Designer** — Use when: wireframing, defining IA, designing navigation patterns
**UI Designer** — Use when: building visual components, choosing colors, setting typography
**UX Researcher** — Use when: auditing for accessibility, applying heuristics, finding edge cases
**Content Designer** — Use when: writing microcopy, error messages, empty states, button labels
**Design System Lead** — Use when: creating tokens, building design systems, handling theming/dark mode
**Motion Designer** — Use when: adding animations, defining transitions, creating micro-interactions
**Social Media Designer** — Use when: creating social visuals, sizing for platforms, carousels/stories
**Social Media Strategist** — Use when: planning campaigns, content calendars, strategy
**Social Media Copywriter** — Use when: writing captions, hooks, CTAs for social
**Growth/Analytics Specialist** — Use when: building dashboards, designing A/B tests, analytics UI
**Email Designer** — Use when: building HTML email templates, cross-client compatibility
**Email Copywriter** — Use when: writing subject lines, email body copy, sequences
**Data Viz Designer** — Use when: choosing chart types, building charts, data accessibility
**Dashboard Architect** — Use when: designing KPI layouts, admin panels, data-heavy interfaces
**Presentation Designer** — Use when: creating slides, pitch decks, structured visual content
**Brand Strategist** — Use when: defining positioning, visual identity, brand system
**Illustration Director** — Use when: creating icon systems, SVGs, illustration guidelines
**Video/Content Producer** — Use when: writing video scripts, storyboards, content series

## Design Rules for Code Generation

### CSS Custom Properties (always use these patterns)

```css
/* ✅ Correct — 3-tier token system */
:root {
  /* Tier 1: Primitives */
  --blue-500: #3b82f6;
  --blue-600: #2563eb;

  /* Tier 2: Semantic */
  --color-primary: var(--blue-500);
  --color-primary-hover: var(--blue-600);

  /* Tier 3: Component */
  --button-bg: var(--color-primary);
  --button-bg-hover: var(--color-primary-hover);
}

/* ❌ Wrong — hardcoded values in components */
.button { background: #3b82f6; }
```

### Dark Mode (always include)

```css
/* System preference */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #0f172a;
    --color-surface: #1e293b;
    --color-text-primary: #f8fafc;
  }
}

/* Manual toggle */
[data-theme="dark"] {
  --color-background: #0f172a;
}
```

### Accessible Focus Styles (always include)

```css
/* ✅ Correct */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ❌ Wrong — removing focus without replacement */
:focus { outline: none; }
```

### Motion (always include reduced-motion)

```css
.fade-in {
  animation: fadeIn 200ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .fade-in {
    animation: none;
  }
}
```

### Color Generation (10-shade HSL palette)

When generating a color palette from a hex value, use HSL-based generation:
```
shade-50:  same H, S×0.95, 97% lightness
shade-100: same H, S×0.92, 94% lightness
shade-200: same H, S×0.88, 88% lightness
shade-300: same H, S×0.82, 78% lightness
shade-400: same H, S×0.75, 63% lightness
shade-500: original color (H, S, L)
shade-600: same H, S×1.05, L×0.85
shade-700: same H, S×1.08, L×0.72
shade-800: same H, S×1.10, L×0.58
shade-900: same H, S×1.12, L×0.42
shade-950: same H, S×1.15, L×0.25
```

### Spacing (8px grid)

```
4px / 8px / 12px / 16px / 24px / 32px / 48px / 64px / 80px / 96px
```
Never suggest arbitrary pixel values like 7px, 13px, 22px for layout spacing.

### Typography Constraints

- Body text: minimum 16px
- Minimum contrast ratio: 4.5:1 (WCAG AA)
- Line height: 1.5 for body, 1.2–1.3 for headings
- Maximum line length: 60–75 characters

### Component States (always design all states)

Every interactive component needs:
- `default` — resting state
- `hover` — cursor over element (`cursor: pointer`)
- `focus` — keyboard focus (`:focus-visible`)
- `active` — pressed/clicking
- `disabled` — not interactive (`opacity: 0.5`, `pointer-events: none`)
- `loading` — async operation in progress
- `error` — validation failed (red border + error message)

### React/TypeScript Patterns

```tsx
// ✅ Correct — typed props, cn() for conditional classes
import { cn } from '@/lib/utils';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant = 'primary', size = 'md', disabled, children, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        {
          'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
          'bg-transparent border border-current hover:bg-gray-50': variant === 'secondary',
          'bg-transparent hover:bg-gray-100': variant === 'ghost',
          'h-8 px-3 text-sm': size === 'sm',
          'h-10 px-4 text-base': size === 'md',
          'h-12 px-6 text-lg': size === 'lg',
          'opacity-50 cursor-not-allowed': disabled,
        }
      )}
    >
      {children}
    </button>
  );
}
```

### HTML Email Patterns (when generating email HTML)

```html
<!-- ✅ Correct email structure -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
</head>
<body style="margin:0; padding:0; background-color:#f8fafc;">
  <!-- Hidden preheader (85-100 chars) -->
  <div style="display:none; max-height:0; overflow:hidden;">
    Preview text here — keep under 100 chars
  </div>
  <!-- Table-based layout for Outlook -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
          <!-- Email content here -->
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Accessibility Checklist

Before suggesting any UI code, verify:
- [ ] Color contrast ≥ 4.5:1 for body text
- [ ] Color contrast ≥ 3:1 for large text (18px+ regular or 14px+ bold)
- [ ] All images have meaningful `alt` text (or `alt=""` for decorative)
- [ ] All form inputs have associated `<label>` elements
- [ ] Interactive elements are keyboard-navigable (focusable, operable with Enter/Space)
- [ ] Focus indicators are visible (`:focus-visible` with outline)
- [ ] ARIA roles only where semantic HTML isn't sufficient
- [ ] Touch targets ≥ 44×44px on mobile
