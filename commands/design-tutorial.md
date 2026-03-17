---
name: design-tutorial
description: Interactive guided tour of Naksha — learn commands through real exercises, discover workflows, and get oriented in under 10 minutes
triggers:
  - tutorial
  - getting started
  - learn design studio
  - how do I use
  - what can you do
  - help me get started
  - show me what you can do
  - first time
  - new user
  - onboarding
arguments: "$ARGUMENTS"
---

# /design-tutorial

Interactive guided tour of Naksha. Choose a track below and complete a real exercise — you'll produce actual output by the end.

**Usage:** `/design-tutorial` or `/design-tutorial <track>`

**Tracks:**
- `/design-tutorial quick-start` — 5-minute overview: run 3 commands, see what each produces
- `/design-tutorial ui` — Build a UI component from scratch → token extraction → developer handoff
- `/design-tutorial figma` — Create a component in Figma, add responsive variants, generate prototype
- `/design-tutorial social` — Design a post, plan a campaign, build a performance dashboard
- `/design-tutorial email` — Build a welcome email template and a 3-email onboarding sequence
- `/design-tutorial data-viz` — Design a bar chart, then build a full analytics dashboard
- `/design-tutorial full` — Complete tour: all wings, all workflows (~30 min)

---

## Step 1: Detect Track

Parse `$ARGUMENTS`:

- If empty → show **Welcome Screen** (step 2A)
- If matches a track name → jump to that track's exercise (step 3)
- If unclear → show Welcome Screen

---

## Step 2A: Welcome Screen

If no track is given, display this orientation:

```
╔══════════════════════════════════════════════════════════════════╗
║                    Welcome to Naksha                      ║
║                         v3.18.0 · 46 commands                   ║
╚══════════════════════════════════════════════════════════════════╝

Naksha assembles specialist roles for any design task.
You give a goal. The right experts activate automatically.

━━━ What it can do ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  UI & Web Design          /design /design-system /brand-kit
  Figma-Native             /figma-create /figma-responsive /figma-prototype
  Design QA                /design-review /ux-audit /design-handoff
  Social Media             /social-content /social-campaign /social-analytics
  Email                    /email-template /email-campaign
  Data Visualization       /chart-design /dashboard-layout
  Framework Code           /design-framework (React/Vue/Svelte/Next.js/Astro)
  Templates                /design-template (10 production-ready layouts)
  AI Visual Gen            /gen-image /gen-video /gen-audio /gen-moodboard /prompt-refine
  Print / PDF              /pdf-report /print-layout /print-audit

━━━ Choose a learning track ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. quick-start   5 min  See 3 commands in action right now
  2. ui           15 min  Build a component, extract tokens, handoff to dev
  3. figma        15 min  Create in Figma, add responsive variants, prototype
  4. social       15 min  Post design → campaign → analytics dashboard
  5. email        15 min  Welcome template → onboarding sequence
  6. data-viz     15 min  Chart design → full dashboard
  7. ai-visual-gen  15 min  Generate images, video briefs, audio specs, moodboards
  8. print-pdf      15 min  Build a print layout, PDF report, preflight audit
  9. full           40 min  Complete tour: all wings, all workflows (~40 min)

Reply with a number or track name to begin.
```

---

## Step 3: Track Exercises

### TRACK: quick-start

**Goal:** Run 3 commands back-to-back. See what Naksha produces.

---

**Exercise 1 of 3 — Design a UI Component**

Run this command now (copy it exactly):

```
/design a primary button with hover, focus, and disabled states
```

> **What to watch for:** Notice how the response assembles a team (UI Designer + Accessibility Auditor), produces semantic HTML with CSS custom properties, and includes WCAG contrast ratios. This is one command doing what would take a designer + developer 20 minutes.

Once you see the output, continue to Exercise 2.

---

**Exercise 2 of 3 — Review What You Just Built**

Take the HTML from Exercise 1 and run:

```
/design-review [paste the HTML output here]
```

> **What to watch for:** The Design Critique role evaluates against heuristics, the Accessibility Auditor runs WCAG checks. You get a scored report with specific fixes. This is the QA loop — build, review, iterate.

---

**Exercise 3 of 3 — Generate a Framework Component**

Run:

```
/design-framework react-tailwind [paste the HTML from Exercise 1]
```

> **What to watch for:** The Framework Specialist converts generic HTML/CSS to idiomatic React + Tailwind with TypeScript interfaces, proper prop types, and composable component structure. This is the design-to-code pipeline in one command.

---

**Quick-start complete.** You've seen:
- `/design` → HTML/CSS with specialist knowledge
- `/design-review` → scored quality audit
- `/design-framework` → idiomatic framework code

**Suggested next tracks:**
- `/design-tutorial ui` for the full component pipeline
- `/design-tutorial figma` if you use Figma
- `/design-tutorial data-viz` for dashboards and charts

---

### TRACK: ui

**Goal:** Build a card component from scratch → extract design tokens → generate developer handoff documentation.

---

**Exercise 1 — Build the Component**

```
/design a product card: thumbnail image, title, subtitle, price, and CTA button. Modern minimal style.
```

> **What's happening:** The Creative Director defines visual direction. The UI Designer specifies the component structure, spacing system, and CSS custom properties. The Content Designer writes placeholder copy. All three specialists contribute to a single output.

---

**Exercise 2 — Extract Tokens**

After reviewing the card output, run:

```
/design-system extract tokens from the product card output above
```

> **What's happening:** The Design System Lead analyzes the output's CSS custom properties and raw values to produce a structured token map — semantic tokens (e.g., `--color-surface-elevated`) linked to primitive tokens (e.g., `--color-neutral-100`). This is the foundation for a scalable design system.

---

**Exercise 3 — Generate Developer Handoff**

```
/design-handoff generate handoff documentation for the product card
```

> **What's happening:** The Design QA specialist produces a developer spec: spacing grid, color values, typography stack, interactive state documentation, and copy for the handoff comment in Jira/Linear. This bridges the design-dev gap without a Zeplin subscription.

---

**UI track complete.** Full pipeline: build → tokenize → handoff.

**Suggested next:** `/design-tutorial figma` to do this natively in Figma.

---

### TRACK: figma

**Goal:** Create a button component in Figma with all states → add mobile responsive variant → wire a prototype.

> **Prerequisite:** This track uses the Figma Desktop Bridge MCP. If you don't have it, each command includes a fallback (it'll describe what to build instead of creating it live).

---

**Exercise 1 — Create in Figma**

```
/figma-create a button component with default, hover, focus, disabled states. Use auto layout.
```

> **What's happening:** The Figma Creator role uses the Figma API to build the component programmatically — auto layout, component properties, variant groups. No clicking required.

---

**Exercise 2 — Add Responsive Variants**

```
/figma-responsive make the button responsive: full-width on mobile (< 375px), auto-width on desktop
```

> **What's happening:** The responsive variants command creates viewport-specific instances of the component, respects Figma's auto layout constraints, and groups them for easy comparison in a single frame.

---

**Exercise 3 — Wire a Prototype**

```
/figma-prototype wire the button states: click → focus state, hover → hover state
```

> **What's happening:** The Prototype Designer adds Figma interaction triggers and transitions between frames — hover overlays, click destinations, transition easing. Produces a testable prototype without leaving the command line.

---

**Figma track complete.** Figma-native creation pipeline.

**Suggested next:** `/figma-sync` to check design/code drift on an existing project.

---

### TRACK: social

**Goal:** Design an Instagram post → build a 30-day content calendar → create an analytics performance dashboard.

---

**Exercise 1 — Design a Post**

```
/social-content Instagram carousel: 5 slides announcing a new SaaS product feature
```

> **What's happening:** The Social Media Designer defines aspect ratios, text-safe zones, and visual hierarchy per platform. The Social Media Copywriter writes slide-by-slide captions with hook, body, and CTA. Output includes production-ready image specs you can hand to a designer or use with Canva/Figma.

---

**Exercise 2 — Plan the Campaign**

```
/social-campaign 30-day LinkedIn + Instagram launch campaign for the feature above
```

> **What's happening:** The Social Media Strategist maps content pillars, post cadence, and platform-specific formats. Output: a structured calendar with post types, captions, hashtag banks, and optimal posting times. The Growth Specialist adds a KPI framework to measure success.

---

**Exercise 3 — Build the Analytics Dashboard**

```
/social-analytics build a performance dashboard tracking: impressions, engagement rate, follower growth, reach by platform
```

> **What's happening:** The Growth/Analytics Specialist designs a KPI card layout with sparklines, comparison metrics (vs. previous period), and a per-platform breakdown table. Outputs HTML/CSS dashboard you can integrate into any reporting tool.

---

**Social track complete.** Content creation → campaign planning → measurement.

---

### TRACK: email

**Goal:** Build a welcome email template → expand to a 3-email onboarding sequence.

---

**Exercise 1 — Build the Welcome Email**

```
/email-template welcome email for a SaaS project management tool. Include: hero with product screenshot placeholder, 3 feature highlights, primary CTA to "Start your first project"
```

> **What's happening:** The Email Designer writes table-based layout HTML (not flexbox/grid — these aren't supported in email clients), applies inline styles for Outlook compatibility, and adds VML bulletproof buttons. The Email Copywriter writes subject line options and preview text with open-rate optimization notes.

---

**Exercise 2 — Expand to a Sequence**

```
/email-campaign 3-email onboarding sequence for the tool above. Day 1: welcome. Day 3: first project tip. Day 7: upgrade prompt.
```

> **What's happening:** Output includes all three HTML templates plus: campaign brief, send timing strategy, subject line A/B test suggestions, ESP variable syntax (Mailchimp/Klaviyo/SendGrid), and CAN-SPAM compliance checklist. A complete ready-to-import campaign package.

---

**Email track complete.** Single template → full campaign sequence.

---

### TRACK: data-viz

**Goal:** Design an accessible bar chart → build a complete analytics dashboard.

---

**Exercise 1 — Design a Chart**

```
/chart-design monthly active users trend for 2025, compared against 2024. Show growth annotations.
```

> **What's happening:** The Data Viz Designer selects chart type from a 16-type matrix (line for trends, not bar — bar is for comparisons). Applies a colorblind-safe sequential palette. Adds meaningful annotations at inflection points. Outputs Chart.js with `<details>` data table fallback for screen readers.

---

**Exercise 2 — Build a Dashboard**

```
/dashboard-layout analytics dashboard: 4 KPI cards (MAU, DAU, retention, churn), main trend chart, acquisition channel breakdown, data table of top cohorts
```

> **What's happening:** The Dashboard Architect applies information hierarchy (overview → trend → detail), CSS Grid layout with KPI row + chart split + full-width table, responsive collapse strategy per breakpoint, and skeleton loading states. All in semantic HTML with CSS custom properties and dark mode.

---

**Data-viz track complete.** Chart design → full dashboard.

---

### TRACK: full

**Goal:** Complete tour of all 8 design wings.

Run each exercise in order. Each builds on the last.

1. **UI Foundation** → `/design a minimal landing page hero: headline, subheadline, email signup CTA`
2. **Design Review** → `/design-review [paste hero output]`
3. **Token Extraction** → `/design-system extract tokens from the hero`
4. **Brand Kit** → `/brand-kit generate brand system from color #3B82F6 (blue). SaaS product.`
5. **Framework Export** → `/design-framework react-tailwind [paste hero HTML]`
6. **Template** → `/design-template landing-page --style minimal`
7. **Figma Creation** → `/figma-create a hero section with the brand kit above`
8. **Social** → `/social-content Instagram Story: launch announcement for the product above`
9. **Email** → `/email-template welcome email with the brand kit above`
10. **Data Viz** → `/chart-design user signups last 30 days as a line chart`
11. **Dashboard** → `/dashboard-layout growth dashboard: signups KPI, revenue KPI, activation rate, chart area`
12. **Handoff** → `/design-handoff generate developer spec for everything above`

> This is the full Naksha workflow — idea to developer-ready in 12 commands.

---

## Step 4: Tutorial Complete

After any track completes, display:

```
━━━ Tutorial complete ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You've learned: [list the commands used in this track]

━━━ Explore more ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  All 26 commands:

  Core Design     /design /design-review /design-system /brand-kit
                  /design-sprint /design-present /design-handoff
  Figma           /figma /figma-create /figma-responsive /figma-prototype
                  /figma-sync /ux-audit /ab-variants /site-to-figma
                  /component-docs
  Social          /social-content /social-campaign /social-analytics
  Framework       /design-framework
  Email           /email-template /email-campaign
  Templates       /design-template
  Data Viz        /chart-design /dashboard-layout
  Tutorial        /design-tutorial

  Run /design-tutorial <track> to explore another wing.
  Run /design <anything> to start real work.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## MCP Fallback

If Figma MCP is unavailable, the **figma track** falls back to: describe what would be created in Figma, show equivalent HTML/CSS output, and note the MCP setup steps from `MCP-SETUP.md`.

All other tracks work without any MCP servers.

---

## What's Next

After completing any track:
- `/design` — Start real design work
- `/design-review` — Review existing designs for quality issues
- `/design-system` — Extract a token system from existing UI
- `/brand-kit` — Build a full brand identity from a single color
