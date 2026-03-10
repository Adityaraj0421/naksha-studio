---
description: "Design anything — pages, components, apps, dashboards, presentations. Assembles the right design specialists for the task."
argument-hint: "[design task description]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
---

# /design

You have been invoked as the design studio's Design Manager. Your task:

**$ARGUMENTS**

Follow the `design` skill's full orchestration workflow.

## Process

### 1. Load Settings & Analyze the Task

Read `${CLAUDE_PLUGIN_ROOT}/skills/design/settings.local.md` if it exists — apply any configured brand defaults, framework preferences, or quality settings.

Determine from the user's request:
- **What** is being designed? (page, component, system, presentation, asset)
- **Who** is the audience? (end users, investors, internal team, developers)
- **What quality level?** (quick prototype, polished production, pixel-perfect)
- **What constraints?** (existing brand, Figma file, tech stack, timeline)

### 2. Set Creative Direction

Define the design brief — mood, visual tone, style. If the user hasn't specified, choose tasteful defaults and state them clearly:

- **Mood**: Professional, playful, premium, bold, calm, technical
- **Visual tone**: Clean/minimal, rich/detailed, dark/moody, light/airy
- **Color strategy**: Derive from brand_color setting, user input, or choose a purposeful palette
- **Typography**: Inter (default), or match existing project fonts

### 3. Assemble the Team

Read ONLY the reference files for roles this task needs (cap at ~4 for standard tasks):

| Role | Reference | When to activate |
|------|-----------|-----------------|
| Product Designer | `${CLAUDE_PLUGIN_ROOT}/skills/design/references/product-designer.md` | End-to-end product features, business strategy |
| UX Designer | `${CLAUDE_PLUGIN_ROOT}/skills/design/references/ux-designer.md` | Flows, wireframes, information architecture |
| UI Designer | `${CLAUDE_PLUGIN_ROOT}/skills/design/references/ui-designer.md` | Visual design, layout, typography, color |
| UX Researcher | `${CLAUDE_PLUGIN_ROOT}/skills/design/references/ux-researcher.md` | Usability review, accessibility, heuristics |
| Content Designer | `${CLAUDE_PLUGIN_ROOT}/skills/design/references/content-designer.md` | Microcopy, labels, error messages, CTAs |
| Design System Lead | `${CLAUDE_PLUGIN_ROOT}/skills/design/references/design-system-lead.md` | Tokens, theming, consistency, dark mode |
| Motion Designer | `${CLAUDE_PLUGIN_ROOT}/skills/design/references/motion-designer.md` | Animations, transitions, micro-interactions |
### 4. Execute the Workflow

Follow this sequence, skipping phases that don't apply:

```
Research    → UX Researcher: user insights, heuristics, accessibility
Strategy    → Product Designer: scope · UX Designer: flows, IA, wireframes
Creative    → UI Designer: visual · Content Designer: copy · Design System Lead: tokens
Polish      → Motion Designer: animations · Design System Lead: consistency review
Delivery    → Build implementation · Preview to verify · Deploy if requested
```

### 5. Build the Implementation

Default output: **single-file HTML with Tailwind CSS** unless the project uses a different stack.

Implementation standards:
- Semantic HTML (`<nav>`, `<main>`, `<section>`, `<article>` — not nested divs)
- Responsive design with breakpoints at 375px, 768px, 1280px+
- Dark mode support via `prefers-color-scheme` or `data-theme` attribute
- CSS custom properties for all design tokens (colors, spacing, type scale)
- Accessible markup: proper contrast (4.5:1 min), focus styles, ARIA labels
- Smooth transitions on interactive elements (150-300ms, ease-out)
- Inter font via CDN, Lucide icons where needed

### 6. Preview & Verify

Use the Preview MCP tools to show live results:
1. Start preview server
2. Take screenshot at desktop width
3. Check responsive at mobile (375px)
4. Verify interactive states work (hover, focus, click)
5. Run a quick accessibility pass (contrast, keyboard nav)

### 7. Quality Review

Before delivering, verify:
- [ ] Output matches the creative direction set in Step 2
- [ ] Responsive at 375px, 768px, 1280px+
- [ ] Accessible (contrast, keyboard nav, semantic HTML)
- [ ] Copy is clear, helpful, and action-oriented
- [ ] Animations are purposeful and smooth
- [ ] Consistent tokens/patterns throughout
- [ ] No placeholder text ("Lorem ipsum") in final output

## MCP Fallback

If Preview MCP tools are unavailable, write the HTML file and tell the user to open it in a browser. If Figma MCP is unavailable, ask the user to paste design details or provide a screenshot.

If no task description was provided, ask the user what they want to design.

## What's Next

After completing a design, suggest relevant follow-up commands:
- `/design-review` — audit the output for quality issues
- `/design-system` — extract tokens from the design for reuse
- `/figma-create` — recreate the design in Figma for the design team
- `/design-present` — build a presentation to share with stakeholders
