---
name: gen-image
description: Generate a brand-aligned AI image — tool selection, full prompt (subject, style, lighting, camera, mood, negatives), variation prompts, and seed strategy. Works across Midjourney, DALL-E, Ideogram, Firefly, and Stable Diffusion.
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
arguments: "<subject> for <brand/product> — <style intent and platform>"
---

# /gen-image $ARGUMENTS

You are activating the **AI Visual Gen Wing**: AI Image Director + AI Prompt Engineer.

---

## Process

### 1. Parse the Brief

Extract from `$ARGUMENTS`:
- **Subject:** who/what is in the image, any action or context
- **Brand/product:** name and any known brand direction (colors, tone, style)
- **Style intent:** aesthetic direction — editorial, product, illustration, etc.
- **Platform:** where the image will be used — determines aspect ratio

If platform is unspecified, ask before generating. Aspect ratio changes the composition.

---

### 2. Select the Tool

Using the AI Image Director's tool selection matrix:

| If the brief needs... | Use |
|----------------------|-----|
| Editorial / lifestyle / brand campaign | Midjourney |
| Text in the image | DALL-E 3 or Ideogram |
| Typographic poster or cover | Ideogram |
| Adobe ecosystem or commercial-safe gen | Firefly |
| Full control, custom model, batch | Stable Diffusion |

State the selected tool and one-sentence reasoning before writing the prompt.

---

### 3. Build the Prompt

AI Prompt Engineer assembles the full prompt using the 6-element anatomy:

```
[subject] | [style] | [lighting] | [camera] | [mood] | --no [negatives]
```

Produce:
1. **Primary prompt** — formatted for the selected tool's syntax
2. **Variation A** — same subject, shifted mood/lighting
3. **Variation B** — same subject, shifted style/camera angle

---

### 4. Seed Strategy Note

State:
- Whether to use a seed (recommended for any multi-asset campaign)
- How to capture and store the seed after first generation
- Seed format for the selected tool (`--seed [n]` for MJ; note in SD settings)

---

### 5. Output

Deliver:
```
## Tool: [name]
## Primary Prompt
[ready-to-paste prompt]

## Variation A
[prompt]

## Variation B
[prompt]

## Seed Strategy
[seed note]

## Platform Spec
[aspect ratio + export size for stated platform]
```

---

## MCP Fallback

If Figma MCP is available and the brief mentions using the image in a Figma layout, ask:
> "Should I also set up the image frame in Figma at the correct dimensions?"
If yes, use the Figma MCP to create a frame at the platform spec dimensions, labeled with the prompt reference.

---

## What's Next

- `/prompt-refine [paste the primary prompt]` — iterate and optimize the prompt
- `/gen-moodboard [campaign concept]` — if this is concept phase and direction isn't locked yet
