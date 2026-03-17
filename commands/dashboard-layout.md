---
name: dashboard-layout
description: Design and build a complete dashboard layout — sidebar navigation, KPI cards, chart areas, data tables, filter bar, and responsive behavior. Outputs production-ready HTML/CSS.
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
triggers:
  - dashboard
  - admin panel
  - analytics dashboard
  - monitoring
  - kpi
  - metrics dashboard
  - reporting dashboard
arguments: "$ARGUMENTS"
---

# /dashboard-layout

Design a complete dashboard: sidebar navigation, KPI row, chart areas, filter bar, and data tables. Outputs production-ready HTML/CSS with responsive behavior and dark mode support.

**Usage:** `/dashboard-layout <description>`

**Examples:**
- `/dashboard-layout SaaS analytics dashboard with MRR, churn, active users`
- `/dashboard-layout e-commerce admin: orders, revenue, inventory, customer table`
- `/dashboard-layout monitoring dashboard for API performance metrics --style dark-tech`
- `/dashboard-layout --type executive weekly business review for C-suite`

---

## Process

### 1. Parse the Request

Extract from `$ARGUMENTS`:
- **Dashboard type**: analytics | operational | executive | admin | reporting | monitoring
- **Domain**: SaaS, e-commerce, fintech, healthcare, engineering, marketing, etc.
- **KPI metrics**: Extract 3–6 headline metrics from the description
- **Style**: `--style dark-tech` (default for monitoring), `--style minimal`, `--style corporate`
- **Type flag**: `--type executive` adjusts information density and layout
- **Dark flag**: `--dark` renders dark-first

### 2. Select Dashboard Pattern

Apply the dashboard type pattern from the Dashboard Architect reference:

| Type | Primary layout | Density | Key emphasis |
|------|---------------|---------|--------------|
| **analytics** | Sidebar + wide charts + KPI row | Medium | Time-series charts, period comparison |
| **operational** | Dense grid + real-time indicators | High | Status badges, alert log, gauges |
| **executive** | Spacious, large typography | Low | Headline KPIs, sparklines, trend arrows |
| **admin** | Table-heavy + sidebar | High | CRUD tables, filters, bulk actions |
| **monitoring** | Full-width timeline + alert panel | High | Color-coded status, incident feed |

### 3. Define Information Hierarchy

Establish the three-level hierarchy:

**Level 1 — KPI Cards (top)**: 3–5 metrics that answer the core question
- For each KPI: label, current value, unit, trend vs previous period, optional sparkline

**Level 2 — Charts (middle)**: The story behind the KPIs
- Primary chart (2/3 width): main trend or breakdown
- Secondary chart (1/3 width): supporting view

**Level 3 — Data Table (bottom)**: Granular drill-down

### 4. Design the Filter Bar

Always include:
- Date range selector (7d / 30d / 90d / Custom) — first element
- 1–2 dimension filters relevant to the domain (Segment / Region / Plan / Channel)
- Reset button
- Optional: "Last refreshed: X min ago" with refresh button

### 5. Build the Layout

**Required HTML structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Dashboard name]</title>
</head>
<body>
  <div class="app-shell">
    <!-- Sidebar navigation -->
    <aside class="sidebar" aria-label="Main navigation">
      <div class="sidebar-logo">...</div>
      <nav class="sidebar-nav">
        <a class="nav-item active" href="#">...</a>
        ...
      </nav>
      <div class="sidebar-footer">...</div>
    </aside>

    <!-- Main content area -->
    <div class="main-content">
      <!-- Topbar -->
      <header class="topbar">
        <button class="menu-toggle" aria-label="Toggle navigation">☰</button>
        <h1 class="page-title">[Page title]</h1>
        <div class="topbar-actions">...</div>
      </header>

      <!-- Dashboard content -->
      <main class="page-content">
        <!-- Filter bar -->
        <div class="filter-bar" role="search">...</div>

        <!-- KPI row -->
        <div class="kpi-row">
          <!-- 3–5 KPI cards -->
        </div>

        <!-- Chart section -->
        <div class="chart-row">
          <div class="chart-card primary-chart">...</div>
          <div class="chart-card secondary-chart">...</div>
        </div>

        <!-- Data table -->
        <div class="table-section">...</div>
      </main>
    </div>
  </div>
</body>
</html>
```

**CSS requirements:**
- App shell: `display: grid; grid-template-columns: 240px 1fr;`
- CSS custom properties for all colors (rebrand-ready)
- Sidebar collapses to icon-only at 1024px, hidden at 768px with JS toggle
- KPI row: 4-column grid → 2-column at tablet → 1-column at mobile
- `font-variant-numeric: tabular-nums` on all numbers
- Skeleton loaders with shimmer animation for loading state
- `prefers-color-scheme: dark` media query OR `.dark` class-based dark mode

**Data quality:**
- Use realistic domain-appropriate copy (no Lorem Ipsum)
- KPI values: realistic numbers with proper formatting ($84,231 not $84231)
- Trend indicators: show +/- percentage vs comparison period
- Table data: 5–8 rows of realistic sample data

**Chart placeholders:**
- Insert `<div class="chart-placeholder" style="height:300px">` with comment `<!-- Chart.js / /chart-design goes here -->`
- Reference `/chart-design` for actual chart implementation

### 6. Add Interactions

Implement with vanilla JS (< 50 lines):
- Mobile sidebar toggle (open/close with overlay)
- Active state on nav items
- Filter bar: date range options and reset
- Table: sortable column headers (toggle sort direction)
- Row hover state on table

### 7. Run QA Checklist

Before outputting:
- [ ] KPI cards visible without scrolling at 1280px desktop
- [ ] Filter bar positioned above charts it controls
- [ ] Sidebar collapses gracefully at ≤ 1024px
- [ ] Mobile hamburger menu opens/closes correctly
- [ ] Table columns are properly aligned (numeric = right, text = left)
- [ ] All ARIA roles, labels, and navigation landmarks present
- [ ] Trend indicators: green/red used only for directionally-unambiguous metrics
- [ ] Dark mode renders without invisible text or lost contrast
- [ ] Skeleton loaders have same dimensions as loaded content
- [ ] No hardcoded colors — all CSS custom properties

---

## MCP Fallback

This command does not require MCP. Output is self-contained HTML/CSS/JS.

For chart areas, generate placeholder divs with comments pointing to `/chart-design`.

---

## What's Next

- `/chart-design` — Build the charts that go inside the dashboard layout
- `/design-framework` — Convert the dashboard HTML to React/Vue/Svelte components
- `/design-review` — Accessibility and visual quality audit
- `/design-handoff` — Generate developer documentation and specs
