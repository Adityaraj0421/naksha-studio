# /figma-create — Lumina SaaS dashboard wireframes

**Input:** `Create Figma file for Lumina SaaS dashboard — wireframe fidelity, 3 breakpoints`

---

## Figma File Structure

Created Figma file: **Lumina SaaS — Dashboard Wireframes**

| Page | Contents |
|------|----------|
| Page 1 — Wireframes | All breakpoint frames at grayscale wireframe fidelity |
| Page 2 — Components | Shared component definitions used across wireframe frames |
| Page 3 — Annotations | UX notes, redline specs, and interaction callouts |

File is organized for handoff: Page 1 is the primary deliverable, Page 2 houses the component source of truth, and Page 3 provides context for engineers and stakeholders reviewing the wireframe set.

---

## Frame Inventory

All frames live on **Page 1 — Wireframes**. Each frame uses grayscale fills only — no brand color is applied at this wireframe fidelity stage.

| Frame Name | Dimensions | Fidelity |
|------------|------------|----------|
| `Dashboard/Desktop` | 1440 × 900px | Grayscale wireframe |
| `Dashboard/Tablet` | 768 × 1024px | Grayscale wireframe |
| `Dashboard/Mobile` | 375 × 812px | Grayscale wireframe |

Frame naming follows the `[Screen/Breakpoint]` convention. Each frame is a top-level frame with a fixed background of `#F9FAFB` to simulate a light app shell. Internal layout regions use `#FFFFFF` fills to denote card surfaces and `#E5E7EB` for dividers.

### Desktop Frame — Layout Regions

```
┌─────────────────────────────────────────────────┐
│ TopBar (1440 × 56px)                            │
├──────────────┬──────────────────────────────────┤
│ NavSidebar   │ Main Content Area                │
│ (240px wide) │ (1200px wide)                    │
│              │  ┌────┐ ┌────┐ ┌────┐ ┌────┐   │
│              │  │Stat│ │Stat│ │Stat│ │Stat│   │
│              │  └────┘ └────┘ └────┘ └────┘   │
│              │  ┌──────────────────────────┐   │
│              │  │ DataTable                │   │
│              │  └──────────────────────────┘   │
└──────────────┴──────────────────────────────────┘
```

### Tablet Frame — Layout Regions

NavSidebar collapses to icon-only rail (48px wide) at tablet breakpoint. StatCards reflow to a 2×2 grid. DataTable gains a horizontal scroll container.

### Mobile Frame — Layout Regions

NavSidebar hidden; bottom navigation bar added (56px tall). StatCards stack to a single column. DataTable replaced with a card-list view pattern.

---

## Component Usage

All wireframe components live on **Page 2 — Components** and are referenced as instances in the wireframe frames. No component detachment is allowed in the wireframe frames.

| Component | Instances in Desktop Frame | Notes |
|-----------|---------------------------|-------|
| `NavSidebar` | 1 | Left rail, collapsible |
| `TopBar` | 1 | Sticky header, 56px height |
| `StatCard` | 4 | Grid row beneath TopBar |
| `DataTable` | 1 | Below stat card row |
| `ChartPlaceholder` | 2 | Right column on desktop |
| `FilterBar` | 1 | Above DataTable |

Each component in the wireframe uses only `#E5E7EB` and `#D1D5DB` fills with `#374151` text to maintain wireframe neutrality. Component instances are not overridden at the color level — variant selection controls state.

**StatCard** is the most reused component: 4 instances on desktop, 4 on tablet (2×2 grid), 4 on mobile (stacked). The `positive-trend` and `negative-trend` variants use a small arrow icon placeholder only; no green/red color is applied at wireframe fidelity.

---

## Layer Naming

All layers follow the naming convention `[Section/ComponentName] — [State]`. This convention applies to both top-level frames and nested groups within each frame.

### Examples

| Layer Name | What It Is |
|------------|------------|
| `NavSidebar — Collapsed` | Sidebar in icon-only state |
| `NavSidebar — Expanded` | Sidebar with full labels visible |
| `TopBar — Default` | Standard top bar without notifications |
| `TopBar — WithAlert` | Top bar with notification badge active |
| `StatCard — Default` | Neutral stat card |
| `StatCard — PositiveTrend` | Stat card with upward trend indicator |
| `StatCard — NegativeTrend` | Stat card with downward trend indicator |
| `DataTable — Loading` | Table in skeleton/loading state |
| `DataTable — Populated` | Table with mock row data |
| `FilterBar — Idle` | No active filters applied |
| `FilterBar — Active` | One or more filters applied |

Layer names must not use spaces around the em-dash separator. Figma auto-generates group names — all auto-names should be replaced before handoff. Layers that are used only for spacing (e.g. invisible spacer rectangles) are prefixed with `_spacer` and hidden by default.

---

## Auto-Layout Notes

Auto-layout is applied throughout to ensure frames remain responsive when resized within their breakpoint range.

### NavSidebar

```
Direction:    Vertical
Gap:          8px
Padding:      16px (all sides)
Alignment:    Top-left
Resizing:     Fixed width (240px expanded, 48px collapsed)
```

The sidebar uses a vertical autolayout with `gap: 8` between nav items. A `NavItem` component instance is repeated for each route. The collapse behavior is controlled by switching the sidebar's `size` variant property from `expanded` to `collapsed`.

### Main Content Area

```
Direction:    Horizontal
Gap:          24px
Padding:      24px
Alignment:    Top-left
Resizing:     Fill container (stretches to remaining width)
```

### StatCard Grid Row

```
Direction:    Horizontal (wrap mode enabled)
Gap:          16px
Padding:      0
Wrap spacing: 16px
Alignment:    Top-left
Resizing:     Fill container
```

Wrap mode is critical for the StatCard grid — it allows the 4-card row on desktop to reflow to a 2×2 grid on tablet and 1-column stack on mobile without duplicating frames. The autolayout container width drives the reflow automatically.

### DataTable

```
Direction:    Vertical
Gap:          0
Padding:      0
Alignment:    Top-left
Resizing:     Fill container (both axes)
```

---

## Variant Setup

Variants are defined on **Page 2 — Components** using Figma Component Properties.

### StatCard Variants

The `StatCard` component has **3 variants** controlled by a single `trend` property:

| Variant Name | Property Value | Visual Indicator |
|--------------|---------------|------------------|
| `StatCard — Default` | `trend=neutral` | No arrow icon |
| `StatCard — PositiveTrend` | `trend=positive` | Up-arrow icon placeholder |
| `StatCard — NegativeTrend` | `trend=negative` | Down-arrow icon placeholder |

Component property definition:

```
Property name:  trend
Type:           Variant
Options:        neutral | positive | negative
Default:        neutral
```

### NavSidebar Variants

The `NavSidebar` component has **2 variants** via a `size` property:

| Variant Name | Property Value | Width |
|--------------|---------------|-------|
| `NavSidebar — Expanded` | `size=expanded` | 240px |
| `NavSidebar — Collapsed` | `size=collapsed` | 48px |

### TopBar Variants

The `TopBar` component has **2 variants** via an `alert` boolean property:

| Variant Name | Property Value | Badge Visible |
|--------------|---------------|---------------|
| `TopBar — Default` | `alert=false` | No |
| `TopBar — WithAlert` | `alert=true` | Yes (count badge) |

All variant properties use the built-in Figma component properties panel. No variant switching should be done by swapping instances manually — always use the properties panel to preserve auto-layout relationships.

---

## Next Steps

- `/figma-prototype` — wire the dashboard frames into a clickable prototype
- `/figma-responsive` — generate the responsive breakpoint variants
- `/design-review` — audit wireframes before moving to hi-fi

---
