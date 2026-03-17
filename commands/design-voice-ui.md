---
description: "Design a voice interface — wake word flows, confirmation patterns, error recovery, screen companion layout (if hybrid), audio feedback guidelines."
argument-hint: "[product type] [platform: alexa|google|custom] [screen: voice-only|hybrid]"
allowed-tools: ["Read", "Write", "mcp__*"]
---

# /design-voice-ui

You are designing a complete voice user interface (VUI). Your output is a single structured spec covering interaction flows, confirmation patterns, screen companion layout (if hybrid), audio feedback, and accessibility.

## Input

Arguments: **$ARGUMENTS**

Parse the following from `$ARGUMENTS`:
- **Product type**: what the product does (e.g., smart home control, customer support, media playback, banking assistant)
- **Voice platform**: Alexa / Google Assistant / custom (default: custom)
- **Screen availability**: voice-only / hybrid (default: voice-only)

---

## Step 1: Load Knowledge Base

Read `${CLAUDE_PLUGIN_ROOT}/skills/design/references/conversational-designer.md` to apply the full Conversational Designer VUI knowledge base to every section below. Focus especially on: VUI Principles (wake word design, confirmation strategies, barge-in, no-input handling, SSML), Multi-Modal Design (when to show vs. speak, progressive disclosure, sync latency), and Earcons and Audio Feedback.

**MCP Fallback**: If the file cannot be read, proceed using inline knowledge. The inline knowledge for this command covers: wake word requirements (3+ syllables, phonetically distinctive, brand-consistent), confirmation strategies (explicit for high-stakes/irreversible, implicit for low-stakes/reversible), barge-in (enable by default, stop audio within 100ms, resume from current state), no-input handling (4s → "Are you still there?", 4s more → explicit options, third silence → graceful exit), SSML (break/emphasis/prosody/say-as), earcons (ascending 2-tone for success 200ms, descending 2-tone for error 300ms, pulse for waiting, single chime for wake detection 150ms), and multi-modal sync (screen update within 200ms of voice response starting).

---

## Step 2: Generate the Spec

Produce all five sections below as a single continuous output. Do not pause or ask for confirmation between sections.

---

### Section 1: Interaction Flow Diagrams

Four key conversation paths for the voice interface.

#### Success Flow (intent recognized, action completes)
```
User: [Wake word] — "Hey [assistant name]"
  └─→ SYSTEM: Wake word detected
       └─→ [Earcon: single chime 150ms] + [Listening indicator active]
            └─→ User: [core voice command]
                 └─→ SYSTEM: Intent recognized (confidence ≥ 0.85)
                      └─→ [Processing indicator]
                           └─→ BOT: [Implicit confirmation + action]
                                └─→ [Earcon: ascending 2-tone 200ms] + [Screen update if hybrid]
                                     └─→ [END or await follow-up]
```

#### Disambiguation Flow (multiple valid responses match)
```
User: [ambiguous command — top 2 intents within 15% confidence]
  └─→ SYSTEM: Disambiguation triggered
       └─→ BOT: "I want to make sure I help with the right thing.
                 Do you mean [Intent A] or [Intent B]?"
            └─→ [2 options only — max 2 choices per disambiguation prompt]
                 ├─→ User: clarifies → [proceed with selected intent]
                 └─→ User: still ambiguous → FALLBACK_1 (not a second disambiguation)
```

#### Not-Understood Flow (intent not recognized — 3-strike model)
```
User: [utterance — intent not recognized]
  └─→ FALLBACK_1: "I didn't quite catch that. You can say things like
                   '[capability 1],' '[capability 2],' or '[capability 3].'"
       └─→ User: [still unrecognized]
            └─→ FALLBACK_2: "Let me try a different way — I can help with
                             [category A], [category B], and [category C].
                             Which of those sounds closest to what you need?"
                 └─→ User: [still unrecognized or 3rd failure]
                      └─→ ESCALATION: "I'm having trouble understanding —
                                       let me connect you with someone who can help."
                           └─→ [Graceful exit or human handoff]
```

**Fallback rule**: Never repeat the same fallback phrase twice in a session. Rotate phrasing. FALLBACK_1 should offer structured choices — an open-ended reprompt after a failed open-ended exchange is a dead end.

#### Error Flow (service failure → graceful exit with alternative)
```
SYSTEM: [Action attempted — service call fails]
  └─→ [Earcon: descending 2-tone 300ms]
       └─→ BOT: "Something went wrong on my end — it's not you.
                 Want me to try again?"
            ├─→ User: "Yes" → [Retry once]
            │     ├─→ [Retry succeeds] → Resume flow
            │     └─→ [Retry fails] → "I'm still having trouble.
            │                          [Alternative: 'Try the app' / 'Call support' / 'I'll remind you later']"
            └─→ User: "No" / silence after 8s → Graceful exit offer
```

**No-input handling (silence during expected response):**

| Silence duration | Response |
|---|---|
| 4 seconds | "Are you still there? Take your time." |
| 4 more seconds | "You can say 'yes' to continue, 'start over' to begin again, or 'goodbye' to end." |
| Third silence | "I'll end our session now — [platform wake word] anytime." End gracefully. |

Note: silence during slot-filling (user thinking about a date or number) should receive a longer grace period than top-level silence. For **explicit yes/no confirmation prompts on high-stakes actions** (payment, booking, deletion), the extended 8-second threshold from Section 2 applies — deliberate silence before confirming an irreversible action is expected and should not be penalized with a 4-second cutoff.

---

### Section 2: Confirmation Patterns

Match confirmation weight to action weight. Over-confirmation destroys conversation flow; under-confirmation on irreversible actions destroys trust.

#### Explicit Confirmation (destructive, financial, or irreversible actions)
- **When**: payment, booking, deletion, account changes, any action that cannot be trivially undone
- **Pattern**: "You said [exact slot values restated]. Is that right?"
- **User response options**: "Yes" / "No" / "Change [slot]"
- **SSML treatment**: `<break time="300ms"/>` before the confirmation question; `<emphasis>` on the key values being confirmed
- **Example**: "You want to transfer $150 to savings. <break time="300ms"/> Is that right?"

#### Implicit Confirmation (low-stakes, reversible, high-confidence actions)
- **When**: playing media, setting timers, answering queries, read-only lookups
- **Pattern**: State the action as it happens — no question asked
- **Example**: "Playing jazz on the living room speaker." [music starts]
- **Rule**: Implicit confirmation is only appropriate when confidence ≥ 0.85 AND the action can be trivially reversed

#### Chained Commands (multi-step or multi-intent)
- Acknowledge each sub-step as it completes, not all at once at the end
- **Pattern**: "Table booked. <break time="200ms"/> Setting your reminder now..."
- Partial failure pattern: "I booked your table, but I wasn't able to set the reminder — want to try that separately?"
- Maximum 2 intents per utterance; if 3+ detected, surface a confirmation list before executing any

#### Timeout Confirmation (user goes silent during an expected response)
- After 8 seconds of silence when a yes/no is expected:
  - "Are you still there? Just say 'yes' to confirm or 'no' to cancel."
- After another 8 seconds: cancel the pending action, notify the user:
  - "I've cancelled that — just [wake word] when you're ready."

---

### Section 3: Screen Companion Layout (Hybrid Only)

Skip this section entirely if the parsed screen availability is **voice-only**. Generate this section only when `$ARGUMENTS` includes "hybrid" or a screen-based platform is indicated.

The screen companion is always secondary to voice — it provides detail and data that voice cannot efficiently deliver. It is never the primary interaction surface.

#### Layout Structure (full-screen companion view)

```
┌─────────────────────────────────────────┐
│  TOP BAR — Always-on listening indicator │
│  [Pulsing mic icon when active]          │
│  [Static mic icon when idle]             │
│  [Product name / assistant name]         │
├─────────────────────────────────────────┤
│                                          │
│  MAIN AREA — Last 3 conversational turns │
│  (most recent at bottom)                 │
│                                          │
│  [Turn 1: User utterance text]           │
│  [Turn 1: Bot response text]             │
│  [Turn 2: User utterance text]           │
│  [Turn 2: Bot response text]             │
│  [Turn 3: User utterance text — latest]  │
│  [Turn 3: Bot response — current]        │
│                                          │
├─────────────────────────────────────────┤
│  SUGGESTIONS STRIP — 3 context-aware     │
│  quick actions (tap or speak)            │
│  [Action 1]  [Action 2]  [Action 3]      │
├─────────────────────────────────────────┤
│  BOTTOM BAR                              │
│  [Manual input toggle]  [Mute button]    │
└─────────────────────────────────────────┘
```

#### Screen Sync Rules
- Screen must update within **200ms** of the voice response starting
- For streaming voice (TTS starts before full text is generated): begin screen update on first token received
- Screen content and voice content must always be consistent — never show contradictory information on the two channels
- When voice is unavailable (permission denied, mic off): remove all voice-dependent elements entirely; replace implicit voice confirmations with explicit screen confirmation dialogs; rewrite all copy that references speaking ("Say yes to confirm" → "Tap to confirm")

#### Progressive Disclosure Pattern
1. Voice triggers the action: "Show me my [data]"
2. Screen displays the list (3–5 items with key fields)
3. Voice acknowledges: "Here are your [N items] — tap any one for details"
4. User selects on screen
5. Screen expands to detail view; voice reads the key summary aloud

Never require the user to speak a full data entry (long address, long code) when a screen form would be faster.

---

### Section 4: Audio Feedback Guidelines

Non-speech audio cues (earcons) communicate state changes faster than speech. Every earcon must have a visual fallback for deaf/hard-of-hearing users.

#### Earcon Design Spec

| State | Earcon | Duration | Visual Fallback |
|---|---|---|---|
| Wake word detected / listening active | Single ascending chime | 150ms | Mic icon animates to active (pulsing ring) |
| Task completed successfully | Ascending 2-tone | 200ms | Success color flash on screen + check icon |
| Error or failure | Descending 2-tone | 300ms | Warning color + warning icon |
| Waiting / processing | Repeating pulse every 1.5s | Continuous until resolved | Spinning/pulsing indicator on screen |
| Option selected / button tapped | Soft click | 50–100ms | Button state change (pressed style) |

**Earcon rules:**
- Earcons must be distinct from OS notification sounds and from each other
- Never use an earcon as the only signal — always accompany with voice or visual confirmation
- Keep feedback earcons under 500ms; processing earcons may be continuous loops but must stop promptly when state resolves
- Earcon volume must respect device volume and user accessibility preferences

#### SSML Guidelines

Apply these SSML treatments to all synthesized voice responses:

```xml
<!-- Pause before key information — give user time to listen -->
<speak>
  Your appointment is confirmed. <break time="300ms"/>
  We'll see you on Friday at 3pm.
</speak>

<!-- Emphasis on important terms -->
<speak>
  Your balance is <emphasis level="moderate">$42.50</emphasis>.
</speak>

<!-- Speaking rate 90–110% of default for clarity -->
<speak>
  <prosody rate="95%">
    Here are the three options available to you.
  </prosody>
</speak>

<!-- Spell out codes, references, and abbreviations -->
<speak>
  Your reference number is
  <say-as interpret-as="characters">AX7Z</say-as>.
</speak>

<!-- Dates in natural spoken format -->
<speak>
  Booked for
  <say-as interpret-as="date" format="mdy">7/14/2025</say-as>.
</speak>

<!-- Pause between list items so user can track each one -->
<speak>
  You have three messages. <break time="300ms"/>
  One from Sarah. <break time="300ms"/>
  One from the system. <break time="300ms"/>
  And one from your manager.
</speak>
```

**SSML content-type guidelines:**

| Content Type | SSML Treatment |
|---|---|
| Confirmation numbers, codes | `say-as interpret-as="characters"` |
| Dates | `say-as interpret-as="date"` |
| Currency amounts | `say-as interpret-as="currency"` (SSML 1.1, Polly, Google TTS); fallback if unsupported: `interpret-as="cardinal"` + spell out "dollars and X cents" in text |
| Legal or terms copy | `prosody rate="slow"` |
| Lists (≤3 items) | `<break time="300ms"/>` between items |
| Emotional success moment | `prosody pitch="+5%"` for slight warmth |
| Key data user needs to remember | `<emphasis level="moderate">` |

**Barge-in rule**: Enable barge-in by default on all prompts. When the user speaks mid-bot-speech, stop audio within 100ms and process the new utterance. Resume from the current state, not the beginning of the flow.

---

### Section 5: Accessibility Notes

Voice-first design must not exclude users with disabilities. Every voice capability must have a non-voice equivalent.

#### Visual Fallback for All Audio Cues
- Every earcon must have a corresponding on-screen visual cue (see Section 4 earcon table)
- Caption display: show current bot speech as on-screen text simultaneously (for deaf/hard-of-hearing users)
- On hybrid screens: transcript of the last 3 turns is always visible (Section 3 main area)
- Never convey critical information through audio alone

#### Motor Accessibility (Hands-Free as Primary, Manual as Fallback)
- Voice is the primary interaction model — this is a feature, not a constraint
- Manual fallback (tap, type) must be available for every voice-initiated action
- Hands-free mode is not the same as motor-accessible mode: users with speech impairments need the manual path to be a full-capability alternative, not a stripped-down fallback
- Mute button must be reachable in one tap from any state (visible in bottom bar per Section 3)
- Manual input toggle must activate a full keyboard/touch input mode that mirrors all voice capabilities

#### Cognitive Load Limits
- Maximum **2 options** per disambiguation prompt — more than 2 causes cognitive overload in audio-only contexts
- Plain language throughout: no abbreviations spoken aloud, no jargon, no parenthetical clauses in synthesized speech
- Short sentences: target ≤15 words per sentence in voice responses (voice copy rule: write for the ear, not the eye)
- No back-to-back disambiguation questions: if a clarification itself triggers ambiguity, route to FALLBACK, not a second disambiguation
- Slot re-prompts must reference the specific error ("I didn't recognize July 45th") not a generic re-ask ("Please provide a date") — specific re-prompts have significantly higher completion rates

#### Platform-Specific Accessibility Compliance
- **Alexa**: support Alexa Accessibility features (closed captions, visual alerts, larger text on Echo Show)
- **Google Assistant**: comply with Google's accessibility guidelines; support Look and Talk on Nest Hub
- **Custom**: implement WCAG 2.1 AA for any companion screen; follow platform voice accessibility APIs

---

## What's Next

After generating this voice UI spec, consider these follow-up commands:

- `/design-chatbot` — design the text-based chat companion that pairs with this voice interface
- `/design-framework` — build the screen companion layout (Section 3) as a coded UI component
- `/design-system` — generate design tokens for the hybrid screen companion (colors, spacing, typography, animation timing)
