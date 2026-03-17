#!/usr/bin/env bash
# sync-labels.sh — creates or updates GitHub labels to match .github/labels.yml.
# Requires: gh CLI authenticated, python3 with PyYAML (pip3 install pyyaml).
# Usage: bash scripts/sync-labels.sh
# Exit: 0 if all labels synced, 1 if any error

set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
LABELS_FILE="$REPO/.github/labels.yml"

if ! command -v gh &>/dev/null; then
  echo "❌ gh CLI not found. Install from https://cli.github.com/"
  exit 1
fi

echo "═══════════════════════════════════════"
echo "  sync-labels"
echo "═══════════════════════════════════════"
echo ""

# Use gh label create/edit for each label defined in labels.yml
python3 - "$LABELS_FILE" <<'PYEOF'
import yaml, subprocess, sys

labels_file = sys.argv[1]
with open(labels_file) as f:
    data = yaml.safe_load(f)

labels = data.get("labels", [])
errors = 0

for label in labels:
    name = label["name"]
    color = label["color"].lstrip("#")
    desc = label.get("description", "")

    # Try to edit first (idempotent for existing labels)
    result = subprocess.run(
        ["gh", "label", "edit", name, "--color", color, "--description", desc],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        # Label doesn't exist — create it
        result2 = subprocess.run(
            ["gh", "label", "create", name, "--color", color, "--description", desc],
            capture_output=True, text=True
        )
        if result2.returncode != 0:
            print(f"  ❌ Failed to create/update: {name}")
            print(f"     {result2.stderr.strip()}")
            errors += 1
        else:
            print(f"  ✅ Created: {name}")
    else:
        print(f"  ✅ Updated: {name}")

if errors > 0:
    print(f"\n{errors} label(s) failed.")
    sys.exit(1)
else:
    print(f"\nAll {len(labels)} labels synced.")
PYEOF
