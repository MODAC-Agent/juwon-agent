---
name: figma-extract
description: Figma 디자인 추출, Figma URL 분석, 디자인 스펙화, UI 구현 전 스펙 파일 생성이 필요할 때 사용. 서브에이전트가 Figma MCP 응답을 docs/specs/로 정제한다.
argument-hint: [figma-url]
allowed-tools: Agent Read Write Edit Bash Glob Grep
---

# Figma 디자인 추출

## 동작 방식

이 Skill은 **서브에이전트**를 사용하여 Figma 데이터를 추출한다.
Figma MCP 응답(프레임당 500KB~2MB)이 메인 대화 컨텍스트에 남지 않아,
추출 후 구현 대화를 길게 이어갈 수 있다.

```
[메인 에이전트] → Agent 도구로 서브에이전트 생성
                    ↓
              [서브에이전트]
              Figma MCP 호출 (500KB~2MB)
              스펙 파일로 정제 → docs/specs/{기능명}/
              요약만 반환
                    ↓
[메인 에이전트] ← "추출 완료" 요약 수신 (수 KB)
              스펙 파일 읽고 구현 (/figma-implement)
```

---

## Step 1: 정보 수집

서브에이전트를 띄우기 **전에** 다음 정보를 확인한다:

1. **Figma URL** 또는 노드 ID
2. **모드 판별**:
   - 해당 기능의 코드가 없으면 → **신규(new)**
   - 해당 기능의 코드가 이미 있으면 → **수정(update)**
   - 불확실하면 사용자에게 묻는다
3. **기능명**: 영문 kebab-case (예: `user-settings`)
4. **수정 모드일 경우**: 기존 코드가 있는 파일 경로와 재사용해야 할 기존 컴포넌트 후보
   - 사용자가 경로를 모르면 먼저 `src/`에서 기능명, 화면 문구, route 이름으로 탐색한다
   - 기존 컴포넌트 후보를 못 찾으면 "없음"으로 확정하지 말고 근거를 남긴다

> 서브에이전트는 사용자와 직접 대화할 수 없으므로, 필요한 정보를 모두 수집한 후에 실행한다.

### Step 1-1: 사전 체크

서브에이전트를 띄우기 전에 아래 3가지만 먼저 확정한다:

- 출력 디렉토리를 재사용할지, 새 경로를 쓸지
- 수정 모드일 때 대상 코드 경로가 확정되었는지
- 수정 모드일 때 기존 컴포넌트/공개 API 재사용 후보를 확인했는지
- 신규/수정 모드가 모호하지 않은지

세부 blocker 기준과 예외 처리는 [references/failure-handling.md](./references/failure-handling.md)를 따른다.

---

## Step 2: 서브에이전트로 추출 실행

Agent 도구를 사용하여 서브에이전트를 생성한다.

**프롬프트 구성:**

```
Agent({
  description: "Figma 디자인 추출",
  prompt: `
    Figma 디자인을 스펙 파일로 추출하는 작업입니다.

    먼저 .claude/skills/figma-extract/figma-extract-rules.md 파일을 읽고
    그 규칙에 따라 추출을 진행하세요.
    실패 처리나 완료 검증이 필요하면
    .claude/skills/figma-extract/references/failure-handling.md 와
    .claude/skills/figma-extract/references/validation.md 도 읽으세요.

    ## 작업 정보
    - Figma URL: {사용자가 제공한 URL}
    - 모드: {new 또는 update}
    - 기능명: {kebab-case 기능명}
    - 출력 디렉토리: docs/specs/{기능명}/
    ${수정 모드일 경우: "- 기존 코드 위치: {파일 경로 목록}"}
    ${수정 모드일 경우: "- 재사용 후보: {기존 컴포넌트/public API 경로 목록 또는 조사 근거}"}

    ## 완료 시 보고할 내용
    - 생성된 파일 목록과 각 파일의 역할
    - 신규: 감지된 상태 수 및 분류 (Base / Delta / Independent)
    - 수정: 변경 항목 수, 영향 범위, 재사용/신규 생성 판단 요약
    - unknowns.md 미확인 항목 요약
    - validation 요약 (필수 파일 / 참조 무결성 / 차단 이슈 여부)
  `
})
```

---

## Step 3: 결과 보고 및 자동 검증 요약

서브에이전트가 반환한 결과를 사용자에게 전달한다.

반드시 아래 3가지를 함께 전달한다:

1. 생성된 스펙 파일 목록
2. 서브에이전트의 **자동 검증 요약**
3. 사람이 눈으로 확인하는 **추출 검증 체크리스트**

자동 검증 형식과 사용자 체크리스트는 [references/validation.md](./references/validation.md)를 따른다.
자동 검증에 실패하면 구현 단계로 넘기지 않는다.

이후 안내:
> "추출이 완료되었습니다. 자동 검증 요약과 체크리스트를 확인한 후, 구현을 진행하려면 `/figma-implement`를 실행해주세요."

스펙 파일을 먼저 검토하고 싶으면 `docs/specs/{기능명}/index.md`를 확인하도록 안내한다.
