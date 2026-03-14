# Figma Workflow Reference

Guidance for Figma-to-code workflows, design context extraction, and design handoff using MCP tools.

## Table of Contents
1. [Design Context Extraction](#design-context-extraction)
2. [Figma-to-Code Workflow](#figma-to-code-workflow)
3. [Code Connect](#code-connect)
4. [Adapting Design to Code](#adapting-design-to-code)

---

## Design Context Extraction

### Available Figma MCP Tools

Two Figma MCP servers may be available — the URL-based one (requires fileKey + nodeId) and the desktop one (works with current selection). Check which is available:

**URL-based tools** (require fileKey and nodeId from Figma URLs):
- `get_design_context` — Primary tool. Returns reference code, screenshot, and metadata.
- `get_screenshot` — Screenshot of a specific node
- `get_metadata` — XML structure overview (node IDs, names, positions)
- `get_variable_defs` — Design token variables for a node
- `get_code_connect_map` — Maps nodes to codebase components

**Desktop tools** (work with currently selected node in Figma desktop app):
- Same tools but don't require fileKey/nodeId parameters

### Extracting from URLs

When the user provides a Figma URL like:
```
https://figma.com/design/AbCdEf/MyFile?node-id=123-456
```

Extract:
- **fileKey**: `AbCdEf`
- **nodeId**: `123:456` (convert `-` to `:`)

For branch URLs:
```
https://figma.com/design/AbCdEf/branch/GhIjKl/MyFile
```
Use the branchKey (`GhIjKl`) as the fileKey.

### What get_design_context Returns

The primary tool returns:
1. **Reference code**: HTML/CSS representation of the design (adapt, don't copy verbatim)
2. **Screenshot**: Visual reference for the node
3. **Asset download URLs**: Images, icons referenced in the design
4. **Metadata**: Node structure, names, dimensions

---

## Figma-to-Code Workflow

### Step 1: Get the Design Context

```
Call get_design_context with nodeId and fileKey
```

This gives you the reference code and screenshot. The reference code is a starting point — it represents the design's visual structure but needs adaptation for production use.

### Step 2: Analyze the Design

From the returned data, identify:
- **Layout structure**: Flex/grid, spacing, alignment
- **Typography**: Font families, sizes, weights, line heights
- **Colors**: Background, text, border, and accent colors
- **Components**: Repeating patterns that should be componentized
- **Assets**: Images and icons that need downloading
- **States**: Look for variants that indicate hover, active, disabled states
- **Responsive hints**: Fixed vs. fluid widths, breakpoint patterns

### Step 3: Adapt to Production Code

The reference code from Figma is a guide, not final output. Adapt it:

**DO:**
- Map Figma colors to existing design tokens
- Use existing component patterns from the project
- Apply responsive patterns (Figma designs are usually single-breakpoint)
- Add interaction states (hover, focus, active)
- Use semantic HTML elements
- Apply accessibility attributes

**DON'T:**
- Copy pixel values verbatim (use rem/em, token values)
- Use absolute positioning unless truly needed
- Hard-code widths that should be responsive
- Ignore existing project conventions

### Step 4: Download Assets

The response includes download URLs for referenced assets. Download and save them to the project's asset directory.

### Step 5: Implement and Compare

Build the component, then compare visually:
1. Use the Preview MCP to see your implementation
2. Compare side-by-side with the Figma screenshot
3. Iterate until the implementation matches

---

## Code Connect

Code Connect maps Figma components to codebase components, creating a bridge between design and code.

### Checking Existing Mappings

Use `get_code_connect_map` to see if components are already mapped:
```
{
  "1:2": {
    "codeConnectSrc": "src/components/Button.tsx",
    "codeConnectName": "Button"
  }
}
```

If mappings exist, use the referenced components in your implementation rather than rebuilding from scratch.

### Adding New Mappings

Use `add_code_connect_map` to map a Figma component to its code equivalent:
- **nodeId**: The Figma node ID
- **fileKey**: The Figma file key
- **source**: Path to the component in the codebase
- **componentName**: Name of the component in code
- **label**: Framework label (React, Vue, Svelte, etc.)

### Using get_code_connect_suggestions

For complex designs, use `get_code_connect_suggestions` to get AI-suggested mappings, then review and confirm with `send_code_connect_mappings`.

---

## Adapting Design to Code

### Common Figma-to-CSS Translations

| Figma property | CSS equivalent |
|---------------|---------------|
| Auto Layout (horizontal) | `display: flex; flex-direction: row;` |
| Auto Layout (vertical) | `display: flex; flex-direction: column;` |
| Gap | `gap: Xpx;` |
| Padding | `padding: top right bottom left;` |
| Fill (solid) | `background-color: #hex;` |
| Fill (gradient) | `background: linear-gradient(...)` |
| Stroke | `border: Xpx solid #hex;` |
| Corner radius | `border-radius: Xpx;` |
| Drop shadow | `box-shadow: X Y blur spread #hex;` |
| Blend mode | `mix-blend-mode: mode;` |
| Opacity | `opacity: 0.X;` |
| Clip content | `overflow: hidden;` |

### Figma Variables to CSS Tokens

When `get_variable_defs` returns variables:
```json
{
  "icon/default/secondary": "#949494",
  "spacing/md": "16px",
  "radius/lg": "12px"
}
```

Map to your token system:
```css
--color-icon-secondary: #949494;
--spacing-md: 16px;
--radius-lg: 12px;
```

### Handling Design Ambiguity

Figma designs often leave things implied:
- **Hover states**: If not explicitly designed, darken/lighten 10% for hover
- **Mobile layout**: If only desktop is designed, stack columns and increase padding
- **Loading states**: Add skeleton screens matching the layout shape
- **Error states**: Add inline validation styles near form inputs
- **Focus states**: Add visible focus rings matching the brand color
- **Overflow**: Decide truncation strategy (line-clamp, ellipsis, scroll)

Always clarify with the user if the design intent is ambiguous rather than guessing wrong.

---

## Figma-Native Design Creation

The workflows above cover **extracting designs from Figma → code**. This section covers the reverse: **creating designs directly inside Figma** using the figma-console MCP Desktop Bridge.

### When to Use Figma Creation

- UX design challenges that require Figma deliverables (wireframes, component sets, style sheets)
- Setting up design systems natively in Figma (Paint Styles, Text Styles, Variables)
- Building wireframes or prototypes that stay in Figma for designer collaboration
- Creating component libraries with variants directly in the Figma file
- Any task where the output is a Figma file, not code

### figma-console MCP Tools

The Desktop Bridge provides write access to Figma via WebSocket. Key tool categories:

| Category | Tools | Purpose |
|----------|-------|---------|
| **Connection** | `figma_get_status`, `figma_reconnect` | Verify/establish Bridge connection |
| **Execution** | `figma_execute` | Run arbitrary JS in Figma plugin context |
| **Nodes** | `figma_create_child`, `figma_move_node`, `figma_resize_node`, `figma_delete_node`, `figma_rename_node`, `figma_clone_node` | Manipulate Figma nodes |
| **Fills/Strokes** | `figma_set_fills`, `figma_set_strokes` | Apply colors and borders |
| **Text** | `figma_set_text` | Set text content on text nodes |
| **Components** | `figma_search_components`, `figma_instantiate_component`, `figma_set_instance_properties` | Work with components |
| **Variables** | `figma_setup_design_tokens`, `figma_batch_create_variables`, `figma_batch_update_variables` | Create design tokens |
| **Validation** | `figma_capture_screenshot`, `figma_take_screenshot` | Visual validation |
| **File structure** | `figma_get_file_data`, `figma_get_selection` | Read file/selection state |

### Connection Workflow

1. User opens their Figma file in **Figma Desktop** (not browser)
2. Right-click canvas → Plugins → Development → **Figma Desktop Bridge**
3. Bridge connects via WebSocket (typically port 9223+)
4. Verify: `figma_get_status` → should show `"transport": "websocket"`

### Creating vs Extracting

| Aspect | Extraction (existing) | Creation (new) |
|--------|----------------------|----------------|
| **Direction** | Figma → Code | Code → Figma |
| **Primary tools** | `get_design_context`, `get_screenshot` | `figma_execute`, `figma_create_child` |
| **MCP server** | Figma (URL-based or desktop) | figma-console (Desktop Bridge) |
| **Connection** | REST API (works with just a URL) | WebSocket (requires Desktop Bridge running) |
| **Output** | HTML/CSS/JS files | Figma nodes, styles, components |

### Detailed Reference

See `figma-creation.md` for the complete API reference covering:
- Async API requirements (dynamic-page access)
- Auto-layout frame creation and configuration
- Component set creation with variants
- Paint Style and Text Style creation
- Variable/token creation
- Wireframe and annotation patterns
- Common pitfalls and helper functions

---

## Advanced Patterns

### Component Naming System

A consistent naming system makes components findable, understandable, and maintainable.

**Structure:** `Category/Subcategory/Variant`
- `Button/Primary/Default`
- `Button/Primary/Hover`
- `Form/Input/Error`
- `Navigation/Sidebar/Collapsed`

**Variant properties vs. component names:**
- Use variant properties for: states (default/hover/focus), sizes (sm/md/lg), themes (light/dark)
- Use separate components (or pages) for: structurally different layouts, components that share a name but nothing else
- Rule: if you'd use `if/else` logic in code to switch between them, they're variants. If they're truly different components, name them separately.

**Naming for search discoverability:**
- Use terms developers and designers both use, not internal nicknames
- Don't abbreviate ("btn" not "Button", "nav" not "Navigation") — full words search better
- Use the same terms as your design system documentation

**Deprecated components:**
- Prefix with `_` (e.g., `_Button/Legacy`) — `_` sorts to the bottom and signals "don't use"
- Add a description: "Use Button/Primary instead. Removing in v4."
- Never delete deprecated components mid-sprint — give consumers a cycle to migrate

---

### Auto-Layout Edge Cases

**Hug vs. Fill vs. Fixed — decision guide:**
| Setting | Use when |
|---|---|
| **Hug** | Component should shrink/grow to fit its content (badges, chips, pills) |
| **Fill** | Component should take up all available space in its parent (full-width buttons, input fields) |
| **Fixed** | Size must not change regardless of content (icon containers, avatar frames, fixed-width columns) |

**Nested auto-layout patterns:**
- Row inside column: the most common pattern for card layouts (column = card, row = each content section)
- Spacing modes: "Packed" for grouped items, "Space between" for navigation bars and toolbar items
- When mixing hug and fill: the fill child takes remaining space after hug children claim their natural size

**When auto-layout breaks:**
- Absolute-positioned elements (badges, notification dots): remove from auto-layout flow with "absolute position" and position relative to parent
- Overlapping layers: use negative spacing (gap) to pull layers together, or use absolute positioning
- Clip content + overflow: enable "Clip content" on the parent when children should be hidden outside the frame

---

### Variable & Token Architecture

**Three-tier hierarchy:**
```
Primitive tokens      →    Semantic tokens      →    Component tokens
(brand-blue-500)           (color-action-primary)     (button-bg-default)
     ↑                           ↑                          ↑
What it is               What it means              Where it's used
Never reference directly  Reference in components    Optional — use only for complex components
```

**When to create a new token vs. reuse:**
- New token: it has a distinct semantic meaning that could change independently
- Reuse: it's the same concept, just a different instance of the same usage

**Scope decisions:**
- Local tokens: for one component or feature only
- Published to library: for shared use across the team
- Multi-mode (light/dark): use variable modes, not duplicate variables

**Multi-brand token structure:**
- Primitive layer stays the same
- Semantic layer swaps per brand (brand A: `--color-primary: brand-blue-500`, brand B: `--color-primary: brand-green-600`)
- Component tokens inherit from semantic — they update automatically when brand switches

---

### Large File Organisation

**When to split into multiple files:**
- Team > 4 designers working simultaneously (merge conflicts become costly)
- File performance degrades (thumbnails take >2s to load)
- Logical separation exists: foundations file (tokens, primitives) + components file + product screens file

**Page organisation pattern:**
```
📄 Cover          — file name, version, last updated
📄 Foundations    — color tokens, type styles, spacing
📄 Components     — all components (or split by category for large systems)
📄 Patterns       — multi-component compositions (forms, cards, tables)
📄 Screens        — product flows
📄 Archive        — deprecated, do not use
```

**Layer naming discipline at scale:**
- Name every frame, group, and component instance
- Unnamed layers (`Frame 47`, `Rectangle 12`) make handoff impossible
- Convention: use the content or purpose as the name ("Hero section", "Pricing card — Pro tier")

---

### Branching Strategy

**Use branches for:**
- Significant redesigns that affect multiple components (would break others if merged mid-work)
- Client review (branch isolates in-review work from production designs)
- Experimental explorations (not sure it'll ship — don't pollute main)

**Don't branch for:**
- Quick fixes and corrections (just update main directly)
- Small additions that don't affect existing components

**Branch naming convention:** `[type]/[descriptor]`
- `feature/onboarding-redesign`
- `review/client-v2-feedback`
- `experiment/dark-mode-exploration`

**Review workflow before merging:**
1. Request review from at least one other designer
2. Document what changed (short description in the branch description)
3. Reviewer checks: are existing component usages still correct? Any unintended side effects?
4. Merge + archive the branch (don't delete — keep for reference)

---

## Full Coverage

### Component Audit Methodology

How to audit an existing library systematically:

**1. Inventory** — What exists?
- List every component by name
- Note which page/file it lives in

**2. Usage** — What's actually used?
- Search for instances in product screens: Figma's "Select all instances" feature
- Components with 0 instances in product screens = potentially unused (confirm before deleting)
- Components with 50+ instances = high-impact, treat with care

**3. Quality** — Does it meet current standards?
- Check: auto-layout implemented correctly?
- Check: all required states present?
- Check: tokens applied (not hardcoded values)?
- Check: accessibility properties set (role, label)?

**4. Gap** — What's missing?
- Compare component list against design patterns used in product screens
- Patterns used repeatedly without a component = candidates for extraction

**5. Debt** — What needs fixing?
- Prioritise by: usage count × severity of issue
- High usage + broken token → fix now
- Low usage + missing state → backlog

---

### Design Token Migration

Migrating from hardcoded values to tokens — how to do it without breaking everything:

**Migrate in this order:**
1. **Color first** — highest visual impact, easiest to audit with grep/find
2. **Spacing second** — high frequency, enables density variants later
3. **Typography third** — text styles, not just font size
4. **Elevation/shadow last** — most contextual, most risk of breaking visual hierarchy

**The "find all" workflow:**
1. Use Figma's "Select all with same fill" to find all instances of a hardcoded color
2. Replace with the appropriate token
3. Verify visually (no style should visibly change — only the reference changes)

**Validating completeness:**
- After migration: use Figma plugin "Token Inspector" or "Design Lint" to find remaining hardcoded values
- Target: zero hardcoded color values in published components

---

### Team Library Governance

**Who can publish changes:**
- Designate 1–2 "library owners" per component category
- Changes from contributors need review before publishing
- Breaking changes (rename, remove, restructure) need a migration guide

**Review process for component changes:**
1. Branch: make the change on a branch
2. Notify: post in team channel with screenshot of before/after
3. Review period: 48h for small changes, 1 week for breaking changes
4. Merge: library owner approves and publishes

**Versioning and deprecation communication:**
- Use Figma's component description field: "Deprecated in v4. Use [NewComponent] instead."
- Announce deprecations in Slack/team channel with migration timeline
- Never remove a component without a replacement and at least 2-week notice

**Breaking changes (rename/restructure):**
- Document before/after mapping: "Button/Solid → Button/Primary"
- Provide a migration session or document
- Keep the old version live in `Archive` page for 1 sprint after migration
