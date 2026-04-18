# Code Review Rules

## Findings-first

- 요약보다 findings를 먼저 쓴다
- praise-first 리뷰를 하지 않는다
- lint가 잡을 스타일 지적보다 동작 리스크를 우선한다

## 필수 출력

- `findings`
- `testGaps`
- `risksForPr`
- `unknowns`

## findings 작성 규칙

- 가능한 한 파일 경로와 라인 근처를 적는다
- 문제, 영향, 근거를 짧게 연결한다
- "아마", "느낌상" 같은 표현 대신 `[미확인]`이나 `(추정)`을 쓴다

## status 판정

- stale이 아니고 findings 구조화 완료 시 `DONE`
- 확인이 더 필요하지만 리뷰 효용이 충분하면 `DONE_WITH_CONCERNS`
- analyze-changes가 stale 또는 누락이면 `BLOCKED`
- scope 경계가 불명확하면 `NEEDS_CONTEXT`
