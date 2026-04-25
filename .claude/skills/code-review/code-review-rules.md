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

## 리뷰 관점

1. 동작 회귀 가능성
2. 데이터 계약 위반 가능성
3. null / undefined / empty branch 누락
4. 비동기 흐름과 error handling
5. 테스트 공백
6. 저장소 구조 규약 위반
7. 접근성 / 반응형 영향

우선순위는 버그 가능성, 데이터 손상/권한 이슈, 테스트 공백, 구조 일관성, 접근성/반응형 순서로 둔다.

## 심각도 기준

- `critical`: 출시 차단. 데이터 손상, 인증 우회, 치명적 회귀 가능성
- `major`: 기능 오동작, 흔한 에러 케이스 누락, 중요한 계약 위반
- `minor`: 바로 깨지진 않지만 유지보수성이나 경계 조건이 취약해지는 문제
- `suggestion`: 리스크는 낮지만 다음 수정 때 같이 정리하면 좋은 항목

## status 판정

- stale이 아니고 findings 구조화 완료 시 `DONE`
- 확인이 더 필요하지만 리뷰 효용이 충분하면 `DONE_WITH_CONCERNS`
- analyze-changes가 stale 또는 누락이면 `BLOCKED`
- scope 경계가 불명확하면 `NEEDS_CONTEXT`
