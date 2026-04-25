# 5주 로드맵 — AI 에이전트 기반 구현/리뷰 자동화

## 최종 목표

두 개의 안정적인 워크플로우를 만든다.

1. `Spec-driven /feature-build`
   Figma, 회의록, 백엔드 테크스팩을 입력으로 받아 설계와 구현까지 이어지는 흐름.
2. `Diff-driven /review-build`
   현재 브랜치의 변경사항을 입력으로 받아 변경 파악, 코드리뷰, 단위테스트 보강, PR 초안 작성까지 이어지는 흐름.

```text
[Spec-driven]
Figma / transcript / tech spec
                ↓
          /feature-build
                ↓
입력 정형화 → 설계 → 구현 → 검증 → 문서 → PR

[Diff-driven]
git diff / changed files / target scope
                ↓
           /review-build
                ↓
변경 파악 → 코드리뷰 → 단위테스트(coverage) → PR 초안
```

---

## 여기서 말하는 gstack-like 구조

이 문서에서 `gstack-like`는 특정 외부 저장소를 그대로 복제한다는 뜻이 아니다.
아래 특성을 가진 운영 스타일을 의미한다.

- 작은 skill을 조합해 큰 흐름을 만든다
- phase 사이를 문서와 계약 파일로 연결한다
- 각 phase는 상태를 명시적으로 선언한다
- 사용자가 gate에서 다음 행동을 결정한다
- 긴 원문 대신 최소 계약 파일로 컨텍스트를 전달한다

즉, `작은 skill + contract files + phase gate + status machine + context economy`를 이 로드맵의 기준으로 삼는다.

---

## 설계 원칙

### 1. 작은 Skill + 명확한 계약 파일

각 skill은 한 가지 역할만 수행하고, 다음 단계가 읽을 수 있는 산출물을 남긴다.
가능하면 아래 두 종류를 함께 만든다.

- 사람이 읽는 문서: `*.md`
- 후속 skill이 읽는 계약 파일: `*.json`

### 2. Shared Protocol

모든 skill은 공통적으로 아래 구조를 따른다.

- `SKILL.md` 진입점
- `references/` 하위 세부 규칙
- 필요 시 `scripts/` 하위 보조 스크립트
- 종료 시 `Completion Status` 선언
- 필요 시 `status.json` 생성

### 3. Phase Gate

중요 단계 사이에는 항상 게이트를 둔다.

- 오케스트레이터가 자동으로 다음 단계로 넘어가지 않는다
- 각 phase는 `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, `NEEDS_CONTEXT` 중 하나로 종료한다
- 사용자는 `진행 / 수정 / 중단` 중 하나를 결정한다

### 4. 사실과 추정 구분

확정되지 않은 정보는 반드시 표시한다.

- `(추정)`
- `[미확인]`
- `BLOCKED`
- `NEEDS_CONTEXT`

### 5. Context Economy

필요한 파일만 읽고, 다음 phase가 필요한 최소 정보만 전달한다.
긴 원문 전체를 계속 재주입하지 않고 계약 파일을 재사용한다.

---

## Completion Status Protocol

모든 skill은 종료 시 아래 상태 중 하나를 선언한다.

| 상태                 | 의미                 | 후속 행동                  |
| -------------------- | -------------------- | -------------------------- |
| `DONE`               | 정상 완료            | 다음 단계 진행 가능        |
| `DONE_WITH_CONCERNS` | 완료했지만 확인 필요 | concern 확인 후 진행       |
| `BLOCKED`            | 진행 불가            | 원인과 해결책 제시 후 중단 |
| `NEEDS_CONTEXT`      | 정보 부족            | 질문 후 재실행             |

예시:

```markdown
## Completion Status

Status: DONE

- 산출물:
  - docs/reviews/agent-detail/change-summary.md
  - docs/reviews/agent-detail/change-summary.json
  - docs/reviews/agent-detail/status.json
```

### status.json 공통 스키마

모든 skill은 아래 공통 필드를 가진 phase status 파일을 생성한다.
Week 2부터는 실행 충돌을 피하기 위해 `runId`와 `phase`를 반드시 포함한다.

```json
{
  "skill": "analyze-changes",
  "phase": "phase-1-analyze-changes",
  "scope": "agent-detail",
  "runId": "20260418T091000Z-main-def456",
  "status": "DONE",
  "generatedAt": "2026-04-18T09:10:00Z",
  "analysisMode": "committed",
  "baseRef": "main",
  "baseCommitSha": "abc123",
  "headCommitSha": "def456",
  "outputs": [
    "docs/reviews/agent-detail/20260418T091000Z-main-def456/change-summary.md",
    "docs/reviews/agent-detail/20260418T091000Z-main-def456/change-summary.json"
  ],
  "concerns": []
}
```

공통 필드 의미:

- `skill`: 현재 skill 이름
- `phase`: 현재 phase 식별자
- `scope`: 산출물 scope 식별자
- `runId`: 동일 scope 내 실행 단위 식별자
- `status`: 종료 상태
- `generatedAt`: 산출 시각
- `analysisMode`: `committed | staged | working-tree`
- `baseRef`: 비교 기준 branch 또는 ref
- `baseCommitSha`: 기준 commit
- `headCommitSha`: 분석 시점 HEAD commit
- `outputs`: 생성 산출물 목록
- `concerns`: 다음 phase가 확인해야 할 항목

다음 phase는 반드시 같은 `runId`의 직전 phase status를 읽고, `generatedAt`, `baseCommitSha`, `headCommitSha`, `analysisMode`를 현재 repo 상태와 비교해서 stale 여부를 먼저 판단한다.

### 공통 헬퍼 스크립트

각 skill이 status read/write, runId 관리, stale 검사 로직을 중복 구현하지 않도록 `.claude/scripts/` 하위에 공통 헬퍼를 둔다.

```text
.claude/scripts/
├── status-read.ts          # 직전 phase status 로드 + stale 검사
├── status-write.ts         # status.json 원자적 write
├── runid-resolve.ts        # mode/baseRef/HEAD로 기존 runId 재사용 또는 생성
└── git-meta.ts             # baseCommitSha, headCommitSha, merge-base 계산
```

Week 2의 4개 skill은 모두 이 헬퍼를 호출해 status를 다룬다. 직접 jq나 sed로 status를 가공하지 않는다.

### runId 충돌 정책

- 같은 `scope` + `mode` + `baseRef` + `HEAD` 조합으로 재실행할 때는 **직전 runId를 자동 재사용**(덮어쓰기)
- 새 runId가 필요하면 `--new-run` 플래그를 명시
- `baseRef` 또는 `HEAD`가 바뀌면 무조건 새 runId
- 직전 runId가 `BLOCKED` 또는 `NEEDS_CONTEXT`로 종료된 경우, 자동 재사용 시 사용자에게 "이어서 수정 / 새 run 시작" 중 선택을 요청

---

## 전체 Skill 맵

```text
.claude/skills/
├── [Week 1] figma-extract/         — Figma → 스펙 파일 추출
├── [Week 1] figma-implement/       — 스펙 → UI 코드 구현
├── [Week 1] create-pr/             — PR 게시용 초안/생성 유틸리티
│
├── [Week 2] analyze-changes/       — git diff / 변경 파일 → 변경사항 구조화
├── [Week 2] code-review/           — findings-first 리뷰 + 위험도 분류
├── [Week 2] test-unit/             — Vitest 단위테스트 작성 + 100% coverage gate
├── [Week 2] review-pr-draft/       — review 산출물 → PR 템플릿 초안 작성
│
├── [Week 3] transcript-analyze/    — 회의록 → 요구사항 추출
├── [Week 3] techspec-parse/        — 백엔드 테크스팩 → API 계약 정리
│
├── [Week 4] feature-design/        — 요구사항 종합 → 프론트엔드 설계
├── [Week 4] implementation-doc/    — 구현 결과 → 문서화
│
├── [Week 5] feature-build/         — spec-driven 전체 오케스트레이션
└── [Week 5] review-build/          — diff-driven 전체 오케스트레이션 정식화
```

`create-pr`는 Week 1의 자산으로 유지하고, Week 2에서는 이를 직접 확장하지 않는다.
Week 2는 `review-pr-draft`라는 얇은 wrapper skill을 추가해 review 산출물을 PR 템플릿에 매핑한다.

---

## 공통 Skill 구조

```text
.claude/skills/{skill-name}/
├── SKILL.md
├── {skill-name}-rules.md           # 필요 시
├── references/
│   ├── validation.md
│   └── failure-handling.md
└── scripts/                        # 필요 시
```

`SKILL.md`는 가능하면 아래 골격을 따른다.

```markdown
---
name: skill-name
description: ...
argument-hint: [...]
allowed-tools: Read Edit Write Bash Glob Grep Agent
---

# Skill 제목

## 시작

1. 입력과 blocker를 먼저 확인한다
2. 관련 문서와 계약 파일을 읽는다
3. 현재 phase 범위만 수행한다

## 실행 흐름

...

## 출력

- 생성 파일 목록과 경로

## Completion Status

DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT
```

---

## Week 1: Foundation — Figma 워크플로우 + PR 초안 자동화

| 항목      | 내용                                               |
| --------- | -------------------------------------------------- |
| Skills    | `figma-extract`, `figma-implement`, `create-pr`    |
| 핵심 학습 | SKILL 구조, references 분리, 서브에이전트 패턴     |
| 산출물    | 3개 skill + `docs/skills/` 문서 + `pr-template.md` |

Week 1은 이미 완성된 기반으로 간주한다. Week 2 이후의 skill은 이 구조를 그대로 따른다.

---

## Week 2: Change Intelligence — 변경 파악, 코드리뷰, 테스트, PR 초안

### 목표

이미 존재하는 diff를 바탕으로 아래 흐름을 안정적으로 자동화한다.

```text
git diff / changed files / target scope
                 ↓
           /review-build
                 ↓
1. 변경사항 파악
2. findings-first 코드리뷰
3. Vitest 단위테스트 작성/보강
4. 선택한 변경 모듈 범위에서 coverage 이중 기준(differential 100% + scope 90%) 확인
5. PR 템플릿 기준으로 PR 초안 작성
```

여기서 coverage의 기준은 전체 레포가 아니라 `선택한 변경 대상 모듈 범위`이며, 두 기준을 동시에 적용한다.

- **differential**: 이번 diff에서 추가/수정된 라인은 100%
- **scope**: 변경 대상 파일 전체는 90% 이상

100% 단일 기준은 trivial 분기에 대한 무의미한 테스트 양산과 무한 BLOCKED를 유발하기 때문에 채택하지 않는다.

### Week 2를 gstack 느낌으로 가져가는 핵심 포인트

- `analyze-changes`를 diff-driven 워크플로우의 entrypoint로 둔다
- 각 phase가 다음 phase 입력이 되는 계약 파일을 남긴다
- 오케스트레이터는 phase 결과와 `status.json`을 읽고 다음 단계를 제안한다
- PR 게시와 PR 초안 생성을 분리한다
- 코드리뷰와 테스트를 분리하되, 리뷰 결과가 테스트 입력으로 이어지게 만든다
- stale contract를 감지하면 뒤 phase를 멈추고 앞 phase 재실행을 제안한다

### Week 2 범위 규약

#### diff 분석 모드

`analyze-changes`와 `review-build`는 세 가지 모드를 지원한다.

- 기본: `committed`
  - 범위: `merge-base(baseRef, HEAD)..HEAD`
  - 목적: PR 직전 리뷰, 공유 가능한 변경 검토
  - 비고: 브랜치 기준 변경만 안정적으로 잡기 위해 `base...HEAD`와 같은 의미의 merge-base 기준을 사용
- 선택: `staged`
  - 범위: staged index 기준 변경
  - 목적: 커밋 전 점검
- 선택: `working-tree`
  - 범위: 현재 작업 트리 변경
  - 목적: 개발 중간 점검

기본값은 `committed`로 고정한다. 이유는 PR 템플릿 작성과 가장 자연스럽게 이어지기 때문이다.

#### coverage 대상 선택 모드

`test-unit`은 두 가지 범위 모드를 가진다.

- 기본: `strict`
  - 변경된 파일 자체만 coverage 측정 대상
- 선택: `transitive`
  - 변경된 파일이 이번 diff에서 새로 호출하거나 직접 의존하게 된 내부 파일까지 포함

기본값은 `strict`다. `transitive`는 사용자가 명시하거나 `analyze-changes`가 high-risk로 표시한 경우에만 확장한다.

### Week 2 공통 산출물 디렉토리

```text
docs/reviews/{scope}/{runId}/
├── change-summary.md
├── change-summary.json
├── review-report.md
├── review-report.json
├── test-plan.md
├── coverage-report.md
├── coverage-report.json
├── pr-draft.md
├── pr-draft.json
└── status/
    ├── analyze-changes.json
    ├── code-review.json
    ├── test-unit.json
    ├── review-pr-draft.json
    └── review-build.json
```

같은 `scope`라도 `mode`, `baseRef`, `HEAD`가 달라지면 새로운 `runId`를 만든다.
즉, `staged`와 `working-tree`, 다른 브랜치 base의 재실행 결과를 같은 폴더에 덮어쓰지 않는다.
같은 조합의 재실행은 위의 `runId 충돌 정책`을 따른다(기본 재사용, `--new-run`으로 새 runId 강제).

### Week 2 선결 조건

`test-unit`은 무조건 테스트를 쓰기 전에 아래 선결 조건을 먼저 확인한다.

1. 소비 프로젝트의 문서 우선순위 확인
   - `.ai/TESTING.md`
   - `AGENTS.md`
   - `CLAUDE.local.md`
   - `CLAUDE.md`
   - 없으면 `test-unit-rules.md`
2. 테스트 환경 확인
   - `package.json` 존재 여부
   - `vitest` devDependency 여부
   - `vitest.config.*` 또는 동등 설정 존재 여부
3. 실패 시 처리
   - 테스트 정책이 없거나 충돌하면 `NEEDS_CONTEXT`
   - Vitest 환경이 없으면 `BLOCKED`

즉, 테스트 전용 규칙인 `.ai/TESTING.md`가 가장 우선이고, 그 외 저장소 규약 문서는 충돌이 없을 때만 보조 규칙으로 사용한다.

---

### Skill 1: analyze-changes

현재 브랜치의 변경사항 또는 특정 경로를 읽어 리뷰와 테스트의 기준이 되는 변경 요약을 만든다.

```text
/analyze-changes [base-branch] [--mode=committed|staged|working-tree]

[입력] git diff / changed files / target path
       ↓
[처리] 변경 파일 분류 → 핵심 의도 추정 → 리스크 표시 → 테스트 대상 식별
       ↓
[출력] docs/reviews/{scope}/{runId}/change-summary.md
     + docs/reviews/{scope}/{runId}/change-summary.json
     + docs/reviews/{scope}/{runId}/status/analyze-changes.json
```

#### 파일 구조

```text
.claude/skills/analyze-changes/
├── SKILL.md
├── analyze-changes-rules.md
└── references/
    ├── risk-classification.md
    └── output-schema.md
```

#### change-summary.md가 담아야 할 내용

- 변경 범위와 비교 기준
- 분석 모드: committed / staged / working-tree
- 파일 분류: production / test / docs / config
- 핵심 변경 포인트
- 위험 영역
- 반드시 테스트해야 할 후보
- diff만으로는 확정할 수 없는 미확인 사항

#### change-summary.json 예시

```json
{
  "scope": "agent-detail",
  "analysisMode": "committed",
  "baseRef": "main",
  "baseCommitSha": "abc123",
  "headCommitSha": "def456",
  "generatedAt": "2026-04-18T09:10:00Z",
  "changedFiles": [
    "src/entities/agent/api/http/get-agent.ts",
    "src/features/agent-detail/ui/agent-detail.tsx"
  ],
  "riskAreas": [
    {
      "path": "src/entities/agent/api/http/get-agent.ts",
      "reason": "외부 응답 파싱 로직 변경"
    }
  ],
  "testTargets": [
    {
      "id": "TGT-001",
      "path": "src/entities/agent/api/http/get-agent.ts",
      "selectionMode": "strict",
      "type": "api-http"
    }
  ]
}
```

#### 핵심 규칙

- diff에서 보이는 사실과 의도에 대한 추정을 구분한다
- 테스트가 필요한 대상을 명시적으로 뽑는다
- 모호하면 숨기지 말고 `[미확인]`으로 남긴다
- 다음 phase가 stale 여부를 검사할 수 있도록 commit metadata를 반드시 남긴다

---

### Skill 2: code-review

변경 코드 기준으로 findings-first 리뷰를 수행한다.

```text
/code-review {scope 또는 대상 경로}

[입력] 구현 코드 + change-summary + 기존 테스트
       ↓
[처리] 버그/회귀/아키텍처 위반/테스트 공백 중심 리뷰
       ↓
[출력] docs/reviews/{scope}/{runId}/review-report.md
     + docs/reviews/{scope}/{runId}/review-report.json
     + docs/reviews/{scope}/{runId}/status/code-review.json
```

#### 파일 구조

```text
.claude/skills/code-review/
├── SKILL.md
├── code-review-rules.md
└── references/
    ├── review-dimensions.md
    └── severity-levels.md
```

#### 리뷰 관점

1. 동작 회귀 가능성
2. FSD 구조 위반 여부
3. API / schema / parsing 안정성
4. 테스트 누락 또는 취약 케이스
5. PR에 꼭 써야 할 위험과 트레이드오프
6. 저장소 코딩 규약, 접근성, 반응형 영향

스타일성 항목은 lint로 위임 가능한 것은 lint에 맡기되, 사람 판단이 필요한 접근성/반응형/구조 일관성은 리뷰 관점에 남긴다.

#### review-report.md 형식

```markdown
## 리뷰 요약

- Critical: 0
- Major: 2
- Minor: 1
- Suggestion: 1

## Findings

1. [Major] src/entities/...:line — ...
2. [Major] src/features/...:line — ...

## 테스트 공백

- TGT-001: 응답 파싱 실패 케이스 미검증
- TGT-002: 로딩 분기 접근성 라벨 미검증

## PR에 써야 할 리스크

- 리뷰어가 먼저 알아야 하는 가정
```

#### review-report.json 예시

```json
{
  "scope": "agent-detail",
  "findings": [
    {
      "severity": "major",
      "path": "src/entities/agent/api/http/get-agent.ts",
      "issue": "Zod 검증 누락"
    }
  ],
  "testGaps": [
    {
      "id": "TGT-001",
      "targetPath": "src/entities/agent/api/http/get-agent.ts",
      "reason": "응답 파싱 실패 케이스 미검증",
      "priority": "required"
    }
  ]
}
```

#### 핵심 규칙

- 요약보다 findings를 먼저 제시한다
- 칭찬보다 버그, 회귀, 누락을 우선한다
- test-unit이 바로 읽을 수 있도록 테스트 공백을 구조화한다
- stale contract가 감지되면 리뷰를 계속하지 않고 analyze-changes 재실행을 제안한다

---

### Skill 3: test-unit

변경 대상 모듈에 대해 Vitest 단위테스트를 작성 또는 보강하고, 목표 coverage를 만족시킬 때까지 반복한다.

> **v1 범위 제약**: Week 2의 `test-unit`은 **Vitest 전용**이다. Jest / Mocha / Playwright 등 다른 러너를 쓰는 프로젝트는 즉시 `BLOCKED`로 종료한다. 다중 러너 지원은 Week 5 이후 검토.

```text
/test-unit {scope 또는 대상 경로} [--selection=strict|transitive] [--allow-prod-fix]

[입력] change-summary + review-report + 대상 코드
       ↓
[처리] 환경 확인 → 테스트 계획 수립 → 실패 테스트 작성 → 필요 시 최소 범위 구현 보강 → vitest coverage 실행
       ↓
[출력] 테스트 파일 생성/수정
     + docs/reviews/{scope}/{runId}/test-plan.md
     + docs/reviews/{scope}/{runId}/coverage-report.md
     + docs/reviews/{scope}/{runId}/coverage-report.json
     + docs/reviews/{scope}/{runId}/status/test-unit.json
```

#### 파일 구조

```text
.claude/skills/test-unit/
├── SKILL.md
├── test-unit-rules.md
└── references/
    ├── coverage-gate.md
    ├── target-selection.md
    └── failure-handling.md
```

#### Step 0: 환경과 규칙 확인

`test-unit`은 시작 직후 아래를 확인한다.

- 소비 프로젝트의 테스트 정책 문서 존재 여부와 우선순위
- `vitest` 설치 여부
- coverage 실행 가능 여부
- 테스트 파일 배치 컨벤션

문서 우선순위는 항상 아래 순서를 따른다.

1. `.ai/TESTING.md`
2. `AGENTS.md`
3. `CLAUDE.local.md`
4. `CLAUDE.md`
5. `test-unit-rules.md`

실패 분기:

- 문서/정책 충돌: `NEEDS_CONTEXT`
- Vitest 미설치 또는 설정 부재: `BLOCKED`
- coverage 측정 불가: `DONE_WITH_CONCERNS`가 아니라 우선 `BLOCKED`

#### coverage 규칙

- 기준: `변경 대상 모듈 범위`
- 기본 선택 모드: `strict`
- 확장 선택 모드: `transitive`
- 목표 (이중 기준, 둘 다 만족해야 `DONE`):
  - **differential**: 이번 diff에서 추가/수정된 라인은 statements / branches / functions / lines 모두 100%
  - **scope**: 변경 대상 파일 전체는 statements / branches / functions / lines 모두 90% 이상
- 두 기준 중 하나라도 미달이면 `DONE_WITH_CONCERNS` 또는 `BLOCKED` (정당한 예외 문서화 시 전자)
- 예외: 배럴 파일, 타입 전용 파일, 선언형 상수 파일, generated file, side-effect bootstrap file은 제외 가능
- 제외한 항목은 반드시 `coverage-report.md`에 근거를 남긴다

#### 테스트 파일 위치 규칙

- 기본: source와 co-located
- 파일명: `{source}.test.ts` 또는 `{component}.test.tsx`
- 단, target repository가 이미 다른 컨벤션을 쓰고 있으면 그것을 따른다
- 우선순위는 `.ai/TESTING.md` → `AGENTS.md` → `CLAUDE.local.md` → `CLAUDE.md` → `test-unit-rules.md` 순서다

#### coverage-report.md 형식

```markdown
## 테스트 계획

1. TGT-001 getAgent 성공 응답 파싱
2. TGT-001 getAgent 실패 응답 처리
3. TGT-001 schema 파싱 실패 시 에러 로깅

## Coverage 결과

- 대상: src/entities/agent/api/http/get-agent.ts
- selection mode: strict
- differential (새/수정 라인): statements 100% / branches 100% / functions 100% / lines 100%
- scope (파일 전체): statements 96% / branches 92% / functions 100% / lines 95%
- gate: PASS (differential 100% AND scope ≥ 90%)

## 제외 항목

- index.ts: 배럴 파일
```

#### coverage-report.json 예시

```json
{
  "scope": "agent-detail",
  "selectionMode": "strict",
  "targets": ["src/entities/agent/api/http/get-agent.ts"],
  "coverage": {
    "differential": {
      "statements": 100,
      "branches": 100,
      "functions": 100,
      "lines": 100
    },
    "scope": {
      "statements": 96,
      "branches": 92,
      "functions": 100,
      "lines": 95
    }
  },
  "thresholds": {
    "differential": 100,
    "scope": 90
  },
  "gate": "PASS",
  "excluded": ["src/entities/agent/index.ts"]
}
```

#### 핵심 규칙

- 우선순위는 `.ai/TESTING.md` → `AGENTS.md` → `CLAUDE.local.md` → `CLAUDE.md` → `test-unit-rules.md` 순서로 고정한다
- 없거나 모호한 부분만 `test-unit-rules.md`가 보완한다
- 테스트를 먼저 계획하고 실패 테스트를 먼저 쓴다
- **production code 수정은 기본 금지**한다. 테스트 파일(`*.test.*`, `__tests__/**`, `__mocks__/**`) 외 파일은 건드리지 않는다
- production code 수정이 필요하다고 판단되면 `--allow-prod-fix` 플래그 없이는 `BLOCKED + concern`으로 종료하고, 어떤 파일의 어떤 수정이 왜 필요한지 `coverage-report.md`에 남긴다
- `--allow-prod-fix`가 켜진 경우에도 수정은 (a) 테스트 가능성 확보를 위한 export/DI 추가 또는 (b) 테스트로 드러난 명백한 버그 수정 두 가지로 제한하며, 수정 직후 Phase 1~2가 stale 상태가 되므로 반드시 사용자에게 앞 phase 재실행을 제안한다
- differential 100% 또는 scope 90% 미달 시 원인을 분류한다
- 정당한 예외 없이 미달이면 `DONE`이 아니라 `DONE_WITH_CONCERNS` 또는 `BLOCKED`
- stale contract가 감지되면 coverage 측정을 계속하지 않고 analyze-changes부터 재실행을 제안한다

---

### Skill 4: review-pr-draft

Week 2에서는 `create-pr` 자체를 수정하지 않고, review 산출물을 PR 템플릿으로 변환하는 얇은 wrapper skill을 추가한다.

```text
/review-pr-draft [base-branch]

[입력] change-summary + review-report + coverage-report + PR template
       ↓
[처리] 템플릿 선택 → 섹션 매핑 → PR 제목/본문 초안 작성
       ↓
[출력] docs/reviews/{scope}/{runId}/pr-draft.md
     + docs/reviews/{scope}/{runId}/pr-draft.json
     + docs/reviews/{scope}/{runId}/status/review-pr-draft.json
```

#### 파일 구조

```text
.claude/skills/review-pr-draft/
├── SKILL.md
├── review-pr-draft-rules.md
└── references/
    ├── template-mapping.md
    └── risk-language.md
```

#### PR 템플릿 규칙

- 대상 저장소에 `.github/pull_request_template.md`가 있으면 그것을 우선 사용한다
- 없으면 Week 1의 `pr-template.md`를 fallback으로 사용한다
- `review-pr-draft`는 review 산출물을 템플릿 섹션에 매핑하는 역할만 한다
- 실제 PR 게시가 필요하면 기존 `create-pr`를 마지막 승인 단계에서 호출한다

#### 매핑 원칙

- `change-summary.md` → 배경 / 변경 이유
- `review-report.md` → 리뷰 포인트 / 리스크 / 트레이드오프
- `coverage-report.md` → 테스트 범위 / 영향도
- `pr-draft.json`에는 title, body, baseRef, templateSource를 구조화해 저장한다

---

### review-build 오케스트레이터 구조

Week 2에서는 `review-build`의 초기 버전을 직접 호출 가능한 형태로 도입한다.
Week 5에서는 이 흐름을 다른 오케스트레이터와 함께 공통 프로토콜로 정식화한다.
`review-build`는 read-only 리뷰어가 아니라, Phase 3에서 필요한 최소 범위의 테스트/코드 수정을 허용하는 quality loop로 정의한다.
단, production code 변경이 발생하면 앞 phase 산출물 일부를 stale로 보고 재검토한다.

```text
/review-build [base-branch] [--mode=committed|staged|working-tree]

Phase 1 — 변경 파악
  analyze-changes
  산출물: change-summary.md/json, status/analyze-changes.json

Phase 2 — 코드리뷰
  code-review
  산출물: review-report.md/json, status/code-review.json

Phase 3 — 테스트 보강
  test-unit
  산출물: test-plan.md, coverage-report.md/json, status/test-unit.json

Phase 4 — PR 초안
  review-pr-draft
  산출물: pr-draft.md/json, status/review-pr-draft.json

오케스트레이터 run 상태
  review-build
  산출물: status/review-build.json
```

#### Phase Gate 규칙

- Phase 1 종료 후: 범위, mode, 테스트 대상을 확인받는다
- Phase 2 종료 후: findings를 수정할지, 리스크로 남길지 결정한다
- Phase 3 종료 후: coverage 예외를 인정할지 확인한다
- Phase 4 종료 후: 초안을 수정할지, 게시 단계로 넘길지 결정한다

#### Gate 응답 형식

각 phase 종료 시 오케스트레이터는 다음 고정 포맷으로 사용자에게 묻는다.

```text
[Phase N 완료] status = DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
산출물: <경로 목록>
concerns: <있으면 요약, 없으면 "없음">

다음 중 하나를 선택하세요:
  proceed       — 다음 phase로 진행
  revise:<지시> — 이 phase를 지시에 따라 재실행
  stop          — 오케스트레이터 종료
  back:<N>      — Phase N부터 재실행 (역행)
```

- `proceed`는 직전 status가 `DONE` 또는 `DONE_WITH_CONCERNS`일 때만 유효하다. `BLOCKED` / `NEEDS_CONTEXT`에서는 거부한다
- 자동 진행은 하지 않는다. 사용자가 명시적으로 응답해야 한다
- 응답은 `status/review-build.json`의 `gateHistory` 배열에 기록한다

#### Resume 규약

세션이 중간에 종료된 경우(프로세스 kill, 사용자 stop, crash 포함) 다음 규칙으로 이어받는다.

- `/review-build --resume <runId>`로 재진입한다. `runId` 생략 시 해당 scope의 가장 최근 runId를 자동 선택
- 오케스트레이터는 `status/review-build.json`의 `currentPhase`와 각 phase status를 읽어 마지막으로 성공한 phase 다음부터 재개한다
- 재개 전 stale 검사를 필수로 수행한다. `baseCommitSha` 또는 `headCommitSha`가 현재 repo 상태와 다르면 재개를 거부하고 `--new-run`을 제안한다
- 동일 runId에 대한 동시 실행을 막기 위해 `status/review-build.json`에 `lockedAt`과 `lockedBy`(pid) 필드를 두고, 살아있는 lock이 있으면 재진입을 거부한다

#### review-build.json 예시

```json
{
  "skill": "review-build",
  "scope": "agent-detail",
  "runId": "20260418T091000Z-main-def456",
  "status": "DONE_WITH_CONCERNS",
  "currentPhase": "phase-4-review-pr-draft",
  "phaseOrder": [
    "phase-1-analyze-changes",
    "phase-2-code-review",
    "phase-3-test-unit",
    "phase-4-review-pr-draft"
  ],
  "lockedAt": null,
  "lockedBy": null,
  "gateHistory": [
    { "phase": "phase-1-analyze-changes", "response": "proceed", "at": "2026-04-18T09:12:00Z" },
    { "phase": "phase-2-code-review", "response": "proceed", "at": "2026-04-18T09:22:00Z" },
    { "phase": "phase-3-test-unit", "response": "proceed", "at": "2026-04-18T09:45:00Z" }
  ]
}
```

#### 역행 규칙

- Phase 2 이후 production code를 수정하면 Phase 1부터 다시 확인한다
- Phase 3에서 테스트만 추가된 경우에는 Phase 2를 유지할 수 있지만, production code가 바뀌면 Phase 1부터 다시 확인한다
- Phase 3 이후 테스트 대상, selection mode, 제외 규칙이 바뀌면 Phase 1 또는 Phase 2부터 다시 확인한다
- stale contract가 감지되면 뒤 phase는 진행하지 않고 앞 phase 재실행을 제안한다

---

## Week 3: Input Processing — 회의록 / 테크스팩 파싱

### 목표

Figma 외의 두 입력을 구조화된 스펙 파일로 바꾼다. 결과는 `docs/specs/{feature}/`에 모아 feature-build가 읽을 수 있게 한다.

### Skill 1: transcript-analyze

```text
/transcript-analyze {feature} docs/inputs/meeting-recording.txt

[입력] 회의 텍스트
       ↓
[처리] 요구사항 추출, 우선순위 분류, 합의/미결사항 분리
       ↓
[출력] docs/specs/{feature}/requirements.md
      + docs/specs/{feature}/requirements.json
```

### Skill 2: techspec-parse

```text
/techspec-parse {feature} docs/inputs/api-spec.md

[입력] 백엔드 테크스팩
       ↓
[처리] 엔드포인트, 요청/응답, 에러 케이스 구조화
       ↓
[출력] docs/specs/{feature}/api-contract.md
      + docs/specs/{feature}/api-contract.json
```

---

## Week 4: Design & Docs — 종합 설계와 구현 문서화

### 목표

여러 입력 스펙을 종합해 프론트엔드 설계를 만들고, 구현 결과를 다시 문서로 환원한다.

### Skill 1: feature-design

```text
/feature-design {feature}

[입력] docs/specs/{feature}/ 의 스펙 파일
       ↓
[처리] 교차 검증 → FSD 구조 설계 → 상태 전략 → traceability 작성
       ↓
[출력] docs/specs/{feature}/design.md
      + docs/specs/{feature}/design-contract.json
```

### Skill 2: implementation-doc

```text
/implementation-doc {feature}

[입력] 구현 코드 + docs/specs/
       ↓
[처리] 구현 결과를 문서화 템플릿으로 재구성
       ↓
[출력] claude-docs/{feature}.md
```

---

## Week 5: Orchestration — 두 개의 마스터 워크플로우 완성

### 목표

- spec-driven build용 `/feature-build`
- diff-driven quality loop용 `/review-build`

두 오케스트레이터를 공통 프로토콜로 마감한다.

### feature-build

```text
/feature-build

Phase 1 — 입력 처리
  figma-extract / transcript-analyze / techspec-parse
Phase 2 — 설계
  feature-design
Phase 3 — 구현
  figma-implement
Phase 4 — 검증
  lint / typecheck / test / build
Phase 5 — 문서와 PR
  implementation-doc / review-pr-draft / create-pr
```

### review-build

```text
/review-build [base-branch 또는 경로]

Phase 1 — 변경 파악
  analyze-changes
Phase 2 — 코드리뷰
  code-review
Phase 3 — 테스트 보강
  test-unit
Phase 4 — PR 초안
  review-pr-draft
Phase 5 — 게시 선택
  create-pr
```

### Week 5에서 정리할 문서 방향

루트 `CLAUDE.md`는 skill 인덱스와 진입점 중심으로 유지하고, 세부 규칙은 각 `SKILL.md`와 `references/`에 둔다.

---

## 주차별 요약

| 주차 | 테마                | 새 Skills                                                | 핵심 산출물                                    |
| ---- | ------------------- | -------------------------------------------------------- | ---------------------------------------------- |
| `W1` | Foundation          | figma-extract, figma-implement, create-pr                | Figma → 구현 + PR 초안 기반                    |
| `W2` | Change Intelligence | analyze-changes, code-review, test-unit, review-pr-draft | 변경 파악 → 코드리뷰 → differential 100% + scope 90% coverage → PR 초안 |
| `W3` | Input Processing    | transcript-analyze, techspec-parse                       | 요구사항 / API 계약 구조화                     |
| `W4` | Design & Docs       | feature-design, implementation-doc                       | 설계 문서 + 구현 문서                          |
| `W5` | Orchestration       | feature-build, review-build                              | spec-driven / diff-driven 마스터 워크플로우    |

## 각 주차의 학습 포인트

| 주차 | 학습 포인트                                                                                    |
| ---- | ---------------------------------------------------------------------------------------------- |
| `W1` | Skill 기본 구조, references 분리, 서브에이전트 패턴                                            |
| `W2` | diff를 계약 파일로 바꾸는 방법, findings-first 리뷰, stale 감지, 이중 coverage gate(differential/scope), resume/lock 프로토콜, PR 템플릿 매핑 |
| `W3` | 비정형 입력을 정형 스펙으로 바꾸는 방법                                                        |
| `W4` | 교차 검증, FSD 설계 자동화, 구현 결과 문서 환원                                                |
| `W5` | gstack-like phase-gated orchestrator 두 개를 안정적으로 운영하는 구조                          |
