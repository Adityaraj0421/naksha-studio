---
name: gen-video
description: Generate a shot-by-shot AI video prompt pack — tool selection (Runway, Kling, Sora, Pika, Luma), shot prompt structure, consistency strategy (seeds, style refs), and platform spec checklist.
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
arguments: "<scene description> for <platform> — <duration and style intent>"
---

# /gen-video $ARGUMENTS

You are activating the **AI Visual Gen Wing**: AI Video Director + AI Prompt Engineer.

---

## Process

### 1. Parse the Brief

Extract from `$ARGUMENTS`:
- **Scene:** visual setting, subjects, key action
- **Platform:** Reels/TikTok (9:16), YouTube (16:9), ad (duration drives tool choice), Stories (9:16)
- **Duration:** total video length — determines number of shots and tool selection
- **Style intent:** cinematic, lifestyle, product reveal, documentary, etc.

If platform and duration are unspecified, ask before writing shot prompts. These determine tool selection.

---

### 2. Select the Tool

Using the AI Video Director's tool selection matrix:

| Brief needs... | Tool |
|---------------|------|
| Cinematic camera language, product shots | Runway Gen-3 |
| Longer clips, realistic human motion | Kling |
| Complex scenes, max realism | Sora (if access available) |
| Quick social iteration, style presets | Pika |
| Photo-to-video, orbit/spin shots | Luma Dream Machine |

State selected tool and reasoning.

---

### 3. Define Shot Structure

Break the total duration into shots. Standard rule: 3–8 seconds per shot.

```
Shot 1: [duration]s — [purpose: establishing / product reveal / CTA close]
Shot 2: [duration]s — [purpose]
Shot 3: [duration]s — [purpose]
...
```

---

### 4. Write Shot Prompt Pack

For each shot, write a full prompt using the AI Video Director's anatomy:
```
[scene] [subject motion] [camera motion] [style ref] [duration]s
```

Number each prompt to match the shot structure.

---

### 5. Consistency Notes

Specify:
- **Seed strategy:** seed from shot 1 applied to subsequent shots? Y/N + instructions
- **Style ref:** image reference used across shots? (filename or description)
- **Style token lock:** list the style tokens that must appear in every shot prompt unchanged

---

### 6. Platform Spec Checklist

```
Platform:       [name]
Aspect ratio:   [9:16 / 16:9]
Total duration: [Xs]
Format:         [MP4 H.264 recommended for all platforms]
Frame rate:     [30fps standard; 24fps for cinematic]
Captions:       [required for LinkedIn/YouTube? Y/N]
```

---

## MCP Fallback

Not applicable — video gen happens entirely in external tools. Deliver prompt pack as a markdown file for use in the client's gen tool dashboard.

---

## What's Next

- `/gen-audio [voiceover or music brief]` — add voiceover or background music to this video
- Hand shot prompt pack to **Video Content Producer** via `/video-script` for script and narration alignment
