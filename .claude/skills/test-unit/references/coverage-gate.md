# Coverage Gate

두 기준을 모두 만족해야 `DONE`이다. 어느 쪽도 단독으로는 통과가 아니다.

## 기준

### differential

이번 diff에서 **추가/수정된 라인**은 statements / branches / functions / lines 모두 **100%**.

### scope

변경 대상 파일 **전체**는 statements / branches / functions / lines 모두 **90% 이상**.

## 상태 판정

| 상황                                                            | 상태                 |
| --------------------------------------------------------------- | -------------------- |
| differential 100% **AND** scope ≥ 90%                           | `DONE`               |
| differential 100%, scope < 90% 이지만 예외를 근거와 함께 문서화 | `DONE_WITH_CONCERNS` |
| differential < 100% 이고 정당한 예외로 인정됨                   | `DONE_WITH_CONCERNS` |
| 근거 없이 기준 미달                                             | `BLOCKED`            |
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
- diff 라인은 엄격하게(100%), 파일 전체는 현실적으로(90%) 분리 관리한다
