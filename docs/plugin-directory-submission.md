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
| Version | 5.2.0 |
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
A virtual design team for Claude Code — 30 roles, 65 commands, 15,000+ lines of design knowledge.
```

**Long description:**
```
Naksha assembles specialist roles automatically based on what you're designing. UI Designer, UX Researcher, Content Designer, Motion Designer, Figma Expert, Email Designer, Data Viz Designer, Brand Strategist, Conversational Designer, Spatial Designer, Compliance Designer, and more — 30 roles total.

65 slash commands cover the full design-to-code pipeline: /design builds pages and components, /design-review audits for accessibility and usability, /design-system extracts tokens, /design-framework converts HTML to React/Vue/Svelte/Next.js/Astro, /figma-create builds Figma frames, /email-template generates production HTML emails, /chart-design produces accessible data visualizations, /design-chatbot designs chatbot UIs, /design-voice-ui designs voice interfaces, /design-spatial builds visionOS/WebXR specs, /design-gdpr generates GDPR consent flows, /design-compliance audits for HIPAA/PCI/ADA, and more.

Over 15,000 lines of expert design knowledge, source-attributed from authoritative references (WCAG, Nielsen heuristics, Refactoring UI, MJML docs, Apple HIG, GDPR Art. 7/12/17, etc.).

v5 adds persistent project memory (/naksha-init, /naksha-remember, and /naksha-browse capture brand, constraints, component patterns, and live-site research once and feed them into every design command) and /design-reel, which renders a /design run into a share-able 9:16 + 16:9 video of the team at work. Earlier releases added agentic pipelines (/pipeline chains multiple commands automatically), vision-powered reviews (/design-compare and /competitive-audit capture and analyze any URL), and three frontier wings (Conversational, Spatial/AR, Compliance).

Also works in Cursor, Windsurf, Gemini CLI, VS Code Copilot, and Autohand Code CLI.
```

### Categories & Keywords

| Field | Value |
|-------|-------|
| Primary category | Design & Frontend |
| Keywords | `design, ui, ux, figma, frontend, design-system, email, social-media, data-viz, components, typescript, react, vue, svelte, accessibility, tailwind, chatbot, visionos, gdpr, compliance, voice-interface, spatial-ui` |

### Install Instructions (for submission form)

**Claude Code 2.1.72+:**
```
/plugin marketplace add https://github.com/Adityaraj0421/naksha-studio.git
/plugin install naksha@naksha
```

**Git clone:**
```bash
git clone https://github.com/Adityaraj0421/naksha-studio.git
cd naksha-studio && bash install.sh
```

### Screenshots / Assets

Assets for the submission form:
- `site/og.png` — 1200×630 preview image
- `site/before.png` / `site/after.png` — 900×1340 before/after of an Account Settings screen redesigned by naksha (used on the landing page)

---

## Checklist Before Submitting

- [ ] Version in `plugin.json` matches the Version field above
- [ ] GitHub release for that version exists and is tagged `Latest`
- [ ] README has install instructions for both methods
- [ ] `marketplace.json` is present in `.claude-plugin/`
- [ ] All 65 commands work in Claude Code (including /design-reel with the Node render toolchain)
- [ ] validate-structure: all checks pass (`node scripts/validate-structure.js`)
- [ ] quality-check: PASS (`bash scripts/quality-check.sh` — includes behavioral-smoke, guard-counts, and hook-smoke)
