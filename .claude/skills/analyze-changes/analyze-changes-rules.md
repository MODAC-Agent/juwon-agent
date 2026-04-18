# Analyze Changes Rules

## 핵심 원칙

- 사실과 추정을 구분한다
- 전체 레포를 훑지 말고 changed files와 직접 인접한 파일만 읽는다
- 다음 phase가 바로 사용할 수 있게 `testTargets`를 명시적으로 만든다
- FSD/계층 구조 해석은 확신이 있을 때만 적고, 아니면 `[미확인]`으로 남긴다

## scope 결정 규칙

1. 사용자가 scope를 주면 우선한다
2. 한 feature/module 경로로 명확히 묶이면 그 이름을 kebab-case로 쓴다
3. 여러 영역이 섞이면 범용 이름보다 작업 의도가 드러나는 묶음 이름을 사용한다
4. 그래도 애매하면 `NEEDS_CONTEXT`

## 파일 분류

- `production`: 런타임 동작에 영향이 있는 앱 코드
- `test`: `*.test.*`, `*.spec.*`, `__tests__/**`, `__mocks__/**`
- `docs`: `*.md`, ADR, roadmap, usage guide
- `config`: lint, tsconfig, package, build, ci, env template

## testTargets 선정

- 기본은 changed production files를 그대로 target으로 넣는다
- 테스트가 먼저 바뀐 경우에도 대응 production file을 찾을 수 있으면 target에 포함한다
- docs-only change면 `testTargets: []`를 허용하되 이유를 남긴다
- high-risk parsing, branching, async boundary, permissions, config 변화는 required target으로 올린다

## status 판정

- changed production file이 있고 testTargets도 정리되면 `DONE`
- changed file 해석은 가능하지만 일부 의도/리스크가 미확인이면 `DONE_WITH_CONCERNS`
- diff 자체가 없거나 비교 기준을 만들 수 없으면 `BLOCKED`
- scope나 포함 범위를 확정할 수 없으면 `NEEDS_CONTEXT`
