# /design-qa — Lumina SaaS Pricing Page QA Report

**File**: `src/pages/pricing.html`
**Run date**: 2026-03-16T10:30:00Z

## Overall Score: 78/100

Strong token compliance and desktop layout. Two responsive issues at mobile breakpoint need fixing before launch.

## Responsive Design (18/25)

### Mobile (375px)
- ❌ Pricing cards overflow viewport width — missing `width: 100%` on `.pricing-card` at ≤480px
- ❌ Feature comparison table has horizontal scroll — needs `overflow-x: auto` wrapper or column collapse
- ✅ CTA buttons meet 44px touch target minimum
- ✅ Font sizes readable (min 16px body confirmed)

### Tablet (768px)
- ✅ 2-column card layout renders correctly
- ✅ Navigation collapses to hamburger
- ⚠️ Sidebar sticky positioning breaks at exactly 768px — add 1px buffer: `@media (min-width: 769px)`

### Desktop (1280px)
- ✅ Max-width 1280px container centered
- ✅ 3-column card layout correct
- ✅ Feature table readable, no overflow

## Token Compliance (22/25)

**Compliance**: 88% tokenized (44 of 50 CSS values use custom properties)

### Hardcoded Values Found

| Location | Value | Suggested Token |
|----------|-------|-----------------|
| `.plan-badge` | `background: #2563EB` | `var(--color-brand-primary)` |
| `.popular-label` | `font-size: 13px` | `var(--text-sm)` |
| `.divider` | `border-color: #E5E7EB` | `var(--color-border-subtle)` |
| `.annual-badge` | `padding: 3px 7px` | `var(--space-1) var(--space-2)` |
| `.footer-note` | `color: #9CA3AF` | `var(--color-text-tertiary)` |
| `.cta-secondary` | `border-radius: 6px` | `var(--radius-md)` |

## Interactive States (20/25)

- ✅ Primary CTA: hover, focus-visible, active states present
- ✅ Toggle (monthly/annual): checked and unchecked state variants
- ✅ Plan cards: hover lift effect present
- ❌ Secondary "Learn more" links: no `:focus-visible` style — fails keyboard accessibility
- ❌ FAQ accordion: no `:focus` ring on trigger button
- ⚠️ Disabled state not designed for sold-out plan tier

## Motion & Polish (18/25)

- ✅ Card hover: 200ms ease-out transition — appropriate
- ✅ `prefers-reduced-motion` media query present
- ❌ Page-load animation blocks content visibility — remove or defer until after first paint
- ⚠️ Toggle animation: 350ms linear — should be `ease-in-out`

## Issues Summary

| # | Severity | Category | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | Blocker | Responsive | Cards overflow at mobile breakpoint | Add `width: 100%` at ≤480px |
| 2 | Blocker | Responsive | Comparison table horizontal scroll | Wrap in `overflow-x: auto` |
| 3 | Important | States | Missing focus-visible on secondary links | Add `:focus-visible { outline: 2px solid var(--color-brand-primary); }` |
| 4 | Important | Motion | Page-load fadeIn blocks content | Move animation trigger to `DOMContentLoaded` event |

---
