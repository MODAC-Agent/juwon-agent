# Template Mapping

## 원칙

- 실제 검증하지 않은 것은 쓰지 않는다
- `review-report`의 findings를 숨기지 않는다
- 테스트 결과는 differential / scope gate를 그대로 적는다
- 이 단계에서 `gh pr create`를 실행하지 않는다
- 제목은 70자 이내로 쓰고, change-summary의 핵심 변경 의도를 드러낸다
- risk가 크면 제목보다 본문에서 설명한다

## 리스크 문구

- 사실: "현재 diff에는 ...가 포함됩니다"
- 추정: "(추정) 이 변경은 ...에 영향을 줄 수 있습니다"
- 미확인: "[미확인] 런타임에서 ...는 아직 검증되지 않았습니다"

피해야 할 표현:

- "문제 없을 것 같습니다"
- "대충 괜찮아 보입니다"
- 근거 없는 확정 표현

## 섹션 매핑

- `change-summary.md` -> 배경, 변경 이유, 영향 범위
- `review-report.md` -> findings, review points, reviewer attention
- `coverage-report.md` -> 테스트 범위, gate 결과, 예외

## `pr-draft.json`

### 필수 필드

```json
{
  "scope": "agent-detail",
  "runId": "20260418T091000Z-committed-main-def456",
  "baseRef": "main",
  "title": "fix: harden agent detail parsing flow",
  "templateSource": ".github/pull_request_template.md",
  "body": "..."
}
```

### 선택 필드

- `sections`: 섹션별로 미리 잘린 본문을 별도 저장할 때 사용. `create-pr`가 본문을 재조합할 수 있도록 돕는 보조 필드.

```json
{
  "sections": {
    "background": "...",
    "changes": "...",
    "verification": "...",
    "risks": "..."
  }
}
```

필수는 아니며, `body`에 이미 완성된 본문이 담겨 있으면 생략해도 된다.

## Handoff to `create-pr`

PR 게시가 필요하면 `create-pr`를 draft 게시 모드로 실행한다.

```bash
/create-pr --from-draft=docs/reviews/{scope}/{runId}/pr-draft.json
```

`create-pr`는 `pr-draft.json.body`를 최종 본문으로 취급한다. `sections`가 있더라도 게시 직전에 본문을 재조합하지 않는다.
