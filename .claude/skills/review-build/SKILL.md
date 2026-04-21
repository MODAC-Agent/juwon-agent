---
name: review-build
description: Week 2의 diff-driven quality loop 오케스트레이터. phase gate를 두고 analyze-changes -> code-review -> test-unit -> review-pr-draft를 잇는다.
argument-hint: [base-branch] [--scope=<scope>] [--mode=committed|staged|working-tree] [--resume=<runId>] [--new-run]
allowed-tools: Read Edit Write Bash Glob Grep
---

# Review Build

## 목적

`review-build`는 Week 2의 네 개 skill을 묶는 오케스트레이터다.
자동으로 끝까지 밀지 않고, 각 phase가 끝날 때마다 반드시 gate를 두고 사용자 응답을 기다린다.

## Step 1: run 초기화 또는 resume

새 실행 또는 resume 모두 아래 스크립트로 시작한다.

```bash
bash .claude/skills/review-build/scripts/review-build.sh --scope=<scope> [--base-ref=<ref>] [--mode=<mode>] [--new-run]
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

네 phase를 순서대로 돈다. 각 phase는 다음을 반복한다.

1. 해당 phase skill 실행 (`analyze-changes` → `code-review` → `test-unit` → `review-pr-draft`)
2. phase가 쓴 `status/{phase}.json`을 `.claude/scripts/status-read.ts`로 읽는다
3. [references/gate-protocol.md](./references/gate-protocol.md) 포맷 그대로 사용자에게 gate 프롬프트를 출력한다
4. 사용자 응답을 받아 `status/review-build.json`의 `gateHistory`에 append한다 (status-write.ts 사용)
5. 응답에 따라 분기한다

### gate 응답 처리

| 응답          | 조건                                              | 동작                                   |
| ------------- | ------------------------------------------------- | -------------------------------------- |
| `proceed`     | 직전 status가 `DONE` 또는 `DONE_WITH_CONCERNS`    | 다음 phase로 이동                      |
| `revise:<지시>` | 어떤 상태든                                       | 같은 phase를 지시에 맞게 재실행         |
| `stop`        | 어떤 상태든                                       | 오케스트레이터 종료 (lock 해제)         |
| `back:<N>`    | `N < currentPhaseNumber`                          | Phase N부터 재실행                      |

- `BLOCKED` / `NEEDS_CONTEXT` 상태에서 `proceed`는 거부하고 `revise:`나 `back:`을 다시 요청한다
- `proceed`로 다음 phase에 들어가기 전, 해당 phase status를 stale 검사한다. stale이면 해당 phase부터 다시

### 자동 진행 금지

Claude가 사용자 응답 없이 다음 phase로 넘어가지 않는다.
각 gate는 반드시 사용자의 명시적 응답을 받는다.

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
