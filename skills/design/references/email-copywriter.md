# Email Copywriter

Writes high-performing email copy that drives opens, clicks, and conversions. Specializes in subject lines, preview text, body structure, CTAs, and multi-email sequence strategy.

---

## Subject Line Craft

Subject lines are the most critical copy in any email — they determine whether the email gets opened.

**Formula library:**

| Formula | Example |
|---------|---------|
| **Number + benefit** | "5 ways to cut design time in half" |
| **Question** | "Is your design system slowing you down?" |
| **How-to** | "How top teams ship design 3× faster" |
| **Curiosity gap** | "We've been keeping something from you" |
| **Direct offer** | "Your free trial starts today" |
| **Urgency** | "Last chance: offer ends at midnight" |
| **Personalized** | "{{{FIRST_NAME}}}, your dashboard is ready" |
| **Re-engagement** | "We miss you. Here's 20% off" |

**Subject line rules:**
- 30–50 characters (shows fully on mobile)
- Never use ALL CAPS or excessive punctuation (spam signals)
- Test emoji — works for some audiences, not others
- Avoid spam trigger words: "free", "guarantee", "winner", "urgent", "act now"
- A/B test subject lines on 20% of list before full send

---

## Preview Text (Preheader)

Preview text appears next to the subject in most inboxes — it's essentially a second subject line.

**Rules:**
- 40–90 characters (varies by client)
- Complement the subject, don't repeat it
- If not set, inbox shows first visible text in email (often looks bad)
- Pad with invisible characters: `&zwnj;&nbsp;` to prevent overflow spillover

**Examples:**
- Subject: "Your order is confirmed" → Preview: "Delivery estimated Thursday, Mar 14"
- Subject: "New feature: dark mode is here" → Preview: "Switch between themes instantly — no extra setup needed"
- Subject: "5 ways to cut design time" → Preview: "Plus a free template pack inside"

---

## Email Body Structure

### The AIDA Framework
1. **Attention** — Hero headline that hooks immediately
2. **Interest** — 1–2 sentences expanding on the hook
3. **Desire** — Benefits (not features), social proof, specifics
4. **Action** — Single, clear CTA

### Copywriting Principles

**Lead with the reader, not the brand:**
- ❌ "We're excited to announce that we've launched..."
- ✓ "You can now do X in half the time."

**Benefits over features:**
- ❌ "Version 3.0 includes a new sync engine"
- ✓ "Your designs stay in sync automatically — no more manual exports"

**Use second-person singular (you/your):**
- Makes the email feel personal, not broadcast

**Short paragraphs:**
- Max 3 sentences per paragraph
- 1 sentence is often ideal
- White space is copy too

**Active voice:**
- ❌ "Your account has been created"
- ✓ "You're in — here's your account"

---

## CTA Copy

The button/link text is the most action-critical copy. It must be specific and low-friction.

**Weak → Strong CTA copy:**
| Weak | Strong |
|------|--------|
| "Click here" | "See your report" |
| "Learn more" | "Read the full guide" |
| "Submit" | "Get my free template" |
| "Buy now" | "Start my 14-day trial" |
| "Sign up" | "Join 10,000 designers" |

**CTA rules:**
- One primary CTA per email (two CTAs split attention by 50%)
- Position CTA above the fold AND after the body copy
- First-person phrasing increases clicks: "Get MY quote" vs "Get your quote"
- Action + outcome: verb + what they get

---

## Email Type Tone Guides

| Email Type | Tone | Length | Key Copy Elements |
|-----------|------|--------|-------------------|
| **Welcome** | Warm, confident | Medium | Brand promise, quick win, set expectations |
| **Transactional** | Clear, efficient | Short | Confirmation, key details, next step |
| **Newsletter** | Conversational | Variable | Hook intro, curated value, editorial voice |
| **Promotional** | Energetic, urgent | Short-medium | Headline benefit, offer specifics, deadline |
| **Onboarding** | Helpful, encouraging | Short | One task, one win, progress |
| **Re-engagement** | Personal, humble | Short | Acknowledge absence, single soft ask |
| **Winback** | Direct, incentive-led | Short | Offer + deadline, easy reply |

---

## Multi-Email Sequence Strategy

### Welcome Sequence (5 emails)
1. **Day 0** — Confirmation + quick win ("Here's your first template")
2. **Day 2** — Origin story + social proof (builds trust)
3. **Day 5** — Core value prop + feature spotlight
4. **Day 9** — Case study or success story
5. **Day 14** — Soft offer or next step CTA

### Onboarding Sequence (3–7 emails)
- One email = one action
- Progress signals ("Step 2 of 3: Connect your team")
- Each email's subject references where they are in the journey

### Re-engagement Sequence (3 emails)
1. "We've missed you" — gentle, no pressure
2. Value reminder — "Here's what you've been missing"
3. Final ask — "Should we remove you?" (reverse psychology — high open rates)

---

## A/B Testing Priorities

Test in this order (highest to lowest impact on revenue):

1. **Subject line** — affects open rate (biggest lever)
2. **CTA copy** — affects click rate
3. **CTA color/placement** — affects click rate
4. **Hero headline** — affects engagement
5. **Email length** — affects read rate

**Statistical significance:** Need minimum 1,000 recipients per variant, 95% confidence before declaring a winner.

---

## Personalization Variables

Beyond first name, effective personalizations:
- **Company name**: `{{{COMPANY_NAME}}}` — strong for B2B
- **Last activity**: "You last logged in 14 days ago"
- **Stage/segment**: "As a [free/pro/enterprise] user..."
- **Behavior-triggered**: "You started a trial but haven't invited your team"
- **Geographic**: "Teams in {{{CITY}}} love this feature"

---

## Compliance Copy Requirements

- **Unsubscribe link** — required in every email (CAN-SPAM, CASL, GDPR)
- **Physical address** — required (CAN-SPAM)
- **Honest subject line** — cannot be deceptive (CAN-SPAM)
- **No pre-checked opt-ins** — required for GDPR compliance
- Transactional emails (receipts, password resets) are exempt from CAN-SPAM marketing rules but must not contain promotional content

---

## QA Checklist

- [ ] Subject line under 50 characters and tested for spam triggers
- [ ] Preview text set and complements subject (not a repeat)
- [ ] One primary CTA with specific, action-oriented copy
- [ ] Benefits-first body copy (not feature-first)
- [ ] Short paragraphs (≤3 sentences)
- [ ] Personalization tokens present where appropriate
- [ ] Unsubscribe link copy present and friendly ("Unsubscribe" or "Manage preferences")
- [ ] Compliance copy: physical address, honest subject
- [ ] Plain text version has equivalent copy
- [ ] A/B test variant for subject line prepared if list > 1,000

---

## Handoffs

- **To Email Designer**: Provide subject, preview text, headline, body copy, CTA text, footer copy as a content brief before HTML coding begins
- **To Design Manager**: Flag if sequence requires triggered/behavioral automation logic (needs ESP workflow configuration)
