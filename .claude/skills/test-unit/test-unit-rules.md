# Test Unit Rules

## v1 범위

- Vitest만 지원한다
- Jest, Mocha, Playwright-only 프로젝트는 즉시 `BLOCKED`

## 입력 우선순위

1. `change-summary.json`
2. `review-report.json`
3. 저장소 테스트 정책 문서
4. 이 파일

## selection 규칙

- 기본은 `strict`
- `transitive`는 사용자가 명시하거나 high-risk target일 때만 사용
- `strict`: changed production files 자체만 coverage 대상으로 둔다
- `transitive`: changed file이 새로 직접 호출하는 내부 의존 파일까지 포함한다
- 우선 target은 `analyze-changes.testTargets`, `code-review.testGaps.priority == required`, parsing / branching / async error path가 있는 파일 순서로 둔다

## production code 수정 규칙

- 기본 금지
- `--allow-prod-fix` 없이는 production file 수정 필요 시 `BLOCKED`
- `--allow-prod-fix`가 있어도 export/DI 노출 또는 명백한 버그 수정만 허용
- production code가 바뀌면 Phase 1, 2 재실행을 제안한다

## status 판정

- 관련 테스트 통과 + 사용 가능한 coverage evidence가 gate 충족: `DONE`
- 테스트 통과 + line-level diff coverage 계산 불가 또는 정당한 예외 문서화: `DONE_WITH_CONCERNS`
- 러너/설정/coverage 부재: `BLOCKED`
- 정책 충돌/범위 불명: `NEEDS_CONTEXT`
