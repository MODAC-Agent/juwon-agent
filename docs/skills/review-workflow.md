# Review Workflow (Week 2)

현재 브랜치의 변경사항을 **변경 파악 → 코드리뷰 → 테스트 보강 → PR 초안**까지 한 흐름으로 이어주는 5개 Skill 묶음.

## 해결하는 문제

브랜치를 올리기 전에 반복적으로 해야 하는 일이 있다.

1. 내가 뭘 바꿨지? (diff 정리)
2. 이 변경에 위험한 부분은? (리뷰)
3. 어떤 테스트가 부족한가? (커버리지 점검 / 테스트 작성)
4. PR 본문은 어떻게 쓰지?

이 과정을 혼자 정리하면 놓치는 포인트가 매번 다르다.
`review-workflow`는 **각 단계의 산출물을 파일로 남기고, 다음 단계가 그 파일만 읽도록** 해서 일관된 품질을 유지한다.

```
git diff
   ↓
┌──────────────┐  ┌────────────┐  ┌──────────┐  ┌────────────────┐
│ analyze-     │ →│ code-      │ →│ test-    │ →│ review-pr-     │
│ changes      │  │ review     │  │ unit     │  │ draft          │
└──────────────┘  └────────────┘  └──────────┘  └────────────────┘
  change-summary   review-report    coverage      pr-draft
  .md / .json      .md / .json      -report       .md / .json
                                    .md / .json

          ↑ review-build 오케스트레이터가 phase gate로 묶는다 ↑
```

---

## 5개 Skill 한눈에

| Skill             | 역할                                        | 입력                              | 출력                                   |
| ----------------- | ------------------------------------------- | --------------------------------- | -------------------------------------- |
| `analyze-changes` | diff를 요약 + 테스트 대상 식별              | git diff                          | `change-summary.md/json`               |
| `code-review`     | findings-first 리뷰, 테스트 공백 구조화     | `change-summary`                  | `review-report.md/json`                |
| `test-unit`       | Vitest 테스트 작성 + coverage gate          | `change-summary`, `review-report` | 테스트 파일, `coverage-report.md/json` |
| `review-pr-draft` | PR 템플릿에 리뷰 결과 매핑                  | 위 세 산출물                      | `pr-draft.md/json`                     |
| `review-build`    | 네 skill을 phase gate로 묶는 오케스트레이터 | scope, mode                       | `status/review-build.json`             |

전부 처음부터 수동으로 1→4를 돌려도 되고, `review-build`로 한 번에 시작해도 된다.

---

## 빠른 사용법

### 전체 흐름 자동 진행

```bash
bash .claude/skills/review-build/scripts/review-build.sh \
  --scope=agent-detail \
  --base-ref=main \
  --mode=committed
```

스크립트가 `docs/reviews/{scope}/{runId}/` 폴더를 만들고 bootstrap status를 기록한다. 그 다음부터는 Claude에게 `/analyze-changes`, `/code-review` 등을 순서대로 실행시키면 된다.

스크립트 출력에서 두 값을 확인한다.

- `reused: true/false` — 같은 조합으로 이미 만들어둔 runId를 재사용하는지
- `requiresDecision: true/false` — 직전 run이 `BLOCKED` 또는 `NEEDS_CONTEXT`로 끝났는지

`requiresDecision: true`면 `[ATTENTION]` 배너가 함께 출력된다. 이때는 **이어서 수정(같은 runId 계속)** 할지 **새로 시작(`--new-run` 재호출)** 할지 먼저 결정한다.

### 한 단계만 실행

```
/analyze-changes main --mode=committed
/code-review agent-detail
/test-unit agent-detail --selection=strict
/review-pr-draft agent-detail main
```

각 skill은 직전 phase의 산출물만 읽는다. 앞 phase 파일이 없거나 stale이면 `BLOCKED`로 끝난다.

---

## 핵심 개념 (처음 보는 사람용)

### scope

"이번 리뷰는 어떤 기능에 대한 거냐"를 가리키는 짧은 이름. `agent-detail`, `login-form` 같은 kebab-case.
산출물이 `docs/reviews/{scope}/...` 아래에 모이므로, 같은 작업은 같은 scope를 쓰면 된다.

### runId

같은 scope라도 base-ref, mode, HEAD commit이 바뀌면 **다른 run**이 된다.
`runId`는 `20260418T091000Z-committed-main-def456` 같은 포맷이고 자동 생성된다.
직접 지정하지 않아도 되며, 같은 조합으로 재실행하면 기본적으로 직전 runId를 **재사용(덮어쓰기)** 한다. 새 run을 만들고 싶으면 `--new-run`을 붙인다.

### mode (분석 모드)

| mode               | 비교 범위                         | 언제 쓰나                        |
| ------------------ | --------------------------------- | -------------------------------- |
| `committed` (기본) | `merge-base(baseRef, HEAD)..HEAD` | PR 직전, 공유 가능한 변경 검토   |
| `staged`           | staged index                      | 커밋 직전 스테이징된 변경 점검   |
| `working-tree`     | 작업 트리 전체                    | 아직 add하지 않은 개발 중간 점검 |

기본값 `committed`는 PR 워크플로우와 가장 자연스럽게 이어진다.

### Completion Status

모든 skill이 끝날 때 네 상태 중 하나를 선언한다.

| 상태                 | 의미                 | 다음 행동                        |
| -------------------- | -------------------- | -------------------------------- |
| `DONE`               | 정상 완료            | 다음 phase로 진행 가능           |
| `DONE_WITH_CONCERNS` | 완료했지만 확인 필요 | concerns 읽고 사용자가 진행 결정 |
| `BLOCKED`            | 진행 불가            | 원인 해결 후 재실행              |
| `NEEDS_CONTEXT`      | 정보 부족            | 사용자 응답 후 재실행            |

### Phase Gate

`review-build`는 **자동으로 다음 phase로 넘어가지 않는다**. 각 phase가 끝나면 반드시 사용자가 다음 중 하나를 선택해야 한다.

```
proceed        → 다음 phase로 진행 (DONE / DONE_WITH_CONCERNS에서만)
revise: <지시> → 이 phase를 지시에 따라 재실행
stop           → 오케스트레이터 종료
back: N        → Phase N부터 다시 시작 (역행)
```

응답은 `status/review-build.json`의 `gateHistory`에 기록된다.

### stale 감지

앞 phase 산출물이 지금 git 상태와 맞지 않으면 뒤 phase는 실행을 거부한다.
stale 기준:

- `baseCommitSha`, `headCommitSha`, `analysisMode` 불일치 → 즉시 stale
- `generatedAt`이 24시간 초과 → soft-stale (사용자 확인 후 진행)

stale로 찍히면 해당 phase를 **다시 실행**하라는 제안이 나온다. 덮어쓰지 말고 재실행을 권장.

---

## Phase별 상세

### Phase 1: analyze-changes

diff를 사람이 읽는 요약(`change-summary.md`)과 기계가 읽는 계약 파일(`change-summary.json`)로 변환.

**핵심 규칙**

- 사실과 추정을 구분 (`[미확인]` / `(추정)` 표기)
- 테스트 대상을 `testTargets[]`에 **id까지 붙여** 명시 (예: `TGT-001`)
- 위험 영역은 `riskAreas[]`에 근거와 함께

**파일 구조**

```
.claude/skills/analyze-changes/
├── SKILL.md
├── analyze-changes-rules.md
├── references/
│   ├── risk-classification.md
│   └── output-schema.md
└── scripts/
    └── collect-diff-context.sh      # git diff / stat 수집
```

### Phase 2: code-review

findings-first 리뷰. 칭찬보다 버그/회귀/테스트 누락을 먼저 쓴다.

**review-report.json 구조 (test-unit이 읽는다)**

```json
{
  "findings": [
    {
      "severity": "critical|major|minor|suggestion",
      "path": "...",
      "line": 0,
      "issue": "..."
    }
  ],
  "testGaps": [
    {
      "id": "TGT-001",
      "targetPath": "...",
      "reason": "...",
      "priority": "required|optional"
    }
  ],
  "risksForPr": ["리뷰어가 먼저 알아야 할 가정"]
}
```

`testGaps[].id`는 Phase 1의 `testTargets[].id`와 **반드시 매칭**되어야 한다. 그래야 test-unit이 "어떤 대상의 공백을 메워야 하는지" 안다.

### Phase 3: test-unit

**Vitest 전용**이다. Jest / Mocha / Playwright-only 프로젝트는 즉시 `BLOCKED`로 끝난다 (Week 2 범위 제약).

**실행 전에 확인하는 것**

1. 테스트 정책 문서 (우선순위 고정)
   1. `.ai/TESTING.md`
   2. `AGENTS.md`
   3. `CLAUDE.local.md`
   4. `CLAUDE.md`
   5. `test-unit-rules.md`
2. Vitest 설치 + coverage 플러그인
3. 앞 phase status stale 검사

문서끼리 충돌하면 `NEEDS_CONTEXT`로 멈추고 사용자에게 묻는다.

**Coverage Gate (이중 기준)**

| 기준             | 대상                           | 목표                                                        |
| ---------------- | ------------------------------ | ----------------------------------------------------------- |
| **differential** | 이번 diff에서 추가/수정된 라인 | statements / branches / functions / lines **모두 100%**     |
| **scope**        | 변경 대상 파일 전체            | statements / branches / functions / lines **모두 90% 이상** |

둘 다 만족해야 `DONE`. 한쪽이라도 미달이면 `DONE_WITH_CONCERNS` (근거 문서화) 또는 `BLOCKED`.

**왜 이중 기준인가?**
100% 단일 기준만 쓰면 trivial 분기에도 의미 없는 테스트를 양산하게 되고, 결국 coverage를 맞추려고 무한히 막히는 일이 생긴다. diff 라인은 100% (놓치지 않기 위해), 파일 전체는 90% (현실적 목표)로 두 기준을 분리한다.

**Production 코드 수정 금지**

기본적으로 test-unit은 테스트 파일만 수정한다. 실제 소스 코드는 건드리지 않는다.

예외:

- `--allow-prod-fix` 플래그가 있을 때, 그리고
- (a) 테스트 가능성 확보를 위한 export 추가 / DI 분리, 또는
- (b) 테스트가 드러낸 **명백한** 버그 수정

여기에 해당하더라도 production code를 바꾸면 **Phase 1, 2가 stale이 되므로** 반드시 사용자에게 Phase 1~2 재실행을 제안하고 끝낸다.

### Phase 4: review-pr-draft

PR 본문 초안만 만든다. **실제 PR 게시는 하지 않는다**. 게시가 필요하면 Week 1의 `/create-pr`를 따로 호출.

**템플릿 우선순위**

1. `.github/pull_request_template.md` (소비 저장소 템플릿)
2. 루트 `pr-template.md` (이 레포의 fallback)

둘 다 있으면 1번만 쓴다.

**pr-draft.json 필수 필드**

```json
{
  "scope": "...",
  "runId": "...",
  "baseRef": "main",
  "title": "짧은 제목 (≤70자)",
  "templateSource": ".github/pull_request_template.md",
  "body": "...최종 PR 본문 전체..."
}
```

**선택 필드**: `sections: { background, changes, verification, risks }`.
본문을 이미 `body`에 다 썼다면 생략해도 된다. `create-pr`가 본문을 재조합해야 할 때만 유용.

---

## review-build 오케스트레이터

네 skill을 phase gate로 묶어 한 번에 관리한다.

```
review-build.sh --scope=<scope> [--base-ref=<ref>] [--mode=committed|staged|working-tree] [--new-run]

Phase 1 → analyze-changes      → Gate
Phase 2 → code-review          → Gate
Phase 3 → test-unit            → Gate
Phase 4 → review-pr-draft      → Gate → (원하면) /create-pr
```

Resume은 별도 플래그가 없다. 같은 `--scope`/`--mode`/`--base-ref` 조합으로 bootstrap을 다시 부르면 직전 runId를 자동 재사용한다. 명시적으로 새 run을 시작하고 싶을 때만 `--new-run`.

### 내부적으로 일어나는 일

오케스트레이터는 각 phase에서 다음을 **그 순서 그대로** 반복한다. 건너뛰지 않는다.

1. 해당 phase skill 실행 (예: `analyze-changes`)
2. phase가 쓴 `status/{phase}.json`을 `.claude/scripts/status-read.ts`로 읽어 stale 검사
3. Gate 프롬프트 출력 (아래 포맷 고정)
4. 사용자 응답을 받아 `status/review-build.json`의 `gateHistory`에 append
5. 응답에 따라 다음 phase / 재실행 / 종료 / 역행 분기

**Gate 프롬프트 포맷** (`references/gate-protocol.md` 기준)

```
[Phase N 완료] status = DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
산출물: <경로 목록>
concerns: <있으면 요약, 없으면 "없음">

다음 중 하나를 선택하세요:
  proceed
  revise:<지시>
  stop
  back:<N>
```

### Resume 세부 동작

bootstrap 출력의 두 필드에 따라 resume 행동이 결정된다.

| reused | requiresDecision | 의미                                           | 다음 행동                                  |
| ------ | ---------------- | ---------------------------------------------- | ------------------------------------------ |
| false  | false            | 새 run                                         | Phase 1부터 시작                           |
| true   | false            | 직전 run이 `DONE` / `DONE_WITH_CONCERNS`로 끝남 | 마지막 phase 다음부터 재개                 |
| true   | true             | 직전 run이 `BLOCKED` / `NEEDS_CONTEXT`로 끝남   | 사용자에게 continue / new-run 질문 후 진행 |

`baseCommitSha` / `headCommitSha` / `analysisMode`가 바뀌면 무조건 새 runId가 발급된다. 오래된 run에 덮어쓰지 않는다.

### Locking

같은 runId에 동시에 두 세션이 들어가는 사고를 막기 위해 `status/review-build.json`에 `lockedAt` / `lockedBy`(pid)가 있다.

- bootstrap 스크립트(`review-build.sh`)는 lock을 잡지 않는다 (bootstrap이 끝나자마자 pid가 죽어 좀비 lock이 남는 걸 방지)
- 오케스트레이터가 phase를 실제로 실행하는 동안에만 lock을 건다
- 살아있는 pid lock이 있으면 bootstrap은 `exit 2`로 거부

### 역행 규칙

| 상황                             | 어디부터 다시 보나       |
| -------------------------------- | ------------------------ |
| Phase 3에서 **테스트만** 추가됨  | Phase 2 유지 가능        |
| Phase 3에서 production code 수정 | Phase 1부터 다시         |
| selection mode / 제외 규칙 변경  | Phase 1 또는 Phase 2부터 |
| stale contract 감지              | 해당 앞 phase 재실행     |

---

## 산출물 위치

같은 scope + mode + baseRef + HEAD 조합의 결과는 같은 runId 폴더에 모인다.

```
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

---

## 공통 헬퍼 스크립트

skill들이 git 메타, status 파일, runId를 중복 구현하지 않도록 아래 4개 헬퍼를 사용한다.

```
.claude/scripts/
├── git-meta.ts           # baseCommitSha, headCommitSha, merge-base 계산
├── runid-resolve.ts      # runId 재사용 / 새로 생성 / 디렉토리 ensure
├── status-read.ts        # 직전 phase status 로드 + stale / softStale 검사
├── status-write.ts       # status.json 원자적 write
└── json-get.ts           # dotted-path JSON 필드 추출 (shell 스크립트에서 사용)
```

skill이나 shell 스크립트는 직접 `jq`나 `sed`로 JSON을 가공하지 않고 이 헬퍼들을 호출한다.

**사용 예**

```bash
# 현재 git 메타 읽기
node --experimental-strip-types .claude/scripts/git-meta.ts --mode=committed

# runId 확정 + 디렉토리 생성
node --experimental-strip-types .claude/scripts/runid-resolve.ts \
  --scope=agent-detail --mode=committed --base-ref=main --ensure

# 이전 phase stale 검사
node --experimental-strip-types .claude/scripts/status-read.ts \
  --file docs/reviews/agent-detail/{runId}/status/analyze-changes.json

# status 원자적 기록 (stdin JSON)
cat payload.json | node --experimental-strip-types .claude/scripts/status-write.ts \
  --file docs/reviews/agent-detail/{runId}/status/analyze-changes.json
```

---

## 자주 마주치는 상황

### "BLOCKED가 떴어요"

상태 파일의 `concerns`를 읽는다. 대표 원인:

- **Phase 1 BLOCKED**: diff가 비어 있음 → 변경사항을 커밋/스테이지 후 재실행
- **Phase 2 BLOCKED**: `change-summary.json`이 없거나 stale → `/analyze-changes` 다시
- **Phase 3 BLOCKED**: Vitest 미설치 또는 coverage 측정 불가 → 환경 구성이 먼저
- **Phase 3 BLOCKED** (+ `--allow-prod-fix` 미지정): production 수정이 필요하다고 판단됨 → 정말 필요한지 확인 후 플래그 붙여 재실행

### "softStale 경고가 떴어요"

`generatedAt`이 24시간 넘은 경우. git 상태 자체는 일치하지만 오래된 산출물을 실수로 재사용할 위험이 있다. 확인 후 진행하거나 해당 phase를 다시 돌린다.

### "같은 scope인데 runId가 자꾸 바뀌어요"

base-ref이나 HEAD가 바뀌면 무조건 새 runId다. 이건 정상 동작이다. 오래된 run이 쌓이는 게 싫다면 주기적으로 `docs/reviews/{scope}/`에서 불필요한 runId 폴더를 지우면 된다.

### "Phase 3에서 테스트를 추가했는데 Phase 1부터 다시 하래요"

test-unit이 `--allow-prod-fix`로 production 파일을 건드렸다는 뜻이다. 역행 규칙상 analyze-changes의 `changedFiles`가 더 이상 현재 diff와 맞지 않게 된다. `back:1` 응답으로 Phase 1부터 재실행한다.

### "`[ATTENTION] 직전 run이 BLOCKED 또는 NEEDS_CONTEXT 상태로 끝났습니다` 배너가 떴어요"

이전에 같은 조합(scope + mode + baseRef + HEAD)으로 돌린 run이 미완료 상태로 남아있다는 뜻이다. 두 가지 선택지가 있다.

- **continue**: 그 runId를 이어서 수정한다. 부족했던 정보를 채우거나 blocker를 해결한 뒤 필요한 phase부터 재실행.
- **new-run**: 같은 스크립트에 `--new-run`을 붙여 호출한다. 새 runId 폴더가 만들어지고 Phase 1부터 시작한다.

대부분은 `continue`가 맞다. 이전 run의 산출물을 버려도 아깝지 않을 때만 `new-run`을 쓴다.

### "`exit 2 — review-build run is locked by live pid=...`가 떴어요"

같은 runId로 오케스트레이터가 지금도 돌아가고 있다는 뜻이다. 다른 터미널/세션에서 `/review-build`가 살아있는지 먼저 확인. 정말 죽은 프로세스라면 `status/review-build.json`의 `lockedBy` 필드를 수동으로 `null`로 바꾸고 재호출한다 (헬퍼가 나중에 추가될 예정).

---

## Skill 파일 구조 (전체)

```
.claude/skills/
├── analyze-changes/
│   ├── SKILL.md
│   ├── analyze-changes-rules.md
│   ├── references/
│   │   ├── risk-classification.md
│   │   └── output-schema.md
│   └── scripts/
│       └── collect-diff-context.sh
├── code-review/
│   ├── SKILL.md
│   ├── code-review-rules.md
│   └── references/
│       ├── review-dimensions.md
│       └── severity-levels.md
├── test-unit/
│   ├── SKILL.md
│   ├── test-unit-rules.md
│   └── references/
│       ├── coverage-gate.md
│       ├── target-selection.md
│       └── failure-handling.md
├── review-pr-draft/
│   ├── SKILL.md
│   ├── review-pr-draft-rules.md
│   └── references/
│       ├── template-mapping.md
│       └── risk-language.md
└── review-build/
    ├── SKILL.md
    ├── references/
    │   ├── gate-protocol.md
    │   └── resume-locking.md
    └── scripts/
        └── review-build.sh

.claude/scripts/                     # 공통 헬퍼
├── git-meta.ts
├── runid-resolve.ts
├── status-read.ts
├── status-write.ts
└── json-get.ts

docs/skills/review-workflow.md        # 이 문서
```

---

## 참고

- 로드맵 전체: [docs/5-week-roadmap.md](../5-week-roadmap.md)
- Week 1 figma 워크플로우: [docs/skills/figma-workflow.md](./figma-workflow.md)
- Week 1 PR 게시: [docs/skills/create-pr.md](./create-pr.md)
