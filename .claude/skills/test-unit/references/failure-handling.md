# Failure Handling

## `BLOCKED`

- `package.json` 없음
- `vitest` 없음
- coverage provider 없음
- prod fix 필요하지만 `--allow-prod-fix` 없음

## `NEEDS_CONTEXT`

- `.ai/TESTING.md`와 저장소 규약이 충돌
- co-located와 central test dir 중 어느 쪽을 따라야 할지 불명
- 어떤 파일을 transitive 범위에 넣을지 애매함

## `DONE_WITH_CONCERNS`

- 관련 테스트는 통과했지만 line-level diff coverage를 deterministic하게 계산할 수 없음
- differential은 통과했지만 scope가 예외 승인 없이는 조금 모자람
- 측정 제외 파일이 많아 다음 phase에서 리뷰어 설명이 필요함
