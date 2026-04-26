---
name: code-review
description: 코드 리뷰, PR 전 검토, 버그/회귀/테스트 공백 점검이 필요할 때 사용. change-summary.json 기반으로 findings-first review-report.md/json을 만든다.
argument-hint: [scope] [--run-id=<runId>]
allowed-tools: Read Edit Write Bash Glob Grep
---

# Code Review

## 목적

`code-review`는 diff 설명이 아니라 버그, 회귀, 테스트 공백을 먼저 드러내는 review-report를 만든다.

## Step 1: 입력 검증

1. `docs/reviews/{scope}/{runId}/change-summary.json`을 읽는다
2. `status/analyze-changes.json`을 `.claude/scripts/status-read.ts`로 stale 검사한다
3. `stale: true`면 리뷰를 계속하지 말고 analyze-changes 재실행을 제안한다 (`BLOCKED`)
4. `softStale: true`면 사용자에게 확인 후 진행한다

## Step 2: 리뷰 범위 읽기

읽기 우선순위:

1. changed production files
2. 관련 테스트 파일
3. 직접 연결된 config 또는 contract 파일

리뷰 관점과 심각도 기준은 아래 문서를 따른다.

- 규칙: [code-review-rules.md](./code-review-rules.md)

## Step 3: 산출물 작성

반드시 아래 세 파일을 만든다.

- `docs/reviews/{scope}/{runId}/review-report.md`
- `docs/reviews/{scope}/{runId}/review-report.json`
- `docs/reviews/{scope}/{runId}/status/code-review.json`

status 작성 전 아래 검증을 반드시 통과한다.

```bash
node --experimental-strip-types .claude/scripts/validate-contract.ts --phase=code-review --review-dir=docs/reviews/{scope}/{runId}
```

### review-report.json 필수 구조

`test-unit`이 바로 읽을 수 있도록 `testGaps`를 구조화해 기록한다.
`id`는 `change-summary.json`의 `testTargets[].id`와 1:1로 연결한다.

```json
{
  "scope": "...",
  "runId": "...",
  "findings": [
    { "severity": "critical|major|minor|suggestion", "path": "...", "line": 0, "issue": "..." }
  ],
  "testGaps": [
    {
      "id": "TGT-001",
      "targetPath": "...",
      "reason": "...",
      "priority": "required|optional"
    }
  ],
  "risksForPr": ["..."],
  "unknowns": ["..."]
}
```

## Completion Status

- `DONE`: findings, testGaps, risksForPr가 모두 구조화됨
- `DONE_WITH_CONCERNS`: review는 끝났지만 `[미확인]` 추정이나 softStale 경고가 남음
- `BLOCKED`: analyze-changes 산출물 부재 또는 stale
- `NEEDS_CONTEXT`: 어떤 변경을 같은 review 묶음으로 볼지 불분명
