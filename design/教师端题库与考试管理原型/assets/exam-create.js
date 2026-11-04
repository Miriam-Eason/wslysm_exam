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

  let step = 0;
  let bankPage = 1;
  let success = false;
  let form = {
    name: "",
    type: "PRACTICE",
    defaultScore: "1",
    deadlineDate: "",
    deadlineTime: "",
    timeLimitMin: "",
    allowRepeat: false,
    repeatLimit: "",
    shuffleQuestions: false,
    shuffleOptions: false,
    bankId: null,
    bankQuery: "",
    bankSubject: "",
    composeMode: "WHOLE",
    quickCounts: {
      SINGLE_CHOICE: 6,
      MULTIPLE_CHOICE: 2,
      TRUE_FALSE: 2,
      FILL_BLANK: 2,
    },
    quickDifficulty: "",
    rules: [
      { unit: "食品留样", knowledgePoint: "冷藏保存", type: "SINGLE_CHOICE", difficulty: "MEDIUM", count: "5", score: "2" },
      { unit: "食品留样", knowledgePoint: "异常处理", type: "MULTIPLE_CHOICE", difficulty: "", count: "3", score: "2" },
    ],
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
  };

  const selectedBank = () => banks.find((bank) => bank.id === form.bankId) || null;
  const selectedClasses = () => classes.filter((item) => form.classIds.includes(item.id));

  function questionCount() {
    if (!selectedBank()) return 0;
    if (form.composeMode === "WHOLE") return selectedBank().questionCount;
    if (form.composeMode === "QUICK") {
      return Object.values(form.quickCounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
    }
    return form.rules.reduce((sum, rule) => sum + (Number(rule.count) || 0), 0);
  }

  function totalScore() {
    if (form.composeMode === "DETAILED") {
      return form.rules.reduce((sum, rule) => sum + (Number(rule.count) || 0) * (Number(rule.score) || 0), 0);
    }
    return questionCount() * (Number(form.defaultScore) || 1);
  }

  function canAdvance() {
    if (step === 0) return Boolean(form.name.trim());
    if (step === 1) {
      const bank = selectedBank();
      return Boolean(bank) && questionCount() > 0 && questionCount() <= bank.questionCount;
    }
    if (step === 2) return form.classIds.length > 0;
    return true;
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
      <button class="create-step${index === step ? " active" : ""}${index < step ? " complete" : ""}" type="button" data-go-step="${index}" ${index > step ? "disabled" : ""}>
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
          <div class="segmented" role="group" aria-label="考试类型">
            <button class="segment ${form.type === "PRACTICE" ? "active" : ""}" type="button" data-exam-type="PRACTICE">练习</button>
            <button class="segment ${form.type === "EXAM" ? "active" : ""}" type="button" data-exam-type="EXAM">考试</button>
          </div>
        </div>
        <div class="form-field">
          <label for="defaultScore">每题默认分值</label>
          <input id="defaultScore" data-field="defaultScore" type="number" min="0.5" step="0.5" value="${escapeHtml(form.defaultScore)}">
        </div>
        <div class="form-field">
          <label for="deadlineDate">截止日期</label>
          <input id="deadlineDate" data-field="deadlineDate" type="date" value="${escapeHtml(form.deadlineDate)}">
        </div>
        <div class="form-field">
          <label for="deadlineTime">截止时间</label>
          <input id="deadlineTime" data-field="deadlineTime" type="time" value="${escapeHtml(form.deadlineTime)}" ${form.deadlineDate ? "" : "disabled"}>
        </div>
        ${form.type === "EXAM" ? `
          <div class="form-field">
            <label for="timeLimitMin">答题时长</label>
            <input id="timeLimitMin" data-field="timeLimitMin" type="number" min="1" step="1" value="${escapeHtml(form.timeLimitMin)}" placeholder="不限时">
            <span class="form-hint">分钟</span>
          </div>
        ` : ""}
        <div class="form-field full">
          <div class="switch-row"><button class="switch" type="button" data-toggle="allowRepeat" aria-pressed="${form.allowRepeat}" aria-label="允许重复练习"></button><span class="switch-label">允许重复练习</span></div>
        </div>
        ${form.allowRepeat ? `
          <div class="form-field">
            <label for="repeatLimit">重做次数上限</label>
            <input id="repeatLimit" data-field="repeatLimit" type="number" min="1" step="1" value="${escapeHtml(form.repeatLimit)}" placeholder="不限">
          </div>
        ` : ""}
        <div class="form-field full">
          <div class="switch-row"><button class="switch" type="button" data-toggle="shuffleQuestions" aria-pressed="${form.shuffleQuestions}" aria-label="随机题目顺序"></button><span class="switch-label">随机题目顺序</span></div>
        </div>
        <div class="form-field full">
          <div class="switch-row"><button class="switch" type="button" data-toggle="shuffleOptions" aria-pressed="${form.shuffleOptions}" aria-label="随机选项顺序"></button><span class="switch-label">随机选项顺序</span></div>
        </div>
      </div>
      <div class="wizard-error" id="wizardError">请输入考试名称</div>
    `;
  }

  function filteredBanks() {
    const query = form.bankQuery.trim().toLowerCase();
    return banks.filter((bank) => {
      if (form.bankSubject && bank.subject !== form.bankSubject) return false;
      if (!query) return true;
      return `${bank.name} ${bank.subject}`.toLowerCase().includes(query);
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

  function bankListHtml() {
    const rows = filteredBanks();
    const paging = bankPageData(rows);
    return `
      <div class="bank-picker-list">
        ${paging.rows.length ? paging.rows.map((bank) => `
          <button class="bank-choice${form.bankId === bank.id ? " selected" : ""}" type="button" data-bank-id="${bank.id}">
            <span class="bank-radio">${form.bankId === bank.id ? icon("check", 12) : ""}</span>
            <span class="bank-choice-main">
              <span class="bank-choice-name">${escapeHtml(bank.name)}</span>
              <span class="bank-choice-meta">${subjectChip(bank.subject)}<span>${bank.questionCount} 道题</span></span>
            </span>
          </button>
        `).join("") : '<div class="empty-state" style="min-height:130px"><div class="empty-title">没有找到题库</div></div>'}
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

  function selectedBankHtml() {
    const bank = selectedBank();
    if (!bank) {
      return '<aside class="selected-bank empty"><div class="selected-bank-kicker">已选题库</div><div class="selected-bank-empty">从左侧选择一个题库，试卷会保存独立的题目快照。</div></aside>';
    }
    return `
      <aside class="selected-bank">
        <div class="selected-bank-kicker">已选题库</div>
        <div class="selected-bank-name">${escapeHtml(bank.name)}</div>
        <div class="selected-bank-meta">${subjectChip(bank.subject)}<span>${bank.questionCount} 道题</span></div>
      </aside>
    `;
  }

  function quickDifficultyChips() {
    return `
      <div class="difficulty-row" aria-label="难度">
        ${DIFFICULTIES.map((item) => `<button class="choice-chip${form.quickDifficulty === item.value ? " active" : ""}" type="button" data-quick-difficulty="${item.value}">${item.label}</button>`).join("")}
      </div>
    `;
  }

  function rulesHtml() {
    return `
      <div class="rule-list">
        ${form.rules.map((rule, index) => `
          <div class="rule-card" data-rule-index="${index}">
            <div class="rule-head"><span>规则 ${index + 1}</span><button class="rule-remove" type="button" data-remove-rule="${index}" aria-label="删除第 ${index + 1} 条规则">${icon("x", 14)}</button></div>
            <div class="rule-inputs">
              <input data-rule-field="unit" value="${escapeHtml(rule.unit)}" aria-label="第 ${index + 1} 条规则的单元" placeholder="单元">
              <input data-rule-field="knowledgePoint" value="${escapeHtml(rule.knowledgePoint)}" aria-label="第 ${index + 1} 条规则的知识点" placeholder="知识点">
            </div>
            <div class="rule-controls">
              <div class="segmented" role="group" aria-label="第 ${index + 1} 条规则的题型">
                ${QUESTION_TYPES.map((type) => `<button class="segment${rule.type === type.value ? " active" : ""}" type="button" data-rule-type="${type.value}">${type.label}</button>`).join("")}
              </div>
              <input data-rule-field="count" type="number" min="0" value="${escapeHtml(rule.count)}" aria-label="第 ${index + 1} 条规则数量" placeholder="数量">
              <input data-rule-field="score" type="number" min="0.5" step="0.5" value="${escapeHtml(rule.score)}" aria-label="第 ${index + 1} 条规则分值" placeholder="分值">
            </div>
            <div class="difficulty-row" aria-label="第 ${index + 1} 条规则难度">
              ${DIFFICULTIES.map((difficulty) => `<button class="choice-chip${rule.difficulty === difficulty.value ? " active" : ""}" type="button" data-rule-difficulty="${difficulty.value}">${difficulty.label}</button>`).join("")}
            </div>
          </div>
        `).join("")}
      </div>
      <button class="add-rule" type="button" data-add-rule>${icon("plus", 13)}添加规则</button>
    `;
  }

  function composeHtml() {
    if (!selectedBank()) return "";
    const total = questionCount();
    const bankTotal = selectedBank().questionCount;
    const overLimit = total > bankTotal;
    return `
      <div class="compose-block">
        <div class="compose-heading">组卷方式</div>
        <div class="compose-sub">试卷保存题目快照，之后修改或删除原题不会改变卷面。</div>
        <div class="compose-modes" role="group" aria-label="组卷方式">
          ${[
            ["WHOLE", "整库组卷", `使用全部 ${bankTotal} 道题`],
            ["QUICK", "快捷组卷", "按题型设置题量"],
            ["DETAILED", "明细组卷", "逐条指定题目范围"],
          ].map(([value, title, description]) => `
            <button class="compose-mode${form.composeMode === value ? " active" : ""}" type="button" data-compose-mode="${value}">
              <strong>${title}</strong><span>${description}</span>
            </button>
          `).join("")}
        </div>
        <div class="compose-detail">
          ${form.composeMode === "WHOLE" ? `<div class="whole-summary">将把题库中的 <strong>${bankTotal}</strong> 道题复制为试卷快照，每题默认 <strong>${escapeHtml(form.defaultScore || "1")}</strong> 分。</div>` : ""}
          ${form.composeMode === "QUICK" ? `
            <div class="quick-grid">
              ${QUESTION_TYPES.map((type) => `
                <label class="quick-field">${type.label}<input type="number" min="0" data-quick-type="${type.value}" value="${escapeHtml(form.quickCounts[type.value])}"></label>
              `).join("")}
            </div>
            ${quickDifficultyChips()}
          ` : ""}
          ${form.composeMode === "DETAILED" ? rulesHtml() : ""}
          <div class="whole-summary" id="composeEstimate" style="margin-top:10px">
            共 <strong>${total}</strong> 题 · 满分 <strong>${Math.round(totalScore() * 10) / 10}</strong> 分
            ${overLimit ? `<span style="color:#b42318">，超过题库可用题量 ${bankTotal}</span>` : ""}
          </div>
        </div>
      </div>
    `;
  }

  function renderStep1() {
    if (!form.bankQuery && !form.bankSubject) bankPage = Math.min(bankPage, Math.max(1, Math.ceil(banks.length / PAGE_SIZE)));
    els.content.innerHTML = `
      <h2 class="step-heading">选择题库</h2>
      <p class="step-copy">考试内容来自一个题库；若当前题库不完整，可以返回题库管理继续补充。</p>
      <div class="bank-search-row">
        <label class="search-box" id="bankSearchBox">
          <span class="search-icon">${icon("search", 16)}</span>
          <span class="sr-only">搜索题库</span>
          <input id="bankSearch" type="search" autocomplete="off" placeholder="搜索题库名称" value="${escapeHtml(form.bankQuery)}">
        </label>
      </div>
      <div class="subject-chips" id="subjectChips">
        <button class="subject-filter-chip${!form.bankSubject ? " active" : ""}" type="button" data-bank-subject="">全部科目</button>
        ${subjects.map((subject) => `<button class="subject-filter-chip${form.bankSubject === subject ? " active" : ""}" type="button" data-bank-subject="${escapeHtml(subject)}">${escapeHtml(subject)}</button>`).join("")}
      </div>
      <div class="bank-picker-layout${selectedBank() ? "" : " no-selection"}">
        <div id="bankListContainer">${bankListHtml()}</div>
        ${selectedBank() ? selectedBankHtml() : ""}
      </div>
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
    if (form.composeMode === "WHOLE") return "整库组卷";
    if (form.composeMode === "QUICK") return `快捷组卷 · ${questionCount()} 题`;
    return `明细组卷 · ${form.rules.length} 条规则`;
  }

  function renderStep3() {
    const bank = selectedBank();
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
            <div class="review-line"><span>截止时间</span><strong>${form.deadlineDate ? `${form.deadlineDate} ${form.deadlineTime || "23:59"}` : "不限"}</strong></div>
            <div class="review-line"><span>答题时长</span><strong>${form.type === "EXAM" && form.timeLimitMin ? `${form.timeLimitMin} 分钟` : "不限"}</strong></div>
            <div class="review-line"><span>可重做</span><strong>${form.allowRepeat ? (form.repeatLimit ? `${form.repeatLimit} 次` : "不限次数") : "否"}</strong></div>
          </div>
        </div>
        <div class="review-block">
          <h3>试卷信息</h3>
          <div class="review-list">
            <div class="review-line"><span>题库</span><strong>${escapeHtml(bank?.name || "—")}</strong></div>
            <div class="review-line"><span>组卷方式</span><strong>${summarizeCompose()}</strong></div>
            <div class="review-line"><span>参与班级</span><strong>${escapeHtml(classesText || "—")}</strong></div>
            <div class="review-line"><span>随机题目</span><strong>${form.shuffleQuestions ? "是" : "否"}</strong></div>
            <div class="review-line"><span>随机选项</span><strong>${form.shuffleOptions ? "是" : "否"}</strong></div>
          </div>
        </div>
      </div>
      <div class="review-total"><span>共 ${questionCount()} 题 · ${selectedClasses().length} 个班级</span><strong>${Math.round(totalScore() * 10) / 10} 分</strong></div>
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
      const bank = selectedBank();
      if (!bank) {
        showError("请选择题库");
        return;
      }
      if (questionCount() <= 0) {
        showError("请设置至少 1 道题");
        return;
      }
      if (questionCount() > bank.questionCount) {
        showError(`组卷题量不能超过题库的 ${bank.questionCount} 道题`);
        return;
      }
    }
    if (step === 2 && !form.classIds.length) {
      showError("至少选择一个班级");
      return;
    }
    if (step === 3) {
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

  function updateComposeEstimate() {
    const estimate = document.getElementById("composeEstimate");
    if (estimate) {
      const total = questionCount();
      const bank = selectedBank();
      estimate.innerHTML = `共 <strong>${total}</strong> 题 · 满分 <strong>${Math.round(totalScore() * 10) / 10}</strong> 分${bank && total > bank.questionCount ? `<span style="color:#b42318">，超过题库可用题量 ${bank.questionCount}</span>` : ""}`;
    }
    renderFooter();
  }

  els.content.addEventListener("input", (event) => {
    const target = event.target;
    if (target.id === "bankSearch") {
      form.bankQuery = target.value;
      bankPage = 1;
      const list = document.getElementById("bankListContainer");
      if (list) list.innerHTML = bankListHtml();
      return;
    }
    if (target.dataset.field) {
      form[target.dataset.field] = target.value;
      if (target.dataset.field === "deadlineDate") {
        const timeInput = document.getElementById("deadlineTime");
        if (timeInput) timeInput.disabled = !target.value;
      }
      document.getElementById("wizardError")?.classList.remove("show");
      renderFooter();
      return;
    }
    if (target.dataset.quickType) {
      form.quickCounts[target.dataset.quickType] = target.value;
      updateComposeEstimate();
      return;
    }
    if (target.dataset.ruleField) {
      const row = target.closest("[data-rule-index]");
      if (!row) return;
      const rule = form.rules[Number(row.dataset.ruleIndex)];
      if (rule) rule[target.dataset.ruleField] = target.value;
      updateComposeEstimate();
    }
  });

  els.content.addEventListener("click", (event) => {
    const examType = event.target.closest("[data-exam-type]");
    if (examType) {
      form.type = examType.dataset.examType;
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
    const subjectButton = event.target.closest("[data-bank-subject]");
    if (subjectButton) {
      form.bankSubject = subjectButton.dataset.bankSubject;
      bankPage = 1;
      renderStep1();
      return;
    }
    const bankPageButton = event.target.closest("[data-bank-page]");
    if (bankPageButton) {
      bankPage = Number(bankPageButton.dataset.bankPage);
      const list = document.getElementById("bankListContainer");
      if (list) list.innerHTML = bankListHtml();
      return;
    }
    const bankChoice = event.target.closest("[data-bank-id]");
    if (bankChoice) {
      form.bankId = Number(bankChoice.dataset.bankId);
      form.composeMode = "WHOLE";
      renderStep1();
      return;
    }
    const mode = event.target.closest("[data-compose-mode]");
    if (mode) {
      form.composeMode = mode.dataset.composeMode;
      renderStep1();
      return;
    }
    const quickDifficulty = event.target.closest("[data-quick-difficulty]");
    if (quickDifficulty) {
      form.quickDifficulty = quickDifficulty.dataset.quickDifficulty;
      renderStep1();
      return;
    }
    const ruleType = event.target.closest("[data-rule-type]");
    if (ruleType) {
      const index = Number(ruleType.closest("[data-rule-index]").dataset.ruleIndex);
      if (form.rules[index]) form.rules[index].type = ruleType.dataset.ruleType;
      renderStep1();
      return;
    }
    const ruleDifficulty = event.target.closest("[data-rule-difficulty]");
    if (ruleDifficulty) {
      const index = Number(ruleDifficulty.closest("[data-rule-index]").dataset.ruleIndex);
      if (form.rules[index]) form.rules[index].difficulty = ruleDifficulty.dataset.ruleDifficulty;
      renderStep1();
      return;
    }
    const addRule = event.target.closest("[data-add-rule]");
    if (addRule) {
      form.rules.push({ unit: "", knowledgePoint: "", type: "SINGLE_CHOICE", difficulty: "", count: "5", score: "1" });
      renderStep1();
      return;
    }
    const removeRule = event.target.closest("[data-remove-rule]");
    if (removeRule) {
      form.rules.splice(Number(removeRule.dataset.removeRule), 1);
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

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-demo-link]")) {
      event.preventDefault();
      toast("演示只包含题库管理与考试管理页");
    }
    const toastTrigger = event.target.closest("[data-toast]");
    if (toastTrigger) toast(toastTrigger.dataset.toast);
  });

  render();
})();
