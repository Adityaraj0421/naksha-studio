---
description: "Design a spatial computing interface for visionOS, Vision Pro, or WebXR — depth hierarchy, window type, ornament placement, spatial typography, and interaction model."
argument-hint: "[app type: productivity|media|utility|game] [platform: visionos|webxr] [brief]"
allowed-tools: ["Read", "Write", "mcp__*"]
---

# /design-spatial

You are designing a complete spatial computing interface spec. Your output is a single structured document covering window type selection, depth hierarchy, ornament placement, spatial typography, and interaction model — all calibrated to the parsed app type, platform, and brief.

## Input

Arguments: **$ARGUMENTS**

Parse the following from `$ARGUMENTS`:
- **App type**: productivity / media / utility / game (default: productivity)
- **Platform**: visionOS / WebXR (default: visionOS)
- **Brief**: any description of the app's purpose, primary task, or audience

---

## Step 1: Load Knowledge Base

Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/spatial-designer.md` to apply the full Spatial Designer knowledge base to every section below.

**MCP Fallback**: If the file cannot be read, proceed using inline knowledge. The inline knowledge for this command covers: visionOS window types (Window 2D for productivity, Volume for 3D objects, Immersive Space Full/Mixed for experiences); depth layers (Background 2–4m, Content 1–2m, Foreground 0.5–1m, Overlay <0.5m); ornament system (attachmentAnchor positioning, narrower than window, max 1 bar per edge); spatial typography (distance-size formula: recommended = 44pt × distance_m; SF Pro for visionOS, system-ui for WebXR; minimum weight Regular 400); gaze+pinch primary input for visionOS with 44pt minimum targets; vestibular comfort rules (no automatic locomotion, fade transitions 0.3s, stable horizon, no oscillating motion); eye strain prevention (no pure white backgrounds, WCAG AA minimum, rest areas in layout); dynamic type capped at .accessibility2 for body, .accessibility3 for display.

---

## Step 2: Generate the Spec

Produce all five sections below as a single continuous output. Do not pause or ask for confirmation between sections.

---

### Section 1: Window Type Selection

Based on the parsed app type and brief, recommend the primary window type from the visionOS or WebXR model.

For **visionOS**, select from:

| Type | Use Case |
|------|----------|
| Window (2D) | Productivity, content browsing, flat UI — default for most apps |
| Volume | 3D objects, data models, physical simulations — when 3D nature is the point |
| Immersive Space (Full) | Total immersive experiences, games, virtual tours |
| Immersive Space (Mixed) | AR overlay on real objects, spatial annotations, instruction apps |

For **WebXR**, select the session type:

| Type | Use Case |
|------|----------|
| `inline` | 3D in browser window — always-available baseline; design must work fully here |
| `immersive-vr` | Full VR takeover; requires headset |
| `immersive-ar` | Mixed reality via camera passthrough; requires AR-capable device |

Provide one rationale sentence explaining why this window type fits the parsed brief.

For **multi-surface apps** (apps that need more than one window type): specify the primary type and list companion types with their roles (e.g., primary: Window 2D for task surface; companion: Volume for 3D data preview).

---

### Section 2: Depth Hierarchy Document

Produce a 4-layer spec table assigning content to each physical depth zone. Apply the distance-size formula where sizing is specified: `recommended_size = 44pt × distance_m`.

| Layer | Distance Range | Semantic Role | Element Types | Sizing Constraint | Interaction Method |
|-------|---------------|---------------|---------------|-------------------|--------------------|
| **Background** | 2–4m | Ambient context, world-locked persistent info | Environment cues, ambient data, decorative world elements | No fine interactive targets at this range — targeting accuracy degrades beyond 3m | Passive / gaze attention only |
| **Content** | 1–2m | Primary UI, main task surface | [Derive from brief: primary panels, task interfaces, main content] | Recommended: 44–88pt (44pt × 1–2m); minimum: 36–70pt | Gaze + pinch (visionOS); controller ray-cast or hand tracking (WebXR) |
| **Foreground** | 0.5–1m | Active selections, quick actions, notifications | [Derive from brief: toolbars, active state panels, notifications] | Recommended: 22–44pt (44pt × 0.5–1m); minimum: 20–36pt; tap targets ≥44pt | Direct manipulation within arm's reach; gaze + pinch for visionOS |
| **Overlay** | <0.5m | Modals, critical alerts, focus-required interactions | Confirmation dialogs, error states, critical prompts only | Use sparingly — content this close triggers eye convergence strain if sustained | Explicit confirmation required before dismissal |

For each layer, note any app-specific elements derived from the parsed brief.

**Layer assignment rules to apply:**
- Content Layer is where users spend most time — optimize for density and legibility here
- Never place critical interactive controls in the Background Layer
- Notifications always go in the Foreground Layer
- Overlay Layer should be used sparingly; sustained near-field content causes convergence strain

---

### Section 3: Ornament Placement Spec

Specify ornaments for each relevant window edge. Ornaments extend the window's interactive surface without cluttering the primary content area.

**Ornament rules:**
- Width must be narrower than the host window width
- Position via `attachmentAnchor` parameter of the `ornament()` modifier — do not use fixed point offsets, which vary by window size
- The system automatically places ornaments slightly in front of the window plane — do not specify a fixed Z depth offset
- Maximum 1 ornament bar per window edge
- Primary actions belong inside the window; ornaments are for secondary controls

| Window Edge | Ornament Type | Content | Width Constraint | Attachment Anchor |
|-------------|---------------|---------|------------------|-------------------|
| **Bottom** | [Contextual toolbar / quick-action bar — derive from brief] | [Primary secondary actions for the app type: e.g., format controls for productivity, playback controls for media] | Narrower than window width; do not span full window | `.bottom` scene-relative anchor |
| **Left / Right** | [Inspector panel / minimap / supplementary panel — derive from brief] | [Context-dependent secondary information: e.g., properties panel, navigation tree] | Narrower than window height; match content density | `.leading` / `.trailing` scene-relative anchor |

Specify which ornament edges are relevant for the parsed app type and which edges should remain clear.

---

### Section 4: Spatial Typography Scale

Derive the full typography scale from the distance-size table in the knowledge base. Apply the formula `recommended_size = 44pt × distance_m` to each depth layer.

**Font choice:**
- visionOS: SF Pro (system font, optimized for Vision Pro rendering pipeline). Use semantic styles (`font(.body)`, `font(.headline)`) — never hardcode fixed `font(.system(size:))` values.
- WebXR: `system-ui, -apple-system, sans-serif`. Avoid thin weights (Light 300, Thin 100) — minimum Regular (400), prefer Medium (500) for body text in AR contexts.

**Typography scale by depth layer:**

| Layer | Distance | Display / Header | Body Text | Caption / Label | Line Height | Tracking |
|-------|----------|-----------------|-----------|-----------------|-------------|---------|
| Background | 2–4m | 88–132pt recommended | 70–88pt recommended | 60–70pt minimum | 1.5× minimum | 0.01–0.02em |
| Content | 1–2m | 44–88pt recommended | 36–44pt recommended | 32–36pt minimum | 1.5× minimum | 0.01–0.02em |
| Foreground | 0.5–1m | 22–44pt recommended | 20–24pt recommended | 18–20pt minimum | 1.5× minimum | 0.01–0.02em |
| Overlay | <0.5m | Use Content layer sizes — do not go below 20pt | 20–24pt | 18pt minimum | 1.5× minimum | 0.01em |

**Dynamic Type cap recommendations (visionOS):**
- Body text, UI labels: cap at `.accessibility2` — covers the large majority of accessibility needs without compounding destructively with depth scaling
- Display headlines: can tolerate `.accessibility3` where containers can accommodate growth
- Dense data labels: cap at `.xLarge` to prevent container overflow at depth

**Prohibited in spatial typography:**
- Avoid decorative, script, or serif fonts at body sizes — fine strokes render poorly against complex real-world backgrounds
- Avoid pure white (#FFFFFF) large text blocks against dark backgrounds — sustained high contrast causes eye strain; target WCAG AA (4.5:1) minimum, avoid exceeding 15:1 for large text areas
- Avoid standard 1.2–1.3× line-height used for 2D screens — too tight when text floats against complex backgrounds

---

### Section 5: Interaction Model

Define the primary input method and comfort guidelines for the parsed platform.

**Primary input method:**

For **visionOS**: Gaze + pinch (look-and-pinch model).
- User looks at the target to aim; index–thumb pinch confirms selection
- Gaze cursor: subtle dot, 8–12pt rendered size, high contrast against target
- Hover state required on all interactive elements: subtle scale (1.0 → 1.03), brightness increase, or outline appearance — confirms system has registered attention
- Avoid gaze as sole confirmation — always require a secondary action (pinch, dwell, voice)
- Dwell time for dwell-only targets: 600–800ms (below 600ms: accidental activations; above 800ms: feels sluggish)

For **WebXR**: Progressive input fallback chain — feature-detect, never assume:
1. Hand tracking (highest fidelity)
2. Controller tracking (ray-cast from extended index finger or stable wrist anchor)
3. Gaze + dwell (600–800ms dwell threshold)
4. Mouse / pointer (desktop `inline` fallback)
5. Touch (mobile `inline` fallback)

Every interactive element must be reachable via all relevant input methods for the target platform, or explicitly scoped with graceful degradation messaging.

**Minimum dwell target sizing:**
- Minimum interactive target at Content Layer (1m): 44×44pt (Apple HIG minimum); preferred for spatial: 60×60pt
- Scale targets with distance using the formula: `target_pt = 44pt × distance_m` for the dwell point distance
- Minimum spacing between targets: 8pt to prevent accidental adjacent activation

**Comfort guidelines checklist — 5 key items (from spatial design knowledge base):**

- [ ] **No automatic locomotion** — Never move the camera without explicit user intent. Camera drift, fly-throughs, or unsolicited zoom will cause vestibular discomfort in a significant portion of users.
- [ ] **Stable horizon** — Never rotate the virtual horizon. World-locked elements must remain gravitationally aligned. A tilted virtual horizon immediately causes disorientation.
- [ ] **Primary interaction zone** — Keep all primary interactions within 0.5–1.5m in front of the user, ±45° horizontal, ±20° vertical from eye level. This is the physical comfort sweet spot.
- [ ] **No sustained gorilla arm** — Primary interactions must be comfortable at a relaxed arm angle. No sustained above-shoulder or extended-arm interaction required for core tasks.
- [ ] **Session length guidance** — For tasks expected to exceed 15 minutes, surface a periodic rest prompt. Surface a gentle reminder after 20–30 minutes of continuous use. This is a health feature.

---

## MCP Fallback

If `${CLAUDE_PLUGIN_ROOT}/skills/design/references/spatial-designer.md` could not be read in Step 1, note at the top of the output: "Generated using inline spatial design knowledge — knowledge base file unavailable." All sections above are still generated in full using the inline knowledge documented in Step 1.

---

## What's Next

After generating this spatial interface spec, consider these follow-up commands:

- `/design-ar-overlay` — design an AR overlay layer on top of this spatial layout (anchor strategy, world tracking UI, scan states, confirmation overlays, occlusion handling)
- `/design-framework` — build the component library defined in this spec as a coded UI framework (SwiftUI for visionOS, Three.js/Babylon.js for WebXR)
- `/accessibility-audit` — audit this spatial spec against WCAG 2.1 AA, visionOS accessibility guidelines, and the Dynamic Type compliance checklist
