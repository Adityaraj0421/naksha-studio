# /chart-design — Lumina Monthly Active Users

**Input:** `line chart for Lumina — monthly active users over 12 months, show growth trend`

---

## Chart Brief

**Chart type:** Line chart (single series — MAU over time)
**Why line:** Time-series data with trend emphasis — line chart shows trajectory better than bar for continuous growth metrics.

**Data shape:**
- X axis: Month (Jan–Dec 2025)
- Y axis: Monthly Active Users (0 – 50,000)
- Series: Total MAU (single line)

**Annotations:**
- Mark the month where MAU crossed 10,000 (growth milestone)
- Add a trend line to project next quarter

---

## Color System

| Element | Color | Hex |
|---------|-------|-----|
| Line | Lumina navy | `#1E3A5F` |
| Area fill | Navy 10% opacity | `rgba(30,58,95,0.1)` |
| Annotation dot | Lumina orange | `#E8633A` |
| Axis labels | Gray 500 | `#6B7280` |
| Grid lines | Gray 100 | `#F3F4F6` |
| Background | White | `#FFFFFF` |

Color-blind safe: navy + orange pass Deuteranopia and Protanopia simulation.

---

## Axis & Label Specs

**X axis:**
- Labels: abbreviated month names (Jan, Feb, Mar…)
- Tick every month, label every 2 months to avoid crowding

**Y axis:**
- Labels: abbreviated (10K, 20K, 30K)
- 5 grid lines at 0, 10K, 20K, 30K, 40K, 50K

**Chart title:** "Monthly Active Users — 2025"

---

## Implementation (Chart.js)

```html
<canvas id="mau-chart" width="800" height="400"></canvas>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
const ctx = document.getElementById('mau-chart').getContext('2d');
new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    datasets: [{
      label: 'Monthly Active Users',
      data: [4200,5800,7100,9300,11200,14500,17800,21000,26500,31200,38400,44800],
      borderColor: '#1E3A5F',
      backgroundColor: 'rgba(30,58,95,0.1)',
      borderWidth: 2.5,
      fill: true,
    }]
  }
});
</script>
```

---

## What's Next

- `/dashboard-layout` — place this chart in a full KPI dashboard
- `/design-system` — extract the color tokens for reuse across all charts
