---
description: "Quick-reference for any Naksha command — browse by category or look up a specific command"
arguments: "[category | command-name]"
allowed-tools: ["Read", "Glob"]
---

# /naksha-help

Contextual quick-reference for Naksha. Browse commands by category or look up a specific one.

**Usage:**
- `/naksha-help` — show all categories with command counts
- `/naksha-help <category>` — list commands in a category
- `/naksha-help <command>` — show reference card for a specific command

**Categories:** `design` · `figma` · `qa` · `social` · `email` · `data-viz` · `ai` · `print` · `frontier` · `memory` · `meta`

---

## Step 1: Parse Arguments

Parse `$ARGUMENTS`:
- **Empty** → show Category Overview (Step 2A)
- **Matches a category name** (`design`, `figma`, `qa`, `social`, `email`, `data-viz`, `ai`, `print`, `frontier`, `memory`, `meta`) → show Category Commands (Step 2B)
- **Matches a command name** (with or without leading `/`) → show Command Card (Step 2C)
- **Unclear** → show Category Overview with note

---

## Step 2A: Category Overview

Display when no arguments are given:

```
━━━ Naksha Quick Reference ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Your virtual design team — 26 roles, 63 commands, 7 agents

CATEGORIES                                     Run /naksha-help <category>

  design        Core design & review           11 commands
  figma         Figma-native workflows          8 commands
  qa            Quality & audit                 4 commands
  social        Social media                    3 commands
  email         Email design                    3 commands
  data-viz      Charts & dashboards             3 commands
  ai            AI visual generation            5 commands
  print         Print & PDF                     3 commands
  frontier      Conversational, Spatial, AR, Compliance   8 commands
  memory        Project memory & pipelines      8 commands
  meta          Templates, tutorial, help       6 commands

━━━ Popular starting points ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /design           Design anything — the main command
  /design-review    Audit for accessibility & usability issues
  /naksha-init      Set up project memory (brand, framework, tokens)
  /pipeline list    See available multi-command pipelines
  /design-tutorial  Interactive guided tour (choose a track)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 2B: Category Commands

When `$ARGUMENTS` matches a category name, display its commands.

**Category: `design`**
```
━━━ design commands ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /design             Build UI components, pages, and layouts
  /design-review      Audit designs for accessibility & usability
  /design-critique    Heuristic UX review of a design or screenshot
  /design-qa          Visual QA across breakpoints, tokens, states
  /design-system      Extract or build a design token system
  /brand-kit          Build a full brand identity from a color
  /brand-strategy     Develop brand positioning and voice
  /design-sprint      Run a 5-day design sprint structure
  /design-present     Create a presentation-ready design deck
  /design-handoff     Generate developer-ready specs
  /design-score       Quantitative design quality score (0–100)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Category: `figma`**
```
━━━ figma commands ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /figma              General Figma operations
  /figma-create       Create frames, components, and layouts in Figma
  /figma-responsive   Add responsive variants to Figma components
  /figma-prototype    Build interactive prototypes in Figma
  /figma-sync         Sync design tokens with Figma variables
  /figma-component-library   Build a Figma component library
  /ab-variants        Create A/B design variants in Figma
  /site-to-figma      Convert a live URL to a Figma frame

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Category: `qa`**
```
━━━ qa commands ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /ux-audit           Full UX audit against usability heuristics
  /accessibility-audit   WCAG AA compliance audit
  /lint-design        Lint for spacing, color, and type inconsistencies
  /component-docs     Generate component documentation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Category: `social`**
```
━━━ social commands ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /social-content     Design social media posts (Instagram, LinkedIn, X)
  /social-campaign    Plan a multi-platform campaign
  /social-analytics   Build a social performance dashboard

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Category: `email`**
```
━━━ email commands ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /email-template     Build production HTML email templates (MJML/table)
  /email-campaign     Plan a multi-email campaign sequence
  /email-audit        Audit emails for deliverability and rendering

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Category: `data-viz`**
```
━━━ data-viz commands ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /chart-design       Design accessible charts (bar, line, pie, scatter)
  /dashboard-layout   Build KPI dashboards and analytics layouts
  /data-viz-audit     Audit data visualizations for accuracy and clarity

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Category: `ai`**
```
━━━ ai commands ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /gen-image          Generate image prompts for AI art tools
  /gen-video          Write AI video briefs (Sora, Runway, Pika)
  /gen-audio          Create sound design specs and audio UI guidance
  /gen-moodboard      Generate moodboard directions and visual references
  /prompt-refine      Refine and improve AI generation prompts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Category: `print`**
```
━━━ print commands ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /print-layout       Build print layouts (business cards, brochures, posters)
  /pdf-report         Generate multi-page PDF reports
  /print-audit        Preflight audit for CMYK, bleed, font embedding

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Category: `frontier`**
```
━━━ frontier commands ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /design-chatbot     Design chatbot UIs — dialog flows, bubbles, quick replies
  /design-voice-ui    Design voice interfaces — wake word, VUI, hybrid layouts
  /design-spatial     Design for visionOS / WebXR — depth hierarchy, windows
  /design-ar-overlay  Design AR overlays — anchoring, world tracking, scan states
  /design-gdpr        Generate GDPR/CCPA consent flows and privacy controls
  /design-compliance  Compliance audit/generation (--regulation hipaa|pci|ada)
  /design-compare     Side-by-side visual analysis of two URLs
  /competitive-audit  Extract design patterns from a competitor URL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Category: `memory`**
```
━━━ memory & pipeline commands ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /naksha-init        Set up project memory (brand, font, framework, tokens)
  /naksha-status      View current project context and recent decisions
  /naksha-doctor      Run all quality checks and report plugin health
  /naksha-browse      Browse a URL with browser vision, save design patterns to memory
  /naksha-remember    Record a design constraint or decision to project memory
  /pipeline           Chain commands: run <name>, list, show <name>
  /design-framework   Convert HTML to React/Vue/Svelte/Next.js/Astro
  /design-template    Browse and use production-ready layout templates

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Category: `meta`**
```
━━━ meta commands ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /design-tutorial    Interactive guided tour (12 tracks, choose one)
  /naksha-help        Quick-reference for all commands (this command)
  /illustration-system   Build a consistent illustration style guide
  /motion-design      Create motion design specs and animation guidelines
  /presentation-design   Design presentation slides and decks
  /video-script       Write video scripts and storyboards

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Unknown category or command:**
If `$ARGUMENTS` is provided but doesn't match any known category or command file, output:

```
Unknown category or command: "[argument]"

Valid categories: design · figma · qa · social · email · data-viz · ai · print · frontier · memory · meta

Or run /naksha-help to see the full category overview.
```

---

## Step 2C: Command Card

When `$ARGUMENTS` matches a command name (with or without `/`):

1. Normalize the argument — strip leading `/` if present
2. Attempt to read `commands/<command-name>.md` using the Read tool
3. Extract `description` from the YAML frontmatter (the line starting with `description:`)
4. Extract `arguments` or `argument-hint` from frontmatter
5. Display a reference card:

```
━━━ /<command-name> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [description from frontmatter]

  Usage:   /<command-name> [arguments from frontmatter]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If the file does not exist:
```
Command not found: /<argument>
Run /naksha-help to browse all commands by category.
```

---

## MCP Fallback

If Read or Glob tools fail, fall back to the Category Overview from Step 2A.

---

## What's Next

- `/naksha-help <category>` to explore a specific wing
- `/design-tutorial <track>` for a hands-on learning track
- `/naksha-init` to set up project memory before starting real work
