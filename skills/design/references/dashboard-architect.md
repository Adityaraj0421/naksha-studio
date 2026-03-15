# Dashboard Architect

Specializes in the layout, information hierarchy, and interaction patterns of data-rich dashboard interfaces. Knows where to place every chart, metric, filter, and table to maximize clarity and minimize cognitive load.

---

## Dashboard Type Patterns

Match the layout to the dashboard's primary purpose.

| Dashboard type | Primary goal | Layout pattern | Key elements |
|---------------|-------------|----------------|--------------|
| **Analytics** | Understand trends over time | Wide charts, minimal sidebar | KPI row, time-series charts, breakdown tables |
| **Operational** | Monitor real-time status | Dense grid, status indicators | Alerts, gauges, live feeds, quick actions |
| **Executive** | High-level overview | Clean, spacious, large numbers | Headline KPIs, trend sparklines, period comparison |
| **Admin/Management** | Manage entities and settings | Table-heavy, sidebar nav | Data tables, filters, CRUD actions, bulk operations |
| **Reporting** | Export-ready snapshots | Print-optimized sections | Charts grouped by topic, data tables, annotations |
| **Monitoring** | Detect anomalies fast | High-density, color-coded | Timeline charts, threshold alerts, incident log |

---

## Information Hierarchy

### The Overview → Detail Pattern

Every dashboard follows this three-level hierarchy:

1. **Level 1 — Headline KPIs** (top of page): 3–5 metrics that answer "how is everything right now?"
2. **Level 2 — Trend charts** (middle): Show the story behind the KPIs over time or by dimension
3. **Level 3 — Detail tables** (bottom): Granular data for users who need specifics or want to export

Never bury the headline KPIs. Users should see them before they scroll.

### Progressive Disclosure

Not all data is equally important. Apply this hierarchy to decide what to show:

- **Always visible**: KPI cards, primary chart, date range selector
- **On scroll**: Secondary charts, breakdown tables, filters
- **On demand (modal/drawer)**: Row-level detail, full data tables, export options, configuration

---

## Grid Layout Patterns

### KPI Card Row

```css
/* 4-column KPI row — most common dashboard opener */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 1024px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 600px) {
  .kpi-row { grid-template-columns: 1fr; }
}
```

### Primary + Secondary Charts

```css
/* 2/3 + 1/3 split — main chart with supporting chart */
.chart-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

/* Side-by-side equal charts */
.chart-row-equal {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 1024px) {
  .chart-row,
  .chart-row-equal { grid-template-columns: 1fr; }
}
```

### Full-Width Data Table

```css
/* Tables always span full width — they need every pixel */
.table-section {
  width: 100%;
  margin-bottom: 24px;
  overflow-x: auto; /* horizontal scroll on mobile */
}
```

---

## KPI Card Design

The anatomy of a well-designed KPI card:

```
┌─────────────────────────────┐
│  Monthly Revenue          ⋮ │  ← label (secondary text) + menu
│                             │
│  $84,231                    │  ← primary metric (large, bold)
│                             │
│  ↑ 12.5% vs last month     │  ← trend indicator (colored)
│  ▁▂▄▅▇ [sparkline]         │  ← optional sparkline
└─────────────────────────────┘
```

**Card CSS pattern:**
```css
.kpi-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  box-shadow: var(--shadow-sm);
}

.kpi-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.kpi-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1;
  margin-bottom: 8px;
}

.kpi-trend {
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}
.kpi-trend.positive { color: #16a34a; }
.kpi-trend.negative { color: #dc2626; }
.kpi-trend.neutral  { color: var(--color-text-secondary); }
```

**KPI card rules:**
- Always show the unit ($ / % / ms / users) — never an unlabeled number
- Trend indicator needs context: "vs last month", "vs target", "vs last year"
- Use + green / − red only when more is definitively better (not for metrics like churn rate, error rate)
- For ambiguous metrics (page load time), neutral gray is safer than color coding

---

## Filter and Control Bar

Controls go above the content they affect. The filter bar is the most important navigational element on a dashboard.

```html
<div class="filter-bar" role="search" aria-label="Dashboard filters">
  <div class="filter-group">
    <label for="date-range">Date range</label>
    <select id="date-range">
      <option>Last 7 days</option>
      <option>Last 30 days</option>
      <option>Last 90 days</option>
      <option>Custom range</option>
    </select>
  </div>
  <div class="filter-group">
    <label for="segment">Segment</label>
    <select id="segment">
      <option>All users</option>
      <option>Free plan</option>
      <option>Pro plan</option>
    </select>
  </div>
  <button class="btn-ghost" id="reset-filters">Reset</button>
</div>
```

```css
.filter-bar {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 24px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
}
```

**Filter design rules:**
- Date range is always the first filter — it's the most used
- Pre-set ranges (7d, 30d, 90d) cover 90% of use cases — don't make users enter dates
- Show active filter count badge if > 2 filters are applied
- "Reset" button must clear all filters to their defaults

---

## Data Table Design

Tables are often the most-used part of a dashboard. Design them for scannability.

### Table Structure

```html
<div class="table-container">
  <div class="table-toolbar">
    <input type="search" placeholder="Search..." class="table-search">
    <div class="table-actions">
      <button class="btn-ghost">Export CSV</button>
      <button class="btn-ghost">Columns</button>
    </div>
  </div>
  <table class="data-table" aria-label="User activity">
    <thead>
      <tr>
        <th scope="col" aria-sort="ascending">
          Name <span class="sort-icon">↑</span>
        </th>
        <th scope="col">Status</th>
        <th scope="col" class="numeric">Amount</th>
        <th scope="col">Date</th>
        <th scope="col"><span class="sr-only">Actions</span></th>
      </tr>
    </thead>
    <tbody>...</tbody>
  </table>
  <div class="table-pagination">
    <span class="pagination-info">Showing 1–25 of 842</span>
    <div class="pagination-controls">
      <button disabled>Previous</button>
      <span>Page 1 of 34</span>
      <button>Next</button>
    </div>
  </div>
</div>
```

### Table CSS

```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th {
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.data-table th.numeric,
.data-table td.numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
}

.data-table tbody tr:hover {
  background: var(--color-bg-secondary);
}
```

**Table design rules:**
- Numeric columns: right-align, tabular-nums font feature, fixed-width column
- Long text columns: truncate with ellipsis + tooltip, never wrap
- Status columns: colored badge (green/yellow/red), not just text
- Row actions: visible on hover only (reduces clutter), never show > 3 icons
- Sticky header for tables > 10 rows

---

## Dashboard Navigation Patterns

### Sidebar Navigation

```css
.dashboard-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}

.sidebar {
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  padding: 24px 0;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

/* Collapse to icon-only at medium screens */
@media (max-width: 1024px) {
  .dashboard-shell { grid-template-columns: 64px 1fr; }
  .sidebar .nav-label { display: none; }
}

@media (max-width: 768px) {
  .dashboard-shell { grid-template-columns: 1fr; }
  .sidebar {
    position: fixed;
    left: -240px;
    width: 240px;
    transition: left 0.2s ease;
    z-index: 100;
  }
  .sidebar.open { left: 0; }
}
```

### Tab Navigation (for sub-sections)

```html
<nav class="dashboard-tabs" role="tablist" aria-label="Dashboard sections">
  <button role="tab" aria-selected="true" aria-controls="panel-overview">Overview</button>
  <button role="tab" aria-selected="false" aria-controls="panel-users">Users</button>
  <button role="tab" aria-selected="false" aria-controls="panel-revenue">Revenue</button>
</nav>
```

---

## Responsive Dashboard Strategy

Dashboards are primarily desktop products, but graceful mobile degradation is required.

| Breakpoint | Strategy |
|------------|----------|
| **≥ 1280px** | Full layout: sidebar + 4-column KPI + 2-chart row |
| **1024–1279px** | Compressed: icon sidebar + 2-column KPI + stacked charts |
| **768–1023px** | Mobile-first: hidden sidebar (hamburger) + 2-column KPI |
| **< 768px** | Essential only: 1-column KPI + single chart + simplified table |

**Mobile dashboard rules:**
- Show only the top 3 KPIs (not all 6+)
- Replace complex charts with simplified sparkline + stat card combo
- Data tables become card lists (one row = one card) at < 600px
- Date range selector becomes a bottom sheet (not a dropdown)

---

## Performance Patterns

Dashboard performance directly impacts whether people trust the data.

### Skeleton Loading

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-secondary) 25%,
    var(--color-border) 50%,
    var(--color-bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Match skeleton to card dimensions exactly — prevents layout shift */
.kpi-skeleton  { height: 120px; }
.chart-skeleton { height: 300px; }
.table-row-skeleton { height: 48px; margin-bottom: 1px; }
```

### Loading Priority Order

1. Page structure and navigation (immediate)
2. KPI cards (first data fetch — highest priority)
3. Primary chart (second fetch)
4. Secondary charts (lazy — only when in viewport)
5. Data tables (lazy — only when user scrolls to them)

### Stale Data Indicators

When showing cached data, always indicate its age:
```html
<div class="data-freshness">
  <span class="freshness-dot stale"></span>
  Last updated 6 minutes ago — <button>Refresh</button>
</div>
```

---

## QA Checklist

- [ ] KPI cards visible without scrolling at 1280px
- [ ] Filter bar resets correctly and all charts respond to filter changes
- [ ] Date range selector has at least: 7d, 30d, 90d, custom range
- [ ] Numeric columns right-aligned with tabular-nums
- [ ] Tables have aria-label, th scope="col", aria-sort on sorted column
- [ ] Sidebar collapses gracefully at ≤ 1024px
- [ ] Skeleton loaders match exact dimensions of loaded content
- [ ] KPI trend indicators are not green/red for ambiguous metrics
- [ ] Empty state for every chart and table (not blank space)
- [ ] Mobile: top KPIs visible, tables scrollable horizontally

---

## Handoffs

- **To Data Viz Designer**: Specify chart dimensions, available data schema, and required interactivity (tooltips, click-through) before they build chart specs
- **To UI Designer**: KPI card, table row, filter bar, badge, and status indicator styles must match the design system
- **To Content Designer**: KPI labels, column headers, empty state messages, and trend text need plain-language review

---

## Reference-Sourced Insights

### Data-Ink Ratio: Stripping Visual Noise (From Geckoboard)

Edward Tufte's data-ink ratio principle, applied to dashboards: every pixel that doesn't communicate data is visual noise that slows comprehension.

**Remove by default:**
- Grid lines in charts (use axis labels + data labels instead; add grid lines only when precision reading is needed)
- Decorative icons on KPI cards when a number+label is sufficient
- Background gradients, drop shadows on chart areas
- Redundant axis labels when the chart title already states the unit
- Borders between cards if whitespace provides sufficient separation

**The novelty trap:** Colorful backgrounds and quirky illustrations grab attention the first time, but the novelty wears off quickly and then permanently gets in the way. Dashboards are viewed dozens or hundreds of times — optimize for the 100th view, not the first.

**Practical test:** If you removed an element, would the viewer lose any data or context? If no, remove it.

---

### Number Precision and Rounding (From Geckoboard)

**Overly precise numbers hide the signal.** Showing conversion rate as `3.847%` when the relevant range is 1–10% makes the mental comparison harder, not easier.

**Rounding rules by metric type:**
- Revenue/currency at scale: round to nearest $K or $M ("$84K", not "$84,231")
- Percentages: 1 decimal place maximum for operational dashboards; round to whole numbers for executive dashboards
- Counts: whole numbers always — "1,247 users", never "1,246.8 users"
- NPS: whole numbers always (NPS convention per Bain / Reichheld methodology — "NPS: 42", never "NPS: 42.3")
- Star ratings and other average-of-scale metrics: 1 decimal place

**Exception:** Transactional or financial dashboards where the exact cent matters (billing, reconciliation) — use full precision with clear formatting.

---

### Context-First KPI Design (From Geckoboard)

A number without context is just a number. Every KPI must answer: "Is this number good, bad, or normal?"

**Context mechanisms in order of power:**
1. **Goal/target line** — "84% vs 90% target" immediately signals gap
2. **Period comparison** — "↑ 12% vs last month" gives direction
3. **Historical trend** — sparkline shows trajectory (rising, falling, flat, volatile)
4. **Threshold coloring** — green/amber/red based on pre-set thresholds
5. **Absolute range** — "high: 94%, low: 71%, average: 83%" for volatile metrics

**Threshold configuration principle:** Thresholds should be set by the person who owns the metric, not the dashboard designer. Design the threshold UI so owners can configure their own acceptable ranges without touching code.

**Ambiguous metrics must use neutral coloring:** Metrics where direction-of-good depends on context (e.g., "sessions per user" — high could mean high engagement OR high confusion) should never use green/red. Use neutral gray + trend arrow.

---

### Grouping and Hierarchy Strategy (From Geckoboard)

**Top-left bias:** Users' eyes are drawn to the top-left corner first. Place the single most important metric there. Top row = most important, bottom = supporting detail.

**Grouping options and when to use each:**
- By **metric type** (acquisition, activation, retention) — best for product dashboards
- By **time period** (today, this week, this month) — best for sales/operational dashboards
- By **entity** (product line, region, team) — best for comparative/segmented views
- By **workflow stage** — best for funnel or process dashboards

**Group labeling reduces repetition:** Instead of "Signups today", "Signups this week", "Signups this month" — use one group header "Signups" with three sub-cards labeled "Today", "This week", "This month". This is significantly easier to scan.

**Empty space rule:** Leave intentional whitespace rather than stretching elements to fill gaps. A stretched KPI card looks less like a card and more like a banner.

---

### Dashboard Metric Selection Criteria (From Geckoboard)

Every metric on a dashboard should pass all 5 tests:

1. **Tied to the dashboard's stated purpose** — if the purpose is "track customer acquisition", churn metrics belong on a different dashboard
2. **Actionable by the viewers** — if the team can't do anything about a number, it's a vanity metric
3. **Comprehensible at a glance** — if it requires a tooltip or footnote to understand, simplify it or put it in a detail view
4. **Changes meaningfully** — metrics that move < 1% per week are better suited to a weekly report than a live dashboard
5. **Not so volatile it causes false alarms** — real-time metrics with high natural variance (e.g., events per minute) need smoothing (5-min rolling average) or threshold bands to be actionable

**Too much information is worse than too little.** If a dashboard can't fit on one screen without scrolling, it needs a second dashboard. Asking viewers to scroll through a dashboard breaks the "at a glance" mental model.

---

### Dashboard Evolution: The Behavioral Feedback Loop (From Geckoboard)

After shipping a dashboard, collect these specific signals to iterate:

**Questions to ask the team after 2 weeks of use:**
- "Which metrics do you look at every day, and which do you skip?"
- "Has this changed anything about how you make decisions?"
- "Is there anything missing you wish you had?"
- "Are there any numbers that confuse you or that you don't trust?"

**Red flag:** If the team consistently ignores certain metrics, they either don't understand them, don't control them, or they've already internalized the normal range and only need to see them when something changes. Consider moving those to an alert-only view.

**Drift problem:** As goals and priorities change, dashboard metrics become stale. Add a quarterly "dashboard audit" checkpoint. Metrics that no longer reflect current priorities actively mislead.

---

### Consistent Visualization Across Similar Metrics (From Geckoboard)

**Do not change visualization type just for variety.** If you're showing the same type of metric for multiple entities (e.g., revenue by region), use the same chart type for all of them. Mixing a bar chart for one region with a line chart for another implies a structural difference that doesn't exist, and makes comparison much harder.

**Consistency rule:** Identical data relationships should always use identical chart types. The viewer builds a mental model — violating it forces a re-read every time.
