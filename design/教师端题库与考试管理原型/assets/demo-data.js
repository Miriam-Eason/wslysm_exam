(() => {
  const groupSpecs = [
    { prefix: "新营养7.2 加工制作练习", count: 11, subject: "烹饪科目组" },
    { prefix: "7.2 从业人员卫生 练习", count: 6, subject: "烹饪科目组" },
    { prefix: "新营养7.2 储存运输 练习", count: 5, subject: "烹饪科目组" },
    { prefix: "面点2.1 原料基础 练习", count: 24, subject: "面点技艺" },
    { prefix: "面点2.2 面团调制 练习", count: 30, subject: "面点技艺" },
    { prefix: "面点2.3 成形工艺 练习", count: 32, subject: "面点技艺" },
    { prefix: "面点2.4 熟制技法 练习", count: 35, subject: "面点技艺" },
    { prefix: "中式烹调3.1 刀工基础 练习", count: 18, subject: "中式烹调" },
    { prefix: "中式烹调3.2 火候控制 练习", count: 20, subject: "中式烹调" },
    { prefix: "烹饪营养4.1 营养配餐 练习", count: 18, subject: "营养配餐" },
  ];

  const banks = [];
  let sequence = 0;

  for (const group of groupSpecs) {
    for (let index = 1; index <= group.count; index += 1) {
      const date = new Date(Date.UTC(2026, 8, 12 + ((sequence * 11) % 52)));
      banks.push({
        id: sequence + 1,
        name: `${group.prefix}${index}`,
        subject: group.subject,
        questionCount: 42 + ((sequence * 13 + index * 7) % 59),
        createdAt: date.toISOString().slice(0, 10),
        pinned: [7, 74, 168].includes(sequence + 1),
        ownerName: "陈瑜",
        department: "酒店管理系",
        origin: "own",
      });
      sequence += 1;
    }
  }

  const sharedSpecs = [
    { prefix: "面点2.5 创意点心 练习", count: 8, subject: "面点技艺", owner: "王敏" },
    { prefix: "中式烹调3.4 热菜实训 练习", count: 9, subject: "中式烹调", owner: "李娜" },
    { prefix: "食品安全5.1 留样管理 练习", count: 6, subject: "烹饪科目组", owner: "周航" },
  ];
  const sharedBanks = [];
  sequence = 0;
  for (const group of sharedSpecs) {
    for (let index = 1; index <= group.count; index += 1) {
      const date = new Date(Date.UTC(2026, 9, 8 + ((sequence * 5) % 26)));
      sharedBanks.push({
        id: 1001 + sequence,
        name: `${group.prefix}${index}`,
        subject: group.subject,
        questionCount: 38 + ((sequence * 17 + index * 5) % 48),
        createdAt: date.toISOString().slice(0, 10),
        pinned: false,
        ownerName: group.owner,
        department: "酒店管理系",
        origin: "shared",
      });
      sequence += 1;
    }
  }

  const subjects = ["烹饪科目组", "面点技艺", "中式烹调", "营养配餐"];
  const subjectColors = {
    烹饪科目组: { bg: "#e8f4ff", fg: "#0065c9" },
    面点技艺: { bg: "#fff3e0", fg: "#9a5700" },
    中式烹调: { bg: "#ffeceb", fg: "#b42318" },
    营养配餐: { bg: "#e8f8ee", fg: "#18794e" },
  };
  const nameCollator = new Intl.Collator("zh-Hans-CN", {
    numeric: true,
    sensitivity: "base",
  });

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function filterBanks(source, query, subject) {
    const tokens = normalize(query).split(" ").filter(Boolean);
    return source.filter((bank) => {
      if (subject && bank.subject !== subject) return false;
      const haystack = normalize(`${bank.name} ${bank.subject} ${bank.ownerName ?? ""} ${bank.department ?? ""}`);
      return tokens.every((token) => haystack.includes(token));
    });
  }

  function sortBanks(source, sort) {
    const rows = [...source];
    rows.sort((left, right) => {
      if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
      if (sort === "name") return nameCollator.compare(left.name, right.name);
      if (sort === "questions") return right.questionCount - left.questionCount;
      return right.createdAt.localeCompare(left.createdAt) || right.id - left.id;
    });
    return rows;
  }

  function formatDate(value) {
    const [, month, day] = String(value).split("-");
    return `${Number(month)}月${Number(day)}日`;
  }

  function pageItems(total, page, pageSize) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(Math.max(1, page), totalPages);
    return {
      current,
      totalPages,
      start: (current - 1) * pageSize,
      end: current * pageSize,
    };
  }

  function pageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
    const numbers = new Set([1, total, current - 1, current, current + 1]);
    const sorted = [...numbers].filter((number) => number >= 1 && number <= total).sort((a, b) => a - b);
    const output = [];
    for (let index = 0; index < sorted.length; index += 1) {
      if (index > 0 && sorted[index] - sorted[index - 1] > 1) output.push("…");
      output.push(sorted[index]);
    }
    return output;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char]));
  }

  function icon(name, size = 16) {
    const paths = {
      grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
      file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      star: '<path d="m12 3 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.92 1.06-6.2L3 9.53l6.22-.9Z"/>',
      more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      chevronDown: '<path d="m6 9 6 6 6-6"/>',
      chevronLeft: '<path d="m15 18-6-6 6-6"/>',
      chevronRight: '<path d="m9 18 6-6-6-6"/>',
      x: '<path d="M18 6 6 18M6 6l12 12"/>',
      pin: '<path d="M12 17v5"/><path d="M9 3h6l-1 7 4 3v2H6v-2l4-3-1-7Z"/>',
      pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
      trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v6M14 11v6"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
      sort: '<path d="M8 7h11M8 12h7M8 17h4"/><path d="m18 15 2 2 2-2M20 5v12"/>',
      arrowUpDown: '<path d="m7 15 5 5 5-5M12 4v16"/><path d="m17 9-5-5-5 5"/>',
      filter: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
      building: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M16 9h2a2 2 0 0 1 2 2v10M8 7h4M8 11h4M8 15h4M8 19h4"/><path d="M2 21h20"/>',
      share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/>',
      barChart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20V8"/>',
      target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
      award: '<circle cx="12" cy="8" r="5"/><path d="m8.6 12-1.6 9 5-3 5 3-1.6-9"/>',
      trendUp: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    };
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
  }

  window.DEMO = {
    banks,
    sharedBanks,
    subjects,
    subjectColors,
    filterBanks,
    sortBanks,
    formatDate,
    pageItems,
    pageNumbers,
    escapeHtml,
    icon,
    normalize,
  };
})();
