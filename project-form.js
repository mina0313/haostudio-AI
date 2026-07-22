const CUSTOMER_PROJECT_KEY = "customerProjectInput";
const CUSTOMER_PROJECT_LIST_KEY = "customerProjectList";

const CATEGORY_GUIDES = {
  "식품/건강식품": {
    title: "식품/건강식품 시안 방향",
    description: "원료, 구성, 섭취 편의성, 선물 수요, 신뢰 정보를 중심으로 A/B 시안을 구성합니다.",
  },
  "뷰티/화장품": {
    title: "뷰티/화장품 시안 방향",
    description: "브랜드 무드, 사용감, 사용 장면, 제형/향기/텍스처를 감각적으로 보여줍니다.",
  },
  "생활용품": {
    title: "생활용품 시안 방향",
    description: "문제 상황, 해결 방식, 사용법, 비교 포인트, 구매 판단 정보를 명확하게 정리합니다.",
  },
  "패션/잡화": {
    title: "패션/잡화 시안 방향",
    description: "착용/연출 이미지, 소재 디테일, 스타일링, 옵션 정보를 중심으로 구성합니다.",
  },
  "전자/디지털": {
    title: "전자/디지털 시안 방향",
    description: "기능, 스펙, 사용 장면, 비교 정보, 구매 전 확인 사항을 빠르게 이해시키는 구성을 씁니다.",
  },
  "유아/키즈": {
    title: "유아/키즈 시안 방향",
    description: "안전성, 보호자 관점, 사용 장면, 친근한 분위기를 함께 반영합니다.",
  },
  "반려동물": {
    title: "반려동물 시안 방향",
    description: "보호자의 고민, 안전성, 사용 장면, 신뢰 정보를 중심으로 구성합니다.",
  },
  "서비스/교육": {
    title: "서비스/교육 시안 방향",
    description: "문제 상황, 서비스 과정, 기대 효과, 신뢰 근거를 명확하게 보여줍니다.",
  },
  "기타": {
    title: "기본 시안 방향",
    description: "제품 특징과 요청사항을 기준으로 가장 적합한 상세페이지 구조를 선택합니다.",
  },
};

function collectProjectForm() {
  const data = {};
  document.querySelectorAll("[data-field]").forEach((field) => {
    data[field.dataset.field] = field.value.trim();
  });
  document.querySelectorAll("[data-group]").forEach((field) => {
    const group = field.dataset.group;
    if (!data[group]) data[group] = [];
    if (field.checked) data[group].push(field.value);
  });
  document.querySelectorAll("[data-file-group]").forEach((field) => {
    const group = field.dataset.fileGroup;
    data[group] = Array.from(field.files || []).map((file) => file.name);
  });
  data.oneLine = data.clientRequests || "";
  data.features = data.clientRequests || "";
  data.emphasis = data.clientRequests || "";
  data.mustInclude = data.productName || "";
  data.source = "고객 상세페이지 제작 접수폼";
  data.customerInputVersion = "simple-intake-v3";
  data.status = "신규 접수";
  return data;
}

function readProjectList() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_PROJECT_LIST_KEY) || "[]");
  } catch {
    return [];
  }
}

function validateProject(data) {
  if (!data.productName) return "제품명을 입력해주세요.";
  if (!data.category) return "카테고리를 선택해주세요.";
  if (!data.clientRequests) return "요청사항을 입력해주세요.";
  if (!data.contactInfo && !data.contactName) return "담당자명 또는 연락처를 입력해주세요.";
  const hasProductImage = (data.productImages || []).length > 0 || (data.imageAssets || []).includes("제품 이미지 있음");
  if (!hasProductImage) return "제품 이미지를 첨부하거나 '제품 이미지 있음'을 선택해주세요.";
  return "";
}

function saveProjectForm() {
  const data = collectProjectForm();
  const error = document.getElementById("formError");
  const message = document.getElementById("submitMessage");
  const validation = validateProject(data);

  if (validation) {
    error.textContent = validation;
    message.textContent = "";
    return;
  }

  error.textContent = "";
  const project = {
    id: `customer-project-${Date.now()}`,
    ...data,
    savedAt: new Date().toLocaleString("ko-KR"),
  };
  const projectList = readProjectList();
  projectList.unshift(project);
  localStorage.setItem(CUSTOMER_PROJECT_LIST_KEY, JSON.stringify(projectList));
  localStorage.setItem(CUSTOMER_PROJECT_KEY, JSON.stringify(project));

  message.innerHTML = `
    <strong>접수가 완료되었습니다.</strong>
    <p>담당자가 접수 내용을 확인한 뒤 상세페이지 A/B 시안을 준비합니다. 이후 시안 확인 연락을 드리겠습니다.</p>
  `;
}

function applyCategoryGuide() {
  const category = document.getElementById("categorySelect")?.value || "";
  const guide = CATEGORY_GUIDES[category];
  const guideBox = document.getElementById("categoryGuide");
  if (!guideBox) return;

  if (!guide) {
    guideBox.innerHTML = `
      <strong>카테고리를 선택하면 담당자가 업종에 맞는 시안 방향을 빠르게 잡을 수 있습니다.</strong>
      <p>복잡한 기획 항목을 고르지 않아도 제품 정보와 요청사항만으로 A/B 시안을 준비합니다.</p>
    `;
    return;
  }

  guideBox.innerHTML = `
    <strong>${guide.title}</strong>
    <p>${guide.description}</p>
  `;
}

document.getElementById("submitProjectForm")?.addEventListener("click", saveProjectForm);
document.getElementById("categorySelect")?.addEventListener("change", applyCategoryGuide);
applyCategoryGuide();
