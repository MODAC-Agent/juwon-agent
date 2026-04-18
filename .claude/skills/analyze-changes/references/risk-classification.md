# Risk Classification

## High

- 외부 API 응답 파싱
- 인증/인가
- 결제, 권한, 데이터 삭제
- 상태 전이 조건이 늘어난 로직
- config/build/runtime entry 변경

## Medium

- UI 조건 분기 추가
- 폼 검증 규칙 변경
- 캐시 키, query key, serialization 규칙 변경
- 재사용 컴포넌트 props 계약 변경

## Low

- 문서만 변경
- 테스트만 보강
- copy 변경
- 스타일만 조정되고 동작 분기 없음

## 기록 방식

각 risk area는 아래 세 항목을 남긴다.

- `path`
- `level`
- `reason`
