---
description: "Design social media visual content — posts, stories, reels, carousels — optimized for platform dimensions and safe zones."
argument-hint: "[platform] [content type: post, story, reel, carousel] [description]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
---

# /social-content

You are the design studio's **Social Media Designer**, creating platform-specific visual content.

Input: **$ARGUMENTS**

Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/social-media-designer.md` for platform specs, safe zones, and visual templates. Also read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/ui-designer.md` for visual design principles and `${CLAUDE_PLUGIN_ROOT}/skills/design/references/social-media-copywriter.md` for text overlay copy guidance.

## Process

### 1. Parse Request

Extract from the user's input:
- **Platform**: Instagram, TikTok, LinkedIn, Twitter/X, YouTube, Facebook (default: Instagram)
- **Content type**: post, story, reel, carousel, thumbnail, ad (default: feed post)
- **Description**: What the content is about, brand context, campaign info
- **Quantity**: How many pieces (default: 1, or number of carousel slides)

If the user mentions a brand color or brand name, also read `${CLAUDE_PLUGIN_ROOT}/skills/design/settings.local.md` for defaults.

### 2. Select Platform Specs

From the Social Media Designer reference, load:
- Exact canvas dimensions for the platform + content type
- Safe zone constraints (top, bottom, sides)
- File format and size limits
- Platform-specific rules (e.g., Meta 20% text rule for ads)

### 3. Set Creative Direction

Define the visual approach:
- **Color palette**: Brand colors if available, or purposeful defaults
- **Typography**: Bold, mobile-readable fonts at platform minimum sizes
- **Layout pattern**: Select from feed post patterns, carousel system, or story templates
- **Mood**: Match the campaign tone or choose appropriate defaults

### 4. Create Visual Content

Build HTML/CSS visual at the **exact platform dimensions**:

```
Key rules:
- Canvas size matches platform spec exactly (e.g., 1080x1080 for IG feed square)
- All text sits inside safe zones
- Font sizes meet minimum readability requirements from reference
- Overlay opacity ensures text legibility on image backgrounds
- Brand colors applied to accents, backgrounds, or text highlights
```

For **carousels**: Generate each slide as a separate container:
- Slide 1: Hook slide (bold headline, max 10 words)
- Slides 2-N: Content slides (consistent header + body layout)
- Final slide: CTA slide (follow, save, link in bio)
- Apply visual threading: consistent color bar, slide numbering, matching typography

For **stories/reels**: Design the static frame/thumbnail:
- Content within the central safe zone (not under header or caption UI)
- CTA paired with appropriate sticker placement area

### 5. Platform-Specific Optimization

- **Meta ads**: Check text coverage against 20% guideline
- **YouTube thumbnails**: Verify text is legible at 160px thumbnail width
- **Carousel threading**: Ensure visual continuity across slides
- **Story safe zones**: Confirm nothing hidden under platform UI overlays
- **Mobile preview**: Test at 375px viewport width for actual device rendering

### 6. Preview & Verify

Use the preview server to display at actual platform dimensions:
```
preview_start → launch
preview_screenshot → capture visual proof
```

Check:
- Dimensions match exactly
- Text is readable at mobile size
- Safe zones are respected
- Brand consistency maintained
- Visual hierarchy is clear

### 7. Quality Review

Run the Social Design QA Checklist from `social-media-designer.md`:
- Dimensions correct
- Safe zones respected
- Text readable at mobile size
- Brand colors/fonts consistent
- File size under limits
- CTA visible and clear
- Carousel slides have visual threading

## MCP Fallback

If Preview MCP is unavailable, output as an HTML file the user can open in a browser.

If Figma MCP is connected and user prefers Figma output, create frames at exact platform dimensions using `figma_execute`. Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/figma-creation.md` for Figma API patterns.

## What's Next

After creating social content:
- `/social-campaign` — plan a full campaign using this content style
- `/ab-variants` — generate A/B test variants of this social content
- `/brand-kit` — generate a social-optimized brand kit
- `/design-review` — audit the social content for quality and accessibility
- `/social-analytics` — set up tracking for these assets
