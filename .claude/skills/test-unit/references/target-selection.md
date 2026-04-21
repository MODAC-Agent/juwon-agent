# Target Selection

## strict

- changed production files 자체만 coverage 대상

## transitive

- changed file이 새로 직접 호출하는 내부 의존 파일까지 포함

## 우선 target

- `analyze-changes.testTargets`
- `code-review.testGaps.priority == required`
- parsing, branching, async error path가 있는 파일
