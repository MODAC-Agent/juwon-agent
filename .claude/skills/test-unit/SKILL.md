---
name: test-unit
description: change-summary와 review-report를 바탕으로 Vitest 테스트를 보강하고 coverage gate 결과를 정리한다.
argument-hint: [scope] [--run-id=<runId>] [--selection=strict|transitive] [--allow-prod-fix]
allowed-tools: Read Edit Write Bash Glob Grep
---

# Test Unit

## 목적

`test-unit`은 Week 2에서 Vitest 전용으로 동작한다.
대상 scope에 대해 differential 100% + scope 90% gate를 만족하는 테스트 계획과 결과를 남긴다.

## Step 1: 정책 확인과 stale 검사

### 문서 우선순위 (고정)

아래 순서로 테스트 정책 문서를 읽는다. 뒤 문서는 앞 문서에 충돌하지 않는 범위에서만 보조로 사용한다.

1. `.ai/TESTING.md`
2. `AGENTS.md`
3. `CLAUDE.local.md`
4. `CLAUDE.md`
5. `test-unit-rules.md`

문서끼리 서로 모순되는 규칙이 발견되면 추측하지 말고 `NEEDS_CONTEXT`로 종료한다.

### 앞 phase stale 검사

`.claude/scripts/status-read.ts`로 아래 두 파일을 읽어 stale/softStale을 확인한다.

- `docs/reviews/{scope}/{runId}/status/analyze-changes.json`
- `docs/reviews/{scope}/{runId}/status/code-review.json`

`stale: true`면 즉시 `BLOCKED`로 종료하고 해당 phase 재실행을 제안한다.
`softStale: true`면 사용자에게 확인을 받는다.

## Step 2: 환경과 selection 모드

### 환경 필수 확인

- `package.json`
- `vitest` devDependency
- `vitest.config.*` 또는 vite config 내 test 블록
- coverage 실행 가능 여부 (`@vitest/coverage-v8` 또는 `istanbul`)

하나라도 빠지면 `BLOCKED`로 종료한다.

### selection 모드

- 기본: `strict` — 변경된 파일 자체만 coverage 측정
- 확장: `transitive` — 사용자가 명시하거나 change-summary의 riskAreas가 high-risk로 표시한 경우에만

자세한 규칙은 [references/target-selection.md](./references/target-selection.md).

### production code 수정 규칙

기본은 **금지**다. 다음 경로 외의 파일은 수정하지 않는다.

- `*.test.ts`, `*.test.tsx`
- `__tests__/**`, `__mocks__/**`

production 수정이 필요하다고 판단되면:

- `--allow-prod-fix` 없이는 `BLOCKED`로 종료하고, 어떤 파일의 어떤 수정이 왜 필요한지 `coverage-report.md`에 남긴다
- `--allow-prod-fix`가 있을 때도 (a) 테스트 가능성 확보를 위한 export 추가 또는 DI 분리, (b) 테스트가 드러낸 명백한 버그 수정 이 두 가지만 허용한다
- production code를 수정하면 `analyze-changes`와 `code-review` 산출물이 stale이 되므로, 반드시 Phase 1~2 재실행을 사용자에게 제안한 뒤 종료한다

## Step 3: 산출물 작성

반드시 아래 파일을 만든다.

- `docs/reviews/{scope}/{runId}/test-plan.md`
- `docs/reviews/{scope}/{runId}/coverage-report.md`
- `docs/reviews/{scope}/{runId}/coverage-report.json`
- `docs/reviews/{scope}/{runId}/status/test-unit.json`

상세 규정은 아래 문서를 따른다.

- 규칙: [test-unit-rules.md](./test-unit-rules.md)
- coverage gate: [references/coverage-gate.md](./references/coverage-gate.md)
- failure handling: [references/failure-handling.md](./references/failure-handling.md)

## Completion Status

- `DONE`: differential 100%와 scope 90%를 모두 만족
- `DONE_WITH_CONCERNS`: gate 일부 미달이지만 정당한 예외(배럴/타입 전용/generated 등)를 `coverage-report.md`에 명시
- `BLOCKED`: Vitest 환경 부재, coverage 측정 불가, prod fix 필요하지만 `--allow-prod-fix` 없음, 앞 phase stale
- `NEEDS_CONTEXT`: 테스트 정책 문서 충돌, selection 범위 확정 불가, production 수정 후 Phase 1~2 재실행 응답 대기
