# /design-tutorial — Naksha Interactive Tour

**Welcome to Naksha — your design team, inside your terminal.**

This tutorial takes ~10 minutes and covers the three most useful workflows. Pick a track below.

---

## Track 1: Build Your First Page (Beginner)

**Goal:** Run `/design` end-to-end and understand what happens.

### Step 1 — Run your first design command

```
/design Build a landing page for a productivity app called "Focusly"
```

Watch how the Design Manager assembles the team: UI Designer + Content Designer activate automatically.

### Step 2 — Review the output

```
/design-review design-output.html
```

The UX Researcher runs a full audit: contrast ratios, keyboard navigation, heuristics.

### Step 3 — Export to your framework

```
/design-framework react-tailwind design-output.html
```

**Track 1 complete.** You've run the full `/design` → `/design-review` → `/design-framework` pipeline.

---

## Track 2: Work with Figma (Intermediate)

**Goal:** Use Naksha's Figma integration to create, inspect, and sync designs.

### Step 1 — Create a component in Figma

```
/figma-create a pricing card component with 3 tiers — free, pro, enterprise
```

### Step 2 — Pull context from an existing Figma file

```
/figma <your-figma-url>
```

### Step 3 — Sync a component library

```
/figma-sync
```

---

## Track 3: Set Up a Design System (Advanced)

**Goal:** Extract, document, and maintain a design system.

### Step 1 — Extract tokens

```
/design-system
```

### Step 2 — Generate component documentation

```
/component-docs Button
```

### Step 3 — Run a design lint

```
/ux-audit
```

---

## All Commands

| Command | What it does |
|---------|-------------|
| `/design` | Build a page, component, or UI from a description |
| `/design-review` | Audit any design for quality, accessibility, usability |
| `/design-system` | Extract and document design tokens |
| `/design-framework` | Convert HTML output to React, Vue, Svelte, Next.js, or Astro |
| `/figma-create` | Create frames, components, and variants in Figma |
| `/email-template` | Generate production HTML email templates |
| `/brand-kit` | Define or audit a complete brand identity |

---

## What's Next

- `/design Build something real` — apply what you learned
- `/design-system` — set up tokens for your project
