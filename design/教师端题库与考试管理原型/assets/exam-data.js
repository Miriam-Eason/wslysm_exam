(() => {
  const classes = [
    { id: 1, name: "24普5", studentCount: 48 },
    { id: 2, name: "25普职融通4班", studentCount: 46 },
  ];

  const groups = [
    { prefix: "新营养7.2 加工制作 练习", count: 45, subject: "烹饪科目组" },
    { prefix: "7.2 从业人员卫生 练习", count: 30, subject: "烹饪科目组" },
    { prefix: "面点2.3 成形工艺 练习", count: 30, subject: "面点技艺" },
    { prefix: "面点2.4 熟制技法 练习", count: 20, subject: "面点技艺" },
    { prefix: "中式烹调3.2 火候控制 练习", count: 16, subject: "中式烹调" },
    { prefix: "烹饪营养4.1 营养配餐 练习", count: 10, subject: "营养配餐" },
    { prefix: "食品安全5.1 留样管理 练习", count: 5, subject: "烹饪科目组" },
  ];

  const now = new Date("2026-11-04T08:00:00+08:00");
  const exams = [];
  let sequence = 0;

  for (const group of groups) {
    for (let index = 1; index <= group.count; index += 1) {
      const type = index % 12 === 0 ? "EXAM" : "PRACTICE";
      const deadline = sequence % 9 === 0
        ? null
        : new Date(Date.UTC(2026, 10, 14 + ((sequence * 7) % 112), 15, 59));
      const createdAt = new Date(Date.UTC(2026, 8, 5 + ((sequence * 3) % 57), 9, 0));
      exams.push({
        id: sequence + 1,
        name: type === "EXAM" ? `${group.prefix.replace("练习", "考试")}${index}` : `${group.prefix}${index}`,
        type,
        subject: group.subject,
        classIds: [sequence < 78 ? 1 : 2],
        questionCount: 48 + ((sequence * 13) % 53),
        attemptCount: 6 + ((sequence * 5) % 24),
        deadline: deadline?.toISOString() ?? null,
        createdAt: createdAt.toISOString(),
        allowRepeat: type === "PRACTICE",
        repeatLimit: type === "PRACTICE" && sequence % 3 !== 0 ? 3 : null,
        archived: false,
        deletedAt: null,
      });
      sequence += 1;
    }
  }

  const archivedExamSpecs = Array.from({ length: 13 }, (_, index) => `已下架考试/练习 ${index + 1}`);
  archivedExamSpecs.forEach((name, index) => {
    exams.push({
      id: sequence + 1,
      name,
      type: index === 12 ? "EXAM" : "PRACTICE",
      subject: ["烹饪科目组", "面点技艺", "中式烹调", "营养配餐"][index % 4],
      classIds: [index < 9 ? 1 : 2],
      questionCount: 52 + (index % 7) * 9,
      attemptCount: 7 + (index % 6) * 4,
      deadline: new Date(Date.UTC(2026, 6, 20 + index * 3, 15, 59)).toISOString(),
      createdAt: new Date(Date.UTC(2026, 5, 10 + index, 9, 0)).toISOString(),
      allowRepeat: false,
      repeatLimit: null,
      archived: true,
      deletedAt: new Date(Date.UTC(2026, 9, 12 + index * 2, 9, 0)).toISOString(),
    });
    sequence += 1;
  });

  function statusOf(exam) {
    if (exam.archived || exam.deletedAt) return "archived";
    return exam.deadline && new Date(exam.deadline) < now ? "expired" : "active";
  }

  function classNames(exam) {
    return exam.classIds
      .map((id) => classes.find((item) => item.id === id)?.name)
      .filter(Boolean);
  }

  window.EXAM_DEMO = {
    exams,
    classes,
    now,
    statusOf,
    classNames,
  };
})();
