const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const LEADS_KEY = "detailAiLeads";
const PROJECTS_KEY = "detailAiProjects";
const AI_SETTINGS_KEY = "detailAiSettings";
const AI_WORKFLOW_KEY = "detailAiWorkflowRuns";
const CUSTOMER_PROJECT_KEY = "customerProjectInput";
const CUSTOMER_PROJECT_LIST_KEY = "customerProjectList";
let manualTemplateChanged = false;
let activeSectionDraft = "A";
let activeSectionIndex = 0;
let sectionEdits = { A: [], B: [] };
let sectionOrders = { A: [], B: [] };
let currentDesignWorkflow = null;
const SECTION_VARIANT_LABELS = {
  auto: "자동 디자인",
  "premium-card": "프리미엄 카드형",
  "graphic-badge": "그래픽 배지형",
  editorial: "브랜드 에디토리얼형",
  "photo-focus": "제품 사진 강조형",
};
const SECTION_VARIANT_BADGES = {
  auto: "Auto Design",
  "premium-card": "Premium Card",
  "graphic-badge": "Graphic Commerce",
  editorial: "Editorial Story",
  "photo-focus": "Photo Focus",
};
const AI_SERVICE_ROLES = {
  planning: {
    label: "AI 기획 생성",
    defaultProvider: "openai",
    preferredModel: "chatgpt",
    purpose: "제품 분석, 타깃 분석, 상세페이지 섹션 구성, 카피 방향 생성",
  },
  draftSummary: {
    label: "A/B 시안 요약",
    defaultProvider: "openai",
    preferredModel: "chatgpt",
    purpose: "A/B 상세페이지 시안의 고객용 비교 요약 생성",
  },
  designWorkflow: {
    label: "AI 디자인 워크플로우",
    defaultProvider: "local-design",
    preferredModel: "orchestrator",
    purpose: "상품 분석, 디자인 결정, A/B 전략, 이미지 생성 프롬프트, 품질 기준을 하나의 프로젝트 산출물로 연결",
  },
  imageDesign: {
    label: "이미지/디자인 시안 생성",
    defaultProvider: "rules",
    preferredModel: "image-ai",
    purpose: "제품 이미지 역할 분리, 상세페이지 디자인 블록, 이미지 합성/촬영 방향 생성",
  },
  qualityReview: {
    label: "디자인 품질 검수",
    defaultProvider: "rules",
    preferredModel: "claude",
    purpose: "누락 요소, 표현 리스크, 정보 위계, 디자인 완성도 검토",
  },
  clientMail: {
    label: "고객 발송 메일",
    defaultProvider: "openai",
    preferredModel: "chatgpt",
    purpose: "A/B 시안 전달 메일 생성",
  },
  revision: {
    label: "고객 피드백 반영",
    defaultProvider: "openai",
    preferredModel: "chatgpt",
    purpose: "고객 회신 기반 수정 시안과 컨펌 방향 생성",
  },
  psdHandoff: {
    label: "PSD 작업 지시",
    defaultProvider: "openai",
    preferredModel: "chatgpt",
    purpose: "미얀마 디자이너용 바이버 전달 패키지 생성",
  },
  finalMail: {
    label: "최종 납품 메일",
    defaultProvider: "openai",
    preferredModel: "chatgpt",
    purpose: "PNG/JPG, 분할페이지, PSD 원본 추가금 안내 메일 생성",
  },
};
const AI_PROVIDERS = {
  openai: {
    label: "OpenAI / ChatGPT",
    status: "active",
    run: runOpenAiProvider,
  },
  claude: {
    label: "Claude",
    status: "planned",
    run: runUnavailableProvider,
  },
  "image-ai": {
    label: "Image Generation AI",
    status: "planned",
    run: runUnavailableProvider,
  },
  "local-design": {
    label: "Local Detail Design Engine",
    status: "active",
    run: runLocalDesignProvider,
  },
  rules: {
    label: "Local Rules",
    status: "active",
    run: runRulesProvider,
  },
};
const AI_ROLE_PROVIDER_MAP = {
  planning: "openai",
  draftSummary: "openai",
  designWorkflow: "local-design",
  imageDesign: "local-design",
  qualityReview: "claude",
  clientMail: "openai",
  revision: "openai",
  psdHandoff: "openai",
  finalMail: "openai",
};
const DETAIL_DESIGN_QUALITY_GATES = [
  {
    label: "긴 세로형 상세 구조",
    signal: "긴 세로형 상세페이지 구조 적용",
    check: (html) => html.includes("sales-detail-page") && (html.match(/sales-.*-section/g)?.length || 0) >= 7,
  },
  {
    label: "히어로 제품 연출",
    signal: "히어로 첫 화면에 제품 판단 카드/제품 쇼케이스 적용",
    check: (html) => html.includes("sales-hero-product-rail") && html.includes("sales-hero-editorial-board"),
  },
  {
    label: "히어로 광고 스테이지",
    signal: "히어로 제품 광고 스테이지/입체 합성 레이어 적용",
    check: (html) => html.includes("sales-hero-ad-stage") && html.includes("sales-hero-ad-caption"),
  },
  {
    label: "첫 화면 시그니처 디자인",
    signal: "브랜드 시그니처 라벨/스팟라이트/첫 화면 디자인 장치 적용",
    check: (html) => html.includes("sales-hero-backdrop-label") && html.includes("sales-hero-signature-strip") && html.includes("sales-hero-spotlight-notes"),
  },
  {
    label: "광고형 첫 화면 메시지",
    signal: "첫 화면에 쇼핑몰 광고형 메시지 스택 적용",
    check: (html) => html.includes("sales-ad-claim-stack"),
  },
  {
    label: "고밀도 광고형 상세 패널",
    signal: "제품 이미지와 구매 포인트를 묶은 고밀도 광고형 패널 적용",
    check: (html) => html.includes("sales-advertorial-spread") && html.includes("sales-advertorial-proof"),
  },
  {
    label: "상세 흐름 인덱스",
    signal: "첫 화면 이후 구매/브랜드 흐름 인덱스 적용",
    check: (html) => html.includes("sales-shop-index-strip"),
  },
  {
    label: "에디토리얼 이미지 스토리",
    signal: "제품 사진 기반 에디토리얼 보드/포스터 보드 적용",
    check: (html) => html.includes("sales-editorial-image-story"),
  },
  {
    label: "중간 설득 흐름 연결",
    signal: "중간 스크롤 구간에 설득 흐름 연결 패널 적용",
    check: (html) => html.includes("sales-narrative-bridge"),
  },
  {
    label: "상세 레퍼런스 흐름 보드",
    signal: "기존 상세페이지 섹션 이미지를 활용한 상세 흐름 보드 적용",
    check: (html) => html.includes("sales-reference-remix-board"),
  },
  {
    label: "긴 스크롤 상세 미리보기",
    signal: "실제 긴 상세페이지 스크롤 흐름 미리보기 적용",
    check: (html) => html.includes("sales-long-scroll-preview"),
  },
  {
    label: "섹션별 디자인 리본",
    signal: "원료/장점/신뢰 섹션별 디자인 리본 적용",
    check: (html) => html.includes("sales-section-ribbon-story") && html.includes("sales-section-ribbon-benefit") && html.includes("sales-section-ribbon-trust"),
  },
  {
    label: "원료/구성 시각화 맵",
    signal: "원료/구성 시각화 맵 적용",
    check: (html) => html.includes("sales-ingredient-visual-map"),
  },
  {
    label: "상품 장점 포스터 보드",
    signal: "핵심 장점 포스터 보드 적용",
    check: (html) => html.includes("sales-feature-poster-board"),
  },
  {
    label: "제품 광고형 스프레드",
    signal: "중간 섹션에 제품 중심 광고형 스프레드 적용",
    check: (html) => html.includes("sales-detail-ad-spread"),
  },
  {
    label: "구매 비교/언박싱 정보 디자인",
    signal: "구매 비교표와 언박싱 구성 패널 적용",
    check: (html) => html.includes("sales-commerce-comparison-band") && html.includes("sales-package-unboxing"),
  },
  {
    label: "쇼핑몰식 최종 CTA",
    signal: "최종 CTA에 쇼핑몰식 구매 확인 패널 적용",
    check: (html) => html.includes("sales-retail-closing-panel") && html.includes("sales-checkout-offer"),
  },
  {
    label: "신뢰/정보 검수 영역",
    signal: "리뷰형 신뢰 카드와 신뢰/정보 검수 패널 적용",
    check: (html) => html.includes("sales-trust-document-panel") && html.includes("sales-info-visual-panel") && html.includes("sales-trust-commerce-panel") && html.includes("sales-review-style-proof"),
  },
  {
    label: "최종 구매 판단 영수증",
    signal: "최종 구매 체크 영수증 적용",
    check: (html) => html.includes("sales-retail-decision-receipt"),
  },
  {
    label: "최종 마감 구매 보드",
    signal: "최종 구매/선물 판단을 묶는 마감 보드 적용",
    check: (html) => html.includes("sales-final-conversion-deck"),
  },
  {
    label: "최종 카탈로그형 확인 패널",
    signal: "최종 CTA 앞에 구매/선물 확인 카탈로그 패널 적용",
    check: (html) => html.includes("sales-final-catalog-panel"),
  },
  {
    label: "A/B 컨셉 차별화",
    signal: "A/B 컨셉 차이 유지",
    check: (html) => html.includes("sales-premium") && html.includes("sales-conversion"),
  },
];
const TEMPLATE_MIX_QUALITY_GATES = [
  {
    label: "고객용 템플릿 믹스 구조",
    check: (html) => html.includes("sales-template-mix-page") && html.includes("template-mix-hero") && html.includes("template-mix-final"),
  },
  {
    label: "상세페이지 흐름 레일",
    check: (html) => html.includes("template-mix-section-rail"),
  },
  {
    label: "섹션 번호 흐름 디자인",
    check: (html) => html.includes("template-mix-section-rail") && html.includes("template-mix-product-strip") && html.includes("template-mix-reference-flow"),
  },
  {
    label: "A/B 긴 상세 비교 구조",
    check: (html) => html.includes("is-premium") && html.includes("is-conversion") && (html.match(/sales-template-mix-page/g)?.length || 0) >= 2,
  },
  {
    label: "첫 화면 제품/카피 구성",
    check: (html) => html.includes("template-mix-copy") && html.includes("template-mix-product") && html.includes("template-mix-mini-cards"),
  },
  {
    label: "광고형 캠페인 커버",
    check: (html) => html.includes("template-mix-campaign-cover") && html.includes("campaign-cover-main") && html.includes("campaign-cover-sub"),
  },
  {
    label: "고객 발송용 렌더 이미지 시안",
    check: (html) => html.includes("rendered-draft-preview") || !html.includes("호아비 리치꿀스틱"),
  },
  {
    label: "첫 화면 구매 정보 레이어",
    check: (html) => html.includes("template-mix-hero-proof") && html.includes("template-mix-hero-stamp") && html.includes("template-mix-hero-offer"),
  },
  {
    label: "히어로 제품 합성 장치",
    check: (html) => html.includes("template-mix-hero-decor") && html.includes("decor-badge"),
  },
  {
    label: "제품 컷 반복 노출",
    check: (html) => html.includes("template-mix-product-strip"),
  },
  {
    label: "실제 상세/피그마 레퍼런스 리믹스",
    check: (html) => html.includes("template-mix-reference-hero-band") && html.includes("reference-hero-main") && html.includes("reference-hero-product"),
  },
  {
    label: "초반 제품/레퍼런스 비주얼 월",
    check: (html) => html.includes("template-mix-proof-wall") && html.includes("template-mix-proof-wall-grid") && html.includes("template-mix-proof-wall-reference"),
  },
  {
    label: "광고형 고밀도 포스터 구간",
    check: (html) => html.includes("template-mix-ad-poster") && html.includes("template-mix-ad-stage") && html.includes("template-mix-ad-reference"),
  },
  {
    label: "쇼핑몰형 광고 배너 3연속 구간",
    check: (html) => html.includes("template-mix-commercial-banners") && html.includes("commercial-banner is-orange") && html.includes("commercial-banner is-dark"),
  },
  {
    label: "교차형 오퍼/제품 시퀀스",
    check: (html) => html.includes("template-mix-offer-sequence") && html.includes("POINT 01") && html.includes("MOOD 01"),
  },
  {
    label: "A/B 컨셉 분기 섹션",
    check: (html) => html.includes("template-mix-concept-divider") && html.includes("template-mix-compare-table"),
  },
  {
    label: "A/B 전용 디자인 시그니처",
    check: (html) => html.includes("template-mix-brand-signature") && html.includes("template-mix-conversion-snapshot"),
  },
  {
    label: "원료/제품 무드 합성 섹션",
    check: (html) => html.includes("template-mix-editorial-scene") && html.includes("template-mix-photo-direction"),
  },
  {
    label: "어두운 강조 구간",
    check: (html) => html.includes("template-mix-dark"),
  },
  {
    label: "장점 카드 섹션",
    check: (html) => html.includes("template-mix-benefits") && html.includes("template-mix-benefit-showcase"),
  },
  {
    label: "구매 판단 흐름 섹션",
    check: (html) => html.includes("template-mix-decision"),
  },
  {
    label: "사용 루틴/장면 흐름 섹션",
    check: (html) => html.includes("template-mix-routine-flow"),
  },
  {
    label: "구매 정보 압축 테이블",
    check: (html) => html.includes("template-mix-commerce-table"),
  },
  {
    label: "패키지/구성 정보 섹션",
    check: (html) => html.includes("template-mix-split") && html.includes("template-mix-info-grid"),
  },
  {
    label: "추천/체크 포인트 섹션",
    check: (html) => html.includes("template-mix-check"),
  },
  {
    label: "신뢰/무드 마감 구간",
    check: (html) => html.includes("template-mix-proof"),
  },
  {
    label: "상세 흐름 레퍼런스 보드",
    check: (html) => html.includes("template-mix-reference-flow") && html.includes("template-mix-reference-strip"),
  },
  {
    label: "구매 설득 마감 모듈",
    check: (html) => html.includes("template-mix-purchase-stack") && html.includes("template-mix-choice-panel"),
  },
  {
    label: "최종 CTA 구간",
    check: (html) => html.includes("template-mix-final"),
  },
  {
    label: "최종 CTA 제품 컷",
    check: (html) => html.includes("template-mix-final-product"),
  },
  {
    label: "최종 선택 이유 배지",
    check: (html) => html.includes("template-mix-final-badges") && html.includes("template-mix-final-order-panel"),
  },
  {
    label: "출력용 고정 섹션 구조",
    check: (html) => html.includes("template-mix-routine-flow") && html.includes("template-mix-purchase-stack") && html.includes("template-mix-final-product"),
  },
  {
    label: "PNG/Figma 캡처 검수 필요",
    check: () => hasRenderedPreviewEvidence(),
  },
];
const DETAIL_DESIGN_OPERATION_SIGNALS = [
  "업종별 디자인 블록 패키지 적용",
  "섹션별 색상/이미지/스타일 자동 폴리싱 적용",
  "이미지 슬롯별 제작 상태 관리",
  "고객 메일/PSD 지시서까지 이미지 기준 연결",
];
const CUSTOMER_READY_SCORE = 90;
const RENDERED_REVIEW_SCORE_CAP = 78;

function value(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function readLeads() {
  try {
    return JSON.parse(localStorage.getItem(LEADS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLeads(leads) {
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
}

function readProjects() {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeProjects(projects) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

function readAiSettings() {
  try {
    return JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

function readCustomerProject() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_PROJECT_KEY) || "{}");
  } catch {
    return {};
  }
}

function readCustomerProjects() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_PROJECT_LIST_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeCustomerProjects(projects) {
  localStorage.setItem(CUSTOMER_PROJECT_LIST_KEY, JSON.stringify(projects));
}

function writeAiSettings(settings) {
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
}

function readAiWorkflowRuns() {
  try {
    return JSON.parse(localStorage.getItem(AI_WORKFLOW_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeAiWorkflowRuns(runs) {
  localStorage.setItem(AI_WORKFLOW_KEY, JSON.stringify(runs.slice(0, 80)));
}

function currentProjectKey() {
  return value("productName") || value("clientName") || "unsaved-project";
}

function projectAiContext(extra = {}) {
  return {
    projectKey: currentProjectKey(),
    product: product(),
    layouts: {
      A: $("#templateA")?.textContent.trim() || "",
      B: $("#templateB")?.textContent.trim() || "",
    },
    outputs: {
      plan: $("#planResult")?.textContent.trim() || "",
      clientMail: $("#clientMailResult")?.textContent.trim() || "",
      revision: $("#revisionResult")?.textContent.trim() || "",
      handoff: $("#handoffResult")?.textContent.trim() || "",
      finalMail: $("#finalMail")?.textContent.trim() || "",
    },
    sectionEdits,
    sectionOrders,
    ...extra,
  };
}

function recordAiWorkflowRun(role, provider, status, detail = {}) {
  const roleConfig = AI_SERVICE_ROLES[role] || { label: role };
  const runs = readAiWorkflowRuns();
  runs.unshift({
    id: `ai-run-${Date.now()}`,
    projectKey: currentProjectKey(),
    role,
    roleLabel: roleConfig.label,
    provider,
    status,
    detail,
    createdAt: new Date().toLocaleString("ko-KR"),
  });
  writeAiWorkflowRuns(runs);
  renderAiWorkflowStatus();
}

function aiRoleLabel(role) {
  return AI_SERVICE_ROLES[role]?.label || role;
}

function providerForRole(role) {
  const settings = readAiSettings();
  const roleConfig = AI_SERVICE_ROLES[role] || {};
  const mappedProvider = settings.roleProviders?.[role] || AI_ROLE_PROVIDER_MAP[role] || roleConfig.defaultProvider || "rules";
  if (mappedProvider === "openai" && settings.mode === "openai" && settings.apiKey) return "openai";
  if (mappedProvider === "local-design") return "local-design";
  if (mappedProvider === "rules") return "rules";
  return "rules";
}

function aiProviderLabel(provider) {
  return AI_PROVIDERS[provider]?.label || provider;
}

function saveAiArtifact(role, provider, result, meta = {}) {
  const key = `detailAiArtifacts:${currentProjectKey()}`;
  let artifacts = {};
  try {
    artifacts = JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    artifacts = {};
  }
  artifacts[role] = {
    role,
    roleLabel: aiRoleLabel(role),
    provider,
    providerLabel: aiProviderLabel(provider),
    result,
    meta,
    updatedAt: new Date().toLocaleString("ko-KR"),
  };
  localStorage.setItem(key, JSON.stringify(artifacts));
  return artifacts[role];
}

function readAiArtifacts(projectKey = currentProjectKey()) {
  try {
    return JSON.parse(localStorage.getItem(`detailAiArtifacts:${projectKey}`) || "{}");
  } catch {
    return {};
  }
}

async function runOpenAiProvider({ task, payload }) {
  return callOpenAi(task, payload);
}

async function runRulesProvider({ fallback }) {
  return fallback;
}

async function runLocalDesignProvider({ fallback }) {
  return fallback || "로컬 상세페이지 디자인 엔진으로 결과를 생성했습니다.";
}

async function runUnavailableProvider({ provider, fallback }) {
  return fallback || `${aiProviderLabel(provider)} provider는 아직 연결 전입니다. 현재는 로컬 결과를 사용합니다.`;
}

async function invokeAiRole(role, task, payload, fallback = "") {
  const provider = providerForRole(role);
  recordAiWorkflowRun(role, provider, "started", { task });
  try {
    const providerConfig = AI_PROVIDERS[provider] || AI_PROVIDERS.rules;
    const result = await providerConfig.run({
      role,
      provider,
      task,
      fallback,
      payload: {
        ...projectAiContext(),
        ...payload,
        aiRole: AI_SERVICE_ROLES[role],
        provider: providerConfig.label,
      },
    });
    const finalResult = result || fallback;
    saveAiArtifact(role, provider, finalResult, { task, providerStatus: providerConfig.status });
    recordAiWorkflowRun(role, provider, finalResult === fallback ? "fallback" : "completed", { task, providerLabel: providerConfig.label });
    return finalResult;
  } catch (error) {
    recordAiWorkflowRun(role, provider, "failed", { task, message: error.message });
    throw error;
  }
}

function renderAiWorkflowStatus() {
  const target = $("#aiWorkflowStatus");
  if (!target) return;
  const runs = readAiWorkflowRuns().filter((run) => run.projectKey === currentProjectKey()).slice(0, 8);
  if (!runs.length) {
    target.innerHTML = "<p>아직 이 프로젝트에서 실행된 AI 작업이 없습니다.</p>";
    return;
  }
  target.innerHTML = runs.map((run) => `
    <div>
      <b>${escapeHtml(run.roleLabel || aiRoleLabel(run.role))}</b>
      <span>${escapeHtml(aiProviderLabel(run.provider))} · ${escapeHtml(run.status)} · ${escapeHtml(run.createdAt)}</span>
    </div>
  `).join("");
}

function loadAiSettings() {
  const settings = readAiSettings();
  if ($("#aiMode")) $("#aiMode").value = settings.mode || "rules";
  if ($("#apiKey")) $("#apiKey").value = settings.apiKey || "";
  if ($("#aiModel")) $("#aiModel").value = settings.model || "gpt-4.1-mini";
  updateAiStatus();
}

function saveAiSettings() {
  writeAiSettings({
    mode: $("#aiMode").value,
    apiKey: $("#apiKey").value.trim(),
    model: $("#aiModel").value.trim() || "gpt-4.1-mini",
  });
  updateAiStatus();
  alert("AI 설정을 저장했습니다.");
}

function updateAiStatus(message) {
  const settings = readAiSettings();
  if (!$("#aiStatus")) return;
  if (message) {
    $("#aiStatus").textContent = message;
    return;
  }
  if (settings.mode === "openai") {
    $("#aiStatus").textContent = settings.apiKey ? "OpenAI API 생성 모드입니다." : "OpenAI API 모드입니다. API Key를 입력해야 합니다.";
  } else {
    $("#aiStatus").textContent = "현재 규칙 기반 생성 모드입니다.";
  }
}

function updateReferenceStatus() {
  const status = $("#referenceStatus");
  if (!status) return;
  const auto = window.COMPANY_REFERENCE_AUTO;
  const curated = window.COMPANY_REFERENCE_DATASET;
  const total = auto?.total || curated?.summary?.totalFiles || 0;
  status.textContent = total
    ? `참고 상세페이지 ${total}개 분석 데이터 연결됨`
    : "참고 상세페이지 자료가 아직 연결되지 않았습니다.";
}

async function callOpenAi(task, payload) {
  const settings = readAiSettings();
  if (settings.mode !== "openai") return null;
  if (!settings.apiKey) throw new Error("API Key가 없습니다.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: "너는 한국 상세페이지 제작사의 내부 기획 어시스턴트다. 과장 광고와 의약품 오인 표현을 피하고, 실무자가 바로 쓸 수 있는 구조화된 한국어 결과를 만든다.",
        },
        {
          role: "user",
          content: `작업: ${task}\n\n입력 데이터:\n${JSON.stringify(payload, null, 2)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API 오류 ${response.status}`);
  }

  const data = await response.json();
  return data.output_text || data.output?.flatMap((item) => item.content || []).map((item) => item.text || "").join("\n") || "";
}

function renderLeads() {
  const list = $("#leadList");
  if (!list) return;
  const leads = readLeads();
  if (!leads.length) {
    list.textContent = "아직 접수된 고객자료가 없습니다.";
    return;
  }
  list.innerHTML = leads.map((lead) => `
    <article class="lead-item">
      <div>
        <strong>${escapeHtml(lead.productName || "제품명 미입력")}</strong>
        <p>${escapeHtml(lead.source || "접수")} · ${escapeHtml(lead.selectedOption || "옵션 없음")} · ${escapeHtml(lead.createdAt || "")}</p>
        <p>상태: ${escapeHtml(lead.status || "신규 접수")}</p>
        <p>${escapeHtml(lead.serviceType || lead.purpose || "")}</p>
      </div>
      <div class="lead-actions">
        <select class="status-select lead-status" data-id="${escapeHtml(lead.id)}">
          ${["신규 접수", "검토 중", "AI 기획 완료", "A/B 시안 완료", "고객 회신 대기", "수정 시안 컨펌 대기", "PSD 제작 중", "내부 검수 중", "최종 납품 준비", "완료"].map((status) => `<option ${status === lead.status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
        <button class="secondary small import-lead" data-id="${escapeHtml(lead.id)}">불러오기</button>
      </div>
    </article>
  `).join("");
  $$(".lead-status").forEach((select) => {
    select.addEventListener("change", () => updateLeadStatus(select.dataset.id, select.value));
  });
  $$(".import-lead").forEach((button) => {
    button.addEventListener("click", () => importLead(button.dataset.id));
  });
}

function updateLeadStatus(id, status) {
  const leads = readLeads().map((lead) => lead.id === id ? { ...lead, status } : lead);
  writeLeads(leads);
  renderLeads();
}

function importLead(id) {
  const lead = readLeads().find((item) => item.id === id);
  if (!lead) return;
  $("#clientName").value = lead.brandName || lead.name || "";
  $("#productName").value = lead.productName || "";
  $("#category").value = lead.category || "";
  $("#channel").value = lead.channel || "고객 입력";
  $("#dueDate").value = lead.dueDate || "";
  $("#oneLine").value = lead.features || lead.freeDraft || "";
  $("#consultSummary").value = [
    `유입 경로: ${lead.source || ""}`,
    `선택 옵션: ${lead.selectedOption || ""}`,
    `고객명: ${lead.name || ""}`,
    `연락처: ${lead.phone || ""}`,
    `이메일: ${lead.email || ""}`,
    lead.targetCustomer ? `타깃고객: ${lead.targetCustomer}` : "",
    lead.purpose ? `제작 목적: ${lead.purpose}` : "",
    lead.serviceType ? `희망 제작 방식: ${lead.serviceType}` : "",
    lead.scope?.length ? `제작 범위: ${lead.scope.join(", ")}` : "",
    lead.summary ? `\n[접수 요약]\n${lead.summary}` : "",
  ].filter(Boolean).join("\n");
  $("#clientRequests").value = lead.moodText || (lead.mood || []).join(", ") || "";
  $("#emphasis").value = lead.emphasis || lead.difference || "";
  $("#banWords").value = lead.avoidText || "";
  $("#mustInclude").value = lead.mustInclude || "";
  $("#references").value = lead.references || "";

  if (lead.mood) {
    setChecked("direction", lead.mood.filter((item) => ["고급스러운", "감성적인", "깔끔한", "귀여운", "신뢰감 있는", "선물용", "정보 전달형", "구매 전환형"].includes(item)).map((item) => {
      if (item === "고급스러운") return "프리미엄 브랜드형";
      if (item === "감성적인") return "감성 스토리형";
      if (item === "귀여운") return "캐주얼/귀여운형";
      if (item === "정보 전달형") return "정보 전달형";
      return item;
    }));
  }

  generateAll();
  updateLeadStatus(id, "검토 중");
  alert("고객 접수 자료를 프로젝트에 불러왔습니다.");
}

function importCustomerProject() {
  const data = readCustomerProject();
  if (!data.productName) {
    alert("아직 고객이 저장한 프로젝트 작성 내용이 없습니다.");
    return;
  }
  const mood = data.mood || [];
  const structure = data.structure || [];
  const colorTone = data.colorTone || [];
  const imageStyle = data.imageStyle || [];
  const avoidStyle = data.avoidStyle || [];
  const imageAssets = data.imageAssets || [];
  const uploadedFiles = [
    data.productImages?.length ? `제품 이미지 파일: ${data.productImages.join(", ")}` : "",
    data.brandLogo?.length ? `브랜드 로고 파일: ${data.brandLogo.join(", ")}` : "",
    data.referenceFiles?.length ? `참고 상세페이지 파일: ${data.referenceFiles.join(", ")}` : "",
  ].filter(Boolean);

  $("#clientName").value = data.clientName || "";
  $("#productName").value = data.productName || "";
  $("#category").value = data.category || "";
  $("#channel").value = data.channel || "";
  $("#dueDate").value = data.dueDate || "";
  $("#oneLine").value = data.oneLine || "";
  $("#consultSummary").value = [
    data.language ? `상세페이지 언어: ${data.language}` : "",
    data.contactName ? `담당자명: ${data.contactName}` : "",
    data.contactInfo ? `고객 연락처/이메일: ${data.contactInfo}` : "",
    data.phone ? `연락처: ${data.phone}` : "",
    data.source ? `접수 경로: ${data.source}` : "",
    data.targetCustomer ? `주요 고객: ${data.targetCustomer}` : "",
    data.features ? `제품 특징:\n${data.features}` : "",
    data.existingDetailStructure?.length ? `기존 상세페이지 구조 분석:\n${data.existingDetailStructure.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : "",
    imageAssets.length ? `이미지/촬영본 상태: ${imageAssets.join(", ")}` : "",
    uploadedFiles.length ? uploadedFiles.join("\n") : "",
    data.imageMemo ? `이미지 메모:\n${data.imageMemo}` : "",
    data.savedAt ? `고객 작성 저장일: ${data.savedAt}` : "",
  ].filter(Boolean).join("\n\n");
  $("#clientRequests").value = [
    data.clientRequests || "",
    mood.length ? `선택한 전체 분위기: ${mood.join(", ")}` : "",
    structure.length ? `선택한 구성 방식: ${structure.join(", ")}` : "",
    colorTone.length ? `선택한 색감 방향: ${colorTone.join(", ")}` : "",
    imageStyle.length ? `선택한 이미지 활용: ${imageStyle.join(", ")}` : "",
  ].filter(Boolean).join("\n");
  $("#emphasis").value = data.emphasis || "";
  $("#banWords").value = [
    data.banWords || "",
    avoidStyle.length ? `피하고 싶은 느낌: ${avoidStyle.join(", ")}` : "",
  ].filter(Boolean).join("\n");
  $("#mustInclude").value = data.mustInclude || "";
  $("#references").value = data.references || "";

  const directions = [];
  if (mood.some((item) => item.includes("고급스럽고") || item.includes("신뢰감"))) directions.push("프리미엄 브랜드형");
  if (mood.some((item) => item.includes("따뜻") || item.includes("감성"))) directions.push("감성 스토리형");
  if (mood.some((item) => item.includes("귀엽") || item.includes("친근"))) directions.push("캐주얼/귀여운형");
  if (mood.some((item) => item.includes("전문적") || item.includes("정보"))) directions.push("정보 전달형");
  if (structure.some((item) => item.includes("문제 해결"))) directions.push("문제 해결형");
  if (structure.some((item) => item.includes("제품 설명") || item.includes("후기"))) directions.push("정보 전달형");
  if (structure.some((item) => item.includes("브랜드 스토리") || item.includes("선물용"))) directions.push("감성 스토리형");
  setChecked("direction", [...new Set(directions)]);

  const goals = [];
  if (structure.some((item) => item.includes("구매 전환"))) goals.push("구매 전환");
  if (mood.some((item) => item.includes("신뢰감")) || structure.some((item) => item.includes("신뢰"))) goals.push("브랜드 신뢰");
  if (structure.some((item) => item.includes("제품 설명"))) goals.push("제품 이해");
  if (structure.some((item) => item.includes("선물용"))) goals.push("선물 수요");
  setChecked("goal", [...new Set(goals)]);

  updateWorkflowState();
  alert("고객 작성 내용을 불러왔습니다. 부족한 부분만 보완하면 됩니다.");
}

function customerProjectReadiness(project) {
  const checks = [
    Boolean(project.productName),
    Boolean(project.category),
    Boolean(project.oneLine || project.features),
    Boolean(project.emphasis || project.clientRequests),
    Boolean(project.language),
    Boolean(project.contactInfo || project.contactName || project.phone || project.email),
    Boolean(project.references || (Array.isArray(project.referenceFiles) && project.referenceFiles.length > 0)),
    Boolean(project.clientName || project.brandName),
    Boolean(project.imageMemo || project.references || (Array.isArray(project.imageAssets) && project.imageAssets.length > 0)),
  ];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const missing = [];
  if (!project.productName) missing.push("제품명");
  if (!project.category) missing.push("카테고리");
  if (!project.oneLine && !project.features && !project.clientRequests) missing.push("요청사항");
  if (!project.contactInfo && !project.contactName && !project.phone && !project.email) missing.push("연락처");
  if (!project.imageMemo && !project.references && !(Array.isArray(project.imageAssets) && project.imageAssets.length)) missing.push("사진/참고자료");
  return { score, missing };
}

function renderCustomerProjects() {
  const list = $("#customerProjectList");
  if (!list) return;
  const projects = readCustomerProjects();
  if (!projects.length) {
    list.textContent = "아직 접수된 고객 작성 내용이 없습니다.";
    return;
  }

  const statuses = ["신규 접수", "확인 중", "기획 생성", "시안 제작", "고객 회신 대기", "완료"];
  list.innerHTML = projects.map((project) => {
    const readiness = customerProjectReadiness(project);
    const readinessText = readiness.missing.length
      ? `보완 필요: ${escapeHtml(readiness.missing.join(", "))}`
      : "바로 시안 생성 가능";
    return `
      <article class="lead-item">
        <div>
          <strong>${escapeHtml(project.productName || "제품명 미입력")}</strong>
          <p>${escapeHtml(project.clientName || "브랜드명 미입력")} · ${escapeHtml(project.category || "카테고리 미선택")} · ${escapeHtml(project.savedAt || "")}</p>
          <p>상태: ${escapeHtml(project.status || "신규 접수")}</p>
          <p class="readiness-line"><b>시안 준비도 ${readiness.score}%</b> · ${readinessText}</p>
        </div>
        <div class="lead-actions">
          <select class="status-select customer-project-status" data-id="${escapeHtml(project.id)}">
            ${statuses.map((status) => `<option ${status === project.status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
          <button class="secondary small import-customer-project" data-id="${escapeHtml(project.id)}">불러오기</button>
        </div>
      </article>
    `;
  }).join("");

  $$(".customer-project-status").forEach((select) => {
    select.addEventListener("change", () => updateCustomerProjectStatus(select.dataset.id, select.value));
  });
  $$(".import-customer-project").forEach((button) => {
    button.addEventListener("click", () => importCustomerProjectById(button.dataset.id));
  });
}

function customerProjectCompanyName(project) {
  return project.clientName || project.companyName || project.businessName || project.brandName || project.contactName || "업체명 미입력";
}

function customerProjectMeta(project) {
  return [
    project.category || "카테고리 미선택",
    project.savedAt || "저장일 없음",
    project.status || "신규 접수",
  ].filter(Boolean).join(" · ");
}

function renderCustomerImportChoices() {
  const list = $("#customerImportList");
  if (!list) return;
  const projects = readCustomerProjects();
  if (!projects.length) {
    list.innerHTML = `
      <div class="customer-import-empty">
        <strong>아직 불러올 고객 작성 내용이 없습니다.</strong>
        <p>고객 작성폼에서 저장된 내용이 생기면 업체명으로 선택할 수 있습니다.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = projects.map((project, index) => `
    <button class="customer-import-item" type="button" data-id="${escapeHtml(project.id || "")}" data-index="${index}">
      <span>${escapeHtml(customerProjectCompanyName(project))}</span>
      <strong>${escapeHtml(project.productName || "제품명 미입력")}</strong>
      <small>${escapeHtml(customerProjectMeta(project))}</small>
    </button>
  `).join("");

  $$(".customer-import-item").forEach((button) => {
    button.addEventListener("click", () => importCustomerProjectFromChoice(button.dataset.id, button.dataset.index));
  });
}

function openCustomerImportModal() {
  renderCustomerImportChoices();
  const modal = $("#customerImportModal");
  if (modal) modal.hidden = false;
}

function closeCustomerImportModal() {
  const modal = $("#customerImportModal");
  if (modal) modal.hidden = true;
}

function importCustomerProjectFromChoice(id, index) {
  const projects = readCustomerProjects();
  const project = projects.find((item) => item.id === id) || projects[Number(index)];
  if (!project) return;
  localStorage.setItem(CUSTOMER_PROJECT_KEY, JSON.stringify(project));
  closeCustomerImportModal();
  importCustomerProject();
  if (project.id) {
    updateCustomerProjectStatus(project.id, "확인 중");
    return;
  }
  projects[Number(index)] = { ...project, status: "확인 중" };
  writeCustomerProjects(projects);
  renderCustomerProjects();
}

function updateCustomerProjectStatus(id, status) {
  const projects = readCustomerProjects().map((project) => project.id === id ? { ...project, status } : project);
  writeCustomerProjects(projects);
  renderCustomerProjects();
}

function importCustomerProjectById(id) {
  const project = readCustomerProjects().find((item) => item.id === id);
  if (!project) return;
  localStorage.setItem(CUSTOMER_PROJECT_KEY, JSON.stringify(project));
  importCustomerProject();
  updateCustomerProjectStatus(id, "확인 중");
}

function addHoabiCustomerTest(silent = false) {
  const projects = readCustomerProjects();
  const project = {
    id: `customer-project-${Date.now()}`,
    status: "신규 접수",
    savedAt: new Date().toLocaleString("ko-KR"),
    clientName: "호아비",
    productName: "호아비 리치꿀스틱 30포",
    category: "식품/건강식품",
    channel: "자사몰, 스마트스토어, 오픈마켓",
    contactName: "호아비 담당자",
    phone: "010-0000-0000",
    oneLine: "베트남 리치와 프리미엄 꿀을 담은 스틱형 건강식품",
    features: "실제 상세페이지 분석 기준: 30포 구성의 개별 스틱 포장 제품. 리치 원료, 꿀, 휴대성, 간편 섭취, 선물용 패키지, 제품 신뢰 자료가 주요 흐름으로 구성되어 있습니다. 기존 상세페이지는 메인 비주얼 → 원료 스토리 → 섭취 편의성 → 활용 장면 → 선물성 → 신뢰/인증 자료 → 제품 정보 순서입니다.",
    targetCustomer: "건강을 챙기고 싶은 30~60대 고객, 부모님 선물 구매층, 바쁜 직장인, 간편한 데일리 건강 루틴을 원하는 고객",
    emphasis: "리치 원료와 꿀의 조합, 30포 구성, 휴대가 간편한 스틱형, 선물용 패키지, 기존 상세페이지의 고급 오렌지/골드 톤, 신뢰 자료 영역",
    mustInclude: "리치꿀스틱, 30포 구성, 휴대가 간편한 스틱형, 프리미엄 원료, 선물용 패키지, 제품 정보/주의사항",
    mood: ["고급스럽고 신뢰감 있는 느낌", "따뜻하고 감성적인 느낌"],
    structure: ["브랜드 스토리 중심", "제품 설명 중심", "선물용 이미지 강조", "후기와 신뢰 요소 강조"],
    colorTone: ["밝고 깨끗한 톤", "고급스러운 톤"],
    imageStyle: ["원료와 소재 강조", "패키지 강조", "아이콘과 카드 정보 활용"],
    imageAssets: ["기존 상세페이지 이미지 있음", "패키지 사진 있음", "연출컷 있음", "촬영 필요", "합성 필요"],
    imageMemo: "원본 상세페이지 파일: C:/Users/mycom/Desktop/2512_호아비리치꿀스틱_(30P)_최종.jpg. 자동화 테스트용으로 assets/hoabi-detail 폴더에 12개 구간 이미지로 분할 저장했습니다. 추가 제품 사진은 assets/hoabi-product/hoabi-lifestyle-package.jfif, assets/hoabi-product/hoabi-stick-cut.jfif 입니다. 초안에는 제공 사진을 우선 배치하고, 최종 제작 시 패키지 대표컷, 원료 합성컷, 섭취컷, 선물 연출컷을 새로 촬영/합성하는 방향이 좋습니다.",
    avoidStyle: ["과한 광고 느낌", "저가형 느낌", "의약품처럼 보이는 표현"],
    clientRequests: "기존 상세페이지의 오렌지/골드 계열 프리미엄 분위기를 유지하되, 더 정돈된 긴 상세페이지 구조로 개선하고 싶습니다. 선물용 건강식품 느낌, 리치 원료 스토리, 스틱형 편의성을 강조해주세요.",
    banWords: "질병 치료, 면역력 향상 보장, 의약품처럼 보이는 표현, 과장 광고 문구는 피해주세요.",
    references: "기존 호아비 상세페이지 원본 이미지 및 분할 참고 이미지: assets/hoabi-detail/hoabi-section-01.jpg ~ hoabi-section-12.jpg. 제공 제품 사진: assets/hoabi-product/hoabi-lifestyle-package.jfif, assets/hoabi-product/hoabi-stick-cut.jfif. 사진 프롬프트 원본: C:/Users/mycom/Desktop/상세 사진 프롬프트.txt",
    existingDetailStructure: [
      "메인 비주얼: 오렌지/골드 그라데이션 배경, 제품 패키지와 영문 제품명 강조",
      "원료 스토리: 리치 이미지와 원료 설명",
      "브랜드 무드: Hoabee 브랜드 블랙/골드 구간",
      "제품 특징: 스틱형 구성, 간편 섭취, 1일 루틴 메시지",
      "사용 장면: 음료/요거트/일상 섭취 연출",
      "선물성: 패키지와 고급스러운 선물 이미지",
      "신뢰 자료: 서류/인증/검사 자료 영역",
      "제품 정보: 원재료, 보관, 주의사항 등 하단 정보",
    ],
  };
  projects.unshift(project);
  writeCustomerProjects(projects);
  localStorage.setItem(CUSTOMER_PROJECT_KEY, JSON.stringify(project));
  renderCustomerProjects();
  updateWorkflowState();
  if (!silent) alert("호아비 실제 상세페이지 기반 테스트 접수건을 추가했습니다. 목록에서 불러오기를 눌러 테스트해보세요.");
}

function currentProjectData() {
  return {
    id: `project-${Date.now()}`,
    savedAt: new Date().toLocaleString("ko-KR"),
    status: "AI 기획 완료",
    clientName: value("clientName"),
    productName: value("productName"),
    category: value("category"),
    channel: value("channel"),
    customerType: value("customerType") || "new",
    productionRoute: value("productionRoute") || "figma",
    dueDate: value("dueDate"),
    oneLine: value("oneLine"),
    consultSummary: value("consultSummary"),
    clientRequests: value("clientRequests"),
    emphasis: value("emphasis"),
    banWords: value("banWords"),
    mustInclude: value("mustInclude"),
    references: value("references"),
    contentRatio: value("contentRatio"),
    optionMemo: value("optionMemo"),
    direction: selected("direction"),
    target: selected("target"),
    goal: selected("goal"),
    highlight: selected("highlight"),
    avoid: selected("avoid"),
    usp: selected("usp"),
    layoutA: $("#templateA").textContent.trim(),
    layoutB: $("#templateB").textContent.trim(),
    draftTone: value("draftTone"),
    draftImagePosition: value("draftImagePosition"),
    draftDensity: value("draftDensity"),
    draftMainCopy: value("draftMainCopy"),
    activeSectionDraft,
    sectionEdits,
    sectionOrders,
    planResult: $("#planResult").textContent,
    draftA: $("#draftA").innerText,
    draftB: $("#draftB").innerText,
    clientMail: $("#clientMailResult").textContent,
    clientPreflight: $("#clientPreflightResult")?.innerText || "",
    aiWorkflowRuns: readAiWorkflowRuns().filter((run) => run.projectKey === currentProjectKey()).slice(0, 20),
    aiArtifacts: readAiArtifacts(),
    designWorkflow: currentDesignWorkflow,
    aiQualityReview: $("#aiQualityReview")?.textContent || "",
    revision: $("#revisionResult")?.textContent || "",
    revisionMail: $("#revisionMailResult")?.textContent || "",
    handoff: $("#handoffResult").textContent,
    finalMail: $("#finalMail").textContent,
  };
}

function saveCurrentProject() {
  const project = currentProjectData();
  if (!project.productName) {
    alert("제품명을 입력하거나 접수건을 불러온 뒤 저장해주세요.");
    return;
  }
  const projects = readProjects();
  projects.unshift(project);
  writeProjects(projects);
  renderProjects();
  alert("현재 프로젝트를 저장했습니다.");
}

function renderProjects() {
  const list = $("#projectList");
  if (!list) return;
  const projects = readProjects();
  if (!projects.length) {
    list.textContent = "아직 저장된 프로젝트가 없습니다.";
    return;
  }
  list.innerHTML = projects.map((project) => `
    <article class="lead-item">
      <div>
        <strong>${escapeHtml(project.productName || "제품명 미입력")}</strong>
        <p>${escapeHtml(project.clientName || "고객사 미입력")} · ${escapeHtml(project.savedAt || "")}</p>
        <p>${escapeHtml(productionRouteConfig(project.productionRoute || "figma", project.customerType || "new").customerLabel)} · ${escapeHtml(productionRouteConfig(project.productionRoute || "figma", project.customerType || "new").name)}</p>
        <p>상태: ${escapeHtml(project.status || "저장됨")} · A안 ${escapeHtml(project.layoutA || "")} / B안 ${escapeHtml(project.layoutB || "")}</p>
      </div>
      <div class="lead-actions">
        <select class="status-select project-status" data-id="${escapeHtml(project.id)}">
          ${["AI 기획 완료", "A/B 시안 완료", "고객 회신 대기", "수정 시안 컨펌 대기", "PSD 제작 중", "내부 검수 중", "최종 납품 준비", "완료"].map((status) => `<option ${status === project.status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
        <button class="secondary small load-project" data-id="${escapeHtml(project.id)}">열기</button>
      </div>
    </article>
  `).join("");
  $$(".project-status").forEach((select) => {
    select.addEventListener("change", () => updateProjectStatus(select.dataset.id, select.value));
  });
  $$(".load-project").forEach((button) => {
    button.addEventListener("click", () => loadProject(button.dataset.id));
  });
}

function updateProjectStatus(id, status) {
  const projects = readProjects().map((project) => project.id === id ? { ...project, status } : project);
  writeProjects(projects);
  renderProjects();
}

function loadProject(id) {
  const project = readProjects().find((item) => item.id === id);
  if (!project) return;
  $("#clientName").value = project.clientName || "";
  $("#productName").value = project.productName || "";
  $("#category").value = project.category || "";
  $("#channel").value = project.channel || "";
  if ($("#customerType")) $("#customerType").value = project.customerType || "new";
  if ($("#productionRoute")) $("#productionRoute").value = project.productionRoute || (project.customerType === "existing" ? "psd" : "figma");
  $("#dueDate").value = project.dueDate || "";
  $("#oneLine").value = project.oneLine || "";
  $("#consultSummary").value = project.consultSummary || "";
  $("#clientRequests").value = project.clientRequests || "";
  $("#emphasis").value = project.emphasis || "";
  $("#banWords").value = project.banWords || "";
  $("#mustInclude").value = project.mustInclude || "";
  $("#references").value = project.references || "";
  $("#contentRatio").value = project.contentRatio || "";
  $("#optionMemo").value = project.optionMemo || "";
  setChecked("direction", project.direction || []);
  setChecked("target", project.target || []);
  setChecked("goal", project.goal || []);
  setChecked("highlight", project.highlight || []);
  setChecked("avoid", project.avoid || []);
  setChecked("usp", project.usp || []);
  $("#templateA").textContent = project.layoutA || "풀비주얼 브랜드형";
  $("#templateB").textContent = project.layoutB || "스토리 스크롤형";
  if ($("#draftTone")) $("#draftTone").value = project.draftTone || "premium";
  if ($("#draftImagePosition")) $("#draftImagePosition").value = project.draftImagePosition || "right";
  if ($("#draftDensity")) $("#draftDensity").value = project.draftDensity || "balanced";
  if ($("#draftMainCopy")) $("#draftMainCopy").value = project.draftMainCopy || "";
  activeSectionDraft = project.activeSectionDraft || "A";
  sectionEdits = project.sectionEdits || { A: [], B: [] };
  sectionOrders = project.sectionOrders || { A: [], B: [] };
  if (Array.isArray(project.aiWorkflowRuns) && project.aiWorkflowRuns.length) {
    const existing = readAiWorkflowRuns();
    const existingIds = new Set(existing.map((run) => run.id));
    writeAiWorkflowRuns([...project.aiWorkflowRuns.filter((run) => !existingIds.has(run.id)), ...existing]);
  }
  if (project.aiArtifacts && typeof project.aiArtifacts === "object") {
    localStorage.setItem(`detailAiArtifacts:${currentProjectKey()}`, JSON.stringify(project.aiArtifacts));
  }
  currentDesignWorkflow = project.designWorkflow || project.aiArtifacts?.designWorkflow?.result || null;
  manualTemplateChanged = Boolean(project.layoutA || project.layoutB);
  $("#planResult").textContent = project.planResult || "기획 결과가 여기에 표시됩니다.";
  $("#draftA").innerHTML = `<pre>${escapeHtml(project.draftA || "A안 결과가 여기에 표시됩니다.")}</pre>`;
  $("#draftB").innerHTML = `<pre>${escapeHtml(project.draftB || "B안 결과가 여기에 표시됩니다.")}</pre>`;
  $("#clientMailResult").textContent = project.clientMail || "시안 생성 후 고객에게 보낼 메일 초안이 여기에 표시됩니다.";
  renderClientPreflight(project.clientMail || "");
  if ($("#aiQualityReview")) $("#aiQualityReview").textContent = project.aiQualityReview || "A/B 시안 생성 후 디자인 품질 검수 결과가 표시됩니다.";
  if ($("#revisionResult")) $("#revisionResult").textContent = project.revision || "고객 피드백을 반영한 수정 시안 요약이 여기에 표시됩니다.";
  if ($("#revisionMailResult")) $("#revisionMailResult").textContent = project.revisionMail || "수정 시안 컨펌 요청 메일이 여기에 표시됩니다.";
  $("#handoffResult").textContent = project.handoff || "PSD 작업 지시서와 바이버 메시지가 여기에 표시됩니다.";
  $("#finalMail").textContent = project.finalMail || "최종 납품 메일 초안이 여기에 표시됩니다.";
  renderTemplateLibrary();
  renderSectionLayouts();
  renderPhotoConcepts();
  renderSectionEditor();
  renderAiWorkflowStatus();
  updateActiveDraftView();
  updateRouteSummary();
  updateWorkflowState();
  alert("저장된 프로젝트를 열었습니다.");
}

function selected(name) {
  return $$(`input[name="${name}"]:checked`).map((item) => item.value);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setChecked(name, values) {
  $$(`input[name="${name}"]`).forEach((item) => {
    item.checked = values.includes(item.value);
  });
}

function product() {
  return {
    clientName: value("clientName") || "고객사",
    productName: value("productName") || "제품명",
    category: value("category") || "카테고리",
    customerType: value("customerType") || "new",
    productionRoute: value("productionRoute") || "figma",
    oneLine: value("oneLine") || "제품 한 줄 설명이 필요합니다.",
    direction: selected("direction"),
    target: selected("target"),
    goal: selected("goal"),
    highlight: selected("highlight"),
    avoid: selected("avoid"),
    usp: selected("usp"),
    mustInclude: value("mustInclude"),
    banWords: value("banWords"),
    contentRatio: value("contentRatio"),
    optionMemo: value("optionMemo"),
    consultSummary: value("consultSummary"),
    clientRequests: value("clientRequests"),
    emphasis: value("emphasis"),
    references: value("references"),
  };
}

function productionRouteConfig(route = value("productionRoute"), customerType = value("customerType")) {
  const isExisting = customerType === "existing";
  const configs = {
    figma: {
      name: "Figma 빠른 협업 라인",
      shortName: "Figma 라인",
      goal: "빠른 시안, 실시간 수정, 고객 컨펌 효율",
      result: "Figma 파일 / Export 파일",
      buttons: ["Figma 초안 생성", "Figma 열기", "컨펌 요청", "최종 확정"],
      guide: "신규 고객에게 기본 추천됩니다. 시안 확인과 수정이 빠르고, 디자이너가 Figma에서 직접 다듬는 흐름입니다.",
    },
    psd: {
      name: "PSD 고퀄리티 제작 라인",
      shortName: "PSD 라인",
      goal: "완성도, 디자인 디테일, 원본 제작 품질",
      result: "PSD 원본 / PNG / JPG",
      buttons: ["AI 이미지 생성", "미얀마 작업 전달", "PSD 다운로드", "최종 납품"],
      guide: "기존 고객에게 기본 추천됩니다. AI 시안을 바탕으로 미얀마 디자이너가 PSD를 최대한 동일하게 구현하는 흐름입니다.",
    },
  };
  return {
    customerLabel: isExisting ? "기존 고객" : "신규 고객",
    ...(configs[route] || configs.figma),
  };
}

function recommendProductionRoute() {
  const customerType = value("customerType");
  const route = value("productionRoute");
  if (!route && $("#productionRoute")) {
    $("#productionRoute").value = customerType === "existing" ? "psd" : "figma";
  }
}

function updateRouteSummary() {
  const config = productionRouteConfig();
  const summary = $("#routeSummary");
  if (summary) {
    summary.innerHTML = `
      <strong>${escapeHtml(config.customerLabel)} · ${escapeHtml(config.name)}</strong>
      <p>${escapeHtml(config.guide)}</p>
      <div class="route-mini-grid">
        <span>목표: ${escapeHtml(config.goal)}</span>
        <span>결과물: ${escapeHtml(config.result)}</span>
      </div>
      <div class="route-flow-badges">
        ${config.buttons.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    `;
  }
  if ($("#routeActionKicker")) $("#routeActionKicker").textContent = `${config.customerLabel} 제작 라인`;
  if ($("#routeActionTitle")) $("#routeActionTitle").textContent = config.name;
  if ($("#routeActionText")) $("#routeActionText").textContent = `${config.goal}을 기준으로 ${config.buttons.join(" → ")} 순서로 진행합니다.`;
  const figmaButtons = ["#generateFigmaBrief", "#openFigmaPlaceholder"];
  figmaButtons.forEach((selector) => {
    const button = $(selector);
    if (button) button.hidden = value("productionRoute") !== "figma";
  });
  const handoffButton = $("#generateHandoff");
  if (handoffButton) {
    handoffButton.textContent = value("productionRoute") === "figma" ? "Figma 협업 패키지 생성" : "PSD 작업 지시서 생성";
  }
  updateReviewRouteGuide();
}

function updateReviewRouteGuide() {
  const target = $("#reviewRouteGuide");
  if (!target) return;
  const route = value("productionRoute") || "figma";
  const guide = route === "figma"
    ? {
        title: "Figma 라인 검수 기준",
        items: [
          "Figma 프레임이 긴 세로형 상세페이지 구조로 정리됨",
          "ad_poster / photo_plan / purchase_stack 구간이 프레임 또는 그룹명으로 구분됨",
          "텍스트와 제품 이미지가 교체 가능한 상태",
          "광고형 포스터 구간이 단순 와이어프레임이 아닌 실제 상세 디자인처럼 보임",
          "고객 컨펌용 PNG/JPG Export 확인",
          "최종 링크/권한/원본 제공 범위 확인",
        ],
      }
    : {
        title: "PSD 라인 검수 기준",
        items: [
          "PSD 섹션별 그룹이 선택 시안의 실제 섹션 순서와 일치",
          "ad_poster / photo_plan / purchase_stack 그룹이 분리되어 있음",
          "텍스트 레이어 수정 가능",
          "제품컷 비율과 라벨이 왜곡되지 않음",
          "AI 시안과 색상, 카드, 배지, CTA, 이미지 배치가 일치",
          "PNG/JPG 미리보기 및 PSD 원본 제공 범위 확인",
        ],
      };
  target.innerHTML = `
    <strong>${escapeHtml(guide.title)}</strong>
    <ul>
      ${guide.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

const CATEGORY_DATASETS = {
  "식품/건강식품": {
    tone: "깨끗함, 신뢰감, 프리미엄, 선물성",
    mainMessage: "원료와 구성의 신뢰감을 바탕으로 간편한 섭취와 선물 가치를 보여줍니다.",
    targetPains: [
      "좋은 원료인지 확인하고 싶음",
      "매일 챙기기 쉬운 제품을 찾음",
      "부모님이나 지인에게 줄 선물용 건강식품을 고민함",
      "과장 광고가 아닌 신뢰감 있는 정보를 원함",
    ],
    purchasePoints: [
      "원료 스토리와 품질 이미지",
      "스틱형/개별 포장 등 섭취 편의성",
      "패키지와 구성에서 느껴지는 선물 가치",
      "구성량, 원산지, 보관법 등 구매 전 확인 정보",
    ],
    sections: [
      "메인 비주얼과 핵심 카피",
      "원료/브랜드 스토리",
      "제품 핵심 장점",
      "섭취 편의성과 휴대성",
      "선물 패키지 연출",
      "구성품/원산지/보관 정보",
      "신뢰 요소와 구매 유도",
    ],
    photoConcepts: [
      "{product} 패키지 정면 대표컷",
      "스틱 개별 포장 누끼컷",
      "원료와 꿀/리치 등 소재를 함께 보여주는 합성 이미지",
      "손에 들고 간편하게 섭취하는 장면",
      "직장인 책상 위 데일리 루틴 컷",
      "부모님 선물용 패키지 연출컷",
      "가방이나 파우치에 넣은 휴대성 컷",
      "전체 구성 펼침컷",
    ],
    copyBlocks: {
      hero: "하루 한 포, 간편하게 챙기는 프리미엄 루틴",
      problem: "좋은 제품을 고르고 싶지만 원료와 구성, 섭취 편의성이 명확하지 않으면 구매를 망설이게 됩니다.",
      trust: "제품 정보는 과장 없이 원료, 구성, 섭취 방법 중심으로 명확하게 전달합니다.",
      cta: "선물용으로도, 데일리 루틴으로도 부담 없이 선택할 수 있도록 마지막 구매 포인트를 정리합니다.",
    },
    caution: [
      "질병 치료, 예방, 완화 표현 금지",
      "면역력 향상 보장, 즉시 효과 등 효능 보장 표현 금지",
      "의약품으로 오인될 수 있는 문구 금지",
      "과장된 후기/전후 비교 표현 주의",
    ],
    psdMemo: [
      "원료컷과 제품컷을 과장되지 않게 고급스럽게 합성",
      "식품/건강식품 특성상 의약품처럼 보이는 그래픽 사용 금지",
      "구성 정보와 섭취 방법은 모바일에서 읽기 쉽게 카드 또는 표로 정리",
    ],
  },
  "뷰티/화장품": {
    tone: "깨끗함, 감성, 성분 신뢰, 브랜드 무드",
    mainMessage: "피부 고민과 성분 포인트를 감각적으로 보여주고 사용 장면으로 기대감을 만듭니다.",
    targetPains: ["성분이 안전한지 궁금함", "내 피부 고민에 맞는지 알고 싶음", "제형과 사용감이 궁금함"],
    purchasePoints: ["성분/원료 포인트", "제형과 사용감", "브랜드 무드", "후기와 신뢰 요소"],
    sections: ["메인 비주얼", "피부 고민 제시", "성분/제형 소개", "사용 방법", "후기/신뢰 요소", "구매 유도"],
    photoConcepts: ["{product} 제품 정면 대표컷", "제형 클로즈업", "성분/원료 합성 이미지", "손에 든 사용 연출컷", "화장대 라이프스타일 컷", "패키지 구성 전체컷", "피부 고민 이미지", "브랜드 무드 배경컷"],
    copyBlocks: {
      hero: "매일의 루틴을 더 산뜻하게 만드는 케어",
      problem: "피부 고민은 다르기 때문에 성분과 사용감을 쉽게 확인할 수 있어야 합니다.",
      trust: "성분, 사용법, 주의사항을 명확하게 정리해 구매 전 불안을 줄입니다.",
      cta: "나에게 맞는 루틴인지 한눈에 판단할 수 있게 구매 포인트를 정리합니다.",
    },
    caution: ["효과 보장 표현 금지", "의학적 치료 표현 금지", "과장된 전후 비교 주의"],
    psdMemo: ["제형컷과 제품컷의 질감 표현 강화", "너무 의료적인 느낌의 그래픽 지양"],
  },
  "생활용품": {
    tone: "실용적, 깔끔함, 문제 해결, 사용 편의성",
    mainMessage: "일상 속 불편함을 제품이 어떻게 해결하는지 쉽고 빠르게 보여줍니다.",
    targetPains: ["사용 전 불편함이 있음", "실제로 편리한지 알고 싶음", "구성/사이즈/사용법을 확인하고 싶음"],
    purchasePoints: ["문제 해결", "사용 편의성", "구성 정보", "비교 포인트"],
    sections: ["문제 제기", "해결 포인트", "제품 장점", "사용 장면", "구성/사이즈 정보", "구매 유도"],
    photoConcepts: ["{product} 대표컷", "사용 전 불편 상황 컷", "사용 장면 연출컷", "제품 디테일컷", "구성품 전체컷", "사이즈 비교컷", "보관/설치 장면", "구매 유도 최종컷"],
    copyBlocks: {
      hero: "일상의 불편함을 더 간단하게",
      problem: "작은 불편함도 반복되면 구매를 고민하게 만드는 이유가 됩니다.",
      trust: "사용법과 구성 정보를 명확하게 보여줘 구매 전 궁금증을 줄입니다.",
      cta: "실제 사용 장면과 장점을 한 번 더 정리해 선택을 돕습니다.",
    },
    caution: ["과도한 비교 비방 금지", "내구성 보장 표현 주의"],
    psdMemo: ["사용 전/후 상황을 명확히 나눠 구성", "정보 카드와 아이콘 적극 활용"],
  },
  "기본": {
    tone: "깔끔함, 정보 전달, 구매 포인트 중심",
    mainMessage: "제품의 핵심 장점과 구매 이유를 명확하게 정리합니다.",
    targetPains: ["제품 장점을 빠르게 이해하고 싶음", "구매 전 필요한 정보를 확인하고 싶음"],
    purchasePoints: ["핵심 장점", "사용 장면", "구성 정보", "구매 유도"],
    sections: ["메인 비주얼", "제품 소개", "핵심 장점", "사용 장면", "제품 정보", "구매 유도"],
    photoConcepts: ["{product} 대표 제품컷", "제품 상세 디테일컷", "사용 장면 연출컷", "구성품 전체컷", "문제 해결 상황컷", "패키지 구성컷", "브랜드 무드 배경컷", "구매 유도용 최종컷"],
    copyBlocks: {
      hero: "제품의 가치를 한눈에 보여주는 상세페이지",
      problem: "고객이 빠르게 이해할 수 있도록 핵심 정보를 정리해야 합니다.",
      trust: "제품 정보와 장점을 명확하게 전달해 구매 판단을 돕습니다.",
      cta: "마지막으로 구매 이유를 정리해 행동을 유도합니다.",
    },
    caution: ["과장 광고 표현 주의", "근거 없는 보장 표현 금지"],
    psdMemo: ["제품 장점이 먼저 보이도록 정보 우선순위 정리"],
  },
};

function categoryDataset(category = product().category) {
  if (category.includes("식품") || category.includes("건강")) return CATEGORY_DATASETS["식품/건강식품"];
  if (category.includes("뷰티") || category.includes("화장품")) return CATEGORY_DATASETS["뷰티/화장품"];
  if (category.includes("생활")) return CATEGORY_DATASETS["생활용품"];
  return CATEGORY_DATASETS["기본"];
}

function templateDataset(template) {
  const libraryItem = templateLibraryItem(template);
  const templateKey = libraryItem?.templateKey || template;
  const categoryTemplates = window.DETAIL_TEMPLATE_DATASET?.categories?.["식품/건강식품"]?.templates || {};
  return categoryTemplates[templateKey] || categoryTemplates["풀비주얼 브랜드형"];
}

function templateVisualClass(template) {
  const libraryItem = templateLibraryItem(template);
  if (libraryItem?.toneClass) return libraryItem.toneClass;
  if (template.includes("스토리")) return "warm";
  if (template.includes("카드") || template.includes("정보")) return "info";
  if (template.includes("전환") || template.includes("문제")) return "problem";
  return "premium";
}

function templateLibraryItem(template) {
  return TEMPLATE_LIBRARY.find((item) => item.name === template || item.id === template);
}

const TEMPLATE_LIBRARY = [
  {
    name: "프리미엄 건강식품 01",
    templateKey: "풀비주얼 브랜드형",
    category: "식품/건강식품",
    purpose: "브랜드",
    difficulty: "고급",
    imageCount: 8,
    mood: "고급/신뢰/선물",
    description: "패키지와 메인 카피를 크게 보여주는 건강식품 프리미엄 상세 템플릿",
    thumb: "full-visual",
    toneClass: "premium",
  },
  {
    name: "선물 패키지형 02",
    templateKey: "풀비주얼 브랜드형",
    category: "식품/건강식품",
    purpose: "선물",
    difficulty: "고급",
    imageCount: 9,
    mood: "선물/고급/브랜드",
    description: "선물용 패키지와 제품 구성을 앞쪽에서 강하게 보여주는 템플릿",
    thumb: "full-visual",
    toneClass: "premium",
  },
  {
    name: "원료 스토리형 01",
    templateKey: "스토리 스크롤형",
    category: "식품/건강식품",
    purpose: "스토리",
    difficulty: "일반",
    imageCount: 8,
    mood: "원료/감성/브랜드",
    description: "원료 이야기와 사용 장면을 순서대로 풀어가는 긴 스크롤 템플릿",
    thumb: "story",
    toneClass: "warm",
  },
  {
    name: "데일리 루틴형 02",
    templateKey: "스토리 스크롤형",
    category: "식품/건강식품",
    purpose: "스토리",
    difficulty: "일반",
    imageCount: 7,
    mood: "일상/간편/감성",
    description: "책상, 가방, 선물 등 일상 장면 중심으로 설득하는 템플릿",
    thumb: "story",
    toneClass: "warm",
  },
  {
    name: "정보 정리형 01",
    templateKey: "카드 정보형",
    category: "식품/건강식품",
    purpose: "정보",
    difficulty: "빠른 제작",
    imageCount: 6,
    mood: "깔끔/정보/신뢰",
    description: "장점, 섭취 방법, 제품 정보를 카드와 표로 빠르게 정리하는 템플릿",
    thumb: "cards",
    toneClass: "info",
  },
  {
    name: "구성표 강조형 02",
    templateKey: "카드 정보형",
    category: "식품/건강식품",
    purpose: "정보",
    difficulty: "빠른 제작",
    imageCount: 5,
    mood: "제품정보/구성/표",
    description: "30포 구성, 원산지, 보관법 등 구매 전 확인 정보를 중심에 두는 템플릿",
    thumb: "cards",
    toneClass: "info",
  },
  {
    name: "구매 설득형 01",
    templateKey: "전환 집중형",
    category: "식품/건강식품",
    purpose: "전환",
    difficulty: "일반",
    imageCount: 7,
    mood: "설득/비교/구매",
    description: "구매 전 고민을 먼저 제시하고 해결 포인트로 전환을 유도하는 템플릿",
    thumb: "conversion",
    toneClass: "problem",
  },
  {
    name: "문제해결 전환형 02",
    templateKey: "전환 집중형",
    category: "생활용품",
    purpose: "전환",
    difficulty: "일반",
    imageCount: 7,
    mood: "문제해결/비교/실용",
    description: "불편함을 제시한 뒤 제품을 해결책으로 보여주는 전환형 템플릿",
    thumb: "conversion",
    toneClass: "problem",
  },
];

const TEMPLATE_RULE_PRESETS = {
  "프리미엄 건강식품 01": {
    profileName: "프리미엄 선물형 상세 템플릿",
    styleKey: "template-premium-gift",
    mode: "brand",
    flow: ["hero", "story", "benefit", "lifestyle", "trust", "info", "cta"],
    layoutSignature: "첫 화면 대형 제품컷 + 원료 스토리 + 선물 패키지 + 신뢰 정보",
    visualGrammar: ["큰 제품컷", "아이보리 배경", "골드 포인트", "원료 감성컷", "선물 패키지 강조"],
    editableParts: ["메인 카피", "제품 이미지", "원료 스토리", "브랜드 컬러", "CTA 문구"],
    imageSlots: ["hero", "origin", "openBox", "package", "lifestyle", "trust", "info"],
    blocks: ["editorialHero", "ingredientMood", "benefitCards", "giftPackage", "trustProof", "purchaseCta"],
    colorSystem: { accent: "#b9822d", bg: "#fffaf0", dark: "#2b241b" },
  },
  "선물 패키지형 02": {
    profileName: "프리미엄 패키지 선물 템플릿",
    styleKey: "template-gift-package",
    mode: "brand",
    flow: ["hero", "lifestyle", "story", "benefit", "trust", "info", "cta"],
    layoutSignature: "패키지 구성컷을 앞쪽에 두고 선물 상황을 강하게 보여주는 구조",
    visualGrammar: ["패키지 스택", "쇼핑백/구성컷", "부드러운 그림자", "선물 배지", "고급 여백"],
    editableParts: ["선물 카피", "패키지 이미지", "구성 정보", "브랜드 컬러", "최종 CTA"],
    imageSlots: ["package", "giftBag", "openBox", "hero", "lifestyle", "trust", "info"],
    blocks: ["giftHero", "packageUnboxing", "benefitCards", "usageScene", "trustProof", "purchaseCta"],
    colorSystem: { accent: "#c06f3a", bg: "#fff7ef", dark: "#2f241f" },
  },
  "원료 스토리형 01": {
    profileName: "원료 스토리 스크롤 템플릿",
    styleKey: "template-origin-story",
    mode: "story",
    flow: ["hero", "story", "lifestyle", "benefit", "trust", "info", "cta"],
    layoutSignature: "원료 이미지와 브랜드 이야기를 긴 스크롤 흐름으로 풀어가는 구조",
    visualGrammar: ["원료 클로즈업", "스토리 타임라인", "따뜻한 배경", "문장형 카피", "감성 사진"],
    editableParts: ["원료 문구", "스토리 순서", "이미지 슬롯", "톤 컬러", "마무리 카피"],
    imageSlots: ["origin", "hero", "lifestyle", "feature", "package", "trust", "info"],
    blocks: ["storyHero", "ingredientMood", "editorialStory", "routineScene", "trustProof", "softCta"],
    colorSystem: { accent: "#d7773f", bg: "#fffaf4", dark: "#32231b" },
  },
  "데일리 루틴형 02": {
    profileName: "데일리 루틴 사용 장면 템플릿",
    styleKey: "template-daily-routine",
    mode: "story",
    flow: ["hero", "lifestyle", "benefit", "story", "trust", "info", "cta"],
    layoutSignature: "하루 사용 장면과 휴대성을 중심으로 구매 이유를 쌓는 구조",
    visualGrammar: ["생활 연출컷", "루틴 카드", "스텝 그래픽", "휴대성 배지", "따뜻한 CTA"],
    editableParts: ["사용 장면", "루틴 문구", "제품컷", "배경 톤", "CTA 문구"],
    imageSlots: ["lifestyle", "stick", "hero", "package", "origin", "trust", "info"],
    blocks: ["routineHero", "usageSteps", "benefitCards", "ingredientMood", "trustProof", "purchaseCta"],
    colorSystem: { accent: "#d88945", bg: "#fff8ef", dark: "#2e251d" },
  },
  "정보 정리형 01": {
    profileName: "정보 정리 카드 템플릿",
    styleKey: "template-info-card",
    mode: "information",
    flow: ["hero", "benefit", "info", "lifestyle", "trust", "cta"],
    layoutSignature: "장점, 섭취 방법, 구성 정보를 카드/표로 빠르게 이해시키는 구조",
    visualGrammar: ["카드 그리드", "아이콘 배지", "표 정보", "짧은 카피", "깨끗한 배경"],
    editableParts: ["장점 카드", "구성 정보", "표 문구", "포인트 컬러", "구매 유도문"],
    imageSlots: ["hero", "feature", "openBox", "info", "lifestyle", "trust", "package"],
    blocks: ["summaryHero", "featureCards", "infoTable", "usageSteps", "trustProof", "purchaseCta"],
    colorSystem: { accent: "#397577", bg: "#f7fbfa", dark: "#203738" },
  },
  "구성표 강조형 02": {
    profileName: "구성 정보 강조 템플릿",
    styleKey: "template-product-spec",
    mode: "information",
    flow: ["hero", "info", "benefit", "trust", "lifestyle", "cta"],
    layoutSignature: "제품 구성, 용량, 보관법 같은 구매 전 확인 정보를 앞쪽에 배치",
    visualGrammar: ["구성표", "제품 라인업", "정보 배지", "체크 리스트", "화이트 카드"],
    editableParts: ["제품 정보표", "구성 이미지", "체크 문구", "포인트 컬러", "CTA"],
    imageSlots: ["openBox", "info", "package", "hero", "feature", "trust", "lifestyle"],
    blocks: ["specHero", "infoTable", "featureCards", "trustProof", "usageScene", "purchaseCta"],
    colorSystem: { accent: "#5f7f8b", bg: "#f8fbfc", dark: "#26343a" },
  },
  "구매 설득형 01": {
    profileName: "전환 집중 구매 설득 템플릿",
    styleKey: "template-conversion-check",
    mode: "conversion",
    flow: ["hero", "benefit", "compare", "trust", "info", "lifestyle", "cta"],
    layoutSignature: "구매 고민을 빠르게 정리하고 비교/체크/CTA로 전환시키는 구조",
    visualGrammar: ["강한 헤드라인", "체크 카드", "비교표", "신뢰 배지", "주문 CTA"],
    editableParts: ["구매 포인트", "비교표", "체크 문구", "CTA 색상", "신뢰 근거"],
    imageSlots: ["hero", "stick", "openBox", "package", "trust", "info", "lifestyle"],
    blocks: ["conversionHero", "benefitCards", "comparison", "trustProof", "infoTable", "strongCta"],
    colorSystem: { accent: "#d16c2f", bg: "#fff8ee", dark: "#30251d" },
  },
  "문제해결 전환형 02": {
    profileName: "문제 해결 전환 템플릿",
    styleKey: "template-problem-solution",
    mode: "conversion",
    flow: ["hero", "problem", "benefit", "compare", "lifestyle", "trust", "info", "cta"],
    layoutSignature: "고객 불편함을 먼저 보여주고 제품을 해결책으로 제시하는 구조",
    visualGrammar: ["문제 제기 박스", "해결 카드", "전후 비교", "사용 장면", "명확한 CTA"],
    editableParts: ["문제 문구", "해결 포인트", "비교 영역", "제품 이미지", "CTA"],
    imageSlots: ["lifestyle", "hero", "feature", "package", "trust", "info"],
    blocks: ["problemHero", "solutionCards", "comparison", "usageScene", "trustProof", "strongCta"],
    colorSystem: { accent: "#397577", bg: "#f5fbfa", dark: "#203738" },
  },
};

function templateDesignRules(template) {
  const item = templateLibraryItem(template);
  const rules = TEMPLATE_RULE_PRESETS[template] || TEMPLATE_RULE_PRESETS[item?.name] || {};
  return {
    source: item?.name || template,
    templateKey: item?.templateKey || template,
    canUseAsSkeleton: true,
    ...rules,
  };
}

function copySlots() {
  const p = product();
  const dataset = categoryDataset(p.category);
  const controls = draftControls();
  if ((p.productName || "").includes("호아비") || p.references.includes("hoabi-product")) {
    return {
      productName: p.productName || "호아비 리치꿀스틱 30포",
      oneLine: controls.mainCopy || p.oneLine || "리치와 꿀이 전하는 하루 한 포의 프리미엄 루틴",
      originStory: p.emphasis || "베트남 리치 원료와 프리미엄 꿀의 조합을 감성적인 원료 스토리로 보여줍니다.",
      benefits: p.usp.length ? p.usp.join(", ") : "리치 원료, 프리미엄 꿀, 개별 스틱 포장, 선물용 패키지",
      usageScene: "가방, 책상, 선물 패키지 안에서 자연스럽게 꺼내 먹는 간편한 데일리 루틴을 제안합니다.",
      giftMessage: "핑크 패키지와 스틱 구성을 활용해 부모님 선물, 직장 동료 선물, 건강 루틴 선물 이미지를 강조합니다.",
      trust: "건강식품 표현 기준을 지키면서 원료, 구성, 보관, 섭취 정보를 명확하게 정리합니다.",
      info: "30포 구성, 스틱형 포장, 원료 정보, 보관 방법, 주의사항을 구매 전 확인하기 쉽게 보여줍니다.",
      problem: "건강을 챙기고 싶지만 번거로운 제품은 부담스러운 고객에게 간편한 한 포 루틴을 제안합니다.",
      difference: "일반 꿀스틱과 달리 리치 원료 스토리, 프리미엄 패키지, 휴대성을 함께 보여줍니다.",
      cta: "선물하기 좋은 건강한 한 포, 호아비 리치꿀스틱으로 하루 루틴을 시작해보세요.",
    };
  }
  return {
    productName: p.productName || "제품명",
    oneLine: controls.mainCopy || p.oneLine || dataset.mainMessage,
    originStory: p.emphasis || dataset.mainMessage,
    benefits: p.usp.length ? p.usp.join(", ") : dataset.purchasePoints.join(", "),
    usageScene: "간편한 섭취/사용 장면과 일상 속 활용 방식을 보여줍니다.",
    giftMessage: "선물용 패키지와 고급스러운 제품 이미지를 함께 강조합니다.",
    trust: dataset.copyBlocks.trust,
    info: "구성, 원산지, 보관 방법, 주의사항 등 구매 전 확인 정보를 정리합니다.",
    problem: dataset.copyBlocks.problem,
    difference: "원료, 구성, 휴대성, 패키지에서 느껴지는 차별점을 비교해 보여줍니다.",
    cta: dataset.copyBlocks.cta,
  };
}

function draftControls() {
  return {
    tone: value("draftTone") || "premium",
    imagePosition: value("draftImagePosition") || "right",
    density: value("draftDensity") || "balanced",
    mainCopy: value("draftMainCopy"),
  };
}

function draftAccent(tone) {
  const accents = {
    premium: { accent: "#c66b2d", bg: "#fff8ed", dark: "#2f2923" },
    fresh: { accent: "#4f8f68", bg: "#f3faf3", dark: "#223c2d" },
    clean: { accent: "#6f7f8a", bg: "#fbfbf8", dark: "#2f3438" },
    warm: { accent: "#d7773f", bg: "#fff3e8", dark: "#3a2418" },
    dark: { accent: "#b88a4a", bg: "#f7f1e8", dark: "#25211d" },
  };
  return accents[tone] || accents.premium;
}

function photoConcepts() {
  const p = product();
  const name = p.productName || "제품";
  if (name.includes("호아비") || p.references.includes("hoabi-product")) {
    return [
      "가정에서 리치꿀스틱을 음료 또는 요거트와 함께 즐기는 장면",
      "가방이나 파우치에 넣고 야외에서 간편하게 꺼내는 휴대 장면",
      "스틱 포장과 리치꿀 텍스처를 강조한 클로즈업 샷",
      "사람이 스틱을 손에 들고 섭취하는 라이프스타일 장면",
      "핑크/아이보리 배경의 미니멀 스튜디오 제품 세팅",
      "고급 상업 광고 느낌의 패키지 히어로 샷",
      "직장 책상 위에 두고 하루 루틴으로 챙기는 실용 사용 장면",
      "리치 원물과 꿀의 흐름을 함께 보여주는 창의적 합성 장면",
      "상세페이지 첫 화면에 사용할 제품 중심 히어로 컷",
    ];
  }
  return categoryDataset(p.category).photoConcepts.map((item) => item.replace("{product}", name));
}

function detailImageSet() {
  const p = product();
  if (p.productName.includes("호아비") || p.references.includes("hoabi-detail")) {
    return {
      hero: "assets/hoabi-mybox/hoabi-package-front-crop.png",
      origin: "assets/hoabi-detail/hoabi-section-02.jpg",
      feature: "assets/hoabi-mybox/hoabi-stick-single-crop.png",
      lifestyle: "assets/hoabi-product/hoabi-lifestyle-package.jfif",
      package: "assets/hoabi-mybox/hoabi-package-front-crop.png",
      trust: "assets/hoabi-detail/hoabi-section-08.jpg",
      info: "assets/hoabi-mybox/hoabi-product-info.jpg",
      boxYellow: "assets/hoabi-mybox/hoabi-box-yellow-crop.png",
      boxPink: "assets/hoabi-mybox/hoabi-box-pink-crop.png",
      openBox: "assets/hoabi-mybox/hoabi-open-box-30p-crop.png",
      giftBag: "assets/hoabi-mybox/hoabi-shopping-bag-crop.png",
      stick: "assets/hoabi-mybox/hoabi-stick-single-crop.png",
      referenceSections: [
        "assets/hoabi-detail/hoabi-section-01.jpg",
        "assets/hoabi-detail/hoabi-section-02.jpg",
        "assets/hoabi-detail/hoabi-section-03.jpg",
        "assets/hoabi-detail/hoabi-section-04.jpg",
        "assets/hoabi-detail/hoabi-section-05.jpg",
        "assets/hoabi-detail/hoabi-section-06.jpg",
        "assets/hoabi-detail/hoabi-section-07.jpg",
        "assets/hoabi-detail/hoabi-section-08.jpg",
        "assets/hoabi-detail/hoabi-section-09.jpg",
        "assets/hoabi-detail/hoabi-section-10.jpg",
        "assets/hoabi-detail/hoabi-section-11.jpg",
        "assets/hoabi-detail/hoabi-section-12.jpg",
      ],
      figmaReferences: [
        "assets/figma-hoabi/detail-story.jpg",
        "assets/figma-hoabi/detail-trust.jpg",
        "assets/figma-hoabi/lifestyle.jpg",
        "assets/figma-hoabi/open-box.jpg",
      ],
    };
  }
  return null;
}

function templateTone(template) {
  const libraryItem = TEMPLATE_LIBRARY.find((item) => item.name === template);
  const templateKey = libraryItem?.templateKey || template;
  const map = {
    "풀비주얼 브랜드형": {
      tone: "큰 메인 비주얼, 넓은 여백, 제품 중심의 첫인상 구성",
      colors: "고객 작성폼의 색감 방향과 담당자 보정값을 기준으로 적용",
      focus: "제품 이미지, 메인 카피, 브랜드 첫인상",
    },
    "스토리 스크롤형": {
      tone: "상황별 장면과 원료 이야기를 순서대로 보여주는 세로형 구성",
      colors: "고객 작성폼의 색감 방향과 담당자 보정값을 기준으로 적용",
      focus: "브랜드 스토리, 사용 장면, 선물 상황",
    },
    "카드 정보형": {
      tone: "장점과 정보를 카드, 아이콘, 표로 정리하는 구조",
      colors: "고객 작성폼의 색감 방향과 담당자 보정값을 기준으로 적용",
      focus: "제품 장점, 구성, 사용법, 구매 판단 정보",
    },
    "전환 집중형": {
      tone: "구매 포인트와 신뢰 요소를 앞쪽에 배치하는 전환 중심 구조",
      colors: "고객 작성폼의 색감 방향과 담당자 보정값을 기준으로 적용",
      focus: "구매 포인트, 신뢰 요소, 선택 이유",
    },
    "프리미엄 브랜드형": {
      tone: "여백 중심, 고급 타이포그래피, 정돈된 브랜드 무드",
      colors: "아이보리, 화이트, 골드, 오렌지 포인트",
      focus: "원료 가치, 패키지, 선물성, 프리미엄 이미지",
    },
    "감성 스토리형": {
      tone: "따뜻한 사진, 부드러운 카피, 생활 장면 중심",
      colors: "오렌지, 아이보리, 화이트, 부드러운 브라운",
      focus: "선물 상황, 일상 루틴, 감성 구매 동기",
    },
    "정보 전달형": {
      tone: "깔끔한 카드, 아이콘, 표 중심의 명확한 구성",
      colors: "화이트, 라이트그레이, 블루 또는 그린 포인트",
      focus: "제품 장점, 구성, 사용법, 구매 판단 정보",
    },
    "문제 해결형": {
      tone: "고민 제시 후 해결 흐름으로 설득하는 구성",
      colors: "화이트, 라이트그레이, 오렌지 또는 블루 포인트",
      focus: "고객 불편, 해결 포인트, 사용 편의성",
    },
  };
  return map[templateKey] || map["풀비주얼 브랜드형"];
}

function generatePlanText() {
  const p = product();
  const dataset = categoryDataset(p.category);
  const targets = p.target.join(", ") || "주요 타깃 미선택";
  const usps = p.usp.join(", ") || "핵심 USP 미선택";
  const avoids = [...new Set([...p.avoid, ...dataset.caution])].join(", ") || "금지 요소 미선택";

  return `[제품 요약]
제품명: ${p.productName}
카테고리: ${p.category}
제품 한 줄 설명: ${p.oneLine}
카테고리 기준 톤: ${dataset.tone}
핵심 판매 메시지: ${p.emphasis || dataset.mainMessage}

[타깃 분석]
주요 타깃: ${targets}
타깃의 고민:
${dataset.targetPains.map((item, index) => `${index + 1}. ${item}`).join("\n")}

구매 동기:
${dataset.purchasePoints.map((item, index) => `${index + 1}. ${item}`).join("\n")}

[구매 포인트]
1. ${p.usp[0] || dataset.purchasePoints[0]} 중심의 차별화 포인트
2. ${p.usp[1] || dataset.purchasePoints[1]}을 활용한 신뢰감
3. ${p.usp[2] || dataset.purchasePoints[2]}을 통한 구매 설득

[상세페이지 핵심 컨셉]
메인 컨셉: ${p.direction.join(" + ") || "기획 방향"} 상세페이지
전체 톤앤무드: ${p.goal.join(", ") || "구매 전환과 신뢰 형성"}
콘텐츠 비중:
${p.contentRatio || "메인 비주얼 15% / 제품 스토리 20% / 핵심 장점 25% / 신뢰 정보 20% / 구매 유도 20%"}

[상세페이지 전체 흐름]
${dataset.sections.map((item, index) => `${index + 1}. ${item}`).join("\n")}

[섹션별 카피 방향]
메인: ${dataset.copyBlocks.hero}
문제 제기: ${dataset.copyBlocks.problem}
신뢰 문구: ${dataset.copyBlocks.trust}
구매 유도: ${dataset.copyBlocks.cta}

[촬영/합성 방향]
${photoConcepts().map((item, index) => `${index + 1}. ${item}`).join("\n")}

[디자이너 전달 메모]
${p.optionMemo || p.clientRequests || dataset.psdMemo.join("\n")}

[고객 입력 핵심 메모]
${p.emphasis || "고객 강조점이 있으면 이 영역에 반영됩니다."}

[광고/표현 주의사항]
피해야 할 요소: ${avoids}
금지 표현: ${p.banWords || "질병 치료, 효능 보장, 의약품 오인 표현"}
`;
}

function isGeneratedText(selector, placeholder) {
  const text = $(selector)?.textContent.trim() || "";
  return text && text !== placeholder && !text.includes("여기에 표시됩니다") && !text.includes("생성 중");
}

function setStepDone(target, done) {
  const step = $(`.step[data-target="${target}"]`);
  if (!step) return;
  step.classList.toggle("done", Boolean(done));
}

function workflowFlags() {
  return {
    hasProject: Boolean(value("productName")),
    hasBrief: Boolean(value("consultSummary") || value("clientRequests") || value("emphasis")),
    hasDrafts: Boolean($("#draftA")?.innerHTML.includes("long-detail-preview")),
    hasClientMail: isGeneratedText("#clientMailResult", "시안 생성 후 고객에게 보낼 메일 초안이 여기에 표시됩니다."),
    hasFeedback: Boolean(value("clientReply") || value("managerMemo")),
    hasRevision: isGeneratedText("#revisionResult", "고객 피드백을 반영한 수정 시안 요약이 여기에 표시됩니다."),
    hasHandoff: isGeneratedText("#handoffResult", "PSD 작업 지시서와 바이버 메시지가 여기에 표시됩니다."),
    hasReview: $$("#review input[type='checkbox']:checked").length > 0,
    hasFinalMail: isGeneratedText("#finalMail", "최종 납품 메일 초안이 여기에 표시됩니다."),
  };
}

function nextWorkflowAction() {
  const flags = workflowFlags();
  if (!flags.hasProject) {
    return {
      target: "projects",
      action: "",
      title: "고객 접수 프로젝트를 먼저 불러오세요",
      detail: "고객 작성폼에서 들어온 접수건을 선택하거나 호아비 테스트 접수건을 추가해 프로젝트를 시작합니다.",
      button: "프로젝트 확인",
    };
  }
  if (!flags.hasBrief) {
    return {
      target: "brief",
      action: "",
      title: "상담/자료 내용을 확인하세요",
      detail: "고객이 입력한 요청사항, 강조점, 금지 표현, 참고자료를 확인한 뒤 부족한 부분만 보완합니다.",
      button: "자료 확인으로 이동",
    };
  }
  if (!flags.hasDrafts) {
    return {
      target: "drafts",
      action: "drafts",
      title: "A/B 상세페이지 시안을 생성하세요",
      detail: "내부 AI 워크플로우가 제품 분석, 디자인 전략, 섹션 구성, A/B 시안을 백그라운드에서 준비합니다.",
      button: "A/B 시안 생성",
    };
  }
  if (!flags.hasClientMail) {
    return {
      target: "drafts",
      action: "clientMail",
      title: "고객에게 보낼 메일 초안을 준비하세요",
      detail: "A/B 시안이 생성되었습니다. 발송 전 점검 후 고객에게 방향성 선택 메일을 보낼 수 있습니다.",
      button: "메일 초안 생성",
    };
  }
  if (!flags.hasFeedback) {
    return {
      target: "feedback",
      action: "",
      title: "고객 회신을 기다리거나 피드백을 입력하세요",
      detail: "고객이 선택한 A/B 방향과 수정 요청을 입력하면 AI가 수정 방향을 정리합니다.",
      button: "피드백 입력",
    };
  }
  if (!flags.hasRevision) {
    return {
      target: "revision",
      action: "revision",
      title: "고객 피드백 기반 수정 시안을 생성하세요",
      detail: "고객 요청을 섹션별 수정사항과 우선순위로 정리하고, 컨펌 요청 메일을 준비합니다.",
      button: "수정 시안 생성",
    };
  }
  if (!flags.hasHandoff) {
    return {
      target: "psd",
      action: "handoff",
      title: "제작 전달 패키지를 생성하세요",
      detail: "최종 컨펌된 시안을 기준으로 PSD 또는 Figma 작업 지시서를 생성합니다.",
      button: value("productionRoute") === "figma" ? "Figma 패키지 생성" : "PSD 지시서 생성",
    };
  }
  if (!flags.hasReview) {
    return {
      target: "review",
      action: "",
      title: "내부 검수를 진행하세요",
      detail: "디자인 일치, 문구 오류, 이미지 품질, 레이어 구성을 확인해 납품 전 리스크를 줄입니다.",
      button: "검수 화면으로 이동",
    };
  }
  if (!flags.hasFinalMail) {
    return {
      target: "delivery",
      action: "finalMail",
      title: "최종 납품 메일을 생성하세요",
      detail: "PNG/JPG, 분할 이미지, 선택 PSD 원본 등 납품 범위를 확인하고 최종 메일을 준비합니다.",
      button: "납품 메일 생성",
    };
  }
  return {
    target: "delivery",
    action: "",
    title: "프로젝트 납품 준비가 완료되었습니다",
    detail: "최종 파일과 납품 메일을 확인한 뒤 고객에게 전달하면 됩니다.",
    button: "최종 납품 확인",
    done: true,
  };
}

function renderOperatorNextPanel() {
  const panel = $("#operatorNextPanel");
  if (!panel) return;
  const next = nextWorkflowAction();
  panel.classList.toggle("complete", Boolean(next.done));
  panel.innerHTML = `
    <div>
      <span>${next.done ? "완료 대기" : "추천 다음 작업"}</span>
      <strong>${escapeHtml(next.title)}</strong>
      <p>${escapeHtml(next.detail)}</p>
    </div>
    <button class="${next.done ? "secondary" : "primary"} small" id="nextActionButton" type="button" data-next-target="${escapeHtml(next.target)}" data-next-action="${escapeHtml(next.action || "")}">${escapeHtml(next.button)}</button>
  `;
}

function updateWorkflowState() {
  const flags = workflowFlags();
  setStepDone("projects", flags.hasProject);
  setStepDone("brief", flags.hasBrief);
  setStepDone("planning", isGeneratedText("#planResult", "기획 결과가 여기에 표시됩니다."));
  setStepDone("drafts", flags.hasDrafts);
  setStepDone("feedback", flags.hasFeedback);
  setStepDone("revision", flags.hasRevision);
  setStepDone("psd", flags.hasHandoff);
  setStepDone("review", flags.hasReview);
  setStepDone("delivery", flags.hasFinalMail);
  renderOperatorNextPanel();
  renderProductionHandoffPreflight();
}

async function generatePlan() {
  const fallback = generatePlanText();
  $("#planResult").textContent = "AI 기획을 생성 중입니다...";
  try {
    const aiText = await invokeAiRole("planning", "상세페이지 AI 기획 결과 생성", {
      product: product(),
      requiredSections: ["제품 요약", "타깃 분석", "구매 포인트", "상세페이지 핵심 컨셉", "상세페이지 전체 흐름", "섹션별 기획", "디자이너 전달 메모", "광고/표현 주의사항"],
    }, fallback);
    $("#planResult").textContent = aiText || fallback;
    updateAiStatus("AI 기획 생성 완료");
  } catch (error) {
    $("#planResult").textContent = `${fallback}\n\n[AI 연결 안내]\nOpenAI 호출에 실패해 규칙 기반 결과로 대체했습니다.\n사유: ${error.message}`;
    updateAiStatus("AI 호출 실패. 규칙 기반 결과로 대체했습니다.");
  }
  updateWorkflowState();
}

async function prepareInternalAiPlanning() {
  const placeholder = "기획 결과가 여기에 표시됩니다.";
  const current = $("#planResult")?.textContent.trim() || "";
  if (!value("productName")) return;
  if (current && current !== placeholder && !current.includes("여기에 표시됩니다")) return;
  const fallback = generatePlanText();
  try {
    const aiText = await invokeAiRole("planning", "백그라운드 상세페이지 기획/디자인 전략 생성", {
      product: product(),
      requiredSections: ["제품 분석", "타깃 분석", "디자인 컨셉", "디자인 전략", "섹션 구성", "레이아웃 설계"],
      hiddenWorkflow: true,
    }, fallback);
    if ($("#planResult")) $("#planResult").textContent = aiText || fallback;
  } catch {
    if ($("#planResult")) $("#planResult").textContent = fallback;
  }
  updateWorkflowState();
}

function draftText(label, template) {
  const p = product();
  const tone = templateTone(template);
  const title = template === "감성 스토리형"
    ? "소중한 사람에게 전하는 달콤한 건강 한 포"
    : template === "정보 전달형"
      ? "한눈에 확인하는 제품의 핵심 가치"
      : template === "문제 해결형"
        ? "매일 챙기기 어려운 루틴, 간편하게 시작하세요"
        : "리치와 꿀이 담긴 하루 한 포의 프리미엄 루틴";

  return `[${label}] ${template}

시안 한 줄 설명:
${tone.focus}을 중심으로 ${p.productName}의 구매 가치를 보여주는 방향입니다.

디자인 톤:
${tone.tone}

주요 색상:
${tone.colors}

메인 카피:
${title}

서브 카피:
${p.oneLine}

섹션 구성:
1. 메인 비주얼
   - 목적: 첫 화면에서 제품 이미지와 핵심 메시지를 전달
   - 이미지 방향: 패키지 정면컷, 제품 연출컷

2. 원료/브랜드 스토리
   - 목적: ${p.usp.join(", ") || "제품 차별점"}을 설득력 있게 소개
   - 이미지 방향: 원료 이미지, 브랜드 감성 이미지

3. 제품 특징
   - 목적: 핵심 장점 3가지를 빠르게 이해시킴
   - 이미지 방향: 아이콘, 카드, 제품 상세컷

4. 선물/사용 장면
   - 목적: 실제 구매 상황을 구체화
   - 이미지 방향: 선물 패키지, 책상/가방/생활 연출

5. 제품 정보
   - 목적: 구성, 원산지, 보관 방법 등 구매 전 정보 정리
   - 이미지 방향: 정보표, 제품 후면, 구성컷

고객 선택 포인트:
${template}은 ${tone.focus}이 중요한 고객에게 적합합니다.

디자이너 작업 메모:
선택 템플릿의 분위기를 유지하고, ${p.avoid.join(", ") || "피해야 할 요소"}는 적용하지 않습니다.`;
}

function isCustomerPreviewMode() {
  return $(".draft-workspace")?.classList.contains("customer-preview-mode") ?? true;
}

function draftMarkup(label, template, options = {}) {
  const tone = templateTone(template);
  const p = product();
  const dataset = categoryDataset(p.category);
  const templateData = templateDataset(template);
  const slots = copySlots();
  const images = detailImageSet();
  const visualClass = templateVisualClass(template);
  const controls = draftControls();
  const blueprint = generateDetailBlueprint(label, template, templateData, controls, latestDesignWorkflow());
  const accent = blueprint.colorSystem || draftAccent(controls.tone);
  const concept = designConcept(label, template);
  const referenceStyle = referenceStyleForDraft(label, template);
  const editKey = label.includes("B") ? "B" : "A";
  const customerOnly = options.customerOnly ?? isCustomerPreviewMode();
  const sections = blueprint.sections;
  const orderedSections = orderedSectionsForDraft(sections, editKey);
  const draftKeyClass = label.includes("B") ? "ab-version-b" : "ab-version-a";
  const previewTitle = label.includes("B") ? "B안 전환 집중형 상세페이지" : "A안 프리미엄 브랜드형 상세페이지";
  const previewCopy = label.includes("B")
    ? "구매 포인트와 신뢰 정보를 앞쪽에 배치해 빠른 선택을 유도하는 방향입니다."
    : "제품 이미지, 원료 스토리, 선물 가치를 고급스럽게 보여주는 방향입니다.";
  const useSalesRenderer = shouldUseSalesDesignRenderer(p, blueprint);
  const templateRules = blueprint.templateRules || templateDesignRules(template);
  const renderedDraft = renderedDraftAsset(label, p);
  const detailSectionsHtml = customerOnly && useSalesRenderer
    ? `<div class="sales-detail-page sales-${label.includes("B") ? "conversion" : "premium"}">${salesAmbientProductLayer(label.includes("B"))}${salesTemplateMixDetailPage(p, images, label.includes("B"), blueprint.profile.industry, slots.productName || p.productName || "제품명", slots.oneLine || dataset.copyBlocks.hero, p.usp.length ? p.usp : fallbackUspForIndustry(blueprint.profile.industry), p.highlight.length ? p.highlight : dataset.purchasePoints)}</div>`
    : useSalesRenderer
    ? salesDetailPageMarkup(label, template, slots, images, dataset, concept, sectionEdits[editKey], blueprint)
    : orderedSections.map((section, index) => {
      const originalIndex = section.__originalIndex ?? index;
      return detailSectionMarkup(section, index, label, template, slots, images, dataset, concept, sectionEdits[editKey]?.[originalIndex], blueprint);
    }).join("");

  return `
    <div class="long-detail-preview ${useSalesRenderer ? "sales-detail-renderer" : ""} ${draftKeyClass} ${visualClass} ${concept.className} industry-${blueprint.profile.industry} style-${blueprint.profile.styleKey} image-${controls.imagePosition} density-${controls.density}" style="--draft-accent:${accent.accent};--draft-bg:${accent.bg};--draft-dark:${accent.dark};">
      <div class="customer-draft-label">
        <span>${escapeHtml(label)}</span>
        <div>
          <strong>${escapeHtml(previewTitle)}</strong>
          <p>${escapeHtml(previewCopy)}</p>
        </div>
      </div>
      <div class="design-concept-strip">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(blueprint.profile.name)}</strong>
        <em>${escapeHtml(referenceStyle.name)} · ${escapeHtml(blueprint.profile.mode)}</em>
      </div>
      <div class="reference-style-strip">
        <b>AI DESIGN STRATEGY</b>
        <span>${escapeHtml(blueprint.summary)}</span>
      </div>
      ${renderedDraft ? `
        <figure class="rendered-draft-preview">
          <img src="${renderedDraft}" alt="${escapeHtml(`${label} 고객 발송용 렌더 시안`)}">
        </figure>
      ` : ""}
      ${detailSectionsHtml}
    </div>
    ${customerOnly ? "" : `<div class="draft-summary">
      <h3>${escapeHtml(label)} ${escapeHtml(template)}</h3>
      <p><strong>형태</strong> 세로형 상세페이지 디자인 시안</p>
      <p><strong>디자인</strong> ${escapeHtml(concept.title)} / ${escapeHtml(referenceStyle.name)}</p>
      <p><strong>메인 카피</strong> ${escapeHtml(slots.oneLine || dataset.copyBlocks.hero)}</p>
      <p><strong>템플릿 의도</strong> ${escapeHtml(templateData?.intent || tone.focus)}</p>
      <ul>
        <li>레이아웃: ${escapeHtml(tone.tone)}</li>
        <li>템플릿 골격: ${escapeHtml(templateRules.layoutSignature || "선택 템플릿 기준 섹션 구조")}</li>
        <li>디자인 문법: ${escapeHtml((templateRules.visualGrammar || []).slice(0, 5).join(" / ") || "제품 이미지, 정보 위계, CTA")}</li>
        <li>수정 가능 영역: ${escapeHtml((templateRules.editableParts || []).slice(0, 5).join(" / ") || "문구 / 이미지 / 색상 / 섹션")}</li>
        <li>생성 전략: ${escapeHtml(blueprint.profile.name)} / ${escapeHtml(blueprint.profile.focus || blueprint.profile.styleKey)}</li>
        <li>이미지 전략: ${escapeHtml(blueprint.profile.imageStrategy)}</li>
        <li>이미지 AI 계획: ${blueprint.imagePlan.length}개 촬영/합성 프롬프트 연결</li>
        <li>적용 기준: 업종, 제품 특성, 고객 선택 방향, 강조 요소</li>
        <li>강조: ${escapeHtml(p.usp.join(", ") || "제품 핵심 USP")}</li>
      </ul>
      <div class="draft-quality-grid">
        <div><b>섹션 수</b><span>${sections.length}개 긴 세로형 구성</span></div>
        <div><b>이미지 구조</b><span>대표컷 / 디테일컷 / 스토리컷 역할 분리</span></div>
        <div><b>디자인 블록</b><span>카드, 비교표, CTA, 신뢰 요소 자동 배치</span></div>
        <div><b>A/B 차별화</b><span>${escapeHtml(concept.keywords)}</span></div>
      </div>
    </div>`}
  `;
}

function renderedDraftAsset(label, p = product()) {
  const isHoabi = (p.productName || "").includes("호아비") || (p.references || "").includes("hoabi");
  if (!isHoabi) return "";
  return label.includes("B")
    ? "assets/rendered-drafts/hoabi-rendered-b.jpg"
    : "assets/rendered-drafts/hoabi-rendered-a.jpg";
}

function referenceStyleForDraft(label, template) {
  const p = product();
  const isB = label.includes("B");
  const isHoabi = (p.productName || "").includes("호아비") || (p.references || "").includes("hoabi");
  if (isHoabi) {
    return isB
      ? {
          id: "hoabi-conversion",
          name: "호아비 정보전달형",
          description: "30포 구성, 휴대성, 선물 패키지, 제품 정보를 빠르게 확인할 수 있는 호아비 전용 구성",
        }
      : {
          id: "hoabi-premium",
          name: "호아비 프리미엄 선물형",
          description: "리치 원료, 프리미엄 꿀, 핑크 패키지, 선물 이미지를 중심으로 구성한 호아비 전용 무드",
        };
  }
  if (p.category.includes("식품") || p.category.includes("건강")) {
    return isB
      ? {
          id: "health-commerce",
          name: "건강식품 정보전달형",
          description: "구성, 섭취 편의성, 신뢰 정보, 구매 판단 요소를 빠르게 정리하는 구성",
        }
      : {
          id: "food-ingredient",
          name: "원료 프리미엄형",
          description: "원료, 패키지, 신뢰 정보, 브랜드 무드를 중심으로 구성",
        };
  }
  if (p.category.includes("생활")) {
    return isB
      ? { id: "premium-lifestyle-product", name: "문제해결 전환형", description: "문제 제기 후 제품 해결 구조를 강하게 배치" }
      : { id: "premium-lifestyle-product", name: "감성 제품컷형", description: "감성 제품컷과 넓은 여백을 중심으로 구성" };
  }
  return isB
    ? { id: "commerce", name: "커머스 전환형", description: "배지, 카드, 비교표 중심의 판매형 구성" }
    : { id: "premium", name: "프리미엄 브랜드형", description: "여백, 사진, 브랜드 무드 중심의 자사몰형 구성" };
}

function designConcept(label, template) {
  const isB = label.includes("B");
  if (isB) {
    return {
      className: "concept-graphic",
      title: "Trendy Graphic Commerce",
      keywords: "Bold Color / Badge / Card / Conversion",
      badge: "TRENDY",
      cta: "구매 포인트 한눈에 보기",
    };
  }
  return {
    className: "concept-premium",
    title: "Premium Brand Editorial",
    keywords: "Luxury / Minimal / White Space / Gift",
    badge: "PREMIUM",
    cta: "프리미엄 선물 루틴 제안",
  };
}

function shouldUseSalesDesignRenderer(p = product(), blueprint = {}) {
  const text = `${p.productName} ${p.category} ${p.references}`.toLowerCase();
  const industry = normalizeIndustryKey(blueprint.profile?.industry || inferProductIndustry(p));
  return ["health", "beauty", "living", "fashion", "commerce"].includes(industry)
    || text.includes("호아비")
    || text.includes("꿀")
    || text.includes("건강");
}

function editedValue(edits = [], index, key, fallback) {
  return edits?.[index]?.[key] || fallback;
}

function editedImageSlot(edits = [], index, fallback) {
  return edits?.[index]?.imageSlot || fallback;
}

function salesSectionStyle(edits = [], index) {
  const color = edits?.[index]?.color;
  const key = activeDraftKeyFromEdits(edits);
  const order = sectionOrderValue(key, index);
  const style = [];
  if (color && color !== "auto") style.push(`--draft-accent:${escapeHtml(color)};`);
  if (order !== index) style.push(`order:${order};`);
  return style.length ? ` style="${style.join("")}"` : "";
}

function activeDraftKeyFromEdits(edits = []) {
  if (edits === sectionEdits.B) return "B";
  return "A";
}

function normalizeSectionOrder(key, length) {
  const existing = Array.isArray(sectionOrders[key]) ? sectionOrders[key] : [];
  const valid = existing.filter((index) => Number.isInteger(index) && index >= 0 && index < length);
  const missing = Array.from({ length }, (_, index) => index).filter((index) => !valid.includes(index));
  const next = [...valid, ...missing];
  sectionOrders[key] = next;
  return next;
}

function sectionOrderValue(key, originalIndex) {
  const order = normalizeSectionOrder(key, Math.max(originalIndex + 1, editableSectionsForDraft(key).length || originalIndex + 1));
  const position = order.indexOf(originalIndex);
  return position >= 0 ? position : originalIndex;
}

function orderedSectionsForDraft(sections = [], key = activeSectionDraft) {
  const order = normalizeSectionOrder(key, sections.length);
  return order.map((originalIndex) => ({
    ...sections[originalIndex],
    __originalIndex: originalIndex,
  })).filter(Boolean);
}

function moveActiveSection(delta) {
  collectSectionEdits();
  const sections = editableSectionsForDraft(activeSectionDraft);
  const order = normalizeSectionOrder(activeSectionDraft, sections.length);
  const currentOriginal = orderedSectionsForDraft(sections, activeSectionDraft)[activeSectionIndex]?.__originalIndex ?? activeSectionIndex;
  const currentPosition = order.indexOf(currentOriginal);
  const nextPosition = Math.min(Math.max(currentPosition + delta, 0), order.length - 1);
  if (currentPosition < 0 || currentPosition === nextPosition) return;
  const [moved] = order.splice(currentPosition, 1);
  order.splice(nextPosition, 0, moved);
  sectionOrders[activeSectionDraft] = order;
  activeSectionIndex = nextPosition;
  renderDraftPreviewsOnly();
  renderSectionEditor();
  scrollActiveDraftSection();
}

function salesSectionClass(edits = [], index, base = "", fallbackVariant = "") {
  const variant = edits?.[index]?.variant && edits[index].variant !== "auto" ? edits[index].variant : fallbackVariant;
  return `${base}${variant && variant !== "auto" ? ` sales-variant-${escapeHtml(variant)}` : ""}`;
}

function salesIndustryCopyDefaults(industry = "commerce", isB = false, dataset = categoryDataset(product().category)) {
  industry = normalizeIndustryKey(industry);
  const defaults = {
    health: {
      storyTitle: isB ? "왜 이 제품을 선택해야 할까요?" : "원료와 패키지가 만든 프리미엄 스토리",
      benefitTitle: isB ? "구매 전 확인해야 할 4가지 포인트" : "하루 루틴에 담은 핵심 가치",
      sceneTitle: isB ? "언제 어디서나 간편하게" : "선물하기 좋은 건강한 루틴",
      trustTitle: "건강식품은 신뢰 정보가 중요합니다",
      infoTitle: "제품 정보를 한눈에 확인하세요",
      ctaTitle: isB ? "선택이 쉬워지는 프리미엄 건강 루틴" : "소중한 사람에게 전하는 프리미엄 한 포",
    },
    beauty: {
      storyTitle: isB ? "피부 고민에서 시작하는 선택 이유" : "브랜드 감성과 제형이 만나는 스토리",
      benefitTitle: isB ? "구매 전 확인할 뷰티 포인트" : "루틴 속에서 느껴지는 핵심 가치",
      sceneTitle: isB ? "사용 순서가 바로 보이는 루틴" : "매일 손이 가는 감성 케어 장면",
      trustTitle: "뷰티 제품은 성분과 사용 정보가 중요합니다",
      infoTitle: "사용법과 제품 정보를 한눈에 확인하세요",
      ctaTitle: isB ? "고민에 맞는 뷰티 루틴 선택" : "나를 위한 감성 케어 루틴",
    },
    living: {
      storyTitle: isB ? "불편함을 해결하는 이유" : "생활 장면에서 시작하는 제품 스토리",
      benefitTitle: isB ? "구매 전 비교해야 할 실용 포인트" : "일상을 더 편하게 만드는 핵심 가치",
      sceneTitle: isB ? "사용 방법이 바로 이해되는 장면" : "공간에 자연스럽게 들어오는 사용 장면",
      trustTitle: "생활용품은 실사용 정보가 중요합니다",
      infoTitle: "구성, 크기, 사용 정보를 확인하세요",
      ctaTitle: isB ? "실용적인 선택을 돕는 구매 포인트" : "일상을 정돈하는 제품 선택",
    },
    fashion: {
      storyTitle: isB ? "스타일 선택을 돕는 포인트" : "브랜드 무드와 착용 스토리",
      benefitTitle: isB ? "구매 전 확인할 핏과 디테일" : "룩을 완성하는 핵심 가치",
      sceneTitle: isB ? "착용 장면과 활용도를 확인하세요" : "일상에 어울리는 스타일링 장면",
      trustTitle: "패션 제품은 소재와 사이즈 정보가 중요합니다",
      infoTitle: "옵션과 제품 정보를 한눈에 확인하세요",
      ctaTitle: isB ? "선택이 쉬워지는 스타일 포인트" : "오늘의 룩을 완성하는 선택",
    },
    commerce: {
      storyTitle: isB ? "왜 이 제품을 선택해야 할까요?" : "브랜드와 제품 가치 스토리",
      benefitTitle: isB ? "구매 전 확인해야 할 핵심 포인트" : "제품에 담긴 핵심 가치",
      sceneTitle: isB ? "사용 장면을 빠르게 확인하세요" : "일상 속 자연스러운 사용 장면",
      trustTitle: "구매 전 신뢰 정보가 중요합니다",
      infoTitle: "제품 정보를 한눈에 확인하세요",
      ctaTitle: isB ? "선택이 쉬워지는 구매 포인트" : "가치를 확인하고 선택하세요",
    },
  };
  return defaults[industry] || {
    ...defaults.commerce,
    storyTitle: dataset.sections?.[1] || defaults.commerce.storyTitle,
  };
}

function fallbackUspForIndustry(industry = "commerce") {
  industry = normalizeIndustryKey(industry);
  const map = {
    health: ["원료 신뢰", "프리미엄 구성", "간편한 루틴", "선물용 패키지"],
    beauty: ["감성 제형", "피부 고민 케어", "데일리 루틴", "브랜드 무드"],
    living: ["문제 해결", "사용 편의성", "공간 정돈", "실용적 구성"],
    fashion: ["브랜드 무드", "착용 핏", "소재 디테일", "스타일링"],
    commerce: ["제품 가치", "핵심 장점", "사용 장면", "구매 신뢰"],
  };
  return map[industry] || map.commerce;
}

function autoPolishDraftSections(workflow = latestDesignWorkflow()) {
  const industry = workflow?.analysis?.industry || inferProductIndustry();
  const polish = {
    health: {
      A: {
        variants: ["photo-focus", "editorial", "editorial", "premium-card", "photo-focus", "photo-focus", "editorial", "premium-card", "premium-card", "premium-card"],
        colors: ["#b9822d", "#b88a2a", "#c66b2d", "#c66b2d", "#d7773f", "#b9822d", "#8b6f55", "#b9822d", "#1f1b17", "#1f1b17"],
        imageSlots: ["hero", "origin", "boxPink", "feature", "lifestyle", "giftBag", "trust", "info", "package", "package"],
      },
      B: {
        variants: ["graphic-badge", "graphic-badge", "conversion", "graphic-badge", "photo-focus", "photo-focus", "premium-card", "premium-card", "conversion", "graphic-badge"],
        colors: ["#d16c2f", "#c56a2d", "#d16c2f", "#d16c2f", "#b9822d", "#c56a2d", "#5f5144", "#d16c2f", "#1f1b17", "#1f1b17"],
        imageSlots: ["hero", "stick", "openBox", "feature", "giftBag", "stick", "trust", "info", "openBox", "openBox"],
      },
    },
    beauty: {
      A: {
        variants: ["photo-focus", "editorial", "photo-focus", "editorial", "premium-card", "premium-card", "premium-card"],
        colors: ["#c58b9b", "#d86f86", "#c58b9b", "#d86f86", "#7e5361", "#c58b9b", "#35222a"],
        imageSlots: ["hero", "origin", "feature", "lifestyle", "trust", "info", "package"],
      },
      B: {
        variants: ["graphic-badge", "premium-card", "photo-focus", "graphic-badge", "premium-card", "premium-card", "graphic-badge"],
        colors: ["#d86f86", "#c58b9b", "#d86f86", "#c58b9b", "#7e5361", "#d86f86", "#35222a"],
        imageSlots: ["hero", "feature", "lifestyle", "origin", "trust", "info", "package"],
      },
    },
    living: {
      A: {
        variants: ["photo-focus", "graphic-badge", "premium-card", "photo-focus", "premium-card", "premium-card", "graphic-badge"],
        colors: ["#397577", "#5f7f8b", "#397577", "#5f7f8b", "#203738", "#397577", "#203738"],
        imageSlots: ["hero", "lifestyle", "feature", "lifestyle", "trust", "info", "package"],
      },
      B: {
        variants: ["graphic-badge", "graphic-badge", "premium-card", "photo-focus", "premium-card", "premium-card", "graphic-badge"],
        colors: ["#5f7f8b", "#397577", "#5f7f8b", "#397577", "#203738", "#5f7f8b", "#203738"],
        imageSlots: ["hero", "feature", "lifestyle", "feature", "trust", "info", "package"],
      },
    },
    commerce: {
      A: {
        variants: ["photo-focus", "editorial", "editorial", "premium-card", "photo-focus", "photo-focus", "premium-card", "premium-card", "premium-card", "premium-card"],
        colors: ["#9b7448", "#c66b2d", "#c66b2d", "#9b7448", "#c66b2d", "#9b7448", "#29231e", "#9b7448", "#29231e", "#29231e"],
        imageSlots: ["hero", "origin", "package", "feature", "lifestyle", "giftBag", "trust", "info", "package", "package"],
      },
      B: {
        variants: ["graphic-badge", "graphic-badge", "conversion", "premium-card", "photo-focus", "photo-focus", "premium-card", "premium-card", "conversion", "graphic-badge"],
        colors: ["#c66b2d", "#9b7448", "#c66b2d", "#c66b2d", "#9b7448", "#c66b2d", "#29231e", "#c66b2d", "#29231e", "#29231e"],
        imageSlots: ["hero", "feature", "package", "package", "lifestyle", "stick", "trust", "info", "package", "package"],
      },
    },
  };
  const config = polish[industry] || polish.commerce;
  ["A", "B"].forEach((key) => {
    const sections = editableSectionsForDraft(key);
    const existing = sectionEdits[key] || [];
    if (existing.length && existing.some((edit) => edit && Object.keys(edit).length)) return;
    const keyConfig = config[key] || config.A;
    sectionEdits[key] = sections.map((section, index) => ({
      title: sectionDefaultTitle(section),
      copy: sectionDefaultCopy(section),
      color: keyConfig.colors[index] || "auto",
      imageSlot: keyConfig.imageSlots[index] || section.imageSlot || "hero",
      variant: keyConfig.variants[index] || "auto",
      autoPolished: true,
      manualEdited: false,
    }));
  });
}

function salesImage(images = {}, slot = "hero", alt = "제품 이미지") {
  const src = images?.[slot] || images?.hero;
  if (src) return `<img class="sales-img sales-img-${escapeHtml(slot)}" src="${src}" alt="${escapeHtml(alt)}">`;
  return `
    <div class="sales-image-placeholder sales-placeholder-${escapeHtml(slot)}">
      <i></i>
      <b>${escapeHtml(imageSlotLabel(slot))}</b>
      <span>${escapeHtml(imageSlotVisualCopy(slot))}</span>
    </div>
  `;
}

function salesHeroProductComposition(images = {}, activeSlot = "hero", alt = "제품 이미지", isB = false, industry = inferProductIndustry()) {
  const mainSlot = images?.[activeSlot] ? activeSlot : "hero";
  const mainImage = salesImage(images, mainSlot, alt);
  const stickSrc = images?.stick || images?.feature;
  const packageSrc = images?.package || images?.boxPink;
  const giftSrc = images?.giftBag || images?.lifestyle;
  const accentSrc = industry === "health" ? images?.origin : images?.lifestyle;
  const badge = {
    health: { value: "30P", label: "Gift Ready" },
    beauty: { value: "CARE", label: "Daily Routine" },
    living: { value: "USE", label: "Problem Solved" },
    fashion: { value: "FIT", label: "Style Ready" },
    commerce: { value: "BEST", label: "Product Point" },
  }[industry] || { value: "BEST", label: "Product Point" };
  return `
    <div class="sales-hero-composition ${isB ? "is-conversion" : "is-premium"}">
      <div class="sales-hero-ad-stage" aria-hidden="true">
        <span></span>
        <i></i>
        <b>${escapeHtml(isB ? "SHOP DETAIL" : "PREMIUM")}</b>
      </div>
      <div class="sales-hero-main-product">${mainImage}</div>
      ${stickSrc ? `<img class="sales-hero-floating sales-hero-stick" src="${stickSrc}" alt="스틱 제품컷">` : ""}
      ${packageSrc ? `<img class="sales-hero-floating sales-hero-package" src="${packageSrc}" alt="패키지 제품컷">` : ""}
      ${giftSrc ? `<img class="sales-hero-floating sales-hero-gift" src="${giftSrc}" alt="선물 패키지컷">` : ""}
      ${accentSrc ? `<img class="sales-hero-floating sales-hero-accent-image" src="${accentSrc}" alt="제품 무드 보조 이미지">` : ""}
      <div class="sales-hero-composition-badge">
        <b>${escapeHtml(badge.value)}</b>
        <span>${escapeHtml(badge.label)}</span>
      </div>
      <div class="sales-hero-ad-caption">
        <strong>${escapeHtml(isB ? "구매 전 핵심 정보를 한 화면에" : "선물처럼 보이는 프리미엄 첫인상")}</strong>
        <span>${escapeHtml(isB ? "구성 · 휴대성 · 신뢰 정보를 빠르게 확인" : "패키지 · 원료 스토리 · 브랜드 무드 강조")}</span>
      </div>
    </div>
  `;
}

function salesFigmaHeroCanvas(p = product(), images = {}, isB = false, industry = inferProductIndustry(), heroTitle = "", heroCopy = "", usp = [], highlights = []) {
  const title = heroTitle || p.productName || "호아비 리치꿀스틱 30포";
  const copy = heroCopy || p.oneLine || "리치와 꿀이 전하는 하루 한 포의 프리미엄 루틴";
  const mainPack = isB
    ? (images?.openBox || images?.package || images?.hero)
    : (images?.package || images?.hero || images?.openBox);
  const boxImage = isB ? (images?.boxYellow || images?.openBox || images?.package) : (images?.boxPink || images?.package);
  const stickImage = images?.stick || images?.feature;
  const giftImage = isB ? (images?.boxPink || images?.giftBag || images?.lifestyle) : (images?.giftBag || images?.boxPink || images?.lifestyle);
  const proof = (usp.length ? usp : fallbackUspForIndustry(industry)).slice(0, 4);
  const mainPoint = highlights?.[0] || proof?.[0] || "프리미엄 원료";
  const label = isB ? "B OPTION / CONVERSION DETAIL" : "A OPTION / PREMIUM DETAIL";
  const visualTitle = isB ? "LITCHI HONEY ROUTINE" : "Hoabee Litchi Honey Stick";
  const cta = isB ? "구성부터 선물 포인트까지 빠르게 확인" : "선물처럼 전하는 프리미엄 건강 루틴";

  return `
    <section class="sales-figma-hero-canvas ${isB ? "is-conversion" : "is-premium"}">
      <div class="figma-hero-bg-word" aria-hidden="true">${escapeHtml(isB ? "HONEY" : "Hoabee")}</div>
      <div class="figma-hero-copy-block">
        <span>${escapeHtml(label)}</span>
        <h2>${escapeHtml(title)}</h2>
        <strong>${escapeHtml(copy)}</strong>
        <p>${escapeHtml(cta)}</p>
        <div class="figma-hero-proof">
          ${proof.map((item, index) => `<b><i>${String(index + 1).padStart(2, "0")}</i>${escapeHtml(item)}</b>`).join("")}
        </div>
        <div class="figma-hero-cta">
          <em>${escapeHtml(mainPoint)}</em>
          <small>${escapeHtml(isB ? "SHOPPING MALL DETAIL PAGE" : "BRAND GIFT DETAIL PAGE")}</small>
        </div>
      </div>
      <div class="figma-hero-product-stage">
        <div class="figma-hero-glow" aria-hidden="true"></div>
        ${mainPack ? `<img class="figma-pack figma-pack-main" src="${mainPack}" alt="${escapeHtml(title)} 대표 패키지">` : ""}
        ${boxImage ? `<img class="figma-pack figma-pack-box" src="${boxImage}" alt="${escapeHtml(title)} 박스컷">` : ""}
        ${stickImage ? `<img class="figma-pack figma-pack-stick" src="${stickImage}" alt="${escapeHtml(title)} 스틱컷">` : ""}
        ${giftImage ? `<img class="figma-pack figma-pack-gift" src="${giftImage}" alt="${escapeHtml(title)} 선물컷">` : ""}
        <div class="figma-hero-seal">
          <b>${escapeHtml(isB ? "30P" : "GIFT")}</b>
          <span>${escapeHtml(isB ? "easy check" : "premium mood")}</span>
        </div>
      </div>
      <div class="figma-hero-bottom">
        <span>LYCHEE</span>
        <strong>${escapeHtml(visualTitle)}</strong>
        <span>HONEY</span>
      </div>
    </section>
  `;
}

function salesFigmaEditorialCanvas(images = {}, isB = false, industry = inferProductIndustry(), usp = []) {
  const ref = images?.referenceSections || [];
  const featureItems = (usp.length ? usp : fallbackUspForIndustry(industry)).slice(0, 3);
  const mood = isB
    ? { label: "INFORMATION DESIGN", title: "구매 판단이 빠른 정보형 상세 구성", copy: "구성, 휴대성, 선물성, 신뢰 요소를 한눈에 비교할 수 있도록 그래픽 블록으로 정리합니다." }
    : { label: "EDITORIAL BRAND STORY", title: "원료 스토리와 선물 무드를 길게 이어가는 구성", copy: "리치 원료, 꿀의 프리미엄 이미지, 패키지 감성을 긴 스크롤 안에서 자연스럽게 연결합니다." };
  const first = ref[2] || images?.origin || images?.hero;
  const second = ref[5] || images?.lifestyle || images?.package;
  const third = ref[8] || images?.trust || images?.info;

  return `
    <section class="sales-figma-editorial-canvas ${isB ? "is-conversion" : "is-premium"}">
      <div class="figma-editorial-head">
        <span>${escapeHtml(mood.label)}</span>
        <h3>${escapeHtml(mood.title)}</h3>
        <p>${escapeHtml(mood.copy)}</p>
      </div>
      <div class="figma-editorial-layout">
        <figure class="figma-editorial-large">
          ${first ? `<img src="${first}" alt="상세페이지 대표 섹션 이미지">` : salesImage(images, "origin", "상세페이지 대표 섹션 이미지")}
        </figure>
        <div class="figma-editorial-side">
          <figure>${second ? `<img src="${second}" alt="상세페이지 사용 장면">` : salesImage(images, "lifestyle", "상세페이지 사용 장면")}</figure>
          <figure>${third ? `<img src="${third}" alt="상세페이지 신뢰 정보">` : salesImage(images, "trust", "상세페이지 신뢰 정보")}</figure>
        </div>
        <div class="figma-editorial-copy-card">
          <small>${escapeHtml(isB ? "WHY BUY" : "BRAND VALUE")}</small>
          ${featureItems.map((item, index) => `
            <div>
              <b>${String(index + 1).padStart(2, "0")}</b>
              <strong>${escapeHtml(item)}</strong>
              <span>${escapeHtml(benefitSubcopy(item, index, industry))}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function salesFigmaIngredientShowcaseCanvas(images = {}, isB = false, industry = inferProductIndustry(), usp = [], highlights = []) {
  const productCut = isB ? (images?.boxYellow || images?.package) : (images?.boxPink || images?.package);
  const stickCut = images?.stick || images?.feature;
  const openBox = images?.openBox || images?.hero;
  const points = (usp.length ? usp : fallbackUspForIndustry(industry)).slice(0, 3);
  const lead = highlights?.[0] || points[0] || "리치 원료와 프리미엄 꿀";
  const title = isB ? "한 포의 구성과 장점이 바로 보이도록" : "리치와 꿀이 만든 프리미엄 무드";
  const copy = isB
    ? "스틱형 구성, 30포 패키지, 휴대성을 한 화면에서 확인할 수 있게 배치합니다."
    : "원료 스토리와 패키지 비주얼을 함께 보여주어 선물용 건강식품의 첫인상을 강화합니다.";
  const facts = [
    ["LYCHEE", "리치 원료 이미지", "달콤하고 이국적인 원료 스토리"],
    ["HONEY", "프리미엄 꿀 무드", "부드럽고 고급스러운 건강식품 인상"],
    ["STICK", "개별 스틱 포장", "언제 어디서나 간편한 루틴"],
  ];

  return `
    <section class="sales-figma-ingredient-showcase ${isB ? "is-conversion" : "is-premium"}">
      <div class="figma-ingredient-copy">
        <span>${escapeHtml(isB ? "PRODUCT VALUE MAP" : "MATERIAL MOOD BOARD")}</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(copy)}</p>
        <strong>${escapeHtml(lead)}</strong>
      </div>
      <div class="figma-ingredient-visual">
        <div class="figma-ingredient-glow" aria-hidden="true"></div>
        ${productCut ? `<img class="figma-ingredient-pack" src="${productCut}" alt="호아비 패키지 이미지">` : ""}
        ${stickCut ? `<img class="figma-ingredient-stick" src="${stickCut}" alt="호아비 스틱 이미지">` : ""}
        ${openBox ? `<img class="figma-ingredient-open" src="${openBox}" alt="호아비 구성 이미지">` : ""}
      </div>
      <div class="figma-ingredient-facts">
        ${facts.map((fact, index) => `
          <article>
            <i>${String(index + 1).padStart(2, "0")}</i>
            <b>${escapeHtml(fact[0])}</b>
            <strong>${escapeHtml(fact[1])}</strong>
            <p>${escapeHtml(fact[2])}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function salesFigmaPurchaseCanvas(images = {}, isB = false, industry = inferProductIndustry(), usp = [], highlights = []) {
  const points = (usp.length ? usp : fallbackUspForIndustry(industry)).slice(0, 4);
  const accentLabel = isB ? "PURCHASE CHECK" : "PREMIUM PROOF";
  const title = isB ? "구매 전에 바로 확인해야 할 핵심 정보" : "선물용 건강식품으로 보여줘야 할 신뢰 포인트";
  const copy = isB
    ? "고객이 구매 직전에 궁금해하는 구성, 휴대성, 선물성, 제품 정보를 비교표와 배지로 정리합니다."
    : "프리미엄 무드는 유지하면서 원료, 구성, 패키지, 섭취 루틴을 안정적인 정보 구조로 보여줍니다.";
  const tableRows = [
    ["구성", "30포 구성", "선물/루틴용으로 충분한 구성"],
    ["형태", "스틱 개별 포장", "가방, 사무실, 여행 중 휴대 편리"],
    ["이미지", "리치 + 꿀 원료", "달콤하고 고급스러운 건강식품 인상"],
    ["주의", "과장 효능 표현 제외", "건강식품 광고 리스크를 줄인 문구"],
  ];
  const scene = images?.lifestyle || images?.giftBag || images?.package;
  const product = images?.package || images?.openBox || images?.hero;

  return `
    <section class="sales-figma-purchase-canvas ${isB ? "is-conversion" : "is-premium"}">
      <div class="figma-purchase-head">
        <span>${escapeHtml(accentLabel)}</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(copy)}</p>
      </div>
      <div class="figma-purchase-grid">
        <div class="figma-purchase-photo-card">
          ${scene ? `<img src="${scene}" alt="구매 판단용 제품 이미지">` : salesImage(images, "lifestyle", "구매 판단용 제품 이미지")}
          <b>${escapeHtml(isB ? "실사용/선물 장면" : "프리미엄 패키지 무드")}</b>
        </div>
        <div class="figma-purchase-table-card">
          <table>
            <tbody>
              ${tableRows.map((row) => `
                <tr>
                  <th>${escapeHtml(row[0])}</th>
                  <td><strong>${escapeHtml(row[1])}</strong><span>${escapeHtml(row[2])}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div class="figma-purchase-point-card">
          ${product ? `<img src="${product}" alt="제품 패키지 이미지">` : ""}
          <div>
            <small>${escapeHtml(isB ? "WHY CHOOSE" : "GIFT READY")}</small>
            <strong>${escapeHtml(highlights?.[0] || points[0] || "프리미엄 원료")}</strong>
            <p>${escapeHtml(isB ? "A/B 시안에서 고객이 빠르게 방향을 고를 수 있도록 핵심 구매 근거를 강조합니다." : "고급스럽고 단정한 무드로 선물용 상세페이지 첫인상을 강화합니다.")}</p>
          </div>
        </div>
      </div>
      <div class="figma-purchase-badges">
        ${points.map((point, index) => `<b><i>${String(index + 1).padStart(2, "0")}</i>${escapeHtml(point)}</b>`).join("")}
      </div>
    </section>
  `;
}

function salesFigmaConversionDecisionCanvas(images = {}, isB = false, industry = inferProductIndustry(), usp = []) {
  if (!isB) return "";
  const points = (usp.length ? usp : fallbackUspForIndustry(industry)).slice(0, 4);
  const product = images?.openBox || images?.package || images?.hero;
  const stick = images?.stick || images?.feature;
  const rows = [
    ["구성 확인", "30포 구성과 스틱 형태를 먼저 확인"],
    ["휴대성 확인", "가방, 사무실, 외출 상황에 맞는지 확인"],
    ["선물성 확인", "패키지와 쇼핑백 이미지로 선물 수요 판단"],
    ["표현 리스크", "효능 보장 대신 원료/구성 중심 표현"],
  ];

  return `
    <section class="sales-figma-conversion-decision">
      <div class="figma-decision-header">
        <span>CONVERSION DETAIL FLOW</span>
        <h3>고객이 빠르게 선택할 수 있는 구매 판단 구조</h3>
        <p>감성보다 구매 판단 속도를 높이는 B안 전용 구성입니다. 핵심 정보, 비교 기준, CTA가 한 화면 안에서 이어지도록 설계합니다.</p>
      </div>
      <div class="figma-decision-body">
        <div class="figma-decision-score">
          <small>BUYING SCORE</small>
          <strong>4.8</strong>
          <p>구성 · 휴대성 · 선물성 · 정보 신뢰를 기준으로 구매 판단 요소를 앞쪽에 배치합니다.</p>
          <div>${points.map((item) => `<b>${escapeHtml(item)}</b>`).join("")}</div>
        </div>
        <div class="figma-decision-matrix">
          ${rows.map((row, index) => `
            <article>
              <i>${String(index + 1).padStart(2, "0")}</i>
              <strong>${escapeHtml(row[0])}</strong>
              <span>${escapeHtml(row[1])}</span>
            </article>
          `).join("")}
        </div>
        <div class="figma-decision-product">
          ${product ? `<img class="decision-product-main" src="${product}" alt="구매 판단 대표 제품 이미지">` : ""}
          ${stick ? `<img class="decision-product-stick" src="${stick}" alt="스틱 제품 이미지">` : ""}
          <em>30P / STICK / GIFT</em>
        </div>
      </div>
    </section>
  `;
}

function salesSectionRibbon(type = "story", isB = false, industry = inferProductIndustry()) {
  const map = {
    story: {
      label: isB ? "01 / MATERIAL CHECK" : "01 / BRAND STORY",
      title: industry === "health" ? "원료 스토리와 제품 무드를 먼저 설계" : "제품의 시작점을 감각적으로 정리",
      points: isB ? ["원료", "구성", "확인"] : ["무드", "스토리", "패키지"],
    },
    benefit: {
      label: isB ? "02 / BUYING REASON" : "02 / VALUE POINT",
      title: isB ? "구매 이유가 바로 보이는 장점 구조" : "제품 가치가 자연스럽게 쌓이는 프리미엄 구조",
      points: isB ? ["비교", "장점", "선택"] : ["가치", "디테일", "루틴"],
    },
    trust: {
      label: isB ? "03 / TRUST CHECK" : "03 / BRAND TRUST",
      title: industry === "health" ? "건강식품 표현 리스크를 줄이는 신뢰 정보 배치" : "고객이 안심하고 선택할 수 있는 확인 구조",
      points: isB ? ["정보", "검수", "안심"] : ["신뢰", "자료", "마감"],
    },
  };
  const data = map[type] || map.story;
  return `
    <div class="sales-section-ribbon sales-section-ribbon-${escapeHtml(type)} ${isB ? "is-conversion" : "is-premium"}">
      <span>${escapeHtml(data.label)}</span>
      <strong>${escapeHtml(data.title)}</strong>
      <div>${data.points.map((item) => `<b>${escapeHtml(item)}</b>`).join("")}</div>
    </div>
  `;
}

function imageSlotVisualCopy(slot) {
  const copies = {
    hero: "대표 제품컷 또는 패키지 합성컷",
    origin: "원료/산지/브랜드 스토리 비주얼",
    feature: "제품 디테일과 질감 클로즈업",
    lifestyle: "사용 장면 또는 선물 연출컷",
    package: "패키지 구성과 최종 제품컷",
    trust: "신뢰 자료와 정보 확인 이미지",
    info: "제품 정보표와 구성 안내 이미지",
    boxYellow: "옐로우 박스 단독 제품컷",
    boxPink: "핑크 박스 단독 제품컷",
    openBox: "30포 구성 오픈박스컷",
    giftBag: "선물용 쇼핑백컷",
    stick: "스틱 단독 디테일컷",
  };
  return copies[slot] || "상세페이지용 비주얼";
}

function templateMixHeroDecor(images = {}, isB = false) {
  const items = isB
    ? [
        { slot: "stick", label: "STICK" },
        { slot: "openBox", label: "30P" },
      ]
    : [
        { slot: "stick", label: "STICK" },
        { slot: "giftBag", label: "GIFT" },
      ];
  return `
    <div class="template-mix-hero-decor">
      ${items.map((item, index) => `
        <figure class="decor-product decor-product-${index + 1}">
          ${salesImage(images, item.slot, item.label)}
          <figcaption>${escapeHtml(item.label)}</figcaption>
        </figure>
      `).join("")}
      <span class="decor-badge">${escapeHtml(isB ? "CHECK 30P" : "PREMIUM GIFT")}</span>
    </div>
  `;
}

function templateMixCommerceTable(isB = false, proofItems = []) {
  const rows = isB
    ? [
        ["원료", proofItems[0] || "리치 원료"],
        ["구성", "30포 스틱형"],
        ["편의", proofItems[2] || "휴대 편의성"],
        ["주의", "과장 표현 없이 정보 중심"],
      ]
    : [
        ["무드", "프리미엄 선물형"],
        ["스토리", proofItems[0] || "원료 스토리"],
        ["패키지", proofItems[3] || "선물용 패키지"],
        ["루틴", proofItems[2] || "하루 한 포"],
      ];
  return `
    <div class="template-mix-commerce-table">
      ${rows.map(([label, value]) => `<span><b>${escapeHtml(label)}</b><em>${escapeHtml(value)}</em></span>`).join("")}
    </div>
  `;
}

function templateMixReferenceFlow(images = {}, isB = false) {
  const refs = Array.isArray(images?.referenceSections) ? images.referenceSections : [];
  const selected = refs.length
    ? (isB ? [refs[0], refs[4], refs[7], refs[10]] : [refs[0], refs[1], refs[5], refs[8]]).filter(Boolean)
    : [];
  const fallback = isB
    ? ["package", "feature", "trust", "info"]
    : ["package", "origin", "lifestyle", "giftBag"];
  const labels = isB
    ? ["첫 화면", "장점", "신뢰", "구매"]
    : ["브랜드", "원료", "선물", "마감"];
  const items = selected.length ? selected : fallback;
  return `
    <section class="template-mix-reference-flow ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "DETAIL FLOW" : "REFERENCE RHYTHM")}</small>
        <h3>${escapeHtml(isB ? "구매 흐름이 끊기지 않도록 구간을 압축합니다" : "기존 상세페이지 무드를 새 시안 흐름에 맞게 재배치합니다")}</h3>
        <p>${escapeHtml(isB ? "첫 화면부터 신뢰, 구성, 최종 선택까지 구매자가 확인하는 순서를 짧은 이미지 흐름으로 보여줍니다." : "원료, 패키지, 선물성, 브랜드 무드가 반복적으로 등장해 실제 긴 상세페이지처럼 보이게 합니다.")}</p>
      </div>
      <div class="template-mix-reference-strip">
        ${items.map((item, index) => `
          <figure>
            ${selected.length ? `<img src="${item}" alt="${escapeHtml(labels[index] || "상세 흐름")}">` : salesImage(images, item, labels[index] || "상세 흐름")}
            <figcaption>${String(index + 1).padStart(2, "0")} ${escapeHtml(labels[index] || "상세")}</figcaption>
          </figure>
        `).join("")}
      </div>
    </section>
  `;
}

function templateMixConceptDivider(isB = false, proofItems = []) {
  if (isB) {
    const rows = [
      ["일반 꿀스틱", "원료/구성 차이가 잘 보이지 않음"],
      ["호아비 리치꿀스틱", proofItems[0] || "리치 원료와 프리미엄 꿀 조합"],
      ["구매 판단", "30포 구성, 휴대성, 선물성을 함께 확인"],
    ];
    return `
      <section class="template-mix-concept-divider is-conversion">
        <small>COMPARE & CHECK</small>
        <h3>비교하면 선택 이유가 더 빨리 보입니다</h3>
        <div class="template-mix-compare-table">
          ${rows.map(([label, copy]) => `<span><b>${escapeHtml(label)}</b><em>${escapeHtml(copy)}</em></span>`).join("")}
        </div>
      </section>
    `;
  }
  return `
    <section class="template-mix-concept-divider is-premium">
      <small>BRAND MOOD</small>
      <h3>달콤한 원료 스토리가 선물의 첫인상을 만듭니다</h3>
      <p>제품을 설명하기 전에 브랜드 무드와 패키지 이미지를 먼저 보여주면, 단순 건강식품이 아니라 선물하기 좋은 프리미엄 식품처럼 인식됩니다.</p>
      <div>
        <span>Soft Gift</span>
        <span>Ingredient Story</span>
        <span>Premium Routine</span>
      </div>
    </section>
  `;
}

function templateMixVariantSignature(images = {}, isB = false, proofItems = []) {
  if (isB) {
    const rows = [
      ["구성", "30포 스틱형", "한 박스 기준 구성 확인"],
      ["섭취", "개별 포장", "휴대와 보관이 간편"],
      ["선물", "패키지형", "부모님/지인 선물용"],
      ["주의", "식품 표현", "효능 과장 없이 안내"],
    ];
    return `
      <section class="template-mix-conversion-snapshot">
        <div class="conversion-snapshot-head">
          <small>FAST BUYING SNAPSHOT</small>
          <h3>구매자가 궁금해하는 정보를 한 화면에 압축</h3>
          <p>전환형 시안은 감성보다 확인 속도가 중요합니다. 구성, 편의, 선물성, 주의 정보를 먼저 정리합니다.</p>
        </div>
        <div class="conversion-snapshot-grid">
          ${rows.map(([label, value, copy]) => `
            <article>
              <b>${escapeHtml(label)}</b>
              <strong>${escapeHtml(value)}</strong>
              <span>${escapeHtml(copy)}</span>
            </article>
          `).join("")}
        </div>
        <figure>${salesImage(images, "openBox", "구성 확인 제품컷")}</figure>
      </section>
    `;
  }
  return `
    <section class="template-mix-brand-signature">
      <figure>${salesImage(images, "giftBag", "프리미엄 선물 이미지")}</figure>
      <div>
        <small>BRAND SIGNATURE</small>
        <h3>받는 순간부터 선물처럼 느껴지는 건강 루틴</h3>
        <p>프리미엄형 시안은 제품 설명보다 브랜드 첫인상, 패키지 감성, 원료 스토리를 먼저 보여줍니다.</p>
        <blockquote>${escapeHtml(proofItems[0] || "리치 원료와 프리미엄 꿀이 만드는 부드러운 선물 이미지")}</blockquote>
      </div>
    </section>
  `;
}

function templateMixEditorialScene(images = {}, isB = false, proofItems = []) {
  const title = isB
    ? "구매자가 바로 이해하는 제품 구성과 사용 장면"
    : "리치와 꿀이 만드는 부드러운 선물 무드";
  const copy = isB
    ? "제품 컷, 구성 컷, 섭취 장면을 한 화면에 묶어 장점을 설명하지 않아도 자연스럽게 이해되도록 구성합니다."
    : "프리미엄 건강식품은 원료 이미지와 패키지 무드가 함께 보여야 선물 가치가 살아납니다.";
  const tags = isB
    ? ["제품 컷", "구성 안내", "사용 장면", "구매 판단"]
    : ["리치 원료", "프리미엄 꿀", "선물 패키지", "브랜드 무드"];
  return `
    <section class="template-mix-editorial-scene ${isB ? "is-conversion" : "is-premium"}">
      <div class="template-mix-editorial-copy">
        <small>${escapeHtml(isB ? "SHOPPING GUIDE" : "INGREDIENT MOOD")}</small>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(copy)}</p>
        <div>
          ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
      <div class="template-mix-editorial-board">
        <figure class="is-main">${salesImage(images, isB ? "openBox" : "boxPink", "제품 메인 연출컷")}</figure>
        <figure class="is-tall">${salesImage(images, "stick", "스틱 디테일컷")}</figure>
        <figure class="is-wide">${salesImage(images, isB ? "info" : "giftBag", "구성/선물 이미지")}</figure>
      </div>
      <strong>${escapeHtml(proofItems[0] || (isB ? "30포 구성과 휴대성을 한눈에" : "리치 원료와 프리미엄 꿀 조합"))}</strong>
    </section>
  `;
}

function templateMixPhotoDirection(images = {}, isB = false) {
  const shots = isB
    ? [
        ["01", "제품 단독컷", "화이트 배경에서 스틱과 패키지 형태를 명확하게"],
        ["02", "구성 전체컷", "30포 구성, 패키지 내부, 쇼핑백을 한 화면에"],
        ["03", "구매 판단컷", "원료/구성/섭취 편의가 보이도록 정보형 연출"],
      ]
    : [
        ["01", "프리미엄 무드컷", "아이보리/핑크 톤 배경에 패키지와 스틱을 고급스럽게"],
        ["02", "원료 스토리컷", "리치 원료와 꿀 이미지를 부드러운 빛으로 연출"],
        ["03", "선물 패키지컷", "쇼핑백, 패키지, 스틱을 함께 배치해 선물성 강조"],
      ];
  return `
    <section class="template-mix-photo-direction ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "PHOTO PLAN" : "SHOOTING DIRECTION")}</small>
        <h3>${escapeHtml(isB ? "실제 촬영/합성 시 필요한 컷을 먼저 설계합니다" : "초안 이미지는 임시, 최종은 이런 무드로 촬영합니다")}</h3>
      </div>
      <div class="template-mix-photo-grid">
        ${shots.map(([num, title, copy], index) => `
          <article>
            <figure>${salesImage(images, index === 0 ? (isB ? "stick" : "boxPink") : index === 1 ? "openBox" : "giftBag", title)}</figure>
            <span>${escapeHtml(num)}</span>
            <b>${escapeHtml(title)}</b>
            <p>${escapeHtml(copy)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function templateMixPurchaseStack(images = {}, isB = false, proofItems = [], highlights = []) {
  const reasons = isB
    ? [
        ["01", "구성", "30포 스틱형이라 선물/데일리 모두 활용"],
        ["02", "편의", "언제 어디서나 한 포씩 간편하게"],
        ["03", "판단", "원료, 구성, 주의사항을 과장 없이 확인"],
      ]
    : [
        ["01", "첫인상", "패키지와 컬러가 선물 가치를 먼저 전달"],
        ["02", "원료감", proofItems[0] || "리치 원료와 프리미엄 꿀 조합"],
        ["03", "루틴", highlights[0] || "하루 한 포로 완성하는 부드러운 건강 루틴"],
      ];
  return `
    <section class="template-mix-purchase-stack ${isB ? "is-conversion" : "is-premium"}">
      <div class="template-mix-choice-panel">
        <small>${escapeHtml(isB ? "WHY BUY" : "WHY GIFT")}</small>
        <h3>${escapeHtml(isB ? "구매 전에 필요한 판단 근거만 압축합니다" : "선물로 선택해야 하는 이유를 감성적으로 정리합니다")}</h3>
        <div>
          ${reasons.map(([num, title, copy]) => `
            <article>
              <i>${escapeHtml(num)}</i>
              <b>${escapeHtml(title)}</b>
              <span>${escapeHtml(copy)}</span>
            </article>
          `).join("")}
        </div>
      </div>
      <figure class="template-mix-purchase-product">
        ${salesImage(images, isB ? "openBox" : "boxPink", "구매 유도 제품컷")}
        <figcaption>${escapeHtml(isB ? "30P CHECK" : "GIFT READY")}</figcaption>
      </figure>
    </section>
  `;
}

function templateMixBenefitShowcase(images = {}, isB = false, proofItems = []) {
  const items = isB
    ? [
        { slot: "stick", label: "STICK", copy: proofItems[2] || "한 포씩 간편한 휴대" },
        { slot: "openBox", label: "30P", copy: "구성품을 한눈에 확인" },
        { slot: "info", label: "INFO", copy: "구매 전 정보 확인" },
      ]
    : [
        { slot: "boxPink", label: "PACKAGE", copy: "선물용 패키지 무드" },
        { slot: "stick", label: "ROUTINE", copy: proofItems[2] || "하루 한 포 루틴" },
        { slot: "giftBag", label: "GIFT", copy: "고급스러운 선물 이미지" },
      ];
  return `
    <div class="template-mix-benefit-showcase">
      ${items.map((item) => `
        <article>
          <figure>${salesImage(images, item.slot, item.label)}</figure>
          <b>${escapeHtml(item.label)}</b>
          <span>${escapeHtml(item.copy)}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function templateMixFinalOrderPanel(isB = false) {
  const rows = isB
    ? [
        ["구성", "30포 스틱형"],
        ["포인트", "원료/편의/선물성"],
        ["확인", "제품 정보와 주의사항"],
      ]
    : [
        ["무드", "프리미엄 선물형"],
        ["포인트", "리치 원료와 꿀"],
        ["제안", "하루 한 포 루틴"],
      ];
  return `
    <div class="template-mix-final-order-panel">
      ${rows.map(([label, value]) => `<span><b>${escapeHtml(label)}</b><em>${escapeHtml(value)}</em></span>`).join("")}
    </div>
  `;
}

function templateMixHeroProof(isB = false) {
  const items = isB
    ? [
        ["30P", "구성 확인"],
        ["STICK", "휴대 편의"],
        ["CHECK", "정보 중심"],
      ]
    : [
        ["GIFT", "선물 무드"],
        ["LYCHEE", "원료 스토리"],
        ["PREMIUM", "브랜드 첫인상"],
      ];
  return `
    <div class="template-mix-hero-proof">
      ${items.map(([label, copy]) => `<span><b>${escapeHtml(label)}</b><em>${escapeHtml(copy)}</em></span>`).join("")}
    </div>
  `;
}

function templateMixCampaignCover(images = {}, isB = false, p = product(), proofItems = []) {
  const title = p.productName || "호아비 리치꿀스틱 30포";
  const lead = isB
    ? "구성, 편의성, 선물 포인트를 한 화면에서 빠르게 확인하는 전환형 상세"
    : "리치와 꿀이 전하는 프리미엄 선물 루틴";
  const heroSlot = isB ? "boxYellow" : "boxPink";
  const sideSlot = isB ? "openBox" : "stick";
  const chips = isB
    ? ["30P", "STICK", "INFO", "GIFT"]
    : ["LYCHEE", "HONEY", "PREMIUM", "GIFT"];
  return `
    <section class="template-mix-campaign-cover ${isB ? "is-conversion" : "is-premium"}">
      <div class="campaign-cover-copy">
        <small>${escapeHtml(isB ? "B OPTION / SHOPPING DETAIL" : "A OPTION / BRAND DETAIL")}</small>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(lead)}</p>
        <strong>${escapeHtml(proofItems[0] || (isB ? "구매 전 확인이 쉬운 상세 구성" : "선물처럼 보이는 프리미엄 첫인상"))}</strong>
        <div>
          ${chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join("")}
        </div>
      </div>
      <figure class="campaign-cover-main">
        ${salesImage(images, heroSlot, `${title} 대표 제품컷`)}
        <figcaption>${escapeHtml(isB ? "CHECK THE ROUTINE" : "PREMIUM HONEY ROUTINE")}</figcaption>
      </figure>
      <figure class="campaign-cover-sub">
        ${salesImage(images, sideSlot, `${title} 보조 제품컷`)}
      </figure>
      <div class="campaign-cover-index">
        <b>${escapeHtml(isB ? "COMMERCE" : "HOABEE")}</b>
        <span>${escapeHtml(isB ? "구성 / 원료 / 휴대성 / 신뢰" : "브랜드 / 원료 / 선물 / 루틴")}</span>
      </div>
    </section>
  `;
}

function templateMixReferenceHeroBand(images = {}, isB = false, proofItems = []) {
  const refs = Array.isArray(images?.figmaReferences) ? images.figmaReferences : [];
  const detailRefs = Array.isArray(images?.referenceSections) ? images.referenceSections : [];
  const main = refs[0] || detailRefs[1] || images?.origin || images?.hero;
  const sub = isB
    ? (refs[1] || detailRefs[7] || images?.trust || images?.info)
    : (refs[2] || detailRefs[5] || images?.lifestyle || images?.giftBag);
  const productSlot = isB ? "openBox" : "stick";
  const title = isB
    ? "정보와 제품컷을 크게 묶어 구매 판단을 빠르게 만듭니다"
    : "기존 상세의 무드를 살려 실제 판매 페이지처럼 보이게 만듭니다";
  const copy = isB
    ? "전환형 시안은 정보표만 나열하지 않고, 제품 컷과 신뢰 컷을 한 화면 안에서 강하게 보여줍니다."
    : "브랜드 무드, 원료 스토리, 제품 이미지를 큰 비주얼 컷으로 반복해 프리미엄 첫인상을 강화합니다.";
  return `
    <section class="template-mix-reference-hero-band ${isB ? "is-conversion" : "is-premium"}">
      <figure class="reference-hero-main">
        ${main ? `<img src="${main}" alt="${escapeHtml(isB ? "상세페이지 정보 레퍼런스" : "상세페이지 브랜드 레퍼런스")}">` : salesImage(images, "origin", "상세페이지 레퍼런스")}
      </figure>
      <div class="reference-hero-copy">
        <small>${escapeHtml(isB ? "REFERENCE COMMERCE REMIX" : "REFERENCE BRAND REMIX")}</small>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(copy)}</p>
        <div>
          ${(proofItems.length ? proofItems : ["원료 스토리", "선물성", "휴대성"]).slice(0, 3).map((item, index) => `
            <span><b>${String(index + 1).padStart(2, "0")}</b>${escapeHtml(item)}</span>
          `).join("")}
        </div>
      </div>
      <figure class="reference-hero-sub">
        ${sub ? `<img src="${sub}" alt="${escapeHtml(isB ? "신뢰 정보 레퍼런스" : "라이프스타일 레퍼런스")}">` : salesImage(images, isB ? "trust" : "lifestyle", "보조 레퍼런스")}
      </figure>
      <figure class="reference-hero-product">
        ${salesImage(images, productSlot, "제품 강조 컷")}
      </figure>
    </section>
  `;
}

function templateMixHeroOfferBar(isB = false, proofItems = []) {
  const offers = isB
    ? [
        ["01", "구성", "30포 스틱형"],
        ["02", "편의", proofItems[2] || "개별 포장"],
        ["03", "확인", "원료/주의 정보"],
      ]
    : [
        ["01", "선물", "고급 패키지"],
        ["02", "원료", proofItems[0] || "리치와 꿀"],
        ["03", "루틴", "하루 한 포"],
      ];
  return `
    <div class="template-mix-hero-offer">
      ${offers.map(([num, label, copy]) => `
        <span>
          <i>${escapeHtml(num)}</i>
          <b>${escapeHtml(label)}</b>
          <em>${escapeHtml(copy)}</em>
        </span>
      `).join("")}
    </div>
  `;
}

function templateMixOfferSequence(images = {}, isB = false, proofItems = []) {
  const rows = isB
    ? [
        { label: "POINT 01", title: "한 포씩 꺼내는 편의성", copy: "외출, 사무실, 선물 상황에서도 부담 없이 전달되는 스틱형 구성", slot: "stick" },
        { label: "POINT 02", title: "30포 구성을 명확하게", copy: "구매자가 가장 먼저 확인하는 구성과 패키지 정보를 이미지로 정리", slot: "openBox" },
        { label: "POINT 03", title: "신뢰 정보는 과장 없이", copy: proofItems[0] || "원료와 정보 중심으로 건강식품의 신뢰감을 만듭니다.", slot: "info" },
      ]
    : [
        { label: "MOOD 01", title: "선물처럼 보이는 패키지", copy: "제품 박스와 스틱 이미지를 크게 사용해 첫인상에서 고급감을 전달", slot: "boxPink" },
        { label: "MOOD 02", title: "리치와 꿀의 원료 스토리", copy: proofItems[0] || "원료 이미지를 감성적으로 풀어 브랜드 기억을 만듭니다.", slot: "origin" },
        { label: "MOOD 03", title: "하루 한 포 루틴 제안", copy: "섭취 장면과 휴대성을 연결해 자연스러운 구매 이유를 만듭니다.", slot: "lifestyle" },
      ];
  return `
    <section class="template-mix-offer-sequence ${isB ? "is-conversion" : "is-premium"}">
      ${rows.map((row, index) => `
        <article class="${index % 2 ? "is-reverse" : ""}">
          <figure>${salesImage(images, row.slot, row.title)}</figure>
          <div>
            <small>${escapeHtml(row.label)}</small>
            <h3>${escapeHtml(row.title)}</h3>
            <p>${escapeHtml(row.copy)}</p>
            <span>${escapeHtml(isB ? "구매 판단을 빠르게 돕는 정보 블록" : "브랜드 무드와 제품 가치를 함께 전달")}</span>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}

function templateMixVisualProofWall(images = {}, isB = false, proofItems = []) {
  const refs = Array.isArray(images?.referenceSections) ? images.referenceSections : [];
  const refSlots = refs.length
    ? (isB ? [refs[2], refs[4], refs[7], refs[9]] : [refs[0], refs[1], refs[5], refs[8]]).filter(Boolean)
    : [];
  const cards = isB
    ? [
        { slot: "stick", label: "Stick", copy: "한 포씩 꺼내 쓰는 편의성" },
        { slot: "openBox", label: "30P", copy: "구성을 바로 확인" },
        { slot: "info", label: "Info", copy: "구매 전 필요한 정보" },
      ]
    : [
        { slot: "boxPink", label: "Mood", copy: "브랜드 첫인상 강화" },
        { slot: "giftBag", label: "Gift", copy: "선물용 이미지 확보" },
        { slot: "stick", label: "Routine", copy: "데일리 루틴 제안" },
      ];
  return `
    <section class="template-mix-proof-wall ${isB ? "is-conversion" : "is-premium"}">
      <div class="template-mix-proof-wall-head">
        <small>${escapeHtml(isB ? "PRODUCT PROOF WALL" : "BRAND VISUAL WALL")}</small>
        <h3>${escapeHtml(isB ? "제품컷과 정보컷을 섞어 구매 판단을 빠르게 만듭니다" : "제품 이미지가 반복되어야 실제 상세페이지처럼 보입니다")}</h3>
        <p>${escapeHtml(proofItems[0] || (isB ? "구성, 편의성, 신뢰 정보를 한 화면 안에서 확인합니다." : "원료 스토리와 패키지 무드를 반복 노출합니다."))}</p>
      </div>
      <div class="template-mix-proof-wall-grid">
        <figure class="is-large">${salesImage(images, isB ? "openBox" : "boxPink", "대표 제품 비주얼")}</figure>
        ${cards.map((item) => `
          <article>
            <figure>${salesImage(images, item.slot, item.label)}</figure>
            <b>${escapeHtml(item.label)}</b>
            <span>${escapeHtml(item.copy)}</span>
          </article>
        `).join("")}
        <div class="template-mix-proof-wall-reference">
          ${(refSlots.length ? refSlots : []).map((src, index) => `
            <img src="${src}" alt="${escapeHtml(`상세페이지 참고 구간 ${index + 1}`)}">
          `).join("")}
          ${!refSlots.length ? cards.map((item) => `<figure>${salesImage(images, item.slot, item.label)}</figure>`).join("") : ""}
        </div>
      </div>
    </section>
  `;
}

function templateMixAdPoster(images = {}, isB = false, p = product(), proofItems = []) {
  const refs = Array.isArray(images?.referenceSections) ? images.referenceSections : [];
  const selectedRefs = refs.length
    ? (isB ? [refs[3], refs[5], refs[8]] : [refs[0], refs[2], refs[6]]).filter(Boolean)
    : [];
  const tags = isB
    ? ["30포 구성", "스틱 포장", "정보 확인", "구매 판단"]
    : ["프리미엄 선물", "리치 원료", "브랜드 무드", "데일리 루틴"];
  const title = isB
    ? "제품 정보와 구매 이유가 한 화면에서 보이는 전환형 상세"
    : "첫인상부터 선물처럼 보이게 만드는 프리미엄 상세";
  const copy = isB
    ? "전환형 시안은 예쁜 이미지보다 구매자가 궁금해하는 정보를 빠르게 찾게 하는 것이 중요합니다. 제품컷, 구성컷, 체크 포인트를 한 장의 광고 구간처럼 묶습니다."
    : "프리미엄형 시안은 제품의 감성과 패키지 인상이 먼저 살아야 합니다. 기존 상세 무드와 제품컷을 섞어 실제 브랜드 상세페이지처럼 보이게 구성합니다.";
  const posterRows = isB
    ? [
        ["01", "구성", "30포 스틱형 구성"],
        ["02", "편의", "개별 포장과 휴대성"],
        ["03", "확인", "원료/정보/주의사항"],
      ]
    : [
        ["01", "Mood", "고급스러운 패키지 첫인상"],
        ["02", "Story", proofItems[0] || "리치 원료와 꿀 스토리"],
        ["03", "Gift", "선물용으로 보기 좋은 구성"],
      ];
  return `
    <section class="template-mix-ad-poster ${isB ? "is-conversion" : "is-premium"}">
      <div class="template-mix-ad-copy">
        <small>${escapeHtml(isB ? "COMMERCE AD SECTION" : "PREMIUM AD SECTION")}</small>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(copy)}</p>
        <div>${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      </div>
      <div class="template-mix-ad-stage">
        <figure class="template-mix-ad-main">
          ${salesImage(images, isB ? "openBox" : "boxPink", p.productName || "제품 메인컷")}
          <figcaption>${escapeHtml(isB ? "BUYING CHECK" : "HOABEE GIFT")}</figcaption>
        </figure>
        <div class="template-mix-ad-reference">
          ${selectedRefs.length ? selectedRefs.map((src, index) => `
            <figure>
              <img src="${src}" alt="${escapeHtml(`상세 레퍼런스 ${index + 1}`)}">
            </figure>
          `).join("") : ["package", "stick", "giftBag"].map((slot, index) => `
            <figure>${salesImage(images, slot, `상세 레퍼런스 ${index + 1}`)}</figure>
          `).join("")}
        </div>
        <div class="template-mix-ad-info">
          ${posterRows.map(([num, label, rowCopy]) => `
            <article>
              <i>${escapeHtml(num)}</i>
              <b>${escapeHtml(label)}</b>
              <span>${escapeHtml(rowCopy)}</span>
            </article>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function templateMixCommercialBannerSet(images = {}, isB = false, p = product(), proofItems = []) {
  const banners = isB
    ? [
        {
          tone: "orange",
          label: "BUYING POINT",
          title: "구성부터 편의성까지 한 번에 확인",
          copy: "30포 스틱 구성, 휴대성, 선물성을 한 화면에서 빠르게 판단할 수 있도록 제품컷과 정보 배지를 결합합니다.",
          slot: "openBox",
          chips: ["30P", "STICK", "GIFT"],
        },
        {
          tone: "dark",
          label: "TRUST CHECK",
          title: "과장 없이 신뢰감 있게",
          copy: proofItems[0] || "건강식품은 효능 과장보다 원료와 구성 정보를 명확하게 보여주는 것이 중요합니다.",
          slot: "info",
          chips: ["INFO", "CHECK", "SAFE COPY"],
        },
        {
          tone: "light",
          label: "FINAL GUIDE",
          title: "구매 전 마지막 체크 리스트",
          copy: "제품 구성, 섭취 편의, 주의 정보가 정리되어 고객이 망설임 없이 선택할 수 있게 합니다.",
          slot: "stick",
          chips: ["구성", "편의", "주의"],
        },
      ]
    : [
        {
          tone: "orange",
          label: "PREMIUM GIFT",
          title: "선물처럼 보이는 첫인상",
          copy: "패키지 컬러와 제품 이미지를 크게 보여주어 건강식품이 아닌 프리미엄 선물 브랜드처럼 느껴지게 합니다.",
          slot: "boxPink",
          chips: ["GIFT", "PREMIUM", "ROUTINE"],
        },
        {
          tone: "dark",
          label: "BRAND STORY",
          title: "리치와 꿀이 만드는 부드러운 원료 스토리",
          copy: proofItems[0] || "원료의 이미지를 감성적으로 풀어내 제품의 차별점을 자연스럽게 전달합니다.",
          slot: "stick",
          chips: ["LYCHEE", "HONEY", "STORY"],
        },
        {
          tone: "light",
          label: "GIFT PACKAGE",
          title: "받는 순간부터 기분 좋은 구성",
          copy: "쇼핑백, 패키지, 스틱 제품컷을 함께 보여주어 선물용 구매 이유를 강화합니다.",
          slot: "giftBag",
          chips: ["PACKAGE", "SHOPPING BAG", "30P"],
        },
      ];
  return `
    <section class="template-mix-commercial-banners ${isB ? "is-conversion" : "is-premium"}">
      ${banners.map((banner, index) => `
        <article class="commercial-banner is-${escapeHtml(banner.tone)}">
          <div>
            <small>${escapeHtml(banner.label)}</small>
            <h3>${escapeHtml(banner.title)}</h3>
            <p>${escapeHtml(banner.copy)}</p>
            <span>${banner.chips.map((chip) => `<b>${escapeHtml(chip)}</b>`).join("")}</span>
          </div>
          <figure>
            ${salesImage(images, banner.slot, `${p.productName || "제품"} 배너 ${index + 1}`)}
            <figcaption>${String(index + 1).padStart(2, "0")}</figcaption>
          </figure>
        </article>
      `).join("")}
    </section>
  `;
}

function templateMixRoutineFlow(images = {}, isB = false, proofItems = []) {
  const steps = isB
    ? [
        ["01", "제품 확인", "스틱 형태와 30포 구성을 먼저 확인"],
        ["02", "섭취 편의", "가방, 사무실, 외출 상황에서도 간편하게"],
        ["03", "구매 판단", "원료와 패키지 정보를 한 번에 정리"],
      ]
    : [
        ["01", "선물 첫인상", "패키지 컬러와 제품 컷으로 고급스러운 인상 형성"],
        ["02", "원료 스토리", proofItems[0] || "리치와 꿀의 부드러운 원료 이미지 전달"],
        ["03", "데일리 루틴", "하루 한 포를 선물처럼 즐기는 사용 흐름 제안"],
      ];
  const imageSlots = isB ? ["stick", "openBox", "info"] : ["boxPink", "stick", "giftBag"];
  return `
    <section class="template-mix-routine-flow ${isB ? "is-conversion" : "is-premium"}">
      <div class="template-mix-routine-head">
        <small>${escapeHtml(isB ? "HOW TO CHECK" : "ROUTINE STORY")}</small>
        <h3>${escapeHtml(isB ? "고객이 구매 전 확인하는 순서대로 보여줍니다" : "제품이 선물에서 루틴으로 이어지는 장면을 만듭니다")}</h3>
      </div>
      <div class="template-mix-routine-cards">
        ${steps.map(([num, title, copy], index) => `
          <article>
            <figure>${salesImage(images, imageSlots[index], title)}</figure>
            <div>
              <i>${escapeHtml(num)}</i>
              <b>${escapeHtml(title)}</b>
              <span>${escapeHtml(copy)}</span>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function templateMixSectionRail(isB = false) {
  const items = isB
    ? ["CHECK", "POINT", "COMPARE", "TRUST", "BUY"]
    : ["MOOD", "STORY", "GIFT", "ROUTINE", "BRAND"];
  return `
    <div class="template-mix-section-rail ${isB ? "is-conversion" : "is-premium"}" aria-hidden="true">
      ${items.map((item, index) => `<span><b>${String(index + 1).padStart(2, "0")}</b>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function templateMixCommerceSnapshot(images = {}, isB = false, p = product(), proofItems = []) {
  const productName = p.productName || "제품명";
  const referenceSections = images?.referenceSections || [];
  const proof = (proofItems.length ? proofItems : fallbackUspForIndustry(inferProductIndustry())).slice(0, 4);
  const mainSlot = isB ? "openBox" : "package";
  const subSlot = isB ? "boxYellow" : "giftBag";
  const referenceA = referenceSections[isB ? 6 : 2] || images?.origin || images?.lifestyle;
  const referenceB = referenceSections[isB ? 9 : 5] || images?.trust || images?.info;
  const headline = isB
    ? "구매 전에 확인해야 할 정보를 앞쪽에서 바로 정리"
    : "첫 화면부터 선물 패키지와 원료 무드를 크게 보여주는 구성";
  const lead = isB
    ? "고객이 오래 읽기 전에 구성, 휴대성, 선물 가능성, 신뢰 포인트를 빠르게 판단하도록 만든 전환형 구간입니다."
    : "제품 컷을 한 번만 크게 쓰고 끝내지 않고, 패키지와 스틱 컷을 반복 노출해 실제 판매 상세페이지의 리듬을 만듭니다.";
  const checklist = isB
    ? ["30포 구성 확인", "휴대용 스틱 타입", "선물/보관 편의", "원료 정보 분리"]
    : ["패키지 첫인상", "원료 스토리", "선물 장면", "브랜드 무드"];

  return `
    <section class="template-mix-commerce-snapshot ${isB ? "is-conversion" : "is-premium"}">
      <div class="commerce-snapshot-copy">
        <small>${escapeHtml(isB ? "SHOPPING SNAPSHOT" : "PREMIUM SNAPSHOT")}</small>
        <h3>${escapeHtml(headline)}</h3>
        <p>${escapeHtml(lead)}</p>
        <div class="commerce-snapshot-checks">
          ${checklist.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
      <div class="commerce-snapshot-stage">
        <figure class="commerce-snapshot-main">
          ${salesImage(images, mainSlot, productName)}
          <figcaption>${escapeHtml(isB ? "구성 확인 컷" : "대표 패키지 컷")}</figcaption>
        </figure>
        <figure class="commerce-snapshot-sub">
          ${salesImage(images, subSlot, "보조 제품 컷")}
        </figure>
        <div class="commerce-snapshot-proof">
          ${proof.slice(0, 3).map((item, index) => `
            <article>
              <i>${String(index + 1).padStart(2, "0")}</i>
              <b>${escapeHtml(item)}</b>
            </article>
          `).join("")}
        </div>
      </div>
      <div class="commerce-snapshot-reference">
        ${referenceA ? `<img src="${referenceA}" alt="기존 상세페이지 참고 구간">` : ""}
        ${referenceB ? `<img src="${referenceB}" alt="기존 상세페이지 참고 구간">` : ""}
      </div>
    </section>
  `;
}

function salesTemplateMixDetailPage(p, images, isB = false, industry = "commerce", heroTitle = "", heroCopy = "", usp = [], highlights = []) {
  const proofItems = (usp.length ? usp : fallbackUspForIndustry(industry)).slice(0, 4);
  const storyItems = isB
    ? ["원료 확인", "구성 확인", "휴대 편의", "구매 판단"]
    : ["브랜드 무드", "원료 스토리", "선물 패키지", "데일리 루틴"];
  const mainSlot = isB ? "boxYellow" : "boxPink";
  const subSlot = isB ? "openBox" : "stick";
  const darkTitle = isB ? "나에게 맞는 건강한 루틴을 빠르게 확인" : "선물처럼 전하는 하루 한 포의 프리미엄";
  const finalTitle = isB ? "구매 전 마지막으로 확인하세요" : "고급스러운 선물 루틴 제안";
  const tableItems = [
    { label: "구성", value: "30포 스틱형" },
    { label: "타입", value: "간편 섭취" },
    { label: "무드", value: isB ? "정보 전달형" : "프리미엄 선물형" },
  ];
  const stripSlots = isB
    ? [
        { slot: "stick", label: "STICK", copy: "한 포씩 간편하게" },
        { slot: "openBox", label: "30P", copy: "구성 확인" },
        { slot: "package", label: "PACKAGE", copy: "패키지 정보" },
      ]
    : [
        { slot: "package", label: "PACKAGE", copy: "선물용 첫인상" },
        { slot: "stick", label: "STICK", copy: "데일리 루틴" },
        { slot: "giftBag", label: "GIFT", copy: "프리미엄 무드" },
      ];
  const decisionItems = isB
    ? [
        { label: "01", title: "무엇이 다른가", copy: proofItems[0] || "원료와 구성 차별점" },
        { label: "02", title: "왜 편한가", copy: proofItems[2] || "개별 스틱과 휴대성" },
        { label: "03", title: "왜 선택하는가", copy: proofItems[3] || "선물성과 구매 판단 정보" },
      ]
    : [
        { label: "01", title: "첫인상", copy: "고급스러운 패키지와 선물 무드" },
        { label: "02", title: "스토리", copy: proofItems[0] || "원료가 가진 브랜드 가치" },
        { label: "03", title: "루틴", copy: proofItems[2] || "하루 한 포의 간편한 사용감" },
      ];

  return `
    <div class="sales-template-mix-page ${isB ? "is-conversion" : "is-premium"}">
      ${templateMixSectionRail(isB)}
      ${templateMixCampaignCover(images, isB, p, proofItems)}
      <section class="template-mix-hero">
        <div class="template-mix-copy">
          <small>${escapeHtml(isB ? "B안 - Commerce Template" : "A안 - Premium Template")}</small>
          <h2>${escapeHtml(heroTitle || p.productName || "제품명")}</h2>
          <p>${escapeHtml(heroCopy || "제품 한 줄 설명이 들어갑니다.")}</p>
          <div class="template-mix-mini-cards">
            ${storyItems.slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
          ${templateMixHeroProof(isB)}
          ${templateMixHeroOfferBar(isB, proofItems)}
        </div>
        <figure class="template-mix-product">
          <span class="template-mix-hero-stamp">${escapeHtml(isB ? "BUYING CHECK" : "PREMIUM GIFT")}</span>
          ${salesImage(images, mainSlot, p.productName || "대표 제품 이미지")}
          ${templateMixHeroDecor(images, isB)}
        </figure>
      </section>

      <section class="template-mix-product-strip">
        ${stripSlots.map((item) => `
          <article>
            <figure>${salesImage(images, item.slot, item.label)}</figure>
            <div>
              <b>${escapeHtml(item.label)}</b>
              <span>${escapeHtml(item.copy)}</span>
            </div>
          </article>
        `).join("")}
      </section>

      ${templateMixCommerceSnapshot(images, isB, p, proofItems)}

      ${templateMixReferenceHeroBand(images, isB, proofItems)}

      ${templateMixVisualProofWall(images, isB, proofItems)}

      ${templateMixAdPoster(images, isB, p, proofItems)}

      ${templateMixCommercialBannerSet(images, isB, p, proofItems)}

      ${templateMixOfferSequence(images, isB, proofItems)}

      ${templateMixConceptDivider(isB, proofItems)}

      ${templateMixVariantSignature(images, isB, proofItems)}

      ${templateMixEditorialScene(images, isB, proofItems)}

      <section class="template-mix-dark">
        <div>
          <small>${escapeHtml(isB ? "BUYING POINT" : "BRAND STORY")}</small>
          <h3>${escapeHtml(darkTitle)}</h3>
          <p>${escapeHtml(isB ? "정보를 빠르게 확인할 수 있도록 장점, 구성, 신뢰 포인트를 압축해 보여줍니다." : "원료와 패키지 무드가 먼저 느껴지도록 제품 이미지를 크게 배치하고 감성 카피를 더합니다.")}</p>
        </div>
        <figure>${salesImage(images, subSlot, "보조 제품 이미지")}</figure>
      </section>

      <section class="template-mix-benefits">
        <small>KEY POINT</small>
        <h3>${escapeHtml(isB ? "고객이 바로 이해하는 구매 이유" : "브랜드 가치가 보이는 핵심 포인트")}</h3>
        ${templateMixBenefitShowcase(images, isB, proofItems)}
        <div>
          ${proofItems.map((item, index) => `
            <article>
              <i>${String(index + 1).padStart(2, "0")}</i>
              <b>${escapeHtml(item)}</b>
              <span>${escapeHtml(benefitSubcopy(item, index, industry))}</span>
            </article>
          `).join("")}
        </div>
      </section>

      ${templateMixRoutineFlow(images, isB, proofItems)}

      <section class="template-mix-decision">
        <small>${escapeHtml(isB ? "DECISION FLOW" : "PREMIUM FLOW")}</small>
        <h3>${escapeHtml(isB ? "구매 판단 흐름을 순서대로 정리" : "브랜드 가치가 구매 이유로 이어지는 흐름")}</h3>
        <div>
          ${decisionItems.map((item) => `
            <article>
              <i>${escapeHtml(item.label)}</i>
              <b>${escapeHtml(item.title)}</b>
              <span>${escapeHtml(item.copy)}</span>
            </article>
          `).join("")}
        </div>
        ${templateMixCommerceTable(isB, proofItems)}
      </section>

      <section class="template-mix-split">
        <figure>${salesImage(images, "package", "패키지 이미지")}</figure>
        <div>
          <small>${escapeHtml(isB ? "CHECK LIST" : "GIFT PACKAGE")}</small>
          <h3>${escapeHtml(isB ? "구매 전에 확인할 내용을 정리" : "선물용으로 보기 좋은 구성")}</h3>
          ${tableItems.map((item) => `<span><b>${escapeHtml(item.label)}</b>${escapeHtml(item.value)}</span>`).join("")}
        </div>
      </section>

      <section class="template-mix-info">
        <small>DETAIL INFORMATION</small>
        <h3>${escapeHtml(isB ? "제품 정보를 한눈에 확인" : "프리미엄 루틴을 완성하는 디테일")}</h3>
        <div class="template-mix-info-grid">
          ${productSpecItems().slice(0, 4).map((item) => `<span><b>${escapeHtml(item.label)}</b><em>${escapeHtml(item.value)}</em></span>`).join("")}
        </div>
        <figure>${salesImage(images, isB ? "info" : "giftBag", "제품 정보 이미지")}</figure>
      </section>

      <section class="template-mix-check">
        <h3>${escapeHtml(isB ? "선택 전 체크 포인트" : "이런 분께 추천합니다")}</h3>
        ${storyItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        <figure>${salesImage(images, "stick", "스틱 제품 이미지")}</figure>
      </section>

      <section class="template-mix-proof">
        <div>
          <small>${escapeHtml(isB ? "TRUST CHECK" : "QUALITY MOOD")}</small>
          <h3>${escapeHtml(isB ? "과장 없이 확인하는 신뢰 정보" : "제품 가치를 차분하게 보여주는 마감 구간")}</h3>
          <p>${escapeHtml(isB ? "건강식품은 효능 과장보다 구성, 원료, 섭취 편의, 주의 정보를 명확히 보여주는 것이 중요합니다." : "프리미엄 이미지는 제품 컷, 여백, 정보 정리가 함께 맞아야 고객이 신뢰합니다.")}</p>
        </div>
        <figure>${salesImage(images, isB ? "trust" : "lifestyle", "신뢰/무드 이미지")}</figure>
      </section>

      ${templateMixReferenceFlow(images, isB)}

      ${templateMixPhotoDirection(images, isB)}

      ${templateMixPurchaseStack(images, isB, proofItems, highlights)}

      <section class="template-mix-final">
        <small>${escapeHtml(isB ? "FINAL CHECK" : "PREMIUM ROUTINE")}</small>
        <h3>${escapeHtml(finalTitle)}</h3>
        <p>${escapeHtml(highlights[0] || proofItems[0] || "고객이 마지막에 선택할 수 있도록 구매 포인트를 다시 정리합니다.")}</p>
        <figure class="template-mix-final-product">${salesImage(images, isB ? "openBox" : "package", "최종 제품 이미지")}</figure>
        ${templateMixFinalOrderPanel(isB)}
        <div class="template-mix-final-badges">
          ${(isB ? ["구성 확인", "정보 정리", "구매 판단"] : ["선물 무드", "원료 스토리", "프리미엄 루틴"]).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
        <b>${escapeHtml(isB ? "구매 포인트 확인하기" : "선물 구성 확인하기")}</b>
      </section>
    </div>
  `;
}

function salesDetailPageMarkup(label, template, slots, images, dataset, concept, edits = [], blueprint = {}) {
  const p = product();
  const isB = label.includes("B");
  const workflow = latestDesignWorkflow();
  const profile = blueprint.profile || designEngineProfile(label, template, workflow);
  const motiveBadges = salesMotiveBadges(workflow, isB);
  const visualBadges = salesVisualNeedBadges(workflow);
  const industry = normalizeIndustryKey(workflow.analysis?.industry || inferProductIndustry());
  const usp = p.usp.length ? p.usp : fallbackUspForIndustry(industry);
  const highlights = p.highlight.length ? p.highlight : dataset.purchasePoints;
  const industryDefaults = salesIndustryCopyDefaults(industry, isB, dataset);
  const heroTitle = editedValue(edits, 0, "title", slots.productName || p.productName || "호아비 리치꿀스틱 30포");
  const heroCopy = editedValue(edits, 0, "copy", slots.oneLine || "리치와 꿀이 전하는 하루 한 포의 프리미엄 루틴");
  const storyTitle = editedValue(edits, 1, "title", industryDefaults.storyTitle);
  const storyCopy = editedValue(edits, 1, "copy", slots.originStory || dataset.mainMessage);
  const benefitTitle = editedValue(edits, 2, "title", industryDefaults.benefitTitle);
  const benefitCopy = editedValue(edits, 2, "copy", slots.benefits || dataset.mainMessage);
  const sceneTitle = editedValue(edits, 3, "title", industryDefaults.sceneTitle);
  const sceneCopy = editedValue(edits, 3, "copy", slots.usageScene || slots.giftMessage || dataset.copyBlocks.cta);
  const trustTitle = editedValue(edits, 4, "title", industryDefaults.trustTitle);
  const trustCopy = editedValue(edits, 4, "copy", slots.trust || dataset.copyBlocks.trust);
  const infoTitle = editedValue(edits, 5, "title", industryDefaults.infoTitle);
  const infoCopy = editedValue(edits, 5, "copy", slots.info || "구성, 원료, 보관 방법을 구매 전 확인하기 쉽게 정리했습니다.");
  const ctaTitle = editedValue(edits, 6, "title", industryDefaults.ctaTitle);
  const ctaCopy = editedValue(edits, 6, "copy", slots.cta || dataset.copyBlocks.cta);
  const heroBadge = isB ? "BUYING POINT" : "PREMIUM GIFT ROUTINE";
  const pageType = isB ? "conversion" : "premium";

  return `
    <div class="sales-detail-page sales-${pageType}">
      ${salesAmbientProductLayer(isB)}
      ${salesTemplateMixDetailPage(p, images, isB, industry, heroTitle, heroCopy, usp, highlights)}
      ${salesCommerceTopper(p, isB)}
      ${salesFigmaHeroCanvas(p, images, isB, industry, heroTitle, heroCopy, usp, highlights)}
      ${salesFigmaIngredientShowcaseCanvas(images, isB, industry, usp, highlights)}
      ${salesPremiumAdDensityPanel(images, isB, industry, heroTitle, heroCopy, usp, highlights)}
      <section class="${salesSectionClass(edits, 0, "sales-hero-section", isB ? "graphic-badge" : "photo-focus")}"${salesSectionStyle(edits, 0)}>
        ${salesHeroDecorLayer(isB)}
        <div class="sales-section-number">01</div>
        <div class="sales-hero-copy">
          <small>${escapeHtml(heroBadge)}</small>
          <h2>${escapeHtml(heroTitle)}</h2>
          <p>${escapeHtml(heroCopy)}</p>
          ${salesHeroQualityBand(isB, workflow)}
          <div class="sales-copy-points">
            ${salesQuickProofItems(isB).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
          <div class="sales-motive-rail">
            ${motiveBadges.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
          <div class="sales-hero-chips">
            ${usp.slice(0, 4).map((item) => `<b>${escapeHtml(item)}</b>`).join("")}
          </div>
          ${salesMoodKeywords(isB)}
          <div class="sales-hero-metrics">
            ${heroBadgeItems().map((item) => `<div><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)}</span></div>`).join("")}
          </div>
          ${salesIndustrySignaturePanel(profile, isB)}
          ${salesHeroSpecStrip()}
          ${isB ? salesConversionHeroChecklist(usp) : salesPremiumHeroSignature(highlights)}
          ${salesHeroSignatureStrip(isB, industry)}
          ${salesAdvertisingClaimStack(isB, industry)}
          ${salesCommerceRibbon(isB)}
        </div>
        <div class="sales-hero-visual">
          <div class="sales-hero-visual-stage">
            <div class="sales-hero-orbit" aria-hidden="true"></div>
            ${salesHeroBackdropLabel(isB, p.productName || heroTitle)}
            <div class="sales-hero-frame">${salesHeroProductComposition(images, editedImageSlot(edits, 0, "hero"), heroTitle, isB, industry)}</div>
            ${salesHeroSpotlightNotes(isB, industry)}
            <div class="sales-side-stat">
              <b>${escapeHtml(isB ? "POINT" : "GIFT")}</b>
              <span>${escapeHtml(isB ? "구매 판단을 빠르게 돕는 구성" : "선물용으로 보기 좋은 패키지 무드")}</span>
            </div>
          </div>
          ${salesHeroProductShowcaseRail(images, isB, industry)}
          ${salesHeroEditorialBoard(images, isB, industry)}
          <div class="sales-visual-labels">
            ${usp.slice(0, 3).map((item, index) => `<span>${String(index + 1).padStart(2, "0")} ${escapeHtml(item)}</span>`).join("")}
          </div>
          ${salesHeroCommerceSeals(isB)}
          <div class="sales-floating-card">
            <b>${escapeHtml(isB ? "선택 이유" : "선물 포인트")}</b>
            <span>${escapeHtml(highlights[0] || usp[0])}</span>
          </div>
        </div>
      </section>
      ${salesDetailRhythmStrip(isB, workflow)}
      ${salesShopDetailIndexStrip(isB, industry, usp)}
      ${salesFigmaEditorialCanvas(images, isB, industry, usp)}
      ${salesFigmaPurchaseCanvas(images, isB, industry, usp, highlights)}
      ${salesFigmaConversionDecisionCanvas(images, isB, industry, usp)}

      <section class="${salesSectionClass(edits, 1, "sales-story-section", isB ? "graphic-badge" : "editorial")}"${salesSectionStyle(edits, 1)}>
        <div class="sales-section-number">02</div>
        ${salesSectionRibbon("story", isB, industry)}
        <div class="sales-section-heading">
          <small>INGREDIENT STORY</small>
          <h3>${escapeHtml(storyTitle)}</h3>
          <p>${escapeHtml(storyCopy)}</p>
        </div>
        <div class="sales-story-grid">
          <figure>
            ${salesImage(images, editedImageSlot(edits, 1, "origin"), "원료 스토리 이미지")}
            ${salesImageCaption("Origin visual", "원료와 브랜드 이야기가 느껴지는 대표 이미지")}
          </figure>
          <div class="sales-ingredient-cards">
            ${ingredientItems().map((item) => `
              <div>
                <b>${escapeHtml(item.label)}</b>
                <strong>${escapeHtml(item.value)}</strong>
                <span>${escapeHtml(item.copy)}</span>
              </div>
            `).join("")}
          </div>
        </div>
        ${salesIngredientScenePanel(images, isB)}
        ${salesEditorialImageStoryBoard(images, isB, industry)}
        ${salesNarrativeBridgePanel(images, isB, industry)}
        ${salesDetailReferenceRemixBoard(images, isB, industry)}
        ${salesLongScrollPreviewBoard(images, isB, industry)}
        ${salesIngredientVisualMap(images, isB, industry)}
        ${isB ? salesConversionCompareBlock() : salesPremiumStoryFlow()}
        ${isB ? "" : salesPremiumBrandStatement(highlights)}
        ${salesProductCompositionStrip(images, isB)}
        ${salesDesignAccentPanel(images, isB)}
        ${salesDesignSystemPanel(profile, isB)}
        <div class="sales-visual-proof-rail">
          <b>촬영/합성 기준</b>
          ${visualBadges.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </section>

      <section class="${salesSectionClass(edits, 2, "sales-benefit-section", isB ? "graphic-badge" : "premium-card")}"${salesSectionStyle(edits, 2)}>
        <div class="sales-section-number">03</div>
        ${salesSectionRibbon("benefit", isB, industry)}
        <div class="sales-section-heading center">
          <small>${escapeHtml(isB ? "WHY BUY" : "KEY BENEFITS")}</small>
          <h3>${escapeHtml(benefitTitle)}</h3>
          <p>${escapeHtml(benefitCopy)}</p>
        </div>
        <div class="sales-benefit-board">
          ${usp.slice(0, 4).map((item, index) => `
            <div>
              <i>${String(index + 1).padStart(2, "0")}</i>
              <strong>${escapeHtml(item)}</strong>
              <span>${escapeHtml(benefitSubcopy(item, index, workflow.analysis?.industry))}</span>
            </div>
          `).join("")}
        </div>
        ${salesBenefitSummaryStrip(usp, isB)}
        ${salesValueJourneyPanel(usp, isB)}
        ${salesBenefitReasonLadder(usp, isB)}
        ${salesMarketplaceProofPanel(isB, workflow)}
        ${salesDetailAdSpread(images, usp, isB, industry)}
        ${salesFeaturePosterBoard(images, usp, isB, industry)}
        ${salesCommerceComparisonBand(usp, isB, industry)}
        <div class="sales-product-strip">
          ${salesImageCard(images, editedImageSlot(edits, 2, "feature"), "Detail", "제품 디테일", "스틱, 원료, 질감이 보이는 가까운 컷")}
          ${salesImageCard(images, "package", "Package", "패키지 구성", "선물성과 구성품을 한눈에 보여주는 컷")}
          ${salesImageCard(images, "lifestyle", "Routine", "사용 장면", "일상 속 섭취 상황을 자연스럽게 보여주는 컷")}
        </div>
        ${isB ? salesBuyingChecklist(usp) : salesPremiumMoodBand(highlights)}
        ${isB ? salesConversionProofMatrix(usp) : salesPremiumEditorialQuote(highlights)}
        ${isB ? salesConversionDecisionPanel(usp, highlights) : ""}
        ${salesSectionGraphicFooter(isB)}
      </section>

      <section class="${salesSectionClass(edits, 3, "sales-scene-section", "photo-focus")}"${salesSectionStyle(edits, 3)}>
        <div class="sales-section-number">04</div>
        <div class="sales-scene-copy">
          <small>LIFESTYLE SCENE</small>
          <h3>${escapeHtml(sceneTitle)}</h3>
          <p>${escapeHtml(sceneCopy)}</p>
          <div class="sales-scene-list">
            ${photoConcepts().slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
          ${salesSceneMiniShowcase(images, isB)}
        </div>
        <figure>
          ${salesImage(images, editedImageSlot(edits, 3, "lifestyle"), "라이프스타일 이미지")}
          ${salesImageCaption("Lifestyle direction", "초안에서는 임시 이미지로 구성하고, 최종 제작 시 동일한 분위기의 촬영/합성컷으로 교체")}
        </figure>
        ${salesLifestyleShowcase(images, isB)}
      </section>

      <section class="${salesSectionClass(edits, 4, "sales-trust-section", isB ? "premium-card" : "editorial")}"${salesSectionStyle(edits, 4)}>
        <div class="sales-section-number">05</div>
        ${salesSectionRibbon("trust", isB, industry)}
        <div class="sales-section-heading">
          <small>TRUST CHECK</small>
          <h3>${escapeHtml(trustTitle)}</h3>
          <p>${escapeHtml(trustCopy)}</p>
        </div>
        <div class="sales-trust-grid">
          ${trustProofItems().map((item) => `
            <div>
              <b>${escapeHtml(item.title)}</b>
              <span>${escapeHtml(item.copy)}</span>
            </div>
          `).join("")}
        </div>
        ${salesTrustSealPanel(isB, workflow)}
        ${salesTrustDocumentPanel(images, isB, workflow)}
        ${salesTrustChecklistPanel(isB, workflow)}
        ${salesTrustCommercePanel(images, isB, workflow)}
        ${salesReviewStyleProofPanel(isB, workflow)}
        <div class="sales-trust-score">
          ${trustScoreItems().map((item) => `
            <div>
              <small>${escapeHtml(item.label)}</small>
              <b>${escapeHtml(item.value)}</b>
              <span>${escapeHtml(item.copy)}</span>
            </div>
          `).join("")}
        </div>
        <div class="sales-risk-note">
          ${salesRiskRules(workflow).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </section>

      <section class="${salesSectionClass(edits, 5, "sales-info-section", isB ? "premium-card" : "editorial")}"${salesSectionStyle(edits, 5)}>
        <div class="sales-section-number">06</div>
        <div class="sales-info-copy">
          <small>PRODUCT INFORMATION</small>
          <h3>${escapeHtml(infoTitle)}</h3>
          <p>${escapeHtml(infoCopy)}</p>
        </div>
        <div class="sales-info-table">
          ${productSpecItems().map((item) => `<div><b>${escapeHtml(item.label)}</b><span>${escapeHtml(item.value)}</span></div>`).join("")}
        </div>
        ${salesInfoVisualPanel(images, workflow)}
        ${salesInfoNoticeBar()}
        ${salesPurchaseConfirmPanel(isB, workflow)}
        ${salesPackageUnboxingPanel(images, isB, workflow)}
      </section>

      <section class="${salesSectionClass(edits, 6, "sales-final-section", isB ? "graphic-badge" : "premium-card")}"${salesSectionStyle(edits, 6)}>
        <div class="sales-section-number">07</div>
        <small>${escapeHtml(isB ? "FINAL CHOICE" : "GIFTABLE PREMIUM")}</small>
        <h3>${escapeHtml(ctaTitle)}</h3>
        <p>${escapeHtml(ctaCopy)}</p>
        <div class="sales-final-action">
          <b>${escapeHtml(isB ? "구매 포인트 다시 보기" : "선물용 구성 확인하기")}</b>
          <span>${escapeHtml(p.productName || "제품")} 상세페이지 최종 CTA 영역</span>
        </div>
        ${salesRetailClosingPanel(images, isB, workflow)}
        ${salesFinalCatalogPanel(images, isB, workflow)}
        <div class="sales-final-product">
          ${salesFinalProductStack(images, editedImageSlot(edits, 6, "package"))}
        </div>
        ${salesFinalOfferStack(isB)}
        ${salesCheckoutOfferPanel(isB, workflow)}
        ${salesFinalProofStrip(isB, workflow)}
        ${salesFinalCommerceBar(isB, workflow)}
        ${salesFinalPackageDetail(images, isB, workflow)}
        ${salesFinalDecisionPanel(images, isB, workflow)}
        ${salesRetailDecisionReceipt(isB, workflow)}
        ${salesFinalConversionDeck(images, isB, workflow)}
        <div class="sales-final-badges">
          ${commerceActionItems().map((item) => `<div><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.copy)}</span></div>`).join("")}
        </div>
      </section>
    </div>
  `;
}

function salesHeroCommerceSeals(isB = false) {
  const items = isB
    ? [
        { label: "CHECK", value: "구성 확인" },
        { label: "POINT", value: "구매 이유" },
        { label: "TRUST", value: "정보 검수" },
      ]
    : [
        { label: "30P", value: "선물 구성" },
        { label: "STICK", value: "간편 루틴" },
        { label: "GIFT", value: "패키지 무드" },
      ];
  return `
    <div class="sales-hero-commerce-seals ${isB ? "is-conversion" : "is-premium"}">
      ${items.map((item) => `
        <span>
          <b>${escapeHtml(item.label)}</b>
          <small>${escapeHtml(item.value)}</small>
        </span>
      `).join("")}
    </div>
  `;
}

function salesCommerceTopper(p = product(), isB = false) {
  const items = isB
    ? ["구매 포인트", "구성 확인", "주의 정보", "최종 선택"]
    : ["브랜드 스토리", "원료 무드", "선물 패키지", "프리미엄 루틴"];
  return `
    <div class="sales-commerce-topper ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "SHOPPING DETAIL PREVIEW" : "BRAND DETAIL PREVIEW")}</small>
        <strong>${escapeHtml(p.productName || "제품 상세페이지")}</strong>
      </div>
      <nav>
        ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </nav>
      <b>${escapeHtml(isB ? "A/B 구매 설득형" : "A/B 프리미엄 브랜드형")}</b>
    </div>
  `;
}

function salesPremiumAdDensityPanel(images = {}, isB = false, industry = "commerce", heroTitle = "", heroCopy = "", usp = [], highlights = []) {
  const headline = isB ? "구매 전 필요한 정보를 한 화면에 압축" : "선물처럼 보이는 프리미엄 첫인상";
  const subcopy = isB
    ? "가격보다 먼저 확인해야 할 구성, 원료, 휴대성, 신뢰 포인트를 커머스형 카드로 정리합니다."
    : "제품 이미지와 원료 무드를 크게 보여주고, 브랜드 스토리와 선물성을 자연스럽게 연결합니다.";
  const mainSlot = isB ? "openBox" : "package";
  const subSlot = isB ? "stick" : "boxPink";
  const cardItems = (usp.length ? usp : ["원료", "패키지", "휴대성", "선물성"]).slice(0, 4);
  return `
    <section class="sales-advertorial-spread ${isB ? "is-conversion" : "is-premium"}">
      <div class="sales-advertorial-copy">
        <small>${escapeHtml(isB ? "COMMERCE DETAIL SYSTEM" : "BRAND DETAIL SYSTEM")}</small>
        <h3>${escapeHtml(headline)}</h3>
        <p>${escapeHtml(heroCopy || subcopy)}</p>
        <div class="sales-advertorial-tags">
          ${cardItems.map((item, index) => `<span><b>${String(index + 1).padStart(2, "0")}</b>${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
      <div class="sales-advertorial-visual">
        <figure class="is-main">
          ${salesImage(images, mainSlot, heroTitle || "대표 제품 이미지")}
          <figcaption>${escapeHtml(isB ? "구성 확인 컷" : "대표 패키지 컷")}</figcaption>
        </figure>
        <figure class="is-sub">
          ${salesImage(images, subSlot, "제품 디테일 컷")}
          <figcaption>${escapeHtml(isB ? "섭취/휴대 디테일" : "선물 무드 디테일")}</figcaption>
        </figure>
        <div class="sales-advertorial-proof">
          <strong>${escapeHtml(isB ? "CHECK FLOW" : "PREMIUM FLOW")}</strong>
          ${(highlights.length ? highlights : cardItems).slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
    </section>
  `;
}

function salesShopDetailIndexStrip(isB = false, industry = "commerce", usp = []) {
  const items = isB
    ? ["구매 이유", "구성 비교", "신뢰 확인", "최종 선택"]
    : ["브랜드 무드", "원료 스토리", "선물 구성", "프리미엄 루틴"];
  const focus = usp.slice(0, 3);
  return `
    <section class="sales-shop-index-strip ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(normalizeIndustryKey(industry).toUpperCase())} DETAIL FLOW</small>
        <strong>${escapeHtml(isB ? "빠르게 판단되는 상세 흐름" : "천천히 설득되는 브랜드 흐름")}</strong>
      </div>
      <ol>
        ${items.map((item, index) => `<li><b>${String(index + 1).padStart(2, "0")}</b><span>${escapeHtml(item)}</span></li>`).join("")}
      </ol>
      <p>${escapeHtml(focus.join(" · ") || "제품 핵심 정보와 구매 판단 요소를 섹션별로 연결합니다.")}</p>
    </section>
  `;
}

function salesFinalCatalogPanel(images = {}, isB = false, workflow = {}) {
  const points = isB
    ? ["구성 확인", "휴대성 확인", "선택 이유 정리"]
    : ["선물 패키지", "원료 무드", "브랜드 신뢰"];
  return `
    <div class="sales-final-catalog-panel ${isB ? "is-conversion" : "is-premium"}">
      <div class="sales-final-catalog-copy">
        <small>${escapeHtml(isB ? "LAST CHECK" : "GIFT CHECK")}</small>
        <strong>${escapeHtml(isB ? "마지막 구매 판단을 한 번 더 정리합니다" : "선물하기 전 확인할 프리미엄 구성")}</strong>
        <p>${escapeHtml(isB ? "상세페이지 하단에서 고객이 망설이지 않도록 핵심 정보와 CTA를 다시 묶습니다." : "제품 무드, 패키지, 사용 루틴을 한 화면에서 확인할 수 있게 정리합니다.")}</p>
        <div>
          ${points.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
      <figure>
        ${salesImage(images, isB ? "openBox" : "giftBag", "최종 구매/선물 구성 이미지")}
      </figure>
    </div>
  `;
}

function salesHeroQualityBand(isB = false, workflow = latestDesignWorkflow()) {
  const blocks = workflow?.designBlocks || recommendedDesignBlocks(workflow?.analysis || analyzeProductForDesign(), workflow?.decision || designDecisionFromAnalysis(workflow?.analysis || analyzeProductForDesign()));
  const items = (isB ? blocks.B?.heroBand : blocks.A?.heroBand) || designBlockLibraryForIndustry("commerce").heroA;
  return `
    <div class="sales-hero-quality-band ${isB ? "is-conversion" : "is-premium"}">
      ${items.map((item) => `
        <article>
          <b>${escapeHtml(item.label)}</b>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.copy)}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function salesHeroProductShowcaseRail(images = {}, isB = false, industry = inferProductIndustry()) {
  const itemMap = {
    health: [
      { slot: "stick", label: "Stick", copy: "개별 스틱" },
      { slot: "package", label: "Package", copy: "선물 패키지" },
      { slot: "openBox", label: "30P", copy: "구성 확인" },
    ],
    beauty: [
      { slot: "feature", label: "Texture", copy: "제형/사용감" },
      { slot: "package", label: "Package", copy: "브랜드 패키지" },
      { slot: "lifestyle", label: "Routine", copy: "데일리 케어" },
    ],
    living: [
      { slot: "feature", label: "Detail", copy: "제품 디테일" },
      { slot: "lifestyle", label: "Use", copy: "사용 장면" },
      { slot: "package", label: "Set", copy: "구성 확인" },
    ],
    fashion: [
      { slot: "feature", label: "Material", copy: "소재 디테일" },
      { slot: "lifestyle", label: "Look", copy: "착용 장면" },
      { slot: "package", label: "Option", copy: "옵션 확인" },
    ],
    commerce: [
      { slot: "feature", label: "Detail", copy: "제품 디테일" },
      { slot: "lifestyle", label: "Use", copy: "사용 장면" },
      { slot: "package", label: "Set", copy: "구성 확인" },
    ],
  };
  const items = itemMap[industry] || itemMap.commerce;
  return `
    <div class="sales-hero-product-rail ${isB ? "is-conversion" : "is-premium"}">
      ${items.map((item) => `
        <figure>
          ${salesImage(images, item.slot, item.label)}
          <figcaption>
            <b>${escapeHtml(item.label)}</b>
            <span>${escapeHtml(item.copy)}</span>
          </figcaption>
        </figure>
      `).join("")}
    </div>
  `;
}

function salesHeroEditorialBoard(images = {}, isB = false, industry = inferProductIndustry()) {
  const copy = {
    health: isB ? "구성, 휴대성, 선물성을 한 번에 확인하는 구매 판단 컷" : "원료와 패키지 무드를 함께 보여주는 프리미엄 선물 컷",
    beauty: isB ? "제형과 패키지를 빠르게 비교하는 구매 판단 컷" : "브랜드 감성과 제형 무드를 함께 보여주는 뷰티 컷",
    living: isB ? "사용 전후와 구성 정보를 빠르게 이해시키는 실용 컷" : "생활 공간 안에서 제품 가치를 보여주는 연출 컷",
    fashion: isB ? "소재, 핏, 옵션을 빠르게 확인하는 구매 판단 컷" : "브랜드 무드와 착용 이미지를 함께 보여주는 스타일 컷",
    commerce: isB ? "구성, 디테일, 사용 장면을 빠르게 확인하는 구매 판단 컷" : "제품 가치와 브랜드 무드를 함께 보여주는 대표 컷",
  };
  const main = images?.package ? "package" : "hero";
  const sub = images?.stick ? "stick" : "feature";
  const side = images?.giftBag ? "giftBag" : "openBox";
  return `
    <div class="sales-hero-editorial-board ${isB ? "is-conversion" : "is-premium"}">
      <figure class="is-main">${salesImage(images, main, "대표 패키지 연출컷")}</figure>
      <figure class="is-sub">${salesImage(images, sub, "제품 디테일 컷")}</figure>
      <div>
        <small>${escapeHtml(isB ? "DETAIL CUT SYSTEM" : "VISUAL MOOD SYSTEM")}</small>
        <strong>${escapeHtml(copy[industry] || copy.commerce)}</strong>
        <span>${escapeHtml(isB ? "상세 초안에서는 실제 사진을 기반으로 배치하고, 최종 제작 시 동일 톤으로 촬영/합성 보정합니다." : "상품 첫인상, 제품 질감, 선물 이미지를 한 화면에서 자연스럽게 연결합니다.")}</span>
      </div>
      <figure class="is-side">${salesImage(images, side, "보조 제품 연출컷")}</figure>
    </div>
  `;
}

function salesAdvertisingClaimStack(isB = false, industry = inferProductIndustry()) {
  const copy = {
    health: isB
      ? ["성분보다 먼저 보이는 구매 이유", "구성 · 휴대성 · 선물성 · 신뢰 정보"]
      : ["선물하기 좋은 하루 한 포 루틴", "원료 스토리와 패키지 무드가 먼저 느껴지는 구성"],
    beauty: isB
      ? ["텍스처와 루틴을 빠르게 확인", "고민 · 사용감 · 신뢰 정보를 한 흐름으로"]
      : ["브랜드 감성과 제형 무드 중심", "첫인상부터 감각적인 뷰티 루틴으로 연결"],
    living: isB
      ? ["불편함을 바로 해결하는 구매 구조", "문제 · 해결 · 비교 · 사용법을 빠르게 확인"]
      : ["생활 장면 안에서 보이는 실용 가치", "공간과 사용성을 자연스럽게 보여주는 구성"],
    fashion: isB
      ? ["핏과 옵션을 빠르게 비교", "소재 · 착용 · 선택 정보를 한눈에"]
      : ["룩북처럼 시작하는 제품 상세", "스타일 무드와 디테일 컷을 먼저 강조"],
    commerce: isB
      ? ["구매 전 핵심 포인트를 빠르게 확인", "장점 · 구성 · 신뢰 · CTA를 한 흐름으로"]
      : ["브랜드 무드가 먼저 보이는 제품 상세", "제품 가치와 사용 장면을 자연스럽게 연결"],
  };
  const lines = copy[industry] || copy.commerce;
  return `
    <div class="sales-ad-claim-stack ${isB ? "is-conversion" : "is-premium"}">
      <b>${escapeHtml(isB ? "SHOPPING POINT" : "BRAND MESSAGE")}</b>
      <strong>${escapeHtml(lines[0])}</strong>
      <span>${escapeHtml(lines[1])}</span>
    </div>
  `;
}

function salesLongScrollPreviewBoard(images = {}, isB = false, industry = inferProductIndustry()) {
  const refs = Array.isArray(images?.referenceSections) ? images.referenceSections : [];
  const selected = refs.length
    ? (isB ? [refs[0], refs[3], refs[5], refs[8], refs[10]] : [refs[0], refs[1], refs[2], refs[6], refs[11]]).filter(Boolean)
    : [];
  const fallbackSlots = isB
    ? ["hero", "feature", "package", "trust", "info"]
    : ["hero", "origin", "package", "lifestyle", "giftBag"];
  const labels = {
    health: isB ? ["첫 화면", "장점", "구성", "신뢰", "구매"] : ["브랜드", "원료", "패키지", "선물", "마감"],
    beauty: isB ? ["첫 화면", "고민", "제형", "루틴", "구매"] : ["브랜드", "감성", "텍스처", "루틴", "마감"],
    living: isB ? ["문제", "해결", "비교", "사용", "구매"] : ["공간", "사용", "디테일", "정리", "마감"],
    commerce: isB ? ["첫 화면", "장점", "구성", "신뢰", "구매"] : ["브랜드", "스토리", "제품", "사용", "마감"],
  };
  const names = labels[industry] || labels.commerce;
  return `
    <div class="sales-long-scroll-preview ${isB ? "is-conversion" : "is-premium"}">
      <div class="long-scroll-copy">
        <small>${escapeHtml(isB ? "LONG DETAIL FLOW" : "SHOPPING DETAIL RHYTHM")}</small>
        <strong>${escapeHtml(isB ? "실제 상세페이지처럼 스크롤 흐름을 먼저 설계합니다" : "브랜드 첫인상부터 마무리 CTA까지 긴 호흡으로 이어집니다")}</strong>
        <p>${escapeHtml(isB ? "구매자는 첫 화면, 장점, 신뢰, 구성, CTA를 순서대로 확인합니다. 이 흐름이 끊기지 않도록 섹션 밀도를 맞춥니다." : "제품 이미지와 원료/사용/패키지 컷이 반복적으로 등장해, 단순 설명이 아니라 판매용 상세 흐름처럼 보이게 합니다.")}</p>
      </div>
      <div class="long-scroll-phone">
        ${(selected.length ? selected : fallbackSlots).map((item, index) => `
          <figure>
            ${selected.length ? `<img src="${item}" alt="${escapeHtml(names[index] || "상세 흐름")}">` : salesImage(images, item, names[index] || "상세 흐름")}
            <figcaption>${String(index + 1).padStart(2, "0")} ${escapeHtml(names[index] || "상세 흐름")}</figcaption>
          </figure>
        `).join("")}
      </div>
    </div>
  `;
}

function salesDetailAdSpread(images = {}, usp = [], isB = false, industry = inferProductIndustry()) {
  const p = product();
  const mainSlot = images?.package ? "package" : images?.hero ? "hero" : "feature";
  const subSlot = images?.stick ? "stick" : images?.openBox ? "openBox" : "lifestyle";
  const points = (usp.length ? usp : fallbackUspForIndustry(industry)).slice(0, 3);
  const title = {
    health: isB ? "구매 전 확인할 포인트를 광고처럼 정리" : "프리미엄 원료와 패키지를 크게 보여주는 광고형 섹션",
    beauty: isB ? "제형, 사용감, 루틴을 구매 포인트로 정리" : "브랜드 감성과 텍스처가 보이는 뷰티 광고형 섹션",
    living: isB ? "문제 해결 포인트를 한 화면에서 설득" : "생활 장면과 제품 가치를 크게 보여주는 섹션",
    fashion: isB ? "핏, 소재, 옵션을 구매 포인트로 정리" : "룩북처럼 제품 무드를 보여주는 광고형 섹션",
    commerce: isB ? "구매 전 확인할 포인트를 광고처럼 정리" : "제품 가치와 브랜드 무드를 크게 보여주는 광고형 섹션",
  };
  return `
    <div class="sales-detail-ad-spread ${isB ? "is-conversion" : "is-premium"}">
      <div class="ad-spread-copy">
        <small>${escapeHtml(isB ? "COMMERCE AD SECTION" : "EDITORIAL AD SECTION")}</small>
        <strong>${escapeHtml(title[industry] || title.commerce)}</strong>
        <p>${escapeHtml(isB ? "단순 장점 나열 대신 제품 이미지, 숫자, 배지, 비교 포인트를 한 화면에 묶어 구매 판단을 돕습니다." : "상세페이지 중간에 큰 광고 컷을 넣어 제품이 실제 판매 페이지처럼 힘 있게 보이도록 합니다.")}</p>
        <div>
          ${points.map((item, index) => `<span><b>${String(index + 1).padStart(2, "0")}</b>${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
      <figure class="ad-spread-main">
        ${salesImage(images, mainSlot, p.productName || "제품 대표 이미지")}
      </figure>
      <figure class="ad-spread-sub">
        ${salesImage(images, subSlot, "제품 보조 이미지")}
      </figure>
      <em>${escapeHtml(isB ? "CHECK BEFORE BUY" : "PREMIUM PRODUCT CUT")}</em>
    </div>
  `;
}

function salesDetailRhythmStrip(isB = false, workflow = latestDesignWorkflow()) {
  const blocks = workflow?.designBlocks || recommendedDesignBlocks(workflow?.analysis || analyzeProductForDesign(), workflow?.decision || designDecisionFromAnalysis(workflow?.analysis || analyzeProductForDesign()));
  const items = (isB ? blocks.B?.rhythm : blocks.A?.rhythm) || designBlockLibraryForIndustry("commerce").rhythmA;
  return `
    <div class="sales-detail-rhythm-strip ${isB ? "is-conversion" : "is-premium"}">
      ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesMarketplaceProofPanel(isB = false, workflow = latestDesignWorkflow()) {
  const blocks = workflow?.designBlocks || recommendedDesignBlocks(workflow?.analysis || analyzeProductForDesign(), workflow?.decision || designDecisionFromAnalysis(workflow?.analysis || analyzeProductForDesign()));
  const cards = (isB ? blocks.B?.proofCards : blocks.A?.proofCards) || designBlockLibraryForIndustry("commerce").proofA;
  const emphasis = isB ? blocks.B?.emphasis : blocks.A?.emphasis;
  return `
    <div class="sales-marketplace-proof ${isB ? "is-conversion" : "is-premium"}">
      <div class="sales-marketplace-proof-head">
        <small>${escapeHtml(isB ? "BUYING REASON MAP" : "BRAND VALUE MAP")}</small>
        <strong>${escapeHtml(emphasis || (isB ? "고객이 구매 전에 확인하는 순서대로 설계" : "브랜드 무드와 구매 이유가 자연스럽게 이어지는 구조"))}</strong>
      </div>
      <div class="sales-marketplace-proof-cards">
        ${cards.map((item) => `
          <article>
            <b>${escapeHtml(item.value)}</b>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.copy)}</span>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function salesCheckoutOfferPanel(isB = false, workflow = latestDesignWorkflow()) {
  const blocks = workflow?.designBlocks || recommendedDesignBlocks(workflow?.analysis || analyzeProductForDesign(), workflow?.decision || designDecisionFromAnalysis(workflow?.analysis || analyzeProductForDesign()));
  const items = (isB ? blocks.B?.checkout : blocks.A?.checkout) || designBlockLibraryForIndustry("commerce").checkoutA;
  return `
    <div class="sales-checkout-offer ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "FINAL CHECK" : "SPECIAL ROUTINE")}</small>
        <strong>${escapeHtml(isB ? "구매 전 마지막 확인 포인트" : "선물하기 좋은 프리미엄 한 포")}</strong>
      </div>
      <ul>
        ${items.map((item) => `<li><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.copy)}</span></li>`).join("")}
      </ul>
    </div>
  `;
}

function salesIndustrySignaturePanel(profile = {}, isB = false) {
  const industryCopy = {
    health: isB
      ? ["구성 정보", "섭취 편의", "표현 검수"]
      : ["원료 무드", "선물 가치", "신뢰 정보"],
    beauty: isB
      ? ["피부 고민", "제형 포인트", "후기 설득"]
      : ["감성 무드", "텍스처", "브랜드 톤"],
    living: isB
      ? ["문제 상황", "해결 포인트", "비교 정보"]
      : ["깨끗한 사용감", "생활 장면", "실용 정보"],
    fashion: isB
      ? ["옵션 비교", "착용 포인트", "구매 체크"]
      : ["룩북 무드", "소재감", "스타일링"],
    commerce: isB
      ? ["구매 이유", "정보 확인", "CTA"]
      : ["브랜드 무드", "상품 가치", "신뢰"],
  };
  const chips = industryCopy[profile.industry] || industryCopy.commerce;
  return `
    <div class="sales-industry-signature ${isB ? "is-conversion" : "is-premium"}">
      <small>${escapeHtml(profile.name || "AI DESIGN PROFILE")}</small>
      <b>${escapeHtml(profile.focus || profile.imageStrategy || "제품 특성에 맞춘 상세페이지 디자인 전략")}</b>
      <div>
        ${chips.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function salesDesignSystemPanel(profile = {}, isB = false) {
  const colors = profile.colorSystem || {};
  const flow = Array.isArray(profile.flow) ? profile.flow : ["hero", "story", "benefit", "trust", "info", "cta"];
  const flowLabels = {
    hero: "첫인상",
    story: "스토리",
    benefit: "장점",
    lifestyle: "사용 장면",
    trust: "신뢰",
    info: "정보",
    cta: "구매 유도",
    problem: "문제 제기",
    usage: "사용법",
    compare: "비교",
    lineup: "옵션",
  };
  return `
    <div class="sales-design-system-panel ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>AI DESIGN SYSTEM</small>
        <strong>${escapeHtml(profile.typography || "제품에 맞는 정보 위계와 타이포그래피를 적용합니다")}</strong>
        <p>${escapeHtml(profile.imageStrategy || "대표컷, 사용컷, 정보컷을 상세페이지 흐름에 맞게 배치합니다")}</p>
      </div>
      <ul>
        ${flow.slice(0, 7).map((item, index) => `<li><i>${String(index + 1).padStart(2, "0")}</i><span>${escapeHtml(flowLabels[item] || item)}</span></li>`).join("")}
      </ul>
      <div class="sales-design-swatches">
        <span style="--swatch:${escapeHtml(colors.accent || "#b9822d")}"></span>
        <span style="--swatch:${escapeHtml(colors.bg || "#fffaf0")}"></span>
        <span style="--swatch:${escapeHtml(colors.dark || "#2b241b")}"></span>
      </div>
    </div>
  `;
}

function salesProductCompositionStrip(images = {}, isB = false) {
  const cards = [
    { slot: "stick", label: "Stick", copy: "한 포씩 꺼내기 쉬운 개별 포장" },
    { slot: "openBox", label: "30P", copy: "선물과 데일리 루틴에 맞는 구성" },
    { slot: "giftBag", label: "Gift", copy: "고급스러운 선물 이미지 보강" },
  ];
  return `
    <div class="sales-composition-strip ${isB ? "is-conversion" : "is-premium"}">
      <strong>${escapeHtml(isB ? "구성을 보고 바로 이해하는 제품 쇼케이스" : "프리미엄 패키지 무드를 만드는 구성 쇼케이스")}</strong>
      <div>
        ${cards.map((item) => `
          <article>
            ${salesImage(images, item.slot, item.label)}
            <b>${escapeHtml(item.label)}</b>
            <span>${escapeHtml(item.copy)}</span>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function salesAmbientProductLayer(isB = false) {
  return `
    <div class="sales-ambient-layer ${isB ? "is-conversion" : "is-premium"}" aria-hidden="true">
      <span class="ambient-litchi ambient-litchi-1"></span>
      <span class="ambient-litchi ambient-litchi-2"></span>
      <span class="ambient-honey-line ambient-honey-line-1"></span>
      <span class="ambient-honey-line ambient-honey-line-2"></span>
      <span class="ambient-premium-mark">${escapeHtml(isB ? "BUYING POINT" : "LITCHI HONEY")}</span>
    </div>
  `;
}

function salesIngredientScenePanel(images = {}, isB = false) {
  const points = isB
    ? ["제품 선택 이유를 원료-구성-섭취 편의로 빠르게 연결", "구매 전 필요한 정보를 앞쪽에서 바로 확인", "과장 효능 대신 원료와 구성 중심으로 설득"]
    : ["리치 원료와 꿀의 달콤한 이미지를 브랜드 무드로 연결", "프리미엄 패키지와 원료 스토리를 한 컷 안에 구성", "선물용 건강식품처럼 차분하고 신뢰감 있게 표현"];
  return `
    <div class="sales-ingredient-scene-panel ${isB ? "is-conversion" : "is-premium"}">
      <div class="sales-ingredient-visual">
        ${salesImage(images, isB ? "stick" : "package", "원료 스토리 제품 이미지")}
        ${images?.boxYellow ? `<img src="${images.boxYellow}" alt="보조 패키지 이미지">` : ""}
      </div>
      <div class="sales-ingredient-copy">
        <small>${escapeHtml(isB ? "Reason Mapping" : "Ingredient Mood")}</small>
        <strong>${escapeHtml(isB ? "구매 이유가 한눈에 들어오는 원료/구성 설계" : "원료 스토리와 패키지 무드가 함께 보이는 프리미엄 장면")}</strong>
        ${points.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function salesHeroDecorLayer(isB = false) {
  return `
    <div class="sales-hero-decor-layer" aria-hidden="true">
      <span></span>
      <i></i>
      <b>${escapeHtml(isB ? "CHECK / COMPARE / BUY" : "PREMIUM / GIFT / ROUTINE")}</b>
    </div>
  `;
}

function salesHeroBackdropLabel(isB = false, name = "Product") {
  const text = isB ? "BUY NOW" : name.replace(/\s+/g, " ").slice(0, 18);
  return `<strong class="sales-hero-backdrop-label" aria-hidden="true">${escapeHtml(text)}</strong>`;
}

function salesHeroSpotlightNotes(isB = false, industry = inferProductIndustry()) {
  const map = {
    health: isB ? ["30포 구성", "간편 스틱", "선물 가능"] : ["리치 원료", "프리미엄 꿀", "선물 패키지"],
    beauty: isB ? ["제형 확인", "루틴 제안", "성분 체크"] : ["감성 패키지", "텍스처 무드", "데일리 케어"],
    living: isB ? ["문제 해결", "사용 쉬움", "구성 확인"] : ["생활 장면", "실용 구성", "공간 무드"],
    fashion: isB ? ["핏 확인", "소재 체크", "옵션 선택"] : ["룩북 무드", "소재 디테일", "스타일링"],
    commerce: isB ? ["구성 확인", "장점 비교", "구매 판단"] : ["브랜드 무드", "제품 가치", "사용 장면"],
  };
  const items = map[industry] || map.commerce;
  return `
    <div class="sales-hero-spotlight-notes ${isB ? "is-conversion" : "is-premium"}">
      ${items.map((item, index) => `<span><i>${String(index + 1).padStart(2, "0")}</i>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesHeroSignatureStrip(isB = false, industry = inferProductIndustry()) {
  const titleMap = {
    health: isB ? "구매 전 꼭 확인할 건강식품 정보 흐름" : "프리미엄 건강식품 브랜드 무드 흐름",
    beauty: isB ? "고민-제형-루틴으로 이어지는 뷰티 선택 흐름" : "감성 제형과 브랜드 무드가 이어지는 뷰티 흐름",
    living: isB ? "문제-해결-사용으로 이어지는 실용 선택 흐름" : "생활 장면과 제품 가치가 이어지는 사용 흐름",
    fashion: isB ? "핏-소재-옵션으로 이어지는 스타일 선택 흐름" : "룩북 무드와 착용 감도가 이어지는 스타일 흐름",
    commerce: isB ? "구매 판단을 빠르게 돕는 정보 흐름" : "제품 가치와 브랜드 무드가 이어지는 상세 흐름",
  };
  return `
    <div class="sales-hero-signature-strip ${isB ? "is-conversion" : "is-premium"}">
      <b>${escapeHtml(isB ? "A/B 시안 B" : "A/B 시안 A")}</b>
      <span>${escapeHtml(titleMap[industry] || titleMap.commerce)}</span>
    </div>
  `;
}

function salesMoodKeywords(isB = false) {
  const items = isB
    ? ["FAST CHECK", "CLEAR INFO", "BUYING REASON"]
    : ["SOFT GIFT", "BRAND STORY", "PREMIUM MOOD"];
  return `
    <div class="sales-mood-keywords">
      ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesValueJourneyPanel(usp = [], isB = false) {
  const items = isB
    ? [
        { label: "원료", title: usp[0] || "리치 원료", copy: "무엇으로 만든 제품인지 먼저 확인" },
        { label: "구성", title: usp[2] || "30포 스틱", copy: "구매 후 받게 되는 구성을 명확히 이해" },
        { label: "편의", title: usp[4] || "휴대 편의성", copy: "언제 어디서나 쓰기 쉬운 이유 확인" },
        { label: "신뢰", title: "주의 정보", copy: "과장 없이 구매 전 확인 정보 정리" },
      ]
    : [
        { label: "Story", title: usp[0] || "리치 원료", copy: "원료 이야기를 프리미엄 첫인상으로 연결" },
        { label: "Package", title: usp[3] || "선물 패키지", copy: "선물용으로 보기 좋은 구성 강조" },
        { label: "Routine", title: usp[2] || "개별 스틱", copy: "하루 한 포 루틴을 감성적으로 제안" },
        { label: "Trust", title: "제품 정보", copy: "건강식품에 필요한 정보와 주의사항 정리" },
      ];
  return `
    <div class="sales-value-journey-panel ${isB ? "is-conversion" : "is-premium"}">
      <strong>${escapeHtml(isB ? "구매 판단 흐름을 한 번에 정리합니다" : "브랜드 가치가 구매 이유로 이어지는 흐름")}</strong>
      <div>
        ${items.map((item, index) => `
          <article>
            <i>${String(index + 1).padStart(2, "0")}</i>
            <small>${escapeHtml(item.label)}</small>
            <b>${escapeHtml(item.title)}</b>
            <span>${escapeHtml(item.copy)}</span>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function salesBenefitReasonLadder(usp = [], isB = false) {
  const items = isB
    ? [
        { label: "01", title: "무엇이 다른가", copy: usp[0] || "제품만의 원료/구성 차별점" },
        { label: "02", title: "왜 편한가", copy: usp[2] || "개별 스틱 포장과 휴대 편의성" },
        { label: "03", title: "왜 지금 선택하는가", copy: usp[3] || "선물성과 구매 판단 정보" },
      ]
    : [
        { label: "01", title: "첫인상", copy: "프리미엄 패키지와 고급 식품 이미지" },
        { label: "02", title: "스토리", copy: usp[0] || "리치 원료와 꿀의 브랜드 가치" },
        { label: "03", title: "루틴", copy: usp[2] || "하루 한 포의 간편한 선물 루틴" },
      ];
  return `
    <div class="sales-benefit-reason-ladder ${isB ? "is-conversion" : "is-premium"}">
      ${items.map((item) => `
        <article>
          <i>${escapeHtml(item.label)}</i>
          <b>${escapeHtml(item.title)}</b>
          <span>${escapeHtml(item.copy)}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function salesCommerceRibbon(isB = false) {
  const items = isB
    ? ["비교하기 쉬운 정보", "구매 포인트 압축", "선택 근거 강화"]
    : ["프리미엄 선물 무드", "원료 스토리 중심", "브랜드 신뢰 강화"];
  return `
    <div class="sales-commerce-ribbon ${isB ? "is-conversion" : "is-premium"}">
      ${items.map((item, index) => `<span><i>${String(index + 1).padStart(2, "0")}</i>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesPremiumHeroSignature(items = []) {
  const values = (items.length ? items : ["리치 원료", "프리미엄 꿀", "선물용 패키지"]).slice(0, 2);
  return `
    <div class="sales-premium-signature">
      <span>Hoabee Selection</span>
      <strong>좋은 원료와 선물하기 좋은 패키지를 차분하게 보여주는 프리미엄 상세 구성</strong>
      <div>${values.map((item) => `<b>${escapeHtml(item)}</b>`).join("")}</div>
    </div>
  `;
}

function salesConversionHeroChecklist(usp = []) {
  const items = (usp.length ? usp : ["리치 원료", "30포 구성", "개별 스틱 포장"]).slice(0, 4);
  return `
    <div class="sales-conversion-hero-checklist">
      <strong>구매 전 10초 체크</strong>
      ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesDesignAccentPanel(images = {}, isB = false) {
  const mainSlot = isB ? "stick" : "package";
  const subSlot = isB ? "openBox" : "giftBag";
  return `
    <div class="sales-design-accent-panel ${isB ? "is-conversion" : "is-premium"}">
      <div class="sales-accent-copy">
        <small>${escapeHtml(isB ? "Commerce Layout" : "Brand Mood")}</small>
        <strong>${escapeHtml(isB ? "정보를 빠르게 비교하고 구매 이유를 확인하는 전환형 구성" : "제품의 원료와 패키지 감도를 고급스럽게 쌓는 브랜드형 구성")}</strong>
      </div>
      <div class="sales-accent-products">
        ${salesImage(images, mainSlot, "강조 제품 이미지")}
        ${images?.[subSlot] ? `<img src="${images[subSlot]}" alt="보조 제품 이미지">` : ""}
      </div>
    </div>
  `;
}

function salesSectionGraphicFooter(isB = false) {
  const items = isB
    ? ["비교", "정보", "신뢰", "구매"]
    : ["원료", "패키지", "선물", "루틴"];
  return `
    <div class="sales-section-graphic-footer">
      ${items.map((item, index) => `<span><i>${String(index + 1).padStart(2, "0")}</i>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesSceneMiniShowcase(images = {}, isB = false) {
  const items = isB
    ? [
        { slot: "stick", label: "휴대" },
        { slot: "boxPink", label: "구성" },
      ]
    : [
        { slot: "giftBag", label: "선물" },
        { slot: "package", label: "패키지" },
      ];
  return `
    <div class="sales-scene-mini-showcase">
      ${items.map((item) => `
        <div>
          ${salesImage(images, item.slot, item.label)}
          <span>${escapeHtml(item.label)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function salesLifestyleShowcase(images = {}, isB = false) {
  const leftSlot = isB ? "stick" : "giftBag";
  const rightSlot = isB ? "openBox" : "package";
  const title = isB ? "구매 후 사용 장면까지 바로 상상되도록" : "선물로 받았을 때의 첫인상까지 고급스럽게";
  const points = isB
    ? ["가방에 넣기 쉬운 스틱형", "30포 구성으로 루틴 관리", "구매 정보와 사용 장면 연결"]
    : ["프리미엄 패키지 첫인상", "선물용 쇼핑백 무드", "원료 스토리와 브랜드 감도 연결"];
  return `
    <div class="sales-lifestyle-showcase ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "Usage Proof" : "Gift Scene")}</small>
        <strong>${escapeHtml(title)}</strong>
        ${points.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
      <figure>
        ${salesImage(images, leftSlot, "라이프스타일 보조 이미지")}
        ${images?.[rightSlot] ? `<img src="${images[rightSlot]}" alt="라이프스타일 제품 이미지">` : ""}
      </figure>
    </div>
  `;
}

function salesEditorialImageStoryBoard(images = {}, isB = false, industry = inferProductIndustry()) {
  const titles = {
    health: isB ? "구매자가 보는 순서대로 원료-구성-섭취 정보를 연결합니다" : "원료 스토리와 선물 패키지의 감도를 한 화면에 묶습니다",
    beauty: isB ? "고민-제형-사용 루틴을 구매 판단 순서로 보여줍니다" : "제형의 감성과 브랜드 패키지를 부드럽게 연결합니다",
    living: isB ? "불편 상황-해결 방식-구성 정보를 순서대로 보여줍니다" : "생활 공간에서 쓰이는 모습을 자연스럽게 보여줍니다",
    fashion: isB ? "소재-핏-스타일링 정보를 빠르게 확인하게 합니다" : "브랜드 무드와 착용 이미지를 스타일 컷처럼 연결합니다",
    commerce: isB ? "제품 디테일-구성-사용 정보를 구매 순서대로 보여줍니다" : "제품 스토리와 브랜드 무드를 한 화면에 묶습니다",
  };
  const items = [
    { slot: "origin", label: "01 Story", fallback: "package" },
    { slot: "feature", label: "02 Detail", fallback: "stick" },
    { slot: "openBox", label: "03 Set", fallback: "package" },
  ];
  return `
    <div class="sales-editorial-image-story ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "Image Flow" : "Editorial Flow")}</small>
        <strong>${escapeHtml(titles[industry] || titles.commerce)}</strong>
      </div>
      <div class="sales-editorial-image-row">
        ${items.map((item) => `
          <figure>
            ${salesImage(images, images?.[item.slot] ? item.slot : item.fallback, item.label)}
            <figcaption>${escapeHtml(item.label)}</figcaption>
          </figure>
        `).join("")}
      </div>
    </div>
  `;
}

function salesFeaturePosterBoard(images = {}, usp = [], isB = false, industry = inferProductIndustry()) {
  const titleMap = {
    health: isB ? "구매 이유를 숫자와 카드로 정리" : "프리미엄 원료와 선물 구성을 포스터처럼 강조",
    beauty: isB ? "피부 고민별 선택 포인트 정리" : "제형과 감성 루틴을 포스터처럼 강조",
    living: isB ? "문제 해결 포인트를 카드로 정리" : "생활 장면과 실용성을 포스터처럼 강조",
    fashion: isB ? "핏과 소재 선택 포인트 정리" : "스타일 무드를 포스터처럼 강조",
    commerce: isB ? "구매 이유를 숫자와 카드로 정리" : "제품 가치와 브랜드 무드를 포스터처럼 강조",
  };
  const mainSlot = images?.openBox ? "openBox" : images?.package ? "package" : "hero";
  const list = (usp.length ? usp : fallbackUspForIndustry(industry)).slice(0, 4);
  return `
    <div class="sales-feature-poster-board ${isB ? "is-conversion" : "is-premium"}">
      <figure>${salesImage(images, mainSlot, "핵심 제품 구성컷")}</figure>
      <div>
        <small>${escapeHtml(isB ? "Reason to Buy" : "Premium Detail Poster")}</small>
        <strong>${escapeHtml(titleMap[industry] || titleMap.commerce)}</strong>
        <div>
          ${list.map((item, index) => `<span><b>${String(index + 1).padStart(2, "0")}</b>${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function salesNarrativeBridgePanel(images = {}, isB = false, industry = inferProductIndustry()) {
  const copyMap = {
    health: isB
      ? ["원료 신뢰", "구성 확인", "섭취 편의", "구매 판단"]
      : ["원료 이야기", "패키지 무드", "선물 이미지", "프리미엄 루틴"],
    beauty: isB
      ? ["고민 확인", "제형 정보", "사용 루틴", "구매 판단"]
      : ["브랜드 감성", "텍스처 무드", "케어 루틴", "감성 마무리"],
    living: isB
      ? ["불편 상황", "해결 방식", "사용 정보", "구매 판단"]
      : ["생활 장면", "제품 사용", "공간 정돈", "실용 가치"],
    fashion: isB
      ? ["핏 확인", "소재 정보", "옵션 선택", "구매 판단"]
      : ["룩북 무드", "소재 디테일", "착용 장면", "스타일 완성"],
    commerce: isB
      ? ["제품 확인", "장점 비교", "사용 정보", "구매 판단"]
      : ["브랜드 무드", "제품 가치", "사용 장면", "선택 이유"],
  };
  const items = copyMap[industry] || copyMap.commerce;
  const mainSlot = isB ? "feature" : "package";
  return `
    <div class="sales-narrative-bridge ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "Reading Flow" : "Story Flow")}</small>
        <strong>${escapeHtml(isB ? "고객이 구매 이유를 순서대로 이해하도록 연결합니다" : "브랜드 무드에서 제품 가치까지 자연스럽게 이어줍니다")}</strong>
      </div>
      <figure>
        ${salesImage(images, mainSlot, "스토리 연결 제품 이미지")}
      </figure>
      <ol>
        ${items.map((item, index) => `<li><b>${String(index + 1).padStart(2, "0")}</b><span>${escapeHtml(item)}</span></li>`).join("")}
      </ol>
    </div>
  `;
}

function salesDetailReferenceRemixBoard(images = {}, isB = false, industry = inferProductIndustry()) {
  const refs = Array.isArray(images?.referenceSections) ? images.referenceSections : [];
  if (!refs.length) return "";
  const selected = isB
    ? [refs[0], refs[4], refs[7], refs[8], refs[10]].filter(Boolean)
    : [refs[0], refs[1], refs[2], refs[6], refs[11]].filter(Boolean);
  const flow = {
    health: isB
      ? ["첫인상", "사용 장면", "구성 확인", "신뢰 자료", "구매 판단"]
      : ["브랜드 무드", "원료 스토리", "제품 가치", "선물 장면", "마무리"],
    beauty: isB
      ? ["제품 첫인상", "고민 확인", "제형 정보", "사용법", "구매 판단"]
      : ["브랜드 감성", "제형 무드", "루틴 장면", "성분 신뢰", "마무리"],
    commerce: isB
      ? ["첫 화면", "장점 확인", "구성 정보", "신뢰 자료", "전환"]
      : ["브랜드", "스토리", "제품 가치", "사용 장면", "마감"],
  };
  const items = flow[industry] || flow.commerce;
  return `
    <div class="sales-reference-remix-board ${isB ? "is-conversion" : "is-premium"}">
      <div class="reference-remix-copy">
        <small>${escapeHtml(isB ? "DETAIL FLOW SYSTEM" : "EDITORIAL DETAIL FLOW")}</small>
        <strong>${escapeHtml(isB ? "구매자가 스크롤하며 확인할 상세 흐름을 압축해서 보여줍니다" : "브랜드 무드와 원료 이야기가 이어지는 상세 흐름을 만듭니다")}</strong>
        <p>${escapeHtml(isB ? "첫 화면부터 정보, 신뢰, 구매 판단까지 끊기지 않도록 섹션의 시각 리듬을 맞춥니다." : "제품 사진, 원료 이미지, 패키지 무드를 한 흐름으로 연결해 실제 상세페이지처럼 보이게 합니다.")}</p>
      </div>
      <div class="reference-remix-strip">
        ${selected.map((src, index) => `
          <figure>
            <img src="${src}" alt="${escapeHtml(items[index] || "상세 흐름 이미지")}">
            <figcaption><b>${String(index + 1).padStart(2, "0")}</b><span>${escapeHtml(items[index] || "상세 흐름")}</span></figcaption>
          </figure>
        `).join("")}
      </div>
    </div>
  `;
}

function salesIngredientVisualMap(images = {}, isB = false, industry = inferProductIndustry()) {
  const text = salesIndustryPanelText(industry, isB);
  const cards = industry === "health"
    ? [
        { title: "리치 원료", copy: "열대 과일의 산뜻한 이미지를 원료 스토리로 표현" },
        { title: "프리미엄 꿀", copy: "달콤함과 선물성을 연결하는 주 원료 무드" },
        { title: "스틱 포장", copy: "언제 어디서나 꺼내기 쉬운 개별 포장 구성" },
      ]
    : text.finalItems.slice(0, 3).map((item) => ({ title: item.label, copy: item.copy }));
  return `
    <div class="sales-ingredient-visual-map ${isB ? "is-conversion" : "is-premium"}">
      <div class="visual-map-copy">
        <small>${escapeHtml(isB ? "KEY MATERIAL MAP" : "ORIGIN MOOD MAP")}</small>
        <strong>${escapeHtml(isB ? "구매자가 확인해야 할 핵심 요소를 한눈에 정리" : "원료와 패키지 감성을 상세페이지 흐름으로 연결")}</strong>
        <p>${escapeHtml(isB ? "텍스트 설명만 두지 않고, 제품 사진과 원료 키워드를 카드형 정보로 묶어 구매 판단 속도를 높입니다." : "사진, 라벨, 컬러 포인트를 함께 배치해 브랜드가 가진 프리미엄 이미지를 먼저 느끼게 합니다.")}</p>
      </div>
      <figure class="visual-map-image">
        ${salesImage(images, images?.openBox ? "openBox" : "origin", "원료와 구성 시각화")}
      </figure>
      <div class="visual-map-cards">
        ${cards.map((item, index) => `
          <article>
            <i>${String(index + 1).padStart(2, "0")}</i>
            <b>${escapeHtml(item.title)}</b>
            <span>${escapeHtml(item.copy)}</span>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function salesCommerceComparisonBand(usp = [], isB = false, industry = inferProductIndustry()) {
  const p = product();
  const rows = [
    { label: "구성", standard: "일반 포장", ours: usp[2] || "개별 스틱 포장" },
    { label: "무드", standard: "기능 설명 중심", ours: isB ? "구매 이유 중심" : "프리미엄 선물 무드" },
    { label: "확인", standard: "텍스트 나열", ours: "이미지+카드+CTA로 빠른 이해" },
  ];
  return `
    <div class="sales-commerce-comparison-band ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "COMPARE & CHOOSE" : "DETAIL VALUE CHECK")}</small>
        <strong>${escapeHtml(isB ? "비교하면 선택 이유가 더 분명해집니다" : "제품 가치가 보이는 방식으로 정리합니다")}</strong>
        <p>${escapeHtml(industry === "health" ? "건강식품은 과장된 효능 표현보다 구성, 원료, 섭취 편의성, 선물성을 차분하게 보여주는 것이 중요합니다." : "제품 특성에 맞는 비교 기준을 만들어 구매자가 빠르게 판단하도록 돕습니다.")}</p>
      </div>
      <table>
        <thead>
          <tr><th>기준</th><th>일반 상세</th><th>${escapeHtml(p.productName || "우리 제품")}</th></tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <th>${escapeHtml(row.label)}</th>
              <td>${escapeHtml(row.standard)}</td>
              <td><b>${escapeHtml(row.ours)}</b></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function salesTrustCommercePanel(images = {}, isB = false, workflow = latestDesignWorkflow()) {
  const text = salesIndustryPanelText(workflow?.analysis?.industry || inferProductIndustry(), isB);
  const rows = text.trustRows.slice(0, 4);
  return `
    <div class="sales-trust-commerce-panel ${isB ? "is-conversion" : "is-premium"}">
      <figure>
        ${salesImage(images, "info", "신뢰 정보 자료")}
      </figure>
      <div>
        <small>${escapeHtml(isB ? "Buyer Safety Check" : "Brand Trust Check")}</small>
        <strong>${escapeHtml(isB ? "고객이 망설이는 정보를 구매 전 체크리스트로 정리합니다" : "프리미엄 인상을 해치지 않게 신뢰 정보를 정돈합니다")}</strong>
        <ul>
          ${rows.map((item) => `<li><b>${escapeHtml(item.label)}</b><span>${escapeHtml(item.value)}</span></li>`).join("")}
        </ul>
      </div>
    </div>
  `;
}

function salesReviewStyleProofPanel(isB = false, workflow = latestDesignWorkflow()) {
  const industry = workflow?.analysis?.industry || inferProductIndustry();
  const source = salesIndustryPanelText(industry, isB).trustRows;
  const reviews = [
    { name: "구매 전 확인", copy: source[0]?.value || "제품 구성과 정보를 먼저 확인할 수 있어야 합니다." },
    { name: "선물 목적", copy: source[1]?.value || "패키지와 제품 이미지가 선물용으로 적합해야 합니다." },
    { name: "최종 판단", copy: source[2]?.value || "사용 방법과 보관 정보가 명확해야 합니다." },
  ];
  return `
    <div class="sales-review-style-proof ${isB ? "is-conversion" : "is-premium"}">
      <div class="review-proof-head">
        <small>${escapeHtml(isB ? "BUYER CHECK VOICE" : "TRUST VOICE DESIGN")}</small>
        <strong>${escapeHtml(isB ? "고객이 궁금해할 질문을 리뷰형 카드로 먼저 답합니다" : "신뢰 요소를 딱딱한 표가 아니라 브랜드 톤으로 보여줍니다")}</strong>
      </div>
      <div class="review-proof-list">
        ${reviews.map((item, index) => `
          <article>
            <b>${String(index + 1).padStart(2, "0")}</b>
            <strong>${escapeHtml(item.name)}</strong>
            <p>${escapeHtml(item.copy)}</p>
            <span>${escapeHtml(isB ? "구매 판단 포인트" : "브랜드 신뢰 포인트")}</span>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function salesIndustryPanelText(industry = inferProductIndustry(), isB = false) {
  industry = normalizeIndustryKey(industry);
  const sets = {
    health: {
      infoVisualTitle: "제품 상세 정보는 고객이 구매 전 마지막으로 확인하는 신뢰 영역입니다",
      purchaseTitle: isB ? "구매 전 마지막 확인" : "프리미엄 상세 하단 체크",
      purchaseItems: isB
        ? [
            { title: "구성 확인", copy: "구성, 포장, 섭취 정보를 구매 전 명확히 보여줍니다." },
            { title: "섭취/보관 확인", copy: "사용 방법과 보관 주의사항을 과장 없이 정리합니다." },
            { title: "표현 검수", copy: "건강식품 특성상 의약품 오인 표현을 제외합니다." },
          ]
        : [
            { title: "선물 이미지", copy: "패키지와 구성 무드를 함께 보여주어 선물용 인상을 강화합니다." },
            { title: "원료 스토리", copy: "원료 조합을 프리미엄 식품 무드로 연결합니다." },
            { title: "신뢰 정보", copy: "제품 정보와 주의 문구를 차분하게 배치해 신뢰감을 만듭니다." },
          ],
      trustTitle: isB ? "구매 전 불안 요소를 줄이는 체크 구조" : "프리미엄 건강식품답게 신뢰를 쌓는 검수 구조",
      trustRows: isB
        ? [
            { label: "표현", value: "의약품 오인 표현 제외" },
            { label: "정보", value: "구성/섭취/보관 안내" },
            { label: "이미지", value: "실제 제품 기반 합성" },
            { label: "구매", value: "필수 확인 정보 우선 배치" },
          ]
        : [
            { label: "원료", value: "원료 스토리와 제품 정보 분리" },
            { label: "선물", value: "패키지 가치와 브랜드 무드 강조" },
            { label: "주의", value: "건강식품 표현 리스크 검수" },
            { label: "정보", value: "하단 제품 정보 명확화" },
          ],
      finalTitle: isB ? "구매 전 확인할 내용을 마지막 한 번 더 정리합니다" : "선물하기 좋은 프리미엄 루틴으로 마무리합니다",
      finalCopy: isB ? "제품의 장점, 구성, 주의 정보를 한 화면에서 확인하고 선택할 수 있도록 설계한 전환형 마감 영역입니다." : "제품 이미지와 선물 가치를 함께 보여주어 고객이 긍정적인 첫인상을 유지한 채 선택할 수 있게 합니다.",
      finalItems: isB
        ? [{ label: "구성", copy: "구성 확인" }, { label: "편의", copy: "사용 편의성" }, { label: "정보", copy: "구매 전 정보 정리" }]
        : [{ label: "선물", copy: "부담 없이 전하기 좋은 패키지" }, { label: "원료", copy: "프리미엄 원료 이미지" }, { label: "루틴", copy: "데일리 루틴 제안" }],
    },
    beauty: {
      infoVisualTitle: "성분, 제형, 사용법은 뷰티 제품 선택의 마지막 확인 영역입니다",
      purchaseTitle: isB ? "구매 전 뷰티 체크" : "감성 케어 하단 체크",
      purchaseItems: isB
        ? [
            { title: "피부 고민", copy: "고객 고민과 제품 장점을 빠르게 연결합니다." },
            { title: "제형/사용감", copy: "텍스처와 루틴 이미지를 구매 판단 정보로 정리합니다." },
            { title: "성분/주의", copy: "과장 없이 성분과 사용 주의사항을 확인시킵니다." },
          ]
        : [
            { title: "브랜드 무드", copy: "감성 이미지와 제품 제형을 함께 보여줍니다." },
            { title: "사용 루틴", copy: "매일 쓰는 케어 장면으로 제품 경험을 상상하게 합니다." },
            { title: "신뢰 정보", copy: "성분과 사용 정보를 차분하게 정리합니다." },
          ],
      trustTitle: isB ? "구매 전 성분과 사용 정보를 빠르게 확인" : "감성만큼 중요한 성분/사용 신뢰 구조",
      trustRows: [
        { label: "성분", value: "핵심 성분/제형 정보" },
        { label: "사용", value: "루틴과 사용 순서" },
        { label: "주의", value: "피부/사용 주의사항" },
        { label: "이미지", value: "제형과 패키지 왜곡 금지" },
      ],
      finalTitle: isB ? "내 고민에 맞는 뷰티 루틴 선택" : "감성 케어 루틴으로 마무리합니다",
      finalCopy: isB ? "고민, 제형, 사용법을 한 번 더 확인하고 선택할 수 있도록 구성합니다." : "브랜드 무드와 제품 경험이 이어지도록 부드러운 마감 영역을 만듭니다.",
      finalItems: isB
        ? [{ label: "고민", copy: "피부 고민 확인" }, { label: "제형", copy: "사용감 체크" }, { label: "루틴", copy: "사용 순서 확인" }]
        : [{ label: "Mood", copy: "브랜드 감성" }, { label: "Texture", copy: "제형 이미지" }, { label: "Care", copy: "데일리 루틴" }],
    },
    living: {
      infoVisualTitle: "크기, 구성, 사용법은 생활용품 구매 전 꼭 확인하는 정보입니다",
      purchaseTitle: isB ? "구매 전 실용 체크" : "생활 장면 하단 체크",
      purchaseItems: isB
        ? [
            { title: "문제 확인", copy: "고객이 겪는 불편과 해결 포인트를 연결합니다." },
            { title: "사용법 확인", copy: "설치, 사용, 보관 흐름을 명확하게 정리합니다." },
            { title: "스펙 확인", copy: "크기, 구성, 소재 정보를 구매 전 확인시킵니다." },
          ]
        : [
            { title: "생활 장면", copy: "실제 공간에서 쓰이는 모습을 자연스럽게 보여줍니다." },
            { title: "해결 이미지", copy: "사용 전후의 차이를 시각적으로 전달합니다." },
            { title: "실용 정보", copy: "구성, 크기, 주의사항을 깔끔하게 배치합니다." },
          ],
      trustTitle: isB ? "실사용 전 필요한 정보를 빠르게 확인" : "생활용품답게 실용 정보를 쌓는 구조",
      trustRows: [
        { label: "문제", value: "고객 불편 상황" },
        { label: "해결", value: "제품 사용 후 변화" },
        { label: "스펙", value: "크기/구성/소재" },
        { label: "사용", value: "설치/보관 안내" },
      ],
      finalTitle: isB ? "실용적인 선택을 돕는 마지막 확인" : "일상을 정돈하는 사용 장면으로 마무리합니다",
      finalCopy: isB ? "문제, 해결 방식, 구성 정보를 한 번 더 확인하고 선택하게 만듭니다." : "생활 공간에서 자연스럽게 쓰이는 이미지를 유지하며 제품 선택을 유도합니다.",
      finalItems: isB
        ? [{ label: "문제", copy: "불편 확인" }, { label: "해결", copy: "사용 효과" }, { label: "스펙", copy: "정보 확인" }]
        : [{ label: "Scene", copy: "생활 장면" }, { label: "Use", copy: "사용 흐름" }, { label: "Clean", copy: "정돈 이미지" }],
    },
    commerce: {
      infoVisualTitle: "제품 상세 정보는 고객이 구매 전 마지막으로 확인하는 신뢰 영역입니다",
      purchaseTitle: isB ? "구매 전 마지막 확인" : "상세 하단 체크",
      purchaseItems: isB
        ? [
            { title: "구성 확인", copy: "구성, 옵션, 스펙 정보를 구매 전 명확히 보여줍니다." },
            { title: "사용 확인", copy: "사용 장면과 구매 이유를 연결합니다." },
            { title: "정보 검수", copy: "고객이 오해할 수 있는 표현을 정리합니다." },
          ]
        : [
            { title: "브랜드 이미지", copy: "제품의 첫인상과 브랜드 가치를 강화합니다." },
            { title: "제품 스토리", copy: "구매 이유와 사용 장면을 자연스럽게 연결합니다." },
            { title: "신뢰 정보", copy: "제품 정보와 주의 문구를 차분하게 배치합니다." },
          ],
      trustTitle: isB ? "구매 전 불안 요소를 줄이는 체크 구조" : "브랜드 신뢰를 쌓는 검수 구조",
      trustRows: [
        { label: "정보", value: "구성/스펙 안내" },
        { label: "이미지", value: "실제 제품 기반 표현" },
        { label: "주의", value: "오해 표현 검수" },
        { label: "구매", value: "선택 정보 우선 배치" },
      ],
      finalTitle: isB ? "구매 전 확인할 내용을 마지막 한 번 더 정리합니다" : "제품 가치를 확인하고 선택하게 마무리합니다",
      finalCopy: isB ? "제품의 장점, 구성, 주의 정보를 한 화면에서 확인하고 선택할 수 있도록 설계합니다." : "제품 이미지와 브랜드 가치를 함께 보여주어 긍정적인 첫인상을 유지합니다.",
      finalItems: isB
        ? [{ label: "구성", copy: "구성 확인" }, { label: "장점", copy: "핵심 가치" }, { label: "정보", copy: "구매 전 정보" }]
        : [{ label: "Brand", copy: "브랜드 가치" }, { label: "Point", copy: "제품 장점" }, { label: "Trust", copy: "신뢰 정보" }],
    },
  };
  return sets[industry] || sets.commerce;
}

function salesInfoVisualPanel(images = {}, workflow = latestDesignWorkflow()) {
  const text = salesIndustryPanelText(workflow?.analysis?.industry || inferProductIndustry(), false);
  return `
    <div class="sales-info-visual-panel">
      <div>
        <small>Information Preview</small>
        <strong>${escapeHtml(text.infoVisualTitle)}</strong>
      </div>
      <figure>
        ${salesImage(images, "info", "제품 상세 정보")}
      </figure>
    </div>
  `;
}

function salesPackageUnboxingPanel(images = {}, isB = false, workflow = latestDesignWorkflow()) {
  const industry = workflow?.analysis?.industry || inferProductIndustry();
  const items = industry === "health"
    ? [
        { slot: "package", title: "패키지", copy: "제품의 첫인상을 만드는 외부 박스" },
        { slot: "openBox", title: "30포 구성", copy: "구성 수량과 내부 정렬을 한눈에 확인" },
        { slot: "stick", title: "개별 스틱", copy: "휴대와 섭취가 쉬운 단위 포장" },
      ]
    : [
        { slot: "package", title: "패키지", copy: "구성품과 패키지 상태 확인" },
        { slot: "feature", title: "디테일", copy: "구매 전 봐야 할 핵심 디테일" },
        { slot: "lifestyle", title: "사용 장면", copy: "실제 사용 상황 예시" },
      ];
  return `
    <div class="sales-package-unboxing ${isB ? "is-conversion" : "is-premium"}">
      <div class="package-unboxing-head">
        <small>${escapeHtml(isB ? "WHAT'S INSIDE" : "PACKAGE EXPERIENCE")}</small>
        <strong>${escapeHtml(isB ? "구성품을 확인하면 구매 불안이 줄어듭니다" : "받는 순간의 인상까지 상세페이지에 담습니다")}</strong>
      </div>
      <div class="package-unboxing-grid">
        ${items.map((item, index) => `
          <figure>
            ${salesImage(images, item.slot, item.title)}
            <figcaption>
              <b>${String(index + 1).padStart(2, "0")} ${escapeHtml(item.title)}</b>
              <span>${escapeHtml(item.copy)}</span>
            </figcaption>
          </figure>
        `).join("")}
      </div>
    </div>
  `;
}

function salesPurchaseConfirmPanel(isB = false, workflow = latestDesignWorkflow()) {
  const text = salesIndustryPanelText(workflow?.analysis?.industry || inferProductIndustry(), isB);
  const items = text.purchaseItems;
  return `
    <div class="sales-purchase-confirm-panel ${isB ? "is-conversion" : "is-premium"}">
      <strong>${escapeHtml(text.purchaseTitle)}</strong>
      <div>
        ${items.map((item, index) => `
          <article>
            <i>${String(index + 1).padStart(2, "0")}</i>
            <b>${escapeHtml(item.title)}</b>
            <span>${escapeHtml(item.copy)}</span>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function salesTrustChecklistPanel(isB = false, workflow = latestDesignWorkflow()) {
  const text = salesIndustryPanelText(workflow?.analysis?.industry || inferProductIndustry(), isB);
  const rows = text.trustRows;
  return `
    <div class="sales-trust-checklist-panel ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "Final Check" : "Trust Checklist")}</small>
        <strong>${escapeHtml(text.trustTitle)}</strong>
      </div>
      <ul>
        ${rows.map((item) => `<li><b>${escapeHtml(item.label)}</b><span>${escapeHtml(item.value)}</span></li>`).join("")}
      </ul>
    </div>
  `;
}

function salesTrustDocumentPanel(images = {}, isB = false, workflow = latestDesignWorkflow()) {
  const text = salesIndustryPanelText(workflow?.analysis?.industry || inferProductIndustry(), isB);
  const docs = text.trustRows.slice(0, 3).map((item) => ({ label: item.label, value: item.value }));
  return `
    <div class="sales-trust-document-panel ${isB ? "is-conversion" : "is-premium"}">
      <figure>${salesImage(images, "info", "제품 정보 이미지")}</figure>
      <div>
        <small>${escapeHtml(isB ? "Purchase Proof" : "Trust Archive")}</small>
        <strong>${escapeHtml(text.trustTitle)}</strong>
        <ul>
          ${docs.map((item) => `<li><b>${escapeHtml(item.label)}</b><span>${escapeHtml(item.value)}</span></li>`).join("")}
        </ul>
      </div>
    </div>
  `;
}

function salesFinalProductStack(images = {}, activeSlot = "package") {
  const mainSlot = images?.[activeSlot] ? activeSlot : "package";
  return `
    <div class="sales-final-product-stack">
      ${salesImage(images, mainSlot, "최종 제품 이미지")}
      ${images?.stick ? `<img class="sales-final-stick" src="${images.stick}" alt="스틱 제품컷">` : ""}
      ${images?.giftBag ? `<img class="sales-final-gift" src="${images.giftBag}" alt="선물 패키지컷">` : ""}
    </div>
  `;
}

function salesRetailClosingPanel(images = {}, isB = false, workflow = latestDesignWorkflow()) {
  const industry = workflow?.analysis?.industry || inferProductIndustry();
  const p = product();
  const headlineMap = {
    health: isB ? "구성, 휴대성, 선물성을 확인하고 선택하세요" : "프리미엄 건강 루틴을 선물처럼 제안합니다",
    beauty: isB ? "고민, 제형, 루틴을 확인하고 선택하세요" : "감성적인 데일리 케어 루틴을 제안합니다",
    living: isB ? "문제 해결과 사용 정보를 확인하고 선택하세요" : "일상 속 사용 장면을 자연스럽게 제안합니다",
    fashion: isB ? "핏, 소재, 스타일을 확인하고 선택하세요" : "브랜드 무드가 느껴지는 스타일을 제안합니다",
    commerce: isB ? "구성, 장점, 사용 정보를 확인하고 선택하세요" : "제품의 가치를 한 번 더 제안합니다",
  };
  const badges = salesIndustryPanelText(industry, isB).finalItems.slice(0, 3);
  return `
    <div class="sales-retail-closing-panel ${isB ? "is-conversion" : "is-premium"}">
      <div class="sales-retail-closing-copy">
        <small>${escapeHtml(isB ? "Final Purchase Guide" : "Premium Closing Guide")}</small>
        <strong>${escapeHtml(headlineMap[industry] || headlineMap.commerce)}</strong>
        <p>${escapeHtml(p.productName || "제품")}의 핵심 가치와 구매 전 확인 정보를 한 화면에서 정리한 최종 선택 영역입니다.</p>
        <div>
          ${badges.map((item) => `<span><b>${escapeHtml(item.label)}</b>${escapeHtml(item.copy)}</span>`).join("")}
        </div>
      </div>
      <figure>
        ${salesImage(images, isB ? "openBox" : "package", "최종 CTA 제품 이미지")}
        ${images?.stick ? `<img src="${images.stick}" alt="스틱 디테일 이미지">` : ""}
      </figure>
    </div>
  `;
}

function salesFinalCommerceBar(isB = false, workflow = latestDesignWorkflow()) {
  const text = salesIndustryPanelText(workflow?.analysis?.industry || inferProductIndustry(), isB);
  const items = text.finalItems.map((item) => item.label).concat(isB ? ["최종 선택"] : ["브랜드 무드"]).slice(0, 4);
  return `
    <div class="sales-final-commerce-bar">
      ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesRetailDecisionReceipt(isB = false, workflow = latestDesignWorkflow()) {
  const p = product();
  const industry = workflow?.analysis?.industry || inferProductIndustry();
  const points = industry === "health"
    ? ["30포 구성", "개별 스틱", "선물 패키지", "원료 스토리"]
    : salesIndustryPanelText(industry, isB).finalItems.map((item) => item.copy).slice(0, 4);
  return `
    <div class="sales-retail-decision-receipt ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "FINAL BUYING CHECK" : "FINAL GIFT CHECK")}</small>
        <strong>${escapeHtml(p.productName || "제품명")}</strong>
        <p>${escapeHtml(isB ? "마지막 CTA 전에 구매자가 확인할 내용을 영수증처럼 정리합니다." : "선물용 상세페이지의 마지막 인상을 고급스럽게 정리합니다.")}</p>
      </div>
      <ul>
        ${points.map((item) => `<li><span>${escapeHtml(item)}</span><b>READY</b></li>`).join("")}
      </ul>
    </div>
  `;
}

function salesFinalConversionDeck(images = {}, isB = false, workflow = latestDesignWorkflow()) {
  const p = product();
  const industry = workflow?.analysis?.industry || inferProductIndustry();
  const text = salesIndustryPanelText(industry, isB);
  const items = industry === "health"
    ? [
        { title: "원료 스토리", copy: "리치와 꿀의 프리미엄 이미지를 중심으로 구성" },
        { title: "30포 구성", copy: "선물과 데일리 루틴 모두 고려한 패키지" },
        { title: "표현 검수", copy: "의약품 오인 없이 신뢰 정보 중심으로 마감" },
      ]
    : text.finalItems.map((item) => ({ title: item.label, copy: item.copy })).slice(0, 3);
  return `
    <div class="sales-final-conversion-deck ${isB ? "is-conversion" : "is-premium"}">
      <div class="final-deck-copy">
        <small>${escapeHtml(isB ? "READY TO DECIDE" : "READY TO GIFT")}</small>
        <strong>${escapeHtml(isB ? "고객이 선택하기 전에 마지막으로 확인할 내용" : "좋은 첫인상을 끝까지 유지하는 프리미엄 마감")}</strong>
        <p>${escapeHtml(p.productName || "제품")}의 핵심 가치, 구성, 신뢰 정보를 마지막 화면에서 다시 정리합니다.</p>
      </div>
      <figure>
        ${salesImage(images, isB ? "openBox" : "giftBag", "최종 구매 유도 제품 이미지")}
        ${images?.stick ? `<img src="${images.stick}" alt="스틱 제품 디테일">` : ""}
      </figure>
      <div class="final-deck-points">
        ${items.map((item, index) => `
          <article>
            <b>${String(index + 1).padStart(2, "0")}</b>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.copy)}</span>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function salesFinalPackageDetail(images = {}, isB = false, workflow = latestDesignWorkflow()) {
  const industry = workflow?.analysis?.industry || inferProductIndustry();
  const slotMap = {
    health: isB
      ? [{ slot: "stick", label: "휴대성" }, { slot: "openBox", label: "구성" }, { slot: "info", label: "정보" }]
      : [{ slot: "package", label: "패키지" }, { slot: "giftBag", label: "선물" }, { slot: "stick", label: "루틴" }],
    beauty: isB
      ? [{ slot: "feature", label: "제형" }, { slot: "lifestyle", label: "루틴" }, { slot: "info", label: "성분" }]
      : [{ slot: "package", label: "패키지" }, { slot: "feature", label: "텍스처" }, { slot: "lifestyle", label: "케어" }],
    living: isB
      ? [{ slot: "feature", label: "디테일" }, { slot: "lifestyle", label: "사용" }, { slot: "info", label: "스펙" }]
      : [{ slot: "lifestyle", label: "장면" }, { slot: "feature", label: "해결" }, { slot: "package", label: "구성" }],
    commerce: isB
      ? [{ slot: "feature", label: "장점" }, { slot: "package", label: "구성" }, { slot: "info", label: "정보" }]
      : [{ slot: "package", label: "패키지" }, { slot: "lifestyle", label: "사용" }, { slot: "feature", label: "디테일" }],
  };
  const slots = slotMap[industry] || slotMap.commerce;
  return `
    <div class="sales-final-package-detail ${isB ? "is-conversion" : "is-premium"}">
      ${slots.map((item) => `
        <figure>
          ${salesImage(images, item.slot, item.label)}
          <figcaption>${escapeHtml(item.label)}</figcaption>
        </figure>
      `).join("")}
    </div>
  `;
}

function salesFinalDecisionPanel(images = {}, isB = false, workflow = latestDesignWorkflow()) {
  const text = salesIndustryPanelText(workflow?.analysis?.industry || inferProductIndustry(), isB);
  const items = text.finalItems;
  return `
    <div class="sales-final-decision-panel ${isB ? "is-conversion" : "is-premium"}">
      <div class="sales-final-decision-copy">
        <small>${escapeHtml(isB ? "Decision Summary" : "Premium Closing")}</small>
        <strong>${escapeHtml(text.finalTitle)}</strong>
        <p>${escapeHtml(text.finalCopy)}</p>
      </div>
      <div class="sales-final-decision-visual">
        ${salesImage(images, isB ? "openBox" : "giftBag", "최종 선택 제품 이미지")}
        ${images?.stick ? `<img src="${images.stick}" alt="스틱 제품 이미지">` : ""}
      </div>
      <div class="sales-final-decision-list">
        ${items.map((item) => `<span><b>${escapeHtml(item.label)}</b>${escapeHtml(item.copy)}</span>`).join("")}
      </div>
    </div>
  `;
}

function salesPremiumEditorialQuote(items = []) {
  const value = (items.length ? items[0] : "프리미엄 원료와 선물성");
  return `
    <div class="sales-premium-editorial-quote">
      <small>Editorial Message</small>
      <strong>“${escapeHtml(value)}을 첫인상부터 마지막 구매 유도까지 하나의 브랜드 무드로 연결합니다.”</strong>
    </div>
  `;
}

function salesConversionProofMatrix(usp = []) {
  const items = [
    { label: "원료", value: usp[0] || "원료 차별점" },
    { label: "구성", value: usp[2] || "30포 구성" },
    { label: "편의", value: usp[4] || "휴대 편의성" },
    { label: "선물", value: usp[3] || "선물용 패키지" },
  ];
  return `
    <div class="sales-conversion-proof-matrix">
      <strong>구매 판단 매트릭스</strong>
      <div>
        ${items.map((item) => `<span><b>${escapeHtml(item.label)}</b>${escapeHtml(item.value)}</span>`).join("")}
      </div>
    </div>
  `;
}

function salesTrustSealPanel(isB = false, workflow = latestDesignWorkflow()) {
  const text = salesIndustryPanelText(workflow?.analysis?.industry || inferProductIndustry(), isB);
  const items = text.trustRows.slice(0, 3).map((item) => `${item.label} ${item.value}`);
  return `
    <div class="sales-trust-seal-panel">
      <strong>${escapeHtml(text.trustTitle)}</strong>
      <div>
        ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function salesInfoNoticeBar() {
  const rules = salesRiskRules(latestDesignWorkflow()).slice(0, 3);
  return `
    <div class="sales-info-notice-bar">
      <b>구매 전 확인</b>
      ${rules.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesFinalOfferStack(isB = false) {
  const p = product();
  const items = isB
    ? ["구성 정보 확인", "구매 이유 재확인", "최종 선택 유도"]
    : ["선물용 이미지", "프리미엄 루틴", "패키지 가치"];
  return `
    <div class="sales-final-offer-stack">
      <strong>${escapeHtml(p.productName || "제품")}</strong>
      <div>
        ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function salesImageCaption(label, copy) {
  return `
    <figcaption class="sales-image-caption">
      <b>${escapeHtml(label)}</b>
      <span>${escapeHtml(copy)}</span>
    </figcaption>
  `;
}

function salesImageCard(images, slot, label, title, copy) {
  return `
    <div class="sales-image-card">
      ${salesImage(images, slot, title)}
      <span>${escapeHtml(label)}</span>
      <b>${escapeHtml(title)}</b>
      <small>${escapeHtml(copy)}</small>
    </div>
  `;
}

function salesFinalProofStrip(isB = false, workflow = latestDesignWorkflow()) {
  const text = salesIndustryPanelText(workflow?.analysis?.industry || inferProductIndustry(), isB);
  const items = text.finalItems.map((item) => `${item.label} ${item.copy}`);
  return `
    <div class="sales-final-proof-strip">
      ${items.map((item, index) => `<span><i>${String(index + 1).padStart(2, "0")}</i>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesQuickProofItems(isB = false) {
  const industry = latestDesignWorkflow()?.analysis?.industry || inferProductIndustry();
  const map = {
    health: isB ? ["구매 이유 요약", "구성 정보 정리", "선택 부담 감소"] : ["선물용 패키지", "프리미엄 원료 무드", "간편한 데일리 루틴"],
    beauty: isB ? ["피부 고민 요약", "제형 정보 정리", "루틴 선택 유도"] : ["감성 브랜드 무드", "제형/텍스처 강조", "데일리 케어 루틴"],
    living: isB ? ["불편 포인트 요약", "사용 정보 정리", "실용 선택 유도"] : ["생활 장면 제안", "문제 해결 이미지", "실용적 사용 루틴"],
    fashion: isB ? ["핏/소재 요약", "옵션 정보 정리", "스타일 선택 유도"] : ["룩북 무드", "소재 디테일", "스타일링 제안"],
    commerce: isB ? ["구매 이유 요약", "정보 정리", "선택 부담 감소"] : ["브랜드 이미지", "제품 가치", "사용 장면"],
  };
  if (map[industry]) return map[industry];
  if (isB) {
    return ["구매 이유 요약", "구성 정보 정리", "선택 부담 감소"];
  }
  return ["선물용 패키지", "프리미엄 원료 무드", "간편한 데일리 루틴"];
}

function salesHeroSpecStrip() {
  const specs = productSpecItems().slice(0, 3);
  return `
    <div class="sales-hero-spec-strip">
      ${specs.map((item) => `
        <div>
          <b>${escapeHtml(item.label)}</b>
          <span>${escapeHtml(item.value)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function salesBenefitSummaryStrip(items = [], isB = false) {
  const values = (items.length ? items : ["원료", "구성", "휴대성"]).slice(0, 3);
  return `
    <div class="sales-benefit-summary-strip">
      <strong>${escapeHtml(isB ? "구매 판단 요약" : "프리미엄 가치 요약")}</strong>
      ${values.map((item, index) => `
        <span><i>${String(index + 1).padStart(2, "0")}</i>${escapeHtml(item)}</span>
      `).join("")}
    </div>
  `;
}

function salesMotiveBadges(workflow = latestDesignWorkflow(), isB = false) {
  const motives = workflow?.analysis?.purchaseMotives || [];
  const fallback = isB
    ? ["비교하기 쉬운 구매 포인트", "신뢰 정보 먼저 확인", "구매 전 고민 감소"]
    : ["프리미엄 원료 스토리", "선물하기 좋은 패키지", "하루 한 포 루틴"];
  return (motives.length ? motives : fallback).slice(0, 4);
}

function salesVisualNeedBadges(workflow = latestDesignWorkflow()) {
  const needs = workflow?.analysis?.visualNeeds || [];
  const plan = workflow?.imagePlan || [];
  const fromPlan = plan.slice(0, 4).map((item) => item.usedFor || item.role).filter(Boolean);
  const fallback = ["대표 제품컷", "원료/소재 이미지", "사용 장면컷", "신뢰 정보컷"];
  return (needs.length ? needs : fromPlan.length ? fromPlan : fallback).slice(0, 4);
}

function salesRiskRules(workflow = latestDesignWorkflow()) {
  const rules = workflow?.decision?.riskRules || workflow?.analysis?.risks || [];
  return (rules.length ? rules : ["과장 표현 금지", "원료/구성 명확화", "의약품 오인 방지"]).slice(0, 3);
}

function salesRendererSections(label, template) {
  const p = product();
  const slots = copySlots();
  const dataset = categoryDataset(p.category);
  const isB = label.includes("B");
  const industry = latestDesignWorkflow()?.analysis?.industry || inferProductIndustry(p);
  const defaults = salesIndustryCopyDefaults(industry, isB, dataset);
  const productName = slots.productName || p.productName || "제품명";
  const oneLine = slots.oneLine || "제품 한 줄 설명이 필요합니다.";
  return [
    {
      type: "sales-hero",
      title: productName,
      copy: oneLine,
      imageSlot: "hero",
      variant: isB ? "conversion" : "hero",
      designRole: "첫 화면에서 제품 이미지, 핵심 카피, 구매 포인트를 강하게 보여주는 메인 비주얼",
    },
    {
      type: "sales-story",
      title: defaults.storyTitle,
      copy: slots.originStory || dataset.mainMessage,
      imageSlot: "origin",
      variant: isB ? "comparison" : "story",
      designRole: "원료, 브랜드 배경, 제품이 가진 신뢰감을 설득하는 스토리 영역",
    },
    {
      type: "sales-ad-poster",
      title: isB ? "구매자가 바로 이해하는 광고형 정보 구간" : "선물처럼 보이는 프리미엄 광고형 구간",
      copy: isB
        ? "제품컷, 구성컷, 구매 이유를 한 화면에 묶어 전환형 상세페이지처럼 보여주는 핵심 디자인 구간입니다."
        : "브랜드 무드, 제품 이미지, 기존 상세 레퍼런스 흐름을 섞어 실제 쇼핑몰 상세페이지처럼 보이게 하는 핵심 디자인 구간입니다.",
      imageSlot: isB ? "openBox" : "boxPink",
      variant: isB ? "conversion" : "editorial",
      designRole: "단순 설명 박스가 아니라 제품 이미지와 구매 정보를 광고 배너처럼 결합하는 고밀도 시안 구간",
    },
    {
      type: "sales-benefit",
      title: defaults.benefitTitle,
      copy: slots.benefits || dataset.mainMessage,
      imageSlot: "feature",
      variant: isB ? "cards" : "premium",
      designRole: "장점을 카드, 숫자, 아이콘처럼 빠르게 읽히도록 정리하는 영역",
    },
    {
      type: "sales-scene",
      title: defaults.sceneTitle,
      copy: slots.usageScene || slots.giftMessage || dataset.copyBlocks.cta,
      imageSlot: "lifestyle",
      variant: "scene",
      designRole: "실제 사용 장면과 선물/생활 이미지를 보여주는 이미지 중심 영역",
    },
    {
      type: "sales-photo-plan",
      title: isB ? "최종 촬영/합성에 필요한 제품컷 설계" : "초안 이후 완성도를 높일 촬영 무드 설계",
      copy: isB
        ? "최종 제작 시 필요한 단독컷, 구성컷, 구매 판단컷을 미리 정의해 PSD/Figma 작업자가 동일한 방향으로 제작하도록 합니다."
        : "프리미엄 선물 무드, 원료 스토리컷, 패키지컷을 미리 정의해 임시 시안과 최종 제작 방향의 차이를 줄입니다.",
      imageSlot: isB ? "stick" : "giftBag",
      variant: "photo-focus",
      designRole: "임시 이미지와 최종 촬영/합성 방향을 연결하는 제작 지시형 디자인 구간",
    },
    {
      type: "sales-trust",
      title: defaults.trustTitle,
      copy: slots.trust || dataset.copyBlocks.trust,
      imageSlot: "trust",
      variant: "trust",
      designRole: "인증, 주의사항, 원료 정보 등 구매 불안을 줄이는 신뢰 영역",
    },
    {
      type: "sales-info",
      title: defaults.infoTitle,
      copy: slots.info || "구성, 원료, 보관 방법을 구매 전 확인하기 쉽게 정리했습니다.",
      imageSlot: "info",
      variant: "info",
      designRole: "구성품, 용량, 섭취/사용 방법을 표 형태로 정리하는 정보 영역",
    },
    {
      type: "sales-purchase-stack",
      title: isB ? "구매 전 마지막 판단 근거" : "선물로 선택해야 하는 이유",
      copy: isB
        ? "구성, 편의, 신뢰 정보를 마지막에 다시 압축해 고객이 선택하기 쉽게 만드는 구매 설득 구간입니다."
        : "첫인상, 원료감, 루틴 가치를 마지막에 다시 정리해 프리미엄 선물 이미지로 마무리합니다.",
      imageSlot: isB ? "openBox" : "package",
      variant: isB ? "conversion" : "premium",
      designRole: "고객에게 보내기 전 A/B 선택 기준을 명확하게 만드는 구매 설득 마감 구간",
    },
    {
      type: "sales-cta",
      title: defaults.ctaTitle,
      copy: slots.cta || dataset.copyBlocks.cta,
      imageSlot: "package",
      variant: isB ? "conversion" : "cta",
      designRole: "최종 구매 또는 상담 결정을 유도하는 마지막 CTA 영역",
    },
  ];
}

function salesPremiumStoryFlow() {
  return `
    <div class="sales-premium-flow">
      ${storyTimelineItems().slice(0, 3).map((item) => `
        <div>
          <small>${escapeHtml(item.step)}</small>
          <b>${escapeHtml(item.title)}</b>
          <span>${escapeHtml(item.copy)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function salesConversionCompareBlock() {
  return `
    <div class="sales-compare-strip">
      <div class="sales-compare-head">
        <b>Before</b>
        <b>Hoabee</b>
      </div>
      ${comparisonItems().map((item) => `
        <div class="sales-compare-row">
          <span>${escapeHtml(item.before)}</span>
          <strong>${escapeHtml(item.after)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function salesPremiumMoodBand(items = []) {
  const values = (items.length ? items : ["프리미엄 원료", "선물용 패키지", "하루 한 포 루틴"]).slice(0, 3);
  return `
    <div class="sales-premium-mood-band">
      ${values.map((item, index) => `
        <div>
          <i>${String(index + 1).padStart(2, "0")}</i>
          <b>${escapeHtml(item)}</b>
        </div>
      `).join("")}
    </div>
  `;
}

function salesPremiumBrandStatement(items = []) {
  const values = (items.length ? items : ["리치 원료", "프리미엄 꿀", "선물용 패키지"]).slice(0, 3);
  return `
    <div class="sales-brand-statement">
      <small>Brand Mood</small>
      <strong>프리미엄 식품 브랜드처럼 차분하고 신뢰감 있게 보여줍니다</strong>
      <div>
        ${values.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function salesBuyingChecklist(items = []) {
  const base = (items.length ? items : ["원료 확인", "구성 확인", "휴대성 확인", "선물성 확인"]).slice(0, 4);
  return `
    <div class="sales-buying-checklist">
      <strong>구매 전 체크 포인트</strong>
      <div>
        ${base.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function salesConversionDecisionPanel(usp = [], highlights = []) {
  const p = product();
  const points = [
    { label: "고민", value: "좋은 원료인지 빠르게 확인하고 싶음" },
    { label: "해결", value: (highlights[0] || usp[0] || "제품 핵심 장점") },
    { label: "선택", value: `${p.productName || "제품"}의 구성과 선물성을 한 번에 이해` },
  ];
  return `
    <div class="sales-decision-panel">
      <div>
        <small>Decision Flow</small>
        <strong>구매 전 고민을 짧게 정리하고 바로 선택하게 만드는 구조</strong>
      </div>
      ${points.map((item, index) => `
        <article>
          <i>${String(index + 1).padStart(2, "0")}</i>
          <b>${escapeHtml(item.label)}</b>
          <span>${escapeHtml(item.value)}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function benefitSubcopy(item, index, industry = inferProductIndustry()) {
  industry = normalizeIndustryKey(industry);
  const maps = {
    health: [
      "원료 스토리를 첫 화면부터 설득력 있게 보여줍니다.",
      "고급 식품 이미지와 선물 가치를 함께 전달합니다.",
      "개별 포장과 휴대성을 직관적으로 이해시킵니다.",
      "구성, 정보, 주의사항을 구매 전 확인하기 쉽게 정리합니다.",
    ],
    beauty: [
      "제형과 사용감이 느껴지는 감성 비주얼로 연결합니다.",
      "피부 고민과 제품 장점을 빠르게 매칭해 보여줍니다.",
      "사용 루틴과 사용 장면을 자연스럽게 이해시킵니다.",
      "성분, 사용법, 주의사항을 과장 없이 정리합니다.",
    ],
    living: [
      "고객이 겪는 불편 상황을 먼저 공감하게 만듭니다.",
      "제품 사용 후 달라지는 해결 장면을 직관적으로 보여줍니다.",
      "설치, 사용, 보관 흐름을 빠르게 이해시킵니다.",
      "크기, 구성, 소재 등 구매 판단 정보를 정리합니다.",
    ],
    fashion: [
      "브랜드 무드와 착용 이미지를 룩북처럼 보여줍니다.",
      "소재, 핏, 디테일이 구매 이유로 읽히게 만듭니다.",
      "착용 장면과 스타일링 조합을 자연스럽게 연결합니다.",
      "옵션, 사이즈, 소재 정보를 확인하기 쉽게 정리합니다.",
    ],
    commerce: [
      "제품의 핵심 가치를 첫 화면부터 설득력 있게 보여줍니다.",
      "상품 이미지와 구매 이유를 함께 전달합니다.",
      "사용 장면과 장점을 직관적으로 이해시킵니다.",
      "구성, 정보, 주의사항을 구매 전 확인하기 쉽게 정리합니다.",
    ],
  };
  const map = maps[industry] || maps.commerce;
  return map[index] || `${item}의 구매 이유를 짧고 명확하게 전달합니다.`;
}

function normalizeDesignText(items) {
  return Array.isArray(items) ? items.join(" ") : String(items || "");
}

function normalizeIndustryKey(industry = "commerce") {
  const key = String(industry || "commerce").toLowerCase();
  if (key === "cosmetics" || key === "cosmetic" || key === "beauty") return "beauty";
  if (key === "health" || key === "food" || key === "supplement") return "health";
  if (key === "living" || key === "home") return "living";
  if (key === "fashion" || key === "apparel") return "fashion";
  return key || "commerce";
}

function inferProductIndustry(p = product()) {
  const text = `${p.category} ${p.productName} ${p.oneLine} ${p.emphasis} ${p.clientRequests}`.toLowerCase();
  if (text.includes("화장") || text.includes("뷰티") || text.includes("스킨") || text.includes("앰플") || text.includes("크림") || text.includes("cosmetic") || text.includes("beauty")) return "beauty";
  if (text.includes("생활") || text.includes("청소") || text.includes("주방") || text.includes("수납") || text.includes("가전")) return "living";
  if (text.includes("건강") || text.includes("식품") || text.includes("꿀") || text.includes("스틱") || text.includes("원료")) return "health";
  if (text.includes("패션") || text.includes("의류") || text.includes("신발")) return "fashion";
  return "commerce";
}

function analyzeProductForDesign(p = product()) {
  const industry = inferProductIndustry(p);
  const text = `${p.productName} ${p.category} ${p.oneLine} ${p.emphasis} ${p.mustInclude} ${p.clientRequests} ${normalizeDesignText(p.highlight)} ${normalizeDesignText(p.usp)}`;
  const hasGift = /선물|부모님|패키지|gift/i.test(text);
  const hasIngredient = /원료|성분|리치|꿀|소재|ingredient/i.test(text);
  const hasConvenience = /간편|휴대|스틱|개별|루틴|편의/i.test(text);
  const hasTrust = /인증|검사|신뢰|원산지|서류|정보|주의/i.test(text);
  const riskLevel = industry === "health" || /의약|효능|치료|면역|질병/i.test(`${p.banWords} ${normalizeDesignText(p.avoid)}`)
    ? "high"
    : "normal";
  return {
    industry,
    productType: industry === "health" ? "premium-health-food" : industry,
    purchaseMotives: [
      hasIngredient && "원료/성분 신뢰",
      hasConvenience && "간편 사용/섭취",
      hasGift && "선물 가치",
      hasTrust && "검증 정보",
    ].filter(Boolean),
    visualNeeds: [
      hasIngredient && "원료 또는 소재 이미지",
      hasConvenience && "사용 장면 또는 휴대 장면",
      hasGift && "패키지/선물 연출",
      hasTrust && "인증/검사/정보 자료",
    ].filter(Boolean),
    risks: riskLevel === "high" ? ["과장 효능 표현 금지", "의약품 오인 표현 금지", "검증되지 않은 수치/후기 강조 금지"] : ["과장 광고 표현 주의"],
    positioning: hasGift || p.direction.includes("프리미엄 브랜드형") ? "premium-gift" : "conversion",
  };
}

function designDecisionFromAnalysis(analysis, p = product()) {
  analysis = { ...analysis, industry: normalizeIndustryKey(analysis.industry) };
  const categoryDefaults = {
    health: {
      mood: "premium-trust",
      colors: { primary: "#b9822d", secondary: "#d16c2f", bg: "#fff8ee", dark: "#2b241b" },
      typography: "고급 세리프 포인트와 정돈된 정보형 본문",
      hierarchy: ["원료 스토리", "섭취 편의성", "선물성", "신뢰 자료", "제품 정보"],
    },
    beauty: {
      mood: "sensory-editorial",
      colors: { primary: "#c58b9b", secondary: "#d86f86", bg: "#fff4f7", dark: "#35222a" },
      typography: "얇은 감성 헤드라인과 촉감 중심 본문",
      hierarchy: ["브랜드 무드", "사용감", "핵심 장점", "사용 장면", "신뢰 요소"],
    },
    living: {
      mood: "clean-solution",
      colors: { primary: "#397577", secondary: "#5f7f8b", bg: "#f5fbfa", dark: "#203738" },
      typography: "명확한 정보형 타이틀과 비교가 쉬운 본문",
      hierarchy: ["문제 상황", "해결 방식", "사용법", "비교/설득", "구매 정보"],
    },
    fashion: {
      mood: "editorial-lookbook",
      colors: { primary: "#8b6f55", secondary: "#1f1b17", bg: "#fbf8f4", dark: "#231f1b" },
      typography: "룩북형 큰 제목과 소재/핏 정보",
      hierarchy: ["브랜드 무드", "착용/연출", "디테일", "옵션", "구매 유도"],
    },
    commerce: {
      mood: "premium-commerce",
      colors: { primary: "#9b7448", secondary: "#c66b2d", bg: "#fffaf4", dark: "#29231e" },
      typography: "상품명 중심 타이틀과 구매 판단 본문",
      hierarchy: ["핵심 가치", "장점", "사용 장면", "신뢰 요소", "구매 유도"],
    },
  };
  const base = categoryDefaults[analysis.industry] || categoryDefaults.commerce;
  return {
    ...base,
    targetTone: p.direction.includes("감성 스토리형") ? "emotional" : analysis.positioning,
    mustShow: [...analysis.purchaseMotives, ...analysis.visualNeeds],
    riskRules: analysis.risks,
  };
}

function abStrategyFromDecision(decision, analysis) {
  analysis = { ...analysis, industry: normalizeIndustryKey(analysis.industry) };
  const brandFlow = analysis.industry === "living"
    ? ["hero", "problem", "solution", "benefit", "usage", "trust", "info", "cta"]
    : ["hero", "story", "benefit", "lifestyle", "trust", "info", "cta"];
  const conversionFlow = analysis.industry === "beauty"
    ? ["hero", "benefit", "lifestyle", "trust", "info", "cta"]
    : ["hero", "benefit", "compare", "lifestyle", "trust", "info", "cta"];
  return {
    A: {
      name: "Premium Brand Concept",
      mode: "brand",
      focus: "브랜드 무드, 원료/스토리, 선물성, 고급 이미지",
      styleKey: decision.mood,
      colorSystem: { accent: decision.colors.primary, bg: decision.colors.bg, dark: decision.colors.dark },
      flow: brandFlow,
      visualDensity: "editorial-rich",
      ctaTone: "부드러운 구매 제안",
    },
    B: {
      name: "Conversion Commerce Concept",
      mode: "conversion",
      focus: "구매 포인트, 정보 위계, 신뢰 자료, 명확한 CTA",
      styleKey: analysis.industry === "health" ? "trust-commerce" : "bold-commerce",
      colorSystem: { accent: decision.colors.secondary, bg: "#ffffff", dark: decision.colors.dark },
      flow: conversionFlow,
      visualDensity: "commerce-rich",
      ctaTone: "명확한 선택 유도",
    },
  };
}

function designBlockLibraryForIndustry(industry = "commerce") {
  industry = normalizeIndustryKey(industry);
  const library = {
    health: {
      rhythmA: ["PREMIUM STORY", "INGREDIENT TRUST", "GIFT ROUTINE", "SAFE INFO"],
      rhythmB: ["CHECK INGREDIENT", "COMPARE POINT", "TRUST INFO", "BUYING CTA"],
      heroA: [
        { label: "01", title: "Premium Mood", copy: "원료와 패키지가 만든 고급 식품 이미지" },
        { label: "02", title: "Gift Package", copy: "선물용으로 보이는 구성과 첫인상" },
        { label: "03", title: "Daily Routine", copy: "하루 한 포의 간편한 루틴 제안" },
      ],
      heroB: [
        { label: "01", title: "제품 이해", copy: "원료·구성·섭취 편의" },
        { label: "02", title: "구매 판단", copy: "선물성·휴대성·정보 확인" },
        { label: "03", title: "전환 유도", copy: "마지막 CTA까지 연결" },
      ],
      proofA: [
        { value: "Mood", title: "따뜻한 원료 감성", copy: "리치와 꿀의 색감이 느껴지는 부드러운 브랜드 장면" },
        { value: "Gift", title: "고급 선물 이미지", copy: "패키지와 구성품의 프리미엄 인상" },
        { value: "Trust", title: "차분한 정보 정리", copy: "건강식품 표현 기준을 지키며 필요한 정보 전달" },
      ],
      proofB: [
        { value: "01", title: "원료와 구성", copy: "구매 전 확인해야 하는 핵심 정보를 앞쪽에 정리" },
        { value: "02", title: "휴대/섭취 편의", copy: "언제 어디서나 챙길 수 있는 사용 이유 강조" },
        { value: "03", title: "선물 판단", copy: "패키지와 구성품으로 선물 적합성 판단" },
      ],
      checkoutA: [
        { title: "Gift", copy: "선물용 패키지 무드" },
        { title: "Routine", copy: "하루 한 포 프리미엄 루틴" },
        { title: "Premium", copy: "원료 스토리와 제품 구성" },
      ],
      checkoutB: [
        { title: "구성", copy: "30포 스틱형 구성" },
        { title: "사용", copy: "휴대와 섭취가 쉬운 한 포" },
        { title: "확인", copy: "원료/주의 정보 체크" },
      ],
    },
    beauty: {
      rhythmA: ["BRAND GLOW", "TEXTURE CLOSE-UP", "SENSORY ROUTINE", "SOFT PROOF"],
      rhythmB: ["SKIN CONCERN", "BENEFIT CHECK", "ROUTINE STEP", "REVIEW CTA"],
      heroA: [
        { label: "01", title: "Brand Mood", copy: "제품의 감성과 피부 루틴 이미지를 먼저 전달" },
        { label: "02", title: "Texture Visual", copy: "제형과 사용감을 크게 보여주는 비주얼" },
        { label: "03", title: "Daily Care", copy: "일상 루틴으로 이어지는 부드러운 설계" },
      ],
      heroB: [
        { label: "01", title: "피부 고민", copy: "고객이 가진 사용 전 고민을 빠르게 제시" },
        { label: "02", title: "핵심 장점", copy: "제품 특징을 카드와 배지로 명확히 정리" },
        { label: "03", title: "사용 루틴", copy: "언제 어떻게 쓰는지 바로 이해" },
      ],
      proofA: [
        { value: "Glow", title: "감성 제형 무드", copy: "제형, 빛, 색감으로 제품 경험을 먼저 상상하게 구성" },
        { value: "Care", title: "루틴 연결", copy: "사용 장면과 브랜드 이미지를 자연스럽게 연결" },
        { value: "Trust", title: "성분/사용 정보", copy: "과장 없이 필요한 정보와 주의사항을 정리" },
      ],
      proofB: [
        { value: "01", title: "고민별 선택 이유", copy: "구매 전 피부 고민과 제품 특징을 빠르게 연결" },
        { value: "02", title: "제형/사용감 확인", copy: "텍스처와 사용 방법을 이미지 중심으로 정리" },
        { value: "03", title: "후기형 설득", copy: "리뷰 카드처럼 읽히는 신뢰 요소 구성" },
      ],
      checkoutA: [
        { title: "Mood", copy: "브랜드 감성 유지" },
        { title: "Texture", copy: "제형 이미지 강조" },
        { title: "Routine", copy: "사용 순서 연결" },
      ],
      checkoutB: [
        { title: "고민", copy: "피부 고민 확인" },
        { title: "장점", copy: "핵심 기능 정리" },
        { title: "사용", copy: "루틴/사용법 확인" },
      ],
    },
    living: {
      rhythmA: ["PROBLEM SCENE", "CLEAN SOLUTION", "USAGE FLOW", "PRACTICAL CTA"],
      rhythmB: ["BEFORE ISSUE", "SOLUTION CHECK", "COMPARE INFO", "BUY NOW"],
      heroA: [
        { label: "01", title: "생활 문제", copy: "고객이 겪는 불편 상황을 먼저 보여줌" },
        { label: "02", title: "깔끔한 해결", copy: "제품이 해결하는 방식을 직관적으로 제시" },
        { label: "03", title: "사용 장면", copy: "집/사무실/주방 등 실제 사용 맥락 연결" },
      ],
      heroB: [
        { label: "01", title: "문제 확인", copy: "구매 전 불편 포인트를 빠르게 공감" },
        { label: "02", title: "해결 비교", copy: "일반 방법과 제품 사용의 차이 정리" },
        { label: "03", title: "구매 판단", copy: "스펙과 구성 정보를 앞쪽에서 확인" },
      ],
      proofA: [
        { value: "Clean", title: "정돈된 생활 장면", copy: "제품 사용 후 달라지는 장면을 시각적으로 보여줌" },
        { value: "Use", title: "사용 흐름", copy: "설치/사용/보관 과정을 순서대로 구성" },
        { value: "Practical", title: "실용 정보", copy: "크기, 소재, 구성 같은 판단 정보를 정리" },
      ],
      proofB: [
        { value: "01", title: "문제-해결 비교", copy: "왜 필요한지 한눈에 보이는 비교형 구성" },
        { value: "02", title: "사용법/스펙", copy: "설치와 사용 방법을 카드로 빠르게 정리" },
        { value: "03", title: "구매 체크", copy: "사이즈, 구성, 주의사항을 구매 전 확인" },
      ],
      checkoutA: [
        { title: "Scene", copy: "생활 장면 중심" },
        { title: "Use", copy: "사용법 정리" },
        { title: "Clean", copy: "정돈된 이미지" },
      ],
      checkoutB: [
        { title: "문제", copy: "불편 상황 확인" },
        { title: "비교", copy: "해결 방식 비교" },
        { title: "스펙", copy: "구성/크기 확인" },
      ],
    },
    commerce: {
      rhythmA: ["BRAND VALUE", "PRODUCT POINT", "USE SCENE", "FINAL CTA"],
      rhythmB: ["BUYING REASON", "CHECK POINT", "TRUST INFO", "CONVERSION CTA"],
      heroA: [
        { label: "01", title: "Brand Value", copy: "상품의 첫인상과 브랜드 가치를 강조" },
        { label: "02", title: "Product Point", copy: "핵심 장점을 빠르게 이해" },
        { label: "03", title: "Use Scene", copy: "사용 장면으로 구매 이유 연결" },
      ],
      heroB: [
        { label: "01", title: "구매 이유", copy: "핵심 장점과 구매 판단 정보" },
        { label: "02", title: "정보 확인", copy: "구성/스펙/주의사항 정리" },
        { label: "03", title: "선택 유도", copy: "CTA까지 명확히 연결" },
      ],
      proofA: [
        { value: "Brand", title: "브랜드 첫인상", copy: "상품 가치가 먼저 보이는 상세 흐름" },
        { value: "Point", title: "제품 장점", copy: "핵심 장점이 자연스럽게 이어지는 구조" },
        { value: "Trust", title: "신뢰 정보", copy: "구매 전 필요한 정보를 차분히 정리" },
      ],
      proofB: [
        { value: "01", title: "구매 이유 정리", copy: "왜 이 제품을 선택해야 하는지 빠르게 제시" },
        { value: "02", title: "정보 카드", copy: "스펙과 장점을 한눈에 비교" },
        { value: "03", title: "전환 CTA", copy: "마지막 행동까지 흐름 유지" },
      ],
      checkoutA: [
        { title: "Brand", copy: "브랜드 가치" },
        { title: "Point", copy: "제품 장점" },
        { title: "Trust", copy: "신뢰 정보" },
      ],
      checkoutB: [
        { title: "Reason", copy: "구매 이유" },
        { title: "Check", copy: "정보 확인" },
        { title: "CTA", copy: "선택 유도" },
      ],
    },
  };
  return library[industry] || library.commerce;
}

function recommendedDesignBlocks(analysis = analyzeProductForDesign(), decision = designDecisionFromAnalysis(analysis)) {
  const library = designBlockLibraryForIndustry(analysis.industry);
  const giftBoost = analysis.purchaseMotives.includes("선물 가치");
  const trustBoost = analysis.purchaseMotives.includes("검증 정보");
  return {
    industry: analysis.industry,
    mood: decision.mood,
    A: {
      rhythm: library.rhythmA,
      heroBand: library.heroA,
      proofCards: library.proofA,
      checkout: giftBoost ? library.checkoutA : library.checkoutA,
      emphasis: giftBoost ? "선물성/브랜드 무드 강화" : "브랜드 가치와 제품 첫인상 강화",
    },
    B: {
      rhythm: library.rhythmB,
      heroBand: library.heroB,
      proofCards: trustBoost ? library.proofB : library.proofB,
      checkout: library.checkoutB,
      emphasis: trustBoost ? "신뢰 정보와 구매 판단 강화" : "구매 이유와 전환 흐름 강화",
    },
  };
}

function imageGenerationPlanFromWorkflow(analysis, decision, abStrategy, p = product()) {
  const concepts = photoConcepts().slice(0, 8);
  const imageMap = detailImageSet() || {};
  return concepts.map((concept, index) => ({
    id: `image-slot-${String(index + 1).padStart(2, "0")}`,
    slot: imageSlotForPlanIndex(index),
    role: concept,
    prompt: photoPromptText(concept, index),
    usedFor: index < 2 ? "hero/대표 영역" : index < 5 ? "스토리/장점 영역" : "신뢰/구매 유도 영역",
    aiTarget: "GPT Image / Flux / product composite",
    sourceImage: imageMap[imageSlotForPlanIndex(index)] || "",
    note: `${p.productName || "제품"}의 실제 패키지와 로고는 유지하고, 임시 시안에서는 촬영/합성 예정 이미지로 표시합니다.`,
  }));
}

function imageSlotForPlanIndex(index) {
  const slots = ["hero", "stick", "openBox", "package", "giftBag", "origin", "trust", "info"];
  return slots[index] || "hero";
}

function imageSlotProductionStatus(imagePlan = [], p = product()) {
  const sourceMap = detailImageSet() || {};
  const slotActions = {
    hero: {
      status: sourceMap.hero ? "제공 이미지 기반" : "대표컷 촬영 필요",
      tone: "primary",
      finalAction: "제품 비율과 패키지 라벨을 유지한 뒤 배경, 조명, 그림자만 상세페이지 톤에 맞게 보정합니다.",
      customerNote: "대표 제품 이미지는 제공 사진을 기준으로 시안에 반영하고, 최종 제작 시 더 선명한 히어로컷으로 보정합니다.",
      designerNote: "Hero section main product. Keep label readable, add premium background lighting, do not distort package.",
    },
    stick: {
      status: sourceMap.stick ? "제공 이미지 기반" : "스틱 단독컷 필요",
      tone: "primary",
      finalAction: "스틱 단독 이미지를 누끼 또는 라이트 그림자로 정리해 장점/휴대성 섹션에 반복 사용합니다.",
      customerNote: "스틱 단독 이미지는 실제 제품 형태를 유지해 휴대성과 섭취 편의성을 보여주는 영역에 사용합니다.",
      designerNote: "Use as reusable product cut. Preserve stick shape and vertical text. Prefer isolated transparent product layer.",
    },
    openBox: {
      status: sourceMap.openBox ? "제공 이미지 기반" : "구성품 컷 필요",
      tone: "primary",
      finalAction: "30포 구성과 패키지 내부가 보이도록 구성품 이미지를 정보 섹션에 배치합니다.",
      customerNote: "구성품 이미지는 제품 수량과 패키지 구성을 이해하기 쉽게 보여주는 용도로 사용합니다.",
      designerNote: "Show package composition clearly. Use in product info, gift, or purchase confirmation block.",
    },
    package: {
      status: sourceMap.package ? "제공 이미지 기반" : "패키지 정면컷 필요",
      tone: "primary",
      finalAction: "패키지 정면 이미지를 선물성, 브랜드 무드, 최종 CTA 구간에 크게 배치합니다.",
      customerNote: "패키지 이미지는 선물용 분위기와 브랜드 첫인상을 보여주는 핵심 이미지로 사용합니다.",
      designerNote: "Use package as premium gift visual. Keep front readable, add soft shadows and ivory/gold styling.",
    },
    giftBag: {
      status: sourceMap.giftBag ? "제공 이미지 기반" : "선물 연출컷 필요",
      tone: "composite",
      finalAction: "쇼핑백/패키지 이미지를 선물 장면으로 합성하거나 실제 촬영컷으로 교체합니다.",
      customerNote: "선물 연출 이미지는 임시로 방향을 잡고, 최종 제작 시 실제 촬영 또는 합성으로 완성도를 높입니다.",
      designerNote: "Gift mood visual. Composite with soft background and package/bag hierarchy. Avoid cheap event banner feel.",
    },
    origin: {
      status: sourceMap.origin ? "제공 이미지 기반" : "원료 합성 필요",
      tone: "composite",
      finalAction: "리치 원물, 꿀 텍스처, 원료 스토리 이미지를 실제 사진 또는 AI 합성 이미지로 보강합니다.",
      customerNote: "원료 스토리 이미지는 임시 합성 기준이며, 최종 제작 시 리치/꿀 무드를 더 자연스럽게 보강합니다.",
      designerNote: "Ingredient/origin visual. Use litchi and honey texture as supporting scene, no medical efficacy graphics.",
    },
    lifestyle: {
      status: sourceMap.lifestyle ? "제공 이미지 기반" : "사용 장면 촬영 필요",
      tone: "composite",
      finalAction: "일상 사용 장면은 고객 제공 사진이 부족하면 촬영 방향 또는 AI 합성 이미지로 보강합니다.",
      customerNote: "사용 장면 이미지는 최종 촬영/합성 후보이며, 시안에서는 분위기와 배치 방향을 먼저 확인합니다.",
      designerNote: "Lifestyle scene. Product must remain central. Use desk, bag, gift, or daily routine setting.",
    },
    trust: {
      status: sourceMap.trust ? "자료 확인 필요" : "신뢰 자료 필요",
      tone: "check",
      finalAction: "인증서, 원산지, 검사 자료가 있다면 실제 자료로 교체하고 없으면 일반 신뢰 카드로 구성합니다.",
      customerNote: "신뢰 자료 영역은 실제 인증/검사 자료 보유 여부에 따라 최종 이미지가 달라질 수 있습니다.",
      designerNote: "Trust proof area. Use only verified documents. If no proof is provided, use neutral checklist cards.",
    },
    info: {
      status: sourceMap.info ? "정보 이미지 확인 필요" : "상세 정보 자료 필요",
      tone: "check",
      finalAction: "제품 상세 정보, 원재료, 보관 방법, 주의사항은 실제 표기 자료를 기준으로 오탈자 없이 정리합니다.",
      customerNote: "제품 정보 영역은 실제 제품 표기와 최종 스펙 확인 후 반영합니다.",
      designerNote: "Product info area. Match final ingredient/spec label exactly. Keep readable typography.",
    },
  };
  const slots = [...new Set([
    ...imagePlan.map((item) => item.slot).filter(Boolean),
    "hero",
    "stick",
    "openBox",
    "package",
    "giftBag",
    "origin",
    "trust",
    "info",
  ])];
  return slots.map((slot, index) => {
    const action = slotActions[slot] || slotActions.hero;
    const plan = imagePlan.find((item) => item.slot === slot);
    const sourceImage = sourceMap[slot] || plan?.sourceImage || "";
    const hasSource = Boolean(sourceImage);
    const isComposite = action.tone === "composite";
    return {
      id: `image-status-${String(index + 1).padStart(2, "0")}`,
      slot,
      label: imageSlotLabel(slot),
      status: hasSource ? action.status : action.status.replace("제공 이미지 기반", "이미지 필요"),
      statusTone: action.tone,
      sourceImage,
      sourceLabel: hasSource ? "제공 이미지 있음" : "최종 이미지 필요",
      finalAction: action.finalAction,
      customerNote: action.customerNote,
      designerNote: action.designerNote,
      risk: isComposite ? "AI 합성/촬영 시 제품 로고와 패키지 형태 왜곡 금지" : "실제 제품 정보와 라벨 가독성 확인",
      usedFor: plan?.usedFor || "상세페이지 주요 섹션",
    };
  });
}

function clientImageStatusSummary() {
  const statusList = latestDesignWorkflow().imageSlotStatus || imageSlotProductionStatus(latestDesignWorkflow().imagePlan || []);
  return statusList.slice(0, 8).map((item, index) => (
    `${index + 1}. ${item.label}: ${item.sourceLabel} / ${item.customerNote}`
  )).join("\n");
}

function designerImageStatusSummary() {
  const statusList = latestDesignWorkflow().imageSlotStatus || imageSlotProductionStatus(latestDesignWorkflow().imagePlan || []);
  return statusList.slice(0, 8).map((item, index) => (
    `${index + 1}. ${item.label} (${item.status})
   - source: ${item.sourceImage || "final shooting/composite needed"}
   - action: ${item.finalAction}
   - designer note: ${item.designerNote}
   - caution: ${item.risk}`
  )).join("\n");
}

function visualPromptsFromImagePlan(imagePlan = [], analysis = analyzeProductForDesign(), abStrategy = abStrategyFromDecision(designDecisionFromAnalysis(analysis), analysis), p = product()) {
  const avoidRules = (analysis.risks || []).join(", ") || "과장 광고, 의약품 오인, 왜곡된 제품 표현 금지";
  return imagePlan.map((item, index) => {
    const draftKey = index % 2 === 0 ? "A" : "B";
    const strategy = abStrategy[draftKey] || abStrategy.A;
    const concept = draftKey === "A" ? "프리미엄 브랜드형 상세페이지" : "구매 전환형 상세페이지";
    return {
      id: `${item.id}-prompt`,
      draft: draftKey,
      role: item.role,
      usedFor: item.usedFor,
      modelTarget: "GPT Image / Flux / product composite",
      prompt: `${p.productName || "제품"} 상세페이지용 ${item.role} 이미지를 생성합니다. ${concept} 방향이며, ${strategy?.focus || "상품의 구매 이유"}를 보여줘야 합니다. 한국 쇼핑몰 상세페이지에 어울리는 세로형 섹션 비주얼, 제품 이미지를 중심으로 한 자연스러운 합성, 고급 조명, 깨끗한 배경 그래픽, 카피가 올라갈 여백, 카드/배지/그림자 요소를 포함합니다. 제품 로고와 패키지 형태는 왜곡하지 않습니다.`,
      negativePrompt: `질병 치료, 효능 보장, 의약품처럼 보이는 그래픽, 가짜 인증, 깨진 한글, 저가 이벤트 배너 느낌, 제품 라벨 왜곡 금지. 주의사항: ${avoidRules}`,
      placementRule: item.note,
      sourceImage: item.sourceImage || "",
      sourceImages: item.sourceImage ? [item.sourceImage] : [],
    };
  });
}

function runIntegratedDesignWorkflow() {
  const p = product();
  const analysis = analyzeProductForDesign(p);
  const decision = designDecisionFromAnalysis(analysis, p);
  const abStrategy = abStrategyFromDecision(decision, analysis);
  const designBlocks = recommendedDesignBlocks(analysis, decision);
  const imagePlan = imageGenerationPlanFromWorkflow(analysis, decision, abStrategy, p);
  const visualPrompts = visualPromptsFromImagePlan(imagePlan, analysis, abStrategy, p);
  const imageSlotStatus = imageSlotProductionStatus(imagePlan, p);
  const workflow = {
    orchestrator: "Codex",
    roles: {
      chatgpt: "제품 분석, 카피, 섹션 구성",
      claude: "구조 검토, 리스크/누락 검수",
      codex: "화면 구현, 데이터 연결, 워크플로우 관리",
      imageAi: "상세페이지 비주얼/합성 이미지 생성",
    },
    analysis,
    decision,
    abStrategy,
    designBlocks,
    imagePlan,
    imageSlotStatus,
    visualPrompts,
    qualityGate: [
      "A/B 시안의 전략 차이가 명확한가",
      "상품 업종에 맞는 섹션 순서인가",
      "이미지 슬롯의 역할이 명확한가",
      "이미지 슬롯별 제공/임시/촬영/합성 상태가 정리됐는가",
      "이미지 생성 AI용 프롬프트와 금지 프롬프트가 준비됐는가",
      "구매 전환에 필요한 신뢰/정보/CTA가 포함됐는가",
      "금지 표현과 과장 광고 리스크를 피했는가",
    ],
    updatedAt: new Date().toLocaleString("ko-KR"),
  };
  currentDesignWorkflow = workflow;
  recordAiWorkflowRun("designWorkflow", "local-design", "completed", {
    industry: analysis.industry,
    aStrategy: abStrategy.A.name,
    bStrategy: abStrategy.B.name,
  });
  saveAiArtifact("designWorkflow", "local-design", workflow, {
    task: "통합 AI 상세페이지 디자인 워크플로우 생성",
    providerStatus: "active",
  });
  return workflow;
}

function latestDesignWorkflow() {
  if (currentDesignWorkflow) return currentDesignWorkflow;
  const saved = readAiArtifacts()?.designWorkflow?.result;
  if (saved && typeof saved === "object") {
    currentDesignWorkflow = saved;
    return currentDesignWorkflow;
  }
  return runIntegratedDesignWorkflow();
}

function designEngineProfile(label, template, workflow = latestDesignWorkflow()) {
  const p = product();
  const industry = workflow?.analysis?.industry || inferProductIndustry(p);
  const isB = label.includes("B");
  const templateRules = templateDesignRules(template);
  const industryPresets = {
    health: {
      name: "건강식품 프리미엄",
      styleKey: isB ? "trust-commerce" : "premium-trust",
      colorSystem: isB
        ? { accent: "#d16c2f", bg: "#fff8ee", dark: "#30251d" }
        : { accent: "#b9822d", bg: "#fffaf0", dark: "#2b241b" },
      typography: "신뢰감 있는 세리프 포인트 + 정돈된 정보형 본문",
      imageStrategy: "원료컷, 패키지컷, 섭취 장면, 신뢰 자료를 순서대로 배치",
      flow: ["hero", "story", "benefit", "lifestyle", "trust", "info", "cta"],
    },
    beauty: {
      name: "뷰티 감성 브랜드",
      styleKey: isB ? "glow-commerce" : "sensory-editorial",
      colorSystem: isB
        ? { accent: "#d86f86", bg: "#fff4f7", dark: "#35222a" }
        : { accent: "#c58b9b", bg: "#fff8fa", dark: "#2d2427" },
      typography: "얇고 감성적인 헤드라인 + 여백 중심 프리미엄 본문",
      imageStrategy: "제형, 피부 텍스처, 사용 전후 기대감, 브랜드 무드를 크게 배치",
      flow: ["hero", "story", "lifestyle", "benefit", "trust", "info", "cta"],
    },
    living: {
      name: "생활용품 문제해결",
      styleKey: isB ? "problem-commerce" : "clean-solution",
      colorSystem: isB
        ? { accent: "#397577", bg: "#f5fbfa", dark: "#203738" }
        : { accent: "#5f7f8b", bg: "#f8fbfc", dark: "#253237" },
      typography: "명확한 정보형 타이틀 + 비교가 쉬운 실용 본문",
      imageStrategy: "문제 상황, 사용 장면, 전후 비교, 구성품 정보를 명확히 배치",
      flow: ["hero", "problem", "benefit", "usage", "compare", "info", "cta"],
    },
    fashion: {
      name: "패션/잡화 스타일링",
      styleKey: isB ? "trend-commerce" : "editorial-lookbook",
      colorSystem: isB
        ? { accent: "#1f1b17", bg: "#f7f3ef", dark: "#1f1b17" }
        : { accent: "#8b6f55", bg: "#fbf8f4", dark: "#231f1b" },
      typography: "룩북형 큰 제목 + 소재/핏 정보 중심 본문",
      imageStrategy: "착용컷, 소재 디테일, 스타일링 컷, 옵션 정보를 순서대로 배치",
      flow: ["hero", "lifestyle", "benefit", "lineup", "trust", "info", "cta"],
    },
    commerce: {
      name: "커머스 전환형",
      styleKey: isB ? "bold-commerce" : "premium-commerce",
      colorSystem: isB
        ? { accent: "#c66b2d", bg: "#fff7ed", dark: "#2f2923" }
        : { accent: "#9b7448", bg: "#fffaf4", dark: "#29231e" },
      typography: "상품명 중심 타이틀 + 구매 판단 정보형 본문",
      imageStrategy: "제품 대표컷, 특징컷, 사용컷, 정보컷을 균형 있게 배치",
      flow: ["hero", "benefit", "story", "lifestyle", "trust", "info", "cta"],
    },
  };
  const strategy = isB ? workflow?.abStrategy?.B : workflow?.abStrategy?.A;
  const profile = industryPresets[industry] || industryPresets.commerce;
  return {
    ...profile,
    name: templateRules.profileName || strategy?.name || profile.name,
    styleKey: templateRules.styleKey || strategy?.styleKey || profile.styleKey,
    colorSystem: templateRules.colorSystem || strategy?.colorSystem || profile.colorSystem,
    flow: templateRules.flow || strategy?.flow || profile.flow,
    industry,
    mode: templateRules.mode || strategy?.mode || (isB ? "conversion" : "brand"),
    focus: strategy?.focus || "",
    ctaTone: strategy?.ctaTone || "",
    template,
    templateRules,
    direction: p.direction,
    goals: p.goal,
  };
}

function sectionEngineGroup(section) {
  const type = section.type || "";
  if (type.includes("hero") || type === "summary-hero" || type === "product-intro") return "hero";
  if (type.includes("story") || type.includes("origin") || type === "scene-open") return "story";
  if (type.includes("benefit") || type.includes("lineup")) return "benefit";
  if (type.includes("life") || type.includes("routine") || type.includes("use") || type === "gift") return "lifestyle";
  if (type.includes("trust") || type.includes("proof") || type.includes("notice")) return "trust";
  if (type.includes("info") || type.includes("composition")) return "info";
  if (type.includes("compare") || type.includes("problem") || type.includes("solution")) return type.includes("problem") ? "problem" : "compare";
  if (type.includes("closing") || type.includes("cta") || type.includes("purchase")) return "cta";
  return "benefit";
}

function generateDetailBlueprint(label, template, templateData, controls, workflow = latestDesignWorkflow()) {
  const profile = designEngineProfile(label, template, workflow);
  const templateRules = profile.templateRules || templateDesignRules(template);
  const rawSections = (templateData?.sections || []).filter((section) => {
    if (controls.density !== "simple") return true;
    return !["compare", "closing", "gift-proof"].includes(section.type);
  });
  const flowIndex = new Map(profile.flow.map((item, index) => [item, index]));
  const sections = rawSections
    .map((section, originalIndex) => ({
      ...section,
      engineGroup: sectionEngineGroup(section),
      originalIndex,
    }))
    .sort((a, b) => {
      const aGroup = a.engineGroup;
      const bGroup = b.engineGroup;
      if (aGroup === "hero") return -1;
      if (bGroup === "hero") return 1;
      if (aGroup === "cta") return 1;
      if (bGroup === "cta") return -1;
      return (flowIndex.get(aGroup) ?? 50) - (flowIndex.get(bGroup) ?? 50) || a.originalIndex - b.originalIndex;
    });
  return {
    profile,
    sections,
    colorSystem: profile.colorSystem,
    imagePlan: workflow?.imagePlan || [],
    qualityGate: workflow?.qualityGate || [],
    templateRules,
    summary: `${profile.name} / ${templateRules.layoutSignature || profile.typography} / ${profile.imageStrategy}`,
  };
}

function detailSectionMarkup(section, index, label, template, slots, images, dataset, concept, sectionEdit = {}, blueprint = {}) {
  const imageMap = images || {};
  const selectedImageSlot = sectionEdit.imageSlot || section.imageSlot;
  const imageSrc = imageMap[selectedImageSlot];
  const title = sectionEdit.title || (section.titleSlot ? slots[section.titleSlot] : section.title);
  const copy = sectionEdit.copy || slots[section.copySlot] || dataset.mainMessage;
  const variant = sectionDesignVariant(section, index, concept, sectionEdit);
  const recipe = sectionDesignRecipe(section, index, variant, concept, blueprint);
  const variantClass = variant !== "auto" ? `section-variant-${variant}` : "";
  const sectionClass = index === 0 ? `detail-hero has-reference-image ${variantClass}` : `detail-auto-section ${section.type} ${variantClass}`;
  const sectionNo = String(index + 1).padStart(2, "0");
  const safeTitle = title || template;
  const safeCopy = copy || dataset.mainMessage;
  const sectionStyle = `min-height:${section.height}px${sectionEdit.color && sectionEdit.color !== "auto" ? `;--draft-accent:${sectionEdit.color}` : ""}`;
  const designBadge = sectionDesignBadge(variant, concept);
  const recipePanel = sectionRecipePanel(recipe);
  const supportPanels = `${recipePanel}${imageAiSlotPanel(blueprint.imagePlan, index)}`;
  const strategyPanel = detailStrategyPanel(blueprint, label);
  const imagePlaceholderCopy = index === 0 ? "브랜드 대표 비주얼" : "상세 이미지 영역";
  const imageMarkup = imageSrc
    ? `<img class="${index === 0 ? "detail-reference-img hero-img" : "detail-wide-img"}" src="${imageSrc}" alt="${escapeHtml(title || "상세페이지 참고 이미지")}">`
    : `<div class="${index === 0 ? "detail-product-shot hero-empty-shot" : "detail-image-block"}"><b>${escapeHtml(imageSlotLabel(selectedImageSlot))}</b><span>${escapeHtml(imagePlaceholderCopy)}</span></div>`;

  if (index === 0) {
    const heroBadges = heroBadgeItems();
    const heroProof = heroProofItems();
    return `
      <section class="detail-section ${sectionClass}" style="${sectionStyle}">
        ${designBadge}
        <i class="section-accent accent-line"></i>
        <i class="section-accent accent-block"></i>
        <div class="hero-brand-mark">${escapeHtml(concept.badge)}</div>
        <div class="detail-copy-block">
          <p class="detail-kicker">${escapeHtml(concept.title)}</p>
          ${strategyPanel}
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <strong>${escapeHtml(slots.oneLine || dataset.copyBlocks.hero)}</strong>
          <p>${escapeHtml(safeCopy)}</p>
          <div class="detail-hero-tags">
            ${(product().highlight.length ? product().highlight : dataset.purchasePoints).slice(0, 3).map((item) => `<b>${escapeHtml(item)}</b>`).join("")}
          </div>
          ${heroCustomerValueBar(label, blueprint)}
          <div class="hero-proof-stack">
            ${heroProof.map((item) => `<div><small>${escapeHtml(item.label)}</small><b>${escapeHtml(item.value)}</b></div>`).join("")}
          </div>
          <div class="detail-cta-row">
            ${heroBadges.map((item) => `<b><span>${escapeHtml(item.value)}</span>${escapeHtml(item.label)}</b>`).join("")}
          </div>
          ${healthTrustRibbon(blueprint)}
          <div class="hero-mini-copy">
            <b>${escapeHtml(concept.cta)}</b>
            <span>${escapeHtml(product().productName || "제품")}의 핵심 구매 포인트를 한 화면에 정리했습니다.</span>
          </div>
          ${supportPanels}
        </div>
        <div class="hero-product-stage">
          <div class="hero-product-frame">${imageMarkup}</div>
          <div class="hero-product-spec">
            <b>${escapeHtml(product().productName || "PRODUCT")}</b>
            <span>${escapeHtml((product().usp[0] || dataset.purchasePoints[0] || "핵심 포인트"))}</span>
          </div>
          ${heroMediaStrip(imageMap, selectedImageSlot)}
          <div class="hero-product-caption">
            <b>MAIN VISUAL</b>
            <span>${imageSrc ? "고객 제공/참고 이미지 우선 배치" : "제품 대표컷 필요"}</span>
          </div>
        </div>
      </section>
    `;
  }

  if (section.type === "benefit-grid" || section.type === "quick-benefits" || section.type === "proof-benefits") {
    const items = (product().usp.length ? product().usp : dataset.purchasePoints).slice(0, 4);
    return `
      <section class="detail-section ${sectionClass}" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(sectionKicker(section, concept))}</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle || "제품 핵심 장점")}</h4>
          <p>${escapeHtml(safeCopy)}</p>
        </div>
        <div class="detail-feature-grid">
          ${items.map((item, itemIndex) => `<div><i>${featureIcon(itemIndex)}</i><strong>${String(itemIndex + 1).padStart(2, "0")}</strong><span>${escapeHtml(item)}</span></div>`).join("")}
        </div>
        <div class="product-anatomy-grid">
          ${productAnatomyItems().map((item) => `
            <div>
              <small>${escapeHtml(item.label)}</small>
              <strong>${escapeHtml(item.value)}</strong>
              <span>${escapeHtml(item.copy)}</span>
            </div>
          `).join("")}
        </div>
        <div class="benefit-showcase">
          ${imageSrc ? imageMarkup : `<div class="detail-image-block"><b>${escapeHtml(imageSlotLabel(selectedImageSlot))}</b><span>상세 이미지 영역</span></div>`}
          <div class="benefit-spec-panel">
            <b>POINT SUMMARY</b>
            ${(product().highlight.length ? product().highlight : dataset.purchasePoints).slice(0, 4).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
        </div>
        ${imageRoleCard(selectedImageSlot, recipe)}
        <em>템플릿 규칙: ${escapeHtml(section.note || "섹션 목적에 맞춰 이미지와 카피를 배치")}</em>
        ${supportPanels}
      </section>
    `;
  }

  if (section.type.includes("story") || section.type.includes("origin") || section.type === "scene-open") {
    return `
      <section class="detail-section ${sectionClass} detail-story-layout" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(sectionKicker(section, concept))}</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <p>${escapeHtml(safeCopy)}</p>
          <div class="detail-story-line">
            <i></i><i></i><i></i>
          </div>
          <div class="origin-stat-row">
            <b>Lychee</b>
            <b>Honey</b>
            <b>Daily Stick</b>
          </div>
          <div class="origin-route-panel">
            <strong>INGREDIENT STORY</strong>
            <span>원료 이미지 → 브랜드 메시지 → 구매 신뢰로 이어지는 스토리 섹션</span>
          </div>
          <div class="ingredient-infographic">
            ${ingredientItems().map((item) => `
              <div>
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(item.value)}</span>
                <p>${escapeHtml(item.copy)}</p>
              </div>
            `).join("")}
          </div>
          <div class="story-timeline-panel">
            ${storyTimelineItems().map((item) => `
              <div>
                <small>${escapeHtml(item.step)}</small>
                <b>${escapeHtml(item.title)}</b>
                <span>${escapeHtml(item.copy)}</span>
              </div>
            `).join("")}
          </div>
          <em>스토리 규칙: 원료, 브랜드 배경, 고객 상황을 순서대로 읽히게 구성합니다.</em>
          ${supportPanels}
        </div>
        ${imageMarkup}
      </section>
    `;
  }

  if (section.type === "trust" || section.type === "product-info" || section.type === "composition") {
    const infoItems = [
      product().mustInclude || "필수 표기 문구",
      product().banWords || "과장/의약품 오인 표현 금지",
      "원산지, 구성, 보관 방법, 주의사항 확인",
    ];
    return `
      <section class="detail-section ${sectionClass} detail-info-layout" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(sectionKicker(section, concept))}</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <p>${escapeHtml(safeCopy)}</p>
          <div class="detail-info-table">
            ${infoItems.map((item) => `<div><b>CHECK</b><span>${escapeHtml(item)}</span></div>`).join("")}
          </div>
          <div class="product-spec-sheet">
            ${productSpecItems().map((item) => `
              <div>
                <small>${escapeHtml(item.label)}</small>
                <strong>${escapeHtml(item.value)}</strong>
              </div>
            `).join("")}
          </div>
          <div class="trust-badge-row">
            <b>원료 확인</b>
            <b>구성 확인</b>
            <b>표현 검수</b>
          </div>
          <div class="cert-panel">
            <strong>SAFE DETAIL CHECK</strong>
            <p>원료, 구성, 보관, 주의사항을 하단 정보 영역에서 한 번 더 검수합니다.</p>
          </div>
          <div class="trust-proof-grid">
            ${trustProofItems().map((item) => `
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.copy)}</span>
              </div>
            `).join("")}
          </div>
          <div class="trust-score-strip">
            ${trustScoreItems().map((item) => `
              <div>
                <small>${escapeHtml(item.label)}</small>
                <b>${escapeHtml(item.value)}</b>
                <span>${escapeHtml(item.copy)}</span>
              </div>
            `).join("")}
          </div>
          <em>정보 규칙: 고객이 구매 전 확인해야 하는 근거와 주의사항을 명확하게 배치합니다.</em>
          ${supportPanels}
        </div>
        ${imageMarkup}
      </section>
    `;
  }

  if (section.type === "compare" || section.type === "problem" || section.type === "solution") {
    const rows = comparisonItems();
    const conversionCards = conversionReasonCards();
    return `
      <section class="detail-section ${sectionClass} detail-compare-layout" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(concept.badge)} COMPARISON</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <p>${escapeHtml(safeCopy)}</p>
        </div>
        <div class="compare-board">
          <div class="compare-head">
            <b>일반 선택</b>
            <b>${escapeHtml(product().productName || "우리 제품")}</b>
          </div>
          ${rows.map((row) => `
            <div class="compare-row">
              <span>${escapeHtml(row.before)}</span>
              <strong>${escapeHtml(row.after)}</strong>
            </div>
          `).join("")}
        </div>
        <em>비교 규칙: 경쟁사를 직접 비방하지 않고 제품 선택 이유를 정보 중심으로 정리합니다.</em>
        <div class="conversion-reason-grid">
          ${conversionCards.map((item) => `
            <div>
              <small>${escapeHtml(item.label)}</small>
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.copy)}</span>
            </div>
          `).join("")}
        </div>
        ${supportPanels}
      </section>
    `;
  }

  if (section.type === "social-proof") {
    return `
      <section class="detail-section ${sectionClass} detail-review-layout" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(concept.badge)} SOCIAL PROOF</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <p>${escapeHtml(safeCopy)}</p>
        </div>
        <div class="review-card-grid">
          ${reviewSnippets().map((review) => `
            <div>
              <b>${escapeHtml(review.title)}</b>
              <p>${escapeHtml(review.copy)}</p>
            </div>
          `).join("")}
        </div>
        <em>리뷰 규칙: 실제 후기처럼 단정하지 않고, 구매 상황과 기대 포인트를 자연스럽게 제안합니다.</em>
        ${supportPanels}
      </section>
    `;
  }

  if (section.type === "lineup") {
    return `
      <section class="detail-section ${sectionClass} detail-lineup-layout" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(concept.badge)} LINE UP</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <p>${escapeHtml(safeCopy)}</p>
        </div>
        <div class="lineup-card-grid">
          ${lineupItems().map((item) => `
            <div>
              <b>${escapeHtml(item.title)}</b>
              <strong>${escapeHtml(item.value)}</strong>
              <span>${escapeHtml(item.copy)}</span>
            </div>
          `).join("")}
        </div>
        ${imageSrc ? imageMarkup : ""}
        <em>라인업 규칙: 구성, 수량, 사용 상황을 카드로 정리해 구매 판단을 빠르게 돕습니다.</em>
        ${supportPanels}
      </section>
    `;
  }

  if (section.type === "usage-process") {
    return `
      <section class="detail-section ${sectionClass} detail-process-layout" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(concept.badge)} PROCESS</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <p>${escapeHtml(safeCopy)}</p>
        </div>
        <div class="process-step-grid">
          ${processSteps().map((step, stepIndex) => `
            <div>
              <i>${String(stepIndex + 1).padStart(2, "0")}</i>
              <b>${escapeHtml(step.title)}</b>
              <span>${escapeHtml(step.copy)}</span>
            </div>
          `).join("")}
        </div>
        ${imageSrc ? imageMarkup : ""}
        <em>프로세스 규칙: 고객이 실제 사용 장면을 빠르게 이해하도록 3단계 이하로 정리합니다.</em>
        ${supportPanels}
      </section>
    `;
  }

  if (section.type === "notice") {
    return `
      <section class="detail-section ${sectionClass} detail-notice-layout" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(concept.badge)} NOTICE</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <p>${escapeHtml(safeCopy)}</p>
        </div>
        <div class="notice-panel-grid">
          ${noticeItems().map((item) => `
            <div>
              <b>${escapeHtml(item.title)}</b>
              <span>${escapeHtml(item.copy)}</span>
            </div>
          `).join("")}
        </div>
        ${supportPanels}
      </section>
    `;
  }

  if (section.type === "gift" || section.type === "lifestyle" || section.type === "routine" || section.type === "how-to-use") {
    const scenes = photoConcepts().slice(0, 3);
    return `
      <section class="detail-section ${sectionClass} detail-scene-layout" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(sectionKicker(section, concept))}</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <p>${escapeHtml(safeCopy)}</p>
          <div class="detail-scene-cards">
            ${scenes.map((item, sceneIndex) => `<div><strong>Scene ${sceneIndex + 1}</strong><span>${escapeHtml(item)}</span></div>`).join("")}
          </div>
          <div class="scene-mood-board">
            <b>PHOTO DIRECTION</b>
            <span>임시 시안에서는 고객 제공 사진을 사용하고, 최종 제작 시 촬영/합성컷으로 교체합니다.</span>
          </div>
          <em>이미지 규칙: 초안은 임시 사진으로 배치하고 최종은 촬영/합성컷으로 교체합니다.</em>
          ${supportPanels}
        </div>
        ${imageMarkup}
      </section>
    `;
  }

  if (section.type === "closing" || section.type === "cta" || section.type === "purchase") {
    return `
      <section class="detail-section ${sectionClass} detail-commerce-cta" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(concept.badge)} CLOSING</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <p>${escapeHtml(safeCopy)}</p>
          <div class="commerce-badge-grid">
            <b>간편 섭취</b>
            <b>선물 패키지</b>
            <b>프리미엄 원료</b>
          </div>
          <div class="final-offer-box">
            <strong>${escapeHtml(product().productName || "제품")}</strong>
            <span>상세페이지 최종 CTA 영역</span>
          </div>
          <div class="purchase-action-panel">
            <b>지금 필요한 정보를 모두 확인했다면</b>
            <strong>${escapeHtml(product().productName || "제품")} 선택 포인트를 다시 확인하세요</strong>
            <span>최종 제작 시 실제 구매 버튼/스토어 정책에 맞춰 교체됩니다.</span>
          </div>
          <div class="commerce-action-stack">
            ${commerceActionItems().map((item) => `
              <div>
                <small>${escapeHtml(item.label)}</small>
                <b>${escapeHtml(item.title)}</b>
                <span>${escapeHtml(item.copy)}</span>
              </div>
            `).join("")}
          </div>
          ${supportPanels}
        </div>
        ${imageMarkup}
      </section>
    `;
  }

  return `
    <section class="detail-section ${sectionClass}" style="${sectionStyle}">
      ${designBadge}
      <div class="detail-copy-block">
        <p>${escapeHtml(sectionKicker(section, concept))}</p>
        <span>${sectionNo}</span>
        <h4>${escapeHtml(safeTitle)}</h4>
        <p>${escapeHtml(safeCopy)}</p>
        <em>임시 이미지: 고객 제공 사진 배치 / 최종: 촬영 또는 합성 이미지로 교체</em>
        ${supportPanels}
      </div>
      ${imageMarkup}
    </section>
  `;
}

function sectionDesignVariant(section, index, concept, edit = {}) {
  if (edit.variant && edit.variant !== "auto") return edit.variant;
  const isGraphic = concept.className === "concept-graphic";
  if ((section.type || "").startsWith("sales-")) {
    if (section.type === "sales-hero") return isGraphic ? "graphic-badge" : "photo-focus";
    if (section.type === "sales-story") return isGraphic ? "graphic-badge" : "editorial";
    if (section.type === "sales-benefit") return isGraphic ? "graphic-badge" : "premium-card";
    if (section.type === "sales-scene") return "photo-focus";
    if (section.type === "sales-trust" || section.type === "sales-info") return isGraphic ? "premium-card" : "editorial";
    if (section.type === "sales-cta") return isGraphic ? "graphic-badge" : "premium-card";
  }
  if (index === 0) return isGraphic ? "graphic-badge" : "photo-focus";
  if (section.type.includes("story") || section.type.includes("origin") || section.type === "scene-open") return isGraphic ? "graphic-badge" : "editorial";
  if (["benefit-grid", "quick-benefits", "proof-benefits", "lineup", "usage-process"].includes(section.type)) return isGraphic ? "graphic-badge" : "premium-card";
  if (["trust", "product-info", "composition", "notice"].includes(section.type)) return isGraphic ? "premium-card" : "editorial";
  if (["gift", "lifestyle", "routine", "how-to-use"].includes(section.type)) return "photo-focus";
  if (["compare", "problem", "solution", "closing", "cta", "purchase"].includes(section.type)) return isGraphic ? "graphic-badge" : "premium-card";
  return isGraphic ? "graphic-badge" : "premium-card";
}

function sectionDesignBadge(variant, concept) {
  return `<div class="section-design-badge">${escapeHtml(SECTION_VARIANT_BADGES[variant] || concept.title)}</div>`;
}

function detailStrategyPanel(blueprint = {}, label = "A안") {
  const profile = blueprint.profile || {};
  const isB = label.includes("B");
  const motives = latestDesignWorkflow()?.analysis?.purchaseMotives || [];
  const items = motives.length ? motives : ["브랜드 무드", "구매 포인트", "신뢰 정보"];
  return `
    <div class="detail-strategy-panel">
      <small>${escapeHtml(isB ? "CONVERSION STRATEGY" : "BRAND STRATEGY")}</small>
      <b>${escapeHtml(profile.focus || profile.name || "AI 상세페이지 전략")}</b>
      <div>
        ${items.slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function heroCustomerValueBar(label = "A안", blueprint = {}) {
  const isB = label.includes("B");
  const p = product();
  const workflow = latestDesignWorkflow();
  const motives = workflow?.analysis?.purchaseMotives || [];
  const values = isB
    ? [p.usp[0] || "30포 구성", p.usp[1] || "스틱형 포장", motives[0] || "구매 전 확인 정보"]
    : [motives[0] || "프리미엄 원료", motives[1] || "선물 가치", p.usp[2] || "브랜드 무드"];
  return `
    <div class="hero-customer-value-bar">
      ${values.slice(0, 3).map((item, index) => `
        <div>
          <small>${String(index + 1).padStart(2, "0")}</small>
          <b>${escapeHtml(item)}</b>
        </div>
      `).join("")}
    </div>
  `;
}

function sectionDesignRecipe(section, index, variant, concept, blueprint = {}) {
  const type = section.type || "section";
  const isGraphic = concept.className === "concept-graphic";
  const imagePlan = blueprint.imagePlan?.[index % Math.max(blueprint.imagePlan.length, 1)];
  const base = {
    purpose: "제품 정보를 명확하게 전달하고 다음 섹션으로 자연스럽게 이어지게 합니다.",
    image: imagePlan?.role || "제품 사진 또는 관련 라이프스타일 이미지를 사용합니다.",
    hierarchy: "제목, 핵심 문장, 보조 정보 순서로 읽히게 구성합니다.",
  };
  if (index === 0) {
    return {
      purpose: isGraphic ? "첫 화면에서 구매 포인트를 빠르게 각인시키는 전환형 히어로" : "브랜드 첫인상과 제품 이미지를 고급스럽게 각인시키는 히어로",
      image: imagePlan?.role || "제품 대표컷을 가장 크게 사용하고, 패키지 형태와 색상이 잘 보이게 배치",
      hierarchy: isGraphic ? "제품명 → 핵심 배지 → 구매 포인트 → CTA" : "브랜드 무드 → 제품명 → 감성 카피 → 신뢰 포인트",
      variant,
    };
  }
  if (type.includes("story") || type.includes("origin") || type === "scene-open") {
    return {
      purpose: "원료와 브랜드 배경을 설명해 제품의 프리미엄 이유를 설득",
      image: imagePlan?.role || "원료 이미지, 산지 이미지, 브랜드 무드 이미지 또는 합성컷",
      hierarchy: "스토리 타이틀 → 원료/배경 설명 → 핵심 근거 카드",
      variant,
    };
  }
  if (["benefit-grid", "quick-benefits", "proof-benefits"].includes(type)) {
    return {
      purpose: "구매자가 바로 이해할 수 있게 핵심 장점을 카드로 압축",
      image: imagePlan?.role || "제품 디테일컷, 구성컷, 사용 전후 맥락 이미지",
      hierarchy: "핵심 장점 번호 → 짧은 문장 → 보조 요약 패널",
      variant,
    };
  }
  if (["trust", "product-info", "composition", "notice"].includes(type)) {
    return {
      purpose: "구매 전 확인 정보를 정리해 신뢰와 안전성을 보강",
      image: imagePlan?.role || "인증/성적서/제품 정보표/패키지 후면 이미지",
      hierarchy: "확인 항목 → 체크 리스트 → 주의사항",
      variant,
    };
  }
  if (["gift", "lifestyle", "routine", "how-to-use"].includes(type)) {
    return {
      purpose: "실제 사용 장면을 보여줘 고객이 제품을 쓰는 모습을 상상하게 함",
      image: imagePlan?.role || "손에 든 컷, 책상/가방/선물 장면, 라이프스타일 합성컷",
      hierarchy: "사용 상황 → 장면 카드 → 촬영/합성 방향",
      variant,
    };
  }
  if (["compare", "problem", "solution"].includes(type)) {
    return {
      purpose: "제품을 선택해야 하는 이유를 비교와 해결 구조로 설득",
      image: imagePlan?.role || "문제 상황 이미지, 제품 해결 장면, 비교 인포그래픽",
      hierarchy: "일반 선택의 아쉬움 → 우리 제품의 장점 → 선택 근거",
      variant,
    };
  }
  if (["closing", "cta", "purchase"].includes(type)) {
    return {
      purpose: "마지막 구매 판단을 돕고 고객 행동을 유도",
      image: imagePlan?.role || "패키지 전체컷, 최종 제품컷, 선물 세트 연출컷",
      hierarchy: "최종 제안 → 핵심 배지 → 구매 유도 문장",
      variant,
    };
  }
  return { ...base, variant };
}

function sectionRecipePanel(recipe) {
  return `
    <div class="section-recipe-panel">
      <b>DESIGN RECIPE</b>
      <span>${escapeHtml(recipe.purpose)}</span>
      <small>${escapeHtml(recipe.image)}</small>
    </div>
  `;
}

function imageAiSlotPanel(imagePlan = [], index = 0) {
  const item = imagePlan[index % Math.max(imagePlan.length, 1)];
  if (!item) return "";
  return `
    <div class="image-ai-slot-panel">
      <b>IMAGE AI SLOT</b>
      <span>${escapeHtml(item.role)}</span>
      <small>${escapeHtml(item.usedFor)} · ${escapeHtml(item.aiTarget)}</small>
    </div>
  `;
}

function visualPromptForSection(draftKey = activeSectionDraft, section = {}, index = activeSectionIndex) {
  const workflow = latestDesignWorkflow();
  const prompts = workflow.visualPrompts || [];
  const slot = section.imageSlot || "hero";
  const roleText = `${section.type || ""} ${slot} ${imageSlotLabel(slot)}`;
  const byDraft = prompts.filter((item) => item.draft === draftKey);
  return byDraft.find((item) => roleText.includes(item.role) || item.role.includes(slot))
    || byDraft[index % Math.max(byDraft.length, 1)]
    || prompts[index % Math.max(prompts.length, 1)]
    || null;
}

function sectionVisualPromptPanel(prompt, status = null) {
  if (!prompt) return "";
  return `
    <div class="section-visual-prompt-panel">
      <b>이미지 AI 생성 방향</b>
      <p>${escapeHtml(prompt.prompt)}</p>
      ${prompt.sourceImage ? `<em>참고 이미지: ${escapeHtml(prompt.sourceImage)}</em>` : ""}
      ${status ? `
        <div class="section-image-production-note">
          <strong>${escapeHtml(status.label || imageSlotLabel(status.slot || "hero"))} · ${escapeHtml(status.sourceLabel || "이미지 상태 확인")}</strong>
          <span>${escapeHtml(status.finalAction || "시안 기준으로 이미지 제작 방향을 확인합니다.")}</span>
          <small>${escapeHtml(status.designerNote || "제품 형태와 라벨을 왜곡하지 말 것")}</small>
        </div>
      ` : ""}
      <small>금지: ${escapeHtml(prompt.negativePrompt || prompt.negative_prompt || "제품 왜곡, 과장 표현, 깨진 텍스트 금지")}</small>
    </div>
  `;
}

function imageProductionStatusForSlot(slot = "hero") {
  const workflow = latestDesignWorkflow();
  const statusList = workflow.imageSlotStatus || imageSlotProductionStatus(workflow.imagePlan || []);
  return statusList.find((item) => item.slot === slot) || statusList.find((item) => item.slot === "hero") || null;
}

function sectionImageProductionBrief(key = activeSectionDraft) {
  const workflow = latestDesignWorkflow();
  const baseSections = editableSectionsForDraft(key);
  const sections = orderedSectionsForDraft(baseSections, key);
  const statusList = workflow.imageSlotStatus || imageSlotProductionStatus(workflow.imagePlan || []);
  const statusBySlot = Object.fromEntries(statusList.map((item) => [item.slot, item]));
  if (!sections.length) return "섹션별 이미지 제작 지시 없음. A/B 시안 생성 후 자동 정리됩니다.";
  return sections.map((section, orderIndex) => {
    const originalIndex = section.__originalIndex ?? orderIndex;
    const edit = sectionEdits[key]?.[originalIndex] || {};
    const slot = edit.imageSlot || section.imageSlot || "hero";
    const status = statusBySlot[slot] || statusBySlot.hero || {};
    const prompt = visualPromptForSection(key, { ...section, imageSlot: slot }, originalIndex);
    return `${String(orderIndex + 1).padStart(2, "0")}. ${sectionDefaultTitle(section)}
   - 섹션 역할: ${sectionKicker(section, designConcept(`${key}안`, key === "B" ? ($("#templateB")?.textContent.trim() || "") : ($("#templateA")?.textContent.trim() || "")))}
   - 이미지 슬롯: ${imageSlotLabel(slot)} / ${status.sourceLabel || "이미지 상태 확인 필요"}
   - 제작 방식: ${status.finalAction || "시안 기준으로 제품 이미지를 배치하고, 필요 시 촬영/합성컷으로 교체"}
   - 디자이너 주의: ${status.designerNote || "제품 형태, 로고, 라벨을 왜곡하지 말 것"}
   - 리스크: ${status.risk || "제품 정보와 이미지 가독성 확인"}
   - 생성 프롬프트: ${prompt?.prompt || "해당 섹션의 이미지 프롬프트는 전체 이미지 계획을 기준으로 적용"}`;
  }).join("\n");
}

function psdLayerGroupGuide(key = value("clientChoice").startsWith("B") ? "B" : "A") {
  const sections = orderedSectionsForDraft(editableSectionsForDraft(key), key);
  if (!sections.length) {
    return `01_Hero
02_Story
03_Ad_Poster
04_Benefit
05_Photo_Plan
06_Trust_Info
07_Purchase_Stack
08_Closing_CTA`;
  }
  return sections.map((section, index) => {
    const type = String(section.type || "section").replace(/[^a-zA-Z0-9]+/g, "_");
    const title = sectionDefaultTitle(section).replace(/\s+/g, " ").trim();
    return `${String(index + 1).padStart(2, "0")}_${type}
   - ${title}
   - ${section.designRole || sectionKicker(section)}`;
  }).join("\n");
}

function featureIcon(index) {
  return ["01", "✓", "+", "★"][index] || "•";
}

function imageSlotLabel(slot) {
  const labels = {
    hero: "제품 대표컷",
    origin: "원료 이미지",
    feature: "제품 디테일컷",
    lifestyle: "사용 장면컷",
    package: "패키지컷",
    trust: "신뢰 자료",
    info: "제품 정보",
    boxYellow: "옐로우 박스컷",
    boxPink: "핑크 박스컷",
    openBox: "30포 오픈박스컷",
    giftBag: "선물 쇼핑백컷",
    stick: "스틱 단독컷",
  };
  return labels[slot] || "상세 이미지";
}

function sectionKicker(section = {}, concept = {}) {
  const type = section.type || "";
  if (type === "sales-hero") return "Main Visual";
  if (type === "sales-story") return "Ingredient Story";
  if (type === "sales-benefit") return "Key Benefits";
  if (type === "sales-scene") return "Lifestyle Scene";
  if (type === "sales-trust") return "Trust & Proof";
  if (type === "sales-info") return "Product Information";
  if (type === "sales-cta") return "Final CTA";
  if (type.includes("story") || type.includes("origin") || type === "scene-open") return "Ingredient Story";
  if (["benefit-grid", "quick-benefits", "proof-benefits"].includes(type)) return "Key Benefits";
  if (["trust", "product-info", "composition"].includes(type)) return "Trust & Information";
  if (["gift", "lifestyle", "routine", "how-to-use"].includes(type)) return "Lifestyle Scene";
  if (["compare", "problem", "solution"].includes(type)) return "Why This Product";
  if (type === "social-proof") return "Customer Voice";
  if (type === "lineup") return "Package Lineup";
  if (type === "usage-process") return "How To Enjoy";
  if (type === "notice") return "Essential Notice";
  if (["closing", "cta", "purchase"].includes(type)) return "Final Offer";
  return concept.badge ? `${concept.badge} Detail` : "Detail Point";
}

function heroBadgeItems() {
  const p = product();
  if (p.productName.includes("호아비")) {
    return [
      { value: "30P", label: "구성" },
      { value: "STICK", label: "휴대" },
      { value: "GIFT", label: "선물" },
    ];
  }
  const points = p.usp.length ? p.usp.slice(0, 3) : categoryDataset(p.category).purchasePoints.slice(0, 3);
  return points.map((point, index) => ({
    value: String(index + 1).padStart(2, "0"),
    label: point,
  }));
}

function healthTrustRibbon(blueprint = {}) {
  if (blueprint.profile?.industry !== "health") return "";
  const rules = latestDesignWorkflow()?.decision?.riskRules || ["과장 표현 금지", "원료/구성 명확화", "선물 가치 강조"];
  return `
    <div class="health-trust-ribbon">
      <b>HEALTH FOOD CHECK</b>
      ${rules.slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function heroProofItems() {
  const p = product();
  if ((p.productName || "").includes("호아비")) {
    return [
      { label: "TYPE", value: "Stick pouch" },
      { label: "COUNT", value: "30P" },
      { label: "MOOD", value: "Gift premium" },
    ];
  }
  const usp = p.usp.length ? p.usp : ["핵심 장점", "제품 구성", "구매 이유"];
  return usp.slice(0, 3).map((item, index) => ({
    label: ["POINT", "VALUE", "MOOD"][index] || "INFO",
    value: item,
  }));
}

function heroMediaItems(imageMap = {}, activeSlot = "hero") {
  const p = product();
  const isHoabi = (p.productName || "").includes("호아비") || p.references.includes("hoabi-product");
  const baseItems = isHoabi
    ? [
        { slot: "hero", label: "Main", title: "패키지 대표컷", copy: "첫 화면에서 브랜드 무드와 제품 존재감을 크게 보여줍니다." },
        { slot: "feature", label: "Detail", title: "스틱 디테일컷", copy: "개별 포장, 휴대성, 섭취 편의성을 설명하는 컷입니다." },
        { slot: "origin", label: "Story", title: "원료 스토리컷", copy: "리치와 꿀의 원료 이미지를 감성적으로 보강합니다." },
      ]
    : [
        { slot: "hero", label: "Main", title: "제품 대표컷", copy: "상세페이지 첫 화면에 가장 크게 배치할 이미지입니다." },
        { slot: "feature", label: "Detail", title: "제품 특징컷", copy: "핵심 장점과 디테일을 설명할 때 사용합니다." },
        { slot: "lifestyle", label: "Scene", title: "사용 장면컷", copy: "고객이 실제 사용하는 모습을 상상하게 만듭니다." },
      ];

  return baseItems.map((item) => ({
    ...item,
    src: imageMap[item.slot],
    active: item.slot === activeSlot,
  }));
}

function heroMediaStrip(imageMap, activeSlot) {
  return `
    <div class="hero-media-strip">
      ${heroMediaItems(imageMap, activeSlot).map((item) => `
        <div class="${item.active ? "is-active" : ""}">
          ${item.src ? `<img src="${item.src}" alt="${escapeHtml(item.title)}">` : `<i>${escapeHtml(item.label)}</i>`}
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.copy)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function sectionImageDirection(recipe, slot) {
  return `
    <div class="section-image-direction">
      <b>${escapeHtml(imageSlotLabel(slot))}</b>
      <span>${escapeHtml(recipe.image)}</span>
    </div>
  `;
}

function trustProofItems() {
  const p = product();
  if ((p.productName || "").includes("호아비")) {
    return [
      { title: "원료 스토리", copy: "리치와 꿀 조합의 프리미엄 이미지를 중심으로 구성" },
      { title: "표현 검수", copy: "질병 치료, 효능 보장, 의약품 오인 표현 제외" },
      { title: "구성 확인", copy: "30포, 스틱형, 보관 및 섭취 정보를 명확하게 정리" },
    ];
  }
  return [
    { title: "필수 정보", copy: "구성, 소재, 사용법, 주의사항 확인" },
    { title: "표현 검수", copy: "과장 문구와 오인 가능 표현 제거" },
    { title: "구매 판단", copy: "고객이 비교하고 선택할 수 있는 근거 정리" },
  ];
}

function comparisonItems() {
  const p = product();
  const usp = p.usp.length ? p.usp : ["프리미엄 원료", "개별 스틱 포장", "선물용 패키지"];
  return [
    { before: "원료 스토리가 부족함", after: usp[0] || "원료 차별점 강조" },
    { before: "섭취/사용이 번거로움", after: usp[2] || "간편한 사용성" },
    { before: "선물용 이미지가 약함", after: usp[3] || "패키지와 선물성 강조" },
  ];
}

function conversionReasonCards() {
  const p = product();
  const usp = p.usp.length ? p.usp : categoryDataset(p.category).purchasePoints;
  const goals = p.goal.length ? p.goal : ["구매 전환", "제품 이해", "브랜드 신뢰"];
  return [
    {
      label: "Problem",
      title: "구매 전 망설임 제거",
      copy: goals[0] || "구매 전환에 필요한 핵심 이유를 먼저 보여줍니다.",
    },
    {
      label: "Reason",
      title: usp[0] || "제품만의 선택 이유",
      copy: usp[1] || "경쟁 제품과 다른 포인트를 짧고 강하게 정리합니다.",
    },
    {
      label: "Action",
      title: "지금 선택해야 하는 결론",
      copy: usp[2] || "상세페이지 하단 CTA로 자연스럽게 이어지게 만듭니다.",
    },
  ];
}

function productAnatomyItems() {
  const p = product();
  const usp = p.usp.length ? p.usp : categoryDataset(p.category).purchasePoints;
  return [
    { label: "Core", value: usp[0] || "핵심 장점", copy: "첫 구매 판단을 만드는 가장 강한 USP" },
    { label: "Use", value: usp[1] || "사용 편의", copy: "고객이 바로 이해할 수 있는 사용 장면" },
    { label: "Gift", value: usp[2] || "구성/패키지", copy: "선물성 또는 구성 정보를 시각적으로 보강" },
  ];
}

function storyTimelineItems() {
  const p = product();
  if ((p.productName || "").includes("호아비") || p.references.includes("hoabi-product")) {
    return [
      { step: "01", title: "리치 원료", copy: "제품의 차별화 소재를 먼저 인식시킵니다." },
      { step: "02", title: "꿀 블렌딩", copy: "프리미엄 식품 이미지를 연결합니다." },
      { step: "03", title: "스틱 루틴", copy: "간편한 데일리 섭취 장면으로 마무리합니다." },
    ];
  }
  return [
    { step: "01", title: "브랜드 배경", copy: "왜 이 제품을 만들었는지 설명합니다." },
    { step: "02", title: "제품 근거", copy: "핵심 원료나 기능 정보를 정리합니다." },
    { step: "03", title: "사용 장면", copy: "고객 생활 속 적용 장면으로 연결합니다." },
  ];
}

function trustScoreItems() {
  return [
    { label: "표현 검수", value: "SAFE", copy: "과장/의약품 오인 표현 제외" },
    { label: "정보 구조", value: "CLEAR", copy: "구성, 보관, 주의사항 확인" },
    { label: "구매 판단", value: "READY", copy: "고객이 비교할 근거 정리" },
  ];
}

function productSpecItems() {
  const p = product();
  const isHoabi = (p.productName || "").includes("호아비") || p.references.includes("hoabi-product");
  if (isHoabi) {
    return [
      { label: "제품명", value: "호아비 리치꿀스틱" },
      { label: "구성", value: "30포 구성" },
      { label: "형태", value: "개별 스틱 포장" },
      { label: "무드", value: "선물용 프리미엄 건강식품" },
    ];
  }
  return [
    { label: "제품명", value: p.productName || "제품명" },
    { label: "카테고리", value: p.category || "카테고리" },
    { label: "핵심 장점", value: p.usp[0] || categoryDataset(p.category).purchasePoints[0] || "핵심 장점" },
    { label: "구매 목적", value: p.goal[0] || "구매 전환" },
  ];
}

function imageRoleCard(slot, recipe) {
  return `
    <div class="image-role-card">
      <b>${escapeHtml(imageSlotLabel(slot))}</b>
      <span>${escapeHtml(recipe.image)}</span>
      <small>초안은 임시 배치, 최종은 촬영/합성컷으로 교체</small>
    </div>
  `;
}

function commerceActionItems() {
  const p = product();
  return [
    { label: "CHECK", title: "제품 정보 확인", copy: p.mustInclude || "구성, 원료, 사용 방법 확인" },
    { label: "SELECT", title: "선택 이유 정리", copy: p.usp[0] || "핵심 구매 포인트 확인" },
    { label: "ORDER", title: "구매 전환 유도", copy: "스토어 정책에 맞춰 버튼/혜택 영역 적용" },
  ];
}

function ingredientItems() {
  const p = product();
  if (p.productName.includes("호아비")) {
    return [
      { label: "Origin", value: "Litchi", copy: "리치 원료 스토리로 제품의 차별점을 만듭니다." },
      { label: "Blend", value: "Honey", copy: "꿀의 달콤한 이미지로 프리미엄 식품 무드를 강화합니다." },
      { label: "Routine", value: "Stick", copy: "하루 한 포 루틴을 쉽고 직관적으로 보여줍니다." },
    ];
  }
  const points = categoryDataset(p.category).purchasePoints;
  return [
    { label: "Point 01", value: points[0] || "원료", copy: "제품의 첫 번째 선택 이유를 시각화합니다." },
    { label: "Point 02", value: points[1] || "구성", copy: "구매 전 확인할 핵심 정보를 정리합니다." },
    { label: "Point 03", value: points[2] || "사용", copy: "사용 장면과 구매 이유를 연결합니다." },
  ];
}

function lineupItems() {
  const p = product();
  if (p.productName.includes("호아비")) {
    return [
      { title: "구성", value: "30포", copy: "매일 챙기기 좋은 스틱형 구성" },
      { title: "형태", value: "Stick", copy: "가방, 사무실, 선물용으로 편리한 개별 포장" },
      { title: "이미지", value: "Gift", copy: "패키지와 원료 스토리를 함께 강조" },
    ];
  }
  return [
    { title: "구성", value: "Set", copy: "제품 구성을 한눈에 정리합니다." },
    { title: "특징", value: "Point", copy: "구매 판단에 필요한 차별점을 보여줍니다." },
    { title: "활용", value: "Use", copy: "사용 장면과 혜택을 연결합니다." },
  ];
}

function processSteps() {
  const p = product();
  if (p.productName.includes("호아비")) {
    return [
      { title: "Open", copy: "개별 스틱을 간편하게 뜯어 준비합니다." },
      { title: "Enjoy", copy: "그대로 또는 음료/요거트와 함께 즐깁니다." },
      { title: "Carry", copy: "가방, 사무실, 선물용으로 부담 없이 챙깁니다." },
    ];
  }
  return [
    { title: "준비", copy: "제품을 사용하기 전 필요한 구성을 확인합니다." },
    { title: "사용", copy: "핵심 기능과 사용 방법을 직관적으로 보여줍니다." },
    { title: "보관", copy: "사용 후 관리와 보관 정보를 정리합니다." },
  ];
}

function noticeItems() {
  const p = product();
  const dataset = categoryDataset(p.category);
  return [
    { title: "표현 검수", copy: p.banWords || dataset.caution.join(", ") },
    { title: "필수 정보", copy: p.mustInclude || "구성, 원산지, 보관 방법, 주의사항" },
    { title: "납품 기준", copy: "최종 PNG/JPG 기준, 분할페이지 요청 시 별도 제공, PSD 원본은 추가금 대상" },
  ];
}

function reviewSnippets() {
  const p = product();
  if (p.productName.includes("호아비")) {
    return [
      { title: "부모님 선물용", copy: "부담스럽지 않은 구성과 고급스러운 패키지 이미지가 선물용으로 어울립니다." },
      { title: "직장인 데일리", copy: "가방이나 책상에 두고 하루 한 포 챙기기 쉬운 스틱형 구성입니다." },
      { title: "원료 스토리", copy: "리치와 꿀의 조합을 제품의 프리미엄 이미지로 자연스럽게 연결합니다." },
    ];
  }
  return [
    { title: "구매 전 확인", copy: "제품 장점과 사용 장면을 한눈에 이해할 수 있도록 정리합니다." },
    { title: "사용 상황", copy: "고객이 실제로 사용할 장면을 먼저 상상할 수 있게 구성합니다." },
    { title: "선택 이유", copy: "구성, 편의성, 신뢰 요소를 구매 판단 포인트로 제안합니다." },
  ];
}

function sectionLayoutItems(template) {
  const p = product();
  const templateData = templateDataset(template);
  const blueprint = generateDetailBlueprint("A안", template, templateData, draftControls(), latestDesignWorkflow());
  if (shouldUseSalesDesignRenderer(p, blueprint)) {
    return salesRendererSections(template === "스토리 스크롤형" || template === "전환 집중형" ? "B안" : "A안", template)
      .map((section) => section.title);
  }
  if (templateData?.sections?.length) {
    return templateData.sections.map((section) => section.title || slotsTitle(section.titleSlot) || section.type);
  }
  const dataset = categoryDataset(p.category);
  const baseProduct = p.productName || "제품";
  const uspText = p.usp.join(", ") || "제품 핵심 장점";

  if (template === "풀비주얼 브랜드형") {
    return [
      `${baseProduct} 메인 비주얼과 핵심 카피`,
      dataset.sections[1] || "브랜드/제품 첫인상 소개",
      `${uspText} 중심의 프리미엄 포인트`,
      dataset.sections[4] || "패키지와 선물 이미지 강조",
      dataset.sections[5] || "제품 구성과 사용 방법",
      dataset.sections[6] || "신뢰 요소와 구매 유도",
    ];
  }
  if (template === "스토리 스크롤형") {
    return [
      "고객 상황 또는 선물 장면으로 시작",
      dataset.sections[1] || "브랜드/원료 스토리 소개",
      `${baseProduct}가 필요한 이유`,
      `${uspText} 상세 설명`,
      dataset.sections[4] || "사용 장면과 패키지 연출",
      dataset.sections[6] || "제품 정보와 구매 안내",
    ];
  }
  if (template === "카드 정보형") {
    return [
      `${baseProduct} 핵심 요약`,
      "제품 장점 3~5가지 카드 정리",
      "원료/구성/사용법 정보 블록",
      "구매 전 확인 정보",
      "후기/인증/신뢰 요소",
      "구매 유도 영역",
    ];
  }
  return [
    "구매 전 고민 제시",
    `${baseProduct} 해결 포인트`,
    `${uspText} 비교/설득 영역`,
    "제품 구성과 사용 편의성",
    "신뢰 요소 정리",
    "구매 전환 CTA",
  ];
}

function slotsTitle(slot) {
  if (slot === "productName") return product().productName || "제품명";
  if (slot === "oneLine") return "제품 한 줄 설명";
  return "";
}

function renderSectionLayouts() {
  const layoutA = $("#templateA")?.textContent.trim() || "풀비주얼 브랜드형";
  const layoutB = $("#templateB")?.textContent.trim() || "스토리 스크롤형";
  const targetA = $("#sectionLayoutA");
  const targetB = $("#sectionLayoutB");
  const libraryA = TEMPLATE_LIBRARY.find((item) => item.name === layoutA);
  const libraryB = TEMPLATE_LIBRARY.find((item) => item.name === layoutB);
  const reasonA = libraryA ? templateRecommendation(libraryA) : null;
  const reasonB = libraryB ? templateRecommendation(libraryB) : null;
  if ($("#templateAReason")) {
    $("#templateAReason").textContent = reasonA ? `추천 ${reasonA.score}% · ${reasonA.reason}` : "제품 정보 기반 추천 방향입니다.";
  }
  if ($("#templateBReason")) {
    $("#templateBReason").textContent = reasonB ? `추천 ${reasonB.score}% · ${reasonB.reason}` : "제품 정보 기반 추천 방향입니다.";
  }
  if (targetA) {
    targetA.innerHTML = sectionLayoutItems(layoutA).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }
  if (targetB) {
    targetB.innerHTML = sectionLayoutItems(layoutB).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }
  if ($("#modalSectionA")) {
    $("#modalSectionA").innerHTML = sectionLayoutItems(layoutA).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }
  if ($("#modalSectionB")) {
    $("#modalSectionB").innerHTML = sectionLayoutItems(layoutB).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }
}

function editableSectionsForDraft(key = activeSectionDraft) {
  const template = key === "B"
    ? ($("#templateB")?.textContent.trim() || "스토리 스크롤형")
    : ($("#templateA")?.textContent.trim() || "풀비주얼 브랜드형");
  const controls = draftControls();
  const templateData = templateDataset(template);
  const label = key === "B" ? "B안" : "A안";
  const blueprint = generateDetailBlueprint(label, template, templateData, controls, latestDesignWorkflow());
  if (shouldUseSalesDesignRenderer(product(), blueprint)) {
    return salesRendererSections(label, template);
  }
  return blueprint.sections;
}

function sectionDefaultTitle(section) {
  const slots = copySlots();
  return section.titleSlot ? slots[section.titleSlot] : section.title || slotsTitle(section.titleSlot) || "상세 섹션";
}

function sectionDefaultCopy(section) {
  if (section.copy) return section.copy;
  const slots = copySlots();
  const dataset = categoryDataset(product().category);
  return slots[section.copySlot] || dataset.mainMessage;
}

function sectionColorOptions(selected) {
  const options = [
    ["auto", "전체 색상 유지"],
    ["#c56a2d", "오렌지 포인트"],
    ["#b88a2a", "골드 포인트"],
    ["#4f8f5f", "그린 포인트"],
    ["#1f1b17", "블랙 포인트"],
    ["#d86f86", "핑크 포인트"],
  ];
  return options.map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("");
}

function sectionVariantOptions(selected) {
  const options = Object.entries(SECTION_VARIANT_LABELS);
  return options.map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("");
}

function imageSlotOptions(selected) {
  const slots = ["hero", "feature", "openBox", "package", "boxYellow", "boxPink", "giftBag", "lifestyle", "origin", "trust", "info"];
  return slots.map((slot) => `<option value="${slot}" ${selected === slot ? "selected" : ""}>${imageSlotLabel(slot)}</option>`).join("");
}

function renderSectionEditor() {
  const target = $("#sectionEditList");
  if (!target) return;
  $("[data-edit-draft='A']")?.classList.toggle("active", activeSectionDraft === "A");
  $("[data-edit-draft='B']")?.classList.toggle("active", activeSectionDraft === "B");
  if ($("#studioDraftLabel")) $("#studioDraftLabel").textContent = `${activeSectionDraft}안 편집 중`;
  if ($("#studioTemplateLabel")) {
    $("#studioTemplateLabel").textContent = activeSectionDraft === "B"
      ? ($("#templateB")?.textContent.trim() || "B안")
      : ($("#templateA")?.textContent.trim() || "A안");
  }

  if (!value("productName")) {
    renderStudioSectionList([]);
    target.innerHTML = `
      <div class="empty-draft-guide">
        <strong>프로젝트를 먼저 불러와주세요.</strong>
        <p>고객 접수 목록에서 프로젝트를 선택하면 섹션 수정 항목이 자동으로 열립니다.</p>
      </div>
    `;
    return;
  }

  const baseSections = editableSectionsForDraft(activeSectionDraft);
  const sections = orderedSectionsForDraft(baseSections, activeSectionDraft);
  if (activeSectionIndex >= sections.length) activeSectionIndex = 0;
  if (!sections.length) {
    renderStudioSectionList([]);
    target.innerHTML = `
      <div class="empty-draft-guide">
        <strong>수정할 섹션이 없습니다.</strong>
        <p>A/B 시안을 다시 생성하면 섹션 목록이 표시됩니다.</p>
      </div>
    `;
    return;
  }

  renderStudioSectionList(sections);
  const section = sections[activeSectionIndex];
  const originalIndex = section.__originalIndex ?? activeSectionIndex;
  const edit = sectionEdits[activeSectionDraft]?.[originalIndex] || {};
  const concept = designConcept(`${activeSectionDraft}안`, activeSectionDraft === "B" ? ($("#templateB")?.textContent.trim() || "") : ($("#templateA")?.textContent.trim() || ""));
  const variant = sectionDesignVariant(section, activeSectionIndex, concept, edit);
  const recipe = sectionDesignRecipe(section, activeSectionIndex, variant, concept);
  const title = edit.title || sectionDefaultTitle(section);
  const copy = edit.copy || sectionDefaultCopy(section);
  const imageSlot = edit.imageSlot || section.imageSlot || "hero";
  const color = edit.color || "auto";
  const selectedVariant = edit.variant || "auto";
  const editState = sectionEditState(section, edit);
  const visualPrompt = visualPromptForSection(activeSectionDraft, { ...section, imageSlot }, originalIndex);
  const imageProduction = imageProductionStatusForSlot(imageSlot);
  if ($("#activeSectionTitle")) $("#activeSectionTitle").textContent = `${String(activeSectionIndex + 1).padStart(2, "0")} ${title}`;
  target.innerHTML = `
    <article class="section-edit-card" data-section-index="${originalIndex}">
      <div class="section-edit-card-head">
        <span>${String(activeSectionIndex + 1).padStart(2, "0")}</span>
        <strong>${escapeHtml(sectionKicker(section, concept))}</strong>
        <em>${escapeHtml(activeSectionDraft)}안</em>
      </div>
      <div class="section-edit-status-row">
        <mark class="${escapeHtml(editState.className)}">${escapeHtml(editState.label)}</mark>
        <small>${escapeHtml(imageSlotLabel(imageSlot))} · ${escapeHtml(SECTION_VARIANT_LABELS[selectedVariant] || "자동 디자인")}</small>
      </div>
      <div class="section-order-controls">
        <button type="button" data-section-move="-1" ${activeSectionIndex === 0 ? "disabled" : ""}>위로</button>
        <button type="button" data-section-move="1" ${activeSectionIndex === sections.length - 1 ? "disabled" : ""}>아래로</button>
      </div>
      <div class="section-editor-recipe">
        <b>디자인 목적</b>
        <p>${escapeHtml(section.designRole || recipe.purpose)}</p>
        <b>권장 이미지</b>
        <p>${escapeHtml(recipe.image)}</p>
        <b>정보 위계</b>
        <p>${escapeHtml(recipe.hierarchy)}</p>
      </div>
      <label>섹션 제목
        <input data-section-field="title" value="${escapeHtml(title)}">
      </label>
      <label>섹션 설명
        <textarea data-section-field="copy" rows="6">${escapeHtml(copy)}</textarea>
      </label>
      <details class="section-advanced-settings">
        <summary>색상 / 이미지 / 디자인 스타일 조정</summary>
      ${sectionVisualPromptPanel(visualPrompt, imageProduction)}
      <div class="section-edit-row">
        <label>색상
          <select data-section-field="color">${sectionColorOptions(color)}</select>
        </label>
        <label>사진 슬롯
          <select data-section-field="imageSlot">${imageSlotOptions(imageSlot)}</select>
        </label>
      </div>
      <label>디자인 스타일
        <select data-section-field="variant">${sectionVariantOptions(selectedVariant)}</select>
      </label>
      </details>
    </article>
  `;
  target.querySelectorAll("[data-section-field]").forEach((field) => {
    field.addEventListener("input", () => {
      collectSectionEdits();
      renderDraftPreviewsOnly();
    });
    field.addEventListener("change", () => {
      collectSectionEdits();
      renderDraftPreviewsOnly();
    });
  });
  target.querySelectorAll("[data-section-move]").forEach((button) => {
    button.addEventListener("click", () => moveActiveSection(Number(button.dataset.sectionMove || 0)));
  });
  updateActiveDraftView();
}

function collectSectionEdits() {
  const cards = $$(".section-edit-card");
  if (!cards.length) return;
  const next = sectionEdits[activeSectionDraft] || [];
  cards.forEach((card) => {
    const index = Number(card.dataset.sectionIndex || activeSectionIndex);
    const read = (field) => card.querySelector(`[data-section-field="${field}"]`)?.value.trim() || "";
    const previous = next[index] || {};
    next[index] = {
      title: read("title"),
      copy: read("copy"),
      color: read("color") || "auto",
      imageSlot: read("imageSlot") || "hero",
      variant: read("variant") || "auto",
      autoPolished: false,
      manualEdited: previous.autoPolished || previous.manualEdited ? true : Boolean(Object.keys(previous).length),
    };
  });
  sectionEdits[activeSectionDraft] = next;
}

function sectionEditState(section, edit = {}) {
  if (edit.manualEdited) {
    return {
      label: "수동 수정됨",
      className: "section-state-manual",
    };
  }
  if (edit.autoPolished) {
    return {
      label: "AI 자동 폴리싱",
      className: "section-state-ai",
    };
  }
  if (isSectionEdited(section, edit)) {
    return {
      label: "수정됨",
      className: "section-state-manual",
    };
  }
  return {
    label: "기본값",
    className: "section-state-default",
  };
}

function isSectionEdited(section, edit = {}) {
  if (!edit || !Object.keys(edit).length) return false;
  const defaultTitle = sectionDefaultTitle(section);
  const defaultCopy = sectionDefaultCopy(section);
  const defaultImageSlot = section.imageSlot || "hero";
  return Boolean(
    (edit.title && edit.title !== defaultTitle) ||
    (edit.copy && edit.copy !== defaultCopy) ||
    (edit.color && edit.color !== "auto") ||
    (edit.imageSlot && edit.imageSlot !== defaultImageSlot) ||
    (edit.variant && edit.variant !== "auto")
  );
}

function renderStudioSectionList(sections) {
  const target = $("#studioSectionList");
  if (!target) return;
  if (!sections.length) {
    target.innerHTML = `<li>시안 생성 후 섹션이 표시됩니다.</li>`;
    return;
  }
  target.innerHTML = sections.map((section, index) => {
    const originalIndex = section.__originalIndex ?? index;
    const edit = sectionEdits[activeSectionDraft]?.[originalIndex] || {};
    const title = edit.title || sectionDefaultTitle(section);
    const variantLabel = SECTION_VARIANT_LABELS[edit.variant || "auto"] || "자동 디자인";
    const edited = isSectionEdited(section, edit);
    const editState = sectionEditState(section, edit);
    return `
      <li>
        <button class="${index === activeSectionIndex ? "active" : ""} ${edited ? "edited" : ""}" data-section-pick="${index}">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <b>${escapeHtml(title)}</b>
          <em><mark class="${escapeHtml(editState.className)}">${escapeHtml(editState.label)}</mark>${escapeHtml(imageSlotLabel(edit.imageSlot || section.imageSlot || "hero"))} · ${escapeHtml(variantLabel)}</em>
        </button>
      </li>
    `;
  }).join("");
  $$("[data-section-pick]").forEach((button) => {
    button.addEventListener("click", () => {
      collectSectionEdits();
      activeSectionIndex = Number(button.dataset.sectionPick || 0);
      renderSectionEditor();
      scrollActiveDraftSection();
    });
  });
}

function scrollActiveDraftSection() {
  const draft = activeSectionDraft === "B" ? $("#draftB") : $("#draftA");
  const section = orderedPreviewSections(draft)[activeSectionIndex];
  section?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function orderedPreviewSections(draft) {
  const sections = Array.from(draft?.querySelectorAll(".detail-section, .sales-detail-page > section") || []);
  return sections.sort((a, b) => {
    const aOrder = Number(getComputedStyle(a).order || 0);
    const bOrder = Number(getComputedStyle(b).order || 0);
    return aOrder - bOrder;
  });
}

function highlightActiveDraftSection() {
  $$(".detail-section.active-edit-section, .sales-detail-page > section.active-edit-section").forEach((section) => {
    section.classList.remove("active-edit-section");
  });
  const draft = activeSectionDraft === "B" ? $("#draftB") : $("#draftA");
  const section = orderedPreviewSections(draft)[activeSectionIndex];
  section?.classList.add("active-edit-section");
}

function updateActiveDraftView() {
  const draftA = $("#draftA");
  const draftB = $("#draftB");
  draftA?.classList.toggle("inactive-preview", activeSectionDraft !== "A");
  draftB?.classList.toggle("inactive-preview", activeSectionDraft !== "B");
  draftA?.classList.toggle("active-preview", activeSectionDraft === "A");
  draftB?.classList.toggle("active-preview", activeSectionDraft === "B");
  highlightActiveDraftSection();
}

function toggleGuideMode() {
  const workspace = $(".draft-workspace");
  if (!workspace) return;
  const hidden = workspace.classList.toggle("customer-preview-mode");
  const button = $("#toggleGuideMode");
  if (button) button.textContent = hidden ? "내부 가이드 보기" : "고객용 미리보기";
  renderDraftPreviewsOnly();
  renderSectionEditor();
}

function applySectionEdits() {
  collectSectionEdits();
  generateDraftsRules();
  renderSectionEditor();
}

function renderDraftPreviewsOnly() {
  if (!value("productName")) return;
  $("#draftA").innerHTML = draftMarkup("A안", $("#templateA").textContent.trim());
  $("#draftB").innerHTML = draftMarkup("B안", $("#templateB").textContent.trim());
  updateActiveDraftView();
  renderDraftQualityDashboard();
  updateWorkflowState();
}

function generateQualityReviewText() {
  const p = product();
  const workflow = latestDesignWorkflow();
  const imageReady = Boolean(p.references || value("references"));
  const hasBanWords = Boolean(p.banWords || p.avoid.length);
  const sections = editableSectionsForDraft("A").length || 0;
  const blocks = workflow.designBlocks || recommendedDesignBlocks(workflow.analysis, workflow.decision);
  const imageStatus = workflow.imageSlotStatus || imageSlotProductionStatus(workflow.imagePlan || []);
  const compositeCount = imageStatus.filter((item) => item.statusTone === "composite").length;
  const sourceCount = imageStatus.filter((item) => item.sourceImage).length;
  const designScore = draftDesignQualityScore();
  const readiness = draftCustomerReadiness(designScore);
  const qualitySignals = [
    ...DETAIL_DESIGN_OPERATION_SIGNALS,
    ...DETAIL_DESIGN_QUALITY_GATES.map((gate) => gate.signal),
  ].filter((item, index, list) => list.indexOf(item) === index);
  return `[AI 디자인 품질 검수]
검수 역할: Claude/품질 검수 AI 역할에 해당하는 단계입니다.

1. 상세페이지 구조
- 긴 세로형 섹션 수: ${sections}개
- 업종 판단: ${workflow.analysis.industry}
- A안 전략: ${workflow.abStrategy.A.name} / ${workflow.abStrategy.A.focus}
- B안 전략: ${workflow.abStrategy.B.name} / ${workflow.abStrategy.B.focus}
- A안 디자인 패키지: ${blocks.A?.emphasis || blocks.A?.concept || "프리미엄/브랜드형"}
- B안 디자인 패키지: ${blocks.B?.emphasis || blocks.B?.concept || "전환/정보형"}

2. 이미지 상태
- 현재 이미지 자료: ${imageReady ? "참고 이미지/제품 이미지 정보 있음" : "이미지 자료 보완 필요"}
- 이미지 AI/촬영 슬롯: ${workflow.imagePlan.length}개
- 제공 이미지 사용 슬롯: ${sourceCount}개
- 촬영/합성 보강 슬롯: ${compositeCount}개
- 대표컷, 디테일컷, 사용 장면컷, 신뢰 자료컷 역할을 섹션별로 확인해야 합니다.

3. 디자인 품질
- 내부 디자인 준비도: ${designScore.score}점 / 100점
- 고객 발송 판단: ${readiness.label}
- Claude 실제 검수 상태: ${readiness.claudeStatus}
- A안은 브랜드/프리미엄 무드 중심, B안은 전환/정보 전달 중심으로 구분되어야 합니다.
- 광고형 고밀도 포스터 구간에서 제품 이미지, 레퍼런스 컷, 구매 포인트가 한 화면 안에 결합되어야 합니다.
- 촬영/합성 방향 구간에서 임시 이미지와 최종 제작 이미지의 차이가 고객에게 설명 가능해야 합니다.
- 구매 설득 마감 구간에서 A/B 선택 이유와 최종 CTA가 명확하게 보여야 합니다.
- 섹션별 카드, 비교표, CTA, 신뢰 요소가 단순 박스처럼 보이지 않는지 확인합니다.
- 보완 필요 항목: ${designScore.missing.length ? designScore.missing.join(", ") : "현재 기준에서는 핵심 디자인 장치가 모두 감지됨"}
- 현재 적용된 디자인 신호:
${qualitySignals.map((item, index) => `  ${index + 1}. ${item}`).join("\n")}

4. 표현 리스크
- 금지 표현 관리: ${hasBanWords ? "금지/주의 표현 입력됨" : "금지 표현 보완 필요"}
- 건강식품/기능성 제품은 질병 치료, 효능 보장, 의약품 오인 표현을 제외해야 합니다.

5. 다음 개선 제안
- ${readiness.nextAction}
- 제품 이미지가 부족하면 임시 시안에는 촬영/합성 방향을 명확히 표시합니다.
- 첫 화면에서 제품 이미지가 작거나 여백이 과하면 히어로 이미지 크기와 제품 쇼케이스 레일을 우선 조정합니다.
- 고객에게 보내기 전 A/B 선택 기준과 수정 가능 범위를 메일에 포함합니다.
- 다음 개발 우선순위는 실제 화면 캡처 기준으로 여백, 이미지 크기, 섹션 길이, CTA 밀도를 조정하는 것입니다.`;
}

function draftDesignQualityScore() {
  const html = `${$("#draftA")?.innerHTML || ""}\n${$("#draftB")?.innerHTML || ""}`;
  const isTemplateMixPreview = html.includes("sales-template-mix-page") && !html.includes("sales-story-section");
  const visualGates = isTemplateMixPreview
    ? TEMPLATE_MIX_QUALITY_GATES
    : DETAIL_DESIGN_QUALITY_GATES;
  const checks = [
    ...visualGates.map((gate) => ({ label: gate.label, pass: gate.check(html) })),
    {
      label: "편집 가능한 섹션 상태",
      pass: isTemplateMixPreview
        ? Boolean(sectionEdits.A?.length || sectionEdits.B?.length)
        : html.includes("sales-final-decision-panel") && Boolean(sectionEdits.A?.length || sectionEdits.B?.length),
    },
    { label: "섹션별 이미지 제작 지시", pass: sectionImageProductionBrief("A").includes("생성 프롬프트") && sectionImageProductionBrief("B").includes("생성 프롬프트") },
  ];
  const passed = checks.filter((item) => item.pass).length;
  return {
    score: Math.round((passed / checks.length) * 100),
    missing: checks.filter((item) => !item.pass).map((item) => item.label),
    checks,
    passed,
    total: checks.length,
  };
}

function hasRenderedPreviewEvidence() {
  const artifacts = readAiArtifacts();
  const quality = artifacts.qualityReview;
  const resultText = typeof quality?.result === "string" ? quality.result : "";
  return resultText.includes("rendered_visual_review") || resultText.includes("Figma 렌더 검수 완료") || resultText.includes("PNG 렌더 검수 완료");
}

function recordRenderedPreviewReview(type = "PNG") {
  const label = type === "figma" ? "Figma 렌더 검수 완료" : "PNG 렌더 검수 완료";
  const result = `rendered_visual_review\n${label}\nA/B 시안의 실제 출력 화면을 기준으로 제품 이미지 크기, 섹션 여백, CTA 밀도, 텍스트 가독성을 담당자가 확인했습니다.`;
  saveAiArtifact("qualityReview", "rules", result, {
    reviewType: type,
    checkedBy: "담당자",
    checklist: ["제품 이미지 크기", "섹션 여백", "CTA 밀도", "텍스트 가독성", "A/B 컨셉 차이"],
  });
  renderDraftQualityDashboard();
  renderClientPreflight($("#clientMailResult")?.textContent || "");
  updateWorkflowState();
}

function clearRenderedPreviewReview() {
  const artifacts = readAiArtifacts();
  if (artifacts.qualityReview) {
    delete artifacts.qualityReview;
    localStorage.setItem(`detailAiArtifacts:${currentProjectKey()}`, JSON.stringify(artifacts));
  }
  renderDraftQualityDashboard();
  renderClientPreflight($("#clientMailResult")?.textContent || "");
  updateWorkflowState();
}

function draftCustomerReadiness(score = draftDesignQualityScore()) {
  const renderedChecked = hasRenderedPreviewEvidence();
  const cappedScore = renderedChecked ? score.score : Math.min(score.score, RENDERED_REVIEW_SCORE_CAP);
  const isReady = renderedChecked && cappedScore >= CUSTOMER_READY_SCORE && score.missing.length === 0;
  const isPolish = cappedScore >= 72;
  return {
    score: cappedScore,
    rawScore: score.score,
    renderedChecked,
    isReady,
    tone: isReady ? "ready" : isPolish ? "warning" : "weak",
    label: isReady ? "고객 발송 가능" : renderedChecked ? "디자인 디테일 보완 필요" : "Figma/PNG 렌더 검수 전",
    claudeStatus: renderedChecked ? "Claude/시각 검수 결과 반영 가능" : "Claude API 연결 전. 현재는 로컬 기준으로 1차 검수",
    nextAction: renderedChecked
      ? (score.missing[0] || "실제 화면 기준 여백, 이미지 크기, CTA 밀도를 마지막으로 확인하세요.")
      : "Figma 또는 PNG로 렌더링된 A/B 시안을 Claude 검수에 넣어야 고객 발송 가능 여부를 확정할 수 있습니다.",
  };
}

function abDecisionGuide() {
  const workflow = latestDesignWorkflow();
  return {
    A: {
      title: "A안 추천",
      label: "프리미엄 브랜드/감성형",
      focus: workflow.abStrategy?.A?.focus || "브랜드 무드, 원료 스토리, 선물 이미지",
      bestFor: "고급스러운 첫인상, 브랜드 신뢰, 선물용 이미지를 강조하고 싶을 때",
      check: ["따뜻한 프리미엄 톤", "원료/브랜드 스토리", "선물 패키지 무드"],
    },
    B: {
      title: "B안 추천",
      label: "정보 전달/구매 전환형",
      focus: workflow.abStrategy?.B?.focus || "구매 이유, 비교 정보, 구성 확인",
      bestFor: "고객이 제품 장점과 구매 이유를 빠르게 이해해야 할 때",
      check: ["비교표와 체크리스트", "구성/편의성 정보", "강한 구매 판단 CTA"],
    },
  };
}

function renderDraftQualityDashboard() {
  const target = $("#draftQualityDashboard");
  if (!target) return;
  const score = draftDesignQualityScore();
  const readiness = draftCustomerReadiness(score);
  const decision = abDecisionGuide();
  const topChecks = score.checks.slice(0, 9);
  target.className = `draft-quality-dashboard is-${readiness.tone}`;
  target.innerHTML = `
    <div class="quality-score-card">
      <span>고객 발송 준비도</span>
      <strong>${readiness.score}점</strong>
      <p>구조 ${readiness.rawScore}점 · ${score.passed}/${score.total}개 기준 통과</p>
      <em>${escapeHtml(readiness.label)}</em>
    </div>
    <div class="quality-gate-list">
      <span class="${readiness.renderedChecked ? "pass" : "fail"}">
        <b>${readiness.renderedChecked ? "완료" : "필요"}</b>
        Figma/PNG 렌더 검수
      </span>
      <span class="${readiness.isReady ? "pass" : "fail"}">
        <b>${readiness.isReady ? "가능" : "대기"}</b>
        Claude 품질 판단
      </span>
      ${topChecks.map((item) => `
        <span class="${item.pass ? "pass" : "fail"}">
          <b>${item.pass ? "통과" : "보완"}</b>
          ${escapeHtml(item.label)}
        </span>
      `).join("")}
    </div>
    <div class="quality-next-action">
      <b>다음 보완 기준</b>
      <span>${escapeHtml(readiness.nextAction)}</span>
      <small>${escapeHtml(readiness.claudeStatus)}</small>
      <div class="render-review-actions">
        <button type="button" data-render-review="png">PNG 검수 완료</button>
        <button type="button" data-render-review="figma">Figma 검수 완료</button>
        <button type="button" data-render-review-clear>초기화</button>
      </div>
    </div>
    <div class="ab-decision-guide">
      ${["A", "B"].map((key) => `
        <article class="${key === "B" ? "is-conversion" : "is-premium"}">
          <span>${escapeHtml(decision[key].title)}</span>
          <strong>${escapeHtml(decision[key].label)}</strong>
          <p>${escapeHtml(decision[key].bestFor)}</p>
          <small>${escapeHtml(decision[key].focus)}</small>
          <div>
            ${decision[key].check.map((item) => `<b>${escapeHtml(item)}</b>`).join("")}
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

async function runQualityReview() {
  const fallback = generateQualityReviewText();
  renderDraftQualityDashboard();
  try {
    const review = await invokeAiRole("qualityReview", "A/B 상세페이지 디자인 품질 검수", {
      product: product(),
      layoutA: $("#templateA")?.textContent.trim() || "",
      layoutB: $("#templateB")?.textContent.trim() || "",
      sectionCount: editableSectionsForDraft("A").length,
      instruction: "A/B 시안이 실제 쇼핑몰 상세페이지로 충분한지 검수하고 누락 요소, 이미지 보완점, 표현 리스크, 다음 수정 제안을 작성한다.",
    }, fallback);
    const target = $("#aiQualityReview");
    if (target) target.textContent = review || fallback;
    return review || fallback;
  } catch {
    const target = $("#aiQualityReview");
    if (target) target.textContent = fallback;
    return fallback;
  }
}

function recordImageDesignWorkflow() {
  const workflow = latestDesignWorkflow();
  invokeAiRole("imageDesign", "A/B 상세페이지 이미지 및 디자인 시안 구조 생성", {
    product: product(),
    designWorkflow: workflow,
    imageSet: detailImageSet(),
    photoConcepts: workflow.imagePlan || photoConcepts(),
    layoutA: $("#templateA")?.textContent.trim() || "",
    layoutB: $("#templateB")?.textContent.trim() || "",
    instruction: "현재는 로컬 HTML/CSS 상세페이지 엔진으로 디자인 시안을 생성하고, 추후 GPT Image, Flux, Figma 생성기로 교체 가능한 역할이다.",
  }, "로컬 디자인 엔진으로 A/B 상세페이지 시안을 생성했습니다.");
}

function photoPromptText(concept, index) {
  const p = product();
  const dataset = categoryDataset(p.category);
  const colors = p.direction.includes("프리미엄 브랜드형") || p.highlight.includes("고급스러운 이미지")
    ? "warm ivory background, premium gold accent, clean studio lighting"
    : "clean bright background, natural product lighting";
  const productName = p.productName || "제품";
  const referenceRule = productName.includes("호아비")
    ? "use the exact same Hoabee Litchi Honey Stick product from the reference image, keep package color, logo, stick shape, and product proportions consistent"
    : "use the same product from the provided reference image, keep product shape and branding consistent";
  return `${referenceRule}, ${productName} product detail page image, ${concept}, ${colors}, vertical ecommerce detail page section, Korean premium brand mood, realistic commercial product photography, detailed texture, natural shadow, clean composition, no medical claim, no exaggerated effect, shot ${index + 1}, ${dataset.tone}`;
}

function renderPhotoConcepts() {
  const target = $("#photoConceptList");
  if (!target) return;
  target.innerHTML = photoConcepts().map((item, index) => `
    <li class="prompt-card">
      <strong>${String(index + 1).padStart(2, "0")}</strong>
      <div>
        <span>${escapeHtml(item)}</span>
        <details>
          <summary>프롬프트 보기</summary>
          <code>${escapeHtml(photoPromptText(item, index))}</code>
        </details>
      </div>
    </li>
  `).join("");
  renderPhotoGridPrompt();
  renderImageSlotStatus();
}

function renderImageSlotStatus() {
  const target = $("#imageSlotStatusList");
  if (!target) return;
  const workflow = latestDesignWorkflow();
  const statusList = workflow.imageSlotStatus || imageSlotProductionStatus(workflow.imagePlan || []);
  target.innerHTML = statusList.slice(0, 8).map((item, index) => `
    <article class="image-slot-status-card ${escapeHtml(item.statusTone || "primary")}">
      <div>
        <strong>${String(index + 1).padStart(2, "0")}</strong>
        <span>${escapeHtml(item.label)}</span>
      </div>
      <b>${escapeHtml(item.status)}</b>
      <p>${escapeHtml(item.finalAction)}</p>
      <small>${escapeHtml(item.sourceLabel)}${item.sourceImage ? ` · ${escapeHtml(item.sourceImage)}` : ""}</small>
    </article>
  `).join("");
}

function photoGridPromptText() {
  const p = product();
  const scenes = photoConcepts().slice(0, 9).map((item, index) => `${index + 1}. ${item}`).join("\n");
  const referenceRule = p.productName.includes("호아비")
    ? "참고 이미지의 호아비 리치꿀스틱 제품을 동일하게 유지하고, 패키지 컬러, 로고 위치, 스틱 형태, 제품 비율이 달라지지 않게 해주세요."
    : "참고 이미지의 동일한 제품을 사용하고, 제품 외형과 브랜드 특징을 일관되게 유지해주세요.";
  return `참고 이미지의 동일한 제품을 사용해, 9개의 서로 다른 현실적인 라이프스타일 제품 사진 장면을 보여주는 3x3 그리드 이미지를 생성해주세요.

${referenceRule}

각 프레임은 서로 다른 사용 상황과 배경 환경을 담고 있어야 합니다. 전체 분위기는 전문적인 상업 광고 사진 스타일, 사실적인 조명, 디테일한 질감 표현, 자연스러운 그림자, 광고 수준의 높은 완성도, 제품이 중심이 되는 깔끔한 구도로 구성해주세요.

[장면 구성]
${scenes}

최종 결과물은 위에서 내려다본 탑다운 형태의 3x3 그리드 레이아웃이며, 하나의 이미지 안에 9개의 분리된 정사각형 프레임으로 구성해주세요. 모든 프레임에서 제품의 외형과 특징은 일관되게 유지하고, 전체적으로 고급스러운 제품 사진 느낌과 극사실주의 스타일로 표현해주세요.

금지: 의약품처럼 보이는 표현, 질병 치료 암시, 과장된 효능 표현, 제품 로고 왜곡, 실제 제품과 다른 패키지 생성`;
}

function renderPhotoGridPrompt() {
  const target = $("#photoGridPrompt");
  if (!target) return;
  target.textContent = photoGridPromptText();
}

function recommendTemplatePair() {
  if (manualTemplateChanged) return;
  const workflow = latestDesignWorkflow();
  if (workflow?.analysis?.industry === "health") {
    if ($("#templateA")) $("#templateA").textContent = "프리미엄 건강식품 01";
    if ($("#templateB")) $("#templateB").textContent = "구매 설득형 01";
    if ($("#templateAReason")) $("#templateAReason").textContent = "원료 스토리, 선물성, 프리미엄 브랜드 무드를 먼저 보여주는 방향입니다.";
    if ($("#templateBReason")) $("#templateBReason").textContent = "구매 포인트, 비교, 신뢰 정보를 앞쪽에 배치하는 전환형 방향입니다.";
    return;
  }
  const ranked = TEMPLATE_LIBRARY
    .filter((item) => item.category === categoryDatasetLabel() || item.category === "식품/건강식품")
    .map((item) => ({ item, recommend: templateRecommendation(item) }))
    .sort((a, b) => b.recommend.score - a.recommend.score);
  const first = ranked[0]?.item || TEMPLATE_LIBRARY[0];
  const second = ranked.find((entry) => entry.item.templateKey !== first.templateKey || entry.item.purpose !== first.purpose)?.item || ranked[1]?.item || TEMPLATE_LIBRARY[2];
  if ($("#templateA") && first) $("#templateA").textContent = first.name;
  if ($("#templateB") && second) $("#templateB").textContent = second.name;
  if ($("#templateAReason")) $("#templateAReason").textContent = first?.description || "제품 정보 기반 추천 방향입니다.";
  if ($("#templateBReason")) $("#templateBReason").textContent = second?.description || "제품 정보 기반 추천 방향입니다.";
}

function categoryDatasetLabel() {
  const category = product().category;
  if (category.includes("식품") || category.includes("건강")) return "식품/건강식품";
  if (category.includes("뷰티") || category.includes("화장품")) return "뷰티/화장품";
  if (category.includes("생활")) return "생활용품";
  return "식품/건강식품";
}

function generateDraftsRules() {
  if (!value("productName")) {
    $("#draftA").innerHTML = `<div class="empty-draft-guide"><strong>프로젝트를 먼저 불러와주세요.</strong><p>고객 접수 목록에서 프로젝트를 열면 제품명, 카피, 이미지가 시안에 자동 반영됩니다.</p></div>`;
    $("#draftB").innerHTML = `<div class="empty-draft-guide"><strong>시안 생성 대기</strong><p>호아비 테스트는 Step 1의 '호아비 1~7 테스트 실행'으로 바로 확인할 수 있습니다.</p></div>`;
    renderSectionEditor();
    updateActiveDraftView();
    renderDraftQualityDashboard();
    updateWorkflowState();
    return;
  }
  currentDesignWorkflow = runIntegratedDesignWorkflow();
  recommendTemplatePair();
  renderSectionLayouts();
  renderPhotoConcepts();
  recordImageDesignWorkflow();
  autoPolishDraftSections(currentDesignWorkflow);
  $("#draftA").innerHTML = draftMarkup("A안", $("#templateA").textContent.trim());
  $("#draftB").innerHTML = draftMarkup("B안", $("#templateB").textContent.trim());
  renderSectionEditor();
  updateActiveDraftView();
  generateClientMail();
  renderDraftQualityDashboard();
  runQualityReview();
  updateWorkflowState();
}

async function generateDrafts() {
  await prepareInternalAiPlanning();
  generateDraftsRules();
  const settings = readAiSettings();
  if (settings.mode !== "openai") return;
  try {
    const aiText = await invokeAiRole("draftSummary", "A/B 상세페이지 시안 요약 생성", {
      product: product(),
      layoutA: $("#templateA").textContent.trim(),
      layoutB: $("#templateB").textContent.trim(),
      instruction: "A안과 B안의 고객용 비교 요약을 짧게 작성하라. 긴 섹션별 지시서는 만들지 말고 핵심 컨셉, 메인 카피, 선택 포인트만 정리하라.",
    }, "");
    if (aiText) {
      $("#draftA").innerHTML += `<div class="draft-summary"><h3>AI 보강 요약</h3><pre>${escapeHtml(aiText)}</pre></div>`;
    }
    updateAiStatus("A/B 시안 AI 보강 완료");
  } catch (error) {
    updateAiStatus("A/B 시안 AI 보강 실패. 기본 미리보기를 유지합니다.");
  }
}

function generateClientMailText() {
  const p = product();
  const layoutA = $("#templateA").textContent.trim();
  const layoutB = $("#templateB").textContent.trim();
  const conceptA = designConcept("A안", layoutA);
  const conceptB = designConcept("B안", layoutB);
  const concepts = photoConcepts().slice(0, 6).map((item, index) => `${index + 1}. ${item}`).join("\n");
  const imageStatus = clientImageStatusSummary();
  const workflow = latestDesignWorkflow();
  const aFocus = workflow.abStrategy?.A?.focus || "브랜드 무드와 제품 스토리";
  const bFocus = workflow.abStrategy?.B?.focus || "구매 이유와 정보 전달";
  return `제목: [${p.productName}] 상세페이지 1차 방향성 시안 전달드립니다

안녕하세요, 고객님.
${p.productName} 상세페이지 제작을 위한 1차 방향성 시안 2가지를 전달드립니다.

[A/B 시안 선택 기준]
A안: ${conceptA.title}
- 구성 방향: ${layoutA}
- 핵심 포인트: ${templateTone(layoutA).focus}
- 추천 기준: 브랜드 이미지, 고급스러운 첫인상, 원료/스토리, 선물용 무드가 중요할 때
- 내부 전략: ${aFocus}

B안: ${conceptB.title}
- 구성 방향: ${layoutB}
- 핵심 포인트: ${templateTone(layoutB).focus}
- 추천 기준: 구매 포인트, 비교 정보, 구성 확인, 빠른 이해가 중요할 때
- 내부 전략: ${bFocus}

이번 시안에는 아래 요소가 포함되어 있습니다.
1. 긴 세로형 상세페이지 흐름
2. 제품 대표컷/디테일컷/스토리컷 역할 구분
3. A안: 프리미엄 히어로, 원료 스토리, 선물 무드, 고급 CTA
4. B안: 구매 체크리스트, 비교표, 전환형 카드, 명확한 선택 유도
5. 선택 방향에 따라 수정 가능한 섹션별 텍스트와 색상 구조

이미지 안내:
현재 시안에 들어간 일부 이미지는 최종 촬영본이 아닌 임시 배치 이미지입니다.
최종 제작 시에는 선택하신 방향에 맞춰 제품 사진 보정, 배경 합성, 촬영컷 교체를 진행합니다.

[추천 촬영/합성 방향]
${concepts}

[이미지 진행 기준]
${imageStatus}

아래 양식으로 회신 부탁드립니다.

1. 선택 방향: A안 / B안 / A안 일부 수정 / B안 일부 수정
2. 마음에 드는 부분:
3. 수정하고 싶은 부분:
4. 더 강조할 내용:
5. 제외하거나 줄일 내용:
6. 이미지 관련 요청: 제품 사진 교체 / 촬영 희망 / 현재 방향 유지

회신 주시면 선택하신 방향을 기준으로 상세 디자인 작업을 진행하겠습니다.

감사합니다.`;
}

function clientPreflightChecks(mailText = $("#clientMailResult")?.textContent || "") {
  const p = product();
  const workflow = latestDesignWorkflow();
  const draftText = `${$("#draftA")?.innerText || ""}\n${$("#draftB")?.innerText || ""}`;
  const mail = String(mailText || "");
  const internalWords = ["DESIGN RECIPE", "IMAGE AI SLOT", "AI DESIGN STRATEGY", "Image AI prompt", "Selected draft design brief"];
  const internalLeaks = internalWords.filter((word) => draftText.includes(word) || mail.includes(word));
  const banWords = [
    ...String(p.banWords || "").split(/[,/\n]/),
    ...p.avoid,
    "질병 치료",
    "면역력 향상 보장",
    "의약품",
  ].map((item) => item.trim()).filter(Boolean);
  const riskyWords = banWords.filter((word) => word && (draftText.includes(word) || mail.includes(word)));
  const hasDrafts = Boolean($("#draftA")?.innerText.trim() && $("#draftB")?.innerText.trim());
  const hasProduct = Boolean(p.productName && p.category);
  const hasImagePlan = (workflow.imagePlan || []).length > 0;
  const hasVisualPrompts = (workflow.visualPrompts || []).length > 0;
  const mailMentionsTemporaryImage = /임시|촬영|합성|교체|최종/.test(mail);
  const hasReplyTemplate = /선택 방향|마음에 드는 부분|수정하고 싶은 부분|이미지 관련 요청/.test(mail);
  const abDifferent = (workflow.abStrategy?.A?.focus || "") !== (workflow.abStrategy?.B?.focus || "");
  const hasDecisionGuide = Boolean($(".ab-decision-guide")?.innerText.includes("A안 추천") && $(".ab-decision-guide")?.innerText.includes("B안 추천"));
  const qualityScore = draftDesignQualityScore();
  const checks = [
    {
      label: "프로젝트 기본 정보",
      ok: hasProduct,
      detail: hasProduct ? `${p.productName} / ${p.category}` : "제품명과 카테고리를 확인해주세요.",
    },
    {
      label: "A/B 시안 생성",
      ok: hasDrafts,
      detail: hasDrafts ? "A/B 시안 미리보기가 생성되어 있습니다." : "A/B 시안을 먼저 생성해주세요.",
    },
    {
      label: "A/B 방향 차이",
      ok: abDifferent,
      detail: abDifferent ? "A안과 B안의 전략이 다르게 설정되어 있습니다." : "A/B 전략 차이가 약합니다.",
    },
    {
      label: "A/B 선택 가이드",
      ok: hasDecisionGuide,
      detail: hasDecisionGuide ? "담당자가 고객에게 설명할 A/B 추천 기준이 화면에 표시됩니다." : "A/B 선택 가이드를 먼저 확인해주세요.",
    },
    {
      label: "디자인 품질 기준",
      ok: qualityScore.score >= 75,
      detail: `현재 디자인 구조 점수 ${qualityScore.score}점 / 통과 ${qualityScore.passed}개`,
    },
    {
      label: "이미지/합성 계획",
      ok: hasImagePlan && hasVisualPrompts,
      detail: hasVisualPrompts ? `이미지 슬롯 ${workflow.imagePlan.length}개, 생성 프롬프트 ${workflow.visualPrompts.length}개` : "이미지 생성/촬영 프롬프트가 부족합니다.",
    },
    {
      label: "고객 회신 양식",
      ok: hasReplyTemplate,
      detail: hasReplyTemplate ? "고객이 A/B 선택과 수정 요청을 바로 회신할 수 있는 양식이 포함되어 있습니다." : "고객 회신 양식이 부족합니다.",
    },
    {
      label: "내부 문구 노출",
      ok: internalLeaks.length === 0,
      detail: internalLeaks.length ? `${internalLeaks.join(", ")} 문구가 고객용 자료에 남아있을 수 있습니다.` : "고객에게 보이면 안 되는 내부 문구는 감지되지 않았습니다.",
    },
    {
      label: "금지/주의 표현",
      ok: riskyWords.length === 0,
      detail: riskyWords.length ? `${[...new Set(riskyWords)].join(", ")} 표현을 확인해주세요.` : "금지/주의 표현 위험이 감지되지 않았습니다.",
    },
    {
      label: "임시 이미지 안내",
      ok: mailMentionsTemporaryImage,
      detail: mailMentionsTemporaryImage ? "메일에 임시 이미지 및 촬영/합성 교체 안내가 포함되어 있습니다." : "메일에 임시 이미지 안내를 포함하는 것이 좋습니다.",
    },
  ];
  return {
    checks,
    passed: checks.every((item) => item.ok),
  };
}

function renderClientPreflight(mailText) {
  const target = $("#clientPreflightResult");
  const result = clientPreflightChecks(mailText);
  if (!target) return result;
  target.classList.toggle("passed", result.passed);
  target.classList.toggle("needs-check", !result.passed);
  target.innerHTML = `
    <strong>${result.passed ? "발송 가능 상태" : "발송 전 확인 필요"}</strong>
    <p>${result.passed ? "고객에게 시안을 보낼 준비가 되었습니다." : "아래 항목을 확인한 뒤 메일을 발송하세요."}</p>
    <ul>
      ${result.checks.map((item) => `
        <li class="${item.ok ? "ok" : "warn"}">
          <b>${item.ok ? "OK" : "확인"}</b>
          <span>${escapeHtml(item.label)}</span>
          <em>${escapeHtml(item.detail)}</em>
        </li>
      `).join("")}
    </ul>
  `;
  return result;
}

async function generateClientMail() {
  const fallback = generateClientMailText();
  $("#clientMailResult").textContent = fallback;
  renderClientPreflight(fallback);
  try {
    const aiText = await invokeAiRole("clientMail", "고객에게 보낼 A/B 시안 전달 메일 생성", {
      product: product(),
      layoutA: $("#templateA").textContent.trim(),
      layoutB: $("#templateB").textContent.trim(),
      tone: "정중하고 간결한 비즈니스 메일",
    }, fallback);
    if (aiText) $("#clientMailResult").textContent = aiText;
    renderClientPreflight(aiText || fallback);
  } catch {
    $("#clientMailResult").textContent = fallback;
    renderClientPreflight(fallback);
  }
  updateWorkflowState();
}

function mailPartsFromText(text, fallbackSubject) {
  const lines = String(text || "").split("\n");
  const firstLine = lines[0]?.trim() || "";
  if (firstLine.startsWith("제목:")) {
    return {
      subject: firstLine.replace("제목:", "").trim() || fallbackSubject,
      body: lines.slice(1).join("\n").trim(),
    };
  }
  return {
    subject: fallbackSubject,
    body: String(text || "").trim(),
  };
}

async function copyResultText(targetId, successMessage) {
  const text = $(targetId)?.textContent?.trim() || "";
  if (!text || text.includes("여기에 표시됩니다")) {
    alert("먼저 메일 초안을 생성해주세요.");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    updateAiStatus(successMessage);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
    updateAiStatus(successMessage);
  }
}

function openMailDraft(targetId, fallbackSubject) {
  const text = $(targetId)?.textContent?.trim() || "";
  if (!text || text.includes("여기에 표시됩니다")) {
    alert("먼저 메일 초안을 생성해주세요.");
    return;
  }
  const parts = mailPartsFromText(text, fallbackSubject);
  window.location.href = `mailto:?subject=${encodeURIComponent(parts.subject)}&body=${encodeURIComponent(parts.body)}`;
}

function generateRevisionText() {
  const p = product();
  const choice = value("clientChoice");
  const reply = value("clientReply") || "고객 회신 내용이 아직 입력되지 않았습니다.";
  const memo = value("managerMemo") || "담당자 추가 메모 없음";
  const selectedTemplate = choice.startsWith("B") ? $("#templateB").textContent.trim() : $("#templateA").textContent.trim();
  const dataset = categoryDataset(p.category);
  const layouts = sectionLayoutItems(selectedTemplate);
  const photoItems = photoConcepts().slice(0, 5);
  const selectedKey = choice.startsWith("B") ? "B" : "A";
  const editSummary = sectionEditSummary(selectedKey);
  const feedbackItems = analyzeClientFeedback();
  const priorityItems = feedbackPriorityPlan(feedbackItems);
  const feedbackSummary = feedbackItems.length
    ? feedbackItems.map((item, index) => `${index + 1}. ${item.label}: ${item.copyHint}`).join("\n")
    : "고객 피드백에서 명확한 수정 의도가 감지되지 않았습니다. 담당자 확인이 필요합니다.";

  return `[고객 피드백 반영 수정 시안]

제품명: ${p.productName}
선택 방향: ${choice}
기준 템플릿: ${selectedTemplate}

[고객 피드백 원문]
${reply}

[담당자 메모]
${memo}

[AI 피드백 분석]
${feedbackSummary}

[수정 우선순위]
${priorityItems}

[AI 수정 반영 방향]
1. 선택한 ${choice.includes("B") ? "B안" : "A안"}의 전체 레이아웃을 기준으로 유지합니다.
2. 고객이 언급한 수정 요청은 PSD 제작 전 초안 단계에서 먼저 반영 방향을 정리합니다.
3. 이미지가 임시인 구간은 촬영/합성 컨셉을 더 명확하게 표시합니다.
4. 건강식품 표현은 ${dataset.caution.join(", ")} 기준을 지켜 과장 표현을 피합니다.

[섹션별 수정 반영표]
${layouts.map((item, index) => `${index + 1}. ${item}
   - 반영 방식: 고객 피드백을 기준으로 카피, 이미지 슬롯, 강조 순서를 조정
   - 확인 포인트: 최종 PSD 제작 전 고객 컨펌 필요`).join("\n")}

[시안 편집 작업대 반영값]
${editSummary}

[이미지/촬영/합성 교체 방향]
${photoItems.map((item, index) => `${index + 1}. ${item}`).join("\n")}

[고객 컨펌 요청 포인트]
1. 선택한 방향(${choice})으로 PSD 제작을 진행해도 되는지
2. 수정 반영표 중 추가하거나 빼야 할 섹션이 있는지
3. 임시 이미지가 최종 촬영/합성 이미지로 교체되는 점을 확인했는지
4. 최종 납품 범위가 PNG/JPG 기준이며 PSD 원본은 별도 추가금 대상임을 확인했는지

[디자이너에게 넘기기 전 확인]
고객이 이 수정 방향을 컨펌하면, 다음 단계에서 미얀마 디자이너용 PSD 작업 지시서를 생성합니다.`;
}

function sectionEditSummary(key) {
  const edits = sectionEdits[key] || [];
  if (!edits.length) return "섹션별 수동 수정값 없음. 자동 생성 시안 기준으로 진행합니다.";
  return edits.map((edit, index) => {
    const color = edit.color && edit.color !== "auto" ? edit.color : "전체 톤 유지";
    const variant = SECTION_VARIANT_LABELS[edit.variant || "auto"] || "자동 디자인";
    return `${String(index + 1).padStart(2, "0")}. ${edit.title || "섹션 제목 유지"}
   - 설명: ${edit.copy || "기본 설명 유지"}
   - 색상: ${color}
   - 사진 슬롯: ${imageSlotLabel(edit.imageSlot || "hero")}
   - 디자인 스타일: ${variant}`;
  }).join("\n");
}

function generateRevisionMailText() {
  const p = product();
  const choice = value("clientChoice");
  const feedbackItems = analyzeClientFeedback();
  const topItems = feedbackItems.slice(0, 4).map((item, index) => `${index + 1}. ${item.label}: ${item.copyHint}`).join("\n");
  return `제목: [${p.productName}] 상세페이지 수정 방향 확인 요청드립니다

안녕하세요, 고객님.
보내주신 피드백을 기준으로 ${p.productName} 상세페이지 수정 방향을 정리했습니다.

기준 방향: ${choice}

아래 수정 방향을 확인 부탁드립니다.

[수정 반영 예정 내용]
${topItems || "1. 고객 회신 내용을 기준으로 문구, 이미지, 섹션 강조 순서를 정리합니다."}

[확인 부탁드릴 내용]
1. 위 수정 방향으로 진행해도 되는지
2. 추가로 더 강조하거나 제외할 내용이 있는지
3. 임시 이미지를 최종 촬영/합성 이미지로 교체하는 방향에 동의하시는지
4. 최종 PSD 제작 단계로 넘어가도 되는지

확인 후 컨펌 주시면 해당 방향으로 PSD 제작 작업에 들어가겠습니다.

감사합니다.`;
}

function feedbackPriorityPlan(items = analyzeClientFeedback()) {
  if (!items.length) return "1. 고객 회신 내용 확인 필요: 명확한 수정 의도가 감지되지 않았습니다.";
  const priorityMap = {
    redraft: 1,
    image: 2,
    tone: 3,
    conversion: 3,
    ingredient: 4,
    remove: 5,
    simple: 5,
    keep: 6,
    general: 7,
  };
  return [...items]
    .sort((a, b) => (priorityMap[a.type] || 9) - (priorityMap[b.type] || 9))
    .map((item, index) => {
      const scope = item.sectionTypes?.map((type) => sectionTypeLabel(type)).join(", ") || "전체 시안";
      return `${index + 1}. ${item.label}
   - 우선순위: ${priorityLabel(index)}
   - 적용 섹션: ${scope}
   - 반영 내용: ${item.copyHint}`;
    }).join("\n");
}

function priorityLabel(index) {
  if (index === 0) return "최우선";
  if (index === 1) return "높음";
  if (index === 2) return "중간";
  return "보조";
}

function sectionTypeLabel(type = "") {
  const labels = {
    "sales-hero": "메인 비주얼",
    "sales-story": "원료/스토리",
    "sales-benefit": "핵심 장점",
    "sales-scene": "사용 장면",
    "sales-trust": "신뢰 정보",
    "sales-info": "제품 정보",
    "sales-cta": "최종 CTA",
  };
  return labels[type] || type || "전체";
}

function analyzeClientFeedback() {
  const text = `${value("clientChoice")} ${value("clientReply")} ${value("managerMemo")}`;
  const lower = text.toLowerCase();
  const items = [];
  const has = (patterns) => patterns.some((pattern) => lower.includes(pattern.toLowerCase()));
  if (has(["A안", "프리미엄", "고급", "브랜드", "선물", "감성"])) {
    items.push({
      type: "tone",
      label: "프리미엄/브랜드 무드 강화",
      sectionTypes: ["sales-hero", "sales-story", "sales-cta"],
      color: "#b88a2a",
      variant: "premium-card",
      copyHint: "프리미엄 이미지와 선물 가치를 더 분명하게 보여주는 방향으로 보강",
    });
  }
  if (has(["B안", "구매", "전환", "비교", "정보", "설명", "명확"])) {
    items.push({
      type: "conversion",
      label: "구매 판단 정보 강화",
      sectionTypes: ["sales-benefit", "sales-trust", "sales-info"],
      color: "#c56a2d",
      variant: "graphic-badge",
      copyHint: "구매 포인트, 비교 정보, 신뢰 요소가 더 빠르게 읽히도록 보강",
    });
  }
  if (has(["원료", "리치", "꿀", "성분", "스토리", "산지"])) {
    items.push({
      type: "ingredient",
      label: "원료/스토리 강조",
      sectionTypes: ["sales-story"],
      imageSlot: "origin",
      variant: "editorial",
      copyHint: "리치 원료와 프리미엄 꿀 조합의 스토리를 더 앞쪽에서 강조",
    });
  }
  if (has(["사진", "이미지", "촬영", "합성", "패키지", "제품컷", "스틱"])) {
    items.push({
      type: "image",
      label: "제품 이미지/촬영 방향 강화",
      sectionTypes: ["sales-hero", "sales-scene", "sales-cta"],
      imageSlot: has(["패키지"]) ? "package" : "lifestyle",
      variant: "photo-focus",
      copyHint: "제공 제품컷을 우선 사용하고 최종 촬영/합성컷으로 교체되는 점을 명확히 표시",
    });
  }
  if (has(["마음에", "좋", "유지", "괜찮", "그대로"])) {
    items.push({
      type: "keep",
      label: "선호 요소 유지",
      sectionTypes: ["sales-hero", "sales-story", "sales-cta"],
      variant: "auto",
      copyHint: "고객이 긍정적으로 본 첫인상과 주요 분위기는 유지하고 필요한 부분만 보정",
    });
  }
  if (has(["제외", "빼", "줄이", "삭제", "과해", "부담"])) {
    items.push({
      type: "remove",
      label: "과한 요소 축소",
      sectionTypes: ["sales-benefit", "sales-info", "sales-trust"],
      variant: "editorial",
      copyHint: "고객이 부담스러워한 문구, 장식, 정보량을 줄이고 핵심만 남기는 방향",
    });
  }
  if (has(["재시안", "다시", "다른 방향", "새로"])) {
    items.push({
      type: "redraft",
      label: "재시안 필요",
      sectionTypes: ["sales-hero", "sales-story", "sales-benefit", "sales-cta"],
      color: "#9b7448",
      variant: "photo-focus",
      copyHint: "현재 A/B 방향과 다른 분위기의 재시안이 필요하므로 히어로, 스토리, CTA 톤을 다시 정리",
    });
  }
  if (has(["간결", "심플", "줄여", "덜어", "복잡"])) {
    items.push({
      type: "simple",
      label: "내용 간결화",
      sectionTypes: ["sales-benefit", "sales-info"],
      variant: "editorial",
      copyHint: "문구를 더 짧게 정리하고 핵심 구매 이유만 남기는 방향",
    });
  }
  if (!items.length && text.trim()) {
    items.push({
      type: "general",
      label: "일반 수정 요청 반영",
      sectionTypes: ["sales-hero", "sales-benefit"],
      variant: "auto",
      copyHint: "고객 회신을 기준으로 카피와 강조 순서를 조정",
    });
  }
  return items;
}

function applyFeedbackToSectionEdits() {
  const selectedKey = value("clientChoice").startsWith("B") ? "B" : "A";
  const sections = editableSectionsForDraft(selectedKey);
  const feedbackItems = analyzeClientFeedback();
  if (!feedbackItems.length) return { selectedKey, feedbackItems, applied: [] };
  const next = [...(sectionEdits[selectedKey] || [])];
  const applied = [];
  sections.forEach((section, index) => {
    const match = feedbackItems.find((item) => item.sectionTypes.includes(section.type));
    if (!match) return;
    const current = next[index] || {};
    const baseTitle = current.title || sectionDefaultTitle(section);
    const baseCopy = (current.copy || sectionDefaultCopy(section)).split("\n\n수정 반영:")[0];
    next[index] = {
      ...current,
      title: baseTitle,
      copy: `${baseCopy}\n\n수정 반영: ${match.copyHint}`,
      color: match.color || current.color || "auto",
      imageSlot: match.imageSlot || current.imageSlot || section.imageSlot || "hero",
      variant: match.variant || current.variant || "auto",
    };
    applied.push({
      section: baseTitle,
      label: match.label,
      detail: match.copyHint,
    });
  });
  sectionEdits[selectedKey] = next;
  activeSectionDraft = selectedKey;
  activeSectionIndex = 0;
  return { selectedKey, feedbackItems, applied };
}

function renderFeedbackAnalysis(result = { selectedKey: value("clientChoice").startsWith("B") ? "B" : "A", feedbackItems: analyzeClientFeedback(), applied: [] }) {
  const target = $("#feedbackAnalysisResult");
  if (!target) return result;
  const items = result.feedbackItems || [];
  const applied = result.applied || [];
  target.classList.toggle("has-analysis", items.length > 0);
  target.innerHTML = `
    <strong>${items.length ? `${result.selectedKey}안 기준 피드백 분석 완료` : "피드백 분석 대기"}</strong>
    <p>${items.length ? "고객 회신에서 감지한 수정 의도와 자동 반영 섹션입니다." : "고객 회신을 입력하면 선택 시안에 반영할 수정 방향을 자동으로 정리합니다."}</p>
    ${items.length ? `
      <ul>
        ${items.map((item, index) => `<li><b>${escapeHtml(priorityLabel(index))} · ${escapeHtml(item.label)}</b><span>${escapeHtml(item.copyHint)}</span><em>${escapeHtml(item.sectionTypes?.map((type) => sectionTypeLabel(type)).join(", ") || "전체 시안")}</em></li>`).join("")}
      </ul>
      <em>${applied.length ? `${applied.length}개 섹션 편집값에 자동 반영됨` : "자동 반영할 섹션을 찾지 못했습니다. 수동 편집이 필요합니다."}</em>
    ` : ""}
  `;
  return result;
}

async function generateRevision() {
  applyFeedbackToDraftControls();
  const feedbackResult = applyFeedbackToSectionEdits();
  renderFeedbackAnalysis(feedbackResult);
  renderDraftPreviewsOnly();
  renderSectionEditor();
  const fallback = generateRevisionText();
  $("#revisionResult").textContent = fallback;
  $("#revisionMailResult").textContent = generateRevisionMailText();
  try {
    const aiText = await invokeAiRole("revision", "고객 피드백 반영 상세페이지 수정 시안 생성", {
      product: product(),
      clientChoice: value("clientChoice"),
      clientReply: value("clientReply"),
      managerMemo: value("managerMemo"),
      layoutA: $("#templateA").textContent.trim(),
      layoutB: $("#templateB").textContent.trim(),
      instruction: "고객 피드백을 바탕으로 PSD 제작 전 고객에게 다시 확인받을 수정 시안 요약과 수정 방향을 작성한다.",
    }, fallback);
    if (aiText) $("#revisionResult").textContent = aiText;
  } catch {
    $("#revisionResult").textContent = fallback;
  }
  updateWorkflowState();
}

function applyFeedbackToDraftControls() {
  const text = `${value("clientReply")} ${value("managerMemo")}`;
  if (!text.trim()) return;
  if ($("#draftTone")) {
    if (text.includes("고급") || text.includes("프리미엄") || text.includes("선물")) $("#draftTone").value = "premium";
    if (text.includes("따뜻") || text.includes("오렌지") || text.includes("감성")) $("#draftTone").value = "warm";
    if (text.includes("깔끔") || text.includes("깨끗") || text.includes("화이트")) $("#draftTone").value = "clean";
    if (text.includes("신선") || text.includes("그린") || text.includes("원료")) $("#draftTone").value = "fresh";
    if (text.includes("다크") || text.includes("블랙") || text.includes("무게감")) $("#draftTone").value = "dark";
  }
  if ($("#draftDensity")) {
    if (text.includes("더 강조") || text.includes("풍부") || text.includes("많이")) $("#draftDensity").value = "rich";
    if (text.includes("간결") || text.includes("심플") || text.includes("덜어")) $("#draftDensity").value = "simple";
  }
  if ($("#draftImagePosition")) {
    if (text.includes("제품") || text.includes("패키지") || text.includes("이미지 크게")) $("#draftImagePosition").value = "full";
    if (text.includes("상단") || text.includes("첫 화면")) $("#draftImagePosition").value = "top";
  }
  generateDraftsRules();
}

function psdDesignBrief(key, template) {
  const concept = designConcept(`${key}안`, template);
  const workflow = latestDesignWorkflow();
  const strategy = key === "B" ? workflow.abStrategy.B : workflow.abStrategy.A;
  const imageMap = detailImageSet() || {};
  const media = heroMediaItems(imageMap, "hero").map((item, index) => (
    `${index + 1}. ${item.title}: ${item.copy}${item.src ? ` / source: ${item.src}` : " / source: temporary image slot"}`
  )).join("\n");
  const imageAiPlan = workflow.imagePlan.map((item, index) => (
    `${index + 1}. ${item.role} / ${item.usedFor} / ${item.aiTarget}`
  )).join("\n");
  const imageStatus = designerImageStatusSummary();
  const sectionImageBrief = sectionImageProductionBrief(key);
  const visualPrompts = (workflow.visualPrompts || []).slice(0, 8).map((item, index) => (
    `${index + 1}. [${item.draft}안] ${item.role}
   - prompt: ${item.prompt}
   - negative: ${item.negativePrompt}`
  )).join("\n");
  return `[Selected draft design brief]
Concept: ${concept.title}
Mood keywords: ${concept.keywords}
AI strategy: ${strategy.name} / ${strategy.focus}
Main design rule: Follow the AI draft first, then refine spacing, typography, image masking, cards, icons, CTA, and infographic blocks.

Visible design blocks to recreate:
1. Hero section with large product visual, headline hierarchy, chips, and floating point card
2. Ingredient story section with product/origin image and three ingredient cards
3. Benefit cards with numbered badges and product image strip
4. ${key === "B" ? "Conversion comparison table and buying checklist" : "Premium story flow and mood band"}
5. Lifestyle scene section with product image and usage/situation list
6. Trust check cards and product information table
7. Final dark CTA section with delivery-ready closing badges

Image role guide:
${media}

AI image/composite slot guide:
${imageAiPlan}

Image production status:
${imageStatus}

Section-by-section image production brief:
${sectionImageBrief}

Image AI prompt guide:
${visualPrompts || "Visual prompts are not generated yet. Use the image role guide as the fallback."}

PSD production focus:
1. Keep the long vertical detail-page flow.
2. Recreate section backgrounds, cards, badges, comparison table, CTA, and trust blocks.
3. Replace temporary images with edited product photos or composed lifestyle images.
4. Keep text editable and group layers by section.
5. Do not flatten text or merge the major section groups.
6. Keep A draft premium/brand-oriented and B draft conversion/sales-oriented.
7. Product photos should stay fully visible when possible; use contain-style masking for stick/package shots and top-crop only for long reference detail images.`;
}

function productionQaGuide(route = value("productionRoute")) {
  if (route === "figma") {
    return `[Figma 작업/검수 기준]
1. 상세페이지 전체는 하나의 긴 세로형 Figma 프레임으로 정리합니다.
2. 섹션은 Hero, Story, Ad_Poster, Benefit, Lifestyle, Photo_Plan, Trust, Info, Purchase_Stack, CTA처럼 실제 시안 순서에 맞춰 이름을 붙입니다.
3. 텍스트는 모두 수정 가능한 Text Layer로 유지합니다.
4. 제품 이미지 프레임은 교체 가능한 이미지 프레임으로 유지합니다.
5. 광고형 고밀도 포스터 구간은 제품컷, 레퍼런스 리듬, 구매 이유 카드가 한 화면에 보이도록 유지합니다.
6. 촬영/합성 방향 구간은 최종 교체 이미지 슬롯이 명확해야 합니다.
7. 고객 컨펌 전 PNG/JPG 미리보기 Export를 준비합니다.
8. 고객 코멘트가 들어오면 해당 섹션 프레임 단위로 수정합니다.
9. 최종 납품 시 Figma 링크 또는 Export 파일 범위를 명확히 표시합니다.`;
  }
  return `[PSD 작업/검수 기준]
1. PSD는 실제 선택 시안 순서대로 섹션별 그룹을 정리합니다.
2. 텍스트 레이어는 반드시 수정 가능하게 유지합니다.
3. 제품컷은 왜곡하지 않고, 배경 합성/마스킹만 조정합니다.
4. ad_poster 그룹은 제품컷, 레퍼런스 썸네일, 구매 이유 카드, 배경 그래픽을 분리합니다.
5. photo_plan 그룹은 임시 이미지와 최종 촬영/합성 교체 기준을 확인할 수 있어야 합니다.
6. purchase_stack 그룹은 최종 구매 이유 카드, 제품 스택, CTA 연결을 유지합니다.
7. AI 시안의 섹션 순서, 색상 톤, 카드/배지/CTA 구조를 최대한 동일하게 구현합니다.
8. JPG/PNG 전체 미리보기와 PSD 원본을 함께 확인합니다.
9. 분할페이지 요청 시 섹션 경계가 자연스럽게 잘리는지 확인합니다.
10. PSD 원본 제공은 추가금 대상이므로 납품 안내에서 별도 표시합니다.`;
}

function deliveryScopeGuide(route = value("productionRoute")) {
  if (route === "figma") {
    return `[납품 범위]
- 기본: 최종 상세페이지 PNG/JPG
- 요청 시: 분할 이미지
- 협업 파일: Figma 링크 또는 Export 파일
- 원본 범위: 계약 조건에 따라 Figma 원본/편집 권한 제공 여부 확인`;
  }
  return `[납품 범위]
- 기본: 최종 상세페이지 PNG/JPG
- 요청 시: 분할 이미지
- 추가금 대상: PSD 원본
- 내부 보관: PSD 원본, 최종 JPG/PNG, 분할 파일, 사용 이미지`;
}

function productionConfirmSummary(selectedKey = value("clientChoice").startsWith("B") ? "B" : "A", template = "") {
  const p = product();
  const choice = value("clientChoice") || `${selectedKey}안 중심`;
  const route = productionRouteConfig(p.productionRoute, p.customerType);
  const revision = $("#revisionResult")?.textContent?.trim() || "";
  const revisionReady = revision && !revision.includes("여기에 표시됩니다");
  const applied = sectionEditSummary(selectedKey);
  return `Project: ${p.productName || "제품명 미입력"}
Selected draft: ${selectedKey}안 ${template || (selectedKey === "B" ? $("#templateB")?.textContent.trim() : $("#templateA")?.textContent.trim())}
Customer choice: ${choice}
Production route: ${route.name}
Customer confirmation source: ${revisionReady ? "수정 시안 컨펌 요청 기준 사용" : "고객 최종 컨펌 내용 확인 필요"}
Revision basis:
${revisionReady ? revision.slice(0, 900) : "수정 시안 컨펌 내용이 아직 충분하지 않습니다. 고객 최종 승인 후 제작 지시를 확정하세요."}

Final section edit basis:
${applied}`;
}

function productionHandoffPreflight(selectedKey = value("clientChoice").startsWith("B") ? "B" : "A") {
  const p = product();
  const route = productionRouteConfig(p.productionRoute, p.customerType);
  const revision = $("#revisionResult")?.textContent?.trim() || "";
  const hasRevision = revision && !revision.includes("여기에 표시됩니다");
  const hasDraft = selectedKey === "B" ? Boolean($("#draftB")?.innerText.trim()) : Boolean($("#draftA")?.innerText.trim());
  const hasImages = Boolean((latestDesignWorkflow().imageSlotStatus || []).length);
  const hasEdits = Boolean((sectionEdits[selectedKey] || []).length);
  const checks = [
    { label: "선택 시안", ok: hasDraft, detail: `${selectedKey}안 기준` },
    { label: "고객 컨펌/수정 방향", ok: hasRevision, detail: hasRevision ? "수정 시안 요약 있음" : "고객 최종 컨펌 또는 수정 방향 확인 필요" },
    { label: "섹션 편집값", ok: hasEdits, detail: hasEdits ? "섹션별 편집/자동 폴리싱값 있음" : "섹션 편집값 없음. 자동 시안 기준" },
    { label: "이미지 제작 기준", ok: hasImages, detail: hasImages ? "이미지 슬롯 상태 정리됨" : "이미지 슬롯 상태 확인 필요" },
    { label: "제작 라인", ok: Boolean(route.name), detail: `${route.customerLabel} / ${route.name}` },
  ];
  return checks.map((item) => `${item.ok ? "OK" : "CHECK"} - ${item.label}: ${item.detail}`).join("\n");
}

function productionHandoffPreflightItems(selectedKey = value("clientChoice").startsWith("B") ? "B" : "A") {
  const p = product();
  const route = productionRouteConfig(p.productionRoute, p.customerType);
  const revision = $("#revisionResult")?.textContent?.trim() || "";
  const hasRevision = revision && !revision.includes("여기에 표시됩니다");
  const draftTarget = selectedKey === "B" ? $("#draftB") : $("#draftA");
  const hasDraft = Boolean(draftTarget?.innerText.trim());
  const hasImages = Boolean((latestDesignWorkflow().imageSlotStatus || []).length);
  const editedSections = (sectionEdits[selectedKey] || []).filter((item) => item?.manualEdited || item?.autoPolished).length;
  return [
    { label: "선택 시안", ok: hasDraft, detail: hasDraft ? `${selectedKey}안 시안 생성됨` : "A/B 시안 생성 필요" },
    { label: "고객 컨펌", ok: hasRevision, detail: hasRevision ? "수정 방향/컨펌 메일 기준 있음" : "고객 선택 또는 수정 컨펌 확인 필요" },
    { label: "섹션 수정 기준", ok: editedSections > 0, detail: editedSections > 0 ? `${editedSections}개 섹션 편집 기준 있음` : "자동 시안 기준으로 전달됨" },
    { label: "이미지 제작 기준", ok: hasImages, detail: hasImages ? "임시/최종 이미지 슬롯 정리됨" : "제품 이미지 또는 촬영/합성 기준 확인 필요" },
    { label: "제작 라인", ok: Boolean(route.name), detail: `${route.customerLabel} / ${route.name}` },
  ];
}

function renderProductionHandoffPreflight() {
  const target = $("#handoffPreflightResult");
  if (!target) return;
  const selectedKey = value("clientChoice").startsWith("B") ? "B" : "A";
  const items = productionHandoffPreflightItems(selectedKey);
  const passedCount = items.filter((item) => item.ok).length;
  target.className = `preflight-panel ${passedCount >= 4 ? "passed" : "needs-check"}`;
  target.innerHTML = `
    <strong>제작 전달 전 체크</strong>
    <p>${selectedKey}안 기준 · ${passedCount}/${items.length}개 항목 준비됨</p>
    <ul>
      ${items.map((item) => `
        <li class="${item.ok ? "ok" : "warn"}">
          <b>${item.ok ? "OK" : "확인"}</b>
          <span>${item.label}</span>
          <em>${item.detail}</em>
        </li>
      `).join("")}
    </ul>
  `;
}

function figmaCollaborationBriefText() {
  const p = product();
  const workflow = latestDesignWorkflow();
  const choice = value("clientChoice");
  const selectedDraft = choice.startsWith("B") ? "B안" : "A안";
  const template = selectedDraft === "B안" ? $("#templateB").textContent.trim() : $("#templateA").textContent.trim();
  const config = productionRouteConfig("figma", p.customerType);
  const imagePlan = (workflow.imagePlan || []).slice(0, 8).map((item, index) => (
    `${index + 1}. ${item.role} / ${item.usedFor || "상세페이지 이미지 슬롯"} / ${item.aiTarget || "Figma 이미지 영역"}`
  )).join("\n");
  const imageStatus = designerImageStatusSummary();
  const selectedKey = selectedDraft === "B안" ? "B" : "A";
  const sectionImageBrief = sectionImageProductionBrief(selectedKey);
  const confirmSummary = productionConfirmSummary(selectedKey, template);
  const preflight = productionHandoffPreflight(selectedKey);
  const visualPrompts = (workflow.visualPrompts || []).slice(0, 8).map((item, index) => (
    `${index + 1}. [${item.draft}안] ${item.role}
   - 생성 프롬프트: ${item.prompt}
   - 금지 프롬프트: ${item.negativePrompt}`
  )).join("\n");
  return `[Figma 협업 패키지]
Project: ${p.productName}
Customer type: ${config.customerLabel}
Production route: ${config.name}
Selected draft: ${selectedDraft} ${template}

[목표]
${config.goal}

[최종 컨펌 기준]
${confirmSummary}

[제작 전달 전 체크]
${preflight}

[Figma 초안 구성]
1. A/B 중 고객이 선택한 시안을 기준으로 긴 세로형 상세페이지 프레임을 구성합니다.
2. 섹션은 메인 비주얼, 원료/스토리, 핵심 장점, 사용 장면, 신뢰 정보, 제품 정보, CTA 순서로 정리합니다.
3. 텍스트, 이미지, 색상, 섹션 순서는 Figma에서 빠르게 수정할 수 있도록 분리합니다.
4. 임시 이미지는 교체 가능한 이미지 프레임으로 유지합니다.

[디자이너 수정 기준]
1. AI 시안의 레이아웃과 정보 위계를 유지합니다.
2. 고객 피드백은 Figma 코멘트 또는 담당자 메모 기준으로 반영합니다.
3. 제품 이미지는 왜곡하지 않고, 필요 시 배경 합성/마스킹만 조정합니다.
4. 고객 컨펌 전에는 PNG/JPG 미리보기 Export를 함께 준비합니다.

${productionQaGuide("figma")}

${deliveryScopeGuide("figma")}

[이미지/합성 슬롯]
${imagePlan || "이미지 슬롯은 시안 생성 후 자동 정리됩니다."}

[이미지 제작 상태]
${imageStatus || "이미지 상태는 시안 생성 후 자동 정리됩니다."}

[섹션별 이미지 제작 지시]
${sectionImageBrief}

[이미지 AI 생성 프롬프트]
${visualPrompts || "이미지 AI 프롬프트는 시안 생성 후 자동 정리됩니다."}

[고객 컨펌 안내]
Figma 초안 링크를 전달하고, 고객은 수정이 필요한 섹션과 문구를 회신합니다.
최종 확정 후 Figma 원본 또는 Export 파일 기준으로 납품합니다.`;
}

function generateHandoffText() {
  const p = product();
  if (p.productionRoute === "figma") return figmaCollaborationBriefText();
  const dataset = categoryDataset(p.category);
  const choice = value("clientChoice");
  const selectedDraft = choice.startsWith("B") ? "B안" : "A안";
  const selectedKey = selectedDraft === "B안" ? "B" : "A";
  const template = selectedDraft === "B안" ? $("#templateB").textContent.trim() : $("#templateA").textContent.trim();
  const concepts = photoConcepts().map((item, index) => `${index + 1}. ${item}`).join("\n");
  const sections = sectionLayoutItems(template).map((item, index) => `${String(index + 1).padStart(2, "0")}. ${item}`).join("\n");
  const editSummary = sectionEditSummary(selectedKey);
  const designBrief = psdDesignBrief(selectedKey, template);
  const confirmSummary = productionConfirmSummary(selectedKey, template);
  const preflight = productionHandoffPreflight(selectedKey);
  const layerGuide = psdLayerGroupGuide(selectedKey);

  return `[고객 피드백 요약]
선택 방향: ${choice}
회신 내용: ${value("clientReply") || "아직 고객 회신 내용이 입력되지 않았습니다."}
담당자 메모: ${value("managerMemo") || "없음"}

[고객 컨펌된 수정 방향]
${$("#revisionResult")?.textContent || "수정 시안 컨펌 내용이 아직 없습니다."}

[최종 컨펌 기준]
${confirmSummary}

[제작 전달 전 체크]
${preflight}

[바이버 메시지 초안]
[PSD 작업 요청]

Project: ${p.productName}
Work type: New PSD design
Selected draft: ${selectedDraft} ${template}

${designBrief}

Please recreate the attached AI draft as closely as possible in PSD.
Keep the layout, colors, section order, and text structure.

Important:
1. Make all text editable
2. Organize PSD layers by section
3. Use provided product images
4. Avoid cheap shopping mall banner style
5. Avoid excessive decoration
6. Do not use medical or exaggerated health expressions
7. Keep ad poster sections dense and commercial, not like a wireframe
8. Keep photo/composite direction sections replaceable for final images
9. Keep purchase stack sections strong before the final CTA

PSD layer group rule:
${layerGuide}

Detail page section order:
${sections}

Section edit notes from internal tool:
${editSummary}

[Image direction]
Images in the AI draft are temporary placeholders.
Please replace them with provided product photos, edited cutout images, or composed lifestyle images.

Recommended photo/composite concepts:
${concepts}

[Category design notes]
${dataset.psdMemo.map((item, index) => `${index + 1}. ${item}`).join("\n")}

${productionQaGuide("psd")}

${deliveryScopeGuide("psd")}

[Caution]
${dataset.caution.map((item, index) => `${index + 1}. ${item}`).join("\n")}

Deliver files:
1. PSD original file
2. Full page JPG preview
3. Full page PNG preview
4. Split JPG/PNG files only if requested

File naming:
${p.productName}_detail_full.psd
${p.productName}_detail_full.jpg
${p.productName}_detail_full.png

[첨부파일 체크리스트]
□ 선택 시안 이미지/PDF
□ 제품 이미지
□ 로고/스펙 자료
□ 섹션별 카피
□ 디자인 가이드
□ 참고 이미지

[내부 검수 기준]
□ AI 시안과 섹션 순서가 맞는지
□ 텍스트가 PSD에서 수정 가능한지
□ 이미지가 흐리거나 깨지지 않는지
□ 과장 광고/의약품 오인 표현이 없는지
□ 최종 PNG/JPG로 납품 가능한 해상도인지`;
}

async function generateHandoff() {
  const fallback = generateHandoffText();
  const route = productionRouteConfig();
  $("#handoffResult").textContent = fallback;
  try {
    const aiText = await invokeAiRole("psdHandoff", route.name.includes("Figma") ? "Figma 협업 전달 패키지 생성" : "미얀마 디자이너 바이버 PSD 전달 패키지 생성", {
      product: product(),
      productionRoute: route,
      clientChoice: value("clientChoice"),
      clientReply: value("clientReply"),
      managerMemo: value("managerMemo"),
      selectedLayoutA: $("#templateA").textContent.trim(),
      selectedLayoutB: $("#templateB").textContent.trim(),
      instruction: route.name.includes("Figma")
        ? "Figma에서 수정할 수 있는 협업 패키지, 고객 컨펌 요청 기준, Export 체크리스트를 만든다."
        : "바이버로 보낼 짧은 영어 작업 요청, 한국어 내부 요약, 첨부 체크리스트를 만든다.",
    }, fallback);
    if (aiText) $("#handoffResult").textContent = aiText;
  } catch {
    $("#handoffResult").textContent = fallback;
  }
  updateWorkflowState();
}

function generateFinalMailText() {
  const p = product();
  const route = productionRouteConfig(p.productionRoute, p.customerType);
  return `제목: [${p.productName}] 상세페이지 최종 납품 확인드립니다

안녕하세요, 고객님.
컨펌해주신 방향을 기준으로 ${p.productName} 상세페이지 최종 파일을 정리하여 전달드립니다.

첨부 파일을 확인하신 후 아래 항목을 확인 부탁드립니다.

1. 최종 상세페이지 PNG/JPG
2. 요청 시 분할페이지 파일
3. 제품명, 구성, 문구 등 최종 정보
4. ${p.productionRoute === "figma" ? "Figma 원본 또는 Export 파일 범위" : "PSD 원본 요청 여부"}

내부 검수 기준으로 디자인 시안 반영 여부, 문구 오탈자, 이미지 품질, 최종 Export 상태를 확인한 뒤 전달드립니다.

기본 납품은 최종 PNG/JPG 기준이며, 분할페이지는 요청 범위에 따라 함께 제공됩니다.
${p.productionRoute === "figma"
  ? "Figma 원본 공유 및 Export 범위는 선택하신 제작 라인 기준에 따라 안내드립니다."
  : "상세페이지 원본 PSD 파일은 기본 납품 범위에 포함되지 않으며, 요청 시 별도 추가금 안내 후 제공 가능합니다."}

[제작 라인]
${route.customerLabel} / ${route.name}

${deliveryScopeGuide(p.productionRoute)}

감사합니다.`;
}

async function generateFinalMail() {
  const fallback = generateFinalMailText();
  $("#finalMail").textContent = fallback;
  try {
    const aiText = await invokeAiRole("finalMail", "최종 납품 메일 생성", {
      product: product(),
      productionRoute: productionRouteConfig(),
      instruction: "컨펌 완료 후 최종 납품 메일을 정중하고 간결하게 작성한다. 선택된 제작 라인이 Figma이면 Figma/Export 납품 기준을, PSD이면 PNG/JPG 납품과 PSD 원본 추가금 안내를 포함한다.",
    }, fallback);
    if (aiText) $("#finalMail").textContent = aiText;
  } catch {
    $("#finalMail").textContent = fallback;
  }
  updateWorkflowState();
}

async function loadSample() {
  $("#clientName").value = "호아비";
  $("#productName").value = "호아비 리치꿀스틱 30포";
  $("#category").value = "건강식품 / 꿀스틱 / 스틱형 식품";
  $("#channel").value = "자사몰, 스마트스토어, 오픈마켓";
  $("#oneLine").value = "베트남 리치와 프리미엄 꿀을 담은 스틱형 건강식품";
  $("#consultSummary").value = "고객은 제품의 프리미엄 이미지와 리치 원료 스토리를 강조하고 싶어 함. 건강식품 특유의 신뢰감과 선물용 이미지를 함께 표현 희망.";
  $("#clientRequests").value = "고급스러운 디자인, 선물용 느낌 강조, 원료 스토리 강조, 신뢰성 있는 구성";
  $("#emphasis").value = "베트남 리치 원료와 프리미엄 꿀의 조합, 30포 구성, 휴대가 간편한 스틱형";
  $("#banWords").value = "질병 치료, 면역력 향상 보장, 의약품 오인 표현, 과장 광고 문구";
  $("#mustInclude").value = "리치꿀스틱, 30포 구성, 휴대가 간편한 스틱형, 프리미엄 원료";
  $("#references").value = "현재 제작된 호아비 리치꿀스틱 상세페이지, 동일 카테고리 꿀스틱/건강스틱 제품";
  $("#contentRatio").value = "브랜드 스토리 25%\n원료 소개 25%\n제품 특징 20%\n신뢰 요소 15%\n구매 유도 15%";
  $("#optionMemo").value = "리치 원산지 스토리를 강조. 선물용 건강식품 이미지 강조. 건강식품 특유의 신뢰감 표현. 과도한 효능 표현 금지.";

  setChecked("direction", ["프리미엄 브랜드형", "감성 스토리형"]);
  setChecked("target", ["건강 관심층", "부모님 선물 구매층", "직장인"]);
  setChecked("goal", ["구매 전환", "브랜드 신뢰", "제품 이해", "선물 수요"]);
  setChecked("highlight", ["원료", "패키지", "선물성", "브랜드 스토리", "휴대성", "고급스러운 이미지"]);
  setChecked("avoid", ["과장 광고", "저가형 느낌", "의약품 오인", "복잡한 디자인", "홈쇼핑 스타일"]);
  setChecked("usp", ["리치 원료", "프리미엄 꿀", "개별 스틱 포장", "선물용 패키지", "휴대 편의성"]);
  await generateAll();
}

async function generateAll() {
  await generateDrafts();
}

async function runHoabiFlowTest() {
  addHoabiCustomerTest(true);
  const latest = readCustomerProjects()[0];
  if (latest?.id) {
    localStorage.setItem(CUSTOMER_PROJECT_KEY, JSON.stringify(latest));
    importCustomerProjectById(latest.id);
  }

  if ($("#draftTone")) $("#draftTone").value = "warm";
  if ($("#draftImagePosition")) $("#draftImagePosition").value = "full";
  if ($("#draftDensity")) $("#draftDensity").value = "rich";
  if ($("#draftMainCopy")) $("#draftMainCopy").value = "리치와 꿀이 전하는 하루 한 포의 프리미엄 루틴";

  await generateDrafts();

  if ($("#clientChoice")) $("#clientChoice").value = "A안 선택";
  if ($("#clientReply")) {
    $("#clientReply").value = "A안의 프리미엄 분위기가 좋습니다. 다만 리치 원료 스토리와 선물용 패키지 느낌을 더 강조해주세요. 제품 이미지는 현재 제공한 패키지컷과 스틱 단독컷을 우선 사용하고, 최종에는 고급스러운 촬영/합성컷으로 교체되면 좋겠습니다.";
  }
  if ($("#managerMemo")) {
    $("#managerMemo").value = "담당자 메모: 호아비 제공 제품 사진 2장을 우선 반영. 과장 효능 표현 금지. 핑크/오렌지 계열은 유지하되 저가형 이벤트 느낌은 피할 것.";
  }

  await generateRevision();
  await generateHandoff();
  showPanel("psd");
  updateAiStatus("호아비 1~7 테스트 결과를 생성했습니다.");
}

function applyLayoutToChoice(layoutName) {
  manualTemplateChanged = true;
  const choice = $(".choice[data-choice].active")?.dataset.choice || "A";
  const target = choice === "B" ? $("#templateB") : $("#templateA");
  target.textContent = layoutName;
  $$(".template-card").forEach((card) => card.classList.remove("selected"));
  const selectedCard = $(`.template-card[data-layout="${layoutName}"]`);
  if (selectedCard) selectedCard.classList.add("selected");
  renderSectionLayouts();
  generateDrafts();
}

function templateThumbMarkup(type) {
  if (type === "story") {
    return `<span></span><span></span><span></span>`;
  }
  if (type === "cards") {
    return `<span></span><span></span><span></span><span></span>`;
  }
  if (type === "conversion") {
    return `<span class="top"></span><span class="bar"></span><span class="bar"></span><span class="cta"></span>`;
  }
  return `<span class="hero-text"></span><span class="hero-product"></span><span class="wide-line"></span>`;
}

function templateRecommendation(item) {
  const p = product();
  const joined = [
    ...p.direction,
    ...p.goal,
    ...p.highlight,
    ...p.usp,
    p.emphasis,
    p.clientRequests,
  ].join(" ");
  let score = 55;
  const reasons = [];

  if (item.purpose === "선물" && joined.includes("선물")) {
    score += 22;
    reasons.push("선물성 강조");
  }
  if (item.purpose === "스토리" && (joined.includes("원료") || joined.includes("스토리") || joined.includes("감성"))) {
    score += 20;
    reasons.push("원료/브랜드 스토리 적합");
  }
  if (item.purpose === "브랜드" && (joined.includes("프리미엄") || joined.includes("고급") || joined.includes("브랜드"))) {
    score += 18;
    reasons.push("프리미엄 첫인상 적합");
  }
  if (item.purpose === "정보" && (joined.includes("제품 이해") || joined.includes("신뢰") || joined.includes("구성"))) {
    score += 16;
    reasons.push("정보 정리 적합");
  }
  if (item.purpose === "전환" && (joined.includes("구매") || joined.includes("전환") || joined.includes("문제"))) {
    score += 16;
    reasons.push("구매 설득 적합");
  }
  if (item.difficulty === "빠른 제작") {
    score += 4;
    reasons.push("빠른 제작 가능");
  }

  return {
    score: Math.min(score, 98),
    reason: reasons.slice(0, 2).join(" · ") || "기본 상세페이지 구성에 적합",
  };
}

function renderTemplateLibrary() {
  const library = $("#templateLibrary");
  if (!library) return;
  const category = $("#templateCategoryFilter")?.value || "전체";
  const purpose = $("#templatePurposeFilter")?.value || "전체";
  const difficulty = $("#templateDifficultyFilter")?.value || "전체";
  const filtered = TEMPLATE_LIBRARY.filter((item) => {
    const categoryMatch = category === "전체" || item.category === category;
    const purposeMatch = purpose === "전체" || item.purpose === purpose;
    const difficultyMatch = difficulty === "전체" || item.difficulty === difficulty;
    return categoryMatch && purposeMatch && difficultyMatch;
  });

  if (!filtered.length) {
    library.innerHTML = `<div class="empty-template">조건에 맞는 템플릿이 없습니다.</div>`;
    return;
  }

  library.innerHTML = filtered.map((item) => {
    const recommend = templateRecommendation(item);
    const rules = templateDesignRules(item.name);
    return `
    <article class="template-card ${item.toneClass}" data-layout="${escapeHtml(item.name)}">
      <div>
        <div class="template-meta">
          <span>${escapeHtml(item.category)}</span>
          <span>${escapeHtml(item.purpose)}</span>
          <span>${escapeHtml(item.difficulty)}</span>
        </div>
        <div class="template-score">
          <b>추천 ${recommend.score}%</b>
          <span>${escapeHtml(recommend.reason)}</span>
        </div>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description)}</p>
        <p class="template-skeleton"><b>틀</b> ${escapeHtml(rules.layoutSignature || "섹션 구조 기반 생성")}</p>
        <small>필요 이미지 ${item.imageCount}컷 · ${escapeHtml(item.mood)}</small>
      </div>
      <div class="layout-thumb ${escapeHtml(item.thumb)}" aria-hidden="true">
        ${templateThumbMarkup(item.thumb)}
      </div>
    </article>
  `;
  }).join("");

  $$(".template-card").forEach((card) => {
    card.addEventListener("click", () => applyLayoutToChoice(card.dataset.layout));
  });
}

$$(".step").forEach((button) => {
  button.addEventListener("click", () => {
    showPanel(button.dataset.target);
  });
});

function showPanel(target) {
  $$(".step").forEach((item) => {
    item.classList.toggle("active", item.dataset.target === target);
  });
  $$(".panel").forEach((item) => {
    item.classList.toggle("active", item.id === target);
  });
  updateWorkflowState();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$(".choice").forEach((button) => {
  button.addEventListener("click", () => {
    const group = button.closest(".choice-toggle");
    (group ? Array.from(group.querySelectorAll(".choice")) : $$(".choice")).forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    if (button.dataset.editDraft) {
      collectSectionEdits();
      activeSectionDraft = button.dataset.editDraft;
      activeSectionIndex = 0;
      renderSectionEditor();
      scrollActiveDraftSection();
    }
  });
});

renderTemplateLibrary();
renderSectionEditor();
["#templateCategoryFilter", "#templatePurposeFilter", "#templateDifficultyFilter"].forEach((selector) => {
  $(selector)?.addEventListener("change", renderTemplateLibrary);
});

async function runBeforePanel(action) {
  if (action === "plan") await prepareInternalAiPlanning();
  if (action === "drafts") await generateDrafts();
  if (action === "clientMail") await generateClientMail();
  if (action === "revision") await generateRevision();
  if (action === "handoff") await generateHandoff();
  if (action === "finalMail") await generateFinalMail();
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("#nextActionButton");
  if (!button) return;
  event.preventDefault();
  const action = button.dataset.nextAction;
  const target = button.dataset.nextTarget || "projects";
  if (action) await runBeforePanel(action);
  showPanel(target);
});

$$("[data-go-panel]").forEach((button) => {
  button.addEventListener("click", async () => {
    if (button.dataset.runBefore) {
      await runBeforePanel(button.dataset.runBefore);
    }
    showPanel(button.dataset.goPanel);
  });
});

const planningOptionsMount = $("#planningOptionsMount");
const optionsPanel = $("#options");
if (planningOptionsMount && optionsPanel) {
  planningOptionsMount.append(...Array.from(optionsPanel.children));
  optionsPanel.remove();
}

$("#loadSample")?.addEventListener("click", () => loadSample());
$("#importCustomerProject")?.addEventListener("click", () => openCustomerImportModal());
$("#generateAll")?.addEventListener("click", () => generateAll());
$("#generatePlan")?.addEventListener("click", () => generatePlan());
$("#generateDrafts")?.addEventListener("click", () => generateDrafts());
$("#toggleGuideMode")?.addEventListener("click", () => toggleGuideMode());
$("#generateClientMail")?.addEventListener("click", () => generateClientMail());
$("#runClientPreflight")?.addEventListener("click", () => renderClientPreflight());
$("#copyClientMail")?.addEventListener("click", () => copyResultText("#clientMailResult", "A/B 시안 전달 메일을 복사했습니다."));
$("#openClientMail")?.addEventListener("click", () => openMailDraft("#clientMailResult", `[${value("productName") || "상세페이지"}] 상세페이지 1차 방향성 시안 전달드립니다`));
$("#applyDraftEdits")?.addEventListener("click", (event) => {
  event.preventDefault();
  generateDraftsRules();
  updateAiStatus("시안 수정값을 적용했습니다.");
});
$("#applySectionEdits")?.addEventListener("click", (event) => {
  event.preventDefault();
  applySectionEdits();
  updateAiStatus("섹션별 수정값을 시안에 반영했습니다.");
});
$("#openPlanModal")?.addEventListener("click", () => {
  renderSectionLayouts();
  $("#planModal").hidden = false;
});
$("#openColorModal")?.addEventListener("click", () => {
  $("#colorModal").hidden = false;
});
$$("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.dataset.closeModal;
    if ($(id.startsWith("#") ? id : `#${id}`)) $(id.startsWith("#") ? id : `#${id}`).hidden = true;
  });
});
$$("[data-close-customer-import]").forEach((button) => {
  button.addEventListener("click", closeCustomerImportModal);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCustomerImportModal();
});
$$("[data-tone-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    if ($("#draftTone")) $("#draftTone").value = button.dataset.tonePreset;
    $("#colorModal").hidden = true;
    generateDraftsRules();
    updateAiStatus("전체 색상 톤을 변경했습니다.");
  });
});
$("#generateRevision")?.addEventListener("click", () => generateRevision());
$("#copyRevisionMail")?.addEventListener("click", () => copyResultText("#revisionMailResult", "수정 시안 컨펌 메일을 복사했습니다."));
$("#openRevisionMail")?.addEventListener("click", () => openMailDraft("#revisionMailResult", `[${value("productName") || "상세페이지"}] 상세페이지 수정 방향 확인 요청드립니다`));
$("#generateHandoff")?.addEventListener("click", () => generateHandoff());
$("#generateFigmaBrief")?.addEventListener("click", () => {
  if ($("#productionRoute")) $("#productionRoute").value = "figma";
  updateRouteSummary();
  $("#handoffResult").textContent = figmaCollaborationBriefText();
  updateWorkflowState();
});
$("#openFigmaPlaceholder")?.addEventListener("click", () => {
  alert("현재는 Figma API 연결 전 단계입니다. 다음 개발 단계에서 이 버튼에 Figma 파일 생성/열기 기능을 연결합니다.");
});
$("#confirmRequestFromRoute")?.addEventListener("click", () => {
  if ($("#revisionMailResult")) $("#revisionMailResult").textContent = generateRevisionMailText();
  showPanel("revision");
});
$("#finalizeRoute")?.addEventListener("click", () => {
  generateFinalMail();
  showPanel("delivery");
});
$("#generateFinalMail")?.addEventListener("click", () => generateFinalMail());
document.addEventListener("click", (event) => {
  const reviewButton = event.target.closest?.("[data-render-review]");
  if (reviewButton) {
    recordRenderedPreviewReview(reviewButton.dataset.renderReview || "png");
    updateAiStatus("실제 시안 화면 검수 결과를 저장했습니다.");
    return;
  }
  if (event.target.closest?.("[data-render-review-clear]")) {
    clearRenderedPreviewReview();
    updateAiStatus("시안 화면 검수 결과를 초기화했습니다.");
  }
});
$("#refreshLeads")?.addEventListener("click", renderLeads);
$("#refreshProjects")?.addEventListener("click", renderProjects);
$("#refreshCustomerProjects")?.addEventListener("click", renderCustomerProjects);
$("#addHoabiCustomerTest")?.addEventListener("click", addHoabiCustomerTest);
$("#runHoabiFlowTest")?.addEventListener("click", () => runHoabiFlowTest());
$("#saveAiSettings")?.addEventListener("click", saveAiSettings);
$("#aiMode")?.addEventListener("change", updateAiStatus);
$$("#review input[type='checkbox']").forEach((checkbox) => {
  checkbox.addEventListener("change", updateWorkflowState);
});
["#clientReply", "#managerMemo", "#clientChoice"].forEach((selector) => {
  const syncFeedbackUi = () => {
    renderFeedbackAnalysis();
    if ($("#revisionMailResult")) $("#revisionMailResult").textContent = generateRevisionMailText();
    updateWorkflowState();
  };
  $(selector)?.addEventListener("input", syncFeedbackUi);
  $(selector)?.addEventListener("change", syncFeedbackUi);
});
$("#customerType")?.addEventListener("change", () => {
  if ($("#productionRoute")) $("#productionRoute").value = value("customerType") === "existing" ? "psd" : "figma";
  updateRouteSummary();
  updateWorkflowState();
});
$("#productionRoute")?.addEventListener("change", () => {
  updateRouteSummary();
  updateWorkflowState();
});
renderLeads();
renderProjects();
renderCustomerProjects();
loadAiSettings();
renderAiWorkflowStatus();
updateReferenceStatus();
updateRouteSummary();
updateWorkflowState();

