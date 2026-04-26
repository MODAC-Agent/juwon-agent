# Coverage Gate

coverage gate는 사용 가능한 증거 수준에 맞춰 판정한다.
line-level diff coverage를 계산할 수 있는 스크립트나 리포트가 있을 때만 differential 기준을 `DONE`의 필수 조건으로 삼는다.

## 기준

### differential

이번 diff에서 **추가/수정된 라인**은 statements / branches / functions / lines 모두 **100%**.
단, 이 기준은 diff 라인과 coverage 리포트를 연결하는 deterministic evidence가 있을 때만 적용한다.

### scope

변경 대상 파일 **전체**는 statements / branches / functions / lines 모두 **90% 이상**.

## 상태 판정

| 상황                                                            | 상태                 |
| --------------------------------------------------------------- | -------------------- |
| 관련 테스트 통과 + deterministic differential 100% **AND** scope ≥ 90% | `DONE`               |
| 관련 테스트 통과 + scope ≥ 90% 이지만 differential evidence 없음       | `DONE_WITH_CONCERNS` |
| 관련 테스트 통과 + gate 미달이 정당한 예외로 문서화됨                  | `DONE_WITH_CONCERNS` |
| 관련 테스트 실패 또는 근거 없이 기준 미달                              | `BLOCKED`            |
| Vitest 없음, coverage provider 없음, prod fix 필요하지만 미허용 | `BLOCKED`            |
| 정책 문서 충돌 또는 selection 범위 확정 불가                    | `NEEDS_CONTEXT`      |

상세 실패 분류는 [failure-handling.md](./failure-handling.md).

## 제외 가능 항목

아래는 coverage 계산에서 제외해도 된다.

- barrel file (`index.ts`처럼 re-export만 하는 파일)
- type-only file (타입 선언만 있는 파일)
- generated file
- side-effect bootstrap file
- 선언형 상수 파일

제외하면 반드시 `coverage-report.md`에 파일 경로와 이유를 남긴다.

## 왜 이중 기준인가

- 100% 단일 기준만 쓰면 trivial 분기 테스트를 양산하고 무한 `BLOCKED`가 된다
- 90% 단일 기준만 쓰면 이번 diff에서 새로 들어온 버그성 분기를 놓치기 쉽다
- diff 라인은 엄격하게(100%), 파일 전체는 현실적으로(90%) 분리 관리하되, diff 라인 coverage를 증명할 수 없으면 `DONE_WITH_CONCERNS`로 투명하게 남긴다
