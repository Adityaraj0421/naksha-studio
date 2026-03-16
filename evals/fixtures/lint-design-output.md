# /lint-design — Lumina SaaS Dashboard Lint Report

**File**: Lumina – Dashboard v2.1
**Page**: Main Dashboard
**Scanned**: 2026-03-16T09:14:22Z

## Lint Summary

| Category | Errors | Warnings | Info |
|----------|--------|----------|------|
| Color Consistency | 3 | 7 | 0 |
| Typography | 0 | 5 | 2 |
| Spacing | 0 | 6 | 1 |
| Layout | 0 | 3 | 4 |
| Components | 1 | 2 | 3 |
| Accessibility | 2 | 1 | 0 |
| **Total** | **6** | **24** | **10** |

## Lint Score: 64/100

**Severity breakdown**: 6 errors must be fixed before handoff; 24 warnings should be addressed.

## Errors (Must Fix)

| # | Rule | Node | Issue | Fix |
|---|------|------|-------|-----|
| 1 | low-contrast | "Revenue Subtitle" | 2.9:1 ratio (need 4.5:1) | Change to `--neutral-800 (#1F2937)` |
| 2 | low-contrast | "Active Users Caption" | 3.1:1 ratio | Change to `--neutral-700 (#374151)` |
| 3 | orphan-color | "Card Background" | `#F3F4F6` not linked to Paint Style | Create `Surface/Card` style |
| 4 | orphan-color | "Sidebar Hover" | `#E5E7EB` not linked to Paint Style | Link to `Surface/Hover` |
| 5 | orphan-color | "Chart Line Blue" | `#2563EB` not in Paint Styles | Link to `Brand/Primary` |
| 6 | missing-component-desc | "MetricCard" | Component set has no description | Add description: "KPI display card with trend indicator" |

## Warnings (Should Fix)

| # | Rule | Node | Issue | Fix |
|---|------|------|-------|-----|
| 1 | odd-spacing | "Header Container" | Gap 13px — not on 4/8px grid | Change to `12px` |
| 2 | odd-spacing | "Stat Card Padding" | Padding-right 22px | Change to `24px` |
| 3 | odd-spacing | "Nav Item" | Vertical padding 7px | Change to `8px` |
| 4 | missing-autolayout | "Chart Section" | 4 children, no autolayout | Add autolayout: Vertical, gap 16px |
| 5 | missing-autolayout | "Action Bar" | 3 children, manual position | Add autolayout: Horizontal, gap 12px |
| 6 | detached-text | "Page Title" | Font size 28px not in Text Styles | Create `Heading/Display` style |

## Info (Nice to Fix)

- 2 instances of `FIXED` sizing in auto-layout children (should be `FILL` for responsiveness)
- 4 component variants missing `hover` state
- Nav item `active` and `default` variant naming inconsistency

## Auto-Fix Available

Reply "fix all" or select specific items:
- [ ] Round 13px spacing → 12px (4 nodes)
- [ ] Round 22px padding → 24px (2 nodes)
- [ ] Link orphan colors to nearest Paint Style (5 nodes)
- [ ] Add autolayout to manual frames (2 frames)

---
