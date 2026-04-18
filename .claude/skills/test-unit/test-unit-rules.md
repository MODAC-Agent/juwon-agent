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

## production code 수정 규칙

- 기본 금지
- `--allow-prod-fix` 없이는 production file 수정 필요 시 `BLOCKED`
- `--allow-prod-fix`가 있어도 export/DI 노출 또는 명백한 버그 수정만 허용
- production code가 바뀌면 Phase 1, 2 재실행을 제안한다

## status 판정

- gate 통과: `DONE`
- gate 미달 + 정당한 예외 문서화: `DONE_WITH_CONCERNS`
- 러너/설정/coverage 부재: `BLOCKED`
- 정책 충돌/범위 불명: `NEEDS_CONTEXT`
