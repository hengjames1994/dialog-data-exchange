const sampleMarket = [
  {
    id: "research-methods",
    title: "科研论文方法论多轮问答包",
    domain: "科研",
    records: 12840,
    score: 92,
    price: 148000,
    license: "商业训练",
    tags: ["实验设计", "统计检验", "文献综述"],
  },
  {
    id: "python-debug",
    title: "Python Debug 与代码解释对话包",
    domain: "编程",
    records: 36420,
    score: 88,
    price: 126000,
    license: "微调训练",
    tags: ["异常定位", "重构", "测试"],
  },
  {
    id: "office-writing",
    title: "办公写作与会议纪要优化包",
    domain: "办公",
    records: 52100,
    score: 74,
    price: 68000,
    license: "商业训练",
    tags: ["邮件", "纪要", "汇报"],
  },
  {
    id: "tutor-dialogue",
    title: "中学数学分步讲解对话包",
    domain: "教育",
    records: 21460,
    score: 81,
    price: 91000,
    license: "评测/研究",
    tags: ["解题步骤", "错因分析", "追问"],
  },
];

const domainRules = [
  { domain: "科研", words: ["论文", "研究", "实验", "变量", "统计", "模型", "假设", "数据集", "citation", "methodology"] },
  { domain: "编程", words: ["代码", "bug", "函数", "接口", "报错", "python", "javascript", "api", "debug", "测试"] },
  { domain: "法律", words: ["合同", "条款", "诉讼", "侵权", "合规", "法律", "仲裁"] },
  { domain: "医疗", words: ["病历", "诊断", "处方", "症状", "治疗", "医学"] },
  { domain: "金融", words: ["投资", "财报", "估值", "风控", "贷款", "基金"] },
  { domain: "教育", words: ["学生", "课程", "解题", "教学", "考试", "作业"] },
  { domain: "办公", words: ["会议", "邮件", "汇报", "方案", "简历", "总结", "PPT"] },
];

const factorDefinitions = [
  ["领域价值", "科研、编程、教育等垂直领域会显著提高价值。"],
  ["信息密度", "问题越具体、上下文越完整，训练信号越强。"],
  ["多轮闭环", "追问、修正、反馈和最终采纳会提升可训练性。"],
  ["稀缺性", "专家知识、小众场景和高门槛任务更稀缺。"],
  ["合规安全", "完成授权和敏感信息排查后才能进入交易池。"],
];

const uploadInput = document.querySelector("#uploadInput");
const dropzone = document.querySelector("#dropzone");
const conversationInput = document.querySelector("#conversationInput");
const contributorType = document.querySelector("#contributorType");
const licenseScope = document.querySelector("#licenseScope");
const consentCheck = document.querySelector("#consentCheck");
const privacyCheck = document.querySelector("#privacyCheck");
const scoreBtn = document.querySelector("#scoreBtn");
const publishBtn = document.querySelector("#publishBtn");
const resetBtn = document.querySelector("#resetBtn");
const marketFilter = document.querySelector("#marketFilter");
const marketList = document.querySelector("#marketList");
const metricList = document.querySelector("#metricList");
const factorList = document.querySelector("#factorList");
const complianceList = document.querySelector("#complianceList");
const scoreValue = document.querySelector("#scoreValue");
const scoreArc = document.querySelector("#scoreArc");
const priceValue = document.querySelector("#priceValue");
const priceHint = document.querySelector("#priceHint");
const compliancePill = document.querySelector("#compliancePill");
const purchaseDialog = document.querySelector("#purchaseDialog");
const purchaseForm = document.querySelector("#purchaseForm");
const purchaseSummary = document.querySelector("#purchaseSummary");
const closePurchaseBtn = document.querySelector("#closePurchaseBtn");
const cancelPurchaseBtn = document.querySelector("#cancelPurchaseBtn");
const submitPurchaseBtn = document.querySelector("#submitPurchaseBtn");
const toast = document.querySelector("#toast");

let marketItems = loadMarket();
let latestAnalysis = null;
let selectedPackage = null;

refreshMarket();
renderFactors();
renderCompliance();
updateScoreView(null);

async function apiFetch(path, options = {}) {
  if (location.protocol === "file:") throw new Error("static preview mode");

  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "服务器请求失败");
  }

  return response.json();
}

function loadMarket() {
  return JSON.parse(localStorage.getItem("dialog-data-market") || "null") || sampleMarket;
}

function saveMarket() {
  localStorage.setItem("dialog-data-market", JSON.stringify(marketItems));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

async function refreshMarket() {
  try {
    const payload = await apiFetch("/api/packages");
    marketItems = payload.packages;
  } catch {
    marketItems = loadMarket();
  }
  renderMarket();
}

function normalizeText(value) {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

function detectDomain(text) {
  const lower = text.toLowerCase();
  const scored = domainRules.map((rule) => {
    const hits = rule.words.reduce((count, word) => count + (lower.includes(word.toLowerCase()) ? 1 : 0), 0);
    return { domain: rule.domain, hits };
  });
  scored.sort((a, b) => b.hits - a.hits);
  return scored[0].hits ? scored[0].domain : "日常";
}

function countMessages(text) {
  const explicitTurns = (text.match(/(^|\n)\s*(用户|User|Human|AI|助手|Assistant|系统|System)\s*[:：]/gi) || []).length;
  const lineTurns = text.split(/\n+/).filter((line) => line.trim().length > 12).length;
  return Math.max(explicitTurns, Math.min(lineTurns, 24));
}

function countSensitiveHits(text) {
  const patterns = [
    /1[3-9]\d{9}/g,
    /\b[\w.-]+@[\w.-]+\.\w{2,}\b/g,
    /\b\d{15}|\d{18}\b/g,
    /(?:地址|住址|银行卡|身份证|手机号|病历|处方|密码)/g,
  ];
  return patterns.reduce((sum, pattern) => sum + (text.match(pattern) || []).length, 0);
}

function analyzeConversation(text) {
  const cleanText = normalizeText(text).trim();
  if (!cleanText) return null;

  const domain = detectDomain(cleanText);
  const chars = cleanText.length;
  const turns = countMessages(cleanText);
  const questionMarks = (cleanText.match(/[?？]/g) || []).length;
  const feedbackHits = (cleanText.match(/(继续|不对|修改|解释|为什么|推导|验证|引用|来源|测试|复现)/g) || []).length;
  const sensitiveHits = countSensitiveHits(cleanText);

  const domainScoreMap = { 科研: 26, 编程: 24, 法律: 22, 医疗: 20, 金融: 20, 教育: 18, 办公: 14, 日常: 8 };
  const identityBoost = { researcher: 10, developer: 7, enterprise: 8, consumer: 2 }[contributorType.value];
  const licenseBoost = { evaluation: 0.86, "fine-tune": 1.08, commercial: 1.24, exclusive: 1.6 }[licenseScope.value];

  const densityScore = Math.min(24, Math.round(chars / 120));
  const turnScore = Math.min(18, turns * 2);
  const feedbackScore = Math.min(14, questionMarks + feedbackHits * 2);
  const safetyScore = Math.max(0, 14 - sensitiveHits * 4);
  const complianceScore = consentCheck.checked && privacyCheck.checked ? 8 : 0;

  const rawScore = domainScoreMap[domain] + densityScore + turnScore + feedbackScore + safetyScore + complianceScore + identityBoost;
  const score = Math.max(18, Math.min(98, rawScore));
  const basePrice = Math.max(12, Math.round((chars / 80 + turns * 2.4) * score * 0.18 * licenseBoost));
  const price = Math.round(basePrice * (domain === "日常" ? 0.45 : 1));

  return {
    domain,
    score,
    price,
    chars,
    turns,
    sensitiveHits,
    tags: buildTags(cleanText, domain),
    metrics: [
      { label: "领域", value: domain, detail: `${domainScoreMap[domain]} 分领域价值` },
      { label: "对话轮次", value: `${turns} 轮`, detail: turns >= 6 ? "多轮闭环较完整" : "可补充追问和反馈" },
      { label: "信息密度", value: `${chars} 字`, detail: densityScore >= 18 ? "上下文充足" : "建议增加背景资料" },
      { label: "敏感命中", value: `${sensitiveHits} 项`, detail: sensitiveHits ? "发布前需要脱敏复核" : "未发现明显敏感字段" },
    ],
  };
}

function buildTags(text, domain) {
  const tags = new Set([domain]);
  if (/论文|文献|实验|统计/.test(text)) tags.add("科研推理");
  if (/bug|debug|报错|函数|接口|python|javascript|单元测试/i.test(text)) tags.add("代码任务");
  if (/继续|修改|不对|验证/.test(text)) tags.add("多轮修正");
  if (/引用|来源|数据集|复现/.test(text)) tags.add("可追溯");
  if (tags.size < 3) tags.add("通用问答");
  return [...tags].slice(0, 4);
}

function updateScoreView(analysis) {
  const score = analysis?.score || 0;
  const circumference = 2 * Math.PI * 52;
  scoreArc.style.strokeDasharray = `${circumference}`;
  scoreArc.style.strokeDashoffset = `${circumference - (circumference * score) / 100}`;
  scoreValue.textContent = analysis ? score : "--";
  priceValue.textContent = analysis ? `¥ ${analysis.price.toLocaleString("zh-CN")}` : "¥ --";
  priceHint.textContent = analysis
    ? `${analysis.domain}领域 · ${analysis.turns}轮 · ${analysis.tags.join(" / ")}`
    : "上传或粘贴对话后生成报价";

  metricList.innerHTML = analysis
    ? analysis.metrics
        .map(
          (metric) => `
            <div class="metric-item">
              <span>${metric.label}</span>
              <strong>${metric.value}</strong>
              <small>${metric.detail}</small>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state">等待数据进入评分队列</div>`;

  renderCompliance();
}

function renderMarket() {
  const filter = marketFilter.value;
  const items = filter === "all" ? marketItems : marketItems.filter((item) => item.domain === filter);

  marketList.innerHTML = items
    .map(
      (item) => `
        <article class="market-card">
          <div>
            <div class="market-title">
              <h3>${item.title}</h3>
              <span>${item.score}分</span>
            </div>
            <p>${item.records.toLocaleString("zh-CN")} 条记录 · ${item.license}</p>
            <div class="tag-row">${item.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
          </div>
          <div class="market-price">
            <strong>¥${item.price.toLocaleString("zh-CN")}</strong>
            <button type="button" data-buy="${item.id}">采购咨询</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderFactors() {
  factorList.innerHTML = factorDefinitions
    .map(
      ([title, desc], index) => `
        <div class="factor-item">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <div>
            <strong>${title}</strong>
            <p>${desc}</p>
          </div>
        </div>
      `
    )
    .join("");
}

function renderCompliance() {
  const checks = [
    { label: "贡献者授权", ok: consentCheck.checked },
    { label: "隐私与商业秘密声明", ok: privacyCheck.checked },
    { label: "自动敏感字段扫描", ok: !latestAnalysis || latestAnalysis.sensitiveHits === 0 },
    { label: "买方用途留痕", ok: true },
  ];

  const ready = checks.every((check) => check.ok);
  compliancePill.textContent = ready ? "可入池" : "待完善";
  compliancePill.classList.toggle("is-ready", ready);

  complianceList.innerHTML = checks
    .map(
      (check) => `
        <div class="compliance-item ${check.ok ? "is-ok" : ""}">
          <span>${check.ok ? "✓" : "!"}</span>
          <strong>${check.label}</strong>
        </div>
      `
    )
    .join("");
}

function openPurchaseDialog(item) {
  selectedPackage = item;
  purchaseSummary.innerHTML = `
    <strong>${item.title}</strong>
    <span>${item.domain} · ${item.records.toLocaleString("zh-CN")} 条记录 · ${item.score}分</span>
    <b>参考价 ¥${item.price.toLocaleString("zh-CN")}</b>
  `;
  purchaseForm.reset();
  purchaseDialog.showModal();
}

function closePurchaseDialog() {
  selectedPackage = null;
  purchaseDialog.close();
}

async function readUploadedFile(file) {
  const text = await file.text();
  conversationInput.value = normalizeText(text);
  showToast(`已读取 ${file.name}`);
}

scoreBtn.addEventListener("click", () => {
  latestAnalysis = analyzeConversation(conversationInput.value);
  if (!latestAnalysis) {
    showToast("请先上传或粘贴一段对话");
    return;
  }
  updateScoreView(latestAnalysis);
  showToast("评分和估价已生成");
});

publishBtn.addEventListener("click", async () => {
  if (!latestAnalysis) {
    showToast("请先完成分析估价");
    return;
  }
  if (!consentCheck.checked || !privacyCheck.checked) {
    showToast("发布前需要完成授权和隐私声明");
    return;
  }

  const newItem = {
    id: `uploaded-${Date.now()}`,
    title: `${latestAnalysis.domain}对话数据包`,
    domain: latestAnalysis.domain,
    records: Math.max(1, latestAnalysis.turns),
    score: latestAnalysis.score,
    price: latestAnalysis.price,
    license: licenseScope.options[licenseScope.selectedIndex].text,
    tags: latestAnalysis.tags,
    seller: contributorType.options[contributorType.selectedIndex].text,
    sample: conversationInput.value.trim(),
  };

  try {
    const payload = await apiFetch("/api/packages", {
      method: "POST",
      body: JSON.stringify(newItem),
    });
    marketItems = [payload.package, ...marketItems];
    renderMarket();
    showToast("数据包已发布到线上交易大厅");
  } catch {
    marketItems = [newItem, ...marketItems];
    saveMarket();
    renderMarket();
    showToast("数据包已发布到本地演示交易大厅");
  }
});

resetBtn.addEventListener("click", () => {
  localStorage.removeItem("dialog-data-market");
  marketItems = sampleMarket;
  latestAnalysis = null;
  conversationInput.value = "";
  consentCheck.checked = false;
  privacyCheck.checked = false;
  updateScoreView(null);
  renderMarket();
  showToast("演示数据已重置");
});

marketFilter.addEventListener("change", renderMarket);

marketList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-buy]");
  if (!button) return;
  const item = marketItems.find((entry) => entry.id === button.dataset.buy);
  if (item) openPurchaseDialog(item);
});

purchaseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedPackage) return;

  submitPurchaseBtn.disabled = true;
  submitPurchaseBtn.textContent = "提交中...";

  const payload = {
    packageId: selectedPackage.id,
    buyerCompany: document.querySelector("#buyerCompany").value.trim(),
    buyerName: document.querySelector("#buyerName").value.trim(),
    buyerEmail: document.querySelector("#buyerEmail").value.trim(),
    buyerContact: document.querySelector("#buyerContact").value.trim(),
    useCase: document.querySelector("#buyerUseCase").value,
    note: document.querySelector("#buyerNote").value.trim(),
  };

  try {
    const result = await apiFetch("/api/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    closePurchaseDialog();
    showToast(`采购意向已提交，订单号 ${result.order.id.slice(-6)}`);
  } catch (error) {
    showToast(error.message || "提交失败，请稍后再试");
  } finally {
    submitPurchaseBtn.disabled = false;
    submitPurchaseBtn.textContent = "提交采购意向";
  }
});

closePurchaseBtn.addEventListener("click", closePurchaseDialog);
cancelPurchaseBtn.addEventListener("click", closePurchaseDialog);
purchaseDialog.addEventListener("click", (event) => {
  if (event.target === purchaseDialog) closePurchaseDialog();
});

uploadInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) readUploadedFile(file);
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("is-dragging");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("is-dragging");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("is-dragging");
  const [file] = event.dataTransfer.files;
  if (file) readUploadedFile(file);
});

[consentCheck, privacyCheck].forEach((input) => input.addEventListener("change", renderCompliance));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
