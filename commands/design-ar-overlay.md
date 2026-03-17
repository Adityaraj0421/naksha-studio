---
description: "Design an AR overlay interface — anchor strategy, world tracking UI, scan states, confirmation overlays, and occlusion handling."
argument-hint: "[use case: navigation|instructions|product-viz|social] [platform: arkit|webxr|snap|meta]"
allowed-tools: ["Read", "Write", "mcp__*"]
---

# /design-ar-overlay

You are designing a complete AR overlay interface spec. Your output is a single structured document covering anchor strategy, world tracking UI, instruction card patterns, scan state designs, confirmation overlays, and occlusion handling — all calibrated to the parsed use case and platform.

## Input

Arguments: **$ARGUMENTS**

Parse the following from `$ARGUMENTS`:
- **Use case**: navigation / instructions / product visualization / social (default: instructions)
- **Platform**: ARKit / WebXR / Snap / Meta (default: ARKit)

---

## Step 1: Load Knowledge Base

Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/spatial-designer.md` to apply the full Spatial Designer knowledge base to every section below.

**MCP Fallback**: If the file cannot be read, proceed using inline knowledge. The inline knowledge for this command covers: spatial anchoring types (world-locked: fixed in physical space; image-tracked: tied to a recognized image marker; surface-detected: placed on detected plane; face-tracked: follows detected face); AR session requirements from W3C WebXR spec (hit-test is a separate capability module — design graceful fallbacks for devices without it); distance-size formula for AR typography (recommended_size = 44pt × distance_m; minimum 18pt at 0.5m); minimum interactive targets (44×44pt at all distances); comfort rules (no automatic camera movement, stable horizon, vignette during transitions); occlusion depth ordering (real-world objects can occlude or be occluded by AR elements depending on depth buffer rendering order); edge indicators for off-screen AR objects (directional arrow at visible cone edge); confirmation overlays anchored above AR object at 1m distance.

---

## Step 2: Generate the Spec

Produce all six sections below as a single continuous output. Do not pause or ask for confirmation between sections.

---

### Section 1: Anchor Strategy

Select the appropriate anchor type for the parsed use case and platform. Specify persistence and recovery behavior.

**Anchor type reference:**

| Anchor Type | Behavior | Best For |
|-------------|----------|----------|
| **World-locked** | Fixed in physical space relative to detected surfaces or spatial origin | Navigation waypoints, persistent spatial annotations, furniture placement |
| **Image-tracked** | Tied to a recognized image marker (product packaging, QR code, poster) | Product visualization, instructions on physical products, marketing activations |
| **Surface-detected** | Placed on a detected horizontal or vertical plane | Object placement, surface-anchored instructions, measurement tools |
| **Face-tracked** | Follows the detected face position and orientation | Social filters, avatar overlays, face-specific instructions |

**For the parsed use case, specify:**

- **Anchor type**: [Select the most appropriate type from the table above, with rationale]
- **Platform capability note**: For WebXR — hit-test is a separate capability module from basic `immersive-ar` session establishment. Design graceful fallback for devices that support `immersive-ar` but not `hit-test`. For ARKit — use `ARWorldTrackingConfiguration` for world/surface anchors; `ARImageTrackingConfiguration` for image targets.
- **Persistence**: Session-only (anchor lost when app closes) vs. persistent across app launches (requires ARKit persistent world map or equivalent). Specify which is appropriate and why.
- **Recovery behavior when tracking is lost**: Define what the UI shows and what the app does when the anchor is lost mid-session (see Section 2 for tracking UI states).

---

### Section 2: World Tracking UI

Three tracking states with complete UI spec for each. These states apply to the initial surface/object detection phase and to any mid-session tracking loss.

#### State 1: Searching

The device is actively scanning for the target surface, image, or anchor point.

| Element | Spec |
|---------|------|
| **Visual treatment** | Animated scan ring: circular ring, 120px diameter, 2px stroke, primary accent color, rotating 360° at 1.5s per revolution |
| **Instructional text** | [Derive from use case: e.g., navigation → "Point your camera at the floor to begin"; instructions → "Move your phone to scan the surface"; product-viz → "Point your camera at the product"; social → "Center your face in the frame"] |
| **Text spec** | 18pt minimum (per distance-size guidelines at ~0.5m arm's length reading distance); Medium weight (500); centered below scan ring; max 2 lines |
| **Haptic pattern** | Continuous light pulse (CHHapticPattern: transient, 0.3 intensity, 0.5s interval) — communicates active scanning without demanding attention |
| **Background treatment** | Dim non-target areas with 30% dark vignette overlay to guide focus toward scan ring |

#### State 2: Tracking Acquired

The anchor has been successfully established.

| Element | Spec |
|---------|------|
| **Visual treatment** | Success animation: scan ring completes to solid circle, 200ms ease-out scale from 100% → 120% → 100%; color transitions to success green (#34C759 for iOS; equivalent success color for other platforms) |
| **Confidence indicator** | Brief pulse on the anchor point (subtle glow, 1.5s duration) confirming tracking lock |
| **Confirmation copy** | "Found" label, 16pt, appears below animation for 1.2s then fades; or use platform-native success haptic (UINotificationFeedbackGenerator .success / equivalent) |
| **Transition** | Fade scan ring out over 0.3s; immediately surface AR content layer |
| **Haptic** | Single success impact (medium weight) on acquisition |

#### State 3: Tracking Lost

The anchor has been lost mid-session — due to low light, occluded target, or device movement.

| Element | Spec |
|---------|------|
| **Visual treatment** | Warning indicator: amber ring (⚠ color #FF9500) replaces anchor point; pulsing opacity 1.0 → 0.5 at 1s cycle |
| **AR content treatment** | Freeze AR content in last known position; reduce opacity to 50% — communicates degraded state without hiding content entirely |
| **Recovery instructions** | Toast-style banner (top of screen): "Tracking lost — [use-case-specific instruction: e.g., 'Point at the surface again' / 'Show the product to the camera']"; auto-dismiss after 4s if tracking is recovered |
| **Haptic** | Single warning impact on tracking loss event; no repeated haptics during sustained lost state |
| **Recovery flow** | Automatically return to Searching state UI if tracking is not recovered within 3s; do not require user to manually restart |

---

### Section 3: Instruction Card Patterns

Floating instruction cards anchored near tracked objects. These deliver step-by-step guidance in AR without requiring the user to look away from the physical task.

**Positioning rule:**
- Position card above the tracked object, 30–50° above eye level — close enough to relate to the object, high enough to avoid obscuring the work area
- At arm's length (~0.5m), the card should subtly float above the real-world object rather than sitting on it
- For objects on surfaces (table, floor), position cards at eye level or slightly above — never below the surface plane

**Card spec:**

| Property | Value |
|----------|-------|
| **Width** | Maximum 280px at arm's length (0.5m). Scale proportionally per distance-size formula if AR depth varies. |
| **Background** | Frosted glass / semi-transparent dark (#1A1A1Acc at 80% opacity) — avoids pure black which reads as an opaque hole in AR |
| **Corner radius** | 16px |
| **Typography** | Minimum 18pt at 0.5m (per distance-size guidelines: 44pt × 0.5 = 22pt recommended; 18pt minimum). SF Pro or system-ui. Medium weight (500). |
| **Line height** | 1.5× minimum — standard 1.2–1.3× is too tight when text floats against complex real-world backgrounds |
| **Step indicator** | Step N of N — top left of card; 13pt, muted color |
| **Primary text** | Instruction copy — max 2 lines at the minimum font size |
| **Pointer line** | Optional tether line from card bottom to anchor point — thin 1px line, 50% opacity; use only when card position makes the anchor relationship ambiguous |

**Dismissal behavior:**
- Tap to dismiss immediately
- Auto-dismiss after 8 seconds on repeat sessions (user has seen this instruction before — infer from session data or a `hasSeenInstruction` flag)
- On first session: require explicit tap to dismiss — do not auto-dismiss instructional content the user may need to reference

---

### Section 4: Scan State Designs

Complete visual, copy, haptic, and audio spec for each scan state. These states apply to the scanning phase (Section 2: Searching) and to any partial or error conditions.

| State | Ring Color + Animation | Instructional Copy | Haptic Feedback | Audio Cue (optional) |
|-------|----------------------|--------------------|-----------------|---------------------|
| **Searching** | Accent color, rotating 360° at 1.5s/rev | [Derive from use case — see Section 2 State 1] | Continuous light pulse, 0.3 intensity, 0.5s interval | Subtle scan tone, 440Hz, 100ms, 0.2 volume — loop every 1.5s if audio is enabled |
| **Partial** | Amber (#FF9500), arc fill progresses clockwise to reflect detected coverage (e.g., 60% arc = 60% of surface mapped) | "Keep moving slowly — almost there" | Single light tap when partial threshold crossed (>50% detection) | Tone pitch rises slightly — 440Hz → 520Hz — as detection percentage increases |
| **Found** | Success green (#34C759), ring completes to filled circle, scale 100% → 120% → 100% in 200ms | "Ready" (brief, then fade) | Single medium success impact | Short ascending two-note tone (523Hz + 659Hz, 80ms each) |
| **Error** | Error red (#FF3B30), ring pulses rapidly (3 pulses in 0.5s then holds solid) | [Derive error cause: "Too dark — move to a brighter area" / "Surface not found — try a flat surface" / "Target not recognized — check the object"] | Three rapid light taps (error pattern) | Low descending tone (330Hz, 150ms) — use only if audio is enabled |

**Error recovery:** Every error state must show a specific, actionable instruction — never display a generic "Error" message. Always provide a next step.

---

### Section 5: Confirmation Overlays

For actions triggered through AR interaction (object placement, purchase, data submission, irreversible operations), a confirmation overlay must be shown before execution.

**Overlay positioning:**
- Anchor confirmation overlay above the AR object at approximately 1m distance from the user
- If the object is not currently in frame, display the overlay as a centered modal (flat, 2D) — do not require the user to find the object to confirm

**Overlay spec:**

| Property | Value |
|----------|-------|
| **Background** | Frosted glass / semi-transparent (#1A1A1Acc at 85% opacity); avoid opaque — preserves AR spatial context |
| **Width** | Max 320px; horizontally centered above anchor |
| **Corner radius** | 20px |
| **Action label** | Clear, specific description of what will happen: "Place sofa here?" / "Start navigation to this location?" / "Order this item?" — not a generic "Confirm" |
| **Confirm button** | Primary action; minimum 44×44pt tap target; brand primary color; full-width or fixed 200px wide |
| **Cancel / Dismiss** | Secondary action below confirm button; minimum 44×44pt; muted style (text link or outlined button); labeled "Cancel" — not "No" or "X" |
| **Destructive actions** | If the action is irreversible (delete, purchase, send): use destructive red for the confirm button; add explicit consequence text ("This cannot be undone") below the action label |
| **Dismiss behavior** | Tap outside overlay: dismiss (unless destructive action — require explicit cancel tap for destructive). Tap back/escape: dismiss. Auto-dismiss: never for confirmation overlays. |

---

### Section 6: Occlusion Handling

Define depth ordering between AR overlays and real-world content, edge-of-frame behavior, and z-fighting prevention.

**Depth ordering — which occludes which:**

| Scenario | Occlusion Rule | Rationale |
|----------|---------------|-----------|
| **AR object placed on surface** | Real-world objects in front of the AR object should occlude it (forward object hides backward object) | Reinforces physical presence — a real cup in front of a virtual vase should hide the vase |
| **AR instruction cards and labels** | Cards occlude real-world background; are occluded by real-world objects explicitly in front of them | Cards are read by the user, so they must be legible — but a hand reaching past the card should naturally overlap it |
| **AR navigation waypoints** | Always render on top (no real-world occlusion) | Navigation must be visible regardless of scene content; occlusion defeats the purpose |
| **Confirmation overlays (Section 5)** | Always render on top; never occluded | Safety-critical interaction — must be fully visible |

**Handling UI when target object is partially out of frame:**
- When the tracked anchor object moves out of the camera's visible cone, replace the full AR overlay with an **edge indicator**: a small directional arrow at the edge of the screen, pointing toward the off-screen object's world-space position
- Edge indicator spec: 24×24pt arrow icon; brand accent color; 80% opacity; positioned 16pt inside the screen edge; labeled with the object's name or a short descriptor (max 15 characters) in 13pt below the arrow
- If the object is far out of frame (>90° from camera direction), show distance in meters next to the arrow: "2.4m →"

**Z-fighting prevention for UI anchored to tracked surfaces:**
- Apply a small positive depth offset to all UI elements anchored to detected planes or image targets — render them at `surface_depth - 0.002m` (2mm in front of the tracked surface)
- For WebXR: set `depthWrite: false` on overlay mesh materials and use `renderOrder` to enforce consistent layering without depth buffer conflicts
- For ARKit: use `SCNNode` `renderingOrder` property to guarantee UI renders after surface geometry
- Test z-fighting under slow lateral camera movement — fighting is most visible during panning, not static viewing

---

## MCP Fallback

If `${CLAUDE_PLUGIN_ROOT}/skills/design/references/spatial-designer.md` could not be read in Step 1, note at the top of the output: "Generated using inline AR design knowledge — knowledge base file unavailable." All sections above are still generated in full using the inline knowledge documented in Step 1.

---

## What's Next

After generating this AR overlay spec, consider these follow-up commands:

- `/design-spatial` — design the full spatial layout that this AR overlay layer sits within (depth hierarchy, window type, spatial typography, interaction model for visionOS or WebXR)
- `/accessibility-audit` — audit this AR overlay spec against WCAG 2.1 AA, ARKit accessibility guidelines, and the spatial distance-size compliance checklist
- `/design-framework` — build the AR overlay components defined in this spec as a coded framework (SwiftUI + RealityKit for ARKit, Three.js/Babylon.js for WebXR)
