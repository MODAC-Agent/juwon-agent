---
name: review-build
description: 구현 후 PR 준비, 변경사항 분석부터 코드리뷰/테스트/PR draft까지 한 번에 진행할 때 사용. analyze-changes를 서브에이전트로 격리하고 review-build 품질 루프를 실행한다.
argument-hint: [base-branch] [--scope=<scope>] [--mode=committed|staged|working-tree] [--resume=<runId>] [--new-run] [--auto-until=concern|blocked|before-pr|never]
allowed-tools: Agent Read Edit Write Bash Glob Grep
---

# Review Build

## 목적

`review-build`는 네 개 phase를 묶는 오케스트레이터이자 기본 진입점이다.
diff를 직접 읽는 Phase 1은 서브에이전트로 격리하고, 메인 에이전트는 산출물 경로와 status만 받는다.
이후 phase는 `change-summary.json`부터 시작해 파일 계약으로 이어 실행한다.

기본 동작은 `--auto-until=concern`이다.

- `DONE` phase는 다음 phase로 자동 진행한다
- `DONE_WITH_CONCERNS`, `BLOCKED`, `NEEDS_CONTEXT`에서는 gate를 열고 사용자 응답을 기다린다
- `--auto-until=never`이면 모든 phase 뒤에서 gate를 연다
- `--auto-until=before-pr`이면 Phase 4 직전까지 자동 진행하고 PR draft 작성 전에 멈춘다
- `--auto-until=blocked`이면 `DONE_WITH_CONCERNS`도 자동 진행하되 concerns를 최종 요약에 남긴다

### auto-until 결정표

| phase status | `concern` | `blocked` | `before-pr` | `never` |
| --- | --- | --- | --- | --- |
| `DONE` | auto | auto | auto, 단 Phase 4 진입 전 gate | gate |
| `DONE_WITH_CONCERNS` | gate | auto | auto, 단 Phase 4 진입 전 gate | gate |
| `BLOCKED` | gate | gate | gate | gate |
| `NEEDS_CONTEXT` | gate | gate | gate | gate |

`before-pr`의 "Phase 4 진입 전 gate"는 `review-pr-draft` 작성 전에 사용자에게 PR draft를 만들지 확인받는다는 뜻이다.

## Step 1: run 초기화 또는 resume

새 실행 또는 resume 모두 아래 스크립트로 시작한다.

```bash
bash .claude/skills/review-build/scripts/review-build.sh --scope=<scope> [--base-ref=<ref>] [--mode=<mode>] [--new-run] [--auto-until=<policy>]
```

스크립트 출력에서 `reused`, `requiresDecision` 값을 확인한다.

- `reused: true` + `requiresDecision: true`
  직전 run이 `BLOCKED` 또는 `NEEDS_CONTEXT`로 끝난 경우다. 반드시 사용자에게 아래 두 선택지를 제시한다.
  - `continue`: 같은 runId로 이어서 수정
  - `new-run`: `--new-run`을 붙여 새로 시작
- `reused: true` + `requiresDecision: false`
  정상 재사용. 직전 phase 이후부터 재개한다.
- `reused: false`
  새 run. Phase 1부터 시작한다.

resume과 lock 규칙은 [references/resume-locking.md](./references/resume-locking.md)를 따른다.

## Step 2: phase 실행과 gate loop

네 phase를 순서대로 돈다. Phase 1은 isolated subagent로 실행하고, 이후 phase는 아래 계약을 직접 실행한다.

1. Phase 1에서는 `analyze-changes` wrapper를 따라 Agent 도구로 서브에이전트를 실행한다
2. 이후 phase에서는 해당 phase skill의 `SKILL.md`와 필요한 reference를 읽는다
3. phase가 요구하는 입력 파일과 stale 상태를 확인한다
4. phase 산출물을 `.claude/scripts/validate-contract.ts`로 검증한다
5. phase 산출물과 `status/{phase}.json`을 작성한다 (`status-write.ts`가 `schemaVersion: "1.0"`을 자동 주입)
6. 자동 진행 조건을 판단한다
7. gate가 필요하면 아래 gate 포맷 그대로 사용자에게 묻는다
8. 사용자 응답을 받아 `status/review-build.json`의 `gateHistory`에 append한다 (status-write.ts 사용)
9. 응답에 따라 분기한다

### phase 순서와 계약

| Phase | 읽는 skill | 필수 입력 | 필수 출력 |
| --- | --- | --- | --- |
| 1 | `analyze-changes` subagent | git diff | `change-summary.md/json`, `status/analyze-changes.json` |
| 2 | `code-review` | `change-summary.json` | `review-report.md/json`, `status/code-review.json` |
| 3 | `test-unit` | `change-summary.json`, `review-report.json` | `test-plan.md`, `coverage-report.md/json`, `status/test-unit.json` |
| 4 | `review-pr-draft` | change/review/coverage 산출물 | `pr-draft.md/json`, `status/review-pr-draft.json` |

`review-build`는 slash command처럼 다른 skill을 호출한다고 가정하지 않는다.
Phase 1은 `analyze-changes`의 서브에이전트 프롬프트를 사용하고, 이후 phase는 필요한 규칙을 읽고 같은 세션에서 실행한다.
메인 에이전트는 Phase 1의 full diff를 읽지 않는다.

이전 버전의 수동 gate loop가 필요하면 `--auto-until=never`를 사용한다.

### gate 응답 처리

gate 프롬프트:

```text
[Phase N 완료] status = DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
산출물: <경로 목록>
concerns: <있으면 요약, 없으면 없음>

다음 중 하나를 선택하세요:
  proceed
  revise:<지시>
  stop
  back:<N>
```

| 응답          | 조건                                              | 동작                                   |
| ------------- | ------------------------------------------------- | -------------------------------------- |
| `proceed`     | 직전 status가 `DONE` 또는 `DONE_WITH_CONCERNS`    | 다음 phase로 이동                      |
| `revise:<지시>` | 어떤 상태든                                       | 같은 phase를 지시에 맞게 재실행         |
| `stop`        | 어떤 상태든                                       | 오케스트레이터 종료 (lock 해제)         |
| `back:<N>`    | `N < currentPhaseNumber`                          | Phase N부터 재실행                      |

- `BLOCKED` / `NEEDS_CONTEXT` 상태에서 `proceed`는 거부하고 `revise:`나 `back:`을 다시 요청한다
- `proceed`로 다음 phase에 들어가기 전, 해당 phase status를 stale 검사한다. stale이면 해당 phase부터 다시
- 응답은 `status/review-build.json`의 `gateHistory`에 기록한다

### 자동 진행 규칙

`--auto-until` 정책에 따라 사용자 응답 없이 다음 phase로 넘어갈 수 있다.
단, `BLOCKED` / `NEEDS_CONTEXT`에서는 항상 멈춘다.

## Step 3: 역행 규칙

- Phase 3에서 **테스트만** 추가됐으면 Phase 2는 유지 가능
- Phase 3에서 production code가 수정됐으면 `back:1`으로 Phase 1부터
- selection mode / 제외 규칙이 바뀌면 Phase 2부터 재실행 권장
- stale contract 감지 시 뒤 phase는 진행하지 않는다

## Completion Status

- `DONE`: Phase 4까지 끝나고 `pr-draft.md`가 준비됨
- `DONE_WITH_CONCERNS`: 초안은 생성됐지만 coverage / 리스크 concern 또는 softStale 경고가 남음
- `BLOCKED`: 특정 phase blocker 또는 stale/restart 필요
- `NEEDS_CONTEXT`: scope, mode, gate 응답, resume 대상 확인 필요
