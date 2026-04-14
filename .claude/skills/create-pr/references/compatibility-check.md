# Skill 호환성 검사 규칙

Skill PR (주 유형이 `Skill 신규` 또는 `Skill 수정`)일 때만 수행한다.
코드 전용 PR이면 이 검사를 건너뛴다.

---

## 검사 항목

### 1. 트리거 충돌 검사

**목적:** 새로 추가/수정된 skill의 description이 기존 skill과 유사한 트리거를 가지지 않는지 확인

**수행 방법:**
```bash
# 모든 skill의 name과 description 수집
grep -rn "^name:\|^description:" .claude/skills/*/SKILL.md
```

**판별:**
- 새 skill의 description에 포함된 핵심 키워드가 기존 skill의 description에도 있는지 확인
- 동일한 사용자 의도(예: "PR 생성", "디자인 추출")를 트리거하는 skill이 2개 이상이면 → `검토 필요`
- 명확히 다른 도메인이면 → `충돌 없음 (휴리스틱 기준)`

### 2. 문서/워크플로 불일치 검사

**목적:** skill 변경에 대응하는 문서가 업데이트되었는지 확인

**수행 방법:**
```bash
# docs/skills/ 에 대응 문서가 있는지 확인
ls docs/skills/

# 변경된 skill의 대응 문서가 이번 PR에 포함되었는지 확인
git diff --name-status <merge-base>...HEAD -- 'docs/skills/'
```

**판별:**
- skill이 신규인데 `docs/skills/` 에 대응 문서가 없으면 → `검토 필요` (문서 추가 누락 가능)
- skill이 수정인데 대응 문서가 변경되지 않았으면 → 변경 범위에 따라 `검토 필요` 또는 `충돌 없음`
- 문서가 함께 변경되었으면 → `불일치 없음`

### 3. 기존 skill 동작 영향 검사

**목적:** 이번 변경이 기존 skill의 실행에 영향을 주는지 확인

**수행 방법:**
```bash
# 변경된 파일 중 기존 skill의 reference로 사용되는 파일이 있는지
# (예: shared reference, 공통 문서)
git diff --name-status <merge-base>...HEAD -- '.claude/skills/'
```

**판별 기준:**

| 상황 | 결과 |
|---|---|
| 신규 skill만 추가, 기존 파일 미수정 | `없음` |
| 기존 skill의 SKILL.md description 변경 | `있음 (의도된 변경)` — 변경 내용 기술 |
| 기존 skill의 reference 파일 수정 | `있음 (주의 필요)` — 영향받는 skill 명시 |
| 공유 참조 파일(여러 skill이 참조) 수정 | `있음 (주의 필요)` — 모든 영향 skill 나열 |
| 판단 불가 | `미확인` |

---

## 결과 표시 형식

호환성 섹션의 체크리스트에 결과를 반영한다:

```markdown
- [x] 기존 skill과 트리거 충돌 없음
- [x] 기존 문서/워크플로와 불일치 없음

### 기존 skill 동작 영향

없음
```

또는:

```markdown
- [ ] 기존 skill과 트리거 충돌 없음 → 검토 필요: figma-extract와 description 키워드 겹침
- [x] 기존 문서/워크플로와 불일치 없음

### 기존 skill 동작 영향

있음 (주의 필요): figma-extract의 references/validation.md를 수정하여 figma-implement에도 영향 가능
```

---

## 중요 원칙

- 이 검사는 **자동 pass/fail이 아니라 휴리스틱 점검**이다
- 결과는 다음 3가지 중 하나로만 표시:
  - `충돌 없음 (휴리스틱 기준)`
  - `검토 필요`
  - `미확인`
- 판단이 애매하면 `미확인`으로 두고 리뷰 포인트에 올린다
