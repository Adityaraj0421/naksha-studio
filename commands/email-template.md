---
name: email-template
description: Generate a production-ready HTML email template — inline styles, table layout, bulletproof buttons, responsive, dark mode, and deliverability-optimized. Works across Gmail, Outlook, Apple Mail, Yahoo Mail.
arguments: "<email type> for <brand/product> — <brief description>"
---

# /email-template $ARGUMENTS

You are activating the **Email Design Wing**: Email Designer + Email Copywriter.

---

## Process

### 1. Parse the Request

Extract from `$ARGUMENTS`:
- **Email type**: welcome | transactional | newsletter | promotional | onboarding | re-engagement | product-announcement
- **Brand/product name** and any colors/fonts mentioned
- **Specific content** (product name, offer, deadline, key features)
- **ESP** (if mentioned): Mailchimp, SendGrid, Klaviyo, HubSpot — defaults to generic `{{{VARIABLE}}}` syntax

If the email type is ambiguous, default to **promotional**.

---

### 2. Write the Copy Brief

Before touching HTML, produce a copy brief:

```
Subject line: [< 50 chars, benefit-driven]
Preview text: [40–90 chars, complements subject]
Headline: [benefit-first H1 for hero]
Subheadline: [1 sentence supporting the headline]
Body: [2–3 short paragraphs, AIDA structure]
CTA text: [action + outcome, first-person optional]
Footer: [legal, unsubscribe, address placeholders]
```

---

### 3. Design the Layout

Choose the layout based on email type:

| Email Type | Layout |
|-----------|--------|
| Welcome | Logo + Hero + 3 feature tiles + single CTA + footer |
| Transactional | Logo + summary card + data table + single CTA + footer |
| Newsletter | Logo + hero section + 2–4 content sections + footer |
| Promotional | Full-bleed hero + benefit bullets + deadline + CTA + footer |
| Onboarding | Progress bar + task card + single CTA + footer |
| Re-engagement | Minimal — personal tone, soft hero, soft CTA + unsubscribe prominent |
| Product announcement | Hero image + 3 feature tiles + CTA + footer |

Color defaults:
- Primary: `#2563eb` (blue)
- Text: `#111827` (gray-900)
- Background: `#f4f4f4`
- Surface: `#ffffff`

Use brand colors if specified in `$ARGUMENTS`.

---

### 4. Build the HTML

Produce complete, production-ready HTML following these rules:

**Structure:**
- Full `<!DOCTYPE html>` document with MSO conditional comments
- Preheader div (hidden, padded with `&zwnj;&nbsp;`)
- Wrapper table 100% width → inner container table `width="600"` with `class="email-container"`
- Each section in its own `<tr><td>` block

**Mandatory inline styles on every element** — no relying on the `<style>` block for rendering-critical properties.

**Bulletproof CTA button** — VML for Outlook + standard `<a>` for all others:
```html
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" ... />
<![endif]-->
<!--[if !mso]><!-->
<a href="{{{CTA_URL}}}" style="...">CTA Text</a>
<!--<![endif]-->
```

**Images:**
- Always include `width`, `height`, `alt`, `display:block`
- Use placeholder URLs: `https://via.placeholder.com/600x300` with descriptive alt text
- Add `class="fluid"` for responsive scaling

**Table layout** — no flexbox, no grid, no CSS `position`.

**Mobile responsive** — `@media screen and (max-width: 600px)` in `<style>` block:
- `.email-container { width: 100% !important; }`
- `.stack-column { display: block !important; width: 100% !important; }`
- `.fluid { max-width: 100% !important; height: auto !important; }`

**Dark mode** — `@media (prefers-color-scheme: dark)` in `<style>` block:
- `.dark-bg`, `.dark-text` utility classes
- Override background and text colors

**Footer** — always include:
```
© {{{YEAR}}} {{{COMPANY_NAME}}} · {{{ADDRESS}}}
Unsubscribe · Manage preferences · View in browser
```

---

### 5. Produce the Template Variables List

After the HTML, output a reference block:

```
Template Variables:
- {{{FIRST_NAME}}} — Recipient first name
- {{{CTA_URL}}} — Primary call-to-action URL
- {{{UNSUBSCRIBE_LINK}}} — ESP unsubscribe URL
- {{{PREFERENCES_LINK}}} — ESP preferences URL
- {{{VIEW_IN_BROWSER_LINK}}} — Hosted version URL
- {{{YEAR}}} — Current year
- {{{COMPANY_NAME}}} — Sender company name
- {{{ADDRESS}}} — Physical mailing address
[any additional variables specific to this email type]
```

If the user specified an ESP, convert `{{{VARIABLE}}}` to that ESP's syntax:
- Mailchimp: `*|FNAME|*`, `*|UNSUB|*`
- SendGrid: `{{first_name}}`, `{{unsubscribe}}`
- Klaviyo: `{{ first_name }}`, `{% unsubscribe_link %}`
- HubSpot: `{{contact.firstname}}`

---

### 6. Run the QA Checklist

Confirm:
- [ ] `<title>` matches subject line
- [ ] Preheader set and padded with `&zwnj;&nbsp;`
- [ ] Unsubscribe link present
- [ ] Physical address placeholder in footer
- [ ] All inline styles (no CSS-only rendering-critical properties)
- [ ] Bulletproof CTA buttons (VML + HTML fallback)
- [ ] All images have `alt`, `width`, `height`
- [ ] Mobile `@media` responsive rules present
- [ ] Dark mode `@media` rules present
- [ ] No JavaScript, no external CSS file links
- [ ] All links absolute `https://` URLs or template variables

---

### MCP Fallback

**Without Preview MCP**: Output the full HTML file. Ask the user to save as `.html` and open in a browser for local preview. Recommend Litmus or Email on Acid for cross-client testing.

**With Preview MCP**: Start the preview server, write the HTML file, and navigate to it for visual verification.

---

## What's Next

- `/email-campaign` — Turn this template into a multi-email sequence
- `/design-review` — Audit the template for accessibility and UX quality
- `/brand-kit` — Establish brand colors, fonts, and logo before email work
