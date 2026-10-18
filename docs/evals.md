# Naksha Evals: Tiers, Weights, and Budgets

`evals/evals.json` holds one eval per scenario: a prompt, the output we expect, and a list of assertions. `scripts/eval-runner.js` grades those assertions in three tiers. The free tier runs on every PR. The two paid tiers drive headless Claude Code and run only when you turn them on.

Every field described here is optional. Specs written before tiers existed still validate, and the runner fills in the defaults below.

## Tiers

| Tier | Cost | What it grades | Runs when |
|------|------|----------------|-----------|
| `structural` | $0, offline | Spec validity (shape, ids, fixture references, command coverage, the fields on this page), plus every deterministic `check` that can be evaluated against the repo or an eval's fixture | Always. `bash scripts/run-evals.sh` calls it, so CI runs it on every PR |
| `e2e` | Paid | Deterministic `check`s against live output: the eval prompt runs through `claude -p` in a temp working dir with this repo loaded as a plugin | `NAKSHA_EVALS_PAID=1` and `ANTHROPIC_API_KEY` are set |
| `judge` | Paid | Prose assertions, graded by a model reading the eval's fixture, or a fresh generation when the eval has no fixture | `NAKSHA_EVALS_PAID=1` and `ANTHROPIC_API_KEY` are set |

Without both variables, a paid tier prints the exact `claude` commands it would run and exits 0. `--dry-run` never executes anything, in any tier.

## Schema

### Eval fields

| Field | Type | Default | Meaning |
|-------|------|---------|---------|
| `id`, `name`, `prompt`, `expected_output`, `command`, `files`, `assertions` | | | Unchanged. `command` (or a prompt starting with `/<command>`) ties the eval to a slash command |
| `threshold` | number, 0–1 | `1.0` | Fraction of weighted assertions that must pass. `1.0` means every graded assertion must pass |
| `budget_usd` | number > 0 | none | Cost cap for this eval. A dry run refuses when the estimate exceeds it, and paid runs pass it to `claude --max-budget-usd` |
| `fixture` | string | none | Pre-captured output this eval is graded against. A bare file name means `evals/fixtures/<name>`; a path containing `/` is relative to the repo root. The file must exist |

### Assertion fields

| Field | Type | Default | Meaning |
|-------|------|---------|---------|
| `name`, `description` | string | required | Unchanged. The judge grades from `description` |
| `tier` | `structural` \| `e2e` \| `judge` | `e2e` if `check` is set, else `judge` | Which tier grades this assertion |
| `weight` | number ≥ 0 | `1` | Share of the eval's score. `0` keeps an assertion visible without letting it affect pass/fail |
| `check` | object | none | Deterministic matcher. Required for `structural` and `e2e`, and not allowed on `judge` |

Every assertion written before tiers existed is a prose description with no `check`, so it defaults to `judge` with weight 1. All 179 existing evals keep working unchanged.

### Checks

| `type` | Fields | Passes when |
|--------|--------|-------------|
| `contains` | `value`, optional `case_sensitive` (default `false`) | The text contains `value` |
| `regex` | `value` (pattern), optional `flags` (default `"i"`) | The pattern matches the text |
| `file-exists` | `path` | The file exists (see "What a check reads" below) |
| `json-path` | `path` such as `$.tokens.color[0]`, optional `equals` | The text parses as JSON (or holds a fenced `json` block) and the path exists, and if `equals` is given, the value at the path equals it |

Every check also accepts:

- `not: true`, which inverts the result.
- `file` (all types except `file-exists`), which reads that file instead of the output text.

Paths cannot escape their base directory.

### What a check reads

| Tier | Text under test | `path` / `file` resolve against |
|------|-----------------|---------------------------------|
| `structural` assertion | the eval's `fixture` | repo root |
| `e2e` assertion, replayed in the structural tier | the eval's `fixture` (skipped when there is no fixture, or when the check uses `file` / `file-exists`) | not replayed |
| `e2e` assertion, live | Claude's final reply | the temp working dir (files the run wrote) |

A `structural` text check needs either `check.file` or an explicit `fixture`. The runner rejects one that has neither.

## Scoring

For each eval, the runner only counts assertions that the current tier can grade:

```
score  = sum(weight of passing assertions) / sum(weight of graded assertions)
passed = score >= threshold
```

Assertions the tier cannot grade are left out of both sums, so a judge-only assertion never fails the structural tier. If an eval has no graded weight in a tier, that tier skips it.

Example: weights 3, 1, 2 and the weight-1 assertion fails. The score is 5/6 ≈ 0.83, so the eval fails the default threshold of 1.0 and passes `"threshold": 0.8`.

## Fixtures

Only an explicit `fixture` is graded. The files in `evals/fixtures/<command>-output.md` were each captured from one prompt, and several evals share a command. If the runner graded every eval for a command against that one file, most of those evals would be judged on output from a different prompt. Set `fixture` only on the eval whose prompt actually produced the file.

The runner still uses the command's fixture to size the output-token estimate for evals that do not set `fixture`.

Fixtures that are empty or still begin with the `# FIXTURE NEEDED` sentinel are treated as missing.

## Costs and budgets

`evals/prices.json` pins per-model $/MTok input and output prices. Each price records its `source` and `as_of` date and is marked `sourced` or `placeholder`. The runner never fetches prices. Picking a model with `--model` that is not in the table is an error (exit 2), not a guess.

Estimates (`--dry-run`, and the check before any paid run):

- Generation: `(e2e_overhead_tokens + prompt + command file + files[]) × e2e_turns` input tokens. Output tokens come from the fixture length, or `default_output_tokens` when there is no fixture.
- Judge: `judge_overhead_tokens + grading prompt + candidate` input tokens, and `judge_output_tokens_base + per_assertion × n` output tokens.
- Tokens are estimated as characters ÷ `chars_per_token`. These heuristics live under `estimates` in `prices.json` and are placeholders. Replace them with numbers measured from a real run.

The run budget is the first of: `--budget`, `NAKSHA_EVALS_BUDGET`, then `defaults.run_budget_usd` (5 USD). For the structural tier, the budget is only `--budget`, and the cost is always $0. The run refuses with exit 3 when:

- the total estimate exceeds the run budget, or
- any eval's estimate exceeds its `budget_usd`.

During a paid run, the runner charges the `total_cost_usd` that Claude reports. When the remaining budget runs out, it stops before the next eval and exits 3.

## Running

```bash
node scripts/eval-runner.js                                  # structural, $0
node scripts/eval-runner.js --tier judge --dry-run           # plan + estimate
node scripts/eval-runner.js --tier judge --filter /design-review --dry-run --budget 1
NAKSHA_EVALS_PAID=1 node scripts/eval-runner.js --tier e2e --filter 42 --budget 2 --keep-workdirs
node scripts/eval-runner.js --tier judge --dry-run --json    # machine-readable report
```

| Option | Meaning |
|--------|---------|
| `--tier` | `structural` (default), `e2e`, or `judge` |
| `--filter` | Comma-separated eval ids, commands (`/design` or `design`), or name substrings |
| `--dry-run` | List what would run and its estimated cost. Never executes |
| `--budget <usd>` | Run budget |
| `--model <id>` | Model for the tier: generation for e2e, grader for judge. Must be in `prices.json` |
| `--json` | One JSON report on stdout |
| `--evals`, `--prices` | Alternative spec or price files. A `prices.json` next to the spec is picked up automatically |
| `--keep-workdirs` | Keep the paid-tier temp dirs for inspection |

Exit codes: `0` pass or nothing to do, `1` an eval or the spec failed, `2` usage error, `3` refused or stopped by a budget.

| Variable | Effect |
|----------|--------|
| `NAKSHA_EVALS_PAID=1` | Allow paid tiers to execute |
| `ANTHROPIC_API_KEY` | Required for paid tiers. Judge calls use `claude --bare`, which reads only this key |
| `NAKSHA_EVALS_BUDGET` | Default run budget in USD |
| `NAKSHA_EVALS_CLAUDE_BIN` | Path to the `claude` binary. Tests point this at a stub |

### What the paid tiers invoke

- **Generation** (each `e2e` eval, plus each `judge` eval without a fixture) runs in a fresh temp dir with the prompt on stdin. If the prompt does not already start with the eval's command, the runner prefixes it:
  `claude -p --output-format json --model <m> --plugin-dir <repo> --permission-mode acceptEdits --no-session-persistence [--max-budget-usd <cap>]`
- **Judge** sends a grading prompt that lists only the judge-tier assertions and wraps the candidate output in `<candidate_output>` tags, which the grader is told to treat as data:
  `claude -p --bare --output-format json --model <m> --tools "" --no-session-persistence --json-schema <verdict schema> [--max-budget-usd <cap>]`

  The grader returns `{"assertions":[{"name","pass","reason"}]}`. An assertion with no verdict counts as failing.

## Example

```json
{
  "id": 7,
  "name": "design-system-tokens",
  "command": "/design-system",
  "prompt": "Create a design system for a fintech dashboard",
  "fixture": "design-system-output.md",
  "threshold": 0.8,
  "budget_usd": 0.75,
  "assertions": [
    { "name": "defines-tokens", "description": "Defines color and spacing tokens",
      "check": { "type": "regex", "value": "--color-[a-z]+" }, "weight": 2 },
    { "name": "no-placeholder-copy", "description": "No lorem ipsum",
      "check": { "type": "contains", "value": "lorem ipsum", "not": true } },
    { "name": "command-file-present", "description": "Command file exists",
      "tier": "structural", "check": { "type": "file-exists", "path": "commands/design-system.md" } },
    { "name": "coherent-scale", "description": "Spacing follows a consistent scale", "weight": 2 }
  ]
}
```

How each tier grades this eval:

- **Structural**, free on every PR: replays the regex and the `not contains` check against the fixture and checks that the command file exists.
- **e2e**: runs the regex and `not contains` checks against fresh output.
- **judge**: grades `coherent-scale` from the fixture.

## Tests

```bash
node --test scripts/test/
```

These tests cover:

- schema defaults
- threshold and weight math
- dry-run estimates
- budget refusal
- paid-tier gating
- e2e and judge orchestration against a stub `claude`

The tests make no network calls.
