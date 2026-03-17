---
description: "Design a complete chatbot or conversational assistant UI — dialog flows, message bubbles, quick replies, typing indicators, error states, and accessibility."
argument-hint: "[assistant type: support|sales|onboarding|general] [platform: web|mobile|slack] [persona brief]"
allowed-tools: ["Read", "Write", "mcp__*"]
---

# /design-chatbot

You are designing a complete chatbot or conversational assistant UI. Your output is a single structured spec covering persona, dialog flows, message UI, component library, error states, and accessibility.

## Input

Arguments: **$ARGUMENTS**

Parse the following from `$ARGUMENTS`:
- **Assistant type**: customer support / sales / onboarding / general (default: general)
- **Platform**: web / mobile / Slack (default: web)
- **Persona brief**: any name, tone, or personality notes the user provides

---

## Step 1: Load Knowledge Base

Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/conversational-designer.md` to apply the full Conversational Designer knowledge base to every section below.

**MCP Fallback**: If the file cannot be read, proceed using inline knowledge. The inline knowledge for this command covers: persona dimensions (name, avatar, voice tone, vocabulary, emoji use), dialog flow states (GREETING → MAIN_FLOW → SLOT_FILLING → CONFIRMATION → EXECUTION, plus DISAMBIGUATION, FALLBACK_1/2/ESCALATION, GOODBYE), message bubble specs (user right-aligned brand accent; bot left-aligned neutral surface), quick reply chips (pill buttons, disappear on tap, max 5), typing indicator (3-dot pulse, 500ms delay), error state mapping (API timeout → retry, 5xx → retry + escalation, session expired → restart), and accessibility (aria-live="polite", role="log", keyboard nav, screen reader announcement order).

---

## Step 2: Generate the Spec

Produce all six sections below as a single continuous output. Do not pause or ask for confirmation between sections.

---

### Section 1: Persona & Voice Spec

Define the assistant's identity before any dialog is written.

| Dimension | Value |
|---|---|
| **Name** | [Derived from persona brief, or propose one if not provided] |
| **Platform context** | [assistant type on platform] |
| **Avatar style** | [Human-adjacent / abstract shape / brand mascot — choose based on assistant type and platform] |
| **Language register** | [Formal / Casual / Technical — justify by assistant type] |
| **Vocabulary level** | [Reading grade level, contraction use, jargon policy] |
| **Emoji use** | [None / Sparingly (1 per message max) / Moderate — justify] |

**Tone adjectives (3–5):** [List tone words that characterize every message the bot sends, e.g.: warm, direct, efficient, clear, empathetic]

**Personality spectrum position:**
```
Formal     ←————[mark position]————→ Casual
Verbose    ←————[mark position]————→ Concise
Serious    ←————[mark position]————→ Playful
```

**Prohibited language patterns** (never say):
- Never claim to be human if directly asked
- Never use hedging on factual questions ("I think", "I believe") — use "I don't have information on that"
- Never express impatience or mock the user, even after repeated failures
- Never apologize more than once per error
- [Add 2–3 assistant-type-specific prohibitions based on the parsed assistant type]

---

### Section 2: Dialog Flow Map

Four key conversation paths rendered as text-based flow diagrams.

#### Happy Path (user resolved in ≤3 turns)
```
User: [opening message matching primary use case]
  └─→ BOT: [greeting + immediate value offer]
       └─→ User: [core request — intent recognized, high confidence ≥0.85]
            └─→ BOT: [slot-fill or direct response]
                 └─→ User: [confirmation or completion trigger]
                      └─→ BOT: [success message + next step or close]
                           └─→ [END or continue]
```

#### Escalation Path (bot cannot resolve → human handoff)
```
User: [message — intent not recognized]
  └─→ BOT: FALLBACK_1 — rephrase + 2–3 quick reply options
       └─→ User: [still unrecognized or escalation phrase]
            └─→ BOT: FALLBACK_2 — different language + top capabilities
                 └─→ User: [third failure or "talk to a person"]
                      └─→ BOT: ESCALATION — connect to human, share context
                           └─→ [HUMAN HANDOFF — session_id, summary, transcript]
```

#### Out-of-Scope Path (topic outside bot's domain)
```
User: [request the bot cannot handle]
  └─→ BOT: Acknowledge the request is outside scope
       └─→ BOT: Redirect to what the bot CAN do
            └─→ BOT: Offer alternative channel (link, email, phone)
                 └─→ User: [chooses alternative or returns to scope]
```

#### Error Recovery Path (API failure → graceful degradation)
```
BOT: [action attempted — API call fails]
  └─→ BOT: Friendly error message — no raw error codes exposed
       └─→ BOT: Retry button inline OR automatic retry in 3s
            ├─→ [Retry succeeds] → Resume flow from current state
            └─→ [Retry fails] → Escalation link + async alternatives (email/phone)
```

**Confidence threshold routing:**

| Confidence | Threshold | Action |
|---|---|---|
| High | ≥ 0.85 | Proceed; implicit confirmation for reversible actions |
| Medium | 0.60–0.84 | Selected-info confirmation: "Just to confirm, you want to [action]?" |
| Low | 0.40–0.59 | Disambiguation: top 2 intents as quick replies |
| Very low | < 0.40 | FALLBACK_1 flow |

---

### Section 3: Message UI Spec

Specs for every message type rendered in the chat window.

#### User Bubble
| Property | Value |
|---|---|
| Alignment | Right-aligned |
| Max width | 320px (or 80% of container, whichever is smaller) |
| Background | Brand accent color |
| Text color | White (verify contrast ≥ 4.5:1 against accent) |
| Border radius | 16px all corners, 4px bottom-right |
| Padding | 12px 16px |
| Timestamp | Show on tap/hover |

#### Bot Bubble
| Property | Value |
|---|---|
| Alignment | Left-aligned |
| Max width | 320px (or 80% of container) |
| Background | Neutral surface (gray-50 or system equivalent) |
| Text color | Primary text color |
| Border radius | 16px all corners, 4px bottom-left |
| Padding | 12px 16px |
| Avatar | Optional — show on first bubble of each bot turn only |
| Timestamp | Show on tap/hover |

#### System Message (status updates, session events)
| Property | Value |
|---|---|
| Alignment | Centered |
| Background | None (no bubble) |
| Text color | Muted / secondary text |
| Font size | 12px |
| Use for | "Session started", "Connecting to agent…", time dividers |

#### Error State
| Property | Value |
|---|---|
| Background | Warning/error surface color |
| Icon | Warning triangle (left of message text) |
| Text color | Error text color (ensure ≥ 4.5:1 contrast) |
| Retry action | Inline button — "Try again" |
| Escalation | Link below retry — "Contact support" |

**Spacing rules:**
- 4px between consecutive bubbles from the same sender
- 16px between turns (user → bot or bot → user)
- 24px above system messages

---

### Section 4: Component Library

Specs for each interactive component in the chat UI.

#### Typing Indicator
- Three-dot animated pulse: dots sequentially grow and fade in a loop
- **Show after**: 300ms of no response since the user's message — if the bot replies within 300ms, skip the indicator entirely (prevents flicker on fast responses)
- If no response within 1.5s of indicator appearing: show "still thinking…" label below dots
- Hide automatically when response arrives
- Accessible label: `aria-label="Assistant is typing"`

#### Quick Reply Chips
- Pill buttons rendered directly below the triggering bot message
- Height: 36px; padding: 8px 16px; border-radius: 999px
- **Max 5 visible** in horizontal scroll; 8px gap between chips
- Font: same as body text, medium weight
- **Disappear after tap** — ephemeral, not persistent navigation
- Tapped option text appears as a user bubble immediately (keeps conversation log coherent)
- Do not use for destructive actions without secondary confirmation
- Keyboard: Tab to focus, Enter or Space to select

#### Card Carousel
- Horizontal scroll of 3–5 cards; show 1.2–1.5 cards at once (peek pattern signals scrollability)
- Card width: 240–280px; image aspect ratio: 16:9 or 1:1 (pick one, don't mix)
- Card anatomy: image + title + description (max 2 lines, truncated) + 1–2 CTA buttons
- Navigation: swipe on mobile, arrow buttons on desktop, dot indicators below
- Accessible: Tab through cards, Enter to activate CTA; announce position ("Card 2 of 4")

#### Button Messages (standalone CTA)
- **Primary CTA**: full-width or fixed-width button, brand primary color, 44px height minimum
- **Link style**: underlined text link, brand accent color — for lower-priority actions
- Disable send button (not hide) while bot response is in progress
- Never display more than 2 button messages in a single bot turn

#### Input Bar
| Element | Spec |
|---|---|
| Height | 56px minimum |
| Text input | Flexible width; placeholder: "Type a message…" |
| Send button | Paper plane icon; disabled when input is empty; activates on Enter or tap |
| Persistent menu | ☰ icon left of input; contains top capabilities + restart + talk to human |
| Mic button | Include only if voice input is supported on this platform |

#### Empty State (first visit)
- Welcoming illustration: friendly, low-detail, brand-consistent
- Bot intro: 1–2 sentences. "Hi, I'm [Name]. I can help you [primary capability 1], [2], and [3]."
- 3–4 suggested prompt chips: highest-value intents for this assistant type
- Never show a blank chat window with no guidance

---

### Section 5: Error States

One designed response for each failure mode. Every error must have a next step — never end on an error.

| Error Type | User-Facing Message | UI Treatment | Next Step |
|---|---|---|---|
| Out-of-scope request | "That's outside what I can help with, but [redirect to what bot CAN do]." | Inline bot bubble | Offer 2–3 in-scope quick replies |
| API failure / 5xx | "Something went wrong on our end — it's not you." | Error state bubble + warning icon | Retry button + escalation link |
| Escalation trigger (2 failed attempts or explicit "human" request) | "I'm connecting you with someone who can help. I've shared our conversation so you won't need to repeat yourself." | System message + agent avatar | Show estimated wait time or async alternatives |
| Dead-end (no valid path after FALLBACK_2) | "I want to make sure you get the right help. How would you prefer to reach us?" | Bot bubble with channel options | Email / phone / live chat buttons |
| Session expired | "Your session timed out — let's start fresh." | Full-screen or banner message | Restart button |
| Rate limit hit | "You're moving fast! Give me just a moment to catch up." | Inline bot bubble | Auto-retry in 3s, no action needed |

**Escalation threshold**: trigger after 2 consecutive failed intents OR any message containing "human", "agent", "person", "speak to someone", or explicit frustration signals.

---

### Section 6: Accessibility Notes

Every element that reaches users must meet WCAG 2.1 AA minimum. These specs are not optional.

#### ARIA Roles and Live Regions
- Chat history container: `role="log"` + `aria-live="polite"` + `aria-label="Conversation"`
- New bot messages: announced by screen reader after current speech completes (polite, not assertive)
- Error messages: `aria-live="assertive"` — errors interrupt current screen reader activity
- Typing indicator: `aria-label="Assistant is typing"` + `aria-live="polite"`
- Quick reply chips: `role="button"` + descriptive `aria-label` (not just the chip text if context is needed)

#### Keyboard Navigation
- Tab order: persistent menu → text input → send button → quick reply chips (left to right) — matches visual left-to-right layout, satisfying WCAG 2.4.3 Focus Order
- Enter or Space: activates focused quick reply chip or button
- Escape: closes any open overlays (persistent menu, confirmation dialogs)
- Arrow keys: navigate within carousel (left/right arrow)
- No keyboard trap: Tab must never get stuck in the chat widget

#### Screen Reader Announcement Order
- Announcement sequence per new bot message: [timestamp] → [sender name, e.g., "Aria says:"] → [message content]
- Quick replies announced as: "[chip text], button, [position] of [total]"
- Carousel announced as: "Card [N] of [total]: [title]"

#### Focus Management
- When chat opens: move focus to input bar
- When new message arrives: do not move focus (use aria-live to announce); only move focus if user is idle
- After quick reply tap: focus returns to input bar
- After carousel navigation: focus follows the card

#### Touch Targets
- All interactive elements: minimum 44×44px tap target
- Quick reply chips: 36px height — pad the tap target to 44px with invisible hit area
- Spacing between tap targets: minimum 8px to prevent accidental activation

---

## What's Next

After generating this chatbot spec, consider these follow-up commands:

- `/design-voice-ui` — add a voice companion to this chatbot (wake word, SSML, confirmation patterns, hybrid screen layout)
- `/design-framework` — build the component library defined in Section 4 as a coded UI framework
- `/design-system` — generate design tokens (colors, spacing, border-radius, typography) for the chatbot components
