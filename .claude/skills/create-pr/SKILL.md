---
name: create-pr
description: 현재 브랜치의 커밋 변경을 분석해 pr-template.md 기반의 PR 제목/본문 초안을 작성한다. 사용자 확인 후 PR을 생성한다. PR 준비, PR 본문 작성, 리뷰용 초안 생성 요청 시 사용.
argument-hint: [base-branch]
allowed-tools: Read Bash Glob Grep
---

# PR 초안 생성

## 핵심 원칙

- **사용자의 명시적 확인 없이 `gh pr create`를 실행하지 않는다**
- 유형 판별, base branch, 검증 등에서 **사실과 추정을 반드시 구분**한다
- 검증 항목은 실제 확인한 사실만 적고, 모르면 `미실행` 또는 `미확인`으로 둔다
- 이 skill은 **working tree가 아니라 `base..HEAD` 커밋 범위만 분석**한다
- 커밋되지 않은 변경은 PR 초안에 포함하지 않으며, warning으로만 표시한다

---

## 실행 흐름

### Step 1: Base Branch 확정

사용자 인자 `[base-branch]`가 있으면 그것을 사용한다. 없으면 아래 우선순위로 추정:

1. `main`
2. `master`
3. `develop`
4. `dev`

**중단 조건:**
- current branch == base branch → 중단
- 위 후보가 하나도 없음 → 중단
- 중단 시: "base branch를 확정할 수 없어 PR 초안을 만들 수 없습니다. base branch를 지정해 주세요."

base branch는 항상 출력에 출처를 표시한다:
- `main (user-specified)` 또는 `main (inferred)`

### Step 2: Git 컨텍스트 수집

`scripts/collect-pr-context.sh`를 실행하여 브랜치 정보를 수집한다.

```bash
bash .claude/skills/create-pr/scripts/collect-pr-context.sh <base-branch>
```

스크립트가 수집하는 항목:
- current branch, base branch, dirty 여부
- ahead commits (oneline)
- changed files (name-status)
- diff stat

**추가 규칙:**
- uncommitted 변경이 있으면 warning으로 표시 (blocker 아님)
- dirty 상태여도 PR 초안 대상은 **현재 브랜치의 커밋(`base..HEAD`)만** 본다
- working tree 변경은 본문 분석, 유형 판별, 파일 구조 요약에 포함하지 않는다
- ahead commit이 0개면 초안 생성을 중단: "base 대비 변경 커밋이 없습니다."

### Step 3: PR 유형 판별

변경 파일 경로를 기반으로 PR 유형을 자동 판별한다.
판별 규칙은 [references/type-detection.md](./references/type-detection.md)를 따른다.

### Step 4: 템플릿 기반 초안 생성

1. 프로젝트 루트의 `pr-template.md`를 읽는다
2. [create-pr-rules.md](./create-pr-rules.md)의 섹션별 채우기 규칙에 따라 본문을 작성한다
3. Skill PR일 경우 [references/compatibility-check.md](./references/compatibility-check.md)의 호환성 검사를 수행한다

**PR 제목 규칙:**
- conventional commit prefix 사용 (`feat:`, `docs:`, `fix:`, `refactor:`, `chore:`)
- 70자 이내
- PR 유형 → prefix 매핑: Skill 신규 → `feat:`, Skill 수정 → `fix:` 또는 `refactor:`, 문서 → `docs:`, 코드 변경 → 변경 내용에 따라

### Step 5: 사용자에게 초안 제시

아래 형식으로 초안을 보여준다:

```
## PR Draft

### Title
{conventional-prefix}: {간결한 설명}

### Base Branch
{branch} ({user-specified | inferred})

### Warnings
- {경고 항목들, 없으면 생략}

### Body
{pr-template.md 형식의 전체 PR 본문}
```

그 후 사용자에게 묻는다:
> "이 내용으로 PR을 올릴까요? 수정할 부분이 있으면 말씀해주세요."

dirty 상태일 때는 warning에 아래 문구를 포함한다:
- `working tree에 커밋되지 않은 변경이 있습니다`
- `이 PR 초안은 현재 브랜치의 커밋만 기준으로 작성되며, uncommitted 변경은 포함되지 않았습니다`

### Step 6: 사용자 응답에 따른 분기

- **수정 요청** → 해당 부분 반영 후 Step 5로 돌아가 다시 제시
- **승인** ("올려줘", "좋아", "ㅇㅇ" 등) → `gh pr create` 실행, PR URL 반환
- **거부** ("아니", "취소" 등) → "PR 생성을 취소했습니다." 출력 후 종료

PR 생성 시:
```bash
gh pr create --base <base-branch> --title "<title>" --body "<body>"
```

---

## 참고 파일

| 파일 | 역할 |
|---|---|
| [create-pr-rules.md](./create-pr-rules.md) | PR 본문 섹션별 채우기 규칙 |
| [scripts/collect-pr-context.sh](./scripts/collect-pr-context.sh) | git 정보 수집 스크립트 |
| [references/type-detection.md](./references/type-detection.md) | PR 유형 판별 규칙 |
| [references/compatibility-check.md](./references/compatibility-check.md) | Skill 호환성 검사 규칙 |
| `pr-template.md` (프로젝트 루트) | PR 본문 템플릿 |
