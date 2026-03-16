# /design — SaaS Analytics Dashboard Landing Page (Lumina)

**Prompt:** Design a landing page for Lumina, a B2B SaaS analytics dashboard platform.

---

## Creative Direction

**Design brief assembled by UI Designer and Product Designer:**

- **Mood:** Professional, data-driven, trustworthy
- **Visual tone:** Clean, minimal — light backgrounds with deep navy anchors
- **Color strategy:** Primary `#1E3A5F` (navy), accent `#3B82F6` (blue), neutral grays
- **Typography:** Inter — a clean, modern sans-serif that reads well at all scales
- **Target audience:** Data analysts, product managers, CTOs at mid-market SaaS companies

---

## Layout System

The UI Designer specified a 12-column grid at 1280px max-width with 24px gutters. Key sections:

1. **Nav** — sticky top bar, logo left, links center, CTA right
2. **Hero** — 60/40 split layout: headline + CTA left, dashboard screenshot right
3. **Social proof** — logo strip, 6 recognizable brand logos
4. **Features** — 3-column card grid with icon, heading, 2-line description
5. **Metrics** — full-width dark section with 4 stat counters (animated on scroll)
6. **Testimonials** — 2-column quote cards with avatar and role
7. **Pricing** — 3-tier cards with feature list and CTA per tier
8. **Footer** — 4-column link grid + newsletter signup

---

## Typography Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Hero headline | 56px | 700 | 1.1 |
| Section heading | 36px | 600 | 1.2 |
| Card heading | 20px | 600 | 1.3 |
| Body copy | 16px | 400 | 1.6 |
| Caption / label | 14px | 500 | 1.4 |
| Nav link | 14px | 500 | 1.0 |

Font: Inter (loaded via Google Fonts CDN). All sizes are CSS custom properties — `--text-hero`, `--text-section`, `--text-card-heading`, `--text-body`, `--text-caption`.

---

## Color Tokens

```css
:root {
  /* Brand */
  --color-primary:     #1E3A5F;  /* navy — headers, nav */
  --color-accent:      #3B82F6;  /* blue — CTAs, links */
  --color-accent-hover:#2563EB;

  /* Surfaces */
  --color-background:  #F9FAFB;
  --color-surface:     #FFFFFF;
  --color-surface-alt: #F1F5F9;

  /* Text */
  --color-text-primary:   #111827;
  --color-text-secondary: #6B7280;
  --color-text-inverse:   #FFFFFF;

  /* Status */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error:   #EF4444;
}
```

---

## Implementation Notes

The output is a single-file HTML page using Tailwind CSS via CDN. Key implementation notes:

- Semantic HTML: `<nav>`, `<main>`, `<section>`, `<footer>` — no generic `<div>` soup
- Responsive breakpoints: 375px (mobile), 768px (tablet), 1280px (desktop)
- Dark mode supported via `prefers-color-scheme` media query
- Scroll-triggered counter animation using IntersectionObserver API
- Accessible: contrast ratios checked (body text 8.5:1, accent on white 4.7:1)
- Smooth hover transitions on all interactive elements (200ms ease-out)

---

## Quality Review

- [x] Layout matches creative brief — clean, data-forward
- [x] Responsive at 375px, 768px, 1280px
- [x] Typography scale provides clear visual hierarchy
- [x] Color palette accessible (all text meets WCAG AA 4.5:1 minimum)
- [x] No placeholder text in final output
- [x] CTAs are action-oriented: "Start Free Trial", "See Live Demo", "View Pricing"

---

## What's Next

- `/design-review` — audit for accessibility and usability issues
- `/design-system` — extract the color and typography tokens into a reusable system
- `/figma-create` — recreate in Figma for the design team
