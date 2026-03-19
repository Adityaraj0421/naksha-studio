---
description: "Convert a Figma design to production code. Provide a Figma URL or select a node in Figma desktop."
argument-hint: "[Figma URL]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
---

# /figma

You are running the Figma-to-code workflow. Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/figma-workflow.md` for the complete guide, and `${CLAUDE_PLUGIN_ROOT}/skills/design/references/ui-designer.md` for visual implementation standards.

Input: **$ARGUMENTS**

## Process

### 1. Get the Design

#### Stitch Input (if `$ARGUMENTS` contains `stitch:` or `stitch `)

If the input is a Stitch screen reference (format: `stitch:[projectId]/[screenId]` or `stitch [projectId] [screenId]`):

1. Fetch screen details:
   ```
   mcp__stitch__get_screen(
     name: "projects/[projectId]/screens/[screenId]",
     projectId: [projectId],
     screenId: [screenId]
   )
   ```
2. Download visual reference:
   ```bash
   curl -L "[screenshot.downloadUrl]" -o stitch-reference.png
   ```
3. If `figmaExport` is present in the screen response, download it:
   ```bash
   curl -L "[figmaExport.downloadUrl]" -o stitch-export.fig
   ```
   Open `stitch-export.fig` in Figma Desktop, then use `get_design_context` normally. Skip to Step 3.

4. If only `htmlCode` is available (no figmaExport), download it:
   ```bash
   curl -L "[htmlCode.downloadUrl]" -o stitch-source.html
   ```
   Use `stitch-source.html` as the implementation base — skip Steps 1–4, go directly to Step 5 (Preview and Compare) using `stitch-reference.png` as the visual target.

#### Figma URL Input

- If a **Figma URL** is provided, extract the fileKey and nodeId:
  - URL format: `https://figma.com/design/:fileKey/:fileName?node-id=:nodeId`
  - Node ID format in URL uses `-` separator, convert to `:` for API (e.g., `1-2` → `1:2`)
  - Call `get_design_context` with the extracted fileKey and nodeId
- If **no URL** is provided, use the Figma desktop app tools (`get_design_context` without parameters)
- Also call `get_screenshot` to get a visual reference of the target design

### 2. Check Code Connect

- Call `get_code_connect_map` to see if any components are already mapped to code
- If mappings exist, use the mapped component names and sources in your implementation
- This allows reusing existing components rather than rebuilding from scratch

### 3. Analyze the Design

From the design context, extract and document:

| Property | What to capture |
|----------|----------------|
| **Layout** | Grid/flex structure, auto-layout direction, alignment, gaps |
| **Typography** | Font family, sizes, weights, line heights, letter spacing |
| **Colors** | Map to design tokens or extract exact hex values |
| **Spacing** | Padding, margins, gaps — map to spacing scale (4, 8, 12, 16, 24, 32, 48, 64) |
| **Components** | Buttons, cards, inputs — identify reusable pieces |
| **Assets** | Images, icons that need downloading |
| **States** | Hover, active, disabled — from variants if visible |
| **Responsive hints** | Auto-layout direction, constraints, min/max widths |

### 4. Build the Implementation

Follow the Figma-to-CSS translation rules from the reference:

**Layout mapping:**
- Figma auto-layout HORIZONTAL → CSS `display: flex; flex-direction: row`
- Figma auto-layout VERTICAL → CSS `display: flex; flex-direction: column`
- Figma `itemSpacing` → CSS `gap`
- Figma padding → CSS `padding`
- Figma `FILL` sizing → CSS `flex: 1` or `width: 100%`
- Figma `HUG` sizing → CSS `width: fit-content`

**Implementation standards:**
- Semantic HTML, not nested divs — `<nav>`, `<main>`, `<section>`, `<button>`
- Apply Tailwind utilities where they match; use custom CSS for complex values
- Download image/icon assets referenced in the design
- Implement hover states and transitions even if not explicitly shown in Figma
- Include dark mode support if the design has dark mode variants
- Ensure accessible contrast ratios (4.5:1 for normal text, 3:1 for large)

### 5. Preview and Compare

1. Start the preview server with the built HTML
2. Take a screenshot of the implementation
3. Compare visually with the Figma screenshot side-by-side
4. Note specific discrepancies in:
   - Spacing (padding, margins, gaps)
   - Colors (exact hex match)
   - Typography (font size, weight, line-height)
   - Layout (alignment, proportions, responsive behavior)
   - Border radius, shadows, opacity

### 6. Refine

- Fix any visual differences found in the comparison
- Add responsive behavior (Figma designs are typically one breakpoint)
  - Adapt grid layouts to single-column on mobile
  - Adjust font sizes for smaller screens
  - Ensure touch targets are at least 44x44px on mobile
- Add interaction states if not already implemented
- Run a quick accessibility check (contrast, semantic HTML, keyboard nav)

### 7. Final Verification

Take a final screenshot and confirm the implementation matches the Figma design. If using Preview MCP, also check:
- Console for errors
- Network for failed asset loads
- Responsive at mobile (375px) and tablet (768px)

## Tech Stack

Default: Tailwind CSS + semantic HTML + Inter font. Adapt if the project uses a different stack (check for existing tailwind.config, package.json, etc.).

## MCP Fallback

This command works best with Figma MCP tools (`get_design_context`, `get_screenshot`, `get_code_connect_map`). If Figma MCP is unavailable, ask the user to paste design details, provide a screenshot, or export design specs manually. If Preview MCP is unavailable, write the HTML file and instruct the user to open it in a browser for comparison.

## What's Next

After converting a Figma design to code:
- `/design-review` — audit the implementation for quality
- `/design-handoff` — generate developer handoff docs from the Figma file
- `/figma-sync` — check if the code stays in sync with the design over time
- `/figma-responsive` — generate mobile/tablet variants in Figma
