(() => {
  const {
    subjects,
    subjectColors,
    formatDate,
    pageItems,
    pageNumbers,
    escapeHtml,
    icon,
    normalize,
  } = window.DEMO;
  const { exams, classes, now, statusOf, classNames } = window.EXAM_DEMO;

  document.querySelectorAll("[data-icon]").forEach((node) => {
    node.innerHTML = icon(node.dataset.icon, 16);
  });

  const statusDefs = [
    { value: "all", label: "全部" },
    { value: "active", label: "进行中" },
    { value: "expired", label: "已截止" },
    { value: "archived", label: "已下架" },
  ];
  const typeDefs = [
    { value: "", label: "全部类型" },
    { value: "EXAM", label: "考试" },
    { value: "PRACTICE", label: "练习" },
  ];
  const activeTotal = exams.filter((exam) => statusOf(exam) !== "archived").length;
  const archivedTotal = exams.filter((exam) => statusOf(exam) === "archived").length;

  let status = "all";
  let classId = "";
  let subject = "";
  let examType = "";
  let query = "";
  let sort = "recent";
  let page = 1;
  let openMenuType = null;
  let openMenuTrigger = null;
  let moreExamId = null;
  const pageSize = 8;

  const els = {
    sidebar: document.getElementById("sidebar"),
    navScrim: document.getElementById("navScrim"),
    navOpen: document.getElementById("navOpen"),
    navClose: document.getElementById("navClose"),
    activeCount: document.getElementById("activeCount"),
    archivedCount: document.getElementById("archivedCount"),
    searchBox: document.getElementById("searchBox"),
    searchInput: document.getElementById("searchInput"),
    searchClear: document.getElementById("searchClear"),
    statusTabsMobile: document.getElementById("statusTabsMobile"),
    examFacets: document.getElementById("examFacets"),
    resultTitle: document.getElementById("resultTitle"),
    resultCount: document.getElementById("resultCount"),
    filterSummary: document.getElementById("filterSummary"),
    examList: document.getElementById("examList"),
    emptyState: document.getElementById("emptyState"),
    pagination: document.getElementById("pagination"),
    pageSummary: document.getElementById("pageSummary"),
    pager: document.getElementById("pager"),
    commandScrim: document.getElementById("commandScrim"),
    commandPopover: document.getElementById("commandPopover"),
    moreMenu: document.getElementById("examMoreMenu"),
    newExamButton: document.getElementById("newExamButton"),
    toastRegion: document.getElementById("toastRegion"),
  };

  function subjectColor(value) {
    return (subjectColors[value] || {}).fg || "#7b8493";
  }

  function subjectChip(value) {
    if (!value) return '<span class="subject-none">未归类</span>';
    const colors = subjectColors[value] || { bg: "#eef0f5", fg: "#414755" };
    return `<span class="subject-chip" style="background:${colors.bg};color:${colors.fg}">${escapeHtml(value)}</span>`;
  }

  function classOf(id) {
    return classes.find((item) => String(item.id) === String(id));
  }

  function queryMatches(exam) {
    const tokens = normalize(query).split(" ").filter(Boolean);
    const typeLabel = exam.type === "EXAM" ? "考试" : "练习";
    const haystack = normalize(`${exam.name} ${exam.subject} ${typeLabel} ${classNames(exam).join(" ")}`);
    return tokens.every((token) => haystack.includes(token));
  }

  function statusMatches(exam) {
    const value = statusOf(exam);
    if (status === "all") return value !== "archived";
    return value === status;
  }

  function matchesClass(exam) {
    return !classId || exam.classIds.some((id) => String(id) === String(classId));
  }

  function matchesSubject(exam) {
    return !subject || exam.subject === subject;
  }

  function matchesType(exam) {
    return !examType || exam.type === examType;
  }

  function matchingBeforeStatus() {
    return exams.filter((exam) => queryMatches(exam) && matchesClass(exam) && matchesSubject(exam) && matchesType(exam));
  }

  function matchingBeforeClass() {
    return exams.filter((exam) => queryMatches(exam) && statusMatches(exam) && matchesSubject(exam) && matchesType(exam));
  }

  function matchingBeforeSubject() {
    return exams.filter((exam) => queryMatches(exam) && statusMatches(exam) && matchesClass(exam) && matchesType(exam));
  }

  function matchingBeforeType() {
    return exams.filter((exam) => queryMatches(exam) && statusMatches(exam) && matchesClass(exam) && matchesSubject(exam));
  }

  function statusCounts() {
    const rows = matchingBeforeStatus();
    const result = { all: 0, active: 0, expired: 0, archived: 0 };
    for (const exam of rows) {
      const value = statusOf(exam);
      result[value] += 1;
      if (value !== "archived") result.all += 1;
    }
    return result;
  }

  function classCounts() {
    const rows = matchingBeforeClass();
    const result = { all: rows.length };
    for (const item of classes) {
      result[item.id] = rows.filter((exam) => exam.classIds.includes(item.id)).length;
    }
    return result;
  }

  function subjectCounts() {
    const rows = matchingBeforeSubject();
    const result = { all: rows.length };
    for (const name of subjects) {
      result[name] = rows.filter((exam) => exam.subject === name).length;
    }
    return result;
  }

  function typeCounts() {
    const rows = matchingBeforeType();
    return {
      all: rows.length,
      EXAM: rows.filter((exam) => exam.type === "EXAM").length,
      PRACTICE: rows.filter((exam) => exam.type === "PRACTICE").length,
    };
  }

  function currentRows() {
    const rows = exams.filter((exam) => queryMatches(exam) && statusMatches(exam) && matchesClass(exam) && matchesSubject(exam) && matchesType(exam));
    return rows.sort((left, right) => {
      if (sort === "deadline") {
        const leftDeadline = left.deadline ? new Date(left.deadline).getTime() : Number.POSITIVE_INFINITY;
        const rightDeadline = right.deadline ? new Date(right.deadline).getTime() : Number.POSITIVE_INFINITY;
        const leftPast = leftDeadline < now.getTime();
        const rightPast = rightDeadline < now.getTime();
        if (leftPast !== rightPast) return leftPast ? 1 : -1;
        return leftDeadline - rightDeadline;
      }
      if (sort === "attempts") return right.attemptCount - left.attemptCount || right.id - left.id;
      return new Date(right.createdAt) - new Date(left.createdAt) || right.id - left.id;
    });
  }

  function renderStatusTabs(counts) {
    els.statusTabsMobile.innerHTML = statusDefs.map((item) => `
      <button class="status-tab${status === item.value ? " active" : ""}${counts[item.value] === 0 && status !== item.value ? " is-zero" : ""}" type="button" data-status="${item.value}" aria-pressed="${status === item.value}" ${counts[item.value] === 0 && status !== item.value ? "disabled" : ""}>
        ${item.label}<span>${counts[item.value]}</span>
      </button>
    `).join("");
  }

  function facetButton(group, value, label, visual, count = 0) {
    return `
      <button class="facet-button" type="button" data-facet-group="${group}" data-facet-value="${escapeHtml(value)}">
        ${visual}
        <span class="facet-label">${escapeHtml(label)}</span>
        <span class="facet-count">${count}</span>
      </button>
    `;
  }

  function buildFacets() {
    const statusButtons = statusDefs.map((item) =>
      facetButton("status", item.value, item.label, `<span class="status-dot ${item.value === "all" ? "" : item.value}"></span>`),
    ).join("");
    const typeButtons = typeDefs.filter((item) => item.value).map((item) => `
      <button class="type-filter-pill" type="button" data-facet-group="type" data-facet-value="${item.value}">
        <span class="facet-dot" style="background:${item.value === "EXAM" ? "#d75c52" : "#2d8cf0"}"></span>
        <span>${item.label}</span>
        <span class="facet-count">0</span>
      </button>
    `).join("");
    const classButtons = [
      facetButton("class", "", "全部班级", `<span class="facet-icon">${icon("users", 14)}</span>`),
      ...classes.map((item) => facetButton("class", String(item.id), item.name, '<span class="facet-dot" style="background:#7f8ca1"></span>')),
    ].join("");
    const subjectButtons = [
      facetButton("subject", "", "全部科目", '<span class="facet-dot" style="background:var(--primary)"></span>'),
      ...subjects.map((name) => facetButton("subject", name, name, `<span class="facet-dot" style="background:${subjectColor(name)}"></span>`)),
    ].join("");

    els.examFacets.innerHTML = `
      <div class="exam-facet-title">状态</div>
      <div class="facet-list">${statusButtons}</div>
      <div class="exam-facet-title">练习类型</div>
      <div class="type-filter-row" role="group" aria-label="练习类型">${typeButtons}</div>
      <div class="exam-facet-title">班级</div>
      <div class="facet-list">${classButtons}</div>
      <div class="exam-facet-title">科目</div>
      <div class="facet-list">${subjectButtons}</div>
    `;
  }

  function updateFacets(counts, classCount, subjectCount, typeCount) {
    const valuesByGroup = {
      status: counts,
      type: typeCount,
      class: classCount,
      subject: subjectCount,
    };
    els.examFacets.querySelectorAll("[data-facet-group]").forEach((button) => {
      const group = button.dataset.facetGroup;
      const value = button.dataset.facetValue;
      const count = group === "class"
        ? (value ? classCount[value] || 0 : classCount.all)
        : group === "subject"
          ? (value ? subjectCount[value] || 0 : subjectCount.all)
          : group === "type"
            ? (value ? typeCount[value] || 0 : typeCount.all)
            : valuesByGroup[group][value] ?? 0;
      const active = group === "status"
        ? status === value
        : group === "type"
          ? examType === value
          : group === "class"
            ? (value ? String(classId) === value : !classId)
            : subject === value;
      button.classList.toggle("active", active);
      button.classList.toggle("is-zero", count === 0);
      button.disabled = count === 0 && !active;
      button.setAttribute("aria-pressed", String(active));
      button.querySelector(".facet-count").textContent = count;
    });
  }

  function renderTriggerLabels() {
    const classItem = classOf(classId);
    document.querySelectorAll("[data-class-label]").forEach((node) => {
      node.textContent = classItem?.name || "全部班级";
    });
    document.querySelectorAll("[data-subject-label]").forEach((node) => {
      node.textContent = subject || "全部科目";
    });
    document.querySelectorAll("[data-subject-dot]").forEach((node) => {
      node.style.background = subject ? subjectColor(subject) : "var(--primary)";
    });
    document.querySelectorAll("[data-type-label]").forEach((node) => {
      node.textContent = typeDefs.find((item) => item.value === examType)?.label || "全部类型";
    });
    const labels = { recent: "最近创建", deadline: "截止日期", attempts: "作答人数" };
    document.querySelectorAll("[data-sort-label]").forEach((node) => {
      node.textContent = labels[sort];
    });
  }

  function displayClasses(exam) {
    const names = classNames(exam);
    if (!names.length) return "";
    if (names.length === 1) return names[0];
    return `${names[0]} +${names.length - 1}`;
  }

  function shortDate(value) {
    return formatDate(String(value).slice(0, 10));
  }

  function deadlineDate(value) {
    const date = new Date(value);
    if (date.getFullYear() === now.getFullYear()) return shortDate(value);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  }

  function deadlineNote(exam) {
    if (exam.archived) return `下架于 ${shortDate(exam.deletedAt)}`;
    if (!exam.deadline) return '<span class="deadline-note">不限截止</span>';
    const deadline = new Date(exam.deadline);
    const deadlineLabel = `截止 ${deadlineDate(exam.deadline)}`;
    const difference = deadline.getTime() - now.getTime();
    const className = difference < 0 ? " over" : difference < 7 * 86400000 ? " soon" : "";
    return `<span class="deadline-note${className}">${deadlineLabel}</span>`;
  }

  function examRow(exam) {
    const statusValue = statusOf(exam);
    const typeLabel = exam.type === "EXAM" ? "考试" : "练习";
    const statusLabel = { active: "进行中", expired: "已截止", archived: "已下架" }[statusValue];
    const actionLabel = statusValue === "archived" ? "查看历史" : "查看试卷";
    return `
      <article class="exam-row${statusValue === "archived" ? " archived" : ""}" data-exam-id="${exam.id}">
        <div class="exam-icon${exam.type === "EXAM" ? " exam" : ""}" role="img" aria-label="${typeLabel}">${icon("file", 16)}</div>
        <div class="exam-main">
          <div class="exam-title-line">
            <button class="exam-name" type="button" data-exam-action="view" data-id="${exam.id}" title="${escapeHtml(exam.name)}">${escapeHtml(exam.name)}</button>
            ${exam.allowRepeat ? `<span class="repeat-badge">可重做${exam.repeatLimit ? ` ×${exam.repeatLimit}` : ""}</span>` : ""}
          </div>
          <div class="exam-meta">
            <span class="status-badge ${statusValue}">${statusLabel}</span>
            ${subjectChip(exam.subject)}
            <span class="meta-separator"></span>
            <span class="class-name">${icon("users", 13)}${escapeHtml(displayClasses(exam))}</span>
            <span class="exam-question-count">${exam.questionCount} 题</span>
            <span class="exam-attempt-count">${exam.attemptCount} 人作答</span>
            ${deadlineNote(exam)}
          </div>
        </div>
        <div class="exam-end">
          <span class="exam-date" title="创建时间">${shortDate(exam.createdAt)}</span>
          <span class="exam-deadline-right">${deadlineNote(exam)}</span>
          <div class="exam-actions">
            ${exam.attemptCount > 0 ? `<button class="text-action stats" type="button" data-exam-action="stats" data-id="${exam.id}" title="查看统计">${icon("barChart", 14)}<span class="action-label">统计</span></button>` : ""}
            <button class="text-action" type="button" data-exam-action="view" data-id="${exam.id}" title="${actionLabel}">${icon("arrow", 14)}<span class="action-label">${actionLabel}</span></button>
            <button class="icon-action" type="button" data-exam-action="more" data-id="${exam.id}" aria-label="${escapeHtml(exam.name)} 的更多操作">${icon("more", 17)}</button>
          </div>
          <span class="exam-attempts-mobile">${exam.attemptCount} 人作答</span>
        </div>
      </article>
    `;
  }

  function render() {
    const counts = statusCounts();
    const classCount = classCounts();
    const subjectCount = subjectCounts();
    const typeCount = typeCounts();
    renderStatusTabs(counts);
    updateFacets(counts, classCount, subjectCount, typeCount);
    renderTriggerLabels();
    const rows = currentRows();
    const paging = pageItems(rows.length, page, pageSize);
    page = paging.current;
    const visible = rows.slice(paging.start, paging.end);
    const statusLabel = statusDefs.find((item) => item.value === status)?.label || "全部";
    const classItem = classOf(classId);

    els.activeCount.textContent = String(activeTotal);
    els.archivedCount.textContent = String(archivedTotal);
    els.searchBox.classList.toggle("has-query", Boolean(query));
    els.resultTitle.textContent = status === "all" ? "全部考试/练习" : statusLabel;
    els.resultCount.textContent = `${rows.length} 个`;
    els.filterSummary.innerHTML = [
      examType ? `<span class="filter-summary-chip">${typeDefs.find((item) => item.value === examType)?.label}</span>` : "",
      classItem ? `<span class="filter-summary-chip">${escapeHtml(classItem.name)}</span>` : "",
      subject ? `<span class="filter-summary-chip">${escapeHtml(subject)}</span>` : "",
    ].join("");
    els.examList.innerHTML = visible.map(examRow).join("");
    els.emptyState.hidden = rows.length !== 0;

    const showPaging = rows.length > pageSize;
    els.pagination.style.display = rows.length ? "flex" : "none";
    els.pageSummary.textContent = rows.length
      ? `第 ${paging.current} / ${paging.totalPages} 页 · 共 ${rows.length} 个`
      : "";
    els.pager.innerHTML = !showPaging ? "" : `
      <button class="page-button" type="button" data-page="${paging.current - 1}" ${paging.current === 1 ? "disabled" : ""} aria-label="上一页">${icon("chevronLeft", 16)}</button>
      ${pageNumbers(paging.current, paging.totalPages).map((item) => item === "…"
        ? '<span class="page-gap">…</span>'
        : `<button class="page-button${item === paging.current ? " active" : ""}" type="button" data-page="${item}" ${item === paging.current ? 'aria-current="page"' : ""}>${item}</button>`
      ).join("")}
      <button class="page-button" type="button" data-page="${paging.current + 1}" ${paging.current === paging.totalPages ? "disabled" : ""} aria-label="下一页">${icon("chevronRight", 16)}</button>
    `;
  }

  function toast(message) {
    const node = document.createElement("div");
    node.className = "toast success";
    node.innerHTML = `${icon("check", 16)}<span>${escapeHtml(message)}</span>`;
    els.toastRegion.appendChild(node);
    window.setTimeout(() => node.remove(), 2600);
  }

  function openExamStats(exam) {
    window.location.href = `./exam-stats.html?id=${exam.id}`;
  }

  function closeCommandMenu() {
    if (!openMenuType) return;
    openMenuType = null;
    document.body.classList.remove("filter-open");
    els.commandPopover.classList.remove("open", "sheet");
    els.commandScrim.classList.remove("open");
    document.querySelectorAll("[data-menu]").forEach((button) => button.setAttribute("aria-expanded", "false"));
    openMenuTrigger = null;
  }

  function openCommandMenu(type, trigger) {
    closeCommandMenu();
    openMenuType = type;
    openMenuTrigger = trigger;
    const counts = type === "class" ? classCounts() : type === "subject" ? subjectCounts() : typeCounts();
    if (type === "class") {
      els.commandPopover.innerHTML = `
        <div class="command-title">选择班级</div>
        <button class="command-option${!classId ? " selected" : ""}" type="button" data-pick-class="">
          <span class="option-label">全部班级</span>
          <span class="option-count">${counts.all}</span>
          <span class="check">${icon("check", 15)}</span>
        </button>
        ${classes.map((item) => `
          <button class="command-option${String(item.id) === String(classId) ? " selected" : ""}" type="button" data-pick-class="${item.id}" ${counts[item.id] === 0 && String(item.id) !== String(classId) ? "disabled" : ""}>
            <span class="option-label">${escapeHtml(item.name)}</span>
            <span class="option-count">${counts[item.id]}</span>
            <span class="check">${icon("check", 15)}</span>
          </button>
        `).join("")}
      `;
    } else if (type === "subject") {
      els.commandPopover.innerHTML = `
        <div class="command-title">选择科目</div>
        <button class="command-option${!subject ? " selected" : ""}" type="button" data-pick-subject="">
          <span class="facet-dot" style="background:var(--primary)"></span>
          <span class="option-label">全部科目</span>
          <span class="option-count">${counts.all}</span>
          <span class="check">${icon("check", 15)}</span>
        </button>
        ${subjects.map((name) => `
          <button class="command-option${subject === name ? " selected" : ""}" type="button" data-pick-subject="${escapeHtml(name)}" ${counts[name] === 0 && subject !== name ? "disabled" : ""}>
            <span class="facet-dot" style="background:${subjectColor(name)}"></span>
            <span class="option-label">${escapeHtml(name)}</span>
            <span class="option-count">${counts[name]}</span>
            <span class="check">${icon("check", 15)}</span>
          </button>
        `).join("")}
      `;
    } else if (type === "type") {
      els.commandPopover.innerHTML = `
        <div class="command-title">选择练习类型</div>
        ${typeDefs.map((item) => `
          <button class="command-option${examType === item.value ? " selected" : ""}" type="button" data-pick-type="${item.value}" ${counts[item.value || "all"] === 0 && examType !== item.value ? "disabled" : ""}>
            <span class="option-label">${item.label}</span>
            <span class="option-count">${counts[item.value || "all"]}</span>
            <span class="check">${icon("check", 15)}</span>
          </button>
        `).join("")}
      `;
    } else {
      els.commandPopover.innerHTML = `
        <div class="command-title">排序方式</div>
        ${[
          ["recent", "最近创建"],
          ["deadline", "截止日期"],
          ["attempts", "作答人数"],
        ].map(([value, label]) => `
          <button class="command-option${sort === value ? " selected" : ""}" type="button" data-pick-sort="${value}">
            <span class="option-label">${label}</span>
            <span class="check">${icon("check", 15)}</span>
          </button>
        `).join("")}
      `;
    }
    trigger.setAttribute("aria-expanded", "true");
    els.commandScrim.classList.add("open");
    els.commandPopover.classList.add("open");
    const isSheet = window.innerWidth <= 640;
    els.commandPopover.classList.toggle("sheet", isSheet);
    if (isSheet) {
      document.body.classList.add("filter-open");
      els.commandPopover.style.left = "";
      els.commandPopover.style.top = "";
    } else {
      const rect = trigger.getBoundingClientRect();
      const menuRect = els.commandPopover.getBoundingClientRect();
      const left = Math.min(window.innerWidth - menuRect.width - 10, Math.max(10, rect.right - menuRect.width));
      const below = rect.bottom + 7;
      const top = below + menuRect.height > window.innerHeight - 10
        ? Math.max(10, rect.top - menuRect.height - 7)
        : below;
      els.commandPopover.style.left = `${left}px`;
      els.commandPopover.style.top = `${top}px`;
    }
  }

  function toggleCommandMenu(type, trigger) {
    if (openMenuType === type && openMenuTrigger === trigger) closeCommandMenu();
    else openCommandMenu(type, trigger);
  }

  function setStatus(next) {
    status = next;
    page = 1;
    reconcileDependentFilters();
    render();
  }

  function setClassFilter(next) {
    classId = next;
    page = 1;
    closeCommandMenu();
    render();
  }

  function setSubjectFilter(next) {
    subject = next;
    page = 1;
    closeCommandMenu();
    render();
  }

  function setExamType(next) {
    examType = next;
    page = 1;
    closeCommandMenu();
    reconcileDependentFilters();
    render();
  }

  function reconcileDependentFilters() {
    if (classId) {
      const hasRows = exams.some((exam) =>
        queryMatches(exam) &&
        statusMatches(exam) &&
        matchesType(exam) &&
        matchesSubject(exam) &&
        exam.classIds.some((id) => String(id) === String(classId)),
      );
      if (!hasRows) classId = "";
    }
    if (subject) {
      const hasRows = exams.some((exam) =>
        queryMatches(exam) &&
        statusMatches(exam) &&
        matchesType(exam) &&
        matchesClass(exam) &&
        exam.subject === subject,
      );
      if (!hasRows) subject = "";
    }
    if (examType) {
      const hasRows = exams.some((exam) =>
        queryMatches(exam) &&
        statusMatches(exam) &&
        matchesClass(exam) &&
        matchesSubject(exam) &&
        exam.type === examType,
      );
      if (!hasRows) examType = "";
    }
  }

  function openMoreMenu(button, examId) {
    moreExamId = examId;
    els.moreMenu.classList.add("open");
    const rect = button.getBoundingClientRect();
    const menuRect = els.moreMenu.getBoundingClientRect();
    const left = Math.min(window.innerWidth - menuRect.width - 10, Math.max(10, rect.right - menuRect.width));
    const below = rect.bottom + 6;
    const top = below + menuRect.height > window.innerHeight - 10 ? rect.top - menuRect.height - 6 : below;
    els.moreMenu.style.left = `${left}px`;
    els.moreMenu.style.top = `${Math.max(10, top)}px`;
    els.moreMenu.querySelector(".menu-item").focus();
  }

  function closeMoreMenu() {
    els.moreMenu.classList.remove("open");
    moreExamId = null;
  }

  function syncNavAccessibility() {
    if (window.innerWidth > 860) {
      document.body.classList.remove("nav-open");
      els.sidebar.classList.remove("open");
      els.sidebar.removeAttribute("inert");
      els.navScrim.classList.remove("open");
      els.navOpen.setAttribute("aria-expanded", "false");
    } else if (!els.sidebar.classList.contains("open")) {
      els.sidebar.setAttribute("inert", "");
    }
  }

  function openNav() {
    els.sidebar.classList.add("open");
    els.sidebar.removeAttribute("inert");
    els.navScrim.classList.add("open");
    document.body.classList.add("nav-open");
    els.navOpen.setAttribute("aria-expanded", "true");
    window.setTimeout(() => els.navClose.focus(), 30);
  }

  function closeNav() {
    if (!els.sidebar.classList.contains("open")) return;
    els.sidebar.classList.remove("open");
    els.navScrim.classList.remove("open");
    document.body.classList.remove("nav-open");
    els.navOpen.setAttribute("aria-expanded", "false");
    if (window.innerWidth <= 860) els.sidebar.setAttribute("inert", "");
    els.navOpen.focus();
  }

  els.navOpen.addEventListener("click", openNav);
  els.navClose.addEventListener("click", closeNav);
  els.navScrim.addEventListener("click", closeNav);

  els.statusTabsMobile.addEventListener("click", (event) => {
    const button = event.target.closest("[data-status]");
    if (button) setStatus(button.dataset.status);
  });

  els.examFacets.addEventListener("click", (event) => {
    const button = event.target.closest("[data-facet-group]");
    if (!button || button.disabled) return;
    const { facetGroup: group, facetValue: value } = button.dataset;
    if (group === "status") setStatus(value);
    if (group === "type") setExamType(examType === value ? "" : value);
    if (group === "class") setClassFilter(value);
    if (group === "subject") setSubjectFilter(value);
  });

  els.searchInput.addEventListener("input", () => {
    query = els.searchInput.value.trim();
    page = 1;
    render();
  });
  els.searchClear.addEventListener("click", () => {
    els.searchInput.value = "";
    query = "";
    page = 1;
    render();
    els.searchInput.focus();
  });

  document.addEventListener("click", (event) => {
    const menuButton = event.target.closest("[data-menu]");
    if (menuButton) {
      toggleCommandMenu(menuButton.dataset.menu, menuButton);
      return;
    }

    const classOption = event.target.closest("[data-pick-class]");
    if (classOption) {
      setClassFilter(classOption.dataset.pickClass);
      return;
    }
    const subjectOption = event.target.closest("[data-pick-subject]");
    if (subjectOption) {
      setSubjectFilter(subjectOption.dataset.pickSubject);
      return;
    }
    const typeOption = event.target.closest("[data-pick-type]");
    if (typeOption) {
      setExamType(typeOption.dataset.pickType);
      return;
    }
    const sortOption = event.target.closest("[data-pick-sort]");
    if (sortOption) {
      sort = sortOption.dataset.pickSort;
      page = 1;
      closeCommandMenu();
      render();
      return;
    }
    if (event.target === els.commandScrim) {
      closeCommandMenu();
      return;
    }

    const pageButton = event.target.closest("[data-page]");
    if (pageButton) {
      page = Number(pageButton.dataset.page);
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const action = event.target.closest("[data-exam-action]");
    if (action) {
      const exam = exams.find((item) => item.id === Number(action.dataset.id));
      if (!exam) return;
      if (action.dataset.examAction === "view") {
        if (window.innerWidth <= 860) openExamStats(exam);
        else toast(`演示中会进入「${exam.name}」的试卷详情`);
      }
      if (action.dataset.examAction === "stats") openExamStats(exam);
      if (action.dataset.examAction === "more") {
        event.stopPropagation();
        if (moreExamId === exam.id && els.moreMenu.classList.contains("open")) closeMoreMenu();
        else openMoreMenu(action, exam.id);
      }
      return;
    }

    const row = event.target.closest(".exam-row");
    if (row && window.innerWidth <= 860) {
      const exam = exams.find((item) => item.id === Number(row.dataset.examId));
      if (exam) openExamStats(exam);
      return;
    }

    const moreAction = event.target.closest("[data-exam-more]");
    if (moreAction && moreExamId) {
      const exam = exams.find((item) => item.id === moreExamId);
      closeMoreMenu();
      if (exam) {
        if (moreAction.dataset.examMore === "delete") toast(`删除「${exam.name}」需要接入现有软删除流程`);
        else if (moreAction.dataset.examMore === "copy") toast(`演示中会复制「${exam.name}」`);
        else toast(`演示中会进入「${exam.name}」的试卷详情`);
      }
      return;
    }

    if (event.target.closest("[data-clear-filters]")) {
      status = "all";
      classId = "";
      subject = "";
      query = "";
      page = 1;
      els.searchInput.value = "";
      render();
      return;
    }

    const toastNode = event.target.closest("[data-toast]");
    if (toastNode) {
      toast(toastNode.dataset.toast);
      return;
    }
    const demoLink = event.target.closest("[data-demo-link]");
    if (demoLink) {
      event.preventDefault();
      closeNav();
      toast("演示只包含题库管理与考试管理页");
      return;
    }

    if (!event.target.closest("#examMoreMenu") && !event.target.closest("[data-exam-action='more']")) closeMoreMenu();
  });

  document.addEventListener("keydown", (event) => {
    const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
    if (event.key === "/" && !editing) {
      event.preventDefault();
      els.searchInput.focus();
    }
    if (event.key === "Escape") {
      if (openMenuType) closeCommandMenu();
      if (els.moreMenu.classList.contains("open")) closeMoreMenu();
      if (els.sidebar.classList.contains("open")) closeNav();
      if (document.activeElement === els.searchInput && els.searchInput.value) {
        els.searchInput.value = "";
        query = "";
        page = 1;
        render();
        els.searchInput.blur();
      }
    }
  });

  window.addEventListener("resize", () => {
    closeCommandMenu();
    closeMoreMenu();
    syncNavAccessibility();
  });
  window.addEventListener("scroll", () => {
    if (openMenuType) closeCommandMenu();
    closeMoreMenu();
  }, true);

  buildFacets();
  syncNavAccessibility();
  render();
})();
