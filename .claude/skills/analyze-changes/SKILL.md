---
name: analyze-changes
description: 현재 브랜치의 diff를 읽어 change-summary 계약 파일을 만든다. diff-driven 리뷰/테스트 시작점이 필요할 때 사용.
argument-hint: [base-branch] [--mode=committed|staged|working-tree] [--scope=<scope>] [--new-run]
allowed-tools: Read Edit Write Bash Glob Grep
---

# Analyze Changes

## 목적

`analyze-changes`는 현재 diff를 사람이 읽는 요약과 후속 phase가 읽는 계약 파일로 바꾼다.
이 skill은 반드시 `code-review`, `test-unit`, `review-pr-draft`보다 먼저 실행한다.

## Step 1: 실행 컨텍스트 확정

아래 값을 먼저 확정한다.

1. `mode`
   - 기본: `committed`
   - 선택: `staged`, `working-tree`
2. `baseRef`
   - 사용자가 주면 그대로 사용
   - 없으면 `.claude/scripts/git-meta.ts`의 추론 규칙을 사용
3. `scope`
   - 사용자가 주면 그대로 사용
   - 없으면 변경된 대표 feature/module 경로를 바탕으로 짧은 kebab-case로 정한다

run 디렉토리는 아래 헬퍼로 resolve한다.

```bash
node --experimental-strip-types .claude/scripts/runid-resolve.ts --scope=<scope> --mode=<mode> [--base-ref=<ref>] [--new-run] --ensure
```

## Step 2: stale / git 컨텍스트 확인

1. `.claude/scripts/git-meta.ts`로 현재 git 메타데이터를 읽는다
2. `scripts/collect-diff-context.sh --base-ref=<ref> --mode=<mode>`를 실행해 changed files / diff stat을 수집하고, 결과를 `change-summary.md`의 "분석 범위"와 "변경 파일 분류" 섹션 원본으로 사용한다
3. 같은 run을 재사용하는 경우, 기존 `status/analyze-changes.json`이 있으면 `.claude/scripts/status-read.ts`로 `stale` / `softStale`을 검사한 뒤 덮어써도 되는지 판단한다

diff가 비어 있으면 요약을 억지로 만들지 말고 `BLOCKED`로 종료한다.

## Step 3: 변경 요약 작성

반드시 아래 세 파일을 만든다.

- `docs/reviews/{scope}/{runId}/change-summary.md`
- `docs/reviews/{scope}/{runId}/change-summary.json`
- `docs/reviews/{scope}/{runId}/status/analyze-changes.json`

형식과 필수 필드는 아래 문서를 따른다.

- 규칙: [analyze-changes-rules.md](./analyze-changes-rules.md)
- 리스크 기준: [references/risk-classification.md](./references/risk-classification.md)
- 출력 스키마: [references/output-schema.md](./references/output-schema.md)

## Step 4: Completion Status 기록

status 파일은 반드시 `.claude/scripts/status-write.ts`로 기록한다.

```bash
node --experimental-strip-types .claude/scripts/status-write.ts --file docs/reviews/{scope}/{runId}/status/analyze-changes.json < payload.json
```

## Completion Status

- `DONE`: change-summary와 testTargets가 모두 준비됨
- `DONE_WITH_CONCERNS`: 요약은 가능하지만 `[미확인]`이나 high-risk concern이 남음
- `BLOCKED`: diff 없음, baseRef 불명, scope 확정 불가
- `NEEDS_CONTEXT`: 어떤 경로를 같은 scope로 묶어야 하는지 판단 불가
