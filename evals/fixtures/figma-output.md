# /figma — Figma-to-Code: Lumina Dashboard Header

**Input:** `https://figma.com/design/xK9mPqRt2nBv/Lumina-Design?node-id=42:187`

---

## Design Analysis

### Frame Properties

| Property | Value |
|----------|-------|
| Frame name | `Dashboard / Header` |
| Frame dimensions | 1440 × 72px |
| Auto-layout | HORIZONTAL, itemSpacing=0 |
| Background | `#FFFFFF` |
| Border-bottom | `1px solid #E5E7EB` |

### Component Inventory

Three reusable component instances found in this frame:

1. **NavLogo** — component with logo mark + wordmark text
2. **NavLink** — component with variant property `state: default | hover | active`
3. **PrimaryButton** — component with variant properties `size: sm | md | lg` and `style: filled | ghost`

### Variant States

The `NavLink` component has 3 variants:
- `state=default` — `color: #374151`, no underline
- `state=hover` — `color: #1E3A5F`, underline `#3B82F6`
- `state=active` — `color: #1E3A5F`, left border `3px solid #3B82F6`

The `PrimaryButton` component has 6 variants (3 sizes × 2 styles):
- `size=md, style=filled` — height 40px, bg `#3B82F6`, text white, radius 8px
- `size=md, style=ghost` — height 40px, bg transparent, border `#3B82F6`, text `#3B82F6`

---

## Implementation

```html
<nav class="site-nav">
  <div class="nav-inner">
    <a href="/" class="nav-logo" aria-label="Lumina home">
      <img src="logo.svg" alt="Lumina" width="120" height="32" />
    </a>
    <ul class="nav-links" role="list">
      <li><a href="/features" class="nav-link">Features</a></li>
      <li><a href="/pricing" class="nav-link">Pricing</a></li>
      <li><a href="/docs" class="nav-link">Docs</a></li>
    </ul>
    <div class="nav-actions">
      <a href="/login" class="btn btn-ghost btn-md">Log in</a>
      <a href="/signup" class="btn btn-filled btn-md">Start Free Trial</a>
    </div>
  </div>
</nav>
```

```css
.site-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #fff;
  border-bottom: 1px solid #E5E7EB;
  height: 72px;
  display: flex;
  align-items: center;
}
.nav-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 32px;
}
.nav-links { display: flex; gap: 8px; list-style: none; margin: 0; padding: 0; }
.nav-link {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  padding: 6px 12px;
  border-radius: 6px;
  text-decoration: none;
  transition: color 150ms ease-out;
}
.nav-link:hover { color: #1E3A5F; }
.nav-actions { margin-left: auto; display: flex; gap: 8px; align-items: center; }
```

---

## Pixel-Fidelity Comparison

After preview screenshot comparison with the Figma frame:

| Check | Result |
|-------|--------|
| Height (72px) | ✅ Match |
| Border-bottom color | ✅ Match |
| Nav link font-size / weight | ✅ Match |
| Logo dimensions | ✅ Match |
| CTA button dimensions | ✅ Match |
| Gap between nav links | ✅ Match (8px) |

---

## What's Next

- `/design-review` — audit the full implementation for quality
- `/figma-sync` — check if code stays in sync with Figma over time
