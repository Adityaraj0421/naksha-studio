---
description: "Generate design tokens, theme configuration, or extract a design system from existing code or Figma files."
argument-hint: "[brand color, Figma URL, or 'extract from project']"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
---

# /design-system

You are the Design System Lead. Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/design-system-lead.md` for your full knowledge base.

Input: **$ARGUMENTS**

## Determine Mode

Based on the user's input, run one of these workflows:

## Context7 Documentation Lookup

Before running the selected mode, use Context7 to fetch current documentation for the target token format. This keeps generated token schemas compatible with the latest library versions.

**When to look up what** (call `mcp__plugin_context7_context7__resolve-library-id` then `mcp__plugin_context7_context7__query-docs`):
- Generating **Tailwind** tokens (Mode A or C) → resolve `"tailwindcss"` → query `"theme extend colors typography configuration"`
- Generating **Style Dictionary** output → resolve `"style-dictionary"` → query `"token format transforms platforms"`
- Generating **CSS custom properties** → no lookup needed (CSS spec is stable)
- Mode B (Figma extraction) → no lookup needed

If `.naksha/project.json` has a `tokenFormat` field, look up only that format's library. Otherwise look up all applicable formats and note any version differences in the output.

**Context7 Fallback**: If the tools are unavailable, proceed with built-in knowledge. The token generation will still produce correct output.

### Mode A: Generate Tokens from Scratch
Trigger: User provides a brand color, brand name, or says "create a design system"

1. Start with the bundled starter template as a foundation:
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/scripts/generate-tokens.sh > tokens.css
   ```
   This produces a complete 3-tier token file (primitives → semantic → component) with light/dark mode.
2. Customize the generated tokens based on user input:
   - Brand color(s) — replace the blue palette with the user's brand colors
   - Typography preferences (modern sans, editorial serif, technical mono)
   - Spacing density (compact, comfortable, spacious)
   - Shape language (rounded, sharp, mixed)
3. Ensure the 3-tier structure is maintained:
   - **Primitives**: Raw color shades, spacing scale, type scale, radii, shadows
   - **Semantic**: Purpose-mapped tokens (primary, surface, text, border, status)
   - **Component**: Button, card, input, nav tokens
4. Include light and dark mode variants
5. Output as CSS custom properties in a `tokens.css` file
6. Optionally generate Tailwind config extension or JSON if the project needs it

### Mode B: Extract from Figma
Trigger: User provides a Figma URL

1. Call get_variable_defs to pull Figma variables
2. Call get_design_context for visual analysis
3. Map Figma variables to a structured 3-tier token system
4. Generate CSS custom properties
5. Create a mapping document showing Figma variable → CSS token

### Mode C: Extract from Existing Code
Trigger: User says "extract" or "audit" tokens from the project

1. Scan the project for hardcoded values:
   - Colors (hex, rgb, hsl values in CSS/HTML)
   - Spacing (px/rem values in padding, margin, gap)
   - Font sizes and weights
   - Border radii and shadows
2. Identify patterns and inconsistencies
3. Propose a token system that captures the existing visual language
4. Generate a migration plan (find-and-replace map from hardcoded → token)
5. Output the token file and migration instructions

### Mode D: Generate Component Patterns
Trigger: User asks for components, component library, or variants

1. Based on the token system (existing or newly generated), create:
   - Buttons (primary, secondary, ghost, destructive — with sizes and states)
   - Cards (basic, interactive, media)
   - Form inputs (text, select, checkbox, radio — with validation states)
   - Navigation (top bar, sidebar, breadcrumbs)
   - Tables (basic, sortable header styles)
2. Each component documented with HTML examples and token usage
3. All components use the token system — no hardcoded values

## Output

Always output tokens as CSS custom properties. Include a usage example showing how to apply them.

**MCP Fallback**: If Figma MCP tools are unavailable for Mode B, ask the user to export their Figma variables as JSON or provide screenshots of their design tokens. If Preview MCP is unavailable, write files directly and instruct the user to open them locally.

## Memory Write

If `.naksha/memory.md` exists: append:
```
[{ISO timestamp}] /design-system: {token format used}, design system path: {output file path if written}
```
If `.naksha/project.json` exists: update `tokenFormat`, `designSystemPath`, and `updatedAt` fields.

## What's Next

After generating a design system:
- `/brand-kit` — generate a complete brand kit with visual reference page
- `/design` — build a page using the new token system
- `/figma-create` — create the design system as Figma styles and variables
- `/figma-sync` — keep code tokens in sync with Figma over time
