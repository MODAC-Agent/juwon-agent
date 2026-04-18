# Review PR Draft Rules

## 원칙

- 실제 검증하지 않은 것은 쓰지 않는다
- `review-report`의 findings를 숨기지 않는다
- 테스트 결과는 differential/scope gate를 그대로 적는다
- 이 skill에서 `gh pr create`를 실행하지 않는다

## 제목 규칙

- 70자 이내
- change-summary의 핵심 변경 의도를 드러낸다
- risk가 크면 제목보다 본문에서 설명한다

## 본문 규칙

- 배경
- 무엇이 바뀌었는지
- 리뷰 포인트 / 리스크
- 테스트 범위 / coverage gate
- 미확인 사항
