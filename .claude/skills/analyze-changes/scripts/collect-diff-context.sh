#!/usr/bin/env bash
#
# collect-diff-context.sh — print git diff context for analyze-changes.
#
# Usage:
#   collect-diff-context.sh [--base-ref=<ref>] [--mode=committed|staged|working-tree]
#
# Defaults: --base-ref=main --mode=committed
# Positional args also accepted for backwards compatibility:
#   collect-diff-context.sh <base-ref> <mode>
#
set -euo pipefail

base_ref="main"
mode="committed"
positional_count=0

for arg in "$@"; do
  case "$arg" in
    --base-ref=*)
      base_ref="${arg#*=}"
      ;;
    --mode=*)
      mode="${arg#*=}"
      ;;
    --*)
      echo "unknown flag: $arg" >&2
      exit 1
      ;;
    *)
      if [[ $positional_count -eq 0 ]]; then
        base_ref="$arg"
      elif [[ $positional_count -eq 1 ]]; then
        mode="$arg"
      else
        echo "too many positional args: $arg" >&2
        exit 1
      fi
      positional_count=$((positional_count + 1))
      ;;
  esac
done

case "$mode" in
  committed)
    merge_base="$(git merge-base "$base_ref" HEAD)"
    diff_range="${merge_base}..HEAD"
    ;;
  staged)
    diff_range="--cached"
    ;;
  working-tree)
    diff_range=""
    ;;
  *)
    echo "unsupported mode: $mode (expected: committed|staged|working-tree)" >&2
    exit 1
    ;;
esac

echo "## Git Context"
echo
echo "- current branch: $(git branch --show-current)"
echo "- base ref: $base_ref"
echo "- mode: $mode"

if [[ -n "$diff_range" ]]; then
  echo "- diff range: $diff_range"
fi

echo
echo "## Changed Files"

if [[ "$mode" == "staged" ]]; then
  git diff --cached --name-status
elif [[ "$mode" == "working-tree" ]]; then
  git diff --name-status
else
  git diff --name-status "$diff_range"
fi

echo
echo "## Diff Stat"

if [[ "$mode" == "staged" ]]; then
  git diff --cached --stat
elif [[ "$mode" == "working-tree" ]]; then
  git diff --stat
else
  git diff --stat "$diff_range"
fi
