# Gate Protocol

각 phase 종료 후 아래 형식으로 사용자에게 묻는다.

```text
[Phase N 완료] status = DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
산출물: <경로 목록>
concerns: <있으면 요약, 없으면 없음>

다음 중 하나를 선택하세요:
  proceed
  revise:<지시>
  stop
  back:<N>
```

## 규칙

- 자동 진행 금지
- `BLOCKED`, `NEEDS_CONTEXT`에서는 `proceed` 거부
- 응답은 `status/review-build.json`의 `gateHistory`에 기록
