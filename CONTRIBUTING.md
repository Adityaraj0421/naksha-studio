# Contributing to Naksha

Thanks for your interest in contributing! This guide explains how to add new roles, commands, agents, and references to the plugin.

## Finding Work

Browse [Issues](https://github.com/Adityaraj0421/naksha-studio/issues) filtered by the `wishlist` label to find officially wanted contributions:

- [`wishlist`](https://github.com/Adityaraj0421/naksha-studio/issues?q=is%3Aissue+label%3Awishlist) — curated by maintainers, scoped and ready to build
- [`good-first-issue`](https://github.com/Adityaraj0421/naksha-studio/issues?q=is%3Aissue+label%3Agood-first-issue) — beginner-friendly, well-defined scope
- [`help-wanted`](https://github.com/Adityaraj0421/naksha-studio/issues?q=is%3Aissue+label%3Ahelp-wanted) — any skill level, needs a builder

**To claim an issue:** Comment on it saying you're working on it. A maintainer will apply the `claimed` label. If you need to step away, comment so others can pick it up.

## Plugin Architecture

```
naksha/
├── .claude-plugin/plugin.json    # Plugin manifest (name, version, description)
├── skills/design/
│   ├── SKILL.md                  # Orchestrator — routes tasks to roles
│   ├── settings.local.md         # User-configurable preferences
│   └── references/               # Knowledge bases (role expertise)
├── commands/                     # Slash commands (user entry points)
├── agents/                       # Specialist agents (delegatable)
├── hooks/hooks.json              # Lifecycle hooks (SessionStart, etc.)
├── scripts/                      # Shell scripts for hooks
└── evals/evals.json              # Test cases
```

### Key Concepts

| Concept | What it is | When to create one |
|---------|-----------|-------------------|
| **Command** | A `/slash` entry point that users invoke directly | When there's a distinct workflow users should trigger |
| **Agent** | A specialist that the Design Manager or commands can delegate to | When a task needs focused expertise and should run in its own context |
| **Reference** | A knowledge base file that roles read for expertise | When you need to encode domain knowledge (design rules, API patterns, best practices) |
| **Skill** | The orchestrator that routes tasks to the right roles | There's only one — `SKILL.md`. Update it when adding roles/commands |

## Adding a New Command

1. Create `commands/your-command.md` with frontmatter:

```yaml
---
description: "One-line description of what the command does."
argument-hint: "[what arguments it accepts]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "mcp__*"]
---
```

2. Write the command body with:
   - Clear process steps (numbered)
   - Figma API code snippets (if Figma-related)
   - Expected output format
   - Notes section for gotchas

3. Update `skills/design/SKILL.md`:
   - Add to the Plugin Commands table
   - Add team assembly examples if relevant

4. Update `plugin.json` description to include the new command name.

5. Update `README.md`:
   - Add command documentation section
   - Update badge count
   - Update file tree
   - Update knowledge breakdown

6. Add an eval in `evals/evals.json` with 4-6 assertions.

## Adding a New Agent

1. Create `agents/your-agent.md` with frontmatter:

```yaml
---
name: your-agent
description: |
  When to trigger this agent. Include 2-3 examples with
  <example> tags showing user messages and expected behavior.
model: inherit
color: blue  # blue, orange, yellow, green, red, purple
tools: ["Read", "Grep", "Glob", "mcp__figma-console__*"]
---
```

2. Write the agent body with:
   - Role definition ("You are a...")
   - Knowledge base references to read
   - Evaluation framework or process
   - Output format template
   - Operating principles

3. Update `skills/design/SKILL.md`:
   - Add to Cross-Cutting Tools table
   - Add team assembly examples

4. Update `README.md` agents table.

## Adding a New Reference

1. Create `skills/design/references/your-reference.md`
2. No frontmatter needed — references are pure knowledge
3. Structure with clear headings, tables, and code examples
4. Keep it focused on one domain (don't mix typography rules with deployment)
5. Update `SKILL.md` to reference it in the appropriate role row
6. Update `README.md` knowledge breakdown table

## Adding a New Role

Roles are virtual — they're defined in `SKILL.md`, not in separate files. To add a role:

1. Add the role to the Core Makers table in `SKILL.md`
2. Create a reference file with the role's expertise
3. Add team assembly examples showing when the role activates
4. Update `README.md` team table and role count badge

## Code Style

- **Markdown**: Use ATX headings (`##`), pipe tables, fenced code blocks
- **Figma API**: Always use async APIs (`getNodeByIdAsync`, not `getNodeById`)
- **Font loading**: Always `await figma.loadFontAsync()` before text operations
- **Process steps**: Number them, use clear verbs ("Create", "Extract", "Validate")
- **Output templates**: Show the exact markdown structure the command produces

## Definition of Done

Before marking your PR ready, confirm all of the following apply to your contribution type:

**All PRs:**
- Tested locally end-to-end in Claude Code
- `validate-structure` CI passes (checks file counts, version consistency, and command frontmatter)
- No hardcoded paths — use `${CLAUDE_PLUGIN_ROOT}/` for all plugin-relative references

**New command:**
- Command `.md` file is in `commands/`
- Frontmatter has `description`, `allowed-tools`, and role references
- `meta/stats.json` `commands` count is incremented
- Eval case added in `evals/evals.json` — this is how we prevent regressions; every command needs one

**New role:**
- Role definition added to `skills/design/SKILL.md` — roles are virtual, there is no separate role file to create
- `meta/stats.json` `roles` count is incremented
- At least one command activates the new role

**Knowledge/reference update:**
- Reference `.md` file is in `skills/design/references/`
- `meta/stats.json` `reference_files` count is incremented
- Relevant commands updated to reference it in their frontmatter

## Testing

Run the evals to verify:

```bash
# Validate JSON
cat evals/evals.json | python3 -m json.tool > /dev/null && echo "Valid"

# Validate plugin manifest
cat .claude-plugin/plugin.json | python3 -m json.tool > /dev/null && echo "Valid"

# Check all referenced files exist
grep -roh 'references/[a-z-]*.md' skills/design/SKILL.md | sort -u | while read f; do
  [ -f "skills/design/$f" ] && echo "OK $f" || echo "MISSING: $f"
done
```

## Platform Adapters

Naksha runs on multiple AI coding tools. The knowledge lives in the same role reference files — adapters just surface it differently:

| Tool | Adapter File | How It Loads |
|------|-------------|-------------|
| **Claude Code** | `.claude-plugin/plugin.json` + `skills/design/` | Plugin system — full 39 commands, agents, hooks |
| **Cursor** | `.cursor/rules/naksha.mdc` | Glob-matched rules — activates on CSS/HTML/TSX/SVG |
| **Windsurf** | `.windsurfrules` | Read at session start for entire project |
| **Gemini CLI** | `GEMINI.md` | Read at session start for entire project |
| **VS Code Copilot** | `.github/copilot-instructions.md` | Applied to Copilot Chat + inline completions |
| **Autohand Code CLI** | `AGENTS.md` + `skills/design/` copied to `.autohand/skills/naksha-design/` | AGENTS.md project instructions + project-level skill |

### Updating Adapters

When adding a new role or significant design rule:
1. Update the role reference file in `skills/design/references/`
2. Update `skills/design/SKILL.md` routing
3. Add a summary row to the role table in each adapter file
4. Key design rules (new token patterns, new platform specs) should be reflected in adapter files too

Adapters are condensed representations — they don't need to include the full depth of role files, just the actionable rules and role descriptions.

## Sync to Plugin Install

After making changes, sync to the plugin install directory:

```bash
cp -r . ~/.claude/plugins/naksha/
```

Then restart Claude Code to reload the plugin.

## Submitting Changes

1. Fork and clone the repo
2. Create a feature branch: `git checkout -b feature/my-improvement`
3. Make your changes and test locally in Claude Code
4. Submit a PR with a clear description of what was added/changed

---

## Building a Wing

A **wing** is a cohesive thematic extension — a new specialist role paired with 2+ commands that apply that expertise. The three existing wings are good templates:

| Wing | Role Reference | Commands |
|------|---------------|---------|
| Conversational | `skills/design/references/conversational-designer.md` | `/design-chatbot`, `/design-voice-ui` |
| Spatial | `skills/design/references/spatial-designer.md` | `/design-spatial`, `/design-ar-overlay` |
| Compliance | `skills/design/references/compliance-designer.md` | `/design-gdpr`, `/design-compliance` |

A wing contribution is large — expect 3–5 hours of focused work. Check the [`wing` label](https://github.com/Adityaraj0421/naksha-studio/issues?q=label%3AWing) for maintainer-scoped wing requests before starting your own.

### Wing File Checklist

**1. Role reference file** — `skills/design/references/<role-name>.md`

Follow the established pattern from any existing reference file:
- `# Role Name` — 2-sentence identity statement
- `## Your Responsibilities` — numbered list, 6–8 items
- Domain sections — 4–8 sections covering the core knowledge areas (tables, rules, code examples)
- `## Reference-Sourced Insights` — 4–6 entries with authoritative citations (real URLs, direct quotes, design implications)
- `## Handoffs` — one sub-section per stakeholder with `Deliver:` line
- `## Advanced Patterns` — 3–5 sophisticated patterns not obvious from the basics
- `## Full Coverage` — pre-handoff verification checklist with `- [ ]` items

Target: 500–700 lines. Read an existing file in full before writing yours.

**2. Commands (minimum 2)** — `commands/<wing-name>-<variant>.md`

Each command file needs:
```yaml
---
description: "One-line description."
argument-hint: "[--flag <value>]"
allowed-tools: ["Read", "Write", "Glob"]
---
```

Body pattern:
- **Reads the role reference** using the `Read` tool (path: `${CLAUDE_PLUGIN_ROOT}/skills/design/references/<role-name>.md`)
- Input section: what arguments/flags it accepts
- Process steps: numbered, each producing visible output
- Output section: exactly what the user receives (format, sections, depth)
- MCP Fallback block: what to do if optional tools (Playwright, Figma) are unavailable

**3. SKILL.md updates** — `skills/design/SKILL.md`

7 update locations (all must be done in one editing session to avoid drift):
1. Trigger phrases — add 8–12 natural language phrases that route to this wing
2. Examples block — add 2 examples (one per command)
3. Plugin Commands table — add rows for both commands; add a section header if needed
4. The Team table — add the new role row
5. Step 3 routing rules — add activation condition
6. Output formats — add the wing's output format
7. Stop hook suggestion list — add both commands

**4. Evals** — `evals/evals.json`

Add 2 eval entries per command (minimum). Each eval needs:
- `id`: next available integer (run `node -e "const e=require('./evals/evals.json'); console.log('Last ID:', e.evals[e.evals.length-1].id)"`)
- `name`: `kebab-case-description`
- `prompt`: the exact user prompt
- `expected_output`: one sentence describing the ideal output
- `assertions`: array of 5–6 named assertions (each is `{ "name": "kebab-case", "description": "Sentence." }`)

**5. Smoke fixtures** — `evals/fixtures/<command>-output.md`

Create one fixture per command. Start with the SENTINEL placeholder:
```markdown
# FIXTURE NEEDED — run this command and paste output here
```

Add `check_fixture` rows to `scripts/behavioral-smoke.sh`:
```bash
check_fixture "<command>-output.md" "<keyword1>,<keyword2>,<keyword3>" <min_h2_headers> <min_chars>
```

**6. Platform adapters** — update all 4

Add the new role row to each:
- `GEMINI.md`
- `.cursor/rules/naksha.mdc`
- `.windsurfrules`
- `.github/copilot-instructions.md`

**7. Stats** — `meta/stats.json` and `.claude-plugin/plugin.json`

Update **last** (after all files are committed, since validate-structure.js enforces counts):
- `roles`: +1
- `commands`: +2 (or however many you added)
- `reference_files`: +1
- `knowledge_lines`: estimate (count lines in your reference file + ~250 per command)
- `version`: bump minor (e.g. 4.7.0 for a new wing)

### Wing Pull Request

Open your PR with:
- Title: `feat: add <Wing Name> wing (<role>, /command-1, /command-2)`
- Labels: `wing`, `enhancement`
- PR body should include: the reference file line count, eval assertion count per command, and a sample output from each command

A maintainer will review the reference file depth (Reference-Sourced Insights must have real citations, not invented sources), command output quality, and SKILL.md wiring completeness before merging.
