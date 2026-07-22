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
  return document.querySelector('input[name="styleTone"]:checked')?.value || "하오 핵심정리형";
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

function updateFileStatus(field) {
  const status = document.querySelector(`[data-file-status="${field.dataset.fileGroup}"]`);
  if (!status) return;
  const files = Array.from(field.files || []);
  if (!files.length) {
    status.textContent = field.dataset.fileGroup === "productImages" ? "여러 장 선택 가능" : "여러 개 선택 가능";
    return;
  }
  const names = files.map((file) => file.name);
  const visibleNames = names.slice(0, 2).join(", ");
  const extraCount = names.length > 2 ? ` 외 ${names.length - 2}개` : "";
  status.textContent = `${names.length}개 선택됨 · ${visibleNames}${extraCount}`;
}

function readProjectList() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_PROJECT_LIST_KEY) || "[]");
  } catch {
    return [];
  }
}

function isValidContactName(name = "") {
  const value = name.trim();
  return value.length >= 2 && /[A-Za-z가-힣]/.test(value) && !/^\d+$/.test(value);
}

function normalizePhone(phone = "") {
  return phone.replace(/[^\d]/g, "");
}

function isValidPhone(phone = "") {
  const digits = normalizePhone(phone);
  return /^0\d{8,10}$/.test(digits);
}

function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function validateStep(step = currentStep) {
  if (step === 1) {
    if (!fieldValue("contactName")) return "이름을 입력해주세요.";
    if (!isValidContactName(fieldValue("contactName"))) return "이름은 한글 또는 영문 2자 이상으로 입력해주세요.";
    if (!fieldValue("contactInfo")) return "연락처를 입력해주세요.";
    if (!isValidPhone(fieldValue("contactInfo"))) return "연락처는 숫자 기준 9~11자리로 입력해주세요. 예: 01012345678";
    if (!fieldValue("email")) return "이메일을 입력해주세요.";
    if (!isValidEmail(fieldValue("email"))) return "이메일 형식에 맞게 입력해주세요. 예: sample@email.com";
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

function categoryPlanningProfile(category = "") {
  const value = String(category);
  if (value.includes("식품") || value.includes("건강")) {
    return {
      market: "섭취 목적과 원료 신뢰를 먼저 확인하는 고객",
      motive: "맛, 원료, 구성, 섭취 편의, 선물 가능성",
      proof: "원료 출처, 제조/위생 관리, 구성량, 섭취 방법",
      visual: "원료 컷, 패키지 구성 컷, 섭취 장면, 선물 연출",
      sections: ["첫 화면 식욕/신뢰 비주얼", "원료와 맛의 차별점", "언제 어떻게 먹는지", "구성/용량/보관 정보", "위생과 제조 신뢰", "구매 혜택과 리뷰"],
    };
  }
  if (value.includes("뷰티") || value.includes("화장")) {
    return {
      market: "피부 고민과 사용감을 꼼꼼히 비교하는 고객",
      motive: "피부 고민 공감, 성분/제형, 사용감, 루틴 적합성",
      proof: "성분 포인트, 사용 전후 기대감, 테스트/인증, 사용 방법",
      visual: "제형 텍스처, 사용 장면, 패키지 컷, 피부 고민 그래픽",
      sections: ["피부 고민 공감 첫 화면", "성분/제형 핵심 포인트", "사용 루틴 제안", "피부 타입별 추천", "품질/테스트 신뢰", "옵션과 리뷰 설득"],
    };
  }
  if (value.includes("생활")) {
    return {
      market: "일상 불편을 빠르게 해결하고 싶은 고객",
      motive: "문제 상황, 해결 방식, 사용 편의, 전후 비교",
      proof: "사용법, 소재/내구성, 관리 방법, 실제 사용 후기",
      visual: "문제 상황 컷, 사용 전후 비교, 디테일 컷, 생활 공간 연출",
      sections: ["불편 상황 제시", "해결 포인트 한눈에 보기", "사용 방법", "디테일/소재 정보", "관리와 내구성", "구매 전 체크리스트"],
    };
  }
  if (value.includes("패션") || value.includes("잡화")) {
    return {
      market: "착용감과 스타일 활용도를 확인하는 고객",
      motive: "핏, 소재, 스타일링, 옵션, 계절/상황 활용",
      proof: "소재 디테일, 사이즈/옵션, 착용 컷, 관리 방법",
      visual: "착용 컷, 룩북 컷, 소재 클로즈업, 컬러 옵션",
      sections: ["스타일 무드 첫 화면", "핏과 소재 차별점", "상황별 스타일링", "컬러/옵션 정보", "사이즈와 관리법", "구매 리뷰와 추천"],
    };
  }
  if (value.includes("전자") || value.includes("디지털")) {
    return {
      market: "기능과 스펙을 비교한 뒤 구매하는 고객",
      motive: "기능, 스펙, 호환성, 사용 편의, 문제 해결",
      proof: "상세 스펙, 사용 시나리오, 비교표, 보증/A/S",
      visual: "제품 정면/측면, 사용 화면, 기능 다이어그램, 비교 표",
      sections: ["핵심 기능 첫 화면", "스펙과 사용 이점", "사용 장면", "비교/호환 정보", "보증과 A/S", "구매 체크 포인트"],
    };
  }
  if (value.includes("유아") || value.includes("키즈")) {
    return {
      market: "안전성과 사용 편의를 중요하게 보는 보호자",
      motive: "안전성, 소재, 사용 연령, 관리 편의, 정서적 안심",
      proof: "인증/검사, 소재 정보, 사용 방법, 보호자 리뷰",
      visual: "사용 연령대 컷, 안전 디테일, 보호자 사용 장면, 구성 컷",
      sections: ["보호자 고민 공감", "안전성과 소재", "아이 사용 장면", "관리/보관 방법", "인증과 신뢰 근거", "선택 전 체크"],
    };
  }
  if (value.includes("반려")) {
    return {
      market: "반려동물의 안전과 반응을 중요하게 보는 보호자",
      motive: "안전성, 기호성/사용 반응, 성분/소재, 관리 편의",
      proof: "성분/소재 정보, 사용 대상, 주의사항, 보호자 리뷰",
      visual: "반려동물 사용 장면, 성분/소재 컷, 전후 비교, 구성 컷",
      sections: ["보호자 고민 제시", "안전한 성분/소재", "사용 반응과 장면", "대상/주의사항", "신뢰 정보", "후기와 구매 옵션"],
    };
  }
  if (value.includes("서비스") || value.includes("교육")) {
    return {
      market: "문제 해결 과정과 결과를 비교하는 고객",
      motive: "문제 정의, 진행 방식, 기대 결과, 전문성, 후기",
      proof: "프로세스, 사례, 전문 인력, 성과 지표, 상담 방식",
      visual: "프로세스 다이어그램, 전후 사례, 상담/교육 장면, 결과 표",
      sections: ["문제 상황 정의", "서비스 해결 방식", "진행 프로세스", "사례와 결과", "전문성 근거", "상담 전환"],
    };
  }
  return {
    market: "제품의 필요성과 차별점을 확인하려는 고객",
    motive: "문제 해결, 핵심 장점, 사용 장면, 신뢰 정보",
    proof: "제품 정보, 사용 방법, 품질 근거, 리뷰",
    visual: "대표 제품 컷, 사용 장면, 디테일 컷, 구성 컷",
    sections: ["첫 화면 메인 비주얼", "고객 고민 공감", "핵심 경쟁력", "사용 방법과 장점", "신뢰 근거", "구매 전환"],
  };
}

function stylePlanningProfile(styleTone = "") {
  const value = String(styleTone);
  if (value.includes("구매전환") || value.includes("세일즈") || value.includes("강조")) {
    return {
      title: "하오 구매전환형",
      copy: "첫 화면부터 선택 이유와 혜택을 빠르게 보여주고, 중반 이후 신뢰 근거로 망설임을 줄입니다.",
      sectionPrefix: "구매를 이끄는",
    };
  }
  if (value.includes("프리미엄") || value.includes("신뢰")) {
    return {
      title: "하오 프리미엄신뢰형",
      copy: "고급스러운 첫인상과 신뢰 근거를 함께 보여주어 제품 가치를 안정적으로 설득합니다.",
      sectionPrefix: "신뢰를 높이는",
    };
  }
  if (value.includes("클린정보") || value.includes("미니멀")) {
    return {
      title: "하오 클린정보형",
      copy: "복잡한 제품 정보, 사용 방법, 구매 판단 요소를 표와 카드 중심으로 깔끔하게 정리합니다.",
      sectionPrefix: "정돈된",
    };
  }
  if (value.includes("리뷰공감")) {
    return {
      title: "하오 리뷰공감형",
      copy: "고객 고민과 후기 키워드를 설득 흐름에 섞어 실제 구매자가 공감할 수 있는 상세페이지로 구성합니다.",
      sectionPrefix: "공감을 만드는",
    };
  }
  if (value.includes("무드스토리") || value.includes("내추럴") || value.includes("감성")) {
    return {
      title: "하오 무드스토리형",
      copy: "브랜드 분위기와 사용 장면을 중심으로 자연스럽게 공감과 구매 욕구를 만듭니다.",
      sectionPrefix: "무드를 만드는",
    };
  }
  if (value.includes("캠페인") || value.includes("트렌디") || value.includes("키치")) {
    return {
      title: "하오 캠페인형",
      copy: "짧고 강한 카피, 리듬감 있는 섹션, 시각적인 포인트로 제품 인상을 빠르게 남깁니다.",
      sectionPrefix: "시선을 잡는",
    };
  }
  if (value.includes("실사용")) {
    return {
      title: "하오 실사용설득형",
      copy: "사용 장면, 구성, 방법을 실제 구매 흐름으로 연결해 고객이 제품을 쓰는 모습을 쉽게 상상하게 만듭니다.",
      sectionPrefix: "사용을 상상하게 하는",
    };
  }
  return {
    title: "하오 핵심정리형",
    copy: "고객이 입력한 정보를 그대로 나열하지 않고, 구매자가 이해하기 쉬운 순서와 문장으로 다시 정리합니다.",
    sectionPrefix: "핵심을 잡아주는",
  };
}

function productPlanningData(data) {
  const categoryProfile = categoryPlanningProfile(data.category);
  const styleProfile = stylePlanningProfile(data.styleTone);
  const productName = shortText(data.productName, "제품");
  const target = shortText(data.targetCustomer, categoryProfile.market);
  const strengthTags = Array.isArray(data.strengthTags) ? data.strengthTags.filter(Boolean) : [];
  const strength = shortText(data.coreStrength, `${strengthTags[0] || "핵심 장점"}을 중심으로 ${productName}만의 구매 이유를 정리합니다.`);
  const hero = shortText(data.heroSentence, `${target}을 위한 ${productName}`);
  const optionLine = optionSummary(data.options);
  return {
    categoryProfile,
    styleProfile,
    productName,
    target,
    strengthTags,
    strength,
    hero,
    optionLine,
  };
}

function developedCopyPlan(data) {
  const plan = productPlanningData(data);
  const productName = plan.productName;
  const target = plan.target;
  const strength = plan.strength;
  const trust = shortText(data.productionTrust, plan.categoryProfile.proof);
  const benefit = shortText(data.purchaseBenefit, "구매 전 망설임을 줄이는 구성과 혜택");
  const review = shortText(data.reviewKeywords, "편안함, 만족감, 재구매 의향");
  return [
    {
      label: "첫 화면 문구",
      copy: `${target}에게 ${productName}을 선택해야 하는 이유를 첫 화면에서 바로 보여줍니다. ${shortText(data.heroSentence, `${productName}의 핵심 가치를 가장 먼저 각인시키는 문장`)}을 메인 카피로 다듬어 구매 기대감을 만듭니다.`,
    },
    {
      label: "구매 설득 문구",
      copy: `${strength} 이 강점을 단순 설명이 아니라 “왜 지금 필요한지”로 풀어내고, 제품의 차별점을 고객의 고민 해결 문장으로 연결합니다.`,
    },
    {
      label: "신뢰 보강 문구",
      copy: `${trust} 이 내용은 상세페이지 중반 이후 신뢰 카드와 근거 섹션으로 정리해, 고객이 구매 전에 확인하고 싶은 불안 요소를 줄이는 방향으로 사용합니다.`,
    },
    {
      label: "전환 마감 문구",
      copy: `${benefit}을 마지막 CTA 앞에 배치하고, 리뷰 키워드 “${review}”를 자연스럽게 섞어 선택을 밀어주는 마감 문구로 구성합니다.`,
    },
  ];
}

function visualGuideItems(data) {
  const plan = productPlanningData(data);
  const productName = plan.productName;
  const styleTitle = plan.styleProfile.title;
  const visualBase = plan.categoryProfile.visual;
  const productFiles = Array.isArray(data.productImages) ? data.productImages : [];
  const referenceFiles = Array.isArray(data.referenceFiles) ? data.referenceFiles : [];
  return [
    {
      title: "대표 비주얼",
      copy: `${productName}의 형태와 패키지가 한눈에 보이는 정면 컷을 크게 사용합니다. ${styleTitle} 분위기에 맞춰 여백, 빛, 배경 톤을 정리합니다.`,
      note: productFiles.length ? `고객 제공 이미지 ${productFiles.length}개 활용` : "제품 사진이 없으면 대표컷 촬영 또는 합성 필요",
    },
    {
      title: "상세 연출 컷",
      copy: `${visualBase}을 중심으로 사용 장면, 구성품, 디테일 컷을 나눠 배치합니다. 고객이 제품을 실제로 쓰는 상황을 상상할 수 있게 만드는 구간입니다.`,
      note: "섹션별로 이미지 역할을 나눠 반복 노출",
    },
    {
      title: "정보 디자인",
      copy: `강점 태그와 옵션 정보를 카드, 배지, 비교표로 정리합니다. 긴 문장은 줄이고 숫자, 구성, 특징이 먼저 보이게 만듭니다.`,
      note: "모바일에서도 읽히는 짧은 정보 블록",
    },
    {
      title: "참고자료 활용",
      copy: referenceFiles.length
        ? `참고 자료 ${referenceFiles.length}개는 톤, 섹션 흐름, 신뢰 근거 배치 기준으로 분석해 새 상세페이지에 맞게 재구성합니다.`
        : "참고 자료가 없으면 카테고리 표준 흐름 기준으로 섹션을 설계합니다.",
      note: "그대로 복사하지 않고 구조와 설득 흐름만 참고",
    },
  ];
}

function resultSectionsFor(data) {
  const plan = productPlanningData(data);
  const tags = plan.strengthTags.length ? plan.strengthTags.join(", ") : plan.categoryProfile.motive;
  return plan.categoryProfile.sections.map((title, index) => {
    const copies = [
      `${plan.productName}의 첫인상을 ${plan.styleProfile.title} 톤으로 잡고, "${plan.hero}" 메시지를 가장 먼저 보여줍니다.`,
      `${plan.target}이 구매 전에 느끼는 고민을 구체화하고, 제품이 필요한 상황을 설명합니다.`,
      `${plan.strength} 선택한 강점(${tags})이 페이지 중반의 설득 근거가 됩니다.`,
      `${plan.categoryProfile.visual}을 활용해 사용 장면과 상세 정보를 한눈에 이해시키는 구간입니다.`,
      `${shortText(data.productionTrust, plan.categoryProfile.proof)} 내용을 바탕으로 신뢰 정보를 정리합니다.`,
      `${plan.optionLine} ${shortText(data.purchaseBenefit, "구매 혜택")}과 ${shortText(data.reviewKeywords, "리뷰 키워드")}를 마지막 전환 구간에 배치합니다.`,
    ];
    return {
      title: `${plan.styleProfile.sectionPrefix} ${title}`,
      copy: copies[index] || `${plan.productName}의 구매 이유를 제품 특성에 맞게 정리합니다.`,
    };
  });
}

function optionSummary(options = []) {
  if (!options.length) return "옵션 정보가 없으면 대표 구성과 가격 제안을 별도 확인합니다.";
  return options.map((item) => [item.name, item.volume, item.price].filter(Boolean).join(" · ")).join("\n");
}

function renderResultPlan(data) {
  const plan = productPlanningData(data);
  $("#resultProductName").textContent = plan.productName;
  $("#resultMeta").textContent = `${shortText(data.clientName || data.companyName, "브랜드")} · ${shortText(data.category, "카테고리")} · ${plan.styleProfile.title}`;
  $("#resultHeroSentence").textContent = `${plan.hero}\n${plan.styleProfile.copy}`;
  $("#resultTarget").textContent = `${plan.target}\n구매 동기: ${plan.categoryProfile.motive}`;
  $("#resultTone").textContent = `${plan.styleProfile.title} · ${plan.styleProfile.copy}`;
  $("#resultHeadline").textContent = plan.hero;
  $("#resultStrength").textContent = `${plan.strength}\n강조 태그: ${plan.strengthTags.join(", ") || plan.categoryProfile.motive}`;
  $("#resultTrust").textContent = shortText(data.productionTrust, plan.categoryProfile.proof);
  $("#resultBenefit").textContent = shortText(data.purchaseBenefit, "구매 혜택이 없다면 구성/가격/사용 편의성을 CTA 근거로 사용합니다.");
  $("#resultReview").textContent = shortText(data.reviewKeywords, "실제 리뷰에서는 만족 포인트, 재구매 이유, 사용감 표현을 우선 수집합니다.");
  $("#resultOptions").textContent = plan.optionLine;
  $("#resultDevelopedCopy").innerHTML = developedCopyPlan(data).map((item) => `
    <article>
      <b>${escapeHtml(item.label)}</b>
      <p>${escapeHtml(item.copy)}</p>
    </article>
  `).join("");
  $("#resultVisualGuide").innerHTML = visualGuideItems(data).map((item) => `
    <article>
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.copy)}</p>
      <small>${escapeHtml(item.note)}</small>
    </article>
  `).join("");
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
$$("[data-file-group]").forEach((field) => {
  updateFileStatus(field);
  field.addEventListener("change", () => updateFileStatus(field));
});

updateProgress();
