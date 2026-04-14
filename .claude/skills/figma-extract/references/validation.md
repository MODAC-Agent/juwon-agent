# Figma Extract Validation

## 자동 검증 요약

추출 완료 전에 아래 항목을 자동으로 점검한다.

### 공통 검증

- 출력 디렉토리가 실제로 생성되었는가
- `index.md`와 `unknowns.md`가 존재하는가
- `index.md`에 적은 파일 참조가 실제 파일과 일치하는가
- 비어 있는 placeholder(`...`, `TODO`, `TBD`)가 남아 있지 않은가

### 신규 모드 검증

- `tokens.json`, `base.md`가 존재하는가
- 상태 목록 테이블의 각 행이 실제 스펙 파일로 연결되는가
- Delta/Independent 개수 요약이 실제 파일 수와 맞는가

### 수정 모드 검증

- `changes/` 디렉토리가 존재하는가
- `changes/*.md`마다 `대상`, `변경 내용`, `Figma 참조` 섹션이 있는가
- `tokens-diff.json`이 있다면 `scope`가 있고, `global_candidates` 형식이 유효한가

### 검증 실패 처리

- 누락 파일, 깨진 참조, base 미결정, 코드 경로 미확정은 **blocker**
- blocker가 있으면 "추출 완료"라고 보고하지 않는다
- blocker가 아닌 미확인 정보는 `unknowns.md`에 남기고 계속 진행할 수 있다

## 사용자 검토 체크리스트

```
## 추출 검증 체크리스트

### 스크린샷 대조
- [ ] Figma 원본 스크린샷과 `base.md`의 컴포넌트 트리가 일치하는가?
- [ ] 각 Delta/Independent 상태가 Figma의 해당 프레임과 대응하는가?

### 상태 완전성
- [ ] Figma에 있는 모든 프레임/상태가 스펙 파일에 포함되었는가?
- [ ] 빠진 상태가 있다면 `unknowns.md`에 기록되어 있는가?

### 수치 정확성
- [ ] `tokens.json`의 색상값이 Figma 원본과 일치하는가? (랜덤 샘플 2~3개 확인)
- [ ] 주요 간격/크기 값이 Figma Inspector 수치와 일치하는가?

### 분류 적절성
- [ ] Delta로 분류된 상태가 실제로 Base와 대부분 동일한 구조인가?
- [ ] Independent로 분류된 상태가 실제로 별개의 레이아웃인가?
```
