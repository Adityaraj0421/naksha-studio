---
description: "Create designs directly in Figma — pages, wireframes, components, design systems, hi-fi screens."
argument-hint: "[design task description]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
---

# /figma-create

You are running the Figma-native design creation workflow. Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/figma-creation.md` for the complete API and pattern reference.

**This command creates designs INSIDE Figma** — the reverse of `/figma` which extracts from Figma to code.

Input: **$ARGUMENTS**

## Process

### 1. Check Connection

```
figma_get_status → verify WebSocket Desktop Bridge is connected
```

If not connected, guide the user:
1. Open your Figma file in Figma Desktop
2. Right-click canvas → Plugins → Development → Figma Desktop Bridge
3. Wait for "Connected" confirmation
4. Try `figma_get_status` again

### 2. Understand the Task

Parse the user's request to determine what needs to be created:

| Task Type | What to build |
|-----------|---------------|
| **Page structure** | New pages with named frames at specified sizes |
| **Wireframes** | Mid-fidelity gray layouts with placeholder content |
| **Components** | COMPONENT_SET with variants (states, sizes, types) |
| **Design system** | Color styles, text styles, variables/tokens |
| **Hi-fi screens** | Full-fidelity designed frames with real content |
| **Annotations** | Leader lines, numbered badges, annotation cards |

### 3. Read References

Load the knowledge you need based on the task:

- **Always**: `figma-creation.md` (core API patterns)
- **Components/tokens**: `design-system-lead.md` (token architecture, naming)
- **Layout/visual**: `ui-designer.md` (spacing, typography, color)
- **Wireframes/flows**: `ux-designer.md` (information architecture, user flows)
- **Copy/labels**: `content-designer.md` (microcopy, naming conventions)

Also activate the Design Manager from `SKILL.md` to assemble the right specialist roles for the task.

### 4. Plan the Structure

Before writing any Figma code, define:

- **Page names** and hierarchy
- **Frame sizes** (common: 1440×900 desktop, 375×812 mobile, 768×1024 tablet)
- **Naming conventions** (e.g., `S3-A`, `Page 1—Title`)
- **Component taxonomy** (what gets componentized vs. one-off frames)
- **Style definitions** (colors, text styles to create)

State the plan clearly so the user can course-correct before execution.

### 5. Execute Creation

Use `figma_execute` for complex multi-step operations and targeted tools for simple ones.

**Key execution rules:**
- Always use `async` patterns — `await figma.getNodeByIdAsync(id)` not `figma.getNodeById(id)`
- Load fonts before any text operations — `await figma.loadFontAsync({ family: "Inter", style: "Regular" })`
- Create parent containers before children
- Use auto-layout for structured compositions (set `layoutMode`, `itemSpacing`, `paddingLeft/Right/Top/Bottom`)
- Set `layoutSizingHorizontal` and `layoutSizingVertical` to `'FILL'` or `'HUG'` as appropriate
- Name every node meaningfully — no "Frame 47" or "Rectangle 12"
- Place all created elements inside Sections or named Frames, never on blank canvas

**Execution order for a typical page:**
1. Create or navigate to the target page
2. Create the main frame (e.g., 1440×900)
3. Build the layout structure (sections, rows, columns)
4. Add content (text, shapes, images)
5. Apply styles (colors, typography)
6. Create components if reusable elements are needed

### 6. Validate

After each major creation step, take a screenshot to verify:

```
figma_capture_screenshot(nodeId) → check alignment, spacing, content
```

Use `figma_capture_screenshot` (Desktop Bridge, current state) for immediate verification.
Use `figma_take_screenshot` (REST API) only if you need cloud-state rendering.

### 7. Iterate

Fix issues found in screenshots. Common problems to look for:
- Elements not filling their containers (check `layoutSizingHorizontal: 'FILL'`)
- Auto-layout bunching children together (check `itemSpacing`)
- Text overflowing or truncating (check frame sizing)
- Colors not matching intent (verify hex values)
- Components not appearing as proper COMPONENT_SET in sidebar

**Max 3 iterations per element** — if it's still not right after 3 tries, describe the issue and ask the user for guidance.

## Task-Specific Workflows

### Creating a Design System in Figma

1. Define tokens first (colors, spacing, typography)
2. Create Paint Styles: `figma.createPaintStyle()` with `Miles/Category/Name` naming
3. Create Text Styles: `figma.createTextStyle()` — load fonts first!
4. Create base components (buttons, inputs, cards, tags)
5. Build COMPONENT_SETs with variants for each state/size
6. Optionally create variables with `figma_setup_design_tokens`
7. Validate styles appear in Figma sidebar

### Creating Wireframes

1. Use gray palette: backgrounds `#F5F5F5`, containers `#FFFFFF`, borders `#E0E0E0`, text `#333333`/`#666666`
2. Use placeholder patterns: crossed rectangles for images, gray bars for text
3. Include flow annotations (numbered steps, arrows, decision points)
4. Keep fidelity intentionally mid-level — no pixel-perfect styling

### Creating Hi-Fi Screens

1. Start from design system tokens/styles (create them first if they don't exist)
2. Apply real content, not placeholder text
3. Include interactive state variants where relevant
4. Follow spacing scale: 4, 8, 12, 16, 20, 24, 32, 48, 64
5. Validate typography hierarchy and color contrast

## Tech Notes

- **Plugin sandbox**: No `atob`, `Buffer`, `TextDecoder` available — use manual helpers (see `figma-creation.md`)
- **Large operations**: Break into multiple `figma_execute` calls to avoid timeouts (5s default, 30s max)
- **Font loading**: Must call `figma.loadFontAsync()` before setting `fontName`, `fontSize`, or `characters` on text nodes
- **Auto-layout positioning**: When `layoutMode` is set, children ignore `x`/`y` — use `layoutMode = 'NONE'` for free positioning
- **Dynamic page access**: Always use async node getters (`getNodeByIdAsync`, `getLocalPaintStylesAsync`, etc.)
