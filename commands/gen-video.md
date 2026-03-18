---
name: gen-video
description: "Generate video output in one of three modes: Remotion (programmatic React-based video), Gen-AI (shot prompt pack for Runway/Kling/Sora/Pika/Luma), or Remotion+Gen-AI (programmatic scaffold with AI footage embedded)."
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
arguments: "<scene/concept description> for <platform> — <duration and style intent>"
---

# /gen-video $ARGUMENTS

You are activating the **AI Visual Gen Wing**: AI Video Director + AI Prompt Engineer.

---

## Process

### 1. Parse the Brief

Extract from `$ARGUMENTS`:
- **Concept:** what the video communicates — scene, message, product, or data story
- **Platform:** Reels/TikTok (9:16), YouTube (16:9), ad, Stories (9:16)
- **Duration:** total video length
- **Style intent:** cinematic, motion graphic, data viz, lifestyle, product reveal, documentary, branded template, etc.

If platform and duration are unspecified, ask before proceeding. These determine mode and tool selection.

---

### 2. Select Video Mode

Determine which production mode fits the brief:

| Mode | When to use | Output |
|------|-------------|--------|
| **Remotion** | Motion graphics, text reveals, animated charts/data viz, branded countdown timers, logo animations, kinetic typography — no real footage needed | Remotion project scaffold (`.tsx` scenes) |
| **Gen-AI** | Real-world scenes, people, lifestyle footage, product in environment, cinematic shots — footage realism is required | Shot prompt pack (markdown) for external tool |
| **Remotion + Gen-AI** | Programmatic template/structure + AI footage slots — e.g., branded reel with AI product shots embedded, data story with cinematic B-roll, social ad with animated headline over AI background video | Both: Remotion scaffold with `<Video>` placeholders + Gen-AI prompt pack |

State the chosen mode and a one-sentence reason.

**Mode signals:**
- "animation", "motion graphic", "chart", "data", "kinetic", "reveal", "timer", "loop", "template" → Remotion
- "cinematic", "lifestyle", "people", "scene", "product shot", "realistic" → Gen-AI
- "branded + footage", "AI clips inside template", "animated overlay on video" → Remotion + Gen-AI

---

### 3. Define Shot / Scene Structure

Break the total duration into scenes (Remotion) or shots (Gen-AI). Standard rule: 3–8 seconds per unit.

```
Scene/Shot 1: [duration]s — [purpose: establishing / reveal / CTA]
Scene/Shot 2: [duration]s — [purpose]
...
```

---

### 4A. Remotion Output (if mode is Remotion or Remotion+Gen-AI)

Generate a Remotion project scaffold:

**File structure:**
```
remotion/
  src/
    compositions/
      VideoName.tsx     ← root Composition with durationInFrames, fps, width, height
    scenes/
      Scene01.tsx       ← individual scene component
      Scene02.tsx
    Root.tsx            ← registerRoot()
  package.json          ← remotion, react, typescript deps
  remotion.config.ts    ← config file
```

**Each scene component:**
- Uses `useCurrentFrame()` + `interpolate()` / `spring()` for animations
- `AbsoluteFill` for full-canvas positioning
- `Sequence` for timing control
- Easing: `Easing.bezier` for smooth motion; `spring({ frame, fps, config: { damping: 200 } })` for snappy reveals
- Typography: absolute font sizes matching platform canvas (not viewport units)
- For **Remotion + Gen-AI** mode: place `<Video src={props.clipPath} />` components as placeholders where AI footage will be dropped in, with `style={{ width: '100%', height: '100%', objectFit: 'cover' }}`

**Platform canvas settings:**
```
Reels/TikTok/Stories: width: 1080, height: 1920, fps: 30
YouTube:              width: 1920, height: 1080, fps: 30 (or 24 for cinematic)
Square social:        width: 1080, height: 1080, fps: 30
```

Write all files using the Write tool.

---

### 4B. Gen-AI Shot Prompt Pack (if mode is Gen-AI or Remotion+Gen-AI)

Select the AI video tool:

| Brief needs... | Tool |
|---------------|------|
| Cinematic camera language, product shots | Runway Gen-3 |
| Longer clips, realistic human motion | Kling |
| Complex scenes, max realism | Sora (if access available) |
| Quick social iteration, style presets | Pika |
| Photo-to-video, orbit/spin shots | Luma Dream Machine |

For each shot, write a full prompt using the AI Video Director's anatomy:
```
[scene] [subject motion] [camera motion] [style ref] [duration]s
```

Number each prompt to match the shot structure from Step 3.

**Consistency notes:**
- **Seed strategy:** seed from shot 1 applied to subsequent shots? Y/N + instructions
- **Style ref:** image reference used across shots? (filename or description)
- **Style token lock:** list style tokens that must appear in every shot prompt unchanged

For **Remotion + Gen-AI** mode: map each shot prompt to its `<Video>` placeholder slot in the scaffold (e.g., "Scene02.tsx → Shot 2 prompt").

---

### 5. Platform Spec Checklist

```
Platform:       [name]
Mode:           [Remotion / Gen-AI / Remotion+Gen-AI]
Aspect ratio:   [9:16 / 16:9 / 1:1]
Total duration: [Xs]
Format:         [MP4 H.264 for delivery; Remotion renders via npx remotion render]
Frame rate:     [30fps standard; 24fps for cinematic]
Captions:       [required for LinkedIn/YouTube? Y/N]
```

---

## MCP Fallback

Gen-AI prompt pack is always text-only — no MCP needed. Remotion scaffold is written to disk via Write tool — no MCP needed.

---

## What's Next

- `/gen-audio [voiceover or music brief]` — add voiceover or background music to this video
- `/video-script` — hand to Video Content Producer for script and narration alignment
- For Remotion: run `npx remotion preview` to see live preview, `npx remotion render` to export MP4
