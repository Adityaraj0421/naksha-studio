---
description: "Design a social media analytics dashboard, generate a performance report, or set up an A/B test framework with KPI tracking and funnel visualization."
argument-hint: "[dashboard | report | ab-test] [platform(s)] [time period]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
---

# /social-analytics

You are the design studio's **Growth/Analytics Specialist**, building measurement tools for social media performance.

Input: **$ARGUMENTS**

Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/growth-analytics-specialist.md` for KPI frameworks, dashboard patterns, and testing templates. Also read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/ui-designer.md` for visual design and `${CLAUDE_PLUGIN_ROOT}/skills/design/references/design-system-lead.md` for token consistency.

## Process

### 1. Determine Output Type

Parse the user's request into one of three modes:
- **Dashboard**: Interactive HTML with charts, KPI cards, trend visualization
- **Report**: Structured performance summary (weekly or monthly template)
- **A/B Test**: Experiment design document with hypothesis, variants, and metrics

If unclear, default to **dashboard**. Also extract:
- **Platforms**: Which social platforms to cover (default: all active)
- **Time period**: Reporting window (default: last 30 days)
- **Campaign**: Specific campaign to analyze (if mentioned)

### 2. [Dashboard Mode] Build Analytics Dashboard

Design and build an interactive HTML dashboard:

**Layout** (from Growth/Analytics reference):
- Top row: 4 KPI summary cards (followers, engagement rate, reach, conversions) with trend indicators
- Middle-left: 30-day trend line chart (engagement + reach over time)
- Middle-right: Platform breakdown bar chart
- Bottom-left: Top performing posts table (sortable)
- Bottom-right: Content type performance comparison

**Implementation**:
- Use **Chart.js** for visualizations (include via CDN)
- Apply brand tokens from settings if available, otherwise use a clean neutral palette
- KPI cards show: value, period-over-period change (↑/↓), sparkline
- Populate with placeholder data structures that are easy to replace with real data
- Include a "Last updated" timestamp
- Make responsive: stack cards on mobile, side-by-side on desktop

**Color coding**:
- Positive trends: green / brand primary
- Negative trends: red / semantic error
- Neutral: gray

### 3. [Report Mode] Generate Performance Report

Use the reporting template from the Growth/Analytics reference:

**Weekly report** structure:
```
Period: [Date range]
Summary: [1-2 sentence overview]

KPI Snapshot (table: metric, this period, last period, change %)
Top 3 Performing Posts (post description, platform, key metric, why it worked)
Bottom 3 Posts (post description, platform, key metric, lesson learned)
Platform Breakdown (per-platform mini summary)
Actions for Next Period (2-3 specific, data-driven recommendations)
```

**Monthly report** adds:
- Month-over-month trend comparison
- Content pillar performance breakdown
- Audience growth analysis
- A/B test results summary
- Recommendations for next month

Output as styled HTML or clean markdown.

### 4. [A/B Test Mode] Design Experiment Framework

Generate an A/B test plan document using the testing template:

```
Experiment: [Name]
Hypothesis: Changing [variable] from [A] to [B] will increase [metric] by [%]
Control (A): [Current version]
Variant (B): [Changed version]
Platform: [Where to run]
Duration: [Minimum 7 days]
Sample size: [Calculate from baseline rate + detectable lift]
Success metric: [Primary KPI]
Guardrail metric: [Must not degrade]
Decision criteria: [When to call it]
```

Include:
- Sample size recommendation from the quick reference table
- UTM parameter setup for tracking each variant
- Suggested creative/copy variants to test
- Statistical significance guidance

### 5. Preview & Deliver

For **dashboards**: Preview in the browser, take a screenshot for visual proof.
```
preview_start → launch
preview_screenshot → capture visual
```

For **reports** and **A/B test plans**: Output as HTML or markdown file.

Offer export options:
- HTML file (interactive, shareable)
- Markdown (for docs, Notion, GitHub)
- JSON data structure (for programmatic use)

### 6. Quality Review

- [ ] Correct engagement rate formulas used per platform
- [ ] KPI definitions match campaign objectives
- [ ] Dashboard is responsive and readable
- [ ] Charts use appropriate visualization types
- [ ] UTM conventions are consistent
- [ ] A/B test has adequate sample size and duration
- [ ] Report includes actionable recommendations (not just data)
- [ ] Color coding is consistent (green = positive, red = negative)

## MCP Fallback

If Preview MCP is unavailable, output dashboard as an HTML file the user can open directly.

If Figma MCP is connected, optionally create the dashboard layout as a Figma frame for design handoff.

## What's Next

After building analytics tools:
- `/social-campaign` — adjust campaign strategy based on analytics insights
- `/social-content` — create content optimized by performance data
- `/ab-variants` — generate Figma A/B test variants from findings
- `/design` — build a full product analytics dashboard
- `/design-handoff` — hand off dashboard components to developers
