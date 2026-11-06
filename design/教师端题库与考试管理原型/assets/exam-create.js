(() => {
  const {
    banks,
    subjects,
    subjectColors,
    escapeHtml,
    icon,
    formatDate,
  } = window.DEMO;
  const { classes } = window.EXAM_DEMO;

  document.querySelectorAll("[data-icon]").forEach((node) => {
    node.innerHTML = icon(node.dataset.icon, 16);
  });

  const STEPS = [
    { title: "基本信息", hint: "名称、类型与规则" },
    { title: "选择题库", hint: "来源与组卷范围" },
    { title: "选择班级", hint: "设置参与对象" },
    { title: "确认创建", hint: "检查并生成试卷" },
  ];
  const QUESTION_TYPES = [
    { value: "SINGLE_CHOICE", label: "单选" },
    { value: "MULTIPLE_CHOICE", label: "多选" },
    { value: "TRUE_FALSE", label: "判断" },
    { value: "FILL_BLANK", label: "填空" },
  ];
  const DIFFICULTIES = [
    { value: "", label: "不限" },
    { value: "EASY", label: "简单" },
    { value: "MEDIUM", label: "中等" },
    { value: "HARD", label: "困难" },
  ];
  const PAGE_SIZE = 6;
  const SCORE_PRESETS = [1, 2, 5];
  const SELECTED_SCOPE = "__selected__";
  const TYPE_LABELS = Object.fromEntries(QUESTION_TYPES.map((item) => [item.value, item.label]));
  const DIFFICULTY_LABELS = {
    EASY: "简单",
    MEDIUM: "中等",
    HARD: "困难",
  };
  const TYPE_PATTERN = [
    "SINGLE_CHOICE", "SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE",
    "SINGLE_CHOICE", "FILL_BLANK", "MULTIPLE_CHOICE", "SINGLE_CHOICE",
    "TRUE_FALSE", "FILL_BLANK",
  ];
  const DIFFICULTY_PATTERN = ["EASY", "MEDIUM", "MEDIUM", "HARD", "MEDIUM", "EASY"];
  const GROUP_DIMENSIONS = [
    { value: "type", label: "按题型" },
    { value: "unit", label: "按单元" },
    { value: "knowledgePoint", label: "按知识点" },
  ];
  const SUBJECT_BLUEPRINTS = {
    烹饪科目组: [
      { unit: "食品营养基础", knowledgePoints: ["营养素识别", "营养计算"] },
      { unit: "加工制作", knowledgePoints: ["切配加工", "烹调制作"] },
      { unit: "储存运输", knowledgePoints: ["冷藏保存", "运输卫生"] },
      { unit: "食品安全", knowledgePoints: ["留样管理", "卫生控制"] },
    ],
    面点技艺: [
      { unit: "原料基础", knowledgePoints: ["原料识别", "原料配比"] },
      { unit: "面团调制", knowledgePoints: ["水调面团", "发酵面团"] },
      { unit: "成形工艺", knowledgePoints: ["包捏成形", "模具成形"] },
      { unit: "熟制技法", knowledgePoints: ["蒸制", "烘烤"] },
    ],
    中式烹调: [
      { unit: "刀工基础", knowledgePoints: ["刀法运用", "原料成型"] },
      { unit: "火候控制", knowledgePoints: ["旺火快炒", "小火慢烹"] },
      { unit: "调味工艺", knowledgePoints: ["复合调味", "味型设计"] },
      { unit: "热菜实训", knowledgePoints: ["热菜制作", "装盘呈现"] },
    ],
    营养配餐: [
      { unit: "营养计算", knowledgePoints: ["能量计算", "营养素配比"] },
      { unit: "餐单设计", knowledgePoints: ["早餐设计", "正餐设计"] },
      { unit: "人群配餐", knowledgePoints: ["学生餐", "老年餐"] },
      { unit: "成本控制", knowledgePoints: ["食材成本", "菜单核算"] },
    ],
  };
  const candidateCache = new Map();

  let step = 0;
  let bankPage = 1;
  let success = false;
  let activeRuleSelect = null;
  let form = {
    name: "",
    type: "PRACTICE",
    defaultScore: "1",
    deadlineAt: "",
    timeLimitMin: "",
    allowRepeat: false,
    repeatLimit: "",
    shuffleQuestions: false,
    shuffleOptions: false,
    bankIds: [],
    bankQuery: "",
    bankSubject: "",
    composeMode: "WHOLE",
    quickGroupDim: "type",
    quickDifficulty: "",
    quickQuotas: {
      SINGLE_CHOICE: 6,
      MULTIPLE_CHOICE: 2,
      TRUE_FALSE: 2,
      FILL_BLANK: 2,
    },
    rules: [
      { unit: "", knowledgePoint: "", type: "", difficulty: "", count: "5", score: "2" },
    ],
    preview: null,
    classIds: [],
  };

  const els = {
    page: document.getElementById("createPage"),
    steps: document.getElementById("createSteps"),
    content: document.getElementById("stepContent"),
    footer: document.getElementById("createFooter"),
    back: document.getElementById("backButton"),
    next: document.getElementById("nextButton"),
    footerProgress: document.getElementById("footerProgress"),
    mobileStepCount: document.getElementById("mobileStepCount"),
    mobileStepTitle: document.getElementById("mobileStepTitle"),
    mobileStepLabel: document.getElementById("mobileStepLabel"),
    mobileProgressFill: document.getElementById("mobileProgressFill"),
    toastRegion: document.getElementById("toastRegion"),
    rulePopover: document.getElementById("ruleSelectPopover"),
  };

  const selectedBanks = () => form.bankIds
    .map((id) => banks.find((bank) => bank.id === id))
    .filter(Boolean);
  const selectedClasses = () => classes.filter((item) => form.classIds.includes(item.id));

  function resetComposeState() {
    form.composeMode = "WHOLE";
    form.quickGroupDim = "type";
    form.quickDifficulty = "";
    form.quickQuotas = {
      SINGLE_CHOICE: 6,
      MULTIPLE_CHOICE: 2,
      TRUE_FALSE: 2,
      FILL_BLANK: 2,
    };
    form.rules = [{ unit: "", knowledgePoint: "", type: "", difficulty: "", count: "5", score: "2" }];
    form.preview = null;
  }

  function bankCandidates(bank) {
    if (candidateCache.has(bank.id)) return candidateCache.get(bank.id);
    const blueprint = SUBJECT_BLUEPRINTS[bank.subject] || SUBJECT_BLUEPRINTS.烹饪科目组;
    const rows = [];
    for (let index = 0; index < bank.questionCount; index += 1) {
      const seed = bank.id * 11 + index;
      const unit = blueprint[seed % blueprint.length];
      rows.push({
        id: `${bank.id}-${index + 1}`,
        number: index + 1,
        bankId: bank.id,
        bankName: bank.name,
        subject: bank.subject,
        type: TYPE_PATTERN[seed % TYPE_PATTERN.length],
        difficulty: DIFFICULTY_PATTERN[seed % DIFFICULTY_PATTERN.length],
        unit: unit.unit,
        knowledgePoint: unit.knowledgePoints[seed % unit.knowledgePoints.length],
      });
    }
    candidateCache.set(bank.id, rows);
    return rows;
  }

  function candidatePool() {
    const lists = selectedBanks().map(bankCandidates);
    const maxLength = Math.max(0, ...lists.map((list) => list.length));
    const rows = [];
    for (let index = 0; index < maxLength; index += 1) {
      lists.forEach((list) => {
        if (list[index]) rows.push(list[index]);
      });
    }
    return rows;
  }

  function dimensionValue(candidate, dimension) {
    return candidate[dimension];
  }

  function dimensionLabel(value, dimension) {
    if (dimension === "type") return TYPE_LABELS[value] || value;
    return value;
  }

  function dimensionBuckets(dimension, pool = candidatePool()) {
    const counts = new Map();
    pool.forEach((candidate) => {
      const value = dimensionValue(candidate, dimension);
      counts.set(value, (counts.get(value) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((left, right) => {
        if (dimension === "type") {
          return QUESTION_TYPES.findIndex((item) => item.value === left.value) - QUESTION_TYPES.findIndex((item) => item.value === right.value);
        }
        return left.value.localeCompare(right.value, "zh-CN");
      });
  }

  function quickBuckets() {
    const pool = candidatePool().filter((candidate) => !form.quickDifficulty || candidate.difficulty === form.quickDifficulty);
    return dimensionBuckets(form.quickGroupDim, pool);
  }

  function plannedQuestionCount() {
    if (!selectedBanks().length) return 0;
    if (form.composeMode === "WHOLE") {
      return selectedBanks().reduce((sum, bank) => sum + bank.questionCount, 0);
    }
    if (form.composeMode === "QUICK") {
      return Object.values(form.quickQuotas).reduce((sum, value) => sum + (Number(value) || 0), 0);
    }
    return form.rules.reduce((sum, rule) => sum + (Number(rule.count) || 0), 0);
  }

  function questionCount() {
    if (form.composeMode !== "WHOLE" && form.preview) return form.preview.totalCount;
    return plannedQuestionCount();
  }

  function totalScore() {
    if (form.composeMode !== "WHOLE" && form.preview) return form.preview.totalScore;
    if (form.composeMode === "DETAILED") {
      return form.rules.reduce((sum, rule) => sum + (Number(rule.count) || 0) * (Number(rule.score) || 0), 0);
    }
    return plannedQuestionCount() * (Number(form.defaultScore) || 1);
  }

  function quickRules() {
    return quickBuckets()
      .map((bucket) => {
        const count = Number(form.quickQuotas[bucket.value] || 0);
        if (count <= 0) return null;
        return {
          unit: form.quickGroupDim === "unit" ? bucket.value : null,
          knowledgePoint: form.quickGroupDim === "knowledgePoint" ? bucket.value : null,
          type: form.quickGroupDim === "type" ? bucket.value : null,
          difficulty: form.quickDifficulty || null,
          count,
          score: Number(form.defaultScore) || 1,
        };
      })
      .filter(Boolean);
  }

  function detailedRules() {
    return form.rules
      .filter((rule) => Number(rule.count) > 0)
      .map((rule) => ({
        unit: rule.unit || null,
        knowledgePoint: rule.knowledgePoint || null,
        type: rule.type || null,
        difficulty: rule.difficulty || null,
        count: Number(rule.count),
        score: Number(rule.score) || 1,
      }));
  }

  function activeRules() {
    if (form.composeMode === "QUICK") return quickRules();
    if (form.composeMode === "DETAILED") return detailedRules();
    return [];
  }

  function candidateMatches(candidate, rule) {
    if (rule.type && candidate.type !== rule.type) return false;
    if (rule.difficulty && candidate.difficulty !== rule.difficulty) return false;
    if (rule.unit && candidate.unit !== rule.unit) return false;
    if (rule.knowledgePoint && candidate.knowledgePoint !== rule.knowledgePoint) return false;
    return true;
  }

  function resolveRules(rules) {
    const pool = candidatePool();
    const used = new Set();
    const picks = [];
    const ruleResults = [];
    rules.forEach((rule, ruleIndex) => {
      const candidates = pool.filter((candidate) => !used.has(candidate.id) && candidateMatches(candidate, rule));
      const take = Math.min(rule.count, candidates.length);
      candidates.slice(0, take).forEach((candidate) => {
        used.add(candidate.id);
        picks.push({ ...candidate, score: rule.score, order: picks.length + 1, ruleIndex });
      });
      ruleResults.push({
        requested: rule.count,
        available: candidates.length,
        taken: take,
        shortfall: rule.count - take,
      });
    });
    const total = picks.length;
    return {
      totalCount: total,
      totalScore: Math.round(picks.reduce((sum, item) => sum + item.score, 0) * 100) / 100,
      hasShortfall: ruleResults.some((item) => item.shortfall > 0),
      ruleResults,
      items: picks,
    };
  }

  function syncScorePresets() {
    document.querySelectorAll("[data-default-score]").forEach((button) => {
      const active = button.dataset.defaultScore === String(form.defaultScore);
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function canAdvance() {
    if (step === 0) return Boolean(form.name.trim());
    if (step === 1) {
      if (!selectedBanks().length) return false;
      return form.composeMode === "WHOLE" || Boolean(form.preview?.totalCount);
    }
    if (step === 2) return form.classIds.length > 0;
    if (step === 3) {
      return Boolean(form.name.trim()) && selectedBanks().length > 0 && questionCount() > 0 && form.classIds.length > 0;
    }
    return false;
  }

  function toast(message) {
    const node = document.createElement("div");
    node.className = "toast success";
    node.innerHTML = `${icon("check", 16)}<span>${escapeHtml(message)}</span>`;
    els.toastRegion.appendChild(node);
    window.setTimeout(() => node.remove(), 2500);
  }

  function subjectChip(value) {
    if (!value) return "";
    const colors = subjectColors[value] || { bg: "#eef0f5", fg: "#414755" };
    return `<span class="subject-chip" style="background:${colors.bg};color:${colors.fg}">${escapeHtml(value)}</span>`;
  }

  function renderStepper() {
    els.steps.innerHTML = STEPS.map((item, index) => `
      ${index ? '<span class="step-connector" aria-hidden="true"></span>' : ""}
      <button class="create-step${index === step ? " active" : ""}${index < step ? " complete" : ""}" type="button" data-go-step="${index}" ${index === step ? 'aria-current="step"' : ""}>
        <span class="step-number">${index < step ? icon("check", 13) : index + 1}</span>
        <span>${item.title}</span>
      </button>
    `).join("");
  }

  function renderProgress() {
    els.mobileStepCount.textContent = `${step + 1} / ${STEPS.length}`;
    els.mobileStepTitle.textContent = STEPS[step].title;
    els.mobileStepLabel.textContent = `第 ${step + 1} 步，共 ${STEPS.length} 步`;
    els.footerProgress.textContent = `第 ${step + 1} 步，共 ${STEPS.length} 步`;
    els.mobileProgressFill.style.width = `${((step + 1) / STEPS.length) * 100}%`;
  }

  function renderFooter() {
    els.back.textContent = step === 0 ? "取消" : "上一步";
    els.next.innerHTML = step === 3
      ? `确认创建${icon("check", 15)}`
      : `下一步${icon("chevronRight", 15)}`;
    els.next.disabled = !canAdvance();
  }

  function renderStep0() {
    els.content.innerHTML = `
      <h2 class="step-heading">基本信息</h2>
      <p class="step-copy">先设置考试规则，内容之后仍可继续调整。</p>
      <div class="form-grid">
        <div class="form-field full">
          <label for="examName">名称</label>
          <input id="examName" data-field="name" maxlength="100" value="${escapeHtml(form.name)}" placeholder="例如：食品安全5.1 阶段考试">
        </div>
        <div class="form-field">
          <span class="field-label">类型</span>
          <div class="segmented type-segmented" role="group" aria-label="考试类型">
            <button class="segment ${form.type === "PRACTICE" ? "active" : ""}" type="button" data-exam-type="PRACTICE">练习</button>
            <button class="segment ${form.type === "EXAM" ? "active" : ""}" type="button" data-exam-type="EXAM">考试</button>
          </div>
        </div>
        <div class="form-field">
          <span class="field-label" id="defaultScoreLabel">每题默认分值</span>
          <div class="score-options" role="group" aria-labelledby="defaultScoreLabel">
            <div class="score-presets">
              ${SCORE_PRESETS.map((score) => {
                const active = String(form.defaultScore) === String(score);
                return `<button class="score-preset${active ? " active" : ""}" type="button" data-default-score="${score}" aria-pressed="${active}">${score} 分</button>`;
              }).join("")}
            </div>
            <label class="score-custom">
              <span class="sr-only">自定义每题分值</span>
              <input id="defaultScore" data-field="defaultScore" type="number" min="0.5" step="0.5" value="${escapeHtml(form.defaultScore)}" placeholder="自定义">
              <span class="score-unit" aria-hidden="true">分</span>
            </label>
          </div>
        </div>
        ${form.type === "EXAM" ? `
          <div class="form-field">
            <label for="deadlineAt">截止日期</label>
            <div class="date-control" data-open-deadline>
              <input id="deadlineAt" data-field="deadlineAt" type="datetime-local" value="${escapeHtml(form.deadlineAt)}">
            </div>
          </div>
          <div class="form-field">
            <label for="timeLimitMin">答题时长</label>
            <input id="timeLimitMin" data-field="timeLimitMin" type="number" min="1" step="1" value="${escapeHtml(form.timeLimitMin)}" placeholder="不限时">
            <span class="form-hint">分钟</span>
          </div>
        ` : ""}
        <div class="form-field full">
          <div class="switch-group">
            <div class="switch-row"><button class="switch" type="button" data-toggle="allowRepeat" aria-pressed="${form.allowRepeat}" aria-label="允许重复练习"></button><span class="switch-label">允许重复练习</span></div>
            <div class="switch-row"><button class="switch" type="button" data-toggle="shuffleQuestions" aria-pressed="${form.shuffleQuestions}" aria-label="随机题目顺序"></button><span class="switch-label">随机题目顺序</span></div>
            <div class="switch-row"><button class="switch" type="button" data-toggle="shuffleOptions" aria-pressed="${form.shuffleOptions}" aria-label="随机选项顺序"></button><span class="switch-label">随机选项顺序</span></div>
          </div>
        </div>
        ${form.allowRepeat ? `
          <div class="form-field">
            <label for="repeatLimit">重做次数上限</label>
            <input id="repeatLimit" data-field="repeatLimit" type="number" min="1" step="1" value="${escapeHtml(form.repeatLimit)}" placeholder="不限">
          </div>
        ` : ""}
      </div>
      <div class="wizard-error" id="wizardError">请输入考试名称</div>
    `;
  }

  function filteredBanks() {
    const query = form.bankQuery.trim().toLowerCase();
    return banks.filter((bank) => {
      if (form.bankSubject === SELECTED_SCOPE && !form.bankIds.includes(bank.id)) return false;
      if (form.bankSubject && form.bankSubject !== SELECTED_SCOPE && bank.subject !== form.bankSubject) return false;
      if (!query) return true;
      return `${bank.name} ${bank.subject} ${bank.ownerName || ""}`.toLowerCase().includes(query);
    });
  }

  function bankPageData(rows) {
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    bankPage = Math.min(Math.max(1, bankPage), totalPages);
    return {
      totalPages,
      start: (bankPage - 1) * PAGE_SIZE,
      rows: rows.slice((bankPage - 1) * PAGE_SIZE, bankPage * PAGE_SIZE),
    };
  }

  function bankResultsHtml() {
    const rows = filteredBanks();
    const paging = bankPageData(rows);
    const scopeTitle = form.bankSubject === SELECTED_SCOPE
      ? "已选题库"
      : form.bankSubject || "全部题库";
    const allPageSelected = paging.rows.length > 0 && paging.rows.every((bank) => form.bankIds.includes(bank.id));
    return `
      <div class="pick-result-head">
        <div><strong>${escapeHtml(scopeTitle)}</strong><span>${rows.length} 个题库</span></div>
        ${paging.rows.length ? `<button class="select-page-button" type="button" data-select-page>${allPageSelected ? "取消本页" : "全选本页"}</button>` : ""}
      </div>
      <div class="pick-bank-list">
        ${paging.rows.length ? paging.rows.map((bank) => `
          <button class="pick-bank-row${form.bankIds.includes(bank.id) ? " selected" : ""}" type="button" data-bank-id="${bank.id}" aria-pressed="${form.bankIds.includes(bank.id)}">
            <span class="pick-bank-check">${form.bankIds.includes(bank.id) ? icon("check", 13) : ""}</span>
            <span class="pick-bank-main">
              <span class="pick-bank-name">${escapeHtml(bank.name)}</span>
              <span class="pick-bank-meta">${subjectChip(bank.subject)}<span>${bank.questionCount} 道题</span></span>
            </span>
          </button>
        `).join("") : `<div class="pick-empty">${form.bankSubject === SELECTED_SCOPE ? "还没有选择题库" : "没有找到题库"}</div>`}
        ${rows.length ? `
          <div class="bank-pager">
            <span class="bank-pager-summary">第 ${bankPage} / ${paging.totalPages} 页 · 共 ${rows.length} 个</span>
            <span class="bank-pager-actions">
              <button class="page-button" type="button" data-bank-page="${bankPage - 1}" ${bankPage <= 1 ? "disabled" : ""} aria-label="上一页">${icon("chevronLeft", 15)}</button>
              <button class="page-button" type="button" data-bank-page="${bankPage + 1}" ${bankPage >= paging.totalPages ? "disabled" : ""} aria-label="下一页">${icon("chevronRight", 15)}</button>
            </span>
          </div>
        ` : ""}
      </div>
    `;
  }

  function subjectNavHtml() {
    const counts = Object.fromEntries(subjects.map((subject) => [
      subject,
      banks.filter((bank) => bank.subject === subject).length,
    ]));
    return `
      <aside class="pick-subjects" aria-label="按科目筛选题库">
        <div class="pick-subject-title">科目</div>
        <button class="pick-subject${!form.bankSubject ? " active" : ""}" type="button" data-bank-scope="">
          <span class="pick-subject-label">全部题库</span><span class="pick-subject-count">${banks.length}</span>
        </button>
        ${subjects.map((subject) => {
          const colors = subjectColors[subject] || { fg: "#7b8493" };
          return `
            <button class="pick-subject${form.bankSubject === subject ? " active" : ""}" type="button" data-bank-scope="${escapeHtml(subject)}">
              <span class="pick-subject-dot" style="background:${colors.fg}"></span>
              <span class="pick-subject-label">${escapeHtml(subject)}</span>
              <span class="pick-subject-count">${counts[subject]}</span>
            </button>
          `;
        }).join("")}
        <button class="pick-subject selected-scope${form.bankSubject === SELECTED_SCOPE ? " active" : ""}" type="button" data-bank-scope="${SELECTED_SCOPE}">
          <span class="pick-subject-label">已选题库</span><span class="pick-subject-count">${form.bankIds.length}</span>
        </button>
      </aside>
    `;
  }

  function selectedBanksHtml() {
    const selected = selectedBanks();
    if (!selected.length) {
      return '<div class="selected-bank-bar empty">可跨科目选择题库，已选项会在切换科目后保留。</div>';
    }
    const total = selected.reduce((sum, bank) => sum + bank.questionCount, 0);
    return `
      <div class="selected-bank-bar">
        <div class="selected-bank-total"><strong>已选 ${selected.length} 个题库</strong><span>${total} 题</span></div>
        <div class="selected-bank-chips">
          ${selected.map((bank) => {
            const colors = subjectColors[bank.subject] || { fg: "#7b8493" };
            return `
              <span class="selected-bank-chip">
                <span class="selected-bank-dot" style="background:${colors.fg}"></span>
                <span>${escapeHtml(bank.name)}</span>
                <button type="button" data-remove-bank="${bank.id}" aria-label="移除题库 ${escapeHtml(bank.name)}">${icon("x", 12)}</button>
              </span>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function quickEditorHtml() {
    const buckets = quickBuckets();
    return `
      <div class="compose-setting">
        <span class="compose-setting-label">出题维度</span>
        <div class="choice-row" role="group" aria-label="出题维度">
          ${GROUP_DIMENSIONS.map((item) => `<button class="choice-chip${form.quickGroupDim === item.value ? " active" : ""}" type="button" data-quick-group="${item.value}">${item.label}</button>`).join("")}
        </div>
      </div>
      <div class="compose-setting">
        <span class="compose-setting-label">难度</span>
        <div class="choice-row" role="group" aria-label="难度">
          ${DIFFICULTIES.map((item) => `<button class="choice-chip${form.quickDifficulty === item.value ? " active" : ""}" type="button" data-quick-difficulty="${item.value}">${item.label}</button>`).join("")}
        </div>
      </div>
      <div class="quota-table">
        <div class="quota-head">
          <span>${GROUP_DIMENSIONS.find((item) => item.value === form.quickGroupDim)?.label.replace("按", "") || "范围"}</span>
          <span>库存</span>
          <span>出题数</span>
        </div>
        ${buckets.map((bucket) => `
          <div class="quota-row">
            <span>${escapeHtml(dimensionLabel(bucket.value, form.quickGroupDim))}</span>
            <span>${bucket.count}</span>
            <input type="number" min="0" max="${bucket.count}" step="1" data-quick-value="${escapeHtml(bucket.value)}" value="${escapeHtml(form.quickQuotas[bucket.value] ?? "")}" placeholder="0" aria-label="${escapeHtml(dimensionLabel(bucket.value, form.quickGroupDim))}出题数">
          </div>
        `).join("")}
      </div>
    `;
  }

  function ruleOptions(dimension) {
    if (dimension === "difficulty") {
      return [
        { value: "", label: "不限" },
        ...DIFFICULTIES.filter((item) => item.value).map((item) => ({ value: item.value, label: item.label })),
      ];
    }
    return [
      { value: "", label: "不限" },
      ...dimensionBuckets(dimension).map((bucket) => ({
        value: bucket.value,
        label: dimensionLabel(bucket.value, dimension),
      })),
    ];
  }

  function ruleSelectButton(rule, index, dimension, label) {
    const value = rule[dimension] || "";
    const option = ruleOptions(dimension).find((item) => item.value === value);
    return `
      <button class="rule-select-trigger${value ? " has-value" : ""}" type="button" data-rule-select="${dimension}" data-rule-index="${index}" aria-haspopup="listbox" aria-controls="ruleSelectPopover" aria-expanded="false" aria-label="第 ${index + 1} 条规则的${label}">
        <span class="rule-select-value">${escapeHtml(option?.label || "不限")}</span>
        ${icon("chevronDown", 14)}
      </button>
    `;
  }

  function closeRuleSelect() {
    if (activeRuleSelect?.button) activeRuleSelect.button.setAttribute("aria-expanded", "false");
    activeRuleSelect = null;
    els.rulePopover.hidden = true;
    els.rulePopover.innerHTML = "";
  }

  function openRuleSelect(button) {
    const index = Number(button.dataset.ruleIndex);
    const dimension = button.dataset.ruleSelect;
    const rule = form.rules[index];
    if (!rule) return;
    if (activeRuleSelect?.button === button) {
      closeRuleSelect();
      return;
    }
    closeRuleSelect();
    const selected = rule[dimension] || "";
    els.rulePopover.innerHTML = ruleOptions(dimension)
      .map((option) => `
        <button class="rule-select-option${option.value === selected ? " active" : ""}" type="button" role="option" aria-selected="${option.value === selected}" data-rule-option="${escapeHtml(option.value)}">
          <span>${escapeHtml(option.label)}</span>
          ${option.value === selected ? icon("check", 14) : ""}
        </button>
      `)
      .join("");
    els.rulePopover.hidden = false;
    const rect = button.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 168), window.innerWidth - 20);
    const left = Math.max(10, Math.min(rect.left, window.innerWidth - width - 10));
    els.rulePopover.style.width = `${width}px`;
    els.rulePopover.style.left = `${left}px`;
    els.rulePopover.style.top = `${rect.bottom + 6}px`;
    const menuHeight = els.rulePopover.offsetHeight;
    if (rect.bottom + menuHeight + 12 > window.innerHeight && rect.top - menuHeight - 6 > 8) {
      els.rulePopover.style.top = `${rect.top - menuHeight - 6}px`;
    }
    button.setAttribute("aria-expanded", "true");
    activeRuleSelect = { button, index, dimension };
    window.requestAnimationFrame(() => {
      els.rulePopover.querySelector(".rule-select-option.active")?.focus({ preventScroll: true });
    });
  }

  function rulesHtml() {
    return `
      <div class="detail-table-wrap">
        <div class="detail-table">
          <div class="detail-head">
            <span>单元</span><span>知识点</span><span>题型</span><span>难度</span><span>数量</span><span>分值</span><span></span>
          </div>
          ${form.rules.map((rule, index) => `
            <div class="detail-row" data-rule-index="${index}">
              ${ruleSelectButton(rule, index, "unit", "单元")}
              ${ruleSelectButton(rule, index, "knowledgePoint", "知识点")}
              ${ruleSelectButton(rule, index, "type", "题型")}
              ${ruleSelectButton(rule, index, "difficulty", "难度")}
              <input data-rule-field="count" type="number" min="1" step="1" value="${escapeHtml(rule.count)}" aria-label="第 ${index + 1} 条规则数量">
              <input data-rule-field="score" type="number" min="0.5" step="0.5" value="${escapeHtml(rule.score)}" aria-label="第 ${index + 1} 条规则分值">
              <button class="rule-remove" type="button" data-remove-rule="${index}" aria-label="删除第 ${index + 1} 条规则" ${form.rules.length === 1 ? "disabled" : ""}>${icon("x", 14)}</button>
            </div>
          `).join("")}
        </div>
      </div>
      <button class="add-rule" type="button" data-add-rule>${icon("plus", 13)}添加规则</button>
    `;
  }

  function previewHtml() {
    const preview = form.preview;
    if (!preview) return "";
    const shortfalls = preview.ruleResults
      .map((result, index) => ({ ...result, index }))
      .filter((result) => result.shortfall > 0);
    return `
      <div class="compose-preview">
        <div class="preview-summary">
          <span><strong>${preview.totalCount}</strong> 题</span>
          <span><strong>${Math.round(preview.totalScore * 10) / 10}</strong> 分</span>
          <span class="${preview.hasShortfall ? "has-shortfall" : "is-complete"}">${preview.hasShortfall ? "部分规则库存不足" : "规则均满足"}</span>
        </div>
        ${shortfalls.map((result) => `<div class="preview-warning">第 ${result.index + 1} 条规则需要 ${result.requested} 题，可抽 ${result.available} 题</div>`).join("")}
        <div class="preview-list">
          ${preview.items.slice(0, 6).map((item) => `
            <div class="preview-item">
              <span class="preview-order">${item.order}</span>
              <span class="preview-type">${TYPE_LABELS[item.type]}</span>
              <span class="preview-name">${escapeHtml(item.bankName)} · 第 ${item.number} 题</span>
              <span class="preview-point">${escapeHtml(item.knowledgePoint)}</span>
              <span class="preview-score">${item.score} 分</span>
            </div>
          `).join("")}
        </div>
        ${preview.items.length > 6 ? `<div class="preview-more">另有 ${preview.items.length - 6} 题</div>` : ""}
      </div>
    `;
  }

  function composeHtml() {
    const selected = selectedBanks();
    if (!selected.length) return "";
    const poolCount = selected.reduce((sum, bank) => sum + bank.questionCount, 0);
    return `
      <section class="compose-block">
        <div class="compose-heading">组卷方式</div>
        <div class="compose-sub">从所选题库统一抽取题目，生成独立试卷快照。</div>
        <div class="compose-modes" role="group" aria-label="组卷方式">
          ${[
            ["WHOLE", "整库组卷", `全部 ${poolCount} 题`],
            ["QUICK", "快捷组卷", "单一维度分配题量"],
            ["DETAILED", "明细组卷", "多维条件组合"],
          ].map(([value, title, description]) => `
            <button class="compose-mode${form.composeMode === value ? " active" : ""}" type="button" data-compose-mode="${value}">
              <strong>${title}</strong><span>${description}</span>
            </button>
          `).join("")}
        </div>
        <div class="compose-detail">
          ${form.composeMode === "WHOLE" ? `<div class="whole-summary">将 ${selected.length} 个题库的全部 <strong>${poolCount}</strong> 道题加入试卷，每题 <strong>${escapeHtml(form.defaultScore || "1")}</strong> 分，共 <strong>${Math.round(poolCount * (Number(form.defaultScore) || 1) * 10) / 10}</strong> 分。</div>` : ""}
          ${form.composeMode === "QUICK" ? quickEditorHtml() : ""}
          ${form.composeMode === "DETAILED" ? rulesHtml() : ""}
          ${form.composeMode !== "WHOLE" ? `
            <div class="compose-actions">
              <button class="preview-button" type="button" data-preview-compose>${icon("target", 14)}预览抽题</button>
              <span class="compose-planned" id="composePlanned">计划 ${plannedQuestionCount()} 题</span>
            </div>
            <div id="composePreview">${previewHtml()}</div>
          ` : ""}
        </div>
      </section>
    `;
  }

  function renderStep1() {
    closeRuleSelect();
    els.content.innerHTML = `
      <h2 class="step-heading">选择题库</h2>
      <p class="step-copy">可跨科目组合多个题库，试卷会保存独立的题目快照。</p>
      <div class="bank-browser">
        ${subjectNavHtml()}
        <section class="pick-results">
          <div class="pick-toolbar">
            <label class="search-box" id="bankSearchBox">
              <span class="search-icon">${icon("search", 16)}</span>
              <span class="sr-only">搜索题库</span>
              <input id="bankSearch" type="search" autocomplete="off" placeholder="搜索题库名称" value="${escapeHtml(form.bankQuery)}">
            </label>
            <span class="pick-selected-count">已选 ${form.bankIds.length} 个</span>
          </div>
          <div id="bankResults">${bankResultsHtml()}</div>
        </section>
      </div>
      ${selectedBanksHtml()}
      ${composeHtml()}
      <div class="wizard-error" id="wizardError">请选择题库并设置有效的组卷范围</div>
    `;
    renderFooter();
  }

  function renderStep2() {
    const studentTotal = selectedClasses().reduce((sum, item) => sum + item.studentCount, 0);
    els.content.innerHTML = `
      <h2 class="step-heading">选择参与班级</h2>
      <p class="step-copy">至少选择一个班级，学生会在班级考试列表中看到这份试卷。</p>
      <div class="class-grid">
        ${classes.map((item) => {
          const active = form.classIds.includes(item.id);
          return `
            <button class="class-choice${active ? " selected" : ""}" type="button" data-class-id="${item.id}">
              <span class="class-check">${active ? icon("check", 14) : ""}</span>
              <span class="class-info"><strong>${escapeHtml(item.name)}</strong><span>${item.studentCount} 名学生</span></span>
            </button>
          `;
        }).join("")}
      </div>
      <div class="class-footer-note">${form.classIds.length ? `已选 ${form.classIds.length} 个班级，共 ${studentTotal} 名学生` : "尚未选择班级"}</div>
      <div class="wizard-error" id="wizardError">至少选择一个班级</div>
    `;
  }

  function summarizeCompose() {
    if (form.composeMode === "WHOLE") return `整库组卷 · ${selectedBanks().length} 个题库`;
    if (form.composeMode === "QUICK") return `快捷组卷 · ${questionCount()} 题`;
    return `明细组卷 · ${form.rules.length} 条规则`;
  }

  function renderStep3() {
    const selected = selectedBanks();
    const bankNames = selected.map((bank) => bank.name);
    const bankText = bankNames.length
      ? `${bankNames.slice(0, 2).join("、")}${bankNames.length > 2 ? ` 等 ${bankNames.length} 个` : ""}`
      : "—";
    const classesText = selectedClasses().map((item) => item.name).join("、");
    els.content.innerHTML = `
      <h2 class="step-heading">确认创建</h2>
      <p class="step-copy">确认后会生成独立的试卷快照。</p>
      <div class="review-grid">
        <div class="review-block">
          <h3>考试信息</h3>
          <div class="review-list">
            <div class="review-line"><span>名称</span><strong>${escapeHtml(form.name || "—")}</strong></div>
            <div class="review-line"><span>类型</span><strong>${form.type === "EXAM" ? "考试" : "练习"}</strong></div>
            ${form.type === "EXAM" ? `
              <div class="review-line"><span>截止日期</span><strong>${form.deadlineAt ? form.deadlineAt.replace("T", " ") : "不限"}</strong></div>
              <div class="review-line"><span>答题时长</span><strong>${form.timeLimitMin ? `${form.timeLimitMin} 分钟` : "不限"}</strong></div>
            ` : ""}
            <div class="review-line"><span>可重做</span><strong>${form.allowRepeat ? (form.repeatLimit ? `${form.repeatLimit} 次` : "不限次数") : "否"}</strong></div>
          </div>
        </div>
        <div class="review-block">
          <h3>试卷信息</h3>
          <div class="review-list">
            <div class="review-line"><span>题库</span><strong title="${escapeHtml(bankNames.join("、"))}">${escapeHtml(bankText)}</strong></div>
            <div class="review-line"><span>组卷方式</span><strong>${summarizeCompose()}</strong></div>
            <div class="review-line"><span>参与班级</span><strong>${escapeHtml(classesText || "—")}</strong></div>
            <div class="review-line"><span>随机题目</span><strong>${form.shuffleQuestions ? "是" : "否"}</strong></div>
            <div class="review-line"><span>随机选项</span><strong>${form.shuffleOptions ? "是" : "否"}</strong></div>
          </div>
        </div>
      </div>
      <div class="review-total"><span>共 ${questionCount()} 题 · ${selectedClasses().length} 个班级</span><strong>${Math.round(totalScore() * 10) / 10} 分</strong></div>
      <div class="wizard-error" id="wizardError">请先完成考试名称、试卷和参与班级</div>
    `;
  }

  function render() {
    if (success) return;
    renderStepper();
    renderProgress();
    if (step === 0) renderStep0();
    if (step === 1) renderStep1();
    if (step === 2) renderStep2();
    if (step === 3) renderStep3();
    renderFooter();
  }

  function goTo(next) {
    step = next;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showError(message) {
    const error = document.getElementById("wizardError");
    if (error) {
      error.textContent = message;
      error.classList.add("show");
    }
  }

  function next() {
    if (step === 0 && !form.name.trim()) {
      showError("请输入考试名称");
      document.getElementById("examName")?.focus();
      return;
    }
    if (step === 1) {
      if (!selectedBanks().length) {
        showError("请至少选择一个题库");
        return;
      }
      if (form.composeMode !== "WHOLE" && !form.preview) {
        showError("请先预览抽题");
        return;
      }
      if (questionCount() <= 0) {
        showError("请设置至少 1 道题");
        return;
      }
    }
    if (step === 2 && !form.classIds.length) {
      showError("至少选择一个班级");
      return;
    }
    if (step === 3) {
      if (!canAdvance()) {
        showError("请先完成考试名称、试卷和参与班级");
        return;
      }
      success = true;
      renderSuccess();
      return;
    }
    goTo(step + 1);
  }

  function renderSuccess() {
    els.page.classList.add("is-success");
    els.steps.innerHTML = "";
    els.footer.style.display = "none";
    document.querySelector(".mobile-progress").style.display = "none";
    els.mobileStepCount.textContent = "完成";
    els.mobileStepTitle.textContent = "创建完成";
    document.querySelector(".create-header").style.display = "none";
    els.content.innerHTML = `
      <div class="create-success">
        <div class="success-icon">${icon("check", 24)}</div>
        <h2>「${escapeHtml(form.name)}」已创建</h2>
        <p>演示已完成四步流程。正式实现会生成 ${questionCount()} 道题的试卷快照，并发布给 ${selectedClasses().length} 个班级。</p>
        <div class="success-links">
          <a class="button primary" href="./exam-management.html">返回考试管理</a>
          <button class="button outline" type="button" id="restartCreate">再新建一份</button>
        </div>
      </div>
    `;
    document.getElementById("restartCreate").addEventListener("click", () => {
      window.location.reload();
    });
  }

  function updateComposePlanned() {
    const planned = document.getElementById("composePlanned");
    if (planned) planned.textContent = `计划 ${plannedQuestionCount()} 题`;
    renderFooter();
  }

  function invalidateComposePreview() {
    form.preview = null;
    const container = document.getElementById("composePreview");
    if (container) container.innerHTML = "";
    updateComposePlanned();
  }

  function previewCompose() {
    const rules = activeRules();
    if (!rules.length) {
      showError("请至少设置一条出题规则");
      return;
    }
    const preview = resolveRules(rules);
    form.preview = preview;
    const container = document.getElementById("composePreview");
    if (container) container.innerHTML = previewHtml();
    if (preview.totalCount === 0) {
      showError("按当前规则未抽到任何题目");
    } else {
      document.getElementById("wizardError")?.classList.remove("show");
    }
    renderFooter();
    container?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function toggleBank(bankId) {
    form.bankIds = form.bankIds.includes(bankId)
      ? form.bankIds.filter((id) => id !== bankId)
      : [...form.bankIds, bankId];
    resetComposeState();
    renderStep1();
  }

  els.content.addEventListener("input", (event) => {
    const target = event.target;
    if (target.id === "bankSearch") {
      form.bankQuery = target.value;
      bankPage = 1;
      const results = document.getElementById("bankResults");
      if (results) results.innerHTML = bankResultsHtml();
      return;
    }
    if (target.dataset.field) {
      form[target.dataset.field] = target.value;
      if (target.dataset.field === "defaultScore") {
        syncScorePresets();
        form.preview = null;
      }
      document.getElementById("wizardError")?.classList.remove("show");
      renderFooter();
      return;
    }
    if (target.dataset.quickValue) {
      form.quickQuotas[target.dataset.quickValue] = target.value;
      invalidateComposePreview();
      return;
    }
    if (target.dataset.ruleField) {
      const row = target.closest("[data-rule-index]");
      if (!row) return;
      const rule = form.rules[Number(row.dataset.ruleIndex)];
      if (rule) rule[target.dataset.ruleField] = target.value;
      invalidateComposePreview();
    }
  });

  els.content.addEventListener("click", (event) => {
    const deadlineControl = event.target.closest("[data-open-deadline]");
    if (deadlineControl) {
      const input = deadlineControl.querySelector("input");
      input?.focus();
      if (typeof input?.showPicker === "function") {
        event.preventDefault();
        try {
          input.showPicker();
        } catch {}
      }
      return;
    }
    const scorePreset = event.target.closest("[data-default-score]");
    if (scorePreset) {
      form.defaultScore = scorePreset.dataset.defaultScore;
      const input = document.getElementById("defaultScore");
      if (input) input.value = form.defaultScore;
      syncScorePresets();
      renderFooter();
      return;
    }
    const ruleSelect = event.target.closest("[data-rule-select]");
    if (ruleSelect) {
      openRuleSelect(ruleSelect);
      return;
    }
    const examType = event.target.closest("[data-exam-type]");
    if (examType) {
      form.type = examType.dataset.examType;
      if (form.type === "PRACTICE") {
        form.deadlineAt = "";
        form.timeLimitMin = "";
      }
      renderStep0();
      renderFooter();
      return;
    }
    const toggle = event.target.closest("[data-toggle]");
    if (toggle) {
      form[toggle.dataset.toggle] = !form[toggle.dataset.toggle];
      renderStep0();
      renderFooter();
      return;
    }
    const subjectScope = event.target.closest("[data-bank-scope]");
    if (subjectScope) {
      form.bankSubject = subjectScope.dataset.bankScope;
      bankPage = 1;
      renderStep1();
      return;
    }
    const bankPageButton = event.target.closest("[data-bank-page]");
    if (bankPageButton) {
      bankPage = Number(bankPageButton.dataset.bankPage);
      const results = document.getElementById("bankResults");
      if (results) results.innerHTML = bankResultsHtml();
      return;
    }
    const selectPage = event.target.closest("[data-select-page]");
    if (selectPage) {
      const pageRows = bankPageData(filteredBanks()).rows;
      const allSelected = pageRows.length > 0 && pageRows.every((bank) => form.bankIds.includes(bank.id));
      const pageIds = pageRows.map((bank) => bank.id);
      form.bankIds = allSelected
        ? form.bankIds.filter((id) => !pageIds.includes(id))
        : [...new Set([...form.bankIds, ...pageIds])];
      resetComposeState();
      renderStep1();
      return;
    }
    const bankChoice = event.target.closest("[data-bank-id]");
    if (bankChoice) {
      toggleBank(Number(bankChoice.dataset.bankId));
      return;
    }
    const removeBank = event.target.closest("[data-remove-bank]");
    if (removeBank) {
      toggleBank(Number(removeBank.dataset.removeBank));
      return;
    }
    const mode = event.target.closest("[data-compose-mode]");
    if (mode) {
      form.composeMode = mode.dataset.composeMode;
      form.preview = null;
      renderStep1();
      return;
    }
    const quickGroup = event.target.closest("[data-quick-group]");
    if (quickGroup) {
      form.quickGroupDim = quickGroup.dataset.quickGroup;
      form.quickQuotas = {};
      form.preview = null;
      renderStep1();
      return;
    }
    const quickDifficulty = event.target.closest("[data-quick-difficulty]");
    if (quickDifficulty) {
      form.quickDifficulty = quickDifficulty.dataset.quickDifficulty;
      form.preview = null;
      renderStep1();
      return;
    }
    const previewButton = event.target.closest("[data-preview-compose]");
    if (previewButton) {
      previewCompose();
      return;
    }
    const addRule = event.target.closest("[data-add-rule]");
    if (addRule) {
      form.rules.push({ unit: "", knowledgePoint: "", type: "", difficulty: "", count: "5", score: "1" });
      form.preview = null;
      renderStep1();
      return;
    }
    const removeRule = event.target.closest("[data-remove-rule]");
    if (removeRule) {
      form.rules.splice(Number(removeRule.dataset.removeRule), 1);
      form.preview = null;
      renderStep1();
      return;
    }
    const classChoice = event.target.closest("[data-class-id]");
    if (classChoice) {
      const id = Number(classChoice.dataset.classId);
      form.classIds = form.classIds.includes(id)
        ? form.classIds.filter((item) => item !== id)
        : [...form.classIds, id];
      renderStep2();
      renderFooter();
    }
  });

  els.steps.addEventListener("click", (event) => {
    const target = event.target.closest("[data-go-step]");
    if (!target || target.disabled) return;
    goTo(Number(target.dataset.goStep));
  });

  els.back.addEventListener("click", () => {
    if (step === 0) {
      window.location.href = "./exam-management.html";
      return;
    }
    goTo(step - 1);
  });

  els.next.addEventListener("click", next);

  els.rulePopover.addEventListener("click", (event) => {
    const option = event.target.closest("[data-rule-option]");
    if (!option || !activeRuleSelect) return;
    const { button, index, dimension } = activeRuleSelect;
    const rule = form.rules[index];
    if (!rule) return;
    const value = option.dataset.ruleOption;
    const label = ruleOptions(dimension).find((item) => item.value === value)?.label || "不限";
    rule[dimension] = value;
    button.querySelector(".rule-select-value").textContent = label;
    button.classList.toggle("has-value", Boolean(value));
    closeRuleSelect();
    invalidateComposePreview();
    button.focus({ preventScroll: true });
  });

  els.content.addEventListener("keydown", (event) => {
    const trigger = event.target.closest("[data-rule-select]");
    if (trigger && event.key === "ArrowDown") {
      event.preventDefault();
      openRuleSelect(trigger);
    }
  });

  els.rulePopover.addEventListener("keydown", (event) => {
    const options = [...els.rulePopover.querySelectorAll("[data-rule-option]")];
    const current = options.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      const trigger = activeRuleSelect?.button;
      closeRuleSelect();
      trigger?.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) || !options.length) return;
    event.preventDefault();
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? options.length - 1
        : event.key === "ArrowDown"
          ? Math.min(options.length - 1, current + 1)
          : Math.max(0, current - 1);
    options[nextIndex]?.focus();
  });

  window.addEventListener("scroll", (event) => {
    if (!els.rulePopover.contains(event.target)) closeRuleSelect();
  }, true);
  window.addEventListener("resize", closeRuleSelect);

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#ruleSelectPopover") && !event.target.closest("[data-rule-select]")) {
      closeRuleSelect();
    }
    if (event.target.closest("[data-demo-link]")) {
      event.preventDefault();
      toast("演示只包含题库管理与考试管理页");
    }
    const toastTrigger = event.target.closest("[data-toast]");
    if (toastTrigger) toast(toastTrigger.dataset.toast);
  });

  render();
})();
