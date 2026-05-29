# Pipeline Failure Modes

Reference for how `/pipeline run` handles errors, degraded environments, and step-level failures.

## Overview

Pipelines execute steps sequentially. Each step can either:
- **Succeed** → output flows to the next step
- **Fail** → behavior depends on the `on-error` setting
- **Skip** → for browser steps when Playwright is unavailable

---

## `on-error` Setting

Every pipeline YAML should declare an `on-error` value. Default if absent: `stop`.

| Value | Behavior |
|-------|----------|
| `stop` | Stop the pipeline at the failed step. Display a manual fallback. |
| `continue` | Log the failure, skip to the next step, pass what context is available. |

**When to use `continue`:** pipelines where individual steps are independent enhancements (e.g., a `design-review` step that's informational — the design was already produced by step 1). If the rest of the pipeline can deliver value without the failed step's output, use `continue`.

**When to use `stop` (default):** pipelines where each step's output is required as input for the next. A failed `/design` step means nothing downstream can proceed.

---

## Failure Modes by Step Type

### `command:` step failures

**What counts as a failure:**
- The command produces no output (empty response)
- The command explicitly reports an error (e.g., "MCP unavailable", "file not found")
- The command times out

**Behavior with `on-error: stop`:**
```
✗ Step N failed — /<command> did not complete.
  Reason: [error reason if detectable]
  Pipeline stopped at step N of TOTAL.

Manual fallback — run each remaining step manually:
  N.   /<command> [previous context as input]
  N+1. /<next-command> [output from above as input]
  ...
```

**Behavior with `on-error: continue`:**
```
⚠  Step N: /<command> failed — continuing with available context.
   Downstream steps will not have this step's output.
```

---

### `browser:` step — Playwright unavailable

Browser steps fail softly when Playwright MCP is not running. This is treated as a **skip**, not a hard failure, regardless of `on-error`.

```
⚠  Step N/TOTAL: SKIPPED — Playwright not available.
   Browser capture requires the Playwright MCP server.
   Continuing pipeline without browser context.
```

The next step runs without browser findings as context. If the downstream step has `memory_read: ["browser_findings"]`, it will use any previously captured findings in `.naksha/project.json`, or proceed without them if none exist.

**Installing Playwright MCP:**
```bash
npx @playwright/mcp@latest
```
Then add it to your Claude Code MCP config and restart.

---

### `browser:` step — Navigation failure

When Playwright is available but the URL fails to load (network error, 404, timeout, CAPTCHA):

**Behavior with `on-error: stop`:**
```
✗ Step N failed — browser could not navigate to {url}.
  Reason: {error message}
  Pipeline stopped.
```

**Behavior with `on-error: continue`:**
```
⚠  Step N: browser capture failed for {url} — {reason}.
   Continuing without browser context.
```

Common causes and fixes:
| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Timeout | Slow server or JS-heavy SPA | Retry; or use `--screenshot` with `/naksha-browse` instead |
| 403/blocked | Site blocks headless browsers | Use a different reference URL; some sites (e.g., Twitter) require login |
| CAPTCHA | Bot detection triggered | Provide a static screenshot via `--screenshot` flag |
| DNS error | URL typo or offline server | Check URL; for inspect mode, confirm dev server is running |

---

### Memory write failures (Stop hook)

When a step emits a `<!-- naksha-memory-update -->` block and the Stop hook fails to process it:

- The failure is logged to `~/.naksha/hook-errors.log`
- The pipeline session continues normally — the block is skipped, not fatal
- `memory.md` entries written directly (via Write tool) are unaffected

**To diagnose:**
```bash
cat ~/.naksha/hook-errors.log
```

Common causes: malformed JSON in the block, unknown path in the schema, `.naksha/project.json` not writable.

---

## Manual Fallback Format

When a pipeline stops early, the orchestrator generates a manual runbook for the remaining steps:

```
Manual Fallback — run each command in order:

  N.   /<command> [use the brief from the failed pipeline run]
  N+1. /<command> [use output from above as context]
  ...
```

The manual fallback is always dynamically generated from the actual pipeline's remaining steps. It does not include `browser:` steps (those require pipeline orchestration); instead it notes:
```
  (Step N was a browser capture — run /naksha-browse {url} first, then proceed)
```

---

## Edge Cases

### Pipeline not found
```
Pipeline '<name>' not found. Run `/pipeline list` to see available pipelines.
```
Check spelling. User pipelines live in `.naksha/pipelines/`; built-in pipelines in `skills/design/pipelines/`.

### No `.naksha/project.json` when `memory_read:` is set
Steps with `memory_read:` silently skip context injection if no project file is found. The step runs without that context. No error, no warning (this is the v4 graceful degradation path).

### Empty `$INPUT` for step 1
If the user provides no brief and the first step needs `args: "$INPUT"`, the orchestrator asks:
> "What's the brief for this pipeline run?" before executing.

### Pipeline YAML parse error
If a YAML file is malformed and cannot be parsed:
```
✗ Could not parse pipeline '{name}'. YAML may be malformed.
  Run `/pipeline show <name>` to inspect the file.
```

---

## Debugging Checklist

If a pipeline produces unexpected results:

- [ ] Run `/pipeline show <name>` — verify steps and memory fields are as expected
- [ ] Run `/naksha-doctor` — check Playwright, Figma, and Stitch MCP availability
- [ ] Check `~/.naksha/hook-errors.log` for memory write failures
- [ ] Run the failing step in isolation to isolate the issue
- [ ] For browser steps, run `/naksha-browse {url}` directly to test Playwright
- [ ] For context issues, run `/naksha-status` to verify project memory is populated
