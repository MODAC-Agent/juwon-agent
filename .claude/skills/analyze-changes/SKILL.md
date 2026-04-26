---
name: analyze-changes
description: 변경사항 분석, diff 요약, PR 전 변경 범위 정리, 테스트 대상 추출이 필요할 때 사용. 서브에이전트가 git diff를 읽어 change-summary.md/json 계약 파일을 만든다.
argument-hint: [base-branch] [--mode=committed|staged|working-tree] [--scope=<scope>] [--new-run]
allowed-tools: Agent Read Edit Write Bash Glob Grep
---

# Analyze Changes

## 목적

`analyze-changes`는 현재 diff를 사람이 읽는 요약과 후속 phase가 읽는 계약 파일로 바꾼다.
diff 본문은 컨텍스트를 크게 차지하므로, 실제 diff 읽기와 요약 작성은 반드시 서브에이전트에서 수행한다.
메인 에이전트에는 산출물 경로, status, 짧은 요약만 남긴다.
이 skill은 반드시 `code-review`, `test-unit`, `review-pr-draft`보다 먼저 실행한다.

## 실행 모델

이 skill은 lightweight wrapper다.

```text
main agent
  ├─ baseRef/mode/scope/runId만 확정
  ├─ Agent 도구로 analyze subagent 실행
  └─ subagent 결과 요약과 산출물 경로만 사용자에게 보고

analyze subagent
  ├─ git diff / changed files / 관련 파일 확인
  ├─ change-summary.md/json 작성
  └─ status/analyze-changes.json 작성
```

메인 에이전트는 full diff, 대형 hunk, 파일 전문을 대화에 붙이지 않는다.
후속 phase는 메인 컨텍스트가 아니라 `change-summary.json`을 입력으로 삼는다.

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

## Step 2: 서브에이전트 실행

Agent 도구를 사용해 서브에이전트를 생성한다.
서브에이전트에게 필요한 값은 모두 프롬프트로 넘긴다.

```text
Agent({
  description: "Analyze git diff into review contract",
  prompt: "
    현재 브랜치 diff를 review contract로 정리하는 작업입니다.

    먼저 아래 파일을 읽고 규칙을 따르세요.
    - .claude/skills/analyze-changes/analyze-changes-rules.md
    - .claude/skills/analyze-changes/references/risk-classification.md
    - .claude/skills/analyze-changes/references/output-schema.md

    작업 정보:
    - mode: {mode}
    - baseRef: {baseRef}
    - scope: {scope}
    - runId: {runId}
    - reviewDir: docs/reviews/{scope}/{runId}

    수행할 일:
    1. .claude/scripts/git-meta.ts로 현재 git 메타데이터를 읽으세요.
    2. .claude/skills/analyze-changes/scripts/collect-diff-context.sh --base-ref={baseRef} --mode={mode} 를 실행하세요.
    3. diff가 비어 있으면 BLOCKED status를 쓰고 종료하세요.
    4. 필요한 changed file과 인접 파일만 읽어 change-summary.md/json을 작성하세요.
    5. validate-contract.ts --phase=analyze-changes --review-dir=docs/reviews/{scope}/{runId} 를 실행하세요.
    6. status-write.ts로 status/analyze-changes.json을 작성하세요.

    완료 보고:
    - status
    - 생성한 파일 경로
    - high-risk 항목 수
    - testTargets 수
    - unknowns 요약

    금지:
    - full diff나 큰 hunk를 최종 답변에 붙이지 마세요.
    - 메인 에이전트가 다시 diff를 읽어야 하는 형태로 보고하지 마세요.
  "
})
```

메인 에이전트는 서브에이전트 완료 후 `status/analyze-changes.json`만 stale/read 확인하고 다음 phase로 넘긴다.

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
기록 전에는 반드시 `.claude/scripts/validate-contract.ts --phase=analyze-changes --review-dir=docs/reviews/{scope}/{runId}`를 통과해야 한다.

```bash
node --experimental-strip-types .claude/scripts/status-write.ts --file docs/reviews/{scope}/{runId}/status/analyze-changes.json < payload.json
```

## Completion Status

- `DONE`: change-summary와 testTargets가 모두 준비됨
- `DONE_WITH_CONCERNS`: 요약은 가능하지만 `[미확인]`이나 high-risk concern이 남음
- `BLOCKED`: diff 없음, baseRef 불명, scope 확정 불가
- `NEEDS_CONTEXT`: 어떤 경로를 같은 scope로 묶어야 하는지 판단 불가
