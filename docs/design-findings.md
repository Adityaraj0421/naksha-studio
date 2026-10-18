# Design Findings Format

`/design-review` writes its findings to `naksha-review/findings.json` as well as the readable report. The file records what was reviewed, which dimensions were covered, and every finding with its evidence. Each finding also carries a verdict from a verifier that did not write it.

- Schema: [`schemas/design-findings.schema.json`](../schemas/design-findings.schema.json)
- Validator: `node scripts/validate-findings.js <file> [--json]`
- Example: [`scripts/test/fixtures/findings/valid-full.json`](../scripts/test/fixtures/findings/valid-full.json), a review of `evals/fixtures/test-page.html`

## Why verdicts

A reviewer that only claims problems makes predictable mistakes: a contrast ratio copied from a code comment, a selector that no longer exists, a "missing focus style" that a `:focus-visible` rule elsewhere already handles. `/design-review` therefore hands each finding to a fresh subagent. The verifier sees only the target and the finding's evidence, not the reviewer's reasoning, and tries to disprove it by re-measuring. The report lists only what survives.

## Top-level fields

| Field | Required | Meaning |
|-------|----------|---------|
| `schema_version` | yes | Always `"1.0"` for this format |
| `target` | yes | `kind` (`file`, `url`, `figma`, `screenshot`, `preview`), `location`, optional `viewports` such as `"1440x900"` |
| `generated_at` | yes | ISO 8601 date-time with timezone |
| `generator` | no | Command or agent that wrote the file, e.g. `/design-review` |
| `coverage` | yes | The coverage ledger: all nine dimensions, each `checked` or `skipped` |
| `verification` | yes | `mode` and optional `completed_at` (see below) |
| `findings` | yes | Array of findings; may be empty |

### Coverage ledger

Every one of these dimensions must appear: `accessibility`, `visual_hierarchy`, `typography`, `color`, `spacing`, `content`, `interaction_states`, `responsive`, `tokens`.

```json
"responsive": { "status": "skipped", "reason": "Single screenshot at one viewport" }
```

A `skipped` entry needs a `reason`. An optional `notes` field records what was checked. A finding may only use a dimension marked `checked`, so a report cannot skip a dimension and still claim findings in it.

### Verification mode

| `mode` | Meaning |
|--------|---------|
| `isolated-subagent` | A fresh subagent verified each finding with only the target and the finding's evidence |
| `same-context` | No subagent tool was available; the reviewer re-checked in a separate pass. This is weaker, and the report says so |
| `not-run` | Not verified yet. Every verdict must be `needs_validation` |

## Finding fields

| Field | Required | Meaning |
|-------|----------|---------|
| `id` | yes | `F-001`, `F-002`, … unique in the file |
| `dimension` | yes | One of the nine dimensions |
| `severity` | yes | `critical`, `major` or `minor` |
| `title` | yes | One-line statement of the problem |
| `criterion` | no | Rule or standard, e.g. `WCAG 1.4.3 Contrast (Minimum)` |
| `evidence` | yes | `locator` (required: selector, `file:line`, Figma node or screen region) plus any of `file`, `line`, `snippet`, `screenshot`, `measurement` |
| `recommendation` | yes | The specific fix |
| `owner_role` | yes | A role `name` from `adapters/roles.json`, e.g. `UX Researcher` |
| `verdict` | yes | `confirmed`, `needs_validation` or `rejected` |
| `verification` | yes | `reproduced` (boolean), `note`, optional `remeasured` |

A `measurement` holds a number someone else can re-check:

```json
"measurement": {
  "metric": "contrast-ratio",
  "value": 4.48,
  "threshold": 4.5,
  "method": "WCAG relative luminance, #777777 on #ffffff, 14px regular"
}
```

## Verdicts

| Verdict | Meaning | `reproduced` | In the report |
|---------|---------|--------------|---------------|
| `confirmed` | The verifier re-checked the evidence itself (found the element, re-measured the value) and it breaks the stated rule | `true` | Listed under Critical / Improvements / Minor |
| `needs_validation` | Could not be proved or disproved: subjective judgement, runtime state, user testing, or a tool the verifier lacked | either | Listed separately, with what would settle it |
| `rejected` | The verifier has counter-evidence: the locator does not exist, the re-measured value passes, or an alternative already meets the requirement | `false` | Not listed; only the count is reported. Rejected findings do not lower scores |

The `note` says what the verifier re-checked and what it found, for example: "Recomputed #888888 on #1a1a2e: 4.81:1, which passes 4.5:1 for 18px text. The 3.1:1 figure came from a source comment."

## Validator rules

`scripts/validate-findings.js` has no dependencies. It reads the schema and checks types, required fields, enums, patterns and date-times, and rejects unknown fields. It then applies the rules the schema cannot express:

1. `owner_role` exists in `adapters/roles.json` (with a "did you mean" hint for near misses)
2. Finding ids are unique
3. Each finding's `dimension` is marked `checked` in `coverage`
4. `confirmed` requires `reproduced: true`; `rejected` requires `reproduced: false`
5. With `verification.mode: "not-run"`, every verdict is `needs_validation`

| Exit code | Meaning |
|-----------|---------|
| `0` | Valid |
| `1` | Invalid; each problem is printed with its JSON pointer, e.g. `/findings/2/owner_role` |
| `2` | Usage or environment error: no file, unreadable file, unknown option, schema or roles missing |

`--json` prints `{ file, valid, errors[], summary }`. `summary` counts findings by verdict and severity and lists checked and skipped dimensions. `/design-review` uses it for the report header.

Tests: `node --test scripts/test/`.

## Changing the format

The validator implements only the schema keywords the schema uses (`type`, `enum`, `const`, `required`, `properties`, `additionalProperties`, `items`, `minLength`, `minimum`, `pattern`, `format: date-time`, local `$ref`, `if`/`then`). It throws on any other keyword, so a schema edit cannot be silently ignored. A breaking change bumps `schema_version`.
