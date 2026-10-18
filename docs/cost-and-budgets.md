# Cost Tracking and Budgets

`/naksha-stats` shows how many tokens naksha commands use and what that would cost at API list prices. You can also set a monthly budget and per-run budgets that `/design-reel` and `/pipeline` check before they start.

```bash
node scripts/naksha-stats.js                   # current project, all time
node scripts/naksha-stats.js --since 2026-10-01
node scripts/naksha-stats.js --all --json      # every project, machine-readable
node scripts/naksha-stats.js --budget-check --command /design-reel
```

## What is measured

Claude Code keeps a transcript of every session on disk, one JSON object per line:

```
~/.claude/projects/<project path, non-alphanumerics replaced by "-">/<session-id>.jsonl
~/.claude/projects/<...>/<session-id>/subagents/agent-<id>.jsonl      (subagent work)
```

`$CLAUDE_CONFIG_DIR/projects` (comma-separated list allowed) and `~/.config/claude/projects` are searched too; `--logs-dir <dir>` overrides all of them.

The script uses these fields and ignores everything else:

| Line | Fields used |
|------|-------------|
| `"type": "assistant"` | `message.usage.input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `cache_creation.ephemeral_1h_input_tokens` (1-hour cache writes), `usage.speed` (fast mode), `message.model`, `message.id`, `requestId`, `timestamp`, `sessionId`, `cwd` |
| `"type": "user"` | `<command-name>/…</command-name>` in `message.content` (or a prompt that starts with `/name`), plus `isSidechain`, `isMeta`, `toolUseResult`, `timestamp`, `uuid`, `sessionId`, `cwd` |

Claude Code writes one line per content block, so one API response can appear on several lines with the same `message.id` and `requestId`. Those lines are merged, keeping the largest value of each counter (the last block carries the final `output_tokens`). Merging also stops resumed sessions, which copy earlier messages, from being counted twice.

**Attribution:** each API call belongs to the most recent human prompt in the same session (subagent calls included). If that prompt invoked a naksha command (`/design-reel`, `/naksha:design-reel`, …), the cost goes to that command; `/pipeline` gets the cost of every step it runs. Everything else is listed as **unattributed**, with the reason: a plain prompt, a non-naksha slash command, no earlier prompt (e.g. a trimmed or resumed transcript), or no timestamp.

**Skipped lines:** lines that are not valid JSON, and assistant lines whose `usage` is unreadable, are skipped and counted in the output. Unknown line types are ignored. The format is not a documented API and can change between Claude Code versions. If the numbers suddenly drop to zero, the format probably changed.

## Prices

Prices come from `meta/model-prices.json` (format `naksha-model-prices/1`, loaded by `scripts/lib/pricing.js`):

```json
{
  "source": "https://platform.claude.com/docs/en/about-claude/pricing",
  "as_of": "2026-10-18",
  "models": {
    "claude-opus-5-5": { "input": 4, "output": 20, "cache_write": 5, "cache_write_1h": 8, "cache_read": 0.2, "fast_multiplier": 2 }
  },
  "aliases": { "claude-opus-4-0": "claude-opus-4" }
}
```

- Rates are USD per million tokens. `cache_write` is the 5-minute cache write rate. The optional fields are `cache_write_1h`, `fast_multiplier`, `long_context` (a higher tier above `threshold_tokens` prompt tokens), and a per-model `source` / `as_of`.
- Mark any value you could not verify with `"placeholder": true`; the report then says how much of the total came from placeholder prices.
- Model ids are matched after removing Bedrock/Vertex prefixes and suffixes, `[1m]`-style tags and trailing dates.
- To use a different table, pass `--prices <file>` or set `NAKSHA_PRICES=<file>`.
- When prices change, update the numbers, `as_of`, and `source`, then run `node --test scripts/test/`.

## Accuracy: estimates, not invoices

- **List prices only.** The 1.1× US-only inference multiplier, Batch API discounts, server-tool fees (web search, code execution) and negotiated discounts are not included. Bedrock and Vertex AI pricing differs.
- **Subscription plans** (Pro, Max, Team, Enterprise) are not billed per token. For them the figure is the API-equivalent value of the usage, which is useful for comparing commands, not what you paid.
- **Unknown models** are reported as unpriced and count as $0, so the total is understated until you add them to the table.
- **Attribution is best effort.** Prompts typed while a command is still running, and work across resumed sessions, can land in the wrong bucket. Pipeline steps are not broken out individually.
- **Time ranges and months are in UTC.**
- Claude Code may delete old transcripts (see its `cleanupPeriodDays` setting), so all-time totals only go back as far as the files that are still on disk.

## Budgets

Add an optional `budgets` object to `.naksha/project.json`, either by hand or with `/naksha-stats budget 20 /design-reel=1.5 warn 0.8`:

```json
"budgets": { "monthly_usd": 20, "per_command_usd": { "/design-reel": 1.5 }, "warn_at": 0.8 }
```

| Status | Monthly budget | Per-command budget |
|--------|----------------|--------------------|
| `WARN` | this month's spend ≥ `warn_at` × limit | this month's most expensive run ≥ `warn_at` × limit |
| `OVER BUDGET` | spend > 100% of the limit | a run cost more than the limit |

Budgets count the current project only and reset each calendar month (UTC). They only warn: `/design-reel` and `/pipeline` show the warning and ask before starting, and nothing is ever blocked. Field spec: [naksha-memory-schema.md](naksha-memory-schema.md#v6-field-additions-budgets-optional).

## Privacy

- **Everything stays on your machine.** The script only reads local files. It makes no network requests and has no dependencies.
- It reads transcript lines to get token counts, model names, timestamps and slash-command names. It never prints or stores message content, and `/naksha-stats` is told not to quote it either.
- `--json` output has only aggregates: token counts, costs, command names, session ids and file/line counts.

## Exit codes

`0` always, including when no transcripts are found, a budget is exceeded, or the price table is broken (the error is printed instead). `2` only for invalid command-line arguments.
