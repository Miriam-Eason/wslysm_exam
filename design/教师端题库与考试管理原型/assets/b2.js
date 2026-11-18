(() => {
  const {
    banks: seedBanks,
    sharedBanks: seedSharedBanks,
    subjects: seedSubjects,
    subjectColors,
    filterBanks,
    sortBanks,
    formatDate,
    pageItems,
    pageNumbers,
    escapeHtml,
    icon,
    normalize,
  } = window.DEMO;

  document.querySelectorAll("[data-icon]").forEach((node) => {
    node.innerHTML = icon(node.dataset.icon, 16);
  });

  let ownBanks = seedBanks.map((bank) => ({ ...bank }));
  let sharedBanks = seedSharedBanks.map((bank) => ({ ...bank }));
  let knownSubjects = [...seedSubjects];
  let scope = "own";
  let query = "";
  let subject = "";
  let sort = "recent";
  let pinnedOnly = false;
  let page = 1;
  let dialogMode = "create";
  let dialogBankId = null;
  let menuBankId = null;
  let deleteBankId = null;
  let openMenuType = null;
  let openMenuTrigger = null;
  let comboActiveIndex = -1;
  const copiedSharedIds = new Set();
  const pageSize = 10;
  const subjectNameCollator = new Intl.Collator("zh-Hans-CN");

  const els = {
    sidebar: document.getElementById("sidebar"),
    navScrim: document.getElementById("navScrim"),
    navOpen: document.getElementById("navOpen"),
    navClose: document.getElementById("navClose"),
    totalCount: document.getElementById("totalCount"),
    scopeCounts: [...document.querySelectorAll("[data-scope-count]")],
    scopeButtons: [...document.querySelectorAll("[data-scope]")],
    mobileScopeTabs: document.getElementById("mobileScopeTabs"),
    facets: document.getElementById("facets"),
    searchBox: document.getElementById("searchBox"),
    searchInput: document.getElementById("searchInput"),
    searchClear: document.getElementById("searchClear"),
    commandScrim: document.getElementById("commandScrim"),
    commandPopover: document.getElementById("commandPopover"),
    resultTitle: document.getElementById("resultTitle"),
    resultCount: document.getElementById("resultCount"),
    scopeState: document.getElementById("scopeState"),
    bankList: document.getElementById("bankList"),
    emptyState: document.getElementById("emptyState"),
    pagination: document.getElementById("pagination"),
    pageSummary: document.getElementById("pageSummary"),
    pager: document.getElementById("pager"),
    createButton: document.getElementById("createButton"),
    findShared: document.getElementById("findShared"),
    rowMenu: document.getElementById("rowMenu"),
    pinMenuText: document.getElementById("pinMenuText"),
    bankDialog: document.getElementById("bankDialog"),
    bankDialogTitle: document.getElementById("bankDialogTitle"),
    bankForm: document.getElementById("bankForm"),
    bankNameInput: document.getElementById("bankNameInput"),
    bankSubjectInput: document.getElementById("bankSubjectInput"),
    subjectControl: document.getElementById("subjectControl"),
    subjectDot: document.getElementById("subjectDot"),
    subjectOptions: document.getElementById("subjectOptions"),
    subjectToggle: document.getElementById("subjectToggle"),
    bankDialogError: document.getElementById("bankDialogError"),
    bankSubmit: document.getElementById("bankSubmit"),
    deleteDialog: document.getElementById("deleteDialog"),
    deleteNote: document.getElementById("deleteNote"),
    confirmDelete: document.getElementById("confirmDelete"),
    toastRegion: document.getElementById("toastRegion"),
  };

  function currentBanks() {
    return scope === "own" ? ownBanks : sharedBanks;
  }

  function subjectColor(value) {
    return (subjectColors[value] || {}).fg || "#7b8493";
  }

  function subjectCountsIgnoringSubjectFilter() {
    const source = filterBanks(currentBanks(), query, "");
    return Object.fromEntries(knownSubjects.map((name) => [name, source.filter((bank) => bank.subject === name).length]));
  }

  function subjectChip(value) {
    if (!value) return '<span class="subject-none">未归类</span>';
    const colors = subjectColors[value] || { bg: "#eef0f5", fg: "#414755" };
    return `<span class="subject-chip" style="background:${colors.bg};color:${colors.fg}">${escapeHtml(value)}</span>`;
  }

  function highlightedName(name) {
    if (!query.trim()) return escapeHtml(name);
    let html = escapeHtml(name);
    for (const token of normalize(query).split(" ").filter(Boolean)) {
      const regex = new RegExp(`(${escapeHtml(token).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      html = html.replace(regex, '<span class="match">$1</span>');
    }
    return html;
  }

  function toast(message) {
    const node = document.createElement("div");
    node.className = "toast success";
    node.innerHTML = `${icon("check", 16)}<span>${escapeHtml(message)}</span>`;
    els.toastRegion.appendChild(node);
    window.setTimeout(() => node.remove(), 2600);
  }

  function scopeLabel() {
    return scope === "own" ? "我的题库" : "酒店管理系共享";
  }

  function resetPage() {
    page = 1;
  }

  function renderScopeState() {
    for (const node of els.scopeCounts) {
      node.textContent = node.dataset.scopeCount === "own" ? ownBanks.length : sharedBanks.length;
    }
    for (const button of els.scopeButtons) {
      const active = button.dataset.scope === scope;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    els.scopeState.textContent = scope === "own" ? "可编辑" : "同系部 · 只读";
    els.scopeState.style.background = scope === "own" ? "var(--primary-soft)" : "#e7f8f4";
    els.scopeState.style.color = scope === "own" ? "var(--primary-deep)" : "#006f63";
  }

  function renderFacets() {
    const source = filterBanks(currentBanks(), query, "");
    const counts = subjectCountsIgnoringSubjectFilter();
    const visibleSubjects = knownSubjects.filter((name) => counts[name] > 0 || subject === name);
    const pinnedCount = ownBanks.filter((bank) => bank.pinned).length;
    els.facets.innerHTML = `
      <div class="facet-section-title">范围</div>
      <div class="facet-list">
        <button class="facet-button${scope === "own" ? " active" : ""}" type="button" data-scope="own">
          <span class="facet-icon">${icon("book", 14)}</span>
          <span class="facet-label">我的题库</span>
          <span class="facet-count">${ownBanks.length}</span>
        </button>
        <button class="facet-button shared${scope === "shared" ? " active" : ""}" type="button" data-scope="shared">
          <span class="facet-icon">${icon("building", 14)}</span>
          <span class="facet-label">酒店管理系共享</span>
          <span class="facet-count">${sharedBanks.length}</span>
        </button>
      </div>
      <div class="facet-section-title">科目</div>
      <div class="facet-list">
        <button class="facet-button${!subject ? " active" : ""}" type="button" data-facet-subject="">
          <span class="facet-dot" style="background:var(--primary)"></span>
          <span class="facet-label">全部科目</span>
          <span class="facet-count">${source.length}</span>
        </button>
        ${visibleSubjects.map((name) => `
          <button class="facet-button${subject === name ? " active" : ""}" type="button" data-facet-subject="${escapeHtml(name)}">
            <span class="facet-dot" style="background:${subjectColor(name)}"></span>
            <span class="facet-label">${escapeHtml(name)}</span>
            <span class="facet-count">${counts[name]}</span>
          </button>
        `).join("")}
      </div>
      ${scope === "own" ? `
        <div class="facet-separator"></div>
        <div class="facet-list" style="padding-top:0">
          <button class="facet-button facet-pinned${pinnedOnly ? " active" : ""}" type="button" data-pinned-filter>
            <span class="facet-icon">${icon("star", 14)}</span>
            <span class="facet-label">已置顶</span>
            <span class="facet-count">${pinnedCount}</span>
          </button>
        </div>
      ` : ""}
    `;
  }

  function renderTriggers() {
    document.querySelectorAll("[data-subject-label]").forEach((node) => {
      node.textContent = subject || "全部科目";
    });
    document.querySelectorAll("[data-subject-dot]").forEach((node) => {
      node.style.background = subject ? subjectColor(subject) : "var(--primary)";
    });
    document.querySelectorAll('[data-menu="subject"]').forEach((node) => {
      node.setAttribute("aria-label", `按科目筛选：${subject || "全部科目"}`);
    });
    const sortLabels = { recent: "最近创建", name: "名称排序", questions: "题目数" };
    document.querySelectorAll("[data-sort-label]").forEach((node) => {
      node.textContent = sortLabels[sort];
    });
    document.querySelectorAll('[data-menu="sort"]').forEach((node) => {
      node.setAttribute("aria-label", `排序：${sortLabels[sort]}`);
    });
  }

  function renderRow(bank) {
    if (scope === "shared") {
      const alreadyAdded = copiedSharedIds.has(bank.id);
      return `
        <article class="bank-row shared-row" data-bank-id="${bank.id}">
          <div class="owner-avatar" aria-hidden="true">${escapeHtml(bank.ownerName.slice(0, 1))}</div>
          <div class="bank-main">
            <button class="bank-name" type="button" data-action="preview" data-id="${bank.id}" title="${escapeHtml(bank.name)}">${highlightedName(bank.name)}</button>
            <div class="bank-meta">
              ${subjectChip(bank.subject)}
              <span class="meta-separator"></span>
              <span class="owner-name">${escapeHtml(bank.ownerName)}</span>
              <span>${bank.questionCount} 道</span>
            </div>
          </div>
          <div class="row-end">
            <span class="bank-date" title="创建时间">${formatDate(bank.createdAt)}</span>
            <div class="row-actions">
              <button class="add-shared-button" type="button" data-action="add-shared" data-id="${bank.id}" title="${alreadyAdded ? "已添加到我的题库" : `添加副本到我的题库，来源：${escapeHtml(bank.ownerName)}`}" ${alreadyAdded ? "disabled" : ""}>
                ${icon(alreadyAdded ? "check" : "plus", 14)}${alreadyAdded ? "已添加" : "添加"}
              </button>
            </div>
          </div>
        </article>
      `;
    }

    return `
      <article class="bank-row${bank.pinned ? " pinned" : ""}" data-bank-id="${bank.id}">
        <button class="pin-button${bank.pinned ? " active" : ""}" type="button" data-action="pin" data-id="${bank.id}" aria-label="${bank.pinned ? "取消置顶" : "置顶"} ${escapeHtml(bank.name)}" title="${bank.pinned ? "取消置顶" : "置顶"}">${icon("star", 15)}</button>
        <div class="bank-main">
          <button class="bank-name" type="button" data-action="open" data-id="${bank.id}" title="${escapeHtml(bank.name)}">${highlightedName(bank.name)}</button>
          <div class="bank-meta">
            ${subjectChip(bank.subject)}
            <span class="meta-separator"></span>
            <span>${bank.questionCount} 道题</span>
            ${bank.copiedFromOwner ? `<span class="source-badge">复制自 ${escapeHtml(bank.copiedFromOwner)}</span>` : ""}
          </div>
        </div>
        <div class="row-end">
          <span class="bank-date" title="创建时间">${formatDate(bank.createdAt)}</span>
          <div class="row-actions">
            <button class="manage-button" type="button" data-action="open" data-id="${bank.id}" aria-label="管理 ${escapeHtml(bank.name)}"><span class="manage-label">管理</span>${icon("arrow", 14)}</button>
            <button class="more-button" type="button" data-action="more" data-id="${bank.id}" aria-label="${escapeHtml(bank.name)} 的更多操作">${icon("more", 17)}</button>
          </div>
        </div>
      </article>
    `;
  }

  function render() {
    renderScopeState();
    renderFacets();
    renderTriggers();
    let filtered = filterBanks(currentBanks(), query, subject);
    if (scope === "own" && pinnedOnly) filtered = filtered.filter((bank) => bank.pinned);
    filtered = sortBanks(filtered, sort);
    const paging = pageItems(filtered.length, page, pageSize);
    page = paging.current;
    const visible = filtered.slice(paging.start, paging.end);

    els.totalCount.textContent = `${currentBanks().length} 个题库`;
    els.searchBox.classList.toggle("has-query", Boolean(query));
    els.resultTitle.textContent = pinnedOnly ? "已置顶" : scopeLabel();
    els.resultCount.textContent = `${filtered.length} 个`;
    els.emptyState.hidden = filtered.length !== 0;
    els.bankList.innerHTML = visible.map(renderRow).join("");

    const showPaging = filtered.length > pageSize;
    els.pagination.style.display = filtered.length ? "flex" : "none";
    els.pageSummary.textContent = filtered.length
      ? `第 ${paging.current} / ${paging.totalPages} 页 · 共 ${filtered.length} 个`
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

  function setScope(nextScope) {
    if (scope === nextScope) return;
    scope = nextScope;
    pinnedOnly = false;
    if (subject) {
      const counts = Object.fromEntries(
        knownSubjects.map((name) => [name, currentBanks().filter((bank) => bank.subject === name).length]),
      );
      if (!counts[subject]) subject = "";
    }
    resetPage();
    render();
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

  function positionCommandMenu(trigger) {
    const isSheet = window.innerWidth <= 640;
    els.commandPopover.classList.toggle("sheet", isSheet);
    if (isSheet) {
      els.commandPopover.style.left = "";
      els.commandPopover.style.top = "";
      return;
    }
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

  function openCommandMenu(type, trigger) {
    closeCommandMenu();
    openMenuType = type;
    openMenuTrigger = trigger;
    const counts = subjectCountsIgnoringSubjectFilter();
    if (type === "subject") {
      els.commandPopover.innerHTML = `
        <div class="command-title">选择科目</div>
        <button class="command-option${!subject ? " selected" : ""}" type="button" data-pick-subject="">
          <span class="facet-dot" style="background:var(--primary)"></span>
          <span class="option-label">全部科目</span>
          <span class="option-count">${currentBanks().length}</span>
          <span class="check">${icon("check", 15)}</span>
        </button>
        ${knownSubjects.filter((name) => counts[name] > 0 || subject === name).map((name) => `
          <button class="command-option${subject === name ? " selected" : ""}" type="button" data-pick-subject="${escapeHtml(name)}">
            <span class="facet-dot" style="background:${subjectColor(name)}"></span>
            <span class="option-label">${escapeHtml(name)}</span>
            <span class="option-count">${counts[name]}</span>
            <span class="check">${icon("check", 15)}</span>
          </button>
        `).join("")}
      `;
    } else {
      const labels = { recent: "最近创建", name: "名称排序", questions: "题目数" };
      els.commandPopover.innerHTML = `
        <div class="command-title">排序方式</div>
        ${Object.entries(labels).map(([value, label]) => `
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
    if (window.innerWidth <= 640) document.body.classList.add("filter-open");
    positionCommandMenu(trigger);
  }

  function toggleCommandMenu(type, trigger) {
    if (openMenuType === type && openMenuTrigger === trigger) closeCommandMenu();
    else openCommandMenu(type, trigger);
  }

  function openBankMenu(button, id) {
    const bank = ownBanks.find((item) => item.id === id);
    if (!bank) return;
    closeCommandMenu();
    menuBankId = id;
    els.pinMenuText.textContent = bank.pinned ? "取消置顶" : "置顶题库";
    els.rowMenu.classList.add("open");
    const rect = button.getBoundingClientRect();
    const menuRect = els.rowMenu.getBoundingClientRect();
    const left = Math.min(window.innerWidth - menuRect.width - 10, Math.max(10, rect.right - menuRect.width));
    const below = rect.bottom + 6;
    const top = below + menuRect.height > window.innerHeight - 10 ? rect.top - menuRect.height - 6 : below;
    els.rowMenu.style.left = `${left}px`;
    els.rowMenu.style.top = `${Math.max(10, top)}px`;
    els.rowMenu.querySelector(".menu-item").focus();
  }

  function closeRowMenu() {
    els.rowMenu.classList.remove("open");
    menuBankId = null;
  }

  function togglePin(id) {
    const bank = ownBanks.find((item) => item.id === id);
    if (!bank) return;
    bank.pinned = !bank.pinned;
    toast(bank.pinned ? `已置顶「${bank.name}」` : `已取消置顶「${bank.name}」`);
    render();
  }

  function addSharedBank(id) {
    const bank = sharedBanks.find((item) => item.id === id);
    if (!bank || copiedSharedIds.has(id)) return;
    const nextId = Math.max(0, ...ownBanks.map((item) => item.id)) + 1;
    ownBanks.unshift({
      ...bank,
      id: nextId,
      ownerName: "陈瑜",
      origin: "own",
      copiedFromId: bank.id,
      copiedFromOwner: bank.ownerName,
      createdAt: new Date().toISOString().slice(0, 10),
      pinned: false,
    });
    copiedSharedIds.add(id);
    toast(`已添加，并复制「${bank.name}」到我的题库`);
    render();
  }

  function updateSubjectDot() {
    const value = els.bankSubjectInput.value.trim();
    els.subjectDot.style.setProperty("--subject-color", subjectColor(value));
  }

  function comboOptions() {
    const raw = els.bankSubjectInput.value.trim();
    const normalizedQuery = normalize(raw);
    const matches = knownSubjects
      .filter((name) => !normalizedQuery || normalize(name).includes(normalizedQuery))
      .sort(subjectNameCollator.compare);
    const exact = knownSubjects.some((name) => normalize(name) === normalizedQuery);
    return { raw, matches, create: raw && !exact ? raw : "" };
  }

  function renderSubjectOptions() {
    const { raw, matches, create } = comboOptions();
    const ownCounts = Object.fromEntries(
      knownSubjects.map((name) => [name, ownBanks.filter((bank) => bank.subject === name).length]),
    );
    const optionRows = matches.map((name, index) => `
      <button class="subject-option${index === comboActiveIndex ? " active" : ""}${normalize(name) === normalize(raw) ? " selected" : ""}" type="button" role="option" data-pick-subject-option="${escapeHtml(name)}">
        <span class="option-dot" style="--option-color:${subjectColor(name)}"></span>
        <span class="option-name">${escapeHtml(name)}</span>
        <span class="option-use">${ownCounts[name] || 0} 个题库</span>
        ${normalize(name) === normalize(raw) ? icon("check", 14) : ""}
      </button>
    `).join("");
    els.subjectOptions.innerHTML = optionRows + (create ? `
      <button class="subject-option create-option" type="button" role="option" data-create-subject="${escapeHtml(create)}">
        ${icon("plus", 14)}
        <span class="option-name">新建科目「${escapeHtml(create)}」</span>
      </button>
    ` : "");
  }

  function openSubjectOptions() {
    comboActiveIndex = -1;
    renderSubjectOptions();
    els.subjectOptions.classList.add("open");
    const controlRect = els.subjectControl.getBoundingClientRect();
    const menuHeight = els.subjectOptions.getBoundingClientRect().height;
    const spaceBelow = window.innerHeight - controlRect.bottom - 16;
    const spaceAbove = controlRect.top - 16;
    els.subjectOptions.classList.toggle("open-up", menuHeight > spaceBelow && spaceAbove > spaceBelow);
    els.bankSubjectInput.setAttribute("aria-expanded", "true");
  }

  function closeSubjectOptions() {
    comboActiveIndex = -1;
    els.subjectOptions.classList.remove("open");
    els.bankSubjectInput.setAttribute("aria-expanded", "false");
  }

  function chooseSubject(value) {
    els.bankSubjectInput.value = value;
    updateSubjectDot();
    els.bankSubjectInput.focus();
    closeSubjectOptions();
  }

  function openDialog(mode, bank = null) {
    dialogMode = mode;
    dialogBankId = bank?.id ?? null;
    els.bankDialogTitle.textContent = mode === "edit" ? "编辑题库" : "新建题库";
    els.bankSubmit.textContent = mode === "edit" ? "保存" : "创建";
    els.bankNameInput.value = bank?.name ?? "";
    els.bankSubjectInput.value = bank?.subject ?? "";
    els.bankDialogError.classList.remove("show");
    updateSubjectDot();
    closeSubjectOptions();
    els.bankDialog.showModal();
    document.body.classList.add("modal-open");
    window.setTimeout(() => els.bankNameInput.focus(), 0);
  }

  function openDelete(bank) {
    deleteBankId = bank.id;
    els.deleteNote.innerHTML = `将删除「<strong>${escapeHtml(bank.name)}</strong>」及其 ${bank.questionCount} 道题目。已组卷的试卷快照不受影响。`;
    els.deleteDialog.showModal();
    document.body.classList.add("modal-open");
  }

  function releaseDialogLock() {
    if (![...document.querySelectorAll("dialog")].some((dialog) => dialog.open)) {
      document.body.classList.remove("modal-open");
    }
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

  els.scopeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setScope(button.dataset.scope);
    });
  });

  els.facets.addEventListener("click", (event) => {
    const scopeButton = event.target.closest("[data-scope]");
    if (scopeButton) {
      setScope(scopeButton.dataset.scope);
      return;
    }
    const subjectButton = event.target.closest("[data-facet-subject]");
    if (subjectButton) {
      subject = subjectButton.dataset.facetSubject;
      pinnedOnly = false;
      resetPage();
      render();
      return;
    }
    if (event.target.closest("[data-pinned-filter]")) {
      pinnedOnly = !pinnedOnly;
      resetPage();
      render();
    }
  });

  els.findShared.addEventListener("click", () => {
    setScope("shared");
    els.searchInput.focus();
  });

  document.addEventListener("click", (event) => {
    const menuButton = event.target.closest("[data-menu]");
    if (menuButton) {
      event.stopPropagation();
      toggleCommandMenu(menuButton.dataset.menu, menuButton);
      return;
    }

    const subjectOption = event.target.closest("[data-pick-subject]");
    if (subjectOption) {
      subject = subjectOption.dataset.pickSubject;
      pinnedOnly = false;
      resetPage();
      closeCommandMenu();
      render();
      return;
    }

    const sortOption = event.target.closest("[data-pick-sort]");
    if (sortOption) {
      sort = sortOption.dataset.pickSort;
      resetPage();
      closeCommandMenu();
      render();
      return;
    }

    if (event.target === els.commandScrim) {
      closeCommandMenu();
      return;
    }

    const pageNode = event.target.closest("[data-page]");
    if (pageNode) {
      page = Number(pageNode.dataset.page);
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const action = event.target.closest("[data-action]");
    if (action) {
      const id = Number(action.dataset.id);
      if (action.dataset.action === "pin") togglePin(id);
      if (action.dataset.action === "open") {
        const bank = ownBanks.find((item) => item.id === id);
        if (bank) toast(`演示中会进入「${bank.name}」的题目列表`);
      }
      if (action.dataset.action === "preview") {
        const bank = sharedBanks.find((item) => item.id === id);
        if (bank) toast(`只读预览：${bank.ownerName} 的「${bank.name}」`);
      }
      if (action.dataset.action === "add-shared") addSharedBank(id);
      if (action.dataset.action === "more") {
        event.stopPropagation();
        if (menuBankId === id && els.rowMenu.classList.contains("open")) closeRowMenu();
        else openBankMenu(action, id);
      }
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
      toast("演示只包含题库管理页");
      return;
    }

    if (event.target.closest("[data-clear-empty]")) {
      query = "";
      subject = "";
      pinnedOnly = false;
      els.searchInput.value = "";
      resetPage();
      render();
      els.searchInput.focus();
      return;
    }

    const closeButton = event.target.closest("[data-close-dialog]");
    if (closeButton) {
      document.getElementById(closeButton.dataset.closeDialog).close();
      return;
    }

    if (!event.target.closest("#rowMenu") && !event.target.closest("[data-action='more']")) closeRowMenu();
    if (!event.target.closest(".subject-combobox")) closeSubjectOptions();
  });

  els.searchInput.addEventListener("input", () => {
    query = els.searchInput.value.trim();
    resetPage();
    render();
  });
  els.searchInput.addEventListener("focus", () => {
    if (openMenuType) closeCommandMenu();
  });
  els.searchClear.addEventListener("click", () => {
    els.searchInput.value = "";
    query = "";
    resetPage();
    render();
    els.searchInput.focus();
  });
  els.createButton.addEventListener("click", () => openDialog("create"));

  els.navOpen.addEventListener("click", openNav);
  els.navClose.addEventListener("click", closeNav);
  els.navScrim.addEventListener("click", closeNav);

  els.rowMenu.addEventListener("click", (event) => {
    const item = event.target.closest("[data-menu-action]");
    if (!item || !menuBankId) return;
    const bank = ownBanks.find((row) => row.id === menuBankId);
    if (!bank) return;
    const action = item.dataset.menuAction;
    closeRowMenu();
    if (action === "pin") togglePin(bank.id);
    if (action === "edit") openDialog("edit", bank);
    if (action === "delete") openDelete(bank);
  });

  els.bankForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = els.bankNameInput.value.trim();
    const subjectValue = els.bankSubjectInput.value.trim();
    if (!name) {
      els.bankDialogError.textContent = "请输入题库名称";
      els.bankDialogError.classList.add("show");
      els.bankNameInput.focus();
      return;
    }
    if (subjectValue && !knownSubjects.includes(subjectValue)) {
      knownSubjects = [...knownSubjects, subjectValue].sort(subjectNameCollator.compare);
    }
    if (dialogMode === "edit") {
      const bank = ownBanks.find((item) => item.id === dialogBankId);
      if (bank) {
        bank.name = name;
        bank.subject = subjectValue;
        toast("题库信息已保存");
      }
    } else {
      ownBanks.unshift({
        id: Math.max(0, ...ownBanks.map((bank) => bank.id)) + 1,
        name,
        subject: subjectValue,
        questionCount: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        pinned: false,
        ownerName: "陈瑜",
        department: "酒店管理系",
        origin: "own",
      });
      toast(`已创建「${name}」`);
    }
    els.bankDialog.close();
    resetPage();
    render();
  });

  els.bankSubjectInput.addEventListener("focus", openSubjectOptions);
  els.bankSubjectInput.addEventListener("input", () => {
    updateSubjectDot();
    openSubjectOptions();
  });
  els.bankSubjectInput.addEventListener("keydown", (event) => {
    const { create, matches } = comboOptions();
    const optionCount = matches.length + (create ? 1 : 0);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!els.subjectOptions.classList.contains("open")) openSubjectOptions();
      comboActiveIndex = Math.min(optionCount - 1, comboActiveIndex + 1);
      renderSubjectOptions();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      comboActiveIndex = Math.max(0, comboActiveIndex - 1);
      renderSubjectOptions();
    } else if (event.key === "Enter" && els.subjectOptions.classList.contains("open") && optionCount) {
      event.preventDefault();
      if (comboActiveIndex >= 0 && comboActiveIndex < matches.length) chooseSubject(matches[comboActiveIndex]);
      else if (comboActiveIndex >= matches.length && create) chooseSubject(create);
      else if (matches[0]) chooseSubject(matches[0]);
    } else if (event.key === "Escape") {
      event.stopPropagation();
      closeSubjectOptions();
    }
  });
  els.subjectToggle.addEventListener("click", () => {
    if (els.subjectOptions.classList.contains("open")) closeSubjectOptions();
    else {
      els.bankSubjectInput.focus();
      openSubjectOptions();
    }
  });
  els.subjectOptions.addEventListener("click", (event) => {
    const option = event.target.closest("[data-pick-subject-option]");
    if (option) {
      chooseSubject(option.dataset.pickSubjectOption);
      return;
    }
    const create = event.target.closest("[data-create-subject]");
    if (create) chooseSubject(create.dataset.createSubject);
  });

  els.confirmDelete.addEventListener("click", () => {
    const bank = ownBanks.find((item) => item.id === deleteBankId);
    if (!bank) return;
    ownBanks = ownBanks.filter((item) => item.id !== deleteBankId);
    els.deleteDialog.close();
    toast(`已删除「${bank.name}」`);
    render();
  });

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("close", releaseDialogLock);
  });

  document.addEventListener("keydown", (event) => {
    const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
    if (event.key === "/" && !editing) {
      event.preventDefault();
      els.searchInput.focus();
    }
    if (event.key === "Escape") {
      if (els.rowMenu.classList.contains("open")) closeRowMenu();
      if (openMenuType) closeCommandMenu();
      if (els.sidebar.classList.contains("open")) closeNav();
      if (document.activeElement === els.searchInput && els.searchInput.value) {
        els.searchInput.value = "";
        query = "";
        resetPage();
        render();
        els.searchInput.blur();
      }
    }
  });

  window.addEventListener("resize", () => {
    if (openMenuType) closeCommandMenu();
    closeRowMenu();
    syncNavAccessibility();
  });
  window.addEventListener("scroll", () => {
    if (openMenuType) closeCommandMenu();
    closeRowMenu();
  }, true);

  syncNavAccessibility();
  render();
})();
