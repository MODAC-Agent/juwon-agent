# create-pr Skill

현재 브랜치의 변경을 분석하여 `pr-template.md` 형식의 PR 제목/본문 초안을 생성하는 skill이다.

---

## 언제 사용하는가

- PR을 올리기 전에 초안을 준비하고 싶을 때
- 브랜치 작업이 끝나고 PR 본문을 작성해야 할 때
- 변경 내용을 정리해서 리뷰용 초안을 만들고 싶을 때

## 실제 PR 생성 여부

- skill은 먼저 **초안만 보여준다**
- 사용자가 내용을 확인하고 승인하면 그때 `gh pr create`를 실행한다
- 사용자가 수정을 요청하면 반영 후 다시 보여준다
- 사용자가 거부하면 PR을 생성하지 않고 종료한다

## 분석 범위

- 이 skill은 **현재 브랜치의 `base..HEAD` 커밋 범위만** 분석한다
- 즉, PR 초안은 현재 브랜치에 올라와 있는 커밋들만 기준으로 작성된다
- working tree의 커밋되지 않은 변경은 PR 초안에 포함되지 않는다
- 커밋되지 않은 변경이 있으면 warning으로만 표시한다

---

## 사용법

### 기본 (base branch 자동 추정)

```
/create-pr
```

main → master → develop → dev 순서로 base branch를 추정한다.

### base branch 지정

```
/create-pr main
```

```
/create-pr develop
```

---

## 실행 흐름

```
/create-pr [base-branch]
     ↓
1. Base branch 확정
2. Git 컨텍스트 수집 (커밋, diff, 변경 파일)
3. PR 유형 자동 판별
4. pr-template.md 기반 초안 생성
5. 사용자에게 초안 제시
     ↓
사용자: "수정해줘" → 반영 후 다시 제시
사용자: "올려줘"   → gh pr create 실행 → PR URL 반환
사용자: "취소"     → 종료
```

---

## 예시 입력

현재 브랜치 `week1`에서 `main` 대비 3개 커밋이 있는 상황:

```
/create-pr
```

## 예시 출력

```markdown
## PR Draft

### Title
feat: add create-pr skill for PR draft generation

### Base Branch
main (inferred)

### Warnings
- working tree에 커밋되지 않은 변경이 있습니다
- PR 유형은 변경 경로 기준 자동 추정입니다
- 이 PR 초안은 현재 브랜치의 커밋만 기준으로 작성되며, uncommitted 변경은 포함되지 않았습니다

### Body

## PR 유형

### 주 유형

- [x] Skill 신규
- [ ] Skill 수정
- [ ] 문서 (docs only)
- [ ] 코드 변경

### 보조 유형

- [ ] 코드 포함
- [x] 문서 포함
- [ ] 기존 동작 변경 포함

## 배경

현재 브랜치에서 skill을 지속적으로 추가해 나가는 과정에서,
PR을 올릴 때마다 pr-template.md 형식에 맞게 본문을 작성하는
반복 작업을 자동화하기 위해 create-pr skill을 추가한다.

**완료 기준:**
1. `/create-pr` 실행 시 PR 초안이 pr-template.md 형식으로 생성된다
2. 사용자 확인 후 PR이 생성된다

## 구현 사항

PR 초안 생성을 6단계 흐름으로 구성했다:
base branch 확정 → git 수집 → 유형 판별 → 초안 작성 → 제시 → 사용자 확인 후 생성.

git 정보 수집은 shell script로 분리하여 deterministic한 출력을 보장했다.

### 파일 구조

.claude/skills/create-pr/
├── SKILL.md                          — skill 진입점
├── create-pr-rules.md                — PR 본문 작성 규칙
├── scripts/
│   └── collect-pr-context.sh         — git 정보 수집
└── references/
    ├── type-detection.md             — PR 유형 판별 규칙
    └── compatibility-check.md        — 호환성 검사 규칙
docs/skills/create-pr.md             — 사용법 문서

## 검증

| 항목 | 내용 |
|---|---|
| 실행 명령 | `/create-pr main` |
| 입력 조건 | main 대비 3커밋 ahead |
| 기대 결과 | PR 제목/본문 초안 생성 |
| 실제 결과 | 미실행 |
| 산출물 경로 | 텍스트 출력 (파일 생성 없음) |
| Blocker | 없음 |

## Skill 영향 범위

### 트리거 변경 사항

- 새 트리거 문구 추가: "PR 준비", "PR 본문 작성", "리뷰용 초안 생성"

### 실행 경로 변경 사항

- 신규 skill — 기존 실행 경로 변경 없음

## 호환성

- [x] 기존 skill과 트리거 충돌 없음
- [x] 기존 문서/워크플로와 불일치 없음

### 기존 skill 동작 영향

없음 — 신규 skill 추가만 포함, 기존 skill 파일 미수정

## 리뷰 포인트

1. shell script로 git 정보를 수집하는 방식이 적절한지,
   아니면 SKILL.md에서 직접 git 명령을 실행하는 게 나은지?
2. PR 유형 자동 판별의 우선순위 기준이 합리적인지?

### Reference

- `pr-template.md` — PR 본문 템플릿
- `docs/skills/figma-workflow.md` — 기존 skill 문서 패턴 참고
```

이 내용으로 PR을 올릴까요? 수정할 부분이 있으면 말씀해주세요.

---

## 주의 사항

- uncommitted 변경이 있으면 warning을 표시하지만 blocker는 아니다
- uncommitted 변경은 PR 초안에 포함되지 않는다
- 검증 항목은 실제 확인한 것만 적고, 모르면 `미실행`으로 둔다
- PR 유형, base branch 등 자동 판별 결과는 `(추정)` 또는 `(inferred)`를 표시한다

---

## 파일 구조

```
.claude/skills/create-pr/
├── SKILL.md                          — skill 진입점 (트리거, 실행 흐름)
├── create-pr-rules.md                — PR 본문 섹션별 채우기 규칙
├── scripts/
│   └── collect-pr-context.sh         — git 정보 수집 스크립트
└── references/
    ├── type-detection.md             — PR 유형 판별 규칙
    └── compatibility-check.md        — 호환성 검사 규칙
docs/skills/create-pr.md             — 이 문서
pr-template.md                        — PR 본문 템플릿 (프로젝트 루트)
```
