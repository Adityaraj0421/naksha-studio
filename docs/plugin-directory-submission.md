# Plugin Directory Submission — Naksha

Use this document when submitting to the Claude Code plugin directory.

**Submission form:** https://clau.de/plugin-directory-submission

---

## Submission Fields

### Basic Info

| Field | Value |
|-------|-------|
| Plugin name (slug) | `naksha` |
| Display name | Naksha — Design Team |
| Version | 3.8.0 |
| License | MIT |
| Author | Aditya Raj |
| Author GitHub | https://github.com/Adityaraj0421 |

### Repository

| Field | Value |
|-------|-------|
| Repository URL | https://github.com/Adityaraj0421/naksha-studio |
| Homepage | https://github.com/Adityaraj0421/naksha-studio |
| Issue tracker | https://github.com/Adityaraj0421/naksha-studio/issues |

### Description

**Short description (≤160 chars):**
```
A virtual design team for Claude Code — 22 specialist roles, 38 commands, 11,000+ lines of design knowledge.
```

**Long description:**
```
Naksha assembles specialist roles automatically based on what you're designing. UI Designer, UX Researcher, Content Designer, Motion Designer, Figma Expert, Email Designer, Data Viz Designer, Brand Strategist, and more — 22 roles total.

38 slash commands cover the full design-to-code pipeline: /design builds pages and components, /design-review audits for accessibility and usability, /design-system extracts tokens, /design-framework converts HTML to React/Vue/Svelte/Next.js/Astro components, /figma-create builds Figma frames, /email-template generates production HTML emails, /chart-design produces accessible data visualizations, and more.

Over 11,000 lines of expert design knowledge, source-attributed from authoritative references (WCAG, Nielsen heuristics, Refactoring UI, MJML docs, etc.).

Also works in Cursor, Windsurf, Gemini CLI, and VS Code Copilot.
```

### Categories & Keywords

| Field | Value |
|-------|-------|
| Primary category | Design & Frontend |
| Keywords | `design, ui, ux, figma, frontend, design-system, email, social-media, data-viz, components, typescript, react, vue, svelte, accessibility, tailwind` |

### Install Instructions (for submission form)

**Claude Code 2.1.72+:**
```
/plugin marketplace add https://github.com/Adityaraj0421/naksha-studio.git
/plugin install naksha@naksha
```

**Git clone:**
```bash
git clone https://github.com/Adityaraj0421/naksha-studio.git ~/.claude/plugins/naksha
```

### Screenshots / Assets

Assets for the submission form:
- `assets/social-preview.png` — 1200×630 preview image
- `assets/demo.svg` — animated command demo

---

## Checklist Before Submitting

- [ ] Version is `3.8.0` in `plugin.json`
- [ ] GitHub release `v3.8.0` exists and is tagged `Latest`
- [ ] README has install instructions for both methods
- [ ] `marketplace.json` is present in `.claude-plugin/`
- [ ] All 38 commands work in Claude Code
- [ ] Issue #4 is closed
