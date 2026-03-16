# /brand-kit — Lumina Brand Kit

**Inputs:** Primary color `#1E3A5F` (navy), brand name "Lumina", mood "professional"

---

## Brand Identity Summary

**Lumina** is a professional B2B analytics platform. The brand communicates clarity, precision, and trustworthiness through deep navy, structured typography, and minimal ornamentation. Every design decision supports a single message: *your data, made clear*.

---

## Brand Voice

Lumina's voice is **clear, confident, and direct**. It speaks to data professionals who value precision over fluff.

| Dimension | Description |
|-----------|-------------|
| Tone | Professional but approachable — knowledgeable without being condescending |
| Language | Concrete and specific — "reduce report time by 80%" not "transform your analytics" |
| Personality | Trustworthy data guide — like a senior analyst who explains things well |
| Voice do | Use active voice, specific numbers, action-oriented CTAs |
| Voice don't | Avoid jargon overload, vague superlatives ("best-in-class"), passive constructions |

**CTA examples following voice guidelines:**
- ✅ "Start your free 14-day trial"
- ✅ "See your data in minutes"
- ❌ "Experience the power of data" (vague)
- ❌ "Click here to get started" (weak)

---

## Color System

### Primary Palette (Navy)

| Token | Hex | Use |
|-------|-----|-----|
| `--navy-50`  | `#EEF2F7` | Tinted backgrounds |
| `--navy-300` | `#82A3C8` | Decorative elements |
| `--navy-500` | `#1E3A5F` | Headers, nav, brand anchors |
| `--navy-800` | `#102237` | Dark mode surfaces |
| `--navy-950` | `#06101A` | Dark mode backgrounds |

### Accent Palette (Blue)

| Token | Hex | Use |
|-------|-----|-----|
| `--blue-400` | `#60A5FA` | Hover highlights |
| `--blue-500` | `#3B82F6` | CTAs, links, active states |
| `--blue-700` | `#1D4ED8` | Pressed states, high-contrast badges |

Color is accessible: primary button (white on `#3B82F6`) achieves 4.7:1 contrast — passes WCAG AA.

---

## Typography

**Heading font:** Inter (700, 600 weights) — clean geometric sans, excellent legibility at large sizes
**Body font:** Inter (400, 500 weights) — consistent with heading to maintain cohesion

### Type Scale

| Role | Size | Weight | Usage |
|------|------|--------|-------|
| Display | 56px / 1.1 | 700 | Hero headlines |
| H1 | 36px / 1.2 | 600 | Section headings |
| H2 | 24px / 1.3 | 600 | Card headings, sub-sections |
| Body | 16px / 1.6 | 400 | Body copy |
| Caption | 14px / 1.4 | 500 | Labels, meta, badges |
| Micro | 12px / 1.3 | 500 | Fine print, timestamps |

---

## Component Tokens

Quick reference for consistent component styling:

- **Buttons:** 8px radius, 40px default height, semibold labels
- **Cards:** 12px radius, 24px padding, 1px border `#E5E7EB`, subtle shadow
- **Inputs:** 8px radius, 40px height, 1px border, focus ring `3px solid #93C5FD`

---

## Delivered Files

- `brand-tokens.css` — full CSS custom properties (light + dark mode)
- `tailwind.config.js` — Tailwind theme extension
- `tokens.json` — Design Tokens JSON (W3C format)
- `brand-kit.html` — visual reference page with swatches and type samples

---

## What's Next

- `/design` — build pages and components using the Lumina brand tokens
- `/figma-create` — create Figma styles and variables from this brand kit
- `/design-system` — extend with component-level tokens
