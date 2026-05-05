# Figma 디자인 추출 규칙

> 이 파일은 서브에이전트가 읽는 추출 규칙이다.
> 직접 실행하지 않는다. `/figma-extract` Skill이 서브에이전트를 생성할 때 이 파일을 참조시킨다.

---

## 전달받는 정보

서브에이전트는 다음 정보를 프롬프트로 전달받는다:

- Figma URL 또는 노드 ID
- 모드 (new / update)
- 기능명 (kebab-case)
- 출력 디렉토리 경로
- 수정 모드일 경우: 기존 코드 위치

---

## 함께 읽을 reference

- 실패 처리 상세: [references/failure-handling.md](./references/failure-handling.md)
- 자동 검증과 사용자 체크리스트: [references/validation.md](./references/validation.md)

서브에이전트는 기본적으로 이 파일만 따라 작업하되, 아래 상황에서는 reference도 함께 읽는다:

- blocker 가능성이 보일 때
- 완료 보고 직전 검증이 필요할 때
- 사용자에게 검토 체크리스트를 넘겨야 할 때

---

## 공통 사전 실패 처리 원칙

아래 상황에서는 추출을 강행하지 말고 blocker로 보고한다:

- 출력 디렉토리 충돌
- 모드 불명확
- 수정 모드인데 대상 코드 위치 불명확
- Figma MCP 응답 일부만 수신되어 핵심 상태를 확정할 수 없음
- base 상태를 정할 수 없음

세부 대응 방식은 `references/failure-handling.md`를 따른다.

---

# 신규 모드 (New)

해당 기능의 코드가 없을 때. Figma 디자인의 전체 스펙을 기록한다.

## New-Step 1: Figma MCP로 데이터 조회

- `get_design_context` 또는 관련 MCP 도구로 모든 관련 프레임을 조회한다
- 하나의 기능에 여러 상태(Default, Hover, Dialog 열림, 에러 등)가 있을 수 있다
- 가능하면 페이지 단위로 한 번에 조회하되, 프레임이 많으면 나눠서 조회한다

## New-Step 2: 디렉토리 생성

`docs/specs/{기능명}/` 디렉토리를 생성한다.

> 이미 디렉토리가 있으면 새로 생성하지 말고, 위 공통 실패 처리 원칙과 `references/failure-handling.md`를 따른다.

## New-Step 3: index.md 생성

전체 조감도 파일을 생성한다. 반드시 다음 내용을 포함한다:

### 3-1. 메타 정보

- 모드: `new`
- Figma 원본 파일/프레임 링크 (조회에 사용한 URL 또는 노드 ID)
- 추출 시점 (날짜)
- 포함된 프레임 목록

### 3-2. 상태 목록 테이블

| 상태명 | 분류 | 파일명 | 트리거 |
| ------ | ---- | ------ | ------ |
| Default | Base | `base.md` | 초기 진입 |
| 이메일 알림 활성화 | Delta | `deltas/email-enabled.md` | 체크박스 선택 |
| 삭제 확인 | Independent | `delete-confirm.md` | 삭제 버튼 클릭 |

### 3-3. 상태 전환 관계

어떤 상태에서 어떤 액션을 하면 어떤 상태로 이동하는지 텍스트로 기술한다.

예: `Default -> (편집 클릭) -> EditMode -> (저장 성공) -> SuccessToast -> Default`

### 3-4. 공통 레이아웃

모든 상태에 공통으로 적용되는 레이아웃 규칙을 기술한다.
예: 전체 컨테이너 max-width, padding, 섹션 간격 등

### 3-5. 공유 컴포넌트 목록

여러 상태에서 반복 사용되는 컴포넌트를 나열한다.
예: Header, NavigationTab, ActionButton 등

이 컴포넌트들은 `components/` 하위 파일로 분리할 수 있다.

## New-Step 4: tokens.json 생성

디자인 토큰을 JSON으로 추출한다. 포함 항목:

- **colors**: primary, secondary, error, warning, success, background, border, text 계열
- **spacing**: 사용된 간격 값들
- **radius**: border-radius 값들
- **typography**: font-size, font-weight, line-height 조합들
- **shadows**: box-shadow 값들
- 기타 반복적으로 사용되는 디자인 값

Figma에서 추출한 정확한 수치를 사용한다. 추측하지 않는다.

## New-Step 5: Base + Delta 패턴으로 스펙 파일 생성

여러 프레임이 유사한 구조를 공유하는 경우, 전체 트리를 매번 반복하지 않는다.
**Base 파일에 기본 상태 전체를 기록하고, 나머지 상태는 Delta(변경분)만 기록한다.**

### 5-0. 상태 분류

모든 프레임을 조회한 후, 먼저 다음과 같이 분류한다:

| 분류 | 기준 | 파일 위치 |
| ---- | ---- | --------- |
| **Base** | 가장 기본이 되는 상태 (보통 Default) | `base.md` |
| **Delta** | 아래 Delta 판정 기준을 충족하는 상태 | `deltas/{상태명}.md` |
| **Independent** | Delta 기준을 충족하지 않는 별개 상태 | `{상태명}.md` (루트) |

#### Delta 판정 기준 (모두 충족해야 Delta)

1. **최상위 레이아웃 동일**: Base와 동일한 루트 컨테이너, 동일한 1depth 섹션 구조를 공유한다
2. **변경 노드 비율 20% 이하**: Base 컴포넌트 트리의 전체 리프 노드 대비, 변경/추가/제거되는 노드가 20% 이하이다
3. **변경이 로컬**: 변경이 특정 섹션/영역에 한정되어 있다 (트리 전반에 걸친 산발적 변경이 아님)

**판정 예시:**

| 상태 | 최상위 레이아웃 | 변경 노드 비율 | 변경 범위 | 판정 |
| ---- | -------------- | -------------- | --------- | ---- |
| 체크박스 ON → 하위 패널 펼침 | 동일 | ~10% (패널 내부 추가) | 한 섹션 | **Delta** |
| 입력 필드 에러 상태 | 동일 | ~5% (에러 메시지 + 보더 색상) | 한 필드 | **Delta** |
| 편집 모드 (여러 필드가 editable) | 동일 | ~15% (여러 필드 스타일 변경) | 복수 섹션이지만 패턴 동일 | **Delta** |
| 삭제 확인 Dialog | 완전히 다름 (오버레이) | 100% (별개 UI) | 전체 | **Independent** |
| 빈 상태 (Empty State) | 동일 컨테이너지만 내부 전면 교체 | ~80% | 전체 | **Independent** |
| 다른 탭 화면 | 탭 바만 동일, 본문 완전히 다름 | ~60% | 본문 전체 | **Independent** |

> 경계선 사례(변경 비율 15~25%)에서는 Delta로 분류하되, `index.md` 상태 목록 테이블의 비고에 "경계 사례"로 표시한다.

#### Delta 그룹핑 (상태가 6개 이상일 때)

Delta 파일이 6개 이상 생성될 것으로 예상되면, 관련 Delta를 그룹으로 묶어 파일 수를 줄인다.

**그룹핑 기준:**
- 동일한 트리거 계열 (예: 폼 검증 → `deltas/form-validation.md`에 에러/성공/경고를 모두 기술)
- 동일한 영역 변경 (예: 헤더 관련 Delta 3개 → `deltas/header-states.md`로 통합)
- 상호 배타적 상태 (예: 탭 A 선택 / 탭 B 선택 → `deltas/tab-selection.md`)

**그룹 파일 형식:**

```markdown
# {그룹명} (base 대비 변경분 모음)

## 포함된 상태
- 상태 A: {트리거}
- 상태 B: {트리거}
- 상태 C: {트리거}

---

## 상태 A

### 트리거
...

### 변경 항목
...

---

## 상태 B
...
```

그룹핑해도 `index.md`의 상태 목록 테이블에는 개별 상태를 모두 나열하되, 파일명 칼럼에 그룹 파일을 가리킨다.

### 5-1. Base 파일 작성 (`base.md`)

기본 상태의 전체 컴포넌트 트리를 작성한다. 각 노드에는:

- 역할/의미 (예: "프로필 이미지 영역")
- 핵심 스타일 (크기, 정렬, 간격 등 수치)

예시:

```
- Container (flex, column, gap-6, p-8, max-w-[720px])
  - Header (flex, justify-between, items-center)
    - Title "설정" (text-xl, font-bold, text-gray-900)
    - SaveButton (h-10, px-4, bg-primary, text-white, rounded-lg)
  - Section: 프로필 (flex, gap-4, p-6, border, rounded-xl)
    - Avatar (w-16, h-16, rounded-full)
    - Info (flex, column, gap-1)
      - Name (text-base, font-semibold)
      - Email (text-sm, text-gray-500)
  - Section: 알림 설정
    - Checkbox "이메일 알림" (unchecked)
    - DetailPanel: hidden
```

Base 파일에는 다음도 포함한다:

- **디자인 수치**: `tokens.json`에 없는 특수한 값
- **인터랙션**: 이 상태에서 가능한 사용자 액션과 결과
- **조건부 표시**: 특정 조건에 따라 달라지는 UI 요소
- **반응형 / 접근성 메모**: 확인 가능한 경우 기록, 불가능하면 `unknowns.md`에 기록

### 5-2. Delta 파일 작성 (`deltas/{상태명}.md`)

Base 대비 **변경된 부분만** 기록한다. 형식은 다음과 같다:

```markdown
# {상태명} (base 대비 변경분)

## 트리거
어떤 동작으로 이 상태가 되는지

## 변경 항목
- Section: 알림 설정 > Checkbox "이메일 알림"
  - unchecked -> checked (bg-white -> bg-primary-500)
- Section: 알림 설정 > DetailPanel
  - hidden -> visible (flex, column, gap-3, p-4, border-t)

## 추가 요소
- Footer > SaveButton: disabled -> enabled (opacity-50 제거)

## 제거 요소
- (없음)

## 스타일 변경
- Header > Title: text-gray-900 -> text-gray-500

## 인터랙션 변경
- Checkbox 해제 -> base 상태로 복귀
```

**Delta 파일의 핵심 규칙:**
- base.md의 전체 트리를 반복하지 않는다
- 변경된 노드만 **경로(Path)로 특정**하여 기술한다
- 변경 유형을 명확히 구분한다: 변경 / 추가 / 제거 / 스타일 변경

### 5-3. Independent 파일 작성 (`{상태명}.md`)

Base와 구조가 완전히 다른 상태는 루트에 별도 파일로 작성한다.
base.md와 동일한 형식으로 전체 컴포넌트 트리를 포함한다.

## New-Step 6: 공통 마무리

아래 [공통 마무리 단계](#공통-마무리-단계) 참조.

---

# 수정 모드 (Update)

해당 기능의 코드가 이미 존재할 때. **현재 코드가 base**이므로, Figma 디자인과의 **차이점(diff)만** 기록한다.

> GitHub PR과 같은 구조: main(현재 코드) 대비 변경사항만 정리한다.

## Update-Step 1: 기존 코드 파악 (Figma 조회 전)

Figma를 조회하기 **전에**, 먼저 현재 코드를 파악한다:

1. 해당 기능이 구현된 파일들을 찾는다 (컴포넌트, 훅, 스타일 등)
2. 현재 UI의 구조와 상태를 이해한다
3. 사용 중인 디자인 토큰/컴포넌트를 파악한다
4. `src/`의 public API(`index.ts`)와 같은 feature/widget/entity/shared 경계에서 재사용 가능한 컴포넌트를 찾는다
5. 새 컴포넌트가 필요해 보이면, 먼저 기존 컴포넌트로 표현할 수 없는 이유를 적는다

이 정보는 `reuse-map.md`에 저장한다. Figma와 비교할 때 현재 코드가 base임을 잃지 않기 위한 계약 파일이다.

`reuse-map.md` 형식:

```markdown
# {기능명} 기존 구현 / 재사용 맵

## 대상 코드
- `src/...`: 현재 역할

## 재사용 후보
| 후보 | 경로 | 판단 | 근거 |
| ---- | ---- | ---- | ---- |
| ExistingButton | `src/shared/ui/...` | reuse | variant/size로 Figma 버튼을 표현 가능 |
| LegacyPanel | `legacy/...` | avoid | legacy 영역이라 새 코드에서 직접 사용하지 않음 |

## 새로 만들 수 있는 것
- ComponentName: 기존 후보로 표현할 수 없는 이유
```

## Update-Step 2: Figma MCP로 데이터 조회

현재 코드를 이해한 **후에** Figma를 조회한다.

- `get_design_context` 또는 관련 MCP 도구로 관련 프레임을 조회한다
- 현재 코드의 구조를 이미 파악했으므로, 어떤 부분이 다른지 비교하며 조회한다

## Update-Step 3: 디렉토리 생성

`docs/specs/{기능명}/` 디렉토리를 생성한다.

> 이미 디렉토리가 있으면 새로 생성하지 말고, 위 공통 실패 처리 원칙과 `references/failure-handling.md`를 따른다.

## Update-Step 4: Figma와 현재 코드 비교

Figma MCP 응답과 현재 코드를 비교하여 **차이점을 식별**한다:

- 추가된 요소 (Figma에는 있지만 코드에는 없음)
- 제거된 요소 (코드에는 있지만 Figma에는 없음)
- 변경된 요소 (양쪽 다 있지만 스타일/구조/동작이 다름)
- 새로운 상태/인터랙션 (기존에 없던 상태가 추가됨)

비교 결과가 "기존 화면 전체"처럼 보이면 아직 diff가 아니다.
현재 코드와 동일한 영역은 스펙에 쓰지 말고, 변경이 없다고 판단한 근거만 `index.md`의 변경 요약에 짧게 남긴다.

## Update-Step 5: index.md 생성

수정 모드의 index.md는 다음 내용을 포함한다:

```markdown
# {기능명} 디자인 변경 스펙

## 메타 정보
- 모드: update
- Figma 원본: {URL 또는 노드 ID}
- 추출 시점: {날짜}
- 대상 코드 위치: {수정 대상 파일 경로 목록}
- 재사용 맵: `reuse-map.md`

## 변경 요약
전체 변경사항을 한눈에 볼 수 있는 요약.
변경 없음으로 판정한 주요 영역도 1줄로 적어, 전체 재구현 대상이 아님을 명확히 한다.

## 변경 파일 목록
| 변경 내용 | 파일명 | 영향 범위 (수정 대상 코드 파일) |
| --------- | ------ | ------------------------------- |
```

## Update-Step 6: tokens-diff.json 생성 (변경된 토큰이 있을 때만)

현재 코드에서 사용 중인 토큰과 Figma의 토큰을 비교하여, **변경/추가된 토큰만** 기록한다.

> **중요: 기본은 로컬 매핑이다.**
> 기능 하나의 리디자인에서 발견된 토큰 차이는 해당 기능의 코드에만 반영한다.
> 프로젝트 전역 디자인 시스템(CSS variables, theme config 등)을 수정하지 않는다.
> 전역 토큰 변경이 필요한 경우, `scope: "global"`로 표시하고 사용자에게 승인을 요청한다.

```json
{
  "scope": "local",
  "changed": {
    "colors.primary": { "from": "#3B82F6", "to": "#2563EB", "note": "이 기능 내에서만 적용" }
  },
  "added": {
    "shadows.card": "0 2px 8px rgba(0,0,0,0.08)"
  },
  "global_candidates": {
    "note": "전역 변경이 필요해 보이는 항목. 사용자 승인 후 적용.",
    "items": []
  }
}
```

변경된 토큰이 없으면 이 파일을 생성하지 않는다.

## Update-Step 7: changes/ 디렉토리에 변경 스펙 작성

각 변경 단위마다 `changes/{변경명}.md` 파일을 생성한다.

변경 단위 분리 기준:
- 독립적으로 구현/리뷰할 수 있는 단위로 나눈다
- 하나의 컴포넌트 또는 하나의 인터랙션 변경이 하나의 파일

각 파일의 형식:

```markdown
# {변경 제목}

## 대상
수정할 코드 파일 경로

## 재사용 방침
- 재사용할 기존 컴포넌트/public API
- 새로 만들 요소가 있다면 기존 후보로 불가능한 이유

## 현재 상태
현재 코드에서 해당 부분이 어떻게 되어있는지 간략히 기술.
(코드를 복사하지 않는다. 구현 시 직접 읽으면 된다.)

## 변경 내용

### 구조 변경
- 버튼 그룹: 기존 2개 -> 3개 ("초기화" 버튼 추가)
- SaveButton 왼쪽에 ResetButton 추가

### 스타일 변경
- SaveButton: h-9 -> h-10, rounded-md -> rounded-lg
- 새 ResetButton: h-10, px-4, border, rounded-lg, text-gray-600

### 인터랙션 변경
- ResetButton 클릭 -> confirm dialog -> 폼 리셋

### 새로운 상태 (해당 시)
기존에 없던 상태가 추가되는 경우, 해당 상태의 전체 구조를 기술한다.
(현재 코드에 없으므로 diff가 아닌 full spec)

## Figma 참조
해당 변경이 보이는 Figma 프레임 이름 또는 노드 정보
```

**핵심 규칙:**
- 현재 코드의 내용을 복사하여 기록하지 않는다 (구현 시 직접 읽는다)
- Figma에서 변경된 부분만 기술한다
- 기존 코드와 같은 부분을 "확인용 전체 스펙"으로 다시 쓰지 않는다
- 변경 파일 하나가 대상 컴포넌트 전체를 대체하도록 지시하면 안 된다. 전체 교체가 필요하면 이유를 명시하고 blocker 후보로 보고한다
- 단, 완전히 새로운 요소/상태는 full spec으로 기술한다 (코드에 비교 대상이 없으므로)

## Update-Step 8: 공통 마무리

아래 [공통 마무리 단계](#공통-마무리-단계) 참조.

---

# 공통 마무리 단계

신규/수정 모드 모두 아래 단계를 수행한다.

## unknowns.md 생성

추출 과정에서 확인할 수 없었거나 불확실한 항목을 모두 기록한다.
이 파일은 구현 시 "Figma를 다시 봐야 하는지" 판단하는 데 사용된다.

반드시 포함할 항목:

- Figma에 프레임이 없어서 추측한 상태 (예: "hover 상태 frame 없음, inferred")
- 확인 불가능한 에셋 (예: "아이콘 실제 SVG/URL 미확인")
- 반응형 규칙이 불명확한 경우 (예: "mobile breakpoint 없음")
- 애니메이션/트랜지션 정보가 없는 경우
- Auto layout 해석이 애매한 경우
- 이미지 crop/fill 방식이 불확실한 경우
- 오버레이/모달의 backdrop 처리가 불명확한 경우

형식 예시:

```markdown
## 미확인 항목

- [ ] hover 상태: Figma에 별도 프레임 없음. Default 기반으로 추측 필요
- [ ] 아이콘 에셋: Figma 노드에서 SVG 추출 필요 (현재 미포함)
- [ ] 모바일 레이아웃: breakpoint 정보 없음
- [ ] 삭제 확인 Dialog 진입 애니메이션: 정보 없음
```

## 공유 컴포넌트 분리 (해당되는 경우)

여러 상태/변경에서 반복 사용되는 컴포넌트가 있으면,
`docs/specs/{기능명}/components/` 디렉토리에 별도 파일로 분리한다.

**분리 기준:**

- 2개 이상의 스펙 파일에서 동일한 구조로 사용되는 컴포넌트
- 자체적으로 복잡한 구조를 가진 컴포넌트 (내부 요소 5개 이상)

## 자동 검증 단계

스펙 생성이 끝나면, 완료 보고 전에 `references/validation.md`의 자동 검증 절차를 수행한다.

핵심 원칙:

- 누락 파일, 깨진 참조, base 미결정, 코드 경로 미확정은 **blocker**
- blocker가 있으면 "추출 완료"라고 보고하지 않는다
- blocker가 아닌 미확인 정보는 `unknowns.md`에 남기고 계속 진행할 수 있다

## 추출 완료 보고

모든 파일 생성이 완료되면 다음 내용을 반환한다:

- 모드 (신규 / 수정)
- 생성된 파일 목록과 각 파일의 역할
- 신규 모드: 감지된 상태 수 및 분류 (Base / Delta / Independent)
- 수정 모드: 변경 항목 수 및 영향 범위 (수정 대상 코드 파일)
- `unknowns.md`에 기록된 미확인 항목 요약
- 자동 검증 요약
  - 필수 파일 검증: 통과 / 실패
  - 참조 무결성 검증: 통과 / 실패
  - blocker 목록: 없으면 "없음"

---

# 출력 디렉토리 구조

## 신규 모드

```
docs/specs/{기능명}/
├── index.md              # 메타(mode: new), 상태 목록, 전환 관계, 공통 레이아웃
├── tokens.json           # 전체 디자인 토큰
├── unknowns.md           # 미확인 항목
├── base.md               # 기본 상태 전체 컴포넌트 트리
├── deltas/               # Base 대비 변경분
│   ├── checked.md
│   └── error.md
├── {상태명}.md           # 독립 상태 (전체 트리)
└── components/           # 공유 컴포넌트 스펙
```

## 수정 모드

```
docs/specs/{기능명}/
├── index.md              # 메타(mode: update), 변경 요약, 대상 코드 위치
├── reuse-map.md          # 기존 코드/컴포넌트 재사용 판단
├── tokens-diff.json      # 변경/추가된 디자인 토큰만 (변경 없으면 생략)
├── unknowns.md           # 미확인 항목
├── changes/              # 현재 코드 대비 변경 스펙
│   ├── header-layout.md
│   ├── add-reset-button.md
│   └── new-error-state.md
└── components/           # 공유 컴포넌트 스펙 (해당 시)
```

---

# 핵심 원칙

1. Figma에서 가져온 원본 데이터의 수치를 **정확히 기록**한다. 추측이나 반올림 하지 않는다.
2. 색상은 Figma 원본 값(HEX)을 그대로 사용한다.
3. 컴포넌트 트리는 실제 구현에 필요한 수준으로 정리한다. Figma의 내부 그룹핑을 그대로 따르지 않고, HTML/React 구조에 맞게 재구성한다. 단, 재구성 의도를 주석이나 메모로 남겨서 구현자가 판단할 수 있게 한다.
4. 불필요한 Figma 메타데이터(노드 ID, 내부 좌표계 등)는 제거한다. 단, Figma 노드 링크는 `index.md` 메타 정보에 보관한다.
5. 확인 불가능한 항목은 제거하지 않고, `unknowns.md`에 **반드시** 기록한다.
6. 공유 컴포넌트가 있으면 `components/`로 분리하여 중복을 줄인다.
7. **수정 모드에서 현재 코드를 스펙 파일에 복사하지 않는다.** 현재 코드는 구현 시 직접 읽는다.
8. **수정 모드에서 기존 컴포넌트 재사용 판단을 생략하지 않는다.** 재사용하지 않는 경우에도 이유를 `reuse-map.md`와 변경 파일에 남긴다.
