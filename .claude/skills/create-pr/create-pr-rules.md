# PR 초안 작성 규칙

이 문서는 `pr-template.md`의 각 섹션을 채우는 상세 규칙을 정의한다.

---

## 공통 원칙

- 모든 섹션에서 **사실과 추정을 구분**한다
- 확신이 없는 내용은 단정하지 말고 `(추정)` 또는 `(미확인)`으로 표시한다
- `[AI 작성 가이드]` 주석 블록은 최종 출력에서 **제거**한다
- 코드 전용 PR이면 `Skill 영향 범위`와 `호환성` 섹션을 **삭제**한다
- PR 초안의 분석 대상은 **현재 브랜치의 `base..HEAD` 커밋 범위만**이다
- working tree의 uncommitted 변경은 본문에 반영하지 않고, warning으로만 알린다

---

## 섹션별 작성 규칙

### 1. PR 유형

`references/type-detection.md`의 판별 결과를 체크박스에 반영한다.

- 주 유형: 1개만 `[x]`
- 보조 유형: 해당하는 것 모두 `[x]`
- 자동 판별로 결정된 경우, 본문 어딘가에 다음 문구를 삽입:
  > PR 유형은 변경 경로 기준 자동 추정입니다.

### 2. 배경

**정보 소스 우선순위:**
1. 현재 세션 대화 맥락 (왜 이 작업을 시작했는지)
2. commit message에서 읽히는 동기
3. diff에서 추론 가능한 목적

**작성 규칙:**
- "무엇을 바꿨는지"보다 "왜 지금 이 변경이 필요한지"를 먼저 작성
- 완료 기준(성공 조건)을 1~2개로 명시
- 의도적으로 제외한 범위가 있으면 명시
- 세션 정보가 부족하면 다음을 삽입:
  > 아래 배경 일부는 git diff/commit 기준 추정입니다.

### 3. 구현 사항

**작성 규칙:**
- 파일 나열보다 **선택 근거와 의사결정**을 중심으로 작성
- 대안/트레이드오프가 있었다면 왜 제외했는지 포함
- 핵심 요구사항별로 어떤 구현이 대응되는지 매핑

**파일 구조:**
- 변경된 파일을 역할별로 그룹핑하여 트리 형태로 작성
- Skill 작업과 코드 작업에 따라 다른 형식 사용:

Skill 작업 예시:
```
.claude/skills/{skill-name}/
├── SKILL.md                          — skill 진입점
├── {skill-name}-rules.md             — 상세 규칙
└── references/                       — 보조 참조 문서
docs/skills/{skill-name}.md           — 사용법 문서
```

코드 작업 예시:
```
src/entities/agent/api/http/get-agent.ts   — HTTP 요청 함수
src/entities/agent/api/queries.ts          — React Query 옵션
src/features/agent-create/api/use-create.ts — 커스텀 훅
```

### 4. 검증

**PR 유형에 따라 형식이 달라진다:**

#### 코드 변경
- 상태를 명시: `통과` / `실패` / `미실행`
- 검증 환경(브랜치/OS/브라우저 등)을 필요한 범위에서 기재
- 세션에서 테스트를 실행하지 않았으면 `미실행`으로 기재

#### Skill 변경 — Smoke Test
아래 표를 채운다. 세션에서 실행하지 않았으면 실제 결과를 `미실행`으로 기재:

```markdown
| 항목 | 내용 |
|---|---|
| 실행 명령 | 예: `/create-pr main` |
| 입력 조건 | 예: main 대비 3커밋 ahead |
| 기대 결과 | 예: PR 제목/본문 초안 생성 |
| 실제 결과 | 예: 초안 생성 완료 / 미실행 |
| 산출물 경로 | 예: 텍스트 출력 (파일 생성 없음) |
| Blocker | 없음 / 있음 (내용 기술) |
```

#### 문서만 변경
- "문서 변경만 포함, 런타임 영향 없음"으로 명시

**중요: skill은 테스트 결과를 상상하지 않는다. 실제 확인한 것만 적는다.**

### 5. Skill 영향 범위

> 코드 전용 PR이면 이 섹션 전체를 삭제한다.

#### 트리거 변경 사항
- SKILL.md의 `description` 변경 여부를 diff에서 확인
- 새 트리거 문구 추가/삭제 여부
- 변경 없으면 "변경 없음"

판별 방법:
```bash
git diff <base>...HEAD -- '.claude/skills/*/SKILL.md' | grep -E '^\+.*description:|^\-.*description:'
```

#### 실행 경로 변경 사항
- SKILL.md에서 참조하는 파일(rules, references/) 경로 변경 여부
- 신규 reference 파일 추가/삭제 여부
- 변경 없으면 "변경 없음"

판별 방법:
```bash
git diff --name-status <base>...HEAD -- '.claude/skills/*/references/' '.claude/skills/*/*-rules.md'
```

### 6. 호환성

> 코드 전용 PR이면 이 섹션 전체를 삭제한다.

`references/compatibility-check.md`의 검사 결과를 채운다.

- 체크리스트 항목에 `[x]` 또는 `[ ]` 표시
- 기존 skill 동작 영향은 다음 중 하나로 명시:
  - `없음`
  - `있음 (의도된 변경)` + 설명
  - `있음 (주의 필요)` + 설명
  - `미확인`

### 7. 리뷰 포인트

- diff에서 논쟁 가능성이 큰 의사결정 1~3개를 질문 형태로 작성
- 없으면 가장 중요한 추정 지점 1개를 리뷰 포인트로 올린다
- "리뷰 부탁드립니다"처럼 포괄적 요청만 쓰지 않는다

### 8. Reference

- 세션에서 언급된 참고 링크를 누락 없이 기입
- 관련 로컬 문서 경로 포함
- 없으면 "없음"

---

## PR 제목 규칙

### Prefix 매핑

| PR 주 유형 | 기본 prefix |
|---|---|
| Skill 신규 | `feat:` |
| Skill 수정 | `fix:` 또는 `refactor:` (변경 성격에 따라) |
| 문서 (docs only) | `docs:` |
| 코드 변경 | 변경 내용에 따라 `feat:` / `fix:` / `refactor:` / `chore:` |

### 형식

- `{prefix} {간결한 설명}`
- 70자 이내
- 한국어 또는 영어 (커밋 메시지 언어를 따름)
- 예: `feat: add create-pr skill for PR draft generation`
- 예: `docs: figma 추출/구현 skill 설명 문서 추가`
