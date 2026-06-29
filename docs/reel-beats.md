# Reel Beats — the `/design-reel` data contract

A **beat** is one on-screen moment in a design reel: a single specialist role's key
contribution, captioned. `/design-reel` turns a `/design` run into a share-able clip by
collecting 3–6 beats and rendering them (see `social/hero-reel/` for the seed template).

This doc is the contract between "naksha did a design" and "naksha rendered a reel of it."

## How beats are produced — extraction, not emission

**Beats are extracted by a dedicated pass, not emitted inline during `/design`.**

This is the single most important decision here, and it is backed by a spike (2026-06-26),
not a guess:

| Approach | Pass rate (≥3 clean distinct beats) | Failure mode |
|---|---|---|
| Passive — `/design` emits beats as it works | **38%** (3/8 pages) | **omission** — 3/8 emitted zero beats |
| Extraction — a focused pass reads the design output afterward | **100%** (5/5 pages) | none (0 malformed, avg 5.4 roles) |

The model reliably *does the design*; it unreliably *remembers to also annotate it* at the
end of a long task. So we don't ask it to. `/design` carries **no beat burden**. A separate,
single-purpose, **schema-forced** extractor reads the design output and returns the beats.
A single-job agent does its one job ~always.

> Do **not** reintroduce passive `<!-- naksha-beat -->` emission into `/design`. It was tested
> and it fails by omission 62% of the time.

## The extraction pass

Input: the full text/transcript of a completed `/design` run.
Instruction (single purpose):

> Extract the design team's process as reel beats — one per distinct specialist role that
> meaningfully contributed. Each caption is first-person, ≤95 characters, names the specific
> change that role made, no emoji. Return 3–6 beats in workflow order (strategy/Vision first,
> polish/Copy/Motion later).

Output is **schema-enforced** (a StructuredOutput / tool-call), so malformed output is
impossible by construction:

```json
{
  "beats": [
    {
      "role": "UI Designer",
      "fn": "Visual",
      "caption": "Times New Roman out, Inter in; labels to muted gray so the eye lands on one button",
      "focus": "type + form fields"
    }
  ]
}
```

| Field | Type | Rule |
|---|---|---|
| `role` | string | the specialist; normalized before render (see below) |
| `fn` | string | one-word function — canonical set: `Vision \| Flows \| Visual \| Tokens \| Copy \| Research \| Motion` |
| `caption` | string | on-screen line; first-person, ≤95 chars, no emoji |
| `focus` | string | short name of the element the change touched (drives the focus ring) |

Beats are rendered in array order; array order **is** scene order.

## Guardrails (all confirmed needed by the spike)

1. **Min-beat gate.** If the extractor returns fewer than 3 distinct roles, `/design-reel`
   aborts with a clear message — it does not ship a thin clip. (Residual safety net; the
   extraction pass hit ≥5 on every spike trial, but the gate stays.)
2. **Role normalization.** Extractors label roles inconsistently (`"Product/UX strategy"`,
   `"UI visual"`, `"Layout"`, `"Color"`). Map to naksha's canonical roles + `fn` before
   render so role cards and accent colors are stable. Keep a fixed `role → {label, fn, accent}`
   table in the template (see `social/hero-reel/src/spec.ts` for the accent map).
3. **Caption-length guard.** 2/8 passive trials produced captions >110 chars even when told
   ≤95. Truncate/validate in code; do not trust the length instruction.
4. **De-dupe by role.** The extractor occasionally emits two beats for one role; keep the
   stronger one (or allow at most one per role) so the clip reads as N distinct specialists.
5. **No code fences.** One trial wrapped output in a fence. The schema-forced extractor avoids
   this; if you ever parse free text, strip fences first.

## Caveat for implementation

The spike used single-response trial agents. A real `/design` session is longer and uses
tools, so before shipping, sample one **full** `/design` session once to confirm the design
output/transcript the extractor reads is reliably captured and available. The extraction
*logic* is proven; the *input plumbing* in a live session is the one untested seam.

## See also

- `social/hero-reel/` — hero clip #1 + the reusable Remotion template the beats render into.
- The design doc "naksha — Watch the Team" (`~/.gstack/projects/.../*-design-*.md`) — full
  feature design, "Step-0 Spike Results" section.
