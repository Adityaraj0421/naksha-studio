---
description: "Generate design tokens, theme configuration, or extract a design system from existing code, Figma files, or a DESIGN.md — and persist it as .naksha/design-system/MASTER.md."
argument-hint: "[brand color, Figma URL, 'extract from project', or path/to/DESIGN.md] [--export design-md|dtcg]"
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

## v5 Project Context

Before running any mode, read `.naksha/project.json` (search up to 3 directory levels) for v5 constraints that pre-shape the token system:

- `constraints.grid` → set the base spacing unit to this value. If `"4px"`, the spacing scale is `4, 8, 12, 16, 20, 24, 32, 40, 48, 64px`. If `"8px"`, scale is `8, 16, 24, 32, 40, 48, 64, 80, 96px`. Note in output: "Base grid: {value} (from project constraints)."
- `constraints.dark_mode` → if `false`, skip dark mode token variants entirely. If `true`, dark mode variants are required. If absent, include dark mode as an optional layer.
- `constraints.accessibility_target` → if `"WCAG AAA"`, generate semantic color tokens that achieve 7:1 contrast minimum. If `"WCAG AA"` (or absent), use 4.5:1.
- `constraints.breakpoints` → use these as the responsive breakpoint values in the generated token set. Emit them as named breakpoint tokens (e.g., `--breakpoint-md: 768px`).
- `constraints.max_content_width` → emit as a layout token: `--layout-max-width: {value}px`.
- `component_patterns` → for each named pattern, ensure the generated component tokens match the recorded description. If a `card-layout` pattern exists with `"16px padding, 8px radius"`, the generated `--card-padding` and `--card-radius` tokens must match.

**If no v5 fields found**: proceed using brand color and tokenFormat only (v4 behavior — unchanged).

**Existing design system:** if `.naksha/design-system/MASTER.md` exists, it is the project's current system. Modes A–D extend or revise it instead of starting from nothing. Say which tokens you changed.

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

### Mode E: Import a DESIGN.md
Trigger: User passes a path to a `DESIGN.md` file, or says "import DESIGN.md" / "use our DESIGN.md". (If you only notice a `DESIGN.md` at the project root, mention it in the output and offer this mode; do not switch modes on your own.)

[DESIGN.md](https://github.com/google-labs-code/design.md) is an open format that pairs YAML design tokens with prose rationale. Treat its tokens as the token source instead of generating new values:

1. Validate it first:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/design-md.js lint path/to/DESIGN.md
   ```
   Exit 1 means errors such as broken `{token}` references, invalid colours, or text/background pairs below WCAG AA. List them and ask whether to fix them in the file or carry on.
2. Generate the CSS custom properties from it, without retyping values by hand:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/design-md.js export --to css path/to/DESIGN.md > tokens.css
   ```
   Use `--to tailwind` (Tailwind v4 `@theme`) or `--to tailwind-v3` when `tokenFormat` is `tailwind`.
3. Read the DESIGN.md prose (Overview, Do's and Don'ts and the rest) and carry its rules into the component guidance. The tokens are normative; the prose explains how to apply them.
4. Fill gaps the file doesn't cover (dark mode, states, breakpoints) with the 3-tier approach from Mode A, and label those tokens as additions rather than imports.

## Stitch Design System Export (Optional)

After token generation (any mode), if `$ARGUMENTS` contains `--stitch` OR the user says "push to Stitch" / "sync to Stitch":

1. Convert the generated CSS custom properties to DTCG JSON format. For each token in `:root`:
   ```json
   {
     "color-primary": { "$value": "#2563eb", "$type": "color" },
     "spacing-4": { "$value": "4px", "$type": "dimension" },
     "font-size-base": { "$value": "16px", "$type": "dimension" }
   }
   ```

2. Extract the primary brand color and font from the tokens to populate the `theme` object.

3. Find or create a Stitch project:
   ```
   mcp__stitch__list_projects → use first owned project, or mcp__stitch__create_project(title: "[project name] Design System")
   ```

4. Check for an existing design system to update vs. create:
   ```
   mcp__stitch__list_design_systems(projectId: [id])
   ```
   - If exists → `mcp__stitch__update_design_system` with the asset `name`
   - If none → `mcp__stitch__create_design_system`

5. Push the design system:
   ```
   mcp__stitch__create_design_system(
     designSystem: {
       displayName: "[project name] Design System",
       theme: {
         colorMode: LIGHT,            // or DARK if --dark was specified
         font: INTER,                 // map to closest Stitch font enum
         roundness: ROUND_EIGHT,      // derive from --radius-base token
         preset: "default",
         customColor: "[brand primary hex]"
       },
       designTokens: "[serialized DTCG JSON string]",
       styleGuidelines: "Generated by naksha /design-system. Primary: [hex]. Scale: [density]."
     },
     projectId: [id]
   )
   ```

6. Confirm: "Design system pushed to Stitch project [name]. Apply to screens with `/ab-variants --stitch`."

If Stitch MCP is unavailable, skip silently.

## Persist as MASTER.md (DESIGN.md format)

After any mode, if the project has a `.naksha/` directory, save the design system as `.naksha/design-system/MASTER.md`. It is a standard DESIGN.md file, so other agent tools can read it as well. `/design` reads it on every run.

1. Convert the generated tokens, or copy the imported DESIGN.md (Mode E):
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/design-md.js from-tokens tokens.css --name "[project name]" --out .naksha/design-system/MASTER.md
   ```
   `from-tokens` also accepts a DTCG `tokens.json`. It imports the top-level `:root` variables only and reports anything it skipped, such as dark-mode overrides or shadows. Put skipped decisions into the prose.
2. Replace the generated placeholder notes with real rationale: the Creative Director's direction under Overview, palette roles under Colors, and the rules under Do's and Don'ts.
3. Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/design-md.js lint .naksha/design-system/MASTER.md` and fix any errors before finishing. Keep MASTER.md valid on its own, with no references that only resolve through brand defaults.
4. If MASTER.md already exists, do not overwrite it silently. Summarize which tokens change and update it only after the user confirms.

**Per-page overrides.** When a page needs to deviate (for example, a calmer checkout or a denser dashboard), write only the differences to `.naksha/design-system/pages/<page>.md`, using the same DESIGN.md format. A partial token set is fine. A `null` value removes a master token, and component properties merge one at a time. Page names are lowercase slugs (`checkout`, `pricing`, `settings-billing`).

**Precedence:** page override > MASTER.md > brand defaults (`brand.primary`, `brand.secondary` in `.naksha/project.json`). Check the effective system for a page with:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/design-md.js resolve --page checkout          # JSON with per-token provenance
node ${CLAUDE_PLUGIN_ROOT}/scripts/design-md.js lint --page checkout             # contrast and references after merging
```

## Export (optional)

If `$ARGUMENTS` contains `--export design-md`, or the user asks for a DESIGN.md, write `DESIGN.md` at the project root. Copy MASTER.md, or run `resolve --format md` to bake in a page override. If it contains `--export dtcg`, or the user asks for W3C/DTCG tokens, run:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/design-md.js export --to dtcg .naksha/design-system/MASTER.md > tokens.json
```
The output follows the DTCG Format Module 2025.10. Anything DTCG cannot express, such as multi-value padding or `em` letter-spacing without a font size, is preserved under `$extensions["naksha.design-md"]`. See `${CLAUDE_PLUGIN_ROOT}/docs/design-md.md` for the supported subset.

## Output

Always output tokens as CSS custom properties. Include a usage example showing how to apply them.

**MCP Fallback**: If Figma MCP tools are unavailable for Mode B, ask the user to export their Figma variables as JSON or provide screenshots of their design tokens. If Preview MCP is unavailable, write files directly and instruct the user to open them locally.

## Memory Write

If `.naksha/memory.md` exists: append:
```
[{ISO timestamp}] /design-system: {token format used}, design system path: {output file path if written}
```
If MASTER.md or a page override was written, add a second line, for example: `[{ISO timestamp}] /design-system: MASTER.md updated (12 colors, 6 type levels)`.
If `.naksha/project.json` exists: update `tokenFormat`, `designSystemPath`, and `updatedAt` fields.

## What's Next

After generating a design system:
- `/brand-kit` — generate a complete brand kit with visual reference page
- `/design` — build a page using the new token system (it reads MASTER.md and any matching page override automatically)
- `/design-md` — lint, import, or export DESIGN.md files and manage page overrides
- `/figma-create` — create the design system as Figma styles and variables
- `/figma-sync` — keep code tokens in sync with Figma over time
