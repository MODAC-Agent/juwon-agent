# Output Schema

## `change-summary.md`

최소 섹션:

1. 분석 범위
2. 변경 파일 분류
3. 핵심 변경 포인트
4. 위험 영역
5. 테스트 대상
6. 미확인 사항

## `change-summary.json`

최소 필드:

```json
{
  "scope": "agent-detail",
  "runId": "20260418T091000Z-committed-main-def456",
  "analysisMode": "committed",
  "baseRef": "main",
  "baseCommitSha": "abc123",
  "headCommitSha": "def456",
  "generatedAt": "2026-04-18T09:10:00Z",
  "changedFiles": [],
  "fileCategories": {
    "production": [],
    "test": [],
    "docs": [],
    "config": []
  },
  "riskAreas": [
    { "path": "src/entities/agent/api/http/get-agent.ts", "reason": "외부 응답 파싱 로직 변경", "level": "high" }
  ],
  "testTargets": [
    {
      "id": "TGT-001",
      "path": "src/entities/agent/api/http/get-agent.ts",
      "selectionMode": "strict",
      "type": "api-http"
    }
  ],
  "unknowns": ["..."]
}
```

`testTargets[].id`는 `code-review.testGaps[].id`와 1:1로 연결되므로 반드시 유일한 식별자여야 한다. `TGT-001`처럼 scope 내에서 단조 증가하는 문자열을 쓴다.

## `status/analyze-changes.json`

반드시 포함:

- `skill`
- `phase`
- `scope`
- `runId`
- `status`
- `analysisMode`
- `baseRef`
- `baseCommitSha`
- `headCommitSha`
- `generatedAt`
- `outputs`
- `concerns`
