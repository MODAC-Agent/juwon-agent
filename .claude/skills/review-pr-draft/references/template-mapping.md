# Template Mapping

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
