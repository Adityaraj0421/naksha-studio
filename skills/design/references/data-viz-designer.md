# Data Visualization Designer

Specializes in translating raw data into clear, accurate, and beautiful visualizations. Selects the right chart type, applies perceptually safe color systems, handles edge cases, and ensures accessibility across all chart formats.

---

## Chart Type Selection Guide

Choosing the wrong chart is the most common data viz mistake. Match the chart to the data relationship being communicated.

| Relationship | Chart type | When to use |
|-------------|-----------|-------------|
| **Change over time** | Line chart | Continuous time series, trends |
| **Change over time** | Bar chart (vertical) | Discrete time periods (months, quarters) |
| **Change over time** | Area chart | Cumulative values, emphasize magnitude |
| **Part-to-whole** | Donut/Pie | Max 5 slices, percentages sum to 100 |
| **Part-to-whole** | Stacked bar | Part-to-whole across multiple categories |
| **Part-to-whole** | Treemap | Hierarchical proportions |
| **Comparison** | Grouped bar | Compare multiple series side-by-side |
| **Comparison** | Bullet chart | Single metric vs. target |
| **Distribution** | Histogram | Frequency distribution of one variable |
| **Distribution** | Box plot | Distribution with outliers |
| **Correlation** | Scatter plot | Relationship between 2 numeric variables |
| **Correlation** | Bubble chart | Relationship between 3 variables |
| **Ranking** | Horizontal bar | Ranked categories with long labels |
| **Geographic** | Choropleth map | Regional data with color encoding |
| **Flow/Process** | Sankey diagram | Flow quantities between stages |
| **KPI snapshot** | Stat card | Single metric with trend indicator |

**Anti-patterns to avoid:**
- 3D charts (distort perception of area/angle)
- Pie charts with > 5 slices (use bar instead)
- Dual Y-axes (misleading scale comparisons — use separate charts)
- Truncated Y-axes (starting at non-zero amplifies differences)
- Too many data series on one line chart (> 5–7 lines = spaghetti)

---

## Color System for Data

**Never use default chart library colors** — they're rarely accessible or brand-consistent.

### Sequential palette (one variable, increasing value)
```css
/* Single-hue ramp — works for choropleth, heatmaps */
--data-seq-1: #dbeafe;  /* lightest */
--data-seq-2: #93c5fd;
--data-seq-3: #3b82f6;
--data-seq-4: #1d4ed8;
--data-seq-5: #1e3a8a;  /* darkest */
```

### Diverging palette (values diverge from a midpoint)
```css
/* Red-to-Blue through neutral — for profit/loss, sentiment */
--data-div-neg-2: #dc2626;
--data-div-neg-1: #fca5a5;
--data-div-mid:   #f3f4f6;
--data-div-pos-1: #93c5fd;
--data-div-pos-2: #1d4ed8;
```

### Categorical palette (distinct series — up to 8)
```css
/* Colorblind-safe 8-color categorical palette */
--data-cat-1: #2563eb;   /* blue */
--data-cat-2: #16a34a;   /* green */
--data-cat-3: #dc2626;   /* red */
--data-cat-4: #d97706;   /* amber */
--data-cat-5: #7c3aed;   /* violet */
--data-cat-6: #0891b2;   /* cyan */
--data-cat-7: #db2777;   /* pink */
--data-cat-8: #4b5563;   /* gray */
```

### Accessibility rules
- Minimum 3:1 contrast between adjacent categorical colors
- **Never rely on color alone** — add pattern fills, labels, or icons as redundant encoding
- Test in deuteranopia/protanopia simulation: red-green pairs are inaccessible (use blue-orange or use patterns)
- Label data points directly on the chart when possible (reduces dependency on color legend)

---

## Chart Annotation Patterns

Annotations turn charts from "here's data" into "here's the story."

**Annotation types:**
- **Reference line**: "Average", "Target", "Previous period"
- **Event marker**: "Product launch", "Policy change" with vertical line + label
- **Callout**: Arrow pointing to outlier or interesting data point with text
- **Range highlight**: Shaded band for a significant time period
- **Threshold**: Horizontal line at a critical value (e.g., "Capacity limit")

**Annotation placement rules:**
- Avoid overlapping data — place annotations outside the chart area or use leader lines
- Use a muted annotation color (gray) so it doesn't compete with the data
- Keep annotation text concise: 3–5 words maximum

---

## Responsive Chart Patterns

Charts break on mobile because of fixed pixel widths, small font sizes, and dense axes.

**Mobile adjustments:**
- Switch to `width: 100%; height: auto` (percentage-based sizing)
- Reduce tick density: every 3rd label on x-axis at mobile width
- Simplify legends: move from side legend to bottom legend at < 600px
- Switch horizontal bar chart labels to abbreviations on small screens
- Hide secondary series on very small screens (show top 3 of 8 series)

**Implementation pattern (Chart.js):**
```javascript
const chart = new Chart(ctx, {
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: window.innerWidth < 600 ? 'bottom' : 'right'
      }
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: window.innerWidth < 600 ? 4 : 8,
          font: { size: window.innerWidth < 600 ? 10 : 12 }
        }
      }
    }
  }
});
```

---

## Library Recommendations

| Library | Best for | Bundle size | Notes |
|---------|---------|-------------|-------|
| **Chart.js** | General purpose, quick setup | ~200KB | Canvas-based, responsive, easy to customize |
| **D3.js** | Complex custom viz, animations | ~300KB | SVG-based, steep learning curve, full control |
| **Recharts** | React projects | ~300KB | React components, composable API |
| **Visx** | React + D3 hybrid | ~100KB+ | Low-level, high performance |
| **Highcharts** | Enterprise, accessibility | ~400KB | WCAG compliant, many chart types |
| **Vega-Lite** | Declarative grammar | ~500KB | JSON-spec based, great for exploration |

**Rule:** Match the library to the project. For simple dashboards, Chart.js is the right choice. For custom interactive visualizations, D3. For React component libraries, Recharts or Visx.

**Vanilla/CSS charts (no library):**
- Bar charts: CSS `height` percentage on divs
- Sparklines: SVG `<polyline>` with calculated points
- Progress bars: `<progress>` element or width: X%
- Stat cards: No library needed

---

## Chart Accessibility

Charts must be accessible to users who cannot perceive the visual.

**Required for every chart:**
```html
<!-- SVG charts: title + description -->
<svg role="img" aria-labelledby="chart-title chart-desc">
  <title id="chart-title">Monthly Revenue — 2026</title>
  <desc id="chart-desc">
    Line chart showing monthly revenue from Jan to Dec 2026.
    Revenue grew from $42K in January to $89K in December,
    with a dip in March following the product relaunch.
  </desc>
  ...
</svg>

<!-- Canvas charts: provide a data table fallback -->
<figure>
  <canvas id="revenue-chart" aria-labelledby="chart-title"></canvas>
  <figcaption id="chart-title">Monthly Revenue 2026</figcaption>
  <details>
    <summary>View data table</summary>
    <table>...</table>
  </details>
</figure>
```

**Additional requirements:**
- Color is never the only differentiator (use labels, patterns, or shapes)
- Interactive tooltips must be keyboard accessible
- Minimum 14px font size for chart labels and tick marks
- Sufficient contrast for grid lines (at least 1.5:1 against background)

---

## Empty States and Loading

Charts need thoughtful empty and loading states.

**Empty state (no data yet):**
- Show chart skeleton at correct dimensions
- Message: "No data yet — [action to generate data]"
- Never show an empty chart area with no explanation

**Loading state:**
- Animated shimmer/skeleton at chart dimensions (prevents layout shift)
- Skeleton should match the general shape of the loaded chart

**Error state:**
- "Unable to load data" with retry button
- Show stale data with warning if available (prefer showing something over nothing)

**Zero/negative data:**
- Y-axis must start at zero for bar charts showing amounts
- Explicitly handle negative values in scales and colors (diverging palette)

---

## QA Checklist

- [ ] Correct chart type for the data relationship
- [ ] Accessible color palette (colorblind-safe, not color-only encoding)
- [ ] Chart has title, axis labels, and units
- [ ] Legend is readable (position, font size, color swatches)
- [ ] Tooltips work on hover and keyboard focus
- [ ] ARIA title/description on SVG charts; data table for canvas charts
- [ ] Responsive at 375px, 768px, 1280px (tick density, legend position)
- [ ] Empty state, loading state, and error state designed
- [ ] No 3D charts, no dual Y-axes, no truncated Y-axis without explicit justification
- [ ] Annotations explain key insights in the data

---

## Handoffs

- **To Dashboard Architect**: Provide chart type, data schema, and color palette before layout work begins
- **To UI Designer**: Chart components should use design system color tokens, not hardcoded hex values
- **To Content Designer**: Axis labels, tooltips, and chart titles need review for clarity and plain language

---

## Advanced Patterns

### Chart Type Decision Tree

The four data relationships and which chart serves each:

**Comparison** (how things rank against each other)
- Few categories, same time period → **Bar chart** (horizontal if labels are long)
- Many time periods → **Line chart**
- Two variables per item → **Scatter plot**
- When to use grouped vs. stacked bar: grouped = compare individual values, stacked = compare totals + composition

**Distribution** (how values spread)
- Single variable, many data points → **Histogram**
- Comparing distributions across groups → **Box plot** (shows median, quartiles, outliers)
- Avoid pie charts for distribution — they're for composition only

**Composition** (parts of a whole)
- Few categories (≤5), static → **Pie or donut** (donut if you need a centre number)
- Many categories or time-based → **Stacked bar** (avoid stacked area for >3 series)
- **When pie is actually fine:** 2–3 segments, values are meaningfully different (not 48% vs 52%), audience expects it

**Relationship** (correlation between variables)
- Two variables → **Scatter plot**
- Three variables → **Bubble chart** (third variable = bubble size)
- Many variables → **Heatmap** or **Parallel coordinates**

**Breaking the rules intentionally:** A bar chart for composition is fine if your audience needs to compare individual values more than understand the whole. Always serve the reader's question, not the purist's taxonomy.

---

### Color-Blind Safe Strategies

8% of men and 0.5% of women have some form of colour blindness. Design for it:

**Beyond palette swaps:**
- **Shape + color redundancy**: Don't use color as the only differentiator — use shape, pattern, or direct labels too
- **The safe pairs**: Blue/orange and blue/red are reliably distinguishable across all colorblindness types. Avoid red/green as the primary distinction
- **Pattern fills for print/export**: Hatching, dots, diagonal lines as secondary encoding

**The 3 types and what fails:**
| Type | What fails | Prevalence |
|---|---|---|
| Deuteranopia (red-green) | Red vs. green | Most common (~6% of men) |
| Protanopia (red-green) | Red vs. green, red appears dark | ~2% of men |
| Tritanopia (blue-yellow) | Blue vs. yellow | Rare (<1%) |

**Testing tools:** Coblis (browser), Color Oracle (desktop), Figma's built-in vision simulator (View → Vision Simulation).

**The real rule:** If your chart would be unclear in greyscale, it's not color-blind safe.

---

### Annotation Decision Guide

Annotations are for context the chart can't provide on its own. Use them sparingly.

**Annotate when:**
- An outlier needs explanation ("Product launch" explaining a spike)
- A reference line needs context ("Industry average: 42%")
- Causation should be explicit (not just correlation)
- A data gap exists ("No data collected Aug 1–7")

**Don't annotate when:**
- The trend is obvious from the data
- You'd need more than 3–4 annotations (chart is too complex, simplify instead)
- The annotation repeats what's already in a label or axis

**Placement rules:**
- Annotate near the relevant data point, not in a legend or caption
- Use leader lines sparingly — they add visual complexity
- Contrast: annotation text must not compete with data points for attention

---

### Small Multiples Pattern

Small multiples = the same chart repeated for multiple categories, using a shared scale.

**Use instead of one complex chart when:**
- You have 4+ series that would create a spaghetti line chart
- You want to compare patterns across categories, not exact values
- Your audience needs to scan and compare, not read precise numbers

**Layout rules:**
- **Consistent scale across all multiples** — this is the entire point; inconsistent scales destroy comparability
- **Aligned axes**: same x and y axis ranges, same tick marks
- **Minimal chrome**: strip axes from every cell except the leftmost/bottom; the shared scale is implied
- **Consistent dimensions**: all cells same width and height

**How many is too many:** 12–16 is usually the max before the pattern breaks down. If you have more, add interaction (search/filter) or subset.

**Interaction patterns for large sets:** Filter by group, highlight on hover (all instances of a category), sort by metric.

---

## Full Coverage

### Chart Type Reference

For every major type: best for, avoid when, common mistakes, accessibility notes.

| Chart | Best for | Avoid when | Common mistake | Accessibility |
|---|---|---|---|---|
| **Bar (vertical)** | Comparing 3–12 categories | >15 categories, time series | Starting y-axis at non-zero | Label every bar if ≤7 bars |
| **Bar (horizontal)** | Long category labels, ranking | Time series | Inconsistent bar ordering | Same |
| **Grouped bar** | Comparing sub-groups | >3 groups per cluster | Too many groups = illegible | Use distinct colors + patterns |
| **Stacked bar** | Part-to-whole + comparison | >5 segments, precise reading needed | Comparing middle segments (impossible) | Direct labels on segments |
| **Line** | Trends over time | Categorical x-axis, <3 data points | Too many series (>5) | Annotate key points |
| **Area** | Cumulative totals, single series | Multiple overlapping series | Filled area implies volume (misleading if not intentional) | Provide data table |
| **Scatter** | Correlation, distribution | Showing trends to non-technical audiences | Overplotting (too many points) | Add LOESS line for pattern |
| **Bubble** | 3-variable relationship | Precise value reading | Size encoding is hard to read precisely | Show value on hover |
| **Pie** | Simple composition (2–3 parts) | >5 segments, comparison of similar values | Too many slices | Use donut + center value |
| **Heatmap** | Density, pattern in 2D data | Precise value reading | Poor color scale choice | Include numerical values |
| **Histogram** | Distribution of a single variable | Categorical data | Wrong bin width (hides or exaggerates shape) | Annotate mean/median |
| **Box plot** | Comparing distributions | Lay audiences unfamiliar with quartiles | Forgetting to explain the whiskers | Add reference annotations |

---

### Responsive Chart Adaptations

At mobile width (<480px), charts need adaptation — most desktop charts don't work on a 375px screen.

| Adaptation | When to use |
|---|---|
| **Simplify** (fewer data points, fewer series) | Chart has >5 series or >10 x-axis labels |
| **Reorient** (vertical bar → horizontal bar) | Long category labels that would overlap on vertical axis |
| **Truncate + scroll** (horizontal scroll within chart container) | Time series where the pattern over time is the point |
| **Summarise** (full chart → single KPI card) | Chart's purpose is a single number — show just that number on mobile |
| **Progressive reveal** (show top 5, "show more" for rest) | Ranked lists, leaderboards |

**Never:** Scale down a complex chart so it's unreadable. A simplified version always beats a tiny unreadable one.

---

### Real-Time Data Patterns

**Live update vs. user-triggered refresh:**
- Live update (auto-refresh): use for operational dashboards where stale data = bad decisions (monitoring, live sales boards)
- User-triggered: use for analytical dashboards where users need to compare before/after states
- Never auto-refresh while a user is actively reading or has a popover open

**Timestamp display:**
- Always show when data was last updated: "Updated 2 minutes ago" (relative) or "As of 14:32" (absolute)
- For live data, show a live indicator (green dot with pulse animation)

**Delta indicators:**
- Up/down arrows + color for direction (green/red) — but always include the number too (color-blind)
- Show both absolute change AND percentage change when both are meaningful

**Streaming data (auto-scroll vs. pause):**
- Auto-scroll: default for logs, live feeds where latest = most important
- Pause on hover: essential — user must be able to read a line without it scrolling away
- "New items available — click to reload" pattern: better than auto-scroll for most dashboards

---

## Reference-Sourced Insights

### Categorical Color Theory: Don't Dance All Over the Color Wheel (From Datawrapper)

The most common mistake in data color selection is using maximally distinct hues from across the full color wheel. This looks unprofessional and makes charts harder to read.

**The professional approach:**
- Use complementary colors (opposite on the color wheel) and their neighbors — not a tetradic/square harmony
- Avoid "square" or "tetradic" 4-color harmonies — they produce too many competing hues
- Stay within a small arc of the color wheel and differentiate using saturation and lightness variations within that arc
- When in doubt: use **warm colors (orange/red/yellow) + blue** as your categorical palette — this is the combination used by The Economist, South China Morning Post, NYT graphics, and FiveThirtyEight because it's versatile, professional, and colorblind-accessible

**Blue is the most flexible data color:** Dark blue, light blue, saturated blue, muted blue — all combinations look professional and calming. Blue pairs naturally with orange/red (colorblind-safe complement), which is why it dominates serious data journalism.

**Green is the hardest hue to use well:** Forest green (90°–150° on the color wheel) is inherently very dark, and lightening it produces neon. To use green well, you must both lighten AND desaturate significantly. If green appears in a palette, it should lean toward yellow-green or blue-green, not pure forest green.

---

### Saturation and Lightness Adjustments (From Datawrapper)

When a color combination doesn't work, **don't add another hue — adjust saturation and lightness first.**

**Common corrections:**
- Two similar-hue colors (e.g., light orange and dark orange) — desaturate the lighter one to create more perceived separation
- Palette looks "too bright" — lower brightness/value across all colors; pure (100% saturation, 100% brightness) colors look digital and untrustworthy in data viz
- Colors don't read as distinct — increase lightness difference between adjacent palette entries rather than changing the hue

**Avoid pure colors:** `rgb(255,0,0)` pure red, `rgb(0,0,255)` pure blue — these are too saturated for data visualization. They compete with everything else on the page and look like warning indicators even when they're not.

**Avoid maximum-saturation colors:** Even if the hue is correct, colors at 90–100% saturation in HSB are visually aggressive and hard to read against both light and dark backgrounds.

---

### Chart Pitfalls from the Data-to-Viz Decision Tree (From data-to-viz.com)

Additional chart type guidance beyond the standard reference:

**Ridgeline / Joy plot:** Use for comparing distributions of a continuous variable across many groups (5+) where violin plots or box plots become too crowded. Requires that overlapping the distributions is meaningful.

**Connected scatter plot:** Use when you have two numeric variables measured over time and you want to show how the relationship between them evolved — NOT just each variable over time. The FiveThirtyEight "connected scatter" style is a canonical example.

**Lollipop chart:** Preferred over bar chart when you have many categories (15+) and precision reading is important. The dot at the end encodes the value precisely; the stem reduces ink without losing the comparison.

**Streamgraph:** Use for showing how composition of a total changes over time when the total itself is the story. Avoid when comparing individual category values is the goal — stacked area or grouped bar is better for that.

**Waterfall chart:** Underused but powerful for showing cumulative addition/subtraction — perfect for financial statements, funnel drop-off, budget allocation. Each bar starts where the previous one ended.

**What to avoid in charts:**
- Radar/spider charts for anything except showing multivariate profiles at a single point in time — they're terrible for comparisons across time or between groups
- Circular bar charts look novel but are significantly harder to read than standard bar charts — the outer bars appear longer than inner bars at the same value due to circumference differences

---

### D3.js Gallery Chart Type Map (From Observable D3 Gallery)

D3 supports 173+ chart types. For production use, the most maintainable patterns are:

**For dashboards (use Chart.js or Recharts, not D3):** Bar, line, area, donut — D3 is overkill and harder to maintain.

**For D3 specifically (unique capabilities):**
- **Sankey diagrams** — `d3-sankey` plugin; excellent for flow/funnel visualization
- **Force-directed graphs** — network data with `d3-force`
- **Chord diagrams** — showing bidirectional relationships between categories
- **Treemaps, circle packing, sunburst** — hierarchical data with `d3-hierarchy`
- **Choropleth maps** — geographic data with `d3-geo` + GeoJSON
- **Horizon charts** — dense time series (dozens of simultaneous series) using color banding

**The beeswarm chart** (D3-specific): Shows individual data point distribution without overlapping — superior to a strip plot for dense datasets. Use when the number of individual points matters, not just the distribution shape.

**Slope chart:** Two points in time + many categories — shows who went up, who went down, and by how much. Much cleaner than a line chart for a simple before/after comparison.

---

### Annotation Patterns from D3 Gallery

D3 annotation best practices (applicable to any charting library):

**Inline labels beat legends:** When you have 2–5 series, label each line/bar directly at the end point. The reader's eye doesn't have to travel to a legend and back. For > 5 series, a legend is unavoidable but position it close to the relevant data.

**Voronoi-based labeling:** For dense scatter plots where labels overlap, use Voronoi regions to position labels in the nearest empty space. D3's `d3-delaunay` (which replaced the legacy `d3-voronoi` module in D3 v6+) enables this; for simpler cases, nudge labels manually with `transform`.

**Color legends as annotation:** When color is used for categories, put the color swatch inside the annotation near the data rather than in a separate legend box. This is the "annotate the chart" approach popularized by the NYT graphics desk.

**Line chart tooltips:** Position tooltips to the right of the cursor when within the left 60% of the chart, and to the left when within the right 40%. This prevents tooltips from clipping at the edge.
