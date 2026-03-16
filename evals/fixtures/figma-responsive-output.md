# /figma-responsive — Lumina SaaS landing page hero section responsive variants

**Input:** `Create mobile/tablet/desktop variants of Lumina SaaS landing page hero section`

---

## Responsive Strategy

The Lumina SaaS landing page hero section is built with a **mobile-first** responsive strategy. Three breakpoint variants are created as separate Figma frames, each at its canonical viewport width. The hero reflows from a single-column stacked layout on mobile to a two-column side-by-side layout on desktop.

| Principle | Decision |
|-----------|----------|
| Strategy | Mobile-first (mobile is the base frame) |
| Column model | 1-column (mobile) → 2-column (tablet) → 2-column wide (desktop) |
| Hero image | Below fold on mobile → right column on tablet/desktop |
| Max content width | 1200px on desktop, full-bleed on tablet and mobile |
| Spacing scale | 8px base unit; padding scales with breakpoint |
| Typography | Fluid scale: 32px → 40px → 56px headline |

The strategy prioritizes readability and CTA visibility on small screens. The hero image is deprioritized on mobile (below fold) because user research showed it did not increase conversion on small-screen sessions.

---

## Breakpoint Definitions

Three breakpoints are defined, matching the Lumina SaaS production CSS breakpoint system:

| Breakpoint | Range | Frame Width | Frame Name |
|------------|-------|-------------|------------|
| Mobile | < 768px | 375px | `Hero/Mobile` |
| Tablet | 768px – 1279px | 768px | `Hero/Tablet` |
| Desktop | ≥ 1280px | 1280px | `Hero/Desktop` |

These breakpoint values are stored as Figma local variables in the `Breakpoints` variable collection so that constraint and layout rules can reference them programmatically. The `breakpoint` variable set is:

```
breakpoint/mobile-max:   767px
breakpoint/tablet-min:   768px
breakpoint/tablet-max:   1279px
breakpoint/desktop-min:  1280px
```

All three hero frames are placed on **Page 1 — Responsive Layouts** in the Figma file, ordered left-to-right from smallest to largest for easy side-by-side comparison.

---

## Mobile Layout (375px)

Frame: `Hero/Mobile` — 375 × 812px

The mobile hero is a single-column, top-to-bottom stacked layout. All content is centered horizontally with 20px horizontal padding.

### Layout Structure

```
┌──────────────────────────────────────┐
│  NavBar (375 × 48px)                 │
├──────────────────────────────────────┤
│  [Badge: "New — v2.0 Released"]      │
│                                      │
│  Headline (32px / 1.2 line-height)   │
│  "Automate your design workflow"     │
│                                      │
│  Subheadline (16px)                  │
│  2-line supporting copy              │
│                                      │
│  [CTA Button — Full Width]           │
│  "Start Free Trial"                  │
│                                      │
│  [Social proof: 3 avatar + count]    │
│                                      │
│  ─────────────────────────────────   │
│  [Hero Image — below fold]           │
│  App UI mockup screenshot            │
└──────────────────────────────────────┘
```

### Typography

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Headline | 32px | 700 | 1.2 |
| Subheadline | 16px | 400 | 1.5 |
| CTA button label | 16px | 600 | 1 |
| Badge text | 12px | 500 | 1 |

### Spacing

| Region | Value |
|--------|-------|
| Horizontal padding | 20px |
| Vertical gap between elements | 16px |
| CTA top margin | 24px |
| Hero image top margin | 40px |

The CTA button is full-width on mobile — it stretches to fill the available content width (375 − 40px padding = 335px). This is controlled by setting the button component's `width` property to `fill container` and the auto-layout resizing to `fill parent`.

---

## Tablet Layout (768px)

Frame: `Hero/Tablet` — 768 × 900px

The tablet hero introduces a **2-column layout** with a 60/40 column split. The headline increases to 40px. The CTA is inline with a secondary action button (ghost style).

### Layout Structure

```
┌───────────────────────────────────────────────┐
│  NavBar (768 × 56px)                          │
├───────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌───────────────┐  │
│  │ Left Column (60%)    │  │ Right Column  │  │
│  │                      │  │ (40%)         │  │
│  │ Badge                │  │               │  │
│  │                      │  │ Hero Image    │  │
│  │ Headline (40px)      │  │ (app mockup)  │  │
│  │                      │  │               │  │
│  │ Subheadline (17px)   │  │               │  │
│  │                      │  │               │  │
│  │ [CTA] [Secondary]    │  │               │  │
│  │                      │  │               │  │
│  └──────────────────────┘  └───────────────┘  │
└───────────────────────────────────────────────┘
```

### Typography

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Headline | 40px | 700 | 1.15 |
| Subheadline | 17px | 400 | 1.5 |
| CTA button label | 15px | 600 | 1 |

### CTA Row

The CTA row uses a horizontal auto-layout:
- Primary CTA: "Start Free Trial" (filled button, auto width)
- Secondary action: "Watch Demo →" (ghost button, auto width)
- Gap between buttons: 12px

The CTA is no longer full-width — it sizes to its content on tablet and desktop. The `width` property on the button component is set to `hug contents`.

### Column Setup

The two-column layout uses a horizontal auto-layout container:
- Total width: 100% of frame (minus 40px horizontal padding = 688px)
- Left column: 60% = ~413px, set to `fixed` width
- Right column: fill remaining space
- Gap: 40px between columns

---

## Desktop Layout (1280px+)

Frame: `Hero/Desktop` — 1280 × 800px

The desktop hero expands to the full breakpoint width with a **max-width 1200px** content container centered in the frame. The headline grows to 56px. The hero image column shows a floating UI mockup overlay on top of the base screenshot.

### Layout Structure

```
┌────────────────────────────────────────────────────────────┐
│  NavBar (1280 × 64px)                                      │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Content container (max-width: 1200px, centered)      │  │
│  │  ┌──────────────────────────┐  ┌──────────────────┐  │  │
│  │  │ Left Column (~54%)       │  │ Right Column     │  │  │
│  │  │                          │  │ (~46%)           │  │  │
│  │  │ Badge                    │  │                  │  │  │
│  │  │                          │  │ [Hero Image]     │  │  │
│  │  │ Headline (56px)          │  │  + [Floating UI  │  │  │
│  │  │                          │  │    Mockup Layer] │  │  │
│  │  │ Subheadline (18px)       │  │                  │  │  │
│  │  │                          │  │                  │  │  │
│  │  │ [CTA] [Secondary]        │  │                  │  │  │
│  │  │                          │  │                  │  │  │
│  │  │ Social proof row         │  │                  │  │  │
│  │  └──────────────────────────┘  └──────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Typography

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Headline | 56px | 700 | 1.1 |
| Subheadline | 18px | 400 | 1.6 |
| CTA button label | 16px | 600 | 1 |

### Floating Mockup Overlay

The right column on desktop uses a layered image treatment:
1. Base layer: `HeroImage — AppScreenshot` (app dashboard screenshot, full column width)
2. Overlay layer: `HeroImage — FloatingMockup` (a smaller card/widget mockup, positioned at bottom-right of the base image, rotated −3deg, with a drop shadow)

The overlay layer uses `position: absolute`-equivalent Figma placement (not part of the column auto-layout — manually positioned).

---

## Constraint Settings

Figma constraints control how each element responds when a frame is resized within its breakpoint range.

| Element | Horizontal Constraint | Vertical Constraint | Notes |
|---------|----------------------|---------------------|-------|
| `NavBar` | Left & Right | Top | Stretches full width; pinned to top |
| `Hero content container` | Center | Top | Centers within frame; max-width enforced separately |
| `Primary CTA button (mobile)` | Left & Right | Top | Stretches full width on mobile only |
| `Primary CTA button (tablet/desktop)` | Left | Top | Hugs content; does not stretch |
| `Secondary action button` | Left | Top | Hugs content |
| `Hero image (right column)` | Left & Right | Top & Bottom | Fills right column area |
| `Floating mockup overlay` | Right | Bottom | Stays anchored to bottom-right of image |
| `Social proof row` | Left | Top | Left-aligned, does not stretch |

### Mobile CTA Stretch — Constraint Detail

On mobile, the Primary CTA button uses `Left & Right` constraint so it stretches to fill the content column when the frame width changes. The constraint is set on the button's parent container (the CTA row auto-layout), not on the button component instance directly. The button instance inside that container has resizing set to `fill container`.

This `responsive` behavior is intentional: the mobile CTA stretches while the tablet and desktop CTA sizes to its content, providing the best conversion-focused layout at each breakpoint.

---
