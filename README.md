# haostudio-AI

고객이 작성한 상품 정보를 바탕으로 내부에서 상세페이지 원고, 기획 방향, A/B 시안, 제작 전달 자료를 정리하는 정적 웹 프로토타입입니다.

## 바로 열기

- 인수인계 시작: `START_HERE.html`
- 고객 작성폼: `project-form.html`
- 고객 작성폼 단일파일: `customer-form-standalone.html`
- 내부 관리자툴: `index.html`

GitHub Pages 주소:

- 고객 작성폼: https://mina0313.github.io/haostudio-AI/project-form.html
- 내부 관리자툴: https://mina0313.github.io/haostudio-AI/

## 기본 흐름

1. 고객이 `project-form.html`에서 제품 정보, 컨셉, 강점, 신뢰 자료, 옵션, 참고 URL을 작성합니다.
2. 저장된 고객 작성 내용은 브라우저 안에 보관됩니다.
3. 내부 담당자가 `index.html`에서 `고객 작성 내용 불러오기`를 누릅니다.
4. 업체명을 선택하면 고객 입력값이 내부 기획 필드로 자동 연결됩니다.
5. 내부 툴에서 A/B 시안 생성, 섹션 수정, 고객 발송 문안, 제작 전달 자료를 이어서 정리합니다.

## 폴더 구성

- `index.html`: 내부 관리자툴 화면
- `START_HERE.html`: 인수인계 시작 안내 화면
- `app.js`: 내부 관리자툴 동작 및 시안 생성 로직
- `project-form.html`: 고객 작성폼
- `project-form.js`: 고객 작성폼 저장 및 원고 생성 로직
- `styles.css`: 전체 화면 스타일
- `assets/`: 테스트/참고 이미지
- `PROJECT_GOAL.md`: 프로젝트 개발 목표
- `SHARE_README.md`: 외부 공유용 짧은 안내
- `CODEX_HANDOFF_PROMPT.md`: 다른 사람의 Codex에서 이어받기 위한 프롬프트

## 전달 시 참고

이 프로젝트는 별도 설치 없이 브라우저에서 열 수 있습니다. 같은 브라우저에서 고객폼을 작성한 뒤 내부 관리자툴을 열어야 작성 내용 불러오기가 됩니다.

고객에게 파일 하나만 보낼 때는 `customer-form-standalone.html`을 보내세요. `project-form.html`만 단독으로 보내면 `styles.css`, `project-form.js`를 같이 찾지 못해 디자인과 단계 이동이 깨질 수 있습니다.

내부 담당자나 개발자에게 전달할 때는 폴더 전체 또는 압축파일 전체를 전달하고, 먼저 `START_HERE.html`을 열라고 안내하세요.
