---
name: review-pr-draft
description: PR 초안 작성, PR 본문 정리, review-build 결과를 pull request 템플릿에 매핑할 때 사용. 실제 PR 생성 없이 pr-draft.md/json만 만든다.
argument-hint: [scope] [--run-id=<runId>] [base-branch]
allowed-tools: Read Edit Write Bash Glob Grep
---

# Review PR Draft

## 목적

`review-pr-draft`는 `create-pr`를 대체하지 않는다.
이 skill은 review 결과를 PR 템플릿 구조에 맞춰 문서화하는 얇은 wrapper다.

## Step 1: 입력 확인

아래 파일이 모두 있는지 확인한다.

- `change-summary.md/json`
- `review-report.md/json`
- `coverage-report.md/json`

각 phase status를 `.claude/scripts/status-read.ts`로 stale 검사한다. `stale: true`면 `BLOCKED`로 종료하고 어느 phase를 재실행할지 제안한다.

## Step 2: 템플릿 선택

우선순위:

1. `.github/pull_request_template.md` (소비 저장소)
2. 루트 `pr-template.md` (fallback)

두 파일이 모두 있으면 1번만 사용하고 2번은 건드리지 않는다. 둘 다 없으면 `BLOCKED`.

세부 매핑은 아래 문서를 따른다.

- 섹션 매핑: [references/template-mapping.md](./references/template-mapping.md)

## Step 3: 산출물 작성

반드시 아래 파일을 만든다.

- `docs/reviews/{scope}/{runId}/pr-draft.md`
- `docs/reviews/{scope}/{runId}/pr-draft.json`
- `docs/reviews/{scope}/{runId}/status/review-pr-draft.json`

status 작성 전 아래 검증을 반드시 통과한다.

```bash
node --experimental-strip-types .claude/scripts/validate-contract.ts --phase=review-pr-draft --review-dir=docs/reviews/{scope}/{runId}
```

### pr-draft.json 필수 필드

```json
{
  "scope": "...",
  "runId": "...",
  "baseRef": "main",
  "title": "짧은 제목 (≤70자)",
  "templateSource": ".github/pull_request_template.md | pr-template.md",
  "body": "...최종 PR 본문 전체..."
}
```

선택적으로 `sections` 필드를 덧붙여 섹션별 본문을 분리 저장할 수 있다. 자세한 규칙은 [references/template-mapping.md](./references/template-mapping.md).

실제 PR 게시는 수행하지 않는다. 사용자가 승인하면 아래처럼 `create-pr`에 draft 파일을 넘겨 게시한다.

```bash
/create-pr --from-draft=docs/reviews/{scope}/{runId}/pr-draft.json
```

`create-pr`는 draft의 `title`, `body`, `baseRef`를 그대로 사용해야 하며, 이 단계의 review/coverage 정보를 git diff 기반으로 재작성하지 않는다.

## Completion Status

- `DONE`: title, body, templateSource, baseRef가 모두 기록됨
- `DONE_WITH_CONCERNS`: 템플릿은 채웠지만 리스크/검증 정보에 `[미확인]`이 남음
- `BLOCKED`: 템플릿 소스 없음, upstream 산출물 누락, stale
- `NEEDS_CONTEXT`: baseRef 또는 PR 제목 방향 확정 불가
