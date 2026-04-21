# Resume And Locking

## resume

- `/review-build --resume <runId>` 형태로 재진입
- `runId`를 생략하면 scope 내 가장 최근 run을 후보로 본다. 단 stale 검사 통과 후에만 재개
- 직전 run의 status가 `BLOCKED` 또는 `NEEDS_CONTEXT`라면 runid-resolve가 `requiresDecision=true`를 돌려준다. 오케스트레이터는 이 경우 반드시 사용자에게 "이어서 수정 / 새 run 시작"을 묻고, 새 run을 원하면 `--new-run`으로 재호출한다

## locking

- `status/review-build.json`의 `lockedAt`, `lockedBy`(pid)로 관리한다
- bootstrap script(`review-build.sh`)는 lock을 잡지 않는다. 실행이 끝나는 순간 죽은 pid가 lock으로 남는 문제를 피하기 위해 bootstrap 시 `lockedAt=null`, `lockedBy=null`로 기록한다
- bootstrap script는 시작 시 기존 status를 읽어 살아있는 pid가 lock을 잡고 있으면 진입을 거부한다 (`exit 2`)
- 세션 lock은 오케스트레이터가 phase를 실제로 실행하는 동안에만 잡고, 응답을 기다리기 전에는 반드시 해제한다

## stale

- `baseCommitSha`, `headCommitSha`, `analysisMode` 중 하나라도 현재 repo 상태와 다르면 resume 거부
- `generatedAt`이 24시간을 넘은 run은 soft-stale로 표시해 사용자에게 재확인을 요청
- stale로 판정되면 `--new-run`을 제안한다
