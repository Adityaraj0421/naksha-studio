# /naksha-browse https://stripe.com

**Capturing design patterns from URL: https://stripe.com**

---

## Browser Capture

Launching Playwright browser session → navigating to https://stripe.com → taking full-page screenshot → extracting DOM structure and computed styles.

| Step | Status |
|------|--------|
| Browser launch | ✅ Playwright MCP connected |
| Page load | ✅ https://stripe.com — 200 OK |
| Screenshot | ✅ Full-page captured (1440×4200px) |
| Style extraction | ✅ 847 CSS rules parsed |
| DOM analysis | ✅ Semantic structure mapped |

---

## Visual Findings

### Layout & Grid

- **Grid system:** 12-column grid with 80px gutters and 120px outer margins on desktop; collapses to 4-column on mobile (375px viewport)
- **Section rhythm:** Consistent 120px vertical padding between major sections; 48px within section sub-groups
- **Container width:** Max-width 1200px, centered

### Typography

- **Primary typeface:** `Sohne` (custom), system fallback `ui-sans-serif, system-ui`
- **Type scale:** Hero 56px / Section heading 36px / Body 18px / Caption 14px
- **Line heights:** 1.1 for headlines, 1.6 for body copy
- **Weight usage:** Bold (700) headlines, Regular (400) body, Medium (500) UI labels

### Color Palette

| Role | Value | Usage |
|------|-------|-------|
| Brand indigo | `#635BFF` | Primary CTA buttons, links, highlights |
| Dark background | `#0A2540` | Hero section, footer |
| White | `#FFFFFF` | Card backgrounds, body text on dark |
| Body text | `#425466` | Paragraph copy on white |
| Border subtle | `#E6EBF1` | Card borders, dividers |

### Component Patterns

- **Primary CTA button:** `background: #635BFF`, 16px/12px padding, 6px border-radius, shadow on hover
- **Feature cards:** White background, 1px border `#E6EBF1`, 24px padding, 8px border-radius, icon + heading + body layout
- **Navigation:** Sticky top bar with backdrop-blur after 64px scroll; mega-menu on hover

### UX Patterns

- Progressive disclosure: headline → subheadline → expandable detail
- Social proof logo bar placed immediately below hero fold — visible without scrolling
- Floating labels on form inputs (not placeholder-only)
- Error states: red `#F83245` with left border accent on input fields

---

## Findings Written to Project Memory

The following block will be applied to `.naksha/project.json` at session end via the Stop hook:

```
<!-- naksha-memory-update
{
  "type": "browser_finding_write",
  "url": "https://stripe.com",
  "mode": "full",
  "patterns": [
    "12-column grid, 80px gutters, 120px outer margins",
    "Type scale: 56/36/18/14px with Sohne custom font",
    "Brand indigo #635BFF for primary CTAs",
    "8px base border-radius on cards",
    "Hero: dark #0A2540 background with light foreground",
    "Logo bar social proof immediately below hero fold",
    "Sticky nav with backdrop-blur after 64px scroll"
  ],
  "captured_at": "2026-05-29T10:14:22Z"
}
-->
```

---

## How These Findings Flow Into Future Commands

These browser findings are now stored in `browser_findings` in `.naksha/project.json` and will automatically inform:

- **`/design`** — injects layout grid, type scale, and color palette as reference context
- **`/brand-kit`** — uses the extracted palette as inspiration when generating brand colors
- **`/design-system`** — references the token pattern (8px radius, spacing rhythm) during token generation

Run `/naksha-status` to verify the findings were saved. Run `/naksha-browse <another-url>` to add more reference captures (queue is capped at 20 entries, oldest removed first).
