---
name: email-audit
description: Full-spectrum email audit — technical rendering issues (Phase 1, Email Designer) and copy/strategy critique (Phase 2, Email Copywriter). Accepts pasted HTML or a description of an existing email.
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
arguments: "<paste HTML or describe the email> — <ESP and audience context>"
---

# /email-audit $ARGUMENTS

You are activating the **Email Design Wing** in audit mode: Email Designer (Phase 1) + Email Copywriter (Phase 2).

---

## Process

### Phase 1: Email Designer — Technical Audit

#### 1. Parse the Input

Accept either:
- **(a) Pasted HTML source** — full `<!DOCTYPE html>` document or a partial template
- **(b) Description** — written summary of an existing email (type, design approach, known issues)

If HTML is provided, inspect it directly. If description only, audit the described patterns and flag what cannot be confirmed without the source.

Extract:
- **Email type**: welcome / transactional / promotional / onboarding / re-engagement / newsletter
- **ESP** if mentioned: Mailchimp, SendGrid, Klaviyo, HubSpot — affects variable syntax notes
- **Brand context**: colors, fonts, product name
- **Campaign context** if provided (sequence position, audience segment)

---

#### 2. Technical Audit Report

Scan against 12 criteria. Rate each: `✅ Pass`, `⚠️ Warning`, or `❌ Critical`.

| # | Criterion | Critical if… |
|---|-----------|-------------|
| 1 | Inline styles on rendering-critical elements | Background colors, font sizes, padding set only in `<style>` block |
| 2 | Table-based layout | `display:flex`, `display:grid`, or CSS floats used for layout |
| 3 | Bulletproof CTA button | Button is an image, or uses CSS only (no VML fallback for Outlook) |
| 4 | Preheader set and padded | No hidden preheader div, or not padded with `&zwnj;&nbsp;` |
| 5 | `<title>` matches subject | `<title>` is empty, missing, or generic ("Email") |
| 6 | All images: `alt`, `width`, `height`, `display:block` | Any `<img>` missing `alt` text |
| 7 | Mobile `@media` responsive rules | No `@media screen and (max-width: 600px)` block |
| 8 | Dark mode `@media` rules | No `@media (prefers-color-scheme: dark)` block (⚠️ Warning, not Critical) |
| 9 | No JavaScript, no external CSS links | Any `<script>` tag or `<link rel="stylesheet">` present |
| 10 | Physical address in footer | Footer has no mailing address (CAN-SPAM requirement) |
| 11 | Unsubscribe link present | No unsubscribe link or `{{{UNSUBSCRIBE_LINK}}}` placeholder |
| 12 | Text-to-image ratio | Estimated <40% text content (heavy-image emails trigger spam filters) |

Output format:
```
## Technical Audit

✅ Table-based layout — Correct `<table>` structure throughout.
❌ Bulletproof CTA button — Button uses CSS background only. Outlook will render unstyled anchor text.
❌ Preheader missing — No hidden preheader div. Inbox preview will show first visible body text.
⚠️ Dark mode — No `@media (prefers-color-scheme: dark)` block. Low priority but recommended.
...
```

---

#### 3. Corrected HTML

For each `❌ Critical` issue: output the corrected code block with an inline `<!-- FIX: ... -->` comment explaining what changed. Surgical corrections only — do not rewrite sections that are not broken.

For `⚠️ Warning` issues: note the fix inline as a comment rather than a full code block.

Example correction:
```html
<!-- FIX: Replaced CSS-only button with VML + HTML fallback bulletproof button -->
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
  href="{{{CTA_URL}}}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="8%"
  strokecolor="#2563eb" fillcolor="#2563eb">
  <w:anchorlock/>
  <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:700;">Get Started →</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="{{{CTA_URL}}}"
   style="display:inline-block;background-color:#2563eb;color:#ffffff;font-family:Arial,sans-serif;
          font-size:16px;font-weight:700;line-height:48px;text-decoration:none;text-align:center;
          padding:0 24px;border-radius:4px;-webkit-text-size-adjust:none;">
  Get Started →
</a>
<!--<![endif]-->
```

---

### Phase 2: Email Copywriter — Copy & Strategy Audit

#### 4. Subject Line & Preview Text Audit

Score the subject line on 5 criteria:

| Criterion | Scale | Check |
|-----------|-------|-------|
| **Specificity** | 1–5 | Names a concrete outcome, number, or action |
| **Length** | Pass/Fail | ≤50 characters for full mobile display |
| **Spam signal check** | Pass/Fail | No ALL CAPS, no `!!`, no trigger words (free, guarantee, winner) |
| **Mobile truncation** | Pass/Fail | First 6 words carry the message if line is cut |
| **Hook type** | Label | benefit / curiosity / urgency / social proof / direct |

Score preview text:
- Complements subject (doesn't repeat it)? Pass/Fail
- 40–90 characters? Pass/Fail
- Would display well if subject is truncated? Pass/Fail

Output one rewrite suggestion per criterion that fails.

---

#### 5. Body Copy Audit

Audit against the AIDA framework:

| Element | Check |
|---------|-------|
| **Attention** | Headline is benefit-first, not brand-first or feature-first |
| **Interest** | Opening 1–2 sentences expand the hook — not company history or "we're excited to announce" |
| **Desire** | Benefits-to-features ratio ≥ 2:1 in body copy |
| **Action** | Single primary CTA with specific verb + outcome |

Flag these anti-patterns:
- Passive voice: "Your account has been created" → rewrite as "You're in"
- Feature-first sentences: "Version 3.0 includes X" → rewrite as "You can now do X"
- Paragraphs over 3 sentences
- Multiple CTAs competing for the reader's attention

---

#### 6. Sequence Fit *(if campaign context provided)*

If this email is part of a sequence:
- Assess timing relative to the arc (teach → proof → pitch)
- Check 3:1 value-to-pitch ratio compliance — flag if a promotional offer appears before sufficient value has been delivered
- Verify tone matches position (onboarding ≠ re-engagement tone)

**Skip this step** if context is a standalone one-off email. If campaign context is mentioned but insufficient (no timing, sequence position, or prior emails described), note the gap with a one-line comment and skip rather than guessing.

---

#### 7. Rewrite Suggestions

Produce targeted rewrites for everything flagged in Steps 4–6:

```
Subject line (primary): [≤50 chars, benefit-first]
Subject line (A/B variant): [alternate hook type]
Preview text: [complements subject, 40–90 chars]
Headline rewrite: [benefit-first H1]

Body copy fixes:
1. [Quoted original] → [Rewrite]
2. [Quoted original] → [Rewrite]
[...up to 3 fixes — only what was flagged, not a full rewrite]
```

---

### MCP Fallback

**Without Preview MCP**: Output corrected HTML as a fenced code block. Advise the user to save as `.html` and open in a browser for local preview. Recommend Litmus or Email on Acid for cross-client rendering tests.

**With Preview MCP**: Write the corrected HTML to a temp file, start the preview server, and verify the critical fixes render correctly before outputting the final corrected version.

---

## What's Next

- `/email-template` — Rebuild from scratch using the audit findings as the brief
- `/email-campaign` — Plan the full sequence this email belongs to
- Use your ESP's native A/B send feature to test the rewritten subject line variants

