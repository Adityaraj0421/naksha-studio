# Privacy

Naksha collects **no telemetry**. It has no analytics, no usage pings, no crash reporting and no "anonymous" statistics. Naksha's own code (the hooks, scripts and command prompts) never sends anything about you, your project or your sessions anywhere.

## Where your data lives

Everything naksha remembers stays on your machine, in your project:

| File | What it holds | Written by |
|------|---------------|------------|
| `.naksha/project.json` | Project config, brand tokens, constraints, component patterns, browser findings, taste signals | `/naksha-init`, `/naksha-remember`, `/naksha-taste`, the Stop hook |
| `.naksha/memory.md` | Append-only decision log | Commands that make design decisions |
| `.naksha/session-brief.md` | A ≤ 2 KB summary of the above, rebuilt before each context compaction and read back after it | The PreCompact hook (`scripts/precompact-brief.sh`) |
| `~/.naksha/hook-errors.log` | Local error lines when the Stop hook cannot update `project.json` | The Stop hook |

You own these files. Commit `.naksha/` to share design memory with your team, or add it to `.gitignore` to keep it local. `session-brief.md` is regenerated, so it is safe to ignore even when the rest of `.naksha/` is committed. Deleting `.naksha/` erases naksha's memory of the project completely.

The SessionStart hook reads `.naksha/` and a few well-known config files (`package.json`, `tailwind.config.*`, `tsconfig.json` and similar) to give Claude a short project summary. It only reads them, and nothing leaves your machine except through Claude Code's own conversation with the model.

## What does reach the network

Naksha only reaches the network through tools you choose to use:

- **Claude Code itself** sends your conversation to the model provider you configured, as it does with or without naksha. Naksha's hooks add a short project index (≤ 600 characters) to that conversation, plus the ≤ 2 KB session brief after a compaction or on resume. They never add the full memory files.
- **MCP servers you connect** (Figma, Playwright, image generation and others) talk to their own services when a command uses them. Their privacy policies apply.
- **`packages/naksha-reel`** renders video with Remotion, which may download a headless browser and Google Fonts the first time it renders.
- **Paid eval runs (maintainers only)** call the Anthropic API under a sandbox (`evals/sandbox.json`, `scripts/lib/sandboxed-run.sh`). The sandbox allows only `api.anthropic.com` and switches off Claude Code's non-essential traffic.

## Future telemetry

If naksha ever adds telemetry, it will be **opt-in and off by default**. It will be documented in this file before it ships, it will say exactly what it sends, and nothing will be sent until you explicitly turn it on. A change to this policy will be called out in the CHANGELOG.

## Questions

Open an issue, or see [SECURITY.md](../SECURITY.md) for anything sensitive.
