---
description: "Generate a complete brand kit from a logo and 1-2 brand colors — full palette, type scale, icon style, component tokens, and Figma styles."
argument-hint: "[brand color(s)] [brand name] [mood: professional, playful, bold, minimal]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
---

# /brand-kit

You are generating a **complete brand kit** from minimal inputs (1-2 colors and optionally a brand name/mood). The output includes a color system, typography scale, spacing system, component tokens, and optionally Figma styles.

Input: **$ARGUMENTS**

Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/design-system-lead.md` for token architecture and `${CLAUDE_PLUGIN_ROOT}/skills/design/references/ui-designer.md` for visual design principles.

## Process

### 1. Parse Inputs

Extract from the user's request:
- **Primary color**: The main brand color (hex, rgb, or named color)
- **Secondary color** (optional): A complementary or accent color
- **Brand name** (optional): Used in generated assets
- **Mood** (optional): professional, playful, bold, minimal, premium, warm, cool, tech
- **Industry** (optional): Inferred from name or context

If only one color is provided, generate the secondary color algorithmically.

### 2. Generate Color System

#### Primary Palette (10 shades)
From the primary color, generate a full shade scale:

```
primary-50:  lightest tint (98% lightness)
primary-100: very light tint (95%)
primary-200: light tint (90%)
primary-300: medium-light (80%)
primary-400: medium (65%)
primary-500: THE PRIMARY COLOR (base)
primary-600: medium-dark (45%)
primary-700: dark (35%)
primary-800: very dark (25%)
primary-900: darkest (15%)
primary-950: near-black (8%)
```

#### Secondary/Accent Palette
If no secondary color given, derive one:
- **Complementary**: 180° hue rotation → bold contrast
- **Analogous**: 30° hue rotation → harmonious
- **Triadic**: 120° hue rotation → vibrant

Choose based on mood:
- Professional → Complementary (muted)
- Playful → Triadic
- Bold → Complementary (saturated)
- Minimal → Analogous (desaturated)

Generate the same 10-shade scale for secondary.

#### Semantic Colors
```
success:  green spectrum (#10B981 default, adjust to complement brand)
warning:  amber spectrum (#F59E0B default)
error:    red spectrum (#EF4444 default)
info:     blue spectrum (#3B82F6 default, or use primary if primary is blue)
```

#### Neutral Palette
Derive neutrals from the primary color:
- Mix primary at 3-5% into a pure gray scale
- This gives neutrals a subtle brand warmth/coolness
```
neutral-50 through neutral-950 (with brand tint)
```

#### Surface Colors
```
background:      neutral-50 (light mode) / neutral-950 (dark mode)
surface:         white (light) / neutral-900 (dark)
surface-raised:  white with shadow (light) / neutral-800 (dark)
border:          neutral-200 (light) / neutral-700 (dark)
text-primary:    neutral-900 (light) / neutral-50 (dark)
text-secondary:  neutral-600 (light) / neutral-400 (dark)
text-muted:      neutral-400 (light) / neutral-600 (dark)
```

### 3. Generate Typography Scale

Based on mood, select a font pairing:

| Mood | Heading Font | Body Font |
|------|-------------|-----------|
| Professional | Inter, IBM Plex Sans | Inter, System UI |
| Playful | Nunito, Poppins | Nunito, Inter |
| Bold | Montserrat, Space Grotesk | Inter, DM Sans |
| Minimal | Inter, Helvetica Neue | Inter, System UI |
| Premium | Playfair Display, Fraunces | Inter, Source Sans 3 |
| Tech | JetBrains Mono, Space Mono | Inter, IBM Plex Sans |

#### Type Scale (Tailwind defaults)
```
text-xs:    12px / 16px (0.75rem)
text-sm:    14px / 20px (0.875rem)
text-base:  16px / 24px (1rem)
text-lg:    18px / 28px (1.125rem)
text-xl:    20px / 28px (1.25rem)
text-2xl:   24px / 32px (1.5rem)
text-3xl:   30px / 36px (1.875rem)
text-4xl:   36px / 40px (2.25rem)
text-5xl:   48px / 48px (3rem)
```

#### Font Weights
```
light:      300
regular:    400
medium:     500
semibold:   600
bold:       700
```

### 4. Generate Spacing System

8px base grid:
```
spacing-0:   0px
spacing-0.5: 2px
spacing-1:   4px
spacing-1.5: 6px
spacing-2:   8px
spacing-3:   12px
spacing-4:   16px
spacing-5:   20px
spacing-6:   24px
spacing-8:   32px
spacing-10:  40px
spacing-12:  48px
spacing-16:  64px
spacing-20:  80px
spacing-24:  96px
```

### 5. Generate Component Tokens

```
button-height-sm:       32px
button-height-md:       40px
button-height-lg:       48px
button-padding-x:       16px
button-radius:          8px (professional) / 12px (playful) / 4px (bold) / 6px (minimal)

input-height:           40px
input-padding-x:        12px
input-radius:           8px
input-border:           1px solid border-color

card-padding:           24px
card-radius:            12px (professional) / 16px (playful) / 8px (bold) / 8px (minimal)
card-shadow:            0 1px 3px rgba(0,0,0,0.1)

avatar-size-sm:         32px
avatar-size-md:         40px
avatar-size-lg:         56px
```

### 6. Output Formats

#### A. CSS Custom Properties
```css
:root {
  /* Primary */
  --color-primary-50: #...;
  /* ... through 950 */

  /* Typography */
  --font-heading: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  --text-base: 1rem;
  /* ... */

  /* Spacing */
  --spacing-1: 4px;
  /* ... */
}

[data-theme="dark"] {
  --color-background: var(--color-neutral-950);
  /* dark mode overrides */
}
```

#### B. Tailwind Config
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: { 50: '#...', /* ... */ 950: '#...' },
        secondary: { /* ... */ },
      },
      fontFamily: {
        heading: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
};
```

#### C. Design Tokens JSON
```json
{
  "color": {
    "primary": { "50": { "value": "#..." }, /* ... */ },
    "secondary": { /* ... */ }
  },
  "typography": { /* ... */ },
  "spacing": { /* ... */ }
}
```

#### D. Figma Styles (if connected)
Create Paint Styles and Text Styles in Figma:

```javascript
figma_execute: `
  // Create paint styles for primary palette
  const colors = { /* generated palette */ };
  for (const [name, hex] of Object.entries(colors)) {
    const style = figma.createPaintStyle();
    style.name = 'Brand/' + name;
    const r = parseInt(hex.slice(1,3), 16) / 255;
    const g = parseInt(hex.slice(3,5), 16) / 255;
    const b = parseInt(hex.slice(5,7), 16) / 255;
    style.paints = [{ type: 'SOLID', color: { r, g, b } }];
  }
  return 'Created ' + Object.keys(colors).length + ' paint styles';
`
```

#### E. Brand Kit HTML Page
Generate a visual brand kit reference page showing:
- Color swatches with labels and values
- Typography samples at each scale
- Spacing visualization
- Component examples (buttons, inputs, cards)
- Light/dark mode comparison

### 7. Preview Brand Kit

Use the preview server to display the brand kit HTML:
```
preview_start → launch
preview_screenshot → capture visual proof
```

### 8. Deliver

Output files based on user's stack:
- `brand-tokens.css` — CSS custom properties
- `tailwind.config.js` — Tailwind theme extension (if Tailwind detected)
- `tokens.json` — Design tokens JSON
- `brand-kit.html` — Visual reference page
- Figma styles (if connected)

### Memory Write

If `.naksha/memory.md` exists: append a one-line entry summarizing the brand kit generated:
```
[{ISO timestamp}] /brand-kit: Primary {primary}, secondary {secondary}, font {font}, mood {mood}
```
If `.naksha/project.json` exists: update `brand.primary`, `brand.secondary`, `brand.font`, and `updatedAt` fields.

## Color Generation Algorithm

### HSL-Based Shade Generation
```
Given primary hex → convert to HSL (H, S, L)

For each shade level:
  shade-50:  H, S×0.95, 97%
  shade-100: H, S×0.92, 94%
  shade-200: H, S×0.88, 88%
  shade-300: H, S×0.82, 78%
  shade-400: H, S×0.75, 63%
  shade-500: H, S, L          ← original
  shade-600: H, S×1.05, L×0.85
  shade-700: H, S×1.08, L×0.72
  shade-800: H, S×1.10, L×0.58
  shade-900: H, S×1.12, L×0.42
  shade-950: H, S×1.15, L×0.25
```

### Neutral Tinting
```
Given primary HSL → extract Hue
Neutral base: H(primary), S=5%, L varies

This gives grays a subtle warm/cool cast matching the brand.
```

## Notes

- Always include both light and dark mode tokens
- Font choices should be available on Google Fonts for web accessibility
- Test contrast ratios: primary-500 on white, primary-500 on primary-50, text on backgrounds
- If the primary color is very saturated, desaturate the extended palette slightly for usability
- Component tokens reference color/spacing tokens — never hardcode values

## MCP Fallback

If Figma Desktop Bridge is unavailable:
- Skip Figma paint/text style creation
- Output brand kit as CSS custom properties, Tailwind config, and JSON tokens only

If Preview server is unavailable:
- Write the brand kit HTML file to disk for manual browser viewing

## What's Next

After generating a brand kit:
- `/design` — build pages and components using the new brand tokens
- `/figma-create` — create a Figma design system with the brand's styles and variables
- `/design-system` — extend the token system with component-level tokens
- `/design-present` — create a brand presentation to share with stakeholders
