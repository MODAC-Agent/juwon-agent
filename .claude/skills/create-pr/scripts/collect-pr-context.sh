#!/usr/bin/env bash
set -euo pipefail

# Usage: collect-pr-context.sh <base-branch>
# Collects git context for PR draft generation.
# Important: this script analyzes committed changes only (merge-base..HEAD).
# Uncommitted working tree changes are detected for warning purposes, but are not included.
# Outputs structured key-value text to stdout.
# No network calls. Exits non-zero on failure.

BASE="${1:?Usage: collect-pr-context.sh <base-branch>}"
CURRENT=$(git branch --show-current)

if [[ -z "$CURRENT" ]]; then
  echo "ERROR=detached HEAD, cannot determine current branch" >&2
  exit 1
fi

if [[ "$CURRENT" == "$BASE" ]]; then
  echo "ERROR=current branch ($CURRENT) is the same as base branch ($BASE)" >&2
  exit 1
fi

# Check if base branch exists
if ! git rev-parse --verify "$BASE" >/dev/null 2>&1; then
  echo "ERROR=base branch ($BASE) does not exist locally" >&2
  exit 1
fi

# Dirty working tree check
if [[ -n $(git status --short) ]]; then
  DIRTY="yes"
else
  DIRTY="no"
fi

# Merge base
MERGE_BASE=$(git merge-base --fork-point "$BASE" HEAD 2>/dev/null || git merge-base "$BASE" HEAD)

# Ahead commits
AHEAD_COMMITS=$(git log --oneline "${MERGE_BASE}..HEAD")
AHEAD_COUNT=$(echo "$AHEAD_COMMITS" | grep -c . || true)

if [[ "$AHEAD_COUNT" -eq 0 ]]; then
  echo "ERROR=no commits ahead of base branch ($BASE)" >&2
  exit 1
fi

# Changed files
CHANGED_FILES=$(git diff --name-status "${MERGE_BASE}...HEAD")

# Diff stat
DIFF_STAT=$(git diff --stat "${MERGE_BASE}...HEAD")

# Output
echo "CURRENT_BRANCH=${CURRENT}"
echo "BASE_BRANCH=${BASE}"
echo "DIRTY=${DIRTY}"
echo "AHEAD_COUNT=${AHEAD_COUNT}"
echo "MERGE_BASE=${MERGE_BASE}"
echo "---COMMITS---"
echo "$AHEAD_COMMITS"
echo "---CHANGED_FILES---"
echo "$CHANGED_FILES"
echo "---DIFF_STAT---"
echo "$DIFF_STAT"
