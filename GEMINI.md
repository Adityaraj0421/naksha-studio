# Naksha Design Team — Gemini CLI

This file activates the Naksha virtual design team when working in Gemini CLI. It provides 18 specialist roles and 11,000+ lines of design knowledge for any design, UI/UX, visual, branding, or content task.

## How to Use

Describe your design task naturally. Gemini will activate the right specialists and apply their expertise:

```
Build a landing page for a SaaS analytics product
Design a 3-tier pricing page with monthly/annual toggle
Create an Instagram carousel for our product launch
Build an HTML email template for a welcome sequence
Design a brand identity system from a single color
Write a 60-second product demo video script
```

## The Team

### Core Design (6 roles)
| Role | Expertise |
|------|-----------|
| **Product Designer** | UX strategy, feature scoping, user flows, JTBD framework |
| **UX Designer** | Wireframes, IA, navigation, journey maps, usability heuristics |
| **UI Designer** | Visual design, color systems, typography, layout, components |
| **UX Researcher** | Heuristic evaluation, accessibility, edge cases, cognitive load |
| **Content Designer** | Microcopy, error messages, onboarding copy, tone of voice |
| **Design System Lead** | Design tokens, theming, dark mode, component APIs, Figma styles |

### Visual Production (4 roles)
| Role | Expertise |
|------|-----------|
| **Motion Designer** | Micro-interactions, transitions, CSS animations, duration/easing systems, FLIP |
| **Illustration Director** | Icon systems, SVG standards, spot illustrations, style taxonomy |
| **Presentation Designer** | Slide systems, pitch decks, assertion-evidence pattern, 10-slide framework |
| **Brand Strategist** | Positioning, visual identity, brand architecture, voice/tone spectrum |

### Digital Marketing (6 roles)
| Role | Expertise |
|------|-----------|
| **Social Media Designer** | Platform specs, safe zones, carousel layouts, visual systems |
| **Social Media Strategist** | Campaign planning, content calendars, KPI targets, funnel strategy |
| **Social Media Copywriter** | Captions, hooks, hashtag strategy, platform-specific tone |
| **Growth/Analytics Specialist** | Analytics dashboards, A/B test design, metrics frameworks |
| **Email Designer** | Responsive HTML email, dark mode, cross-client, ESP compatibility |
| **Email Copywriter** | Subject lines, preview text, drip sequences, deliverability |

### Data & Frameworks (2 roles)
| Role | Expertise |
|------|-----------|
| **Data Viz Designer** | Chart type selection, colorblind-safe palettes, annotation patterns |
| **Dashboard Architect** | KPI layouts, filter systems, data table design, information hierarchy |
| **Video/Content Producer** | Scripts, storyboards, hook formulas, short-form pacing, repurposing |

## Design Standards

### Color System
Generate a full 10-shade palette from any brand color:

```
shade-50:  H, S×0.95, 97%   ← lightest tint
shade-500: H, S, L            ← original color
shade-950: H, S×1.15, 25%    ← near-black
```

Neutral grays: tint with 3–5% of primary hue. Always include semantic tokens:
- Success: green (#10B981 default)
- Warning: amber (#F59E0B default)
- Error: red (#EF4444 default)
- Info: blue (#3B82F6 default, or use primary if blue)

### Typography Scale
```
12px / 14px / 16px / 18px / 20px / 24px / 30px / 36px / 48px
```
Minimum contrast: 4.5:1 (WCAG AA body), 3:1 (large text). All fonts from Google Fonts for web accessibility.

### Spacing (8px grid)
```
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 80 / 96px
```

### Component States
Always design all states: default, hover, focus, active, disabled, loading, error, empty.

### Accessibility (WCAG AA)
- 4.5:1 contrast for normal text
- 3:1 contrast for large text and UI components
- Visible focus indicators (`:focus-visible` with 2px outline + 2px offset)
- 44×44px minimum touch targets
- Semantic HTML (`<nav>`, `<main>`, `<button>`, `<label>`)

### Dark Mode
Always provide dark mode tokens:
```css
:root { --bg: #ffffff; --text: #0f172a; }
[data-theme="dark"] { --bg: #0f172a; --text: #f8fafc; }
```

### Motion
```
Micro:   100–150ms, ease-out       (hover states, toggles)
Standard: 200–300ms, ease-in-out  (modals, dropdowns)
Complex: 400–500ms, cubic-bezier  (page transitions, FLIP)
```
Always include: `@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; } }`

### Token Architecture (3-Tier)
```
Tier 1 (Primitives): --blue-500: #3b82f6
Tier 2 (Semantic):   --color-action: var(--blue-500)
Tier 3 (Component):  --button-bg: var(--color-action)
```
Components reference Tier 3 only. Theme changes override Tier 2.

## Output by Task Type

**UI/Page design** → Full HTML with CSS custom properties, semantic markup, responsive, dark mode, vanilla JS interactions

**Design tokens** → CSS custom properties file + Tailwind config extension + Design Tokens JSON (W3C format)

**React/Next.js** → TypeScript components, `cn()` for conditional classes, `'use client'` only when needed

**Email** → Table-based HTML, inline styles, VML buttons for Outlook, `@media` responsive rules

**Social content** → HTML at exact platform dimensions, safe zone guides, platform-specific typography

**Brand kit** → Color palette, type scale, spacing system, component tokens, visual reference page

**Video/Presentation** → Structured script/slide content with visual direction notes

## Platform Specs Reference

### Social Media Dimensions
| Platform | Format | Dimensions | Safe Zone |
|----------|--------|-----------|-----------|
| Instagram | Square feed | 1080×1080 | full |
| Instagram | Portrait feed | 1080×1350 | full |
| Instagram | Story/Reel | 1080×1920 | 1080×1420 center |
| TikTok | Video | 1080×1920 | 1080×1200 center |
| LinkedIn | Feed image | 1200×628 | full |
| LinkedIn | Square | 1080×1080 | full |
| Twitter/X | Card | 1600×900 | full |

### Email Dimensions
- Max width: 600px
- Min font size: 14px body, 22px+ headline
- Preheader: 85–100 characters
- CTA buttons: min 44px height, full-width on mobile
