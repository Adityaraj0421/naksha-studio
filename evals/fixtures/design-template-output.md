# /design-template — Lumina SaaS Landing Page

**Input:** `landing-page for Lumina analytics — #1E3A5F brand color, professional`

---

## Template Selection

**Template:** SaaS Landing Page
**Layout:** Hero → Features grid → Social proof → Pricing → CTA footer
**Grid:** 12-column, max-width 1280px, 24px gutters

This template follows the SaaS conversion pattern: lead with the value prop (hero), prove it (features + social proof), make it easy to say yes (pricing + CTA).

---

## Component Breakdown

| Component | Description |
|-----------|-------------|
| `SiteNav` | Sticky top nav — logo, 3 links, login + CTA buttons |
| `HeroSection` | Headline + subtext + 2 CTAs + dashboard screenshot |
| `LogoBar` | "Trusted by" strip — 6 company logos, grayscale |
| `FeatureGrid` | 3-column grid — icon, headline, 2-line description per feature |
| `TestimonialRow` | 3 testimonial cards — avatar, quote, name, title, company |
| `PricingSection` | 3-tier pricing cards — Free, Pro, Enterprise |
| `CtaSection` | Full-width CTA band — headline + primary button |
| `SiteFooter` | 4-column footer — links, social icons, legal |

---

## Layout Tokens

```css
:root {
  --color-brand: #1E3A5F;
  --color-accent: #3B82F6;
  --color-bg: #F9FAFB;
  --color-surface: #FFFFFF;
  --color-text: #111827;
  --color-text-muted: #6B7280;
  --spacing-section: 96px;
  --spacing-gap: 32px;
  --radius-card: 12px;
}
```

---

## What's Next

- `/design-framework react-tailwind design-output.html` — convert to React components
- `/figma-create` — push the layout to Figma for the design team
