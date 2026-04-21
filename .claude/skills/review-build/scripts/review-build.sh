#!/usr/bin/env bash
set -euo pipefail

scope=""
base_ref=""
mode="committed"
new_run="false"

for arg in "$@"; do
  case "$arg" in
    --scope=*)
      scope="${arg#*=}"
      ;;
    --base-ref=*)
      base_ref="${arg#*=}"
      ;;
    --mode=*)
      mode="${arg#*=}"
      ;;
    --new-run)
      new_run="true"
      ;;
    *)
      ;;
  esac
done

if [[ -z "$scope" ]]; then
  echo "usage: review-build.sh --scope=<scope> [--base-ref=<ref>] [--mode=committed|staged|working-tree] [--new-run]" >&2
  exit 1
fi

case "$mode" in
  committed|staged|working-tree) ;;
  *)
    echo "invalid --mode=$mode (expected: committed|staged|working-tree)" >&2
    exit 1
    ;;
esac

root_dir="$(git rev-parse --show-toplevel)"
node_bin=(node --experimental-strip-types)
scripts_dir="$root_dir/.claude/scripts"

json_get() {
  # $1 = dotted path, $2 = json string
  printf '%s' "$2" | "${node_bin[@]}" "$scripts_dir/json-get.ts" --path="$1"
}

resolver_cmd=("${node_bin[@]}" "$scripts_dir/runid-resolve.ts" "--scope=$scope" "--mode=$mode" --ensure)

if [[ -n "$base_ref" ]]; then
  resolver_cmd+=("--base-ref=$base_ref")
fi

if [[ "$new_run" == "true" ]]; then
  resolver_cmd+=(--new-run)
fi

resolved_json="$("${resolver_cmd[@]}")"

run_id="$(json_get runId "$resolved_json")"
review_dir="$(json_get reviewDir "$resolved_json")"
status_dir="$(json_get statusDir "$resolved_json")"
resolved_base_ref="$(json_get meta.baseRef "$resolved_json")"
base_commit_sha="$(json_get meta.baseCommitSha "$resolved_json")"
head_commit_sha="$(json_get meta.headCommitSha "$resolved_json")"
reused="$(json_get reused "$resolved_json")"
requires_decision="$(printf '%s' "$resolved_json" | "${node_bin[@]}" "$scripts_dir/json-get.ts" --path=requiresDecision --default=false)"

review_build_status="$status_dir/review-build.json"

# Lock check: if an existing run is marked locked by a live process, refuse bootstrap.
if [[ -f "$review_build_status" ]]; then
  locked_by="$(printf '%s' "$(cat "$review_build_status")" | "${node_bin[@]}" "$scripts_dir/json-get.ts" --path=lockedBy --default="" || true)"
  if [[ -n "$locked_by" && "$locked_by" != "null" ]]; then
    if kill -0 "$locked_by" 2>/dev/null; then
      echo "review-build run is locked by live pid=$locked_by" >&2
      echo "refuse to bootstrap — wait for that run to release or pass --new-run" >&2
      exit 2
    fi
  fi
fi

generated_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Bootstrap writes status with lockedAt/lockedBy = null.
# Session locks are held by the orchestrator during active phase work, not by
# this one-shot script.
"${node_bin[@]}" "$scripts_dir/status-write.ts" --file "$review_build_status" >/dev/null <<EOF
{
  "skill": "review-build",
  "phase": "phase-0-bootstrap",
  "scope": "$scope",
  "runId": "$run_id",
  "status": "NEEDS_CONTEXT",
  "generatedAt": "$generated_at",
  "analysisMode": "$mode",
  "baseRef": "$resolved_base_ref",
  "baseCommitSha": "$base_commit_sha",
  "headCommitSha": "$head_commit_sha",
  "currentPhase": "phase-1-analyze-changes",
  "phaseOrder": [
    "phase-1-analyze-changes",
    "phase-2-code-review",
    "phase-3-test-unit",
    "phase-4-review-pr-draft"
  ],
  "lockedAt": null,
  "lockedBy": null,
  "gateHistory": [],
  "outputs": [
    "$review_build_status"
  ],
  "concerns": [
    "Phase 1 결과를 확인한 뒤 사용자의 proceed/revise/stop/back 응답이 필요합니다."
  ]
}
EOF

echo "Initialized review-build run"
echo "- scope: $scope"
echo "- runId: $run_id"
echo "- reused: $reused"
echo "- requiresDecision: $requires_decision"
echo "- output dir: $review_dir"
echo "- status: $review_build_status"

if [[ "$requires_decision" == "true" ]]; then
  echo ""
  echo "[ATTENTION] 직전 run이 BLOCKED 또는 NEEDS_CONTEXT 상태로 끝났습니다."
  echo "  continue  → 같은 runId로 이어서 수정"
  echo "  new-run   → --new-run 플래그로 재호출해 새로 시작"
fi
