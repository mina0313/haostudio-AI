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
  return document.querySelector('input[name="styleTone"]:checked')?.value || "핵심정리형";
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
  data.references = [data.seoKeyword, data.referenceUrls].filter(Boolean).join("\n");
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
      title: "구매전환형",
      copy: "첫 화면부터 선택 이유와 혜택을 빠르게 보여주고, 중반 이후 신뢰 근거로 망설임을 줄입니다.",
      sectionPrefix: "구매를 이끄는",
    };
  }
  if (value.includes("프리미엄") || value.includes("신뢰")) {
    return {
      title: "프리미엄신뢰형",
      copy: "고급스러운 첫인상과 신뢰 근거를 함께 보여주어 제품 가치를 안정적으로 설득합니다.",
      sectionPrefix: "신뢰를 높이는",
    };
  }
  if (value.includes("클린정보") || value.includes("미니멀")) {
    return {
      title: "클린정보형",
      copy: "복잡한 제품 정보, 사용 방법, 구매 판단 요소를 표와 카드 중심으로 깔끔하게 정리합니다.",
      sectionPrefix: "정돈된",
    };
  }
  if (value.includes("리뷰공감")) {
    return {
      title: "리뷰공감형",
      copy: "고객 고민과 후기 키워드를 설득 흐름에 섞어 실제 구매자가 공감할 수 있는 상세페이지로 구성합니다.",
      sectionPrefix: "공감을 만드는",
    };
  }
  if (value.includes("무드스토리") || value.includes("내추럴") || value.includes("감성")) {
    return {
      title: "무드스토리형",
      copy: "브랜드 분위기와 사용 장면을 중심으로 자연스럽게 공감과 구매 욕구를 만듭니다.",
      sectionPrefix: "무드를 만드는",
    };
  }
  if (value.includes("캠페인") || value.includes("트렌디") || value.includes("키치")) {
    return {
      title: "캠페인형",
      copy: "짧고 강한 카피, 리듬감 있는 섹션, 시각적인 포인트로 제품 인상을 빠르게 남깁니다.",
      sectionPrefix: "시선을 잡는",
    };
  }
  if (value.includes("실사용")) {
    return {
      title: "실사용설득형",
      copy: "사용 장면, 구성, 방법을 실제 구매 흐름으로 연결해 고객이 제품을 쓰는 모습을 쉽게 상상하게 만듭니다.",
      sectionPrefix: "사용을 상상하게 하는",
    };
  }
  return {
    title: "핵심정리형",
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
  const toneGuide = styleManuscriptGuide(plan.styleProfile);
  return [
    {
      label: "첫 화면 문구",
      copy: `${target}에게 ${productName}을 선택해야 하는 이유를 첫 화면에서 바로 보여줍니다. ${shortText(data.heroSentence, `${productName}의 핵심 가치를 가장 먼저 각인시키는 문장`)}을 ${toneGuide.hero} 방향으로 다듬습니다.`,
    },
    {
      label: "구매 설득 문구",
      copy: `${strength} 이 강점을 단순 설명이 아니라 ${toneGuide.point} 방식으로 풀어내고, 제품의 차별점을 고객의 고민 해결 문장으로 연결합니다.`,
    },
    {
      label: "신뢰 보강 문구",
      copy: `${trust} 이 내용은 ${toneGuide.trust} 흐름으로 정리해, 고객이 구매 전에 확인하고 싶은 불안 요소를 줄이는 방향으로 사용합니다.`,
    },
    {
      label: "전환 마감 문구",
      copy: `${benefit}을 마지막 CTA 앞에 배치하고, 리뷰 키워드 “${review}”를 ${toneGuide.closing} 톤으로 섞어 마감 문구로 구성합니다.`,
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
  const referenceUrls = referenceUrlList(data);
  const referenceCount = referenceFiles.length + referenceUrls.length;
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
      copy: referenceCount
        ? `첨부 자료와 타사 레퍼런스 ${referenceCount}개는 톤, 섹션 흐름, 신뢰 근거 배치 기준으로 분석해 새 상세페이지에 맞게 재구성합니다.`
        : "참고 자료가 없으면 카테고리 표준 흐름 기준으로 섹션을 설계합니다.",
      note: "그대로 복사하지 않고 구조와 설득 흐름만 참고",
    },
  ];
}

function referenceUrlList(data) {
  return String(data.referenceUrls || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pointList(items = [], fallback = []) {
  return (items.length ? items : fallback).slice(0, 5);
}

function categoryUseNoun(category = "") {
  const value = String(category);
  if (value.includes("식품") || value.includes("푸드")) return "먹는 순간";
  if (value.includes("뷰티") || value.includes("화장")) return "바르는 순간";
  if (value.includes("패션") || value.includes("의류")) return "착용하는 순간";
  if (value.includes("생활") || value.includes("홈")) return "사용하는 순간";
  if (value.includes("디지털") || value.includes("가전")) return "켜는 순간";
  if (value.includes("서비스") || value.includes("교육")) return "경험하는 순간";
  return "사용하는 순간";
}

function pointCopyFor(item, index, data, plan, toneGuide) {
  const productName = plan.productName;
  const target = plan.target;
  const useNoun = categoryUseNoun(data.category);
  const trust = shortText(data.productionTrust, plan.categoryProfile.proof);
  const normalized = String(item);
  const titleTemplates = {
    "가격/가성비": [`부담은 낮추고 만족은 높인 ${productName}`, `가격 대비 체감 가치가 분명한 구성`],
    "원재료/성분": [`좋은 기준으로 고른 핵심 원료와 성분`, `${target}을 위해 엄선한 성분 설계`],
    "기능/효과": [`필요한 순간 바로 느끼는 핵심 기능`, `${productName}의 차이를 만드는 기능 포인트`],
    "안전성/인증": [`안심하고 선택할 수 있는 검증 기준`, `믿고 사용할 수 있도록 준비한 신뢰 근거`],
    "후기/리뷰": [`먼저 경험한 고객이 말하는 만족 포인트`, `리뷰로 확인되는 ${productName}의 장점`],
    "선물용": [`받는 사람까지 생각한 선물 구성`, `마음을 전하기 좋은 완성도 있는 패키지`],
    "사용방법": [`처음 써도 쉬운 간편한 사용 흐름`, `${useNoun} 바로 이해되는 쉬운 사용법`],
    "브랜드 스토리": [`브랜드의 기준이 담긴 ${productName}`, `제품 너머의 이야기를 전하는 브랜드 무드`],
    "A/S/고객지원": [`구매 후까지 이어지는 든든한 케어`, `문의와 관리까지 생각한 고객 지원`],
  };
  const titles = titleTemplates[normalized] || [`${productName}을 선택하게 만드는 ${normalized}`, `${target}에게 필요한 ${normalized}`];
  const title = titles[index % titles.length];

  const bodyTemplates = {
    "가격/가성비": `${productName}은 필요한 구성과 체감 만족도를 균형 있게 담아, 처음 구매하는 고객도 부담 없이 선택할 수 있게 설계합니다.`,
    "원재료/성분": `${productName}의 핵심 원료와 성분을 고객이 이해하기 쉬운 언어로 풀어, 왜 이 구성이 필요한지 자연스럽게 설득합니다.`,
    "기능/효과": `${target}이 기대하는 변화를 중심으로 기능을 설명하고, ${useNoun} 느낄 수 있는 차이를 구체적인 장면으로 보여줍니다.`,
    "안전성/인증": `${trust} 내용을 바탕으로 제조, 검수, 인증 정보를 정리해 구매 전 불안감을 줄이고 신뢰를 높입니다.`,
    "후기/리뷰": `실제 리뷰에서 나올 법한 만족 이유를 중심으로 ${productName}의 장점을 다시 보여주고, 재구매와 추천 포인트로 연결합니다.`,
    "선물용": `구성, 패키지, 전달 순간까지 함께 보여주어 ${productName}이 실사용은 물론 선물용으로도 어울린다는 인상을 만듭니다.`,
    "사용방법": `복잡한 설명보다 순서와 상황을 먼저 보여주어, 고객이 ${productName}을 어떻게 쓰면 좋은지 바로 이해하게 만듭니다.`,
    "브랜드 스토리": `브랜드가 이 제품을 준비한 이유와 고객에게 전하고 싶은 가치를 담아, 단순 상품 소개를 넘어 기억에 남는 선택 이유를 만듭니다.`,
    "A/S/고객지원": `구매 이후 문의, 관리, 안내까지 이어지는 흐름을 보여주어 처음 선택하는 고객도 편안하게 구매할 수 있게 합니다.`,
  };
  const copy = bodyTemplates[normalized] || `${normalized}을 ${toneGuide.point}하는 방향으로 풀어내어, ${productName}이 ${target}에게 왜 필요한지 자연스럽게 설명합니다.`;

  const visualTemplates = {
    "가격/가성비": "구성품과 가격 혜택이 한눈에 보이는 비교표나 패키지 전체 컷을 추천합니다.",
    "원재료/성분": "원료, 성분, 소재를 감각적인 그래픽이나 확대 컷으로 시각화합니다.",
    "기능/효과": "사용 전후, 기능 흐름, 핵심 효과를 아이콘 카드나 단계 이미지로 보여줍니다.",
    "안전성/인증": "인증 마크, 테스트 결과, 제조 과정 이미지를 차분한 정보 카드로 정리합니다.",
    "후기/리뷰": "리뷰 키워드, 별점, 실제 사용 장면을 함께 배치해 공감을 만듭니다.",
    "선물용": "선물 패키지, 포장 디테일, 전달 장면을 따뜻한 톤으로 연출합니다.",
    "사용방법": "손동작, 단계별 사용 컷, 체크리스트를 순서대로 배치합니다.",
    "브랜드 스토리": "브랜드 무드 컷, 제작 과정, 메시지 카드를 함께 구성합니다.",
    "A/S/고객지원": "상담, 안내, 보증 흐름을 간단한 프로세스 그래픽으로 보여줍니다.",
  };
  const visual = visualTemplates[normalized] || `${plan.categoryProfile.visual}을 활용해 ${normalized}이 직관적으로 보이는 장면을 추천합니다.`;

  return {
    label: `key point${index + 1}`,
    title,
    copy,
    visual,
  };
}

function usageProposal(data, plan, toneGuide) {
  const productName = plan.productName;
  const value = String(data.category);
  if (value.includes("뷰티") || value.includes("화장")) {
    return `STEP 1. 사용 전 피부 상태를 정돈합니다.\nSTEP 2. ${productName}을 적당량 덜어 고민 부위에 부드럽게 펴 바릅니다.\nSTEP 3. ${toneGuide.usage}하는 장면을 전후 컷이나 루틴 이미지로 보여줍니다.`;
  }
  if (value.includes("식품") || value.includes("푸드")) {
    return `STEP 1. ${productName}을 즐기기 좋은 시간과 상황을 제안합니다.\nSTEP 2. 기본 섭취법과 함께 곁들이면 좋은 레시피를 보여줍니다.\nSTEP 3. 보관 방법과 구성 정보를 함께 배치해 구매 전 궁금증을 줄입니다.`;
  }
  if (value.includes("패션") || value.includes("의류")) {
    return `STEP 1. 대표 착용 컷으로 핏과 분위기를 먼저 보여줍니다.\nSTEP 2. 일상, 출근, 외출 등 상황별 스타일링을 제안합니다.\nSTEP 3. 소재감과 관리법을 함께 안내해 구매 후 만족도를 높입니다.`;
  }
  if (value.includes("서비스") || value.includes("교육")) {
    return `STEP 1. 고객이 겪는 문제 상황을 먼저 정리합니다.\nSTEP 2. 진행 과정과 결과물을 단계별로 보여줍니다.\nSTEP 3. 상담, 신청, 이용 흐름을 한눈에 이해할 수 있게 구성합니다.`;
  }
  return `STEP 1. ${productName}을 사용하는 대표 상황을 보여줍니다.\nSTEP 2. 사용 방법과 구성품을 순서대로 안내합니다.\nSTEP 3. ${toneGuide.usage}하는 이미지나 짧은 체크리스트로 마무리합니다.`;
}

function linkedSuggestion(kind, data, plan, toneGuide) {
  const productName = plan.productName;
  if (kind === "story") return `${shortText(data.heroSentence, productName)} 문장을 브랜드가 제품을 만든 이유와 연결해 첫 화면 이후의 스토리 카피로 확장합니다.`;
  if (kind === "empathy") return `${shortText(data.coreStrength, plan.strength)} 내용을 고객 고민 해결 문장으로 바꾸고, 구매자가 “내 얘기다”라고 느끼는 흐름을 만듭니다.`;
  if (kind === "usage") return usageProposal(data, plan, toneGuide);
  if (kind === "trust") return `고객이 입력한 제조/인증 내용을 인증서, 공정 이미지, 기관 로고, 체크리스트 형태로 나눠 시각적인 신뢰도로 높입니다.`;
  if (kind === "purchase") return `혜택은 CTA 직전에 배치하고, 리뷰 키워드는 후기 섹션의 제목과 말풍선 카피로 바꿔 구매 결정을 밀어줍니다.`;
  if (kind === "price") return `옵션명, 용량, 가격을 표로 정리하고 대표 추천 구성을 따로 강조하면 선택이 쉬워집니다.`;
  if (kind === "delivery") return `배송, 포장, 보관, 사용 전 주의사항을 아이콘형 안내 카드로 정리해 반복 문의를 줄입니다.`;
  if (kind === "faq") return `고객 입력값에서 가장 많이 물어볼 내용을 뽑아 추천 대상, 구성/가격, 사용법, 보관법, 인증 여부 순서로 FAQ를 구성합니다.`;
  return `${productName}에 맞춰 고객 입력 내용을 상세페이지 문장으로 자연스럽게 다듬습니다.`;
}

function styleManuscriptGuide(styleProfile) {
  const title = styleProfile.title;
  if (title === "구매전환형") {
    return {
      hero: "혜택과 선택 이유가 즉시 보이는 직관적인 세일즈 카피",
      story: "긴 서사보다 제품이 필요한 이유를 빠르게 제시",
      empathy: "고민, 해결, 구매 행동으로 바로 이어지는 흐름",
      point: "숫자, 비교, 혜택이 먼저 보이게 압축",
      usage: "구매 후 바로 쓰는 장면을 짧게 제안",
      trust: "망설임을 줄이는 근거와 보장 정보 중심",
      closing: "지금 선택해야 하는 이유가 분명한",
    };
  }
  if (title === "프리미엄신뢰형") {
    return {
      hero: "고급감과 신뢰가 먼저 느껴지는 절제된 카피",
      story: "브랜드의 기준, 품질 철학, 세심함을 강조",
      empathy: "고객의 까다로운 선택 기준을 존중하는 흐름",
      point: "품질, 소재, 과정, 완성도를 근거 있게 설명",
      usage: "격식 있는 사용 장면과 선물 가치를 함께 제안",
      trust: "인증, 제조 과정, 검수 기준을 차분하게 축적",
      closing: "품질에 대한 확신을 남기는",
    };
  }
  if (title === "클린정보형") {
    return {
      hero: "제품 정보가 한눈에 읽히는 명료한 카피",
      story: "불필요한 수식보다 핵심 정보와 개발 배경을 정리",
      empathy: "구매 전 궁금증을 순서대로 해소하는 흐름",
      point: "기능, 구성, 사용법을 표와 짧은 문장으로 정돈",
      usage: "상황별 사용법을 단계별로 제안",
      trust: "확인해야 할 정보를 빠짐없이 보여주는 구조",
      closing: "정보 확인 후 자연스럽게 선택하게 하는",
    };
  }
  if (title === "리뷰공감형") {
    return {
      hero: "실제 고객 반응처럼 공감되는 생활형 카피",
      story: "고객의 불편과 만족 경험을 중심으로 전개",
      empathy: "후기에서 나올 법한 고민과 감정을 먼저 짚는 흐름",
      point: "사용 후 달라지는 만족 포인트로 설명",
      usage: "일상 속 사용 장면과 재구매 이유를 제안",
      trust: "리뷰 키워드와 객관 근거를 함께 배치",
      closing: "나도 써보고 싶게 만드는",
    };
  }
  if (title === "무드스토리형") {
    return {
      hero: "브랜드 분위기와 사용 장면이 그려지는 감성 카피",
      story: "제품이 놓이는 순간과 브랜드 감도를 중심으로 전개",
      empathy: "고객의 취향, 루틴, 기분에 맞춰 공감시키는 흐름",
      point: "기능을 감각적인 경험 언어로 풀어내는 방식",
      usage: "하루의 장면이나 루틴 안에서 자연스럽게 제안",
      trust: "부드러운 문장 속에 필요한 근거를 섞는 구조",
      closing: "소장하고 싶은 분위기를 남기는",
    };
  }
  if (title === "캠페인형") {
    return {
      hero: "짧고 선명한 훅으로 시선을 잡는 카피",
      story: "브랜드 메시지를 캠페인 문장처럼 강하게 제시",
      empathy: "고객의 상황을 리듬감 있게 건드리는 흐름",
      point: "한 줄 헤드라인과 강한 키워드로 반복 각인",
      usage: "SNS에 남기기 좋은 장면 중심으로 제안",
      trust: "핵심 근거를 짧은 카드로 빠르게 전달",
      closing: "기억에 남는 한 문장으로 끝나는",
    };
  }
  if (title === "실사용설득형") {
    return {
      hero: "사용 장면이 바로 떠오르는 현실적인 카피",
      story: "제품을 쓰는 순간의 편리함과 변화를 중심으로 전개",
      empathy: "실제 사용 전후의 차이를 보여주는 흐름",
      point: "활용법, 구성, 반복 사용 이유를 구체적으로 설명",
      usage: "상황별 사용법과 팁을 풍부하게 제안",
      trust: "실사용 기준의 체크 포인트로 정리",
      closing: "생활 속 필요성을 다시 확인시키는",
    };
  }
  return {
    hero: "핵심 가치가 쉽게 이해되는 균형 잡힌 카피",
    story: "브랜드와 제품의 핵심을 안정적으로 정리",
    empathy: "고객 고민과 해결책을 자연스럽게 연결하는 흐름",
    point: "장점과 근거를 읽기 쉽게 정리",
    usage: "대표 사용 장면을 중심으로 제안",
    trust: "필요한 신뢰 정보를 차분하게 배치",
    closing: "구매 이유를 다시 정리하는",
  };
}

function resultSectionsFor(data) {
  const plan = productPlanningData(data);
  const productName = plan.productName;
  const brandName = shortText(data.clientName || data.companyName, "브랜드");
  const target = plan.target;
  const strengthPoints = pointList(plan.strengthTags, ["차별화 포인트", "사용 편의성", "구성 만족도", "신뢰 근거", "구매 혜택"]);
  const referenceUrls = referenceUrlList(data);
  const priceGuide = optionSummary(data.options);
  const toneGuide = styleManuscriptGuide(plan.styleProfile);
  const keyPoints = strengthPoints.map((item, index) => pointCopyFor(item, index, data, plan, toneGuide));

  return [
    {
      title: "브랜드 스토리",
      copy: `${brandName}가 ${productName}을 만들게 된 이유와 고객에게 전하고 싶은 가치를 ${toneGuide.story} 방식으로 정리합니다. 제품 소개보다 먼저 브랜드의 태도와 약속이 느껴지게 구성합니다.`,
      suggestion: linkedSuggestion("story", data, plan, toneGuide),
    },
    {
      title: "고객 공감과 해결",
      copy: `${target}이 구매 전에 느끼는 고민을 먼저 짚습니다.\n${shortText(data.coreStrength, `${productName}이 그 불편함을 어떻게 해결하는지 ${toneGuide.empathy}으로 풀어냅니다.`)}`,
      suggestion: linkedSuggestion("empathy", data, plan, toneGuide),
    },
    {
      title: "핵심 특장점 5",
      copy: "고객이 선택한 강점을 상세페이지용 핵심 카피로 자연스럽게 확장합니다.",
      points: keyPoints,
    },
    {
      title: "활용 및 레시피",
      copy: usageProposal(data, plan, toneGuide),
      suggestion: linkedSuggestion("usage", data, plan, toneGuide),
    },
    {
      title: "신뢰와 인증",
      copy: shortText(data.productionTrust, `${plan.categoryProfile.proof} 내용을 ${toneGuide.trust}로 정리합니다.`),
      suggestion: linkedSuggestion("trust", data, plan, toneGuide),
    },
    {
      title: "구매 포인트와 리뷰 가이드",
      copy: `구매 포인트: ${shortText(data.purchaseBenefit, "구성, 혜택, 사용 편의성, 선물성, 가격 만족도를 CTA 앞에 배치합니다.")}\n리뷰 가이드: ${shortText(data.reviewKeywords, "만족감, 재구매 이유, 사용감, 배송 만족도, 선물 반응을 리뷰 키워드로 수집합니다.")}\n마감 톤: ${toneGuide.closing} 흐름으로 정리합니다.`,
      suggestion: linkedSuggestion("purchase", data, plan, toneGuide),
    },
    {
      title: "가격표",
      copy: priceGuide,
      suggestion: linkedSuggestion("price", data, plan, toneGuide),
    },
    {
      title: "배송 및 보관 안내",
      copy: `${productName}의 배송 방식, 포장 상태, 보관 방법, 사용 전 확인 사항을 하단 정보 영역에 정리합니다. 고객 문의가 줄어들도록 짧은 표와 주의 문구로 구성합니다.`,
      suggestion: linkedSuggestion("delivery", data, plan, toneGuide),
    },
    {
      title: "FAQ",
      copy: `Q1. 어떤 고객에게 추천하나요?\n${target}에게 추천합니다.\n\nQ2. 구성과 가격은 어떻게 되나요?\n${priceGuide}\n\nQ3. 참고한 레퍼런스가 있나요?\n${referenceUrls.length ? referenceUrls.join("\n") : "입력된 타사 레퍼런스 URL이 있으면 톤과 흐름만 참고합니다."}`,
      suggestion: linkedSuggestion("faq", data, plan, toneGuide),
    },
  ];
}

function optionSummary(options = []) {
  if (!options.length) return "옵션 정보가 없으면 대표 구성과 가격 제안을 별도 확인합니다.";
  return options.map((item) => [item.name, item.volume, item.price].filter(Boolean).join(" · ")).join("\n");
}

function renderSectionDetail(section) {
  if (Array.isArray(section.points) && section.points.length) {
    return `
      <p>${escapeHtml(section.copy)}</p>
      <div class="result-keypoint-list">
        ${section.points.map((point) => `
          <article class="result-keypoint">
            <em>${escapeHtml(point.label)}</em>
            <strong>${escapeHtml(point.title)}</strong>
            <p>${escapeHtml(point.copy)}</p>
            <div>
              <b>추천 비주얼 무드</b>
              <small>${escapeHtml(point.visual)}</small>
            </div>
          </article>
        `).join("")}
      </div>
    `;
  }
  return `
    <p>${escapeHtml(section.copy)}</p>
    ${section.suggestion ? `
      <aside class="result-linked-suggestion">
        <b>· 제안</b>
        <small>${escapeHtml(section.suggestion)}</small>
      </aside>
    ` : ""}
  `;
}

function renderLinkedPoint(value, fallback, suggestion) {
  return `
    <p>${escapeHtml(shortText(value, fallback))}</p>
    <aside class="result-linked-suggestion">
      <b>· 제안</b>
      <small>${escapeHtml(suggestion)}</small>
    </aside>
  `;
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
  const toneGuide = styleManuscriptGuide(plan.styleProfile);
  $("#resultTrust").innerHTML = renderLinkedPoint(data.productionTrust, plan.categoryProfile.proof, linkedSuggestion("trust", data, plan, toneGuide));
  $("#resultBenefit").innerHTML = renderLinkedPoint(data.purchaseBenefit, "구매 혜택이 없다면 구성/가격/사용 편의성을 CTA 근거로 사용합니다.", linkedSuggestion("purchase", data, plan, toneGuide));
  $("#resultReview").innerHTML = renderLinkedPoint(data.reviewKeywords, "실제 리뷰에서는 만족 포인트, 재구매 이유, 사용감 표현을 우선 수집합니다.", "고객이 남길 만한 표현을 리뷰 제목, 후기 말풍선, 구매 후 만족 포인트로 나눠 보여줍니다.");
  $("#resultOptions").innerHTML = renderLinkedPoint(plan.optionLine, "옵션 정보가 정리됩니다.", linkedSuggestion("price", data, plan, toneGuide));
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
        ${renderSectionDetail(section)}
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
