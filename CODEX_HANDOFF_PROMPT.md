# Codex 이어받기 프롬프트

아래 내용을 다른 사람의 Codex 새 대화에 그대로 붙여넣으면 됩니다.

---

저장소: https://github.com/mina0313/haostudio-AI

웹 확인 주소:

- 내부 관리자툴: https://mina0313.github.io/haostudio-AI/
- 고객 작성폼: https://mina0313.github.io/haostudio-AI/project-form.html
- 인수인계 시작 페이지: https://mina0313.github.io/haostudio-AI/START_HERE.html

현재 기준: GitHub 저장소 `main` 브랜치 최신 버전

## 프로젝트 설명

이 프로젝트는 HAO Studio 상세페이지 AI 제작툴 프로토타입입니다.

고객이 `project-form.html`에서 제품 정보를 작성하면, 내부 담당자가 `index.html`에서 `고객 작성 내용 불러오기`를 눌러 업체명을 선택하고, 고객 입력값을 내부 기획/원고/A-B 시안 생성 흐름에 연결하는 구조입니다.

## 주요 파일

- `index.html`: 내부 관리자툴 화면
- `app.js`: 내부 관리자툴 로직, 고객 작성 내용 불러오기, A/B 시안 생성, 섹션 편집 로직
- `project-form.html`: 고객 작성폼
- `project-form.js`: 고객 작성폼 저장, 검증, 상세페이지 원고 결과 생성 로직
- `styles.css`: 전체 스타일
- `START_HERE.html`: 인수인계 시작 안내 페이지
- `customer-form-standalone.html`: 고객에게 파일 1개만 보낼 때 쓰는 단일 HTML
- `README.md`, `SHARE_README.md`, `HANDOFF_CHECKLIST.md`: 전달/확인 문서

## 최근 반영된 핵심 작업

- 고객 작성폼을 5단계 상세페이지 원고 생성폼으로 정리
- 컨셉 스타일별로 결과 문구가 다르게 나오도록 보강
- 핵심 특장점 5개를 `key point` 카드 형태로 생성
- 고객이 입력한 신뢰/인증, 활용/레시피, 구매 포인트, 리뷰 가이드, 옵션/가격, 참고 URL을 결과 원고와 내부툴에 연결
- 내부 관리자툴에서 고객 작성 내용 불러오기 시 기획 방향, 타깃, 강조 요소, USP가 자동 선택/추가되도록 수정
- 다른 사람에게 전달하기 위한 `START_HERE.html`과 단일 고객폼 파일 추가

## 이어서 작업할 때 확인할 것

1. `README.md`와 `START_HERE.html`을 먼저 읽고 전체 흐름을 파악하세요.
2. `project-form.html`에서 고객 작성폼을 테스트하세요.
3. 같은 브라우저에서 `index.html`을 열고 `고객 작성 내용 불러오기`가 작동하는지 확인하세요.
4. 고객 입력값이 내부 필드로 잘 들어가는지 확인할 파일은 `app.js`입니다.
   - `importCustomerProject`
   - `styleDirectionsForCustomer`
   - `strengthHighlightsForCustomer`
   - `customerOptionMemo`
5. 고객폼 결과 문구를 조정할 파일은 `project-form.js`입니다.
   - `resultSectionsFor`
   - `pointCopyFor`
   - `linkedSuggestion`
   - `usageProposal`

## 중요한 주의사항

- 현재 저장은 브라우저 `localStorage` 기반입니다. 고객과 내부 담당자가 서로 다른 컴퓨터를 쓰면 작성 내용이 자동 공유되지 않습니다.
- 실제 운영용으로 만들려면 서버 저장, 파일 업로드 저장소, 로그인/권한 처리가 필요합니다.
- `file:///C:/...` 주소는 만든 사람 컴퓨터에서만 열립니다. 다른 사람에게는 GitHub 주소나 저장소 URL을 보내야 합니다.

## 다음 개발 추천

- 고객 작성 데이터를 서버/DB에 저장해서 다른 컴퓨터에서도 내부툴에서 불러올 수 있게 만들기
- 고객 작성폼 제출 후 관리자에게 공유 가능한 접수 URL 또는 접수 ID 생성
- 내부툴의 A/B 시안 결과를 실제 디자인처럼 더 고도화
- 이미지 업로드 파일을 브라우저 이름만 저장하는 방식에서 실제 파일 저장 방식으로 개선
- `app.js`가 매우 크므로 기능별 파일로 분리

---

위 저장소를 클론하거나 열어서 이어서 작업해줘.
