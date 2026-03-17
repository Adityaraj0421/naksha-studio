---
name: chart-design
description: Design a chart or data visualization — selects the right chart type, applies accessible color palettes, adds annotations, and outputs production-ready HTML/CSS/JS
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
triggers:
  - chart
  - graph
  - visualization
  - data viz
  - bar chart
  - line chart
  - pie chart
  - scatter plot
  - histogram
  - donut chart
  - heatmap
  - sankey
  - treemap
arguments: "$ARGUMENTS"
---

# /chart-design

Design a data visualization: select the right chart type, apply accessible colors, add meaningful annotations, and produce production-ready HTML/CSS/JS with Chart.js (or vanilla SVG for simple charts).

**Usage:** `/chart-design <description>`

**Examples:**
- `/chart-design monthly revenue trend for 2025`
- `/chart-design part-to-whole breakdown of user acquisition channels`
- `/chart-design scatter plot: ad spend vs conversion rate`
- `/chart-design --library d3 geographic distribution by US state`

---

## Process

### 1. Parse the Request

Extract from `$ARGUMENTS`:
- **Data relationship**: What story is being told? (trend, comparison, distribution, correlation, part-to-whole, ranking, geographic, flow)
- **Data shape**: How many series? Continuous vs discrete? Time-based?
- **Library**: `--library chart.js` (default) | `d3` | `recharts` | `vanilla`
- **Accessibility**: Any colorblind-safe requirements? (`--a11y` flag or always default to accessible palette)
- **Style**: `--style dark` for dark backgrounds, `--style minimal` for clean axes

### 2. Select Chart Type

Apply the chart type selection matrix from the Data Viz Designer reference:

| Data relationship → | Recommended chart |
|--------------------|--------------------|
| Trend over time (continuous) | Line chart |
| Trend over time (discrete periods) | Vertical bar chart |
| Part-to-whole (≤ 5 categories) | Donut chart |
| Part-to-whole (many categories) | Stacked bar |
| Comparison across categories | Grouped bar chart |
| Single metric vs target | Bullet chart |
| Distribution of one variable | Histogram |
| Correlation between 2 variables | Scatter plot |
| Ranking with long labels | Horizontal bar |
| Hierarchical proportions | Treemap |
| Flow between stages | Sankey diagram |

**Reject anti-patterns:** If the request implies a 3D chart, dual Y-axis, or pie with > 5 slices, note the issue and recommend the appropriate alternative.

### 3. Design the Color Palette

Apply palette based on the data type:

**Sequential** (single variable, ordered values):
```css
--data-seq-1: #dbeafe; --data-seq-2: #93c5fd;
--data-seq-3: #3b82f6; --data-seq-4: #1d4ed8; --data-seq-5: #1e3a8a;
```

**Diverging** (values diverge from a midpoint — profit/loss, sentiment):
```css
--data-div-neg-2: #dc2626; --data-div-neg-1: #fca5a5;
--data-div-mid: #f3f4f6;
--data-div-pos-1: #93c5fd; --data-div-pos-2: #1d4ed8;
```

**Categorical** (distinct series — up to 8, colorblind-safe):
```css
--data-cat-1: #2563eb; --data-cat-2: #16a34a; --data-cat-3: #dc2626;
--data-cat-4: #d97706; --data-cat-5: #7c3aed; --data-cat-6: #0891b2;
--data-cat-7: #db2777; --data-cat-8: #4b5563;
```

### 4. Plan Annotations

Identify the key insight and add at least one annotation:
- Reference line for average, target, or threshold
- Event marker for notable date/event on time-series
- Callout for the most significant data point
- Range highlight for a meaningful time period

### 5. Build the Chart

**HTML/CSS/JS output requirements:**
- Use Chart.js (CDN-free, include inline or self-contained) unless `--library` specified
- `responsive: true`, `maintainAspectRatio: false` — chart fills its container
- `width: 100%; height: 300px` on `<canvas>` wrapper (override with `--height` flag)
- Accessible: SVG charts get `role="img"` + `<title>` + `<desc>` elements
- Canvas charts: `aria-labelledby` pointing to `<figcaption>` + `<details>` data table fallback
- Legend: bottom on mobile (< 600px), right on desktop
- Tick density: 4 ticks on mobile, 8 on desktop
- Tooltip: custom HTML tooltip with value, label, and % where relevant
- Annotations rendered as additional datasets or via `chartjs-plugin-annotation`

**Output structure:**
```html
<figure class="chart-figure">
  <figcaption id="chart-title">[Chart title]</figcaption>
  <div class="chart-wrapper">
    <canvas id="chart" aria-labelledby="chart-title"></canvas>
  </div>
  <details class="chart-data-table">
    <summary>View data table</summary>
    <table>...</table>
  </details>
</figure>
```

**CSS (self-contained):**
```css
.chart-figure { margin: 0; }
.chart-wrapper { position: relative; width: 100%; height: 300px; }
figcaption {
  font-size: 14px; font-weight: 600;
  color: #111827; margin-bottom: 12px;
}
.chart-data-table { margin-top: 12px; font-size: 13px; }
```

### 6. Run QA Checklist

Before outputting:
- [ ] Correct chart type for the data relationship
- [ ] Colorblind-safe palette (no red-green pair without redundant encoding)
- [ ] Chart has title, axis labels, and units
- [ ] Legend is readable with correct position
- [ ] ARIA title/description or figcaption + data table added
- [ ] Responsive: percentage width, tick density adjustment at < 600px
- [ ] At least one annotation explaining the key insight
- [ ] Anti-patterns checked: no 3D, no dual Y-axis, no > 5 slices pie

---

## MCP Fallback

This command does not require MCP. All output is self-contained HTML/CSS/JS using Chart.js or vanilla SVG.

---

## What's Next

- `/dashboard-layout` — Place the chart in a full dashboard with KPI cards and filters
- `/design-review` — Audit the chart output for accessibility and visual quality
- `/design-framework` — Convert the HTML chart to a React/Vue/Svelte component
