#!/usr/bin/env bash
# behavioral-smoke.sh — validates pre-captured command output fixtures for
# keyword presence and structural thresholds. Part of quality-check.sh.
# Usage: bash scripts/behavioral-smoke.sh
# Exit: 0 if all POPULATED fixtures pass, 1 if any populated fixture fails.
# Uninitialized fixtures produce WARN and do not affect exit code.

set -uo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURES="$REPO/evals/fixtures"
FAILED=0
WARNED=0
SENTINEL="# FIXTURE NEEDED — run this command and paste output here"

echo "═══════════════════════════════════════"
echo "  behavioral-smoke"
echo "═══════════════════════════════════════"
echo ""

# check_fixture <file> <keywords_csv> <min_headers> <min_chars>
check_fixture() {
  local file="$FIXTURES/$1"
  local keywords_csv="$2"
  local min_headers="$3"
  local min_chars="$4"
  local fixture_failed=0

  echo "  Checking: $1"

  if [ ! -f "$file" ]; then
    echo "    WARN  $1: file does not exist — skipping"
    WARNED=$((WARNED + 1))
    return
  fi
  if [ ! -s "$file" ]; then
    echo "    WARN  $1: empty file — skipping"
    WARNED=$((WARNED + 1))
    return
  fi
  if [ "$(head -1 "$file")" = "$SENTINEL" ]; then
    echo "    WARN  $1: not yet populated — skipping"
    WARNED=$((WARNED + 1))
    return
  fi

  IFS=',' read -ra KWS <<< "$keywords_csv"
  for kw in "${KWS[@]}"; do
    kw="$(echo "$kw" | xargs)"
    if ! grep -qi "$kw" "$file"; then
      echo "    FAIL  $1: missing keyword \"$kw\""
      fixture_failed=$((fixture_failed + 1))
    fi
  done

  local actual_headers
  actual_headers=$(grep -c "^## " "$file" 2>/dev/null || echo 0)
  if [ "$actual_headers" -lt "$min_headers" ]; then
    echo "    FAIL  $1: $actual_headers headers (need >=$min_headers)"
    fixture_failed=$((fixture_failed + 1))
  fi

  local actual_chars
  actual_chars=$(wc -c < "$file" | tr -d ' ')
  if [ "$actual_chars" -lt "$min_chars" ]; then
    echo "    FAIL  $1: $actual_chars chars (need >=$min_chars)"
    fixture_failed=$((fixture_failed + 1))
  fi

  if [ "$fixture_failed" -eq 0 ]; then
    echo "    PASS  $1 ($actual_headers headers, $actual_chars chars)"
  else
    FAILED=$((FAILED + fixture_failed))
  fi
}

#           fixture file                    keywords                             headers  chars
check_fixture "design-output.md"        "layout,typography,color,ui designer"      3    200
check_fixture "design-review-output.md" "heuristic,contrast,accessibility"         3    150
check_fixture "design-system-output.md" "token,component,typography"               4    200
check_fixture "figma-output.md"         "frame,component,variant"                  2    100
check_fixture "brand-output.md"         "voice,color,typography"                   2    100
check_fixture "design-framework-output.md" "component,tsx,props"                   2    150
check_fixture "email-template-output.md"    "inline,table,button"                  2    200
check_fixture "email-campaign-output.md"    "sequence,subject,cta"                 2    200
check_fixture "chart-design-output.md"      "chart,axis,color"                     2    150
check_fixture "design-template-output.md"   "template,layout,component"            2    150
check_fixture "design-tutorial-output.md"   "step,track,command"                   3    150
check_fixture "dashboard-layout-output.md"  "kpi,grid,widget"                      2    150
check_fixture "gen-image-output.md"        "prompt,tool,midjourney,style,negative"  3    200
check_fixture "gen-video-output.md"        "shot,runway,prompt,platform,seed"       3    200
check_fixture "gen-audio-output.md"        "voiceover,elevenlabs,tone,timing,compliance" 2 150
check_fixture "gen-moodboard-output.md"    "direction,moodboard,prompt,brand,style" 3    200
check_fixture "prompt-refine-output.md"    "critique,optimized,token,cross-tool"    2    150
check_fixture "email-audit-output.md"      "critical,technical,subject,cta,rewrite,aida,inline" 3 200
check_fixture "data-viz-audit-output.md"   "chart-type,palette,annotation,colorblind,anti-pattern,dashboard-fit,rewrite" 3 200
check_fixture "pdf-report-output.md"       "cover,toc,typography,page-break,widows,preflight,@page"                       3 200
check_fixture "print-layout-output.md"     "bleed,safe-zone,cmyk,trim,grid,typography,preflight"                          3 200
check_fixture "print-audit-output.md"      "bleed,safe-zone,cmyk,font-embed,page-break,brand-fit,rewrite"                 3 200

echo ""
echo "───────────────────────────────────────"

if [ "$WARNED" -gt 0 ]; then
  echo "  ($WARNED fixture(s) not yet populated — run commands and save output to evals/fixtures/)"
fi

if [ "$FAILED" -gt 0 ]; then
  echo "behavioral-smoke: FAIL ($FAILED issue(s) found)"
  exit 1
else
  echo "behavioral-smoke: PASS"
  exit 0
fi
