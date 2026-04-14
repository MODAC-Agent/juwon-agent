# PR 유형 자동 판별 규칙

변경된 파일 경로를 기반으로 PR의 주 유형과 보조 유형을 판별한다.

---

## 주 유형 판별

주 유형은 **1개만** 선택한다. 위에서부터 순서대로 평가하여 **먼저 해당하는 것**을 선택한다.

### 판별 순서

1. **Skill 신규**: `.claude/skills/<name>/` 디렉토리가 **신규 추가**된 것이 핵심 변경
   - 판별: changed files에 `.claude/skills/<new-name>/SKILL.md`가 `A` (Added) 상태
   - 기존 skill 디렉토리에 없던 새 디렉토리가 생성됨

2. **Skill 수정**: `.claude/skills/` 내 **기존 파일이 수정**된 것이 핵심 변경
   - 판별: changed files에 `.claude/skills/`가 포함되지만, 신규 디렉토리 추가가 아님
   - SKILL.md, rules, references 등의 `M` (Modified) 또는 부분 `A` (기존 skill에 파일 추가)

3. **코드 변경**: `src/`, `app/`, `scripts/`, 설정 파일 등 **실행 로직 변경**이 핵심
   - 판별: `src/**`, `app/**`, `scripts/**`, `*.config.*`, `*.json` (package.json 등) 변경 포함

4. **문서 (docs only)**: 변경 파일이 **모두 문서성 파일**인 경우
   - 문서성 파일 목록:
     - `docs/**`
     - `*.md` (루트 및 하위)
     - `pr-template.md`
     - `CLAUDE.md`
     - `claude-docs/**`
     - `LICENSE`, `CHANGELOG`

### 애매한 경우

- 경로만으로 확정 불가능하면 가장 보수적으로 `Skill 수정` 또는 `코드 변경`으로 두고 `(추정)` 표시
- `.claude/skills/` 변경 + `src/` 변경이 동시에 있으면:
  - skill 변경이 핵심이고 코드는 보조 → Skill 신규/수정 + 보조 유형 `코드 포함`
  - 코드 변경이 핵심이고 skill은 보조 → 코드 변경 + 보조 유형 `기존 동작 변경 포함`
  - 판단이 어려우면 커밋 메시지의 주된 의도를 참고

---

## 보조 유형 판별

보조 유형은 해당하는 것을 **모두** 선택한다.

| 보조 유형 | 조건 |
|---|---|
| 코드 포함 | `src/`, `scripts/`, `*.config.*`, 실행 로직 파일이 변경에 포함 |
| 문서 포함 | `docs/**`, `*.md`, 문서성 파일이 변경에 포함 |
| 기존 동작 변경 포함 | `SKILL.md`, `*-rules.md`, `references/**`, 실행 로직 코드 중 **기존 파일이 수정**된 경우 |

### 기존 동작 변경 판별 기준

- `A` (Added) 상태의 파일은 기존 동작 변경에 해당하지 않음
- `M` (Modified) 또는 `D` (Deleted) 상태의 파일 중 아래에 해당하면 체크:
  - `.claude/skills/*/SKILL.md`
  - `.claude/skills/*/*-rules.md`
  - `.claude/skills/*/references/*`
  - `src/` 내 기존 파일

---

## 추정 표시 규칙

- 자동 판별 결과에 확신이 높으면 (추정) 없이 표시
- 아래 경우 반드시 `(추정)` 표시:
  - 주 유형 판별에서 2개 이상 후보가 경합
  - 커밋 메시지와 파일 경로가 다른 의도를 시사
  - 변경 파일 수가 적어 맥락 파악이 어려움 (예: 파일 1개만 변경)
