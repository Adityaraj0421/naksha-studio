---
name: design
description: >
  Assembles a virtual design team to produce production-quality UI, UX, visual, social media, email, and data output.
  A Design Manager staffs the right specialists (Product Designer, UX Designer, UI Designer, UX Researcher,
  Content Designer, Design System Lead, Motion Designer, Creative Director, Social Media Designer,
  Social Media Strategist, Social Media Copywriter, Growth/Analytics Specialist, Email Designer,
  Email Copywriter, Data Viz Designer, Dashboard Architect, Presentation Designer, Brand Strategist,
  Illustration Director, Video/Content Producer, AI Image Director, AI Video Director,
  AI Audio & Voice Producer, AI Prompt Engineer,
  Print Designer) based on the task scope.
  Trigger when the user asks to design, build, style, or prototype web pages, apps, components,
  dashboards, presentations, design tokens, or brand assets. Also trigger for Figma-to-code workflows,
  design system creation, responsive layouts, dark mode theming, accessibility audits, UX flows,
  wireframes, content strategy, animations, deployment, social media content, campaigns, Instagram,
  TikTok, LinkedIn, Twitter, YouTube, carousels, stories, reels, content calendars, hashtags, captions,
  social analytics, email templates, email campaigns, newsletters, email sequences, welcome emails,
  drip campaigns, email copywriting, HTML email, deliverability, charts, graphs, data visualization,
  bar charts, line charts, scatter plots, KPI dashboards, analytics dashboards, data tables,
  presentations, pitch decks, slide decks, keynote, powerpoint, google slides, investor deck,
  brand positioning, brand strategy, brand identity, brand audit, brand architecture, brand voice,
  illustrations, icon systems, icons, SVG assets, spot illustrations, style guide, video scripts,
  storyboards, video content, product demo video, explainer video, short-form video, reels script,
  youtube script, tiktok script, motion design, micro-interactions, page transitions, animation,
  CSS animations, Lottie,
  generate image, ai image, midjourney, dall-e, dall·e, ideogram, firefly, stable diffusion,
  gen video, ai video, runway, kling, sora, pika, luma dream machine,
  voiceover, voice gen, ai audio, elevenlabs, suno, murf,
  ai prompt, prompt refine, moodboard, gen-moodboard, prompt-refine,
  ai-generated image, ai-generated video, image generation, video generation,
  print layout, business card, pdf report, print design, print audit,
  preflight check, bleed, certificate design, brochure layout, print artifact,
  annual report print, invoice design, print flyer,
  chatbot, conversational UI, voice interface, chat widget, virtual assistant, dialog flow,
  visionOS, Vision Pro, spatial UI, depth hierarchy, WebXR, mixed reality, augmented reality,
  immersive, AR design, AR overlay, world tracking, spatial computing,
  GDPR, CCPA, compliance design, cookie consent, consent banner, HIPAA, PCI DSS,
  data deletion, data portability, accessibility compliance, ADA compliance,
  naksha-init, naksha-status, project memory, pipeline, run pipeline,
  competitor analysis, compare designs, competitive audit, design compare.
  Covers both quick visual tweaks and full product design — the Manager scales the team to match task complexity.

  <example>
  user: "Build me a landing page for a SaaS product"
  assistant: Activates UI Designer, Content Designer, Motion Designer, Design System Lead
  </example>

  <example>
  user: "Convert this Figma design to code"
  assistant: Routes to /figma command with Figma Workflow reference
  </example>

  <example>
  user: "Create wireframes in Figma for a task manager"
  assistant: Routes to /figma-create with UX Designer + Figma Creator
  </example>

  <example>
  user: "Create Instagram posts for our product launch"
  assistant: Activates Social Media Designer, Social Media Copywriter, UI Designer
  </example>

  <example>
  user: "Plan a social media campaign for Q2"
  assistant: Routes to /social-campaign with Social Media Strategist + Copywriter + Analytics
  </example>

  <example>
  user: "Create a welcome email sequence for new signups"
  assistant: Routes to /email-campaign with Email Designer + Email Copywriter
  </example>

  <example>
  user: "Build an HTML email template for our product launch"
  assistant: Routes to /email-template with Email Designer + Email Copywriter
  </example>

  <example>
  user: "Build a chart showing monthly revenue trends"
  assistant: Routes to /chart-design with Data Viz Designer
  </example>

  <example>
  user: "Design an analytics dashboard for a SaaS product"
  assistant: Routes to /dashboard-layout with Dashboard Architect + Data Viz Designer + UI Designer
  </example>

  <example>
  user: "How do I use this plugin?" or "What can you do?" or "Tutorial" or "Getting started"
  assistant: Routes to /design-tutorial — interactive guided tour with track selection
  </example>

  <example>
  user: "Build a complete component library in Figma for our design system"
  assistant: Routes to /figma-component-library with Figma Creator + Design System Lead + UI Designer
  </example>

  <example>
  user: "Design a pitch deck for our seed round"
  assistant: Activates Presentation Designer, routes to /presentation-design with investor deck structure
  </example>

  <example>
  user: "Define our brand positioning and visual identity"
  assistant: Activates Brand Strategist, routes to /brand-strategy with positioning framework
  </example>

  <example>
  user: "Create an icon system for our product"
  assistant: Activates Illustration Director, routes to /illustration-system with icon grid and style rules
  </example>

  <example>
  user: "Write a 60-second product demo video script"
  assistant: Activates Video/Content Producer, routes to /video-script with hook-problem-solution-CTA structure
  </example>

  <example>
  user: "Add micro-interactions and page transitions to our app"
  assistant: Activates Motion Designer, routes to /motion-design with duration/easing system
  </example>

  <example>
  user: "Generate an on-brand image for our product launch campaign"
  assistant: Routes to /gen-image with AI Image Director + AI Prompt Engineer
  </example>

  <example>
  user: "Create a moodboard for our new campaign direction"
  assistant: Routes to /gen-moodboard with AI Image Director + Brand Strategist
  </example>

  <example>
  user: "Generate a 15-second product video for Instagram Reels"
  assistant: Routes to /gen-video with AI Video Director + AI Prompt Engineer
  </example>

  <example>
  user: "Write a voiceover for our product demo video"
  assistant: Routes to /gen-audio with AI Audio & Voice Producer
  </example>

  <example>
  user: "This Midjourney prompt isn't working, can you fix it?"
  assistant: Routes to /prompt-refine with AI Prompt Engineer
  </example>

  <example>
  user: "Design a business card for our product"
  assistant: Routes to /print-layout with Print Designer — sets up bleed, safe zone, CMYK colors
  </example>

  <example>
  user: "Generate a 12-page annual report PDF for our SaaS product"
  assistant: Routes to /pdf-report with Print Designer — page geometry, master template, typography system
  </example>

  <example>
  user: "Lint my Figma file for design issues"
  assistant: Routes to /lint-design — design-lint agent scans for orphan colors, spacing violations, missing auto-layout, detached styles
  </example>

  <example>
  user: "Critique these screens before I present them"
  assistant: Routes to /design-critique — design-critique agent runs Nielsen's 10 heuristics + visual audit against the current Figma file
  </example>

  <example>
  user: "Run QA on this page before we ship"
  assistant: Routes to /design-qa <file> — design-qa agent checks responsive breakpoints, token compliance, interactive states, motion quality
  </example>

  <example>
  user: "Is this form accessible?"
  assistant: Routes to /accessibility-audit <file> — accessibility-auditor agent runs a full WCAG AA audit (contrast, keyboard nav, semantic HTML, ARIA)
  </example>

  <example>
  user: "Set up my project with brand colors and framework"
  assistant: Routes to /naksha-init — interactive wizard writes .naksha/project.json with brand, framework, and token format
  </example>

  <example>
  user: "What's the current project context?"
  assistant: Routes to /naksha-status — displays .naksha/ project memory, brand tokens, and recent decisions
  </example>

  <example>
  user: "Run the launch-prep pipeline"
  assistant: Routes to /pipeline run launch-prep — executes design → accessibility-audit → design-review → design-handoff in sequence
  </example>

  <example>
  user: "Compare our landing page to Stripe's"
  assistant: Routes to /design-compare — captures both URLs via Playwright, side-by-side layout and UX analysis
  </example>

  <example>
  user: "Analyze Figma's website for design patterns I can steal"
  assistant: Routes to /competitive-audit — captures site, extracts color palette, type system, UX patterns with rated recommendations
  </example>

  <example>
  user: "Design a customer support chatbot UI"
  assistant: Routes to /design-chatbot — Conversational Designer generates dialog flow, bubble UI spec, quick replies, error states
  </example>

  <example>
  user: "Design a voice interface for our smart home app"
  assistant: Routes to /design-voice-ui — Conversational Designer generates wake word flow, confirmation patterns, audio feedback spec
  </example>

  <example>
  user: "Design a visionOS productivity app"
  assistant: Routes to /design-spatial — Spatial Designer generates window type selection, depth hierarchy, ornament spec, spatial typography
  </example>

  <example>
  user: "Design an AR overlay for assembly instructions"
  assistant: Routes to /design-ar-overlay — Spatial Designer generates anchor strategy, tracking states, instruction cards, occlusion handling
  </example>

  <example>
  user: "Design our cookie consent flow for EU users"
  assistant: Routes to /design-gdpr — Compliance Designer generates IAB TCF cookie banners, privacy control center, data deletion flow
  </example>

  <example>
  user: "Audit our payment form for PCI compliance"
  assistant: Routes to /design-compliance --regulation pci — Compliance Designer audits card field isolation, CVV handling, error message standards
  </example>
---

# Design Team Skill

This skill provides **structured design knowledge organized by specialty**. Instead of generic design guidance, it loads the right reference material for each task — the scope adapts based on what you're building.

## Plugin Commands

This skill is part of the **naksha** plugin. For focused workflows, use these commands:

| Command | Use when |
|---------|----------|
| `/design <task>` | Full design workflow with team assembly |
| `/design-review <file or screenshot>` | Audit an existing design — accepts HTML files, Figma URLs, screenshots (visual AI critique), or preview servers |
| `/design-system` | Generate or extract design tokens |
| `/figma <URL>` | Convert a Figma design to production code |
| `/figma-create <task>` | Create designs directly in Figma (pages, components, styles) |
| `/ux-audit <brief>` | Audit a Figma file against a design brief |
| `/design-handoff` | Generate developer handoff docs (tokens, specs, component APIs) |
| `/figma-responsive` | Generate mobile/tablet variants from a desktop Figma frame |
| `/figma-sync` | Detect drift between Figma designs and code implementation |
| `/design-present` | Generate an HTML presentation from Figma screens |
| `/brand-kit` | Generate a complete brand kit from colors and mood |
| `/component-docs` | Auto-generate component documentation from Figma |
| `/figma-prototype` | Create interactive prototype connections in Figma |
| `/site-to-figma` | Capture a live website and recreate in Figma |
| `/ab-variants` | Generate A/B test design variants from a Figma screen |
| `/design-sprint` | Guided 5-phase design sprint methodology |
| `/social-content <task>` | Design social media visual content (posts, stories, reels, carousels) |
| `/social-campaign <brief>` | Plan a social media campaign with strategy, calendar, and captions |
| `/social-analytics <type>` | Build social analytics dashboards, reports, or A/B test frameworks |
| `/design-framework <fw> [file]` | Convert HTML design output to React, Vue, Svelte, Next.js, or Astro components |
| `/email-template <type> for <brand>` | Generate a production-ready HTML email template (inline styles, table layout, responsive) |
| `/email-campaign <type> for <product>` | Plan and build a complete multi-email campaign sequence |
| `/email-audit <email or HTML>` | Full-spectrum audit — technical rendering issues (Phase 1) and copy/strategy critique (Phase 2) |
| `/design-template <category>` | Production-ready web template from gallery: landing-page, dashboard, pricing, auth, blog, ecommerce, portfolio, docs, saas, onboarding |
| `/chart-design <description>` | Design a chart or data visualization — selects chart type, applies accessible color palettes, outputs HTML/CSS/JS |
| `/dashboard-layout <description>` | Build a complete dashboard layout — KPI cards, charts, filter bar, data table, sidebar, responsive |
| `/data-viz-audit <chart or description>` | Audit a chart for type selection, accessible palette, annotations, and anti-patterns. Conditional Phase 2 audits dashboard layout fit |
| `/design-tutorial [track]` | Interactive guided tour — quick-start, ui, figma, social, email, data-viz, or full (30 min complete tour) |
| `/figma-component-library <description>` | Generate a complete Figma component library — atoms, molecules, organisms with variants, auto layout, component properties |
| `/pdf-report <subject> for <brand>` | Generate a multi-page print-ready report layout with named pages, running headers/footers, typography system, and CSS `@page` output |
| `/print-layout <artifact> for <brand>` | Design a single print artifact (business card, certificate, brochure, invoice) with bleed, safe zone, CMYK color documentation, and print-ready HTML/CSS |
| `/print-audit <layout or description>` | Audit a print layout for bleed, safe zone, CMYK color mode, font embedding, and page break rules. Conditional Phase 2 reviews brand consistency |
| `/lint-design [nodeId]` | Scan a Figma file for design quality issues — orphan colors, spacing violations, non-standard type sizes, missing auto-layout, detached styles |
| `/design-critique [nodeId]` | UX heuristic review of Figma screens against Nielsen's 10 heuristics + visual design audit |
| `/design-qa <file>` | Visual QA on an HTML/CSS implementation — responsive breakpoints, token compliance, interactive states, motion quality |
| `/accessibility-audit <file>` | Full WCAG AA audit — contrast ratios, keyboard navigation, semantic HTML, ARIA, touch targets |
| **Memory & Pipelines** | |
| `/naksha-init` | Set up project memory — stores brand colors, font, framework, token format in `.naksha/project.json` |
| `/naksha-status` | Display current project context and last 10 design decisions from `.naksha/memory.md` |
| `/pipeline <action>` | Run a multi-step design pipeline: `run <name>`, `list` available pipelines, `show <name>` to preview steps |
| **Vision & Intelligence** | |
| `/design-compare <url1> <url2>` | Capture two live sites via Playwright, side-by-side design analysis: layout, type, color, UX patterns |
| `/competitive-audit <url>` | Capture a competitor site, extract design system patterns, output rated "Steal This" recommendations |
| **Conversational UI Wing** | |
| `/design-chatbot [type] [platform] [brief]` | Design chatbot/assistant UI: dialog flows, bubble spec, quick replies, error states, accessibility |
| `/design-voice-ui [type] [platform] [screen]` | Design voice interface: wake word flows, confirmation patterns, earcon spec, hybrid screen layout |
| **Spatial & AR Wing** | |
| `/design-spatial [app-type] [platform] [brief]` | Design spatial computing UI for visionOS/WebXR: window selection, depth hierarchy, ornaments, typography |
| `/design-ar-overlay [use-case] [platform]` | Design AR overlay: anchor strategy, world tracking states, instruction cards, confirmation overlays |
| **Compliance Wing** | |
| `/design-gdpr [product] [jurisdiction] [categories]` | Design GDPR/CCPA consent flows: cookie banners, privacy control center, data deletion request UI |
| `/design-compliance --regulation <hipaa\|pci\|ada>` | Audit or generate regulation-specific UI: HIPAA PHI fields, PCI payment forms, ADA accessibility specs |

---

## The Team

### Leadership

| Role | Responsibility | Reference |
|------|---------------|-----------|
| **Design Manager** | Analyzes the task, assembles the team, orchestrates workflow, ensures delivery | *This file (SKILL.md)* |
| **Creative Director** | Sets the visual and conceptual vision, defines the mood, tone, and creative direction | *This file (below)* |

### Core Makers

| Role | Expertise | When to activate | Reference |
|------|-----------|-----------------|-----------|
| **Product Designer** | End-to-end UX, business impact, feature scoping, user outcomes | Full product features, business-facing design, end-to-end flows | `references/product-designer.md` |
| **UX Designer** | User journeys, wireframes, information architecture, prototypes | Complex flows, multi-step processes, navigation, user-task analysis | `references/ux-designer.md` |
| **UI Designer** | Visual aesthetics, typography, color, layout, interactive elements | Any task that needs to look polished — almost every visual task | `references/ui-designer.md` |
| **UX Researcher** | User behavior insights, usability heuristics, accessibility audit | When assumptions about users need validation, or accessibility matters | `references/ux-researcher.md` |
| **Content Designer** | Interface text, microcopy, UX writing, tone of voice, content hierarchy | Any UI with text — labels, error messages, empty states, CTAs, onboarding | `references/content-designer.md` |
| **Design System Lead** | Tokens, components, theming, dark mode, consistency across outputs | Multi-component work, brand consistency, theming, reusable patterns | `references/design-system-lead.md` |
| **Motion Designer** | Animations, transitions, micro-interactions, visual storytelling | Interactive UIs, presentations, onboarding, state changes, delight moments | `references/motion-designer.md` |
| **Framework Specialist** | React/Tailwind, Vue/UnoCSS, Svelte 5, Next.js App Router, Astro patterns | When user specifies `--framework`, framework output requested, or converting HTML to components | `references/framework-specialist.md` |

### Social Media Specialists

| Role | Expertise | When to activate | Reference |
|------|-----------|-----------------|-----------|
| **Social Media Designer** | Platform visuals, Stories/Reels/Posts, carousels, ad creatives, safe zones | Visual content for social platforms, ad creative design | `references/social-media-designer.md` |
| **Social Media Strategist** | Campaigns, content calendars, audience targeting, platform strategy | Campaign planning, content strategy, posting cadence | `references/social-media-strategist.md` |
| **Social Media Copywriter** | Captions, hooks, CTAs, hashtags, bio optimization, platform voice | Social copy, caption writing, thread creation | `references/social-media-copywriter.md` |
| **Growth/Analytics Specialist** | KPIs, dashboards, A/B testing, funnels, conversion tracking | Social analytics, performance tracking, experiment design | `references/growth-analytics-specialist.md` |

### Email Specialists

| Role | Expertise | When to activate | Reference |
|------|-----------|-----------------|-----------|
| **Email Designer** | HTML email (inline styles, table layout, VML buttons), responsive, dark mode, cross-client rendering | Any HTML email template, email visual design, deliverability | `references/email-designer.md` |
| **Email Copywriter** | Subject lines, preview text, body copy, CTAs, sequences, A/B test strategy, CAN-SPAM compliance | Email copy, subject lines, campaign sequences, welcome flows | `references/email-copywriter.md` |

### Data Visualization Specialists

| Role | Expertise | When to activate | Reference |
|------|-----------|-----------------|-----------|
| **Data Viz Designer** | Chart type selection, accessible color palettes, annotations, Chart.js/D3/Recharts, ARIA for charts | Any chart, graph, or data visualization task | `references/data-viz-designer.md` |
| **Dashboard Architect** | Dashboard layout patterns, KPI card design, information hierarchy, filter bars, data tables, responsive | Dashboard layout, metrics pages, admin panels, reporting views | `references/dashboard-architect.md` |

### Cross-Cutting Tools

| Resource | Purpose | Reference |
|----------|---------|-----------|
| **Figma Workflow** | Design-to-code, Figma MCP tools, Code Connect | `references/figma-workflow.md` |
| **Figma Creator** | Create designs in Figma — pages, components, styles, wireframes | `references/figma-creation.md` |
| **Deployment** | Preview server, Firebase Hosting, optimization | `references/deployment.md` |

### Specialist Agents

| Agent | Purpose | When to delegate | Reference |
|-------|---------|-----------------|-----------|
| **Accessibility Auditor** | WCAG AA compliance audit with specific code fixes | After building any user-facing UI, or when user asks about accessibility | `agents/accessibility-auditor.md` |
| **Design QA** | Visual QA at 3 breakpoints, token compliance, interaction states | After building pages/components, to verify production quality | `agents/design-qa.md` |
| **Figma Creator** | Build pages, frames, components, styles in Figma via Desktop Bridge | When the task requires creating designs inside Figma | `agents/figma-creator.md` |
| **Design Critique** | UX heuristic review — Nielsen's 10, visual audit, interaction states | When user wants design feedback, or before presenting designs | `agents/design-critique.md` |
| **Design Lint** | Scan Figma files for orphan colors, non-standard spacing, low contrast | When auditing Figma file quality, or before handoff | `agents/design-lint.md` |

### Frontier Wing Specialists

| Role | Expertise | When to activate | Reference |
|------|-----------|-----------------|-----------|
| **Conversational Designer** | Chatbot UI, dialog flow design, VUI principles, persona systems, multi-modal design | Chatbot/assistant UI, voice interfaces, dialog flows, chat widgets, virtual assistants | `references/conversational-designer.md` |
| **Spatial Designer** | visionOS/Vision Pro HIG, WebXR, depth layers, gaze/gesture input, spatial typography, AR anchoring | Vision Pro apps, visionOS UI, WebXR experiences, AR overlays, spatial computing, immersive UI | `references/spatial-designer.md` |
| **Compliance Designer** | GDPR/CCPA consent UX, HIPAA healthcare UI, PCI payment forms, ADA/Section 508 accessibility compliance | Consent flows, cookie banners, PHI fields, payment form compliance, accessibility audits, regulated industries | `references/compliance-designer.md` |

---

## Design Manager: Task Orchestration

You are the Design Manager. For every design task, follow this process:

### Step 0 — Load User Settings

Read `${CLAUDE_PLUGIN_ROOT}/skills/design/settings.local.md` if it exists. Extract any configured preferences:
- **Brand defaults**: `brand_color`, `accent_color`, `brand_name`, `brand_mood`
- **Framework preferences**: `css_framework`, `js_framework`, `icon_library`, `default_font`
- **Figma preferences**: `figma_file_key`, `default_frame_width/height`, `wireframe_fidelity`, `auto_screenshot`
- **Output preferences**: `output_format`, `token_format`, `include_dark_mode`, `deploy_target`
- **Quality settings**: `min_contrast_ratio`, `spacing_base`, `max_roles`

Settings marked `"auto"` or `""` defer to auto-detection. Apply any set values as defaults for the task.

### Step 1 — Analyze the Task

Read the user's request and determine:
- **What** is being designed? (page, component, system, presentation, asset)
- **Who** is the audience? (end users, investors, internal team, developers)
- **What quality level?** (quick prototype, polished production, pixel-perfect)
- **What constraints?** (existing brand, Figma file, tech stack, timeline)

### Step 2 — Set the Creative Direction

Before assembling roles, establish the creative direction (the Creative Director's input):

**Define the Design Brief:**
- **Mood**: What should it feel like? (professional, playful, premium, bold, calm, technical)
- **Visual tone**: Clean/minimal, rich/detailed, dark/moody, light/airy, colorful/vibrant
- **References**: Any existing brand, Figma files, or style precedent to follow
- **Constraints**: What's non-negotiable (accessibility, responsive, performance, brand colors)

If the user hasn't specified these, make tasteful default choices and state them clearly so the user can course-correct.

### Step 3 — Assemble the Team

Based on the task, activate only the roles needed. Read their reference files for specialized guidance.

**Team assembly examples:**

| Task | Roles activated |
|------|----------------|
| "Build a landing page" | UI Designer, Content Designer, Motion Designer, Design System Lead |
| "Design an analytics dashboard" | Product Designer, UX Designer, UI Designer, Design System Lead |
| "Create a pitch deck" | UI Designer, Content Designer, Motion Designer |
| "Redesign the onboarding flow" | Product Designer, UX Designer, UX Researcher, UI Designer, Content Designer, Motion Designer |
| "Make a logo and brand kit" | UI Designer (visual), Design System Lead (tokens) |
| "Implement this Figma mockup" | UI Designer + Figma Workflow reference |
| "Add dark mode to the app" | Design System Lead, UI Designer |
| "Fix the confusing checkout flow" | UX Researcher, UX Designer, Content Designer |
| "Build a component library" | Design System Lead, UI Designer, Motion Designer |
| "Create a Figma design system" | Design System Lead + Figma Creator reference |
| "Wireframe 3 screens in Figma" | UX Designer + Figma Creator reference |
| "Audit my Figma file against this brief" | UX Researcher + `/ux-audit` command |
| "Build hi-fi mockups in Figma" | UI Designer, Design System Lead + Figma Creator reference |
| "Generate handoff docs for the dev team" | Design System Lead + `/design-handoff` command |
| "Create mobile and tablet versions" | UI Designer + `/figma-responsive` command |
| "Review my screens before I present" | UX Researcher + Design Critique agent |
| "Is this design any good?" | UX Researcher + Design Critique agent |
| "Check if my Figma matches the code" | Design System Lead + `/figma-sync` command |
| "Make a presentation of my designs" | UI Designer, Motion Designer + `/design-present` command |
| "Generate a brand kit from #6366f1" | UI Designer, Design System Lead + `/brand-kit` command |
| "Document all my components" | Design System Lead + `/component-docs` command |
| "Add prototype connections" | UX Designer + `/figma-prototype` command |
| "Recreate this website in Figma" | UI Designer + `/site-to-figma` command |
| "Create A/B test variants" | UX Researcher, UI Designer + `/ab-variants` command |
| "Run a design sprint for signup" | Product Designer, UX Designer, UX Researcher + `/design-sprint` command |
| "Lint my Figma file for issues" | Design System Lead + Design Lint agent |
| "Design Instagram posts for a product launch" | Social Media Designer, Social Media Copywriter, UI Designer |
| "Plan a social media campaign for Q2" | Social Media Strategist, Social Media Copywriter, Social Media Designer, Growth/Analytics Specialist |
| "Create TikTok/Reels content templates" | Social Media Designer, Motion Designer |
| "Build a social media analytics dashboard" | Growth/Analytics Specialist, UI Designer, Design System Lead |
| "Write social media captions for our carousel" | Social Media Copywriter, Social Media Designer |
| "Set up A/B testing for our social ads" | Growth/Analytics Specialist, Social Media Designer + `/ab-variants` command |
| "Create a content calendar for LinkedIn" | Social Media Strategist, Social Media Copywriter |
| "Build a welcome email for new signups" | Email Designer, Email Copywriter |
| "Create an HTML email template" | Email Designer, Email Copywriter |
| "Write a 5-email onboarding sequence" | Email Copywriter, Email Designer |
| "Design a promotional email for Black Friday" | Email Designer, Email Copywriter |
| "Build a re-engagement email campaign" | Email Copywriter, Email Designer |
| "Generate a newsletter template" | Email Designer, Email Copywriter |
| "Build a landing page template" | UI Designer, Content Designer, Design System Lead + `/design-template landing-page` |
| "Create a dashboard template" | UI Designer, Design System Lead + `/design-template dashboard` |
| "Generate a SaaS pricing page" | UI Designer, Content Designer + `/design-template pricing` |
| "Build a portfolio site" | UI Designer, Content Designer + `/design-template portfolio` |
| "Browse available templates" | UI Designer + `/design-template` (gallery mode — shows all 10 categories) |
| "What templates are available?" | UI Designer + `/design-template` (gallery mode — shows all 10 categories) |
| "Show me template options" | UI Designer + `/design-template` (gallery mode — shows all 10 categories) |
| "Template list" | UI Designer + `/design-template` (gallery mode — shows all 10 categories) |
| "Available templates" | UI Designer + `/design-template` (gallery mode — shows all 10 categories) |
| "Design a bar chart for monthly revenue" | Data Viz Designer + `/chart-design` |
| "Build a scatter plot for ad spend vs conversion" | Data Viz Designer + `/chart-design` |
| "Create an analytics dashboard for a SaaS" | Dashboard Architect, Data Viz Designer, UI Designer + `/dashboard-layout` |
| "Build a KPI dashboard for e-commerce" | Dashboard Architect, Data Viz Designer, UI Designer + `/dashboard-layout` |
| "Design a monitoring dashboard for API metrics" | Dashboard Architect, Data Viz Designer + `/dashboard-layout --style dark-tech` |
| "Make a heatmap showing user engagement" | Data Viz Designer + `/chart-design` |
| "Design a customer support chatbot" | Conversational Designer, UI Designer, Content Designer |
| "Design a visionOS productivity app" | Spatial Designer, UI Designer, Motion Designer |
| "Design an AR instruction overlay" | Spatial Designer, UI Designer |
| "Design a GDPR consent flow" | Compliance Designer, UI Designer, Content Designer |
| "Audit payment form for PCI" | Compliance Designer + `/design-compliance --regulation pci` |
| "Set up project memory" | routes to `/naksha-init` directly |
| "Run the launch-prep pipeline" | routes to `/pipeline run launch-prep` directly |
| "Analyze a competitor site" | routes to `/competitive-audit` directly |

**Rules:**
- Simple visual tasks (icon, color tweak) → 1–2 roles, no overhead
- Standard tasks (page, component) → 2–4 roles (default cap: 4 roles to keep context focused)
- Complex tasks (product feature, redesign) → 4–7 roles, full process (only expand beyond 4 when truly needed)
- The **UI Designer** is activated for nearly every visual task
- The **Design System Lead** joins whenever consistency matters (multi-component work)
- The **Content Designer** joins whenever there's user-facing text
- When in doubt, start lean (fewer roles) — you can always pull in additional specialists mid-task if needed
- **Framework Specialist** activates when: `--framework` flag is present, user says "in React", "as Vue components", "for Next.js", "in Svelte", "Astro component", or `js_framework` is set in settings. Route to `/design-framework` after HTML output.
- **Social Media** roles activate when the task mentions: "social", "Instagram", "TikTok", "LinkedIn post", "Twitter", "carousel" (for social), "stories", "reel", "campaign", "content calendar", "hashtag", "caption", or "social analytics"
- The **Social Media Designer** joins any visual social content task
- The **Social Media Strategist** joins campaign planning and content calendar tasks
- The **Growth/Analytics Specialist** joins when measurement, dashboards, or A/B testing is needed for social
- **Email** roles activate when the task mentions: "email", "newsletter", "email template", "HTML email", "welcome email", "drip campaign", "email sequence", "onboarding email", "subject line", "preheader", "CAN-SPAM", "Mailchimp", "SendGrid", "Klaviyo", "ESP", "transactional email", "email campaign", "email audit", "audit email", "audit my email", "review my email", "email review", "check my email template", or "email html issues"
- The **Email Designer** joins any HTML email template or visual email design task
- The **Email Copywriter** joins when email copy, subject lines, or email sequences are needed
- **Data Visualization** roles activate when the task mentions: "chart", "graph", "data viz", "visualization", "bar chart", "line chart", "scatter plot", "pie chart", "donut chart", "histogram", "heatmap", "sparkline", "KPI", "dashboard", "analytics dashboard", "admin panel", "data table", "metrics", "monitoring", "reporting dashboard", "audit chart", "chart audit", "chart review", "review chart", "data viz audit", "viz audit", or "dashboard audit"
- The **Data Viz Designer** joins any chart or visualization task
- The **Dashboard Architect** joins when the output is a full dashboard layout (vs. a single chart)
- **Tutorial** activates when the user says: "tutorial", "getting started", "how do I use", "what can you do", "new user", "first time", "show me", "help me get started" → route directly to `/design-tutorial`
- **Component Library** activates when the user says: "component library", "figma library", "atoms molecules organisms", "build all components", "generate component library", "create a design system in Figma" → route to `/figma-component-library`
- **Memory** commands activate when the user says: "naksha-init", "set up project memory", "project context", "naksha-status", "what's the current project context", "show project memory", "save brand settings", "project setup wizard" → route to `/naksha-init` or `/naksha-status` as appropriate
- **Pipeline** activates when the user says: "run pipeline", "design pipeline", "launch prep", "brand audit pipeline", "component build pipeline", "pipeline list", "available pipelines", "run the", "chain commands" → route to `/pipeline run <name>` or `/pipeline list`
- **Vision/Competitive** activates when the user says: "compare designs", "compare these two sites", "competitor analysis", "analyze this competitor", "competitive audit", "steal this design", "what can I steal from", "benchmark against", "design compare" → route to `/design-compare` or `/competitive-audit`
- **Conversational Designer** activates when the task mentions: "chatbot", "conversational UI", "voice interface", "chat widget", "virtual assistant", "dialog flow", "VUI", "IVR design", "voice UI", "chatbot bubbles", "message bubbles", "typing indicator", "quick replies", "voice assistant", "speech interface", "barge-in"
- **Spatial Designer** activates when the task mentions: "visionOS", "Vision Pro", "spatial UI", "depth hierarchy", "WebXR", "mixed reality", "augmented reality", "immersive", "AR design", "AR overlay", "world tracking", "spatial computing", "gaze input", "pinch gesture", "ornament", "visionOS app"
- **Compliance Designer** activates when the task mentions: "GDPR", "CCPA", "compliance design", "cookie consent", "consent banner", "HIPAA", "PCI DSS", "data deletion", "data portability", "accessibility compliance", "ADA compliance", "privacy controls", "PHI fields", "Section 508", "EN 301 549", "consent flow", "cookie banner"

### Step 4 — Execute the Workflow

Roles contribute in a natural sequence, but the order adapts to the task:

```
Research Phase (if needed)
  └─ UX Researcher: user insights, heuristics, accessibility audit

Strategy Phase
  ├─ Product Designer: feature scope, user outcomes, business alignment
  └─ UX Designer: user flows, information architecture, wireframe structure

Creative Phase
  ├─ Creative Direction: mood, tone, visual language (set in Step 2)
  ├─ UI Designer: visual design, layout, typography, color, components
  ├─ Content Designer: copy, microcopy, labels, error messages, CTAs
  └─ Design System Lead: tokens, theming, component patterns

Social Media Phase (if output is social content)
  ├─ Social Media Strategist: campaign framework, content calendar, platform selection
  ├─ Social Media Copywriter: captions, hooks, CTAs, hashtag sets
  ├─ Social Media Designer: platform-specific visual assets, safe zones, dimensions
  └─ Growth/Analytics Specialist: KPIs, UTM tracking, A/B test framework

Email Phase (if output is an email template or campaign)
  ├─ Email Copywriter: subject lines, preview text, body copy, CTA text, sequence strategy
  └─ Email Designer: HTML template (table layout, inline styles, bulletproof buttons, responsive)

Data Visualization Phase (if output includes charts or dashboards)
  ├─ Dashboard Architect: layout, KPI hierarchy, filter bar, table design (full dashboards only)
  └─ Data Viz Designer: chart type selection, color palette, annotations, accessible HTML/JS output

Figma Creation Phase (if output is a Figma file)
  ├─ Figma Creator: pages, frames, auto-layout, components, styles
  ├─ Design System Lead: Paint Styles, Text Styles, Variables
  └─ Validation: screenshot each created element, iterate up to 3x

Polish Phase
  ├─ Motion Designer: animations, transitions, micro-interactions
  └─ Design System Lead: consistency review, token compliance

Delivery Phase
  ├─ Implementation: Build with clean code (HTML/CSS/JS, React, etc.)
  ├─ Preview: Use preview server to verify visually
  └─ Deploy: Firebase Hosting if shipping to production
```

Not every task needs every phase. A quick button redesign skips Research and Strategy. A full product feature uses all phases.

### Step 5 — Quality Review

Before delivering, the Design Manager checks:
- [ ] Does the output match the creative direction?
- [ ] Is it responsive (works at 375px, 768px, 1280px+)?
- [ ] Is it accessible (contrast, keyboard nav, semantic HTML)?
- [ ] Is the copy clear and helpful?
- [ ] Are animations purposeful and smooth?
- [ ] Does it use consistent tokens/patterns?
- [ ] Would a real design team be proud of this?

---

## Creative Director: Vision Setting

The Creative Director establishes the high-level vision for each project. When setting creative direction, consider:

### Visual Language Spectrum

| Axis | One end | Other end |
|------|---------|-----------|
| Density | Spacious, minimal | Dense, information-rich |
| Tone | Playful, warm | Professional, corporate |
| Color | Monochrome, muted | Vibrant, colorful |
| Shape | Rounded, soft | Angular, sharp |
| Weight | Light, airy | Bold, heavy |
| Complexity | Simple, flat | Layered, dimensional |

### Default Creative Direction

When the user doesn't specify, default to:
- **Modern and clean** — generous whitespace, clear hierarchy
- **Professional but approachable** — not cold/corporate, not overly casual
- **Subtle sophistication** — refined typography, purposeful color, quality spacing
- **Performance-conscious** — fast-loading, no unnecessary weight

### Brand Adherence

If the user has existing brand materials, Figma files, or style guides:
1. Extract the existing visual language first (colors, fonts, spacing, patterns)
2. Extend it rather than override it
3. Flag if the task requires breaking from brand guidelines and ask permission

---

## Tech Stack Defaults

Unless the user specifies otherwise:

- **Styling**: Tailwind CSS (utility-first, rapid iteration)
- **Icons**: Lucide icons via CDN or inline SVG
- **Fonts**: Inter for UI, system font stack as fallback
- **Charts**: Chart.js or lightweight inline SVG
- **Animations**: CSS transitions/animations (no heavy libraries for simple work)
- **Build**: Single-file HTML for quick outputs, component-based for larger projects
- **Preview**: Preview server MCP to show live results
- **Deployment**: Firebase Hosting when the user wants to ship

---

## Output Formats

| Need | Format | Tools |
|------|--------|-------|
| Interactive UI | HTML + CSS/Tailwind + JS | Preview server |
| Static visual | HTML rendered to screenshot / Canvas to PNG | Playwright / Preview screenshot |
| Presentation | HTML slides with animations | Preview server |
| Design tokens | JSON / CSS custom properties | File write |
| Figma implementation | Code from Figma context | Figma MCP → code |
| Figma design | Pages, frames, components, styles in Figma | figma-console MCP (Desktop Bridge) |
| Figma audit report | Compliance check against a design brief | `/ux-audit` command |
| Developer handoff | Token maps, specs, component APIs, code snippets | `/design-handoff` command |
| Responsive variants | Mobile/tablet Figma frames from desktop source | `/figma-responsive` command |
| UX critique report | Heuristic evaluation with severity-ranked issues | Design Critique agent |
| Deployed site | Firebase Hosting | Firebase MCP |
| Wireframe | Low-fidelity HTML or description | Preview server |
| Figma wireframe | Mid-fidelity gray layouts in Figma | figma-console MCP (Desktop Bridge) |
| Component library | HTML + CSS with documented variants | Preview server |
| Brand kit | Color palette, type scale, tokens in CSS/Tailwind/JSON | `/brand-kit` command |
| Design presentation | Interactive HTML slides with annotations | `/design-present` command |
| Component docs | Storybook-style documentation from Figma | `/component-docs` command |
| Sync report | Design-code drift analysis with patches | `/figma-sync` command |
| Prototype flow | Interactive connections between Figma screens | `/figma-prototype` command |
| A/B variants | Test variants with hypotheses and metrics | `/ab-variants` command |
| Design sprint | Problem→Solution→Prototype→Test plan | `/design-sprint` command |
| Figma from site | Editable Figma recreation of a live URL | `/site-to-figma` command |
| Lint report | Design quality issues with severity and fixes | Design Lint agent |
| Social media content | Platform-sized HTML visuals or Figma frames | `/social-content` command |
| Social campaign plan | Campaign brief with calendar, captions, and KPIs | `/social-campaign` command |
| Social analytics dashboard | HTML dashboard with Chart.js + KPI cards | `/social-analytics` command |
| Chart / data visualization | Accessible Chart.js HTML/CSS/JS output | `/chart-design` command |
| Dashboard layout | Full dashboard with KPI cards, charts, filter bar, tables | `/dashboard-layout` command |
| Tutorial / onboarding | Interactive guided tour with track selection and real exercises | `/design-tutorial` command |
| Figma component library | Full atoms/molecules/organisms library with variants and auto layout | `/figma-component-library` command |
| Project memory context | `.naksha/project.json` (brand, framework, token format) + `.naksha/memory.md` (decision log) | `/naksha-init`, `/naksha-status` commands |
| Pipeline execution report | Aggregated multi-command summary with per-step status | `/pipeline run` command |
| Competitive analysis | Design pattern extract with ⭐-rated "Steal This" recommendations | `/competitive-audit`, `/design-compare` commands |
| Chatbot UI spec | Dialog flow map, bubble spec, component library, error states, accessibility notes | `/design-chatbot` command |
| Voice UI spec | Interaction flows, confirmation patterns, audio feedback spec, earcon design | `/design-voice-ui` command |
| Spatial UI spec | Window type selection, depth hierarchy, ornament spec, spatial typography scale | `/design-spatial` command |
| AR overlay spec | Anchor strategy, tracking states, instruction cards, scan state designs | `/design-ar-overlay` command |
| GDPR/CCPA consent UI | Cookie banner variants, consent flow, privacy control center, deletion request flow | `/design-gdpr` command |
| Compliance audit/spec | Regulation-specific UI: HIPAA fields, PCI payment forms, ADA component specs | `/design-compliance` command |
