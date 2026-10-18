# naksha v6 "Naksha Live" — build handoff

Living status of the v6 build so work can continue anywhere — this cloud session, another session, or a local Claude Code (`claude` in a clone of this repo). Updated as features land on `v6/integration`.

## How to continue locally

```bash
git clone https://github.com/Adityaraj0421/naksha-studio.git && cd naksha-studio
git checkout v6/integration          # everything finished so far
claude                               # or: claude remote-control (shows up in the Claude Code app)
```

Then, for each feature still marked **not on integration** below, give Claude its brief (section "Feature briefs") and ask it to build it on a branch `v6/<slug>` from `v6/integration`, following the rules in "Rules for every feature". Merge finished branches into `v6/integration` and run the checks in "Integration checklist".

## Status

| # | Feature | Phase | Branch | Status |
|---|---|---|---|---|
| 4 | Verified design-review findings | 1 | `v6/verified-findings` | ✅ on integration |
| 2 | Tiered, weighted evals + $0 dry run | 1 | `v6/tiered-evals` | ✅ on integration |
| 1 | Free no-LLM design linter (`/design-detect` + hook) | 1 | `v6/design-linter` | building |
| 9 | Role quality contracts + transcript diagnosis | 1 | `v6/role-contracts` | building |
| 5 | DESIGN.md compatibility | 1 | `v6/design-md` | building |
| 3 | Bounded browser self-check | 2 | `v6/browser-self-check` | ✅ on integration |
| 6 | Cost tracking + budgets (`/naksha-stats`) | 2 | `v6/cost-budgets` | building |
| 10 | Lean, safe runtime (PreCompact brief, compact SessionStart, sandbox, privacy) | 2 | `v6/lean-runtime` | building |
| 7 | Naksha Live dashboard + event stream + org chart (optional, recommended) | 3 | `v6/live-dashboard` | building |
| 8 | Votes → judge calibration + evidence-backed taste | 3 | `v6/votes` | building |

"building" branches live only in the cloud session until they land here; if that session ends first, rebuild them locally from their briefs.

## Rules for every feature

- Branch from `v6/integration`; commit there; open no separate PR (integration gets one).
- Commands are markdown prompt files (`commands/*.md`, frontmatter `description:` + `allowed-tools:`); scripts are zero-dependency Node (CommonJS) or bash; read `CONTRIBUTING.md`.
- Integration-owned files — only touch during integration: `meta/stats.json` (except `knowledge_lines` for #9), `README.md`, `site/index.html`, `commands/naksha-help.md`, `CHANGELOG.md`, `evals/evals.json`, `.claude-plugin/*.json`, `install.sh`, `docs/plugin-directory-submission.md`, `adapters/*`, the command table in `skills/design/SKILL.md`.
- New eval specs go in `evals/proposed/<slug>.json` (evals.json shape, no `id`); integration merges them with new ids.
- Hooks must pass `scripts/hook-smoke.sh` (path with spaces, no exec bit, exit 0, valid JSON stdout); invoke as `bash|node "${CLAUDE_PLUGIN_ROOT}/…"`, quoted.
- Clean-room only: reimplement ideas, never copy code/text. Don't look at code from context-mode (ELv2), claudecodeui (AGPL) or disler's observability repo (no license). Keep Apache-2.0 NOTICEs if code is ever reused.
- Telemetry: none. Everything stays in the project's `.naksha/`.

## Feature briefs

**#1 Free design linter** — extend `scripts/design-lint.js`: deterministic rules (WCAG AA contrast, spacing off `constraints.grid`, type-scale sprawl, missing reduced-motion/focus-visible, img alt, clickable divs, hardcoded colors, a few self-defined "AI-slop" clichés); CLI `--json`, exit 0/1/2; keep CI mode (`CHANGED_FILES`) and fix "100/100" when nothing was linted; `/design-detect` command; a PostToolUse (Write|Edit) hook that lints UI files and never blocks; `node:test` tests with fixtures.

**#9 Role quality contracts** — add `## Quality Contract` (Red flags / Excuses to reject / Evidence of done) to all 28 `skills/design/references/*.md`; a structural check that fails if missing; `/naksha-doctor --transcripts` finds misrouted roles in local session transcripts and writes proposed regression evals to `.naksha/proposed-evals.json`; update `knowledge_lines`.

**#5 DESIGN.md** — implement the real google-labs-code/design.md format (verify the spec first) in `scripts/design-md.js` (parse, export dtcg|css|tailwind, from-tokens, lint with WCAG contrast); `/design-system` imports/exports DESIGN.md; persist `.naksha/design-system/MASTER.md` + `pages/<page>.md` overrides; `/design` reads them; tests; `docs/design-md.md`.

**#3 Browser self-check** — `skills/design/procedures/browser-self-check.md`: serve over http, at 375/768/1440 check the accessibility snapshot + linter first, screenshots only in opt-in visual mode, fix→recheck max 3 rounds, structured JSON result, degrade without Playwright MCP; wire into `/design` (with `--no-check`) and `/design-qa`; a check that referenced procedures exist.

**#6 Cost + budgets** — `scripts/naksha-stats.js` parses local Claude Code transcripts' token usage (verify fields; parse defensively), prices via a pinned table (unify with `evals/prices.json`), attributes cost to /commands; `budgets` in `.naksha/project.json` with warn/over thresholds; `/naksha-stats`; short pre-flight warnings in `/design-reel` and `/pipeline`; tests with synthetic JSONL.

**#10 Lean runtime** — PreCompact hook writes ≤2 KB `.naksha/session-brief.md`; SessionStart injects a compact (≤ ~600 chars) memory index and restores a fresh brief on compact/resume (verify the hooks contract first; keep the #17 fixes); `evals/sandbox.json` + `scripts/lib/sandboxed-run.sh` (runs paid evals under `srt`, refuses otherwise unless `NAKSHA_ALLOW_UNSANDBOXED=1`); `docs/privacy.md`; tests.

**#7 Naksha Live dashboard** — optional, recommended. Zero-dep Node `http` + SSE in `dashboard/`, 127.0.0.1 only, per-start URL token, reads the user's project `.naksha/` (never the plugin dir); hook emitter appends to `.naksha/events.jsonl` only when `.naksha/dashboard.json` enabled (rotated); UI: live org chart of the 30 roles, project/taste, findings, cost panels; plugin contract (`dashboard/routes/*.js` → `register({route, projectDir, naksha})`, `dashboard/public/panels/*.js` → `window.naksha.registerPanel({id,title,order,render(el, api)})`, see `docs/dashboard.md`); `/naksha-dashboard setup|start|stop|status|disable`; suggestions in `/naksha-init` and `/naksha-status`; tests. Salvage ideas (not code) from `origin/feature/dashboard`, avoiding its defects.

**#8 Votes** — `.naksha/votes.jsonl`; dashboard panel + route via the plugin contract; `/naksha-vote` + `scripts/votes.js` (append/list/stats/export --redact/consolidate/calibrate); consolidation into `taste.observations[]` with counts and evidence ids; judge calibration against eval results; sharing only by explicit redacted export; tests.

## Integration checklist

1. Merge each finished branch into `v6/integration`; resolve overlaps: `hooks/hooks.json` (#1 PostToolUse, #10 SessionStart/PreCompact, #7 event hooks), price tables (#2 `evals/prices.json` + #6), pointers in `/design` (#3, #5), `docs/naksha-memory-schema.md` sections (#5, #6, #8), `scripts/test/index.js`.
2. Merge `evals/proposed/*.json` into `evals/evals.json` with sequential ids; delete the proposed files.
3. Bookkeeping for new commands (`/design-detect`, `/naksha-stats`, `/naksha-dashboard`, `/naksha-vote`, maybe `/design-md`): `meta/stats.json` count, README, `site/index.html` command index, `/naksha-help`, SKILL.md command table, `adapters/blocks/project-memory.md` then `node scripts/build-adapters.js`; `guard-counts` lists stale numbers.
4. CI: add `node --test scripts/test/` and `node --test dashboard/test/` to `.github/workflows/ci.yml`.
5. Run everything: `bash scripts/quality-check.sh`, `node scripts/validate-structure.js`, `bash scripts/run-evals.sh`, `node --test scripts/test/`, `node --test dashboard/test/`, reel tests.
6. Hands-on test in a real Claude Code session (hooks, dashboard, memory blocks), then release **v6.0.0-beta** as a pre-release before v6.0.0.
