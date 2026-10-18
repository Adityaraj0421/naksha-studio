#!/usr/bin/env bash
# sandboxed-run.sh: run one command (typically a paid `claude -p` eval) inside
# Anthropic's sandbox-runtime (`srt`), using the profile in evals/sandbox.json.
#
# Usage:
#   bash scripts/lib/sandboxed-run.sh --eval-dir <dir> [--profile <file>] -- <command> [args...]
#   bash scripts/lib/sandboxed-run.sh --eval-dir <dir> --print-settings
#
# What it does:
#   1. Creates <dir> if needed and resolves it to an absolute physical path.
#      It refuses /, $HOME, the plugin repo, or any directory containing one of them.
#   2. Renders the profile: every "${NAKSHA_EVAL_DIR}" becomes <dir>. The
#      `srt` block is written to <dir>/.naksha-sandbox/srt-settings.json, and
#      the `env` block is exported (CLAUDE_CONFIG_DIR and TMPDIR land inside
#      <dir>; non-essential Claude Code traffic is switched off).
#   3. Network allowlist = profile domains, plus the host of ANTHROPIC_BASE_URL
#      when set, plus NAKSHA_SANDBOX_EXTRA_DOMAINS (comma-separated). Each
#      addition is logged to stderr.
#   4. When `srt` is on PATH: exec srt --settings <file> -- <command...>.
#      srt shell-quotes the argv, so arguments with spaces are safe, and it
#      exits with the command's status.
#      When srt is missing, it refuses (exit 69) unless NAKSHA_ALLOW_UNSANDBOXED=1.
#      In that case it runs the command directly, with the same env, after a warning.
#      This script never installs srt (npm i -g @anthropic-ai/sandbox-runtime;
#      Linux also needs bubblewrap, socat and ripgrep; macOS needs ripgrep).
#
# Exit codes: the command's own status; 64 = usage error; 69 = srt unavailable
# and unsandboxed runs not allowed; 70 = could not render the profile.
#
# Calling it from the eval runner (Node):
#   const evalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'naksha-eval-'));
#   spawnSync('bash', [path.join(root, 'scripts/lib/sandboxed-run.sh'),
#     '--eval-dir', evalDir, '--',
#     'claude', '-p', prompt, '--plugin-dir', root, '--output-format', 'json'],
#     { cwd: evalDir, encoding: 'utf8', env: { ...process.env } });
#   // status 69 means "srt missing": report the eval as skipped, not failed.
#   // ANTHROPIC_API_KEY must be in env: CLAUDE_CONFIG_DIR is fresh, so stored logins are not visible.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd -P)"
PROFILE="$REPO/evals/sandbox.json"
EVAL_DIR=""
PRINT_SETTINGS=0

usage() {
  sed -n '2,8p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

die() {
  local code="$1"; shift
  printf 'sandboxed-run: %s\n' "$*" >&2
  exit "$code"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --eval-dir) [ $# -ge 2 ] || die 64 "--eval-dir needs a value"; EVAL_DIR="$2"; shift 2 ;;
    --profile)  [ $# -ge 2 ] || die 64 "--profile needs a value"; PROFILE="$2"; shift 2 ;;
    --print-settings) PRINT_SETTINGS=1; shift ;;
    -h|--help) usage; exit 0 ;;
    --) shift; break ;;
    *) die 64 "unknown option '$1' (put the command after --)" ;;
  esac
done

[ -n "$EVAL_DIR" ] || die 64 "--eval-dir is required"
[ "$PRINT_SETTINGS" = 1 ] || [ $# -gt 0 ] || die 64 "no command given (usage: sandboxed-run.sh --eval-dir <dir> -- <command> [args...])"
[ -f "$PROFILE" ] || die 70 "profile not found: $PROFILE"
command -v node >/dev/null 2>&1 || die 70 "node is required to render the sandbox profile"

mkdir -p "$EVAL_DIR" || die 64 "cannot create eval dir: $EVAL_DIR"
EVAL_DIR="$(cd "$EVAL_DIR" && pwd -P)"

# The writable root must be narrow: never /, $HOME, the plugin repo, or an
# ancestor of either.
HOME_P="$( (cd "${HOME:-/nonexistent}" 2>/dev/null && pwd -P) || true)"
is_same_or_ancestor() { # $1 contains-or-equals $2?
  [ -n "$2" ] && { [ "$1" = "$2" ] || case "$2/" in "$1"/*) true ;; *) false ;; esac; }
}
[ "$EVAL_DIR" != "/" ] || die 64 "refusing eval dir '/'"
! is_same_or_ancestor "$EVAL_DIR" "$HOME_P" || die 64 "refusing eval dir '$EVAL_DIR': it is or contains \$HOME"
! is_same_or_ancestor "$EVAL_DIR" "$REPO" || die 64 "refusing eval dir '$EVAL_DIR': it is or contains the plugin repo"

SETTINGS_DIR="$EVAL_DIR/.naksha-sandbox"
SETTINGS="$SETTINGS_DIR/srt-settings.json"
mkdir -p "$SETTINGS_DIR"

# Render the profile. Prints the env block as NUL-separated KEY=VALUE pairs;
# logs allowlist additions to stderr.
RENDER_JS='
const fs = require("fs");
const [profilePath, evalDir, settingsPath] = process.argv.slice(1);
const profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
const sub = (v) => typeof v === "string" ? v.split("${NAKSHA_EVAL_DIR}").join(evalDir)
  : Array.isArray(v) ? v.map(sub)
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sub(x)]))
  : v;
const srt = sub(profile.srt || {});
const net = srt.network = srt.network || {};
const fsc = srt.filesystem = srt.filesystem || {};
net.allowedDomains = net.allowedDomains || [];
net.deniedDomains = net.deniedDomains || [];
fsc.denyRead = fsc.denyRead || [];
fsc.allowWrite = fsc.allowWrite || [];
fsc.denyWrite = fsc.denyWrite || [];
const domainOk = (d) => /^(\*\.)?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+(:\d{1,5})?$/.test(d);
const add = (d, why) => {
  if (!domainOk(d)) { process.stderr.write(`sandboxed-run: ignoring invalid domain "${d}" (${why})\n`); return; }
  if (net.allowedDomains.includes(d)) return;
  net.allowedDomains.push(d);
  process.stderr.write(`sandboxed-run: network allowlist + ${d} (${why})\n`);
};
if (process.env.ANTHROPIC_BASE_URL) {
  try { add(new URL(process.env.ANTHROPIC_BASE_URL).host, "ANTHROPIC_BASE_URL"); }
  catch (_) { process.stderr.write("sandboxed-run: ANTHROPIC_BASE_URL is not a URL; not added\n"); }
}
for (const d of (process.env.NAKSHA_SANDBOX_EXTRA_DOMAINS || "").split(",").map((s) => s.trim()).filter(Boolean)) {
  add(d, "NAKSHA_SANDBOX_EXTRA_DOMAINS");
}
fs.writeFileSync(settingsPath, JSON.stringify(srt, null, 2) + "\n");
const env = sub(profile.env || {});
for (const [k, v] of Object.entries(env)) {
  if (!/^[A-Z_][A-Z0-9_]*$/.test(k) || typeof v !== "string" || v.includes("\0")) {
    throw new Error(`bad env entry ${k}`);
  }
  process.stdout.write(`${k}=${v}\0`);
}
'
ENV_PAIRS_FILE="$SETTINGS_DIR/env.nul"
node -e "$RENDER_JS" "$PROFILE" "$EVAL_DIR" "$SETTINGS" > "$ENV_PAIRS_FILE" \
  || die 70 "could not render $PROFILE"

while IFS= read -r -d '' pair; do
  export "${pair%%=*}=${pair#*=}"
done < "$ENV_PAIRS_FILE"
rm -f "$ENV_PAIRS_FILE"
[ -n "${TMPDIR:-}" ] && mkdir -p "$TMPDIR"
[ -n "${CLAUDE_CONFIG_DIR:-}" ] && mkdir -p "$CLAUDE_CONFIG_DIR"

if [ "$PRINT_SETTINGS" = 1 ]; then
  cat "$SETTINGS"
  exit 0
fi

if command -v srt >/dev/null 2>&1; then
  exec srt --settings "$SETTINGS" -- "$@"
fi

if [ "${NAKSHA_ALLOW_UNSANDBOXED:-}" = "1" ]; then
  printf '%s\n' \
    "sandboxed-run: WARNING: srt not found; running UNSANDBOXED because NAKSHA_ALLOW_UNSANDBOXED=1." \
    "sandboxed-run: The command can write anywhere and reach any host. Env containment only (CLAUDE_CONFIG_DIR, TMPDIR -> $EVAL_DIR)." >&2
  exec "$@"
fi

die 69 "srt (Anthropic sandbox-runtime) is not installed, so this paid run would be unsandboxed. Refusing.
  Install it:  npm install -g @anthropic-ai/sandbox-runtime
               (Linux also needs bubblewrap, socat, ripgrep; macOS needs ripgrep)
  Or accept the risk for this run:  NAKSHA_ALLOW_UNSANDBOXED=1"
