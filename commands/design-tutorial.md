---
name: design-tutorial
description: Interactive guided tour of Naksha — learn commands through real exercises, discover workflows, and get oriented in under 10 minutes
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
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
- `/design-tutorial ai-visual-gen` — Generate image prompts, video briefs, and moodboards
- `/design-tutorial print-pdf` — Build a print layout, PDF report, and run a preflight audit
- `/design-tutorial conversational` — Design a chatbot UI, voice interface, and pipeline chain
- `/design-tutorial spatial` — Build a visionOS spec, AR overlay, and audit a competitor
- `/design-tutorial compliance` — Generate GDPR consent flow, HIPAA audit, and set up project memory
- `/design-tutorial full` — Complete tour: all wings, all workflows (~45 min)

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
║                         v4.0.0 · 57 commands                    ║
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
  Frontier Wings           /design-chatbot /design-voice-ui /design-spatial /design-ar-overlay
                           /design-gdpr /design-compliance
  Memory & Pipelines       /naksha-init /naksha-status /pipeline /design-compare /competitive-audit

━━━ Choose a learning track ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. quick-start   5 min  See 3 commands in action right now
  2. ui           15 min  Build a component, extract tokens, handoff to dev
  3. figma        15 min  Create in Figma, add responsive variants, prototype
  4. social       15 min  Post design → campaign → analytics dashboard
  5. email        15 min  Welcome template → onboarding sequence
  6. data-viz     15 min  Chart design → full dashboard
  7. ai-visual-gen  15 min  Generate images, video briefs, audio specs, moodboards
  8. print-pdf      15 min  Build a print layout, PDF report, preflight audit
  9. full           45 min  Complete tour: all wings, all workflows (~45 min)
 10. conversational 15 min  Chatbot UI → voice interface → pipeline chaining
 11. spatial        15 min  visionOS spec → AR overlay → competitive audit
 12. compliance     15 min  GDPR consent → HIPAA audit → project memory

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

### TRACK: ai-visual-gen

**Goal:** Generate an image prompt → produce a video brief → build a moodboard.

---

**Exercise 1 of 3 — Generate an Image**

Run this command now:

```
/gen-image hero illustration for a SaaS landing page: abstract, minimal, blue palette
```

> **What to watch for:** The AI Image Director produces a structured prompt optimized for Midjourney/DALL-E/Firefly — negative prompts, aspect ratio, style references, and seed suggestions. Output is a ready-to-paste generation prompt, not a generic description.

Once you see the output, continue to Exercise 2.

---

**Exercise 2 of 3 — Write a Video Brief**

Run:

```
/gen-video 15-second product launch teaser. Tone: confident, modern. No voiceover.
```

> **What to watch for:** The AI Video Director outputs a shot-by-shot brief with scene timing, motion direction, music mood, and color grading notes — everything a motion designer needs without a briefing call.

---

**Exercise 3 of 3 — Build a Moodboard**

Run:

```
/gen-moodboard brand moodboard for the SaaS product above. Style: clean tech, trustworthy.
```

> **What to watch for:** The moodboard command assembles visual direction references — typography pairings, color story, photography style, UI texture — as a structured brief you can drop into Figma or hand to a visual designer.

---

**AI Visual Gen track complete.** You've seen:
- `/gen-image` → structured generation prompt optimized for AI tools
- `/gen-video` → shot-by-shot motion brief
- `/gen-moodboard` → brand visual direction brief

**Suggested next tracks:**
- `/design-tutorial print-pdf` for the print/PDF pipeline
- `/design-tutorial full` for the complete tour

---

### TRACK: print-pdf

**Goal:** Design a print layout → generate a multi-page PDF report → run a preflight audit.

---

**Exercise 1 of 3 — Create a Print Layout**

Run this command now:

```
/print-layout business card for Naksha — name: Alex Rivera, title: Design Lead. Minimal style.
```

> **What to watch for:** The Print Designer applies bleed/trim/safe-zone geometry, CMYK color documentation, and CSS Paged Media rules. Output is production-ready CSS you can send straight to a print vendor.

Once you see the output, continue to Exercise 2.

---

**Exercise 2 of 3 — Generate a PDF Report**

Run:

```
/pdf-report quarterly design system status report. Sections: Executive Summary, Token Changes, Component Updates, Accessibility Score.
```

> **What to watch for:** Multi-page layout with `@page` rules, named pages, running headers/footers, TOC, and widows/orphans control. The kind of report that usually requires InDesign — generated in one command.

---

**Exercise 3 of 3 — Run a Preflight Audit**

Take the business card CSS from Exercise 1 and run:

```
/print-audit [paste the business card CSS from Exercise 1]
```

> **What to watch for:** Two-phase audit — Phase 1 always runs (bleed geometry, CMYK values, font embedding, page-break rules). Phase 2 runs if brand context is provided. Output is a scored preflight checklist with specific fixes.

---

**Print / PDF track complete.** You've seen:
- `/print-layout` → production-ready CSS with bleed, CMYK, and CSS Paged Media
- `/pdf-report` → multi-page report with `@page` rules, TOC, and running headers
- `/print-audit` → two-phase preflight audit

**Suggested next:**
- `/design-tutorial full` for the complete tour

---

### TRACK: conversational

**Goal:** Design a chatbot UI, a voice interface, and chain them through a pipeline — see how Naksha handles multi-modal conversational products.

---

**Exercise 1 of 3 — Chatbot UI**

Run this command now:

```
/design-chatbot customer support assistant. Platform: web. Persona: friendly, concise.
```

> **What to watch for:** Five-section output — persona spec, dialog flow map (intent → response → fallback), message bubble UI spec (user vs. assistant styling, max-width, padding), quick reply component patterns, and an accessibility checklist (tab order, ARIA live regions, keyboard trap prevention).

---

**Exercise 2 of 3 — Voice Interface**

```
/design-voice-ui smart home assistant. Platform: custom device. Screen: hybrid (4" display).
```

> **What to watch for:** Wake word flow diagram, confirmation pattern table (explicit for destructive actions, implicit for routine ones), hybrid screen layout spec showing how the small display complements voice output, SSML guidelines (pause, emphasis, `<say-as interpret-as="currency">`), and earcon frequency/duration spec.

---

**Exercise 3 of 3 — Pipeline Chaining**

```
/pipeline run conversational-launch
```

> **What to watch for:** If `conversational-launch` isn't defined, the pipeline command will output a manual checklist of steps instead — that's the MCP Fallback in action. Try `/pipeline list` to see available pipelines, then `/pipeline run launch-prep` for a working example.

---

**Conversational track complete.** You've seen:
- `/design-chatbot` → persona, dialog flows, bubble UI, accessibility
- `/design-voice-ui` → wake word, confirmation patterns, hybrid layout, SSML
- `/pipeline` → multi-command chaining with fallback mode

**Suggested next:**
- `/design-tutorial spatial` for the Spatial & AR wing
- `/design-tutorial full` for the complete tour

---

### TRACK: spatial

**Goal:** Design a visionOS app, an AR overlay, and audit a competitor's spatial design — the full Spatial & AR wing in three exercises.

---

**Exercise 1 of 3 — Spatial App (visionOS)**

Run this command now:

```
/design-spatial productivity app. Platform: visionOS. App type: utility.
```

> **What to watch for:** Depth hierarchy document (background layer / secondary layer / primary interaction layer / overlay layer with `44pt × distance_in_meters` formula), window type selection rationale (Window vs. Volumetric vs. Immersive Space), ornament placement using `attachmentAnchor` API guidance, spatial typography scale (minimum 11sp at 2m viewing distance), and comfort guidelines (max 90-min session, 60° horizontal field).

---

**Exercise 2 of 3 — AR Overlay**

```
/design-ar-overlay assembly instructions for a product. Platform: ARKit.
```

> **What to watch for:** Anchor strategy selection (image vs. object vs. plane anchor), world tracking UI spec for 3 states (Searching / Anchor Found / Tracking Lost), instruction card pattern positioned within ±20° gaze range of the tracked object, scan state designs, and occlusion handling approach.

---

**Exercise 3 of 3 — Competitive Audit**

```
/competitive-audit https://www.apple.com/apple-vision-pro/
```

> **What to watch for:** If Playwright is available, this captures the page and extracts color palette, type system, layout patterns, and UX patterns — then produces a "Steal This" table with ⭐ quality ratings. If Playwright is unavailable, the MCP Fallback prompts for a screenshot.

---

**Spatial track complete.** You've seen:
- `/design-spatial` → depth hierarchy, window types, ornaments, comfort guidelines
- `/design-ar-overlay` → anchor strategy, world tracking UI, scan states
- `/competitive-audit` → design system extraction with "Steal This" recommendations

**Suggested next:**
- `/design-tutorial compliance` for the Compliance wing
- `/design-tutorial full` for the complete tour

---

### TRACK: compliance

**Goal:** Generate a GDPR consent flow, run a HIPAA compliance audit, and set up project memory — the Compliance wing plus the memory command that saves your decisions.

---

**Exercise 1 of 3 — GDPR Consent Flow**

Run this command now:

```
/design-gdpr SaaS analytics product. Jurisdiction: EU. Consent categories: analytics, marketing.
```

> **What to watch for:** Three cookie banner variants (minimal one-line / standard two-button / detailed category-toggle), consent flow UI spec showing the progressive disclosure model, privacy control center wireframe with data export and deletion request flows, and a jurisdiction checklist covering IAB TCF compliance and legitimate interest documentation.

---

**Exercise 2 of 3 — HIPAA Compliance Audit**

```
/design-compliance --regulation hipaa patient dashboard with appointment booking and lab results
```

> **What to watch for:** PHI field marking spec (all 18 HIPAA identifiers flagged with visual indicators), 15-minute session timeout design (idle warning at 13 min, hard logout at 15 min), audit log display component, and access control UI patterns. Note the `--regulation` flag — without it, the command outputs an error block explaining the required format.

---

**Exercise 3 of 3 — Project Memory**

```
/naksha-init
```

> **What to watch for:** Interactive wizard prompting for project name, brand colors, font, framework (React/Vue/Svelte/Next.js/Astro/HTML), and token format (CSS vars/Tailwind/Style Dictionary). Writes `.naksha/project.json` and creates `.naksha/memory.md`. After running this once, commands like `/design` and `/brand-kit` will automatically load your project context.

---

**Compliance track complete.** You've seen:
- `/design-gdpr` → consent flows, cookie banners, privacy controls
- `/design-compliance` → regulated UI (HIPAA, PCI, ADA) with `--regulation` flag
- `/naksha-init` → project memory setup for persistent brand/framework context

**Suggested next:**
- `/naksha-status` to view saved project context
- `/design-tutorial full` for the complete tour

---

### TRACK: full

**Goal:** Complete tour of all design wings — UI, Figma, Social, AI Visual Gen, Email, Data Viz, Print/PDF, and Handoff.

Run each exercise in order. Each builds on the last.

1. **UI Foundation** → `/design a minimal landing page hero: headline, subheadline, email signup CTA`
2. **Design Review** → `/design-review [paste hero output]`
3. **Token Extraction** → `/design-system extract tokens from the hero`
4. **Brand Kit** → `/brand-kit generate brand system from color #3B82F6 (blue). SaaS product.`
5. **Framework Export** → `/design-framework react-tailwind [paste hero HTML]`
6. **Template** → `/design-template landing-page --style minimal`
7. **Figma Creation** → `/figma-create a hero section with the brand kit above`
8. **Social** → `/social-content Instagram Story: launch announcement for the product above`
9. **★ AI Image** → `/gen-image hero illustration for the product above. Style: minimal, abstract, blue palette`
10. **★ AI Moodboard** → `/gen-moodboard brand visual direction for the product above. Tone: trustworthy, modern`
11. **Email** → `/email-template welcome email with the brand kit above`
12. **Data Viz** → `/chart-design user signups last 30 days as a line chart`
13. **Dashboard** → `/dashboard-layout growth dashboard: signups KPI, revenue KPI, activation rate, chart area`
14. **★ Print Layout** → `/print-layout business card with the brand kit above. Name: Alex Rivera, Design Lead`
15. **★ PDF Report** → `/pdf-report design system status report. Sections: Summary, Token Changes, Component Coverage`
16. **Handoff** → `/design-handoff generate developer spec for everything above`
17. **★ Chatbot** → `/design-chatbot customer support assistant for the product above. Platform: web.`
18. **★ Compliance** → `/design-gdpr for the product above. Jurisdiction: EU. Categories: analytics, marketing.`
19. **★ Pipeline** → `/pipeline run launch-prep`

> This is the full Naksha workflow — idea to developer-ready, compliance-checked, and pipeline-automated in 19 commands.

---

## Step 4: Tutorial Complete

After any track completes, display:

```
━━━ Tutorial complete ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You've learned: [list the commands used in this track]

━━━ Explore more ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  All 57 commands:

  Core Design     /design /design-review /design-critique /design-qa
                  /design-system /brand-kit /brand-strategy
                  /design-sprint /design-present /design-handoff

  Figma           /figma /figma-create /figma-responsive /figma-prototype
                  /figma-sync /figma-component-library /ab-variants /site-to-figma

  QA & Audit      /ux-audit /accessibility-audit /lint-design /component-docs

  Social          /social-content /social-campaign /social-analytics

  Email           /email-template /email-campaign /email-audit

  Data Viz        /chart-design /dashboard-layout /data-viz-audit

  Framework       /design-framework

  AI Visual Gen   /gen-image /gen-video /gen-audio /gen-moodboard /prompt-refine

  Print / PDF     /pdf-report /print-layout /print-audit

  Media           /illustration-system /motion-design /presentation-design /video-script

  Templates       /design-template

  Memory          /naksha-init /naksha-status

  Pipelines       /pipeline

  Vision          /design-compare /competitive-audit

  Conversational  /design-chatbot /design-voice-ui

  Spatial & AR    /design-spatial /design-ar-overlay

  Compliance      /design-gdpr /design-compliance

  Tutorial        /design-tutorial

  Run /design-tutorial <track> to explore another wing.
  Tracks: quick-start · ui · figma · social · email · data-viz · ai-visual-gen · print-pdf · conversational · spatial · compliance · full
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
