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

---

## Advanced Patterns

### Subject Line Formula Library

5 deeper patterns with analysis (complements the formula quick-reference table above):

**1. Specificity** (most reliable)
> "Your invoice for $240 is ready"
> "3 new comments on 'Homepage redesign'"
> "Your trial ends in 3 days"
Specificity signals relevance. Vague subjects get ignored; specific ones get opened.

**2. Curiosity gap**
> "The one thing we changed in v2.0"
> "Why your LCP score is probably wrong"
Create a knowledge gap, then close it inside the email. Don't be clickbait — the email must deliver on the subject.

**3. Urgency + specificity**
> "48 hours left: your export is waiting"
> "Last chance: free migration help ends Friday"
Urgency without specificity is spam. Urgency + specificity is useful.

**4. Social proof**
> "1,200 agencies signed up this month"
> "How [Company] cut design review time by 60%"
Works for nurture sequences. Avoid for transactional or onboarding emails.

**5. Direct benefit**
> "Your design system, now with dark mode support"
> "Naksha now works in Figma — here's how"
Best for product update emails. Lead with the user benefit, not the feature name.

**Anti-patterns:** ALL CAPS, excessive punctuation (!!!!!), misleading teasers, "Re:" or "Fwd:" tricks, using the recipient's name if it adds no value.

---

### Preview Text Strategy

Preview text is the second subject line — it appears in the inbox below/beside the subject.

**Rules:**
- Never repeat the subject line — extend the thought or add a secondary hook
- 40–90 characters for full display across clients
- Write it before you write the email body — it keeps you focused on the core message
- If you don't set preview text, email clients pull the first line of body content (often ugly: "View in browser | Unsubscribe")

**Examples:**
| Subject | Preview text |
|---|---|
| "Your trial ends in 3 days" | "Here's what you'll lose access to — and how to keep it." |
| "v3.0 is live" | "Dark mode, 12 new commands, and a complete Figma rewrite." |
| "New comment from Sarah" | "She left a note on your homepage redesign wireframes." |

---

### CTA Copy Decision Guide

**The formula:** Verb + Object (+ Context when helpful)
- ✅ "Download your report"
- ✅ "Start your free trial"
- ✅ "View Sarah's comment"
- ❌ "Click here"
- ❌ "Learn more"
- ❌ "Submit"

**Single primary CTA per email.** If you have two goals, write two emails. Multiple CTAs reduce clicks on all of them.

**Button vs. text link:**
- Button: primary action, conversion-focused emails
- Text link: supplementary links, transactional details ("view invoice", "update preferences")
- Never use only text links for the primary CTA — they get missed

**Placement:**
- Primary CTA: above the fold (visible without scrolling) + repeated at the bottom of long emails
- At the bottom: after you've made the case, when the reader is most persuaded

---

### Drip Sequence Psychology

*This arc applies to SaaS products with a clear activation milestone. For content-first or newsletter products, see Welcome Sequence above.*

**The sequence arc:**

| Email | Timing | Goal | Tone |
|---|---|---|---|
| **Welcome** | Immediately | Deliver the promised value, orient the user | Warm, focused |
| **Onboarding 1** | Day 2 | First meaningful product action | Helpful, instructional |
| **Onboarding 2** | Day 4 | Second value milestone | Encouraging |
| **Nurture** | Week 2+ | Teach something valuable (no pitch) | Educational, generous |
| **Consideration** | Week 3–4 | Social proof, case study, objection handling | Confident |
| **Conversion** | Week 4–5 | Clear offer with urgency | Direct, benefit-led |
| **Re-engagement** | Day 30 of inactivity | Acknowledge the gap, give a reason to return | Low-pressure |
| **Win-back** | Day 60 of inactivity | Last attempt before suppression | Honest, generous |

**Frequency rule:** Users should receive no more than 2–3 marketing emails per week from you. More = unsubscribes.

**Content arc:** Teach → show proof → make offer. Don't pitch before you've given value. The ratio should be roughly 3:1 (value emails to pitch emails).

---

## Full Coverage

### Email Type Reference

| Type | Goal | Sender | Subject approach | CTA | Length | Timing |
|---|---|---|---|---|---|---|
| **Welcome** | Orient + deliver first value | Founder or team | "Welcome to [Product]" or specific first action | Primary product action | Short | Immediately on signup |
| **Onboarding** | Drive activation milestone | Team or product | Specific next step ("Connect your Figma account") | The specific action | Short | Days 2–5 |
| **Educational/Newsletter** | Build trust, teach | Team | Topic or insight | Read more / try it | Medium | Weekly or biweekly |
| **Promotional** | Convert to paid | Marketing | Benefit + urgency | Sign up / upgrade | Medium | Lifecycle trigger or campaign |
| **Transactional** | Confirm action | Noreply or product | Exactly what happened ("Your receipt for $49") | Related action or none | Short | Immediately on trigger |
| **Re-engagement** | Return inactive user | Founder | Acknowledge the gap | Low-friction action | Short | Day 30 inactive |
| **Win-back** | Final re-engagement | Founder | Direct + generous | Easy return action | Short | Day 60 inactive |
| **Milestone** | Celebrate user achievement | Product | What they achieved | Share or upgrade | Short | On trigger |
| **Survey** | Collect feedback | Founder or team | Direct ask ("Can I ask you one question?") | Open survey | Short | After activation or churn |

---

### Segmentation Copy Adaptation

The same email should read differently for different user segments:

**New users vs. power users:**
- New user: more context, more explanation, softer CTAs ("Get started")
- Power user: less hand-holding, specific features, stronger CTAs ("Enable it now")
- Use dynamic content blocks in your ESP to swap sections based on user attribute

**When to send separate emails vs. personalize one:**
- Separate emails: when the entire message changes (onboarding for free vs. paid is different enough to be a different email)
- Personalize one: when the core message is the same but 1–2 details differ (name, plan, specific feature they use)

**Tone adaptation by segment:**
- Churned users: lower stakes, no pressure, generous offer
- High-value users: acknowledge their status, give them early access or exclusive content
- Users who haven't activated: patient, instructional, address common blockers

---

### A/B Testing Email Copy

**Test in this order:**

1. **Subject line** (biggest impact — affects open rate, which affects everything downstream)
2. **CTA copy** (affects click rate directly)
3. **Headline** (first thing read after open)
4. **Send time** (test Tuesday 10am vs. Thursday 2pm for your audience)
5. **Length** (short vs. long — audience dependent)

**Writing variants that test one variable:** Change only the subject line in variant B — don't also change the preview text. One variable per test.

**Minimum send volume per variant:** 1,000+ recipients per variant for statistical significance on open rate. 5,000+ for click rate significance (lower base rate = needs more volume).

**How to read results:**
- Subject line test → look at open rate (48–72h window)
- CTA test → look at click-to-open rate (not raw click rate — controls for open rate variation)
- Apply winner to the rest of the list once significance is reached (typically p < 0.05)

---
