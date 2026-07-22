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
