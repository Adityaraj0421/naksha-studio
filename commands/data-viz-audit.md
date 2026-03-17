---
name: data-viz-audit
description: Audit a data visualization for chart type selection, accessible color palette, annotations, and anti-patterns. Optionally audits dashboard layout fit when context is provided. Outputs a scored checklist and corrected code.
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
triggers:
  - audit chart
  - chart audit
  - chart review
  - review chart
  - data viz audit
  - viz audit
  - dashboard audit
  - audit dashboard
  - chart accessibility
  - colorblind chart
  - chart anti-pattern
arguments: "<paste chart code or describe the visualization> — <dashboard context if applicable>"
---

# /data-viz-audit $ARGUMENTS

Audit a data visualization end-to-end: chart type selection, accessible color palette, annotations, anti-patterns (Phase 1 — always), and dashboard layout fit (Phase 2 — only when dashboard context is provided).

**Usage:** `/data-viz-audit <chart description or code>`

**Examples:**
- `/data-viz-audit pie chart showing 8 revenue channels — standalone, no dashboard`
- `/data-viz-audit monthly active users line chart — SaaS analytics dashboard with MRR, churn, active users KPI row`
- `/data-viz-audit <paste Chart.js config here> — e-commerce admin dashboard, secondary chart slot`
- `/data-viz-audit dual Y-axis line chart comparing ad spend and conversion rate`

---

## Process

### 1. Parse the Input

Extract from `$ARGUMENTS`:
- **Chart input**: pasted code (HTML, Chart.js config, SVG) or plain description
- **Dashboard context**: optional — surrounding layout description, screenshot reference, or explicit "standalone" note
- **Chart type claimed** vs. data relationship being shown
- **Number of data series** and whether data is continuous, discrete, or categorical
- **Color variables** in use (hex values or CSS custom properties)

### 2. Phase 1 — Chart Type Audit

Apply the chart type selection matrix from the Data Viz Designer reference:

| Data relationship | Correct chart |
|-------------------|--------------|
| Trend over time (continuous) | Line chart |
| Trend over time (discrete periods) | Vertical bar |
| Part-to-whole (≤ 5 categories) | Donut |
| Part-to-whole (many categories) | Stacked bar |
| Comparison across categories | Grouped bar |
| Distribution | Histogram |
| Correlation | Scatter plot |
| Ranking with long labels | Horizontal bar |
| Hierarchical proportions | Treemap |
| Flow between stages | Sankey |

**Anti-patterns — flag and reject:**
- 3D charts of any kind → recommend flat equivalent
- Dual Y-axis → recommend two separate charts or indexed comparison
- Pie chart with > 5 slices → recommend horizontal bar chart
- Misleading truncated Y-axis → note and correct

Output format:
```
**Chart Type:** ✅ Correct — [chart type] matches [data relationship]
```
or
```
**Chart Type:** ❌ [Issue] — [why it's wrong] → Recommended: [alternative]
```

### 3. Phase 1 — Color Palette Audit

Classify the current palette as sequential, diverging, or categorical. Apply the correct palette:

**Sequential** (one variable, ordered):
```css
--data-seq-1: #dbeafe; --data-seq-2: #93c5fd;
--data-seq-3: #3b82f6; --data-seq-4: #1d4ed8; --data-seq-5: #1e3a8a;
```

**Diverging** (values diverge from midpoint — profit/loss, sentiment):
```css
--data-div-neg-2: #dc2626; --data-div-neg-1: #fca5a5;
--data-div-mid: #f3f4f6;
--data-div-pos-1: #93c5fd; --data-div-pos-2: #1d4ed8;
```

**Categorical** (distinct series, colorblind-safe up to 8):
```css
--data-cat-1: #2563eb; --data-cat-2: #16a34a; --data-cat-3: #dc2626;
--data-cat-4: #d97706; --data-cat-5: #7c3aed; --data-cat-6: #0891b2;
--data-cat-7: #db2777; --data-cat-8: #4b5563;
```

**Colorblind safety check:**
- No red-green pair without a redundant encoding (shape, pattern, or direct label)
- No blue-yellow pair without redundant encoding
- If the palette fails: output the corrected CSS custom property block

### 4. Phase 1 — Annotation Audit

Every chart needs at least one annotation that explains the key insight:
- **Reference line**: average, target, or threshold (e.g., "Industry avg: 2.1%")
- **Event marker**: notable date with label (e.g., "Price increase — Oct 12")
- **Callout**: circle or arrow pointing to the most significant data point
- **Range highlight**: shaded region marking a meaningful period

If no annotation is present:
```
**Annotation:** ❌ No key insight called out → Add: [specific annotation suggestion with value/label]
```

### 5. Phase 1 — Accessibility + Responsiveness

Output a checklist:

| Criterion | Status | Fix |
|-----------|--------|-----|
| Canvas: `aria-labelledby` → `<figcaption>` | ✅/❌ | — |
| Canvas: `<details>` data table fallback | ✅/❌ | — |
| SVG: `role="img"` + `<title>` + `<desc>` | ✅/❌ | — |
| Responsive: `width: 100%` on wrapper | ✅/❌ | — |
| Tick density: 4 mobile / 8 desktop | ✅/❌ | — |
| Legend: bottom on mobile, right on desktop | ✅/❌ | — |

### 6. Phase 2 — Dashboard Fit (Conditional)

**Skip condition:** If no dashboard context was provided in `$ARGUMENTS`, output:

> **Phase 2 skipped** — No dashboard context provided. Describe the surrounding dashboard layout (KPI row, other charts, filter bar) to audit layout fit, information hierarchy, and filter coordination.

**If dashboard context is present**, run the Dashboard Architect review:

- **Information hierarchy placement**: Does this chart belong at Level 1 (KPI card), Level 2 (chart area), or Level 3 (table)? State the recommendation.
- **Primary vs. secondary slot**: Primary (2/3 width) for the main story; secondary (1/3 width) for supporting view. Which does this chart warrant?
- **Filter bar alignment**: Are the chart's dimensions (date range, segment) controlled by the dashboard's shared filter bar? Flag any independent filters that should be unified.
- **KPI coordination**: Does the chart reinforce or potentially contradict the KPI cards? Note any conflicts.

### 7. Rewrite / Fix Output

Produce a corrected code block addressing all Phase 1 findings (and Phase 2 if it ran):

- For Chart.js: corrected config object in a fenced JS code block
- For HTML: annotated diff with `<!-- FIX: [reason] -->` comments on changed lines
- If chart type needs to change: full replacement config for the recommended chart type
- Each fix labeled with its source (e.g., `<!-- FIX: pie → horizontal bar, anti-pattern -->`)

---

## MCP Fallback

This command does not require MCP. All input is provided via `$ARGUMENTS` (pasted code or description).

---

## What's Next

- `/chart-design` — Build a corrected chart from scratch based on audit recommendations
- `/dashboard-layout` — Place the audited chart inside a full dashboard
- `/design-review` — Full accessibility and visual quality audit of the surrounding UI
