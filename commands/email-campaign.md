---
name: email-campaign
description: Plan and write a complete multi-email campaign sequence — welcome flows, onboarding sequences, promotional campaigns, re-engagement, and launch sequences. Outputs a campaign brief, sequence map, and all email templates.
arguments: "<campaign type> for <product/goal> — <audience and context>"
---

# /email-campaign $ARGUMENTS

You are activating the **Email Design Wing**: Email Designer + Email Copywriter in campaign mode.

---

## Process

### 1. Parse the Campaign Request

Extract from `$ARGUMENTS`:
- **Campaign type**: welcome-series | onboarding | product-launch | promotional | re-engagement | nurture | post-purchase
- **Product/service** and key value proposition
- **Audience** segment (new user, free trial, lapsed customer, etc.)
- **Goal** (activation, conversion, retention, winback)
- **ESP/tooling** if mentioned
- **Brand details** (colors, tone, name)

---

### 2. Output the Campaign Brief

Produce a structured brief before any email copy:

```
Campaign: [Name]
Goal: [Primary metric — e.g., trial-to-paid conversion]
Audience: [Who receives this sequence]
Trigger: [What starts the sequence — signup, purchase, inactivity, etc.]

Sequence Overview:
Email 1 — [Day X] — [Purpose] — Subject: [draft]
Email 2 — [Day X] — [Purpose] — Subject: [draft]
...

Success Metrics:
- Open rate target: X% (benchmark for [email type])
- Click rate target: X%
- Conversion target: X%
```

---

### 3. Build the Sequence Map

Design the email cadence based on campaign type:

**Welcome Series** (5 emails, 14 days):
| # | Timing | Purpose | CTA |
|---|--------|---------|-----|
| 1 | Day 0 | Confirmation + quick win | Explore product |
| 2 | Day 2 | Origin story + social proof | Read case study |
| 3 | Day 5 | Core feature spotlight | Try key feature |
| 4 | Day 9 | Customer success story | See results |
| 5 | Day 14 | Soft upgrade/trial offer | Start free trial |

**Onboarding Sequence** (5–7 emails, based on activation steps):
- One email per key activation milestone
- Subject references progress: "Step 2 of 5: Connect your team"
- Each ends with exactly one task

**Product Launch** (3 emails):
| # | Timing | Purpose |
|---|--------|---------|
| 1 | Day -3 | Teaser / announcement |
| 2 | Launch day | Full reveal + CTA |
| 3 | Day +3 | Social proof / last chance |

**Promotional Campaign** (3 emails):
| # | Timing | Purpose |
|---|--------|---------|
| 1 | Day 0 | Offer announcement |
| 2 | Day 3 | Reminder + testimonial |
| 3 | Final day | Urgency / last chance |

**Re-engagement** (3 emails):
| # | Timing | Purpose |
|---|--------|---------|
| 1 | Day 0 | "We've missed you" |
| 2 | Day 7 | Value reminder / what's new |
| 3 | Day 14 | "Should we remove you?" |

**Post-Purchase** (4 emails):
| # | Timing | Purpose |
|---|--------|---------|
| 1 | Immediate | Order confirmation |
| 2 | Day 3 | Onboarding / getting started |
| 3 | Day 10 | Check-in + tips |
| 4 | Day 21 | Review request / referral |

---

### 4. Write All Email Copy

For each email in the sequence, produce:

```
EMAIL [#] — [Name]
─────────────────────
Subject A: [Primary variant, ≤ 50 chars]
Subject B: [A/B test variant]
Preview: [Complements subject, 40–90 chars]

Headline: [H1 text]
Body:
[Short paragraphs, benefits-first, AIDA]

CTA: [Specific action text]
Footer note: [Optional P.S. or context line]
```

Apply the appropriate tone guide per email type from the Email Copywriter knowledge.

---

### 5. Generate HTML Templates

For each email, produce the full HTML template following the same rules as `/email-template`:

- Complete `<!DOCTYPE html>` with MSO conditional comments
- Inline styles on all rendering-critical elements
- Table-based layout (`max-width: 600px`)
- Bulletproof CTA button (VML + HTML fallback)
- Mobile-responsive `@media` rules
- Dark mode `@media` rules
- Preheader with `&zwnj;&nbsp;` padding
- Consistent visual design across the sequence (same colors, fonts, logo position)
- Increment template variables: `{{{CTA_URL_1}}}`, `{{{CTA_URL_2}}}`, etc. if multiple emails share a template

Use consistent layout templates across the sequence — only hero content changes between emails.

---

### 6. Produce the Campaign Variables Reference

```
Shared variables (all emails):
- {{{FIRST_NAME}}} — Recipient first name
- {{{COMPANY_NAME}}} — Sender company
- {{{ADDRESS}}} — Physical mailing address
- {{{UNSUBSCRIBE_LINK}}} — Unsubscribe URL
- {{{PREFERENCES_LINK}}} — Preferences URL
- {{{VIEW_IN_BROWSER_LINK}}} — Hosted version URL

Per-email variables:
Email 1: {{{CTA_URL_1}}}, ...
Email 2: {{{CTA_URL_2}}}, ...
[etc.]
```

---

### 7. Output the ESP Setup Notes

Provide automation/trigger configuration guidance:

```
ESP Automation Setup:
- Trigger: [Event that starts the sequence]
- Entry condition: [Filter or segment]
- Exit condition: [What stops the sequence — e.g., purchased, unsubscribed]
- Wait times: [Delays between emails]
- Goal tracking: [Conversion event to track]

A/B Test Plan:
- Email 1 subject lines: 50/50 split, win condition = open rate at 4 hours
- [Additional test recommendations per email]
```

---

### 8. Run the Campaign QA Checklist

- [ ] Every email has a unique subject line (no duplicates in sequence)
- [ ] Preview text complements subject in each email
- [ ] Single CTA per email (exceptions: newsletters may have 2–3)
- [ ] Unsubscribe link in every email
- [ ] Physical address in every footer
- [ ] No deceptive subjects (CAN-SPAM)
- [ ] Re-engagement final email makes unsubscribing easy and prominent
- [ ] All HTML follows inline-styles + table layout rules
- [ ] Bulletproof buttons in every template
- [ ] All images have alt text + explicit dimensions
- [ ] Template variables documented and consistent

---

### MCP Fallback

**Without Preview MCP**: Save each email as a numbered `.html` file (e.g., `campaign-email-1.html`) and open locally for browser preview.

**With Preview MCP**: Preview each template in sequence and verify visual consistency across the flow.

---

## What's Next

- `/email-template` — Refine a single email from this campaign in isolation
- `/design-system` — Build a design system that feeds consistent tokens into email templates
- `/brand-kit` — Establish brand before creating a campaign
- `/ab-variants` — Generate A/B variant designs for the campaign hero sections
