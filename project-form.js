const CUSTOMER_PROJECT_KEY = "customerProjectInput";
const CUSTOMER_PROJECT_LIST_KEY = "customerProjectList";
const TOTAL_STEPS = 5;

let currentStep = 1;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function fieldValue(name) {
  return document.querySelector(`[data-field="${name}"]`)?.value.trim() || "";
}

function setError(message = "") {
  const error = $("#formError");
  if (error) error.textContent = message;
}

function updateProgress() {
  const percent = Math.round((currentStep / TOTAL_STEPS) * 100);
  $("#stepLabel").textContent = `STEP ${currentStep} / ${TOTAL_STEPS}`;
  $("#stepPercent").textContent = `${percent}% 진행됨`;
  $("#progressBar").style.width = `${percent}%`;

  $$(".wizard-step").forEach((step) => {
    step.classList.toggle("active", Number(step.dataset.step) === currentStep);
  });

  $("#prevStep").style.display = currentStep === 1 ? "none" : "inline-flex";
  $("#nextStep").style.display = currentStep === TOTAL_STEPS ? "none" : "inline-flex";
  $("#submitProjectForm").style.display = currentStep === TOTAL_STEPS ? "inline-flex" : "none";
  setError("");
}

function checkedValues(group) {
  return $$(`[data-group="${group}"]`).filter((field) => field.checked).map((field) => field.value);
}

function selectedStyleTone() {
  return document.querySelector('input[name="styleTone"]:checked')?.value || "정보형 (스펙)";
}

function optionRows() {
  return $$("#optionBuilder .option-row").map((row) => {
    const value = (name) => row.querySelector(`[data-option-field="${name}"]`)?.value.trim() || "";
    return {
      name: value("name"),
      volume: value("volume"),
      price: value("price"),
    };
  }).filter((item) => item.name || item.volume || item.price);
}

function collectProjectForm() {
  const data = {};
  $$("[data-field]").forEach((field) => {
    data[field.dataset.field] = field.value.trim();
  });
  $$("[data-group]").forEach((field) => {
    const group = field.dataset.group;
    if (!data[group]) data[group] = [];
    if (field.checked) data[group].push(field.value);
  });
  $$("[data-file-group]").forEach((field) => {
    const group = field.dataset.fileGroup;
    data[group] = Array.from(field.files || []).map((file) => file.name);
  });

  data.styleTone = selectedStyleTone();
  data.options = optionRows();
  data.oneLine = data.heroSentence || data.coreStrength || data.productName || "";
  data.features = [
    data.coreStrength,
    checkedValues("strengthTags").join(", "),
    data.productionTrust,
    data.purchaseBenefit,
    data.reviewKeywords,
  ].filter(Boolean).join("\n");
  data.emphasis = data.coreStrength || data.heroSentence || "";
  data.mustInclude = [data.productName, data.seoKeyword].filter(Boolean).join(", ");
  data.clientRequests = [
    data.heroSentence,
    data.coreStrength,
    data.productionTrust,
    data.purchaseBenefit,
    data.reviewKeywords,
  ].filter(Boolean).join("\n\n");
  data.references = data.seoKeyword || "";
  data.imageMemo = data.styleTone;
  data.source = "AI 상세페이지 5단계 원고 생성폼";
  data.customerInputVersion = "wizard-intake-v1";
  data.status = "원고 생성 완료";
  return data;
}

function readProjectList() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_PROJECT_LIST_KEY) || "[]");
  } catch {
    return [];
  }
}

function validateStep(step = currentStep) {
  if (step === 1) {
    if (!fieldValue("contactName")) return "이름을 입력해주세요.";
    if (!fieldValue("contactInfo")) return "연락처를 입력해주세요.";
    if (!fieldValue("email")) return "이메일을 입력해주세요.";
    if (!fieldValue("productName")) return "제품명을 입력해주세요.";
  }
  if (step === 2 && !fieldValue("heroSentence")) return "고객을 사로잡는 첫 문장을 입력해주세요.";
  if (step === 3) {
    if (!fieldValue("coreStrength")) return "핵심 경쟁력을 입력해주세요.";
    if (!checkedValues("strengthTags").length) return "제품 주요 강점을 하나 이상 선택해주세요.";
  }
  if (step === 4 && !fieldValue("productionTrust")) return "생산 및 인증 과정 내용을 입력해주세요.";
  return "";
}

function validateProject(data) {
  for (let step = 1; step <= 4; step += 1) {
    const message = validateStep(step);
    if (message) return message;
  }
  if (!data.options.length) return "옵션 정보를 하나 이상 입력해주세요.";
  return "";
}

function escapeHtml(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shortText(text = "", fallback = "") {
  return (String(text).trim() || fallback).replace(/\s+/g, " ");
}

function resultSectionsFor(data) {
  const productName = shortText(data.productName, "제품");
  const strengthTags = Array.isArray(data.strengthTags) ? data.strengthTags : [];
  const primaryStrength = strengthTags[0] || "핵심 베네핏";
  return [
    {
      title: "첫 화면 메인 비주얼",
      copy: `${productName}의 핵심 가치를 한눈에 보여주고, 고객이 바로 이해할 수 있는 메인 카피를 배치합니다.`,
    },
    {
      title: "고객 고민 공감",
      copy: `${shortText(data.targetCustomer, "타깃 고객")}이 겪는 불편함을 먼저 짚어 구매 이유를 만듭니다.`,
    },
    {
      title: "핵심 경쟁력 강조",
      copy: shortText(data.coreStrength, `${primaryStrength} 중심으로 제품 차별점을 정리합니다.`),
    },
    {
      title: "성분/기능/사용감 설명",
      copy: `${strengthTags.join(", ") || "제품 주요 강점"}을 카드형 정보로 나누어 신뢰감 있게 설명합니다.`,
    },
    {
      title: "품질과 인증 신뢰 구간",
      copy: shortText(data.productionTrust, "제조 과정, 품질 관리, 인증 정보를 정리해 구매 불안을 줄입니다."),
    },
    {
      title: "구매 옵션과 리뷰 설득",
      copy: "옵션 구성, 가격, 리뷰 키워드, 구매 혜택을 마지막 전환 구간에 배치합니다.",
    },
  ];
}

function optionSummary(options = []) {
  if (!options.length) return "입력된 옵션 정보를 바탕으로 구성/용량/가격을 정리합니다.";
  return options.map((item) => [item.name, item.volume, item.price].filter(Boolean).join(" · ")).join("\n");
}

function renderResultPlan(data) {
  $("#resultProductName").textContent = shortText(data.productName, "상세페이지 기획안");
  $("#resultMeta").textContent = `${shortText(data.clientName || data.companyName, "브랜드")} · ${shortText(data.category, "카테고리")} · ${shortText(data.styleTone, "스타일")}`;
  $("#resultHeroSentence").textContent = shortText(data.heroSentence, "고객을 사로잡는 첫 문장을 중심으로 상세페이지 흐름을 구성합니다.");
  $("#resultTarget").textContent = shortText(data.targetCustomer, "제품 구매 가능성이 높은 고객을 중심으로 설득 흐름을 설계합니다.");
  $("#resultTone").textContent = shortText(data.styleTone, "정보형과 세일즈형을 균형 있게 반영합니다.");
  $("#resultHeadline").textContent = shortText(data.heroSentence, `${shortText(data.productName, "제품")}의 가치를 가장 먼저 보여주는 메인 카피를 제안합니다.`);
  $("#resultStrength").textContent = shortText(data.coreStrength, "제품의 차별점과 구매 이유를 상세페이지 중반부에서 명확히 설명합니다.");
  $("#resultTrust").textContent = shortText(data.productionTrust, "제조 과정과 품질 관리 기준을 근거로 신뢰 구간을 구성합니다.");
  $("#resultBenefit").textContent = shortText(data.purchaseBenefit, "구매를 유도할 수 있는 혜택을 CTA 전 구간에 배치합니다.");
  $("#resultReview").textContent = shortText(data.reviewKeywords, "만족도 높은 리뷰 키워드를 후기 섹션 카피에 반영합니다.");
  $("#resultOptions").textContent = optionSummary(data.options);
  $("#resultSections").innerHTML = resultSectionsFor(data).map((section, index) => `
    <li>
      <span>${String(index + 1).padStart(2, "0")}</span>
      <div>
        <strong>${escapeHtml(section.title)}</strong>
        <p>${escapeHtml(section.copy)}</p>
      </div>
    </li>
  `).join("");
}

function saveProjectForm(event) {
  event?.preventDefault();
  const data = collectProjectForm();
  const validation = validateProject(data);

  if (validation) {
    setError(validation);
    return;
  }

  const project = {
    id: `customer-project-${Date.now()}`,
    ...data,
    savedAt: new Date().toLocaleString("ko-KR"),
  };
  const projectList = readProjectList();
  projectList.unshift(project);
  localStorage.setItem(CUSTOMER_PROJECT_LIST_KEY, JSON.stringify(projectList));
  localStorage.setItem(CUSTOMER_PROJECT_KEY, JSON.stringify(project));

  $("#projectWizard").classList.add("is-complete");
  $("#generatingScreen").classList.add("active");
  $("#submitMessage").innerHTML = `
    <strong>원고 생성 요청이 완료되었습니다.</strong>
    <p>관리자 화면에서 접수 내용을 불러와 A/B 상세페이지 시안을 바로 생성할 수 있습니다.</p>
  `;
  renderResultPlan(data);
  window.setTimeout(() => {
    $("#generatingScreen").classList.remove("active");
    $("#resultScreen").classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 1600);
}

function goNext() {
  const message = validateStep();
  if (message) {
    setError(message);
    return;
  }
  currentStep = Math.min(TOTAL_STEPS, currentStep + 1);
  updateProgress();
}

function goPrev() {
  currentStep = Math.max(1, currentStep - 1);
  updateProgress();
}

function addOptionRow() {
  const row = document.createElement("label");
  row.className = "option-row";
  row.innerHTML = `
    <input data-option-field="name" placeholder="구성 (예: [3종 구성] 닭가슴살 도시락 세트)">
    <input data-option-field="volume" placeholder="내용량 : (예: 닭가슴살 도시락 3종 (각 1팩 / 총 3팩))">
    <input data-option-field="price" placeholder="가격 (예: 14,900원)">
    <button type="button" class="remove-option" aria-label="옵션 삭제">×</button>
  `;
  $("#optionBuilder").appendChild(row);
}

function handleOptionRemove(event) {
  const button = event.target.closest(".remove-option");
  if (!button) return;
  const rows = $$("#optionBuilder .option-row");
  if (rows.length <= 1) {
    rows[0].querySelectorAll("input").forEach((input) => {
      input.value = "";
    });
    return;
  }
  button.closest(".option-row").remove();
}

$("#nextStep")?.addEventListener("click", goNext);
$("#prevStep")?.addEventListener("click", goPrev);
$("#addOption")?.addEventListener("click", addOptionRow);
$("#optionBuilder")?.addEventListener("click", handleOptionRemove);
$("#projectWizard")?.addEventListener("submit", saveProjectForm);

updateProgress();
