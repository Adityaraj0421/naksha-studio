# /dashboard-layout — Lumina Analytics Dashboard

**Input:** `analytics dashboard for Lumina — MAU, revenue, churn, active integrations`

---

## Layout Brief

**Dashboard type:** SaaS product analytics — internal team view
**Primary audience:** Product managers, growth team
**Key decisions:** What's healthy, what needs attention, what changed this week

**Layout grid:** 12-column CSS grid, 16px gap, full-viewport height with scrollable main area

---

## KPI Cards Row

4 KPI widgets in a 4-column grid. Each card:

| KPI | Value | Change | Trend |
|-----|-------|--------|-------|
| Monthly Active Users | 44,800 | +16.7% MoM | ↑ Green |
| Monthly Recurring Revenue | $128,400 | +12.3% MoM | ↑ Green |
| Churn Rate | 2.1% | -0.4pp MoM | ↓ Green (lower is better) |
| Active Integrations | 847 | +23 this week | → Neutral |

KPI widget structure: metric label (small, gray), value (large, bold), change badge (green/red), sparkline (7-day).

---

## Widget Grid

Below the KPI row, a 2×2 grid of larger widgets:

| Position | Widget | Size |
|----------|--------|------|
| Top-left (wide) | MAU line chart — 12 months | 8 cols |
| Top-right | Top features by usage — horizontal bar | 4 cols |
| Bottom-left | Cohort retention table — week-over-week | 6 cols |
| Bottom-right | Recent activity feed | 6 cols |

---

## Sidebar Navigation

Fixed left sidebar, 240px wide:
- Logo (top)
- Nav items: Overview, Users, Revenue, Integrations, Reports
- Divider
- Settings, Help
- User avatar + name (bottom)

---

## Implementation

```html
<div class="dashboard" style="display:grid;grid-template-columns:240px 1fr;height:100vh;">
  <nav class="sidebar" style="background:#1E3A5F;color:#fff;padding:24px 0;">
    <!-- nav items -->
  </nav>
  <main style="overflow-y:auto;background:#F9FAFB;">
    <div class="kpi-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:24px;">
      <!-- 4 × KPI widget -->
    </div>
    <div class="widget-grid" style="display:grid;grid-template-columns:repeat(12,1fr);gap:16px;padding:0 24px 24px;">
      <!-- chart + widgets -->
    </div>
  </main>
</div>
```

---

## What's Next

- `/chart-design` — build each individual chart widget
- `/design-system` — extract the dashboard tokens for reuse
