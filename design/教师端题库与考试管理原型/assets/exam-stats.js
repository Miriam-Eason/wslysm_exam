(() => {
  const {
    subjectColors,
    escapeHtml,
    icon,
  } = window.DEMO;
  const { exams, classNames, now } = window.EXAM_DEMO;

  document.querySelectorAll("[data-icon]").forEach((node) => {
    node.innerHTML = icon(node.dataset.icon, 16);
  });

  const params = new URLSearchParams(window.location.search);
  const requestedId = Number(params.get("id"));
  const exam = exams.find((item) => item.id === requestedId)
    || exams.find((item) => !item.archived && item.attemptCount > 0)
    || exams[0];
  const submittedCount = Math.max(1, Math.min(exam.attemptCount, 30));
  const totalStudents = submittedCount + 6;
  const maxScore = exam.questionCount;
  const subjectColor = (subjectColors[exam.subject] || {}).fg || "#536176";
  const classLabel = classNames(exam).join("、");
  const examClasses = classNames(exam);

  const familyNames = ["王", "李", "张", "陈", "刘", "周", "吴", "徐", "孙", "马", "朱", "胡", "郭", "何", "高", "林", "罗", "郑"];
  const givenNames = ["雨桐", "欣怡", "思远", "梓涵", "子轩", "若琳", "嘉诚", "心怡", "明轩", "语桐", "俊杰", "佳宁", "宇航", "梦瑶", "文博", "安然", "书涵", "晨阳"];
  const percentPattern = [94, 88, 91, 76, 84, 63, 71, 57, 82, 67, 96, 74, 52, 86, 61, 78, 43, 89, 69, 97, 55, 80, 64, 90, 72, 58, 85, 68, 48, 92];
  const students = Array.from({ length: totalStudents }, (_, index) => {
    const submitted = index < submittedCount;
    const percent = submitted ? percentPattern[index % percentPattern.length] : 0;
    const score = submitted ? Math.round((maxScore * percent) / 100) : null;
    return {
      index,
      name: `${familyNames[index % familyNames.length]}${givenNames[(index * 5) % givenNames.length]}`,
      studentNo: `2025${String(1400 + index * 7).padStart(4, "0")}`,
      className: examClasses[index % Math.max(1, examClasses.length)] || "—",
      submitted,
      percent,
      score,
      attemptCount: submitted ? 1 + (index % 3) : 0,
      submittedAt: submitted
        ? new Date(new Date(exam.createdAt).getTime() + (index + 1) * 36e5).toISOString()
        : null,
    };
  }).sort((left, right) => {
    if (left.submitted !== right.submitted) return left.submitted ? -1 : 1;
    return (right.percent || 0) - (left.percent || 0) || left.index - right.index;
  });

  const submittedStudents = students.filter((student) => student.submitted);
  const percentages = submittedStudents.map((student) => student.percent);
  const average = Math.round(percentages.reduce((sum, value) => sum + value, 0) / Math.max(1, percentages.length));
  const averageScore = Math.round((submittedStudents.reduce((sum, student) => sum + (student.score || 0), 0) / Math.max(1, submittedStudents.length)) * 10) / 10;
  const passRate = Math.round((percentages.filter((value) => value >= 60).length / Math.max(1, percentages.length)) * 100);
  const highScore = Math.max(...submittedStudents.map((student) => student.score || 0));
  const lowScore = Math.min(...submittedStudents.map((student) => student.score || 0));
  const bucketDefs = [
    { range: "90–100", min: 90, tone: "#34c759" },
    { range: "80–89", min: 80, tone: "#69bf63" },
    { range: "70–79", min: 70, tone: "#f2bd4b" },
    { range: "60–69", min: 60, tone: "#f09a42" },
    { range: "0–59", min: 0, tone: "#e05b52" },
  ];
  const buckets = bucketDefs.map((bucket, index) => ({
    ...bucket,
    count: percentages.filter((value) => {
      if (index === 0) return value >= 90;
      const upper = [100, 90, 80, 70, 60][index];
      return value >= bucket.min && value < upper;
    }).length,
  }));
  const maxBucket = Math.max(1, ...buckets.map((bucket) => bucket.count));

  const questionSeeds = [
    { type: "单选", stem: "食品留样应在冷藏条件下保存多长时间？", accuracy: 92, answer: "冷藏保存 48 小时" },
    { type: "单选", stem: "下列哪种做法最符合食品原料离地存放要求？", accuracy: 86, answer: "离地 10 cm、离墙 10 cm" },
    { type: "判断", stem: "留样容器可以直接使用未消毒的普通餐盒。", accuracy: 78, answer: "错误" },
    { type: "多选", stem: "食品留样记录应包含哪些信息？", accuracy: 71, answer: "留样时间、留样人、餐次、品名、数量" },
    { type: "填空", stem: "每份留样食品的净含量应不少于____克。", accuracy: 64, answer: "125 克" },
    { type: "单选", stem: "冷藏留样食品的存放温度应控制在？", accuracy: 58, answer: "0–4 ℃" },
    { type: "判断", stem: "留样食品到期后可以作为员工餐继续使用。", accuracy: 51, answer: "错误" },
    { type: "多选", stem: "发现留样异常时，正确的处理方式包括？", accuracy: 43, answer: "立即封存、上报、配合复检" },
  ];
  const questions = questionSeeds.map((question, index) => {
    const correctCount = Math.round((question.accuracy / 100) * submittedCount);
    return {
      ...question,
      accuracy: Math.round((correctCount / Math.max(1, submittedCount)) * 100),
      index: index + 1,
      correctCount,
      totalCount: submittedCount,
      score: index < 2 ? 1 : 2,
    };
  });

  function fmtScore(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  function toneClass(value) {
    return value >= 80 ? "high" : value >= 60 ? "mid" : "low";
  }

  function fmtTime(value) {
    return new Date(value).toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderHeader() {
    document.title = `${exam.name} · 成绩统计`;
    document.getElementById("examTitle").textContent = exam.name;
    const chips = [
      `<span class="subject-chip" style="background:${(subjectColors[exam.subject] || {}).bg || "#eef0f5"};color:${subjectColor}">${escapeHtml(exam.subject)}</span>`,
      ...examClasses.map((name) => `<span>${escapeHtml(name)}</span>`),
      `<span class="dot"></span><span>${exam.questionCount} 题</span>`,
      `<span class="dot"></span><span>${exam.attemptCount} 人作答</span>`,
    ];
    document.getElementById("examMeta").innerHTML = chips.join("");
  }

  function renderKpis() {
    const kpis = [
      { label: "提交人数", value: String(submittedCount), sub: `全班 ${totalStudents} 人`, icon: "users" },
      { label: "平均得分", value: fmtScore(averageScore), sub: `满分 ${maxScore} 分`, icon: "trendUp" },
      { label: "及格率", value: `${passRate}%`, sub: "≥ 60% 满分", icon: "target" },
      { label: "最高 / 最低", value: `${highScore} / ${lowScore}`, sub: "已提交作答", icon: "award" },
    ];
    document.getElementById("overview").innerHTML = kpis.map((item) => `
      <div class="kpi-card">
        <div class="kpi-top"><span>${item.label}</span><span class="kpi-icon">${icon(item.icon, 15)}</span></div>
        <div class="kpi-value">${item.value}</div>
        <div class="kpi-sub">${item.sub}</div>
      </div>
    `).join("");
  }

  function renderBuckets() {
    document.getElementById("scoreBuckets").innerHTML = `
      <div class="bucket-list">
        ${buckets.map((bucket) => `
          <div class="bucket-row">
            <span class="bucket-range">${bucket.range}</span>
            <div class="bucket-track"><div class="bucket-fill" style="width:${bucket.count ? Math.max(2, (bucket.count / maxBucket) * 100) : 0}%;background:${bucket.tone}"></div></div>
            <span class="bucket-count">${bucket.count}</span>
          </div>
        `).join("")}
      </div>
      <div class="bucket-legend">
        <span>平均得分率 <strong>${average}%</strong></span>
        <span>及格率 <strong>${passRate}%</strong></span>
        <span>样本 <strong>${submittedCount} 份</strong></span>
      </div>
    `;
  }

  function renderQuestions() {
    document.getElementById("questionStats").innerHTML = questions.map((question) => `
      <article class="question-stat">
        <div class="question-stat-row">
          <span class="question-index">${question.index}</span>
          <div class="question-main">
            <div class="question-label-line">
              <span class="qtype">${question.type}</span>
              <span class="qscore">${question.score} 分</span>
            </div>
            <p class="question-stem">${escapeHtml(question.stem)}</p>
          </div>
          <div class="question-accuracy">
            <div class="accuracy-number ${toneClass(question.accuracy)}">${question.accuracy}%</div>
            <div class="accuracy-sub">${question.correctCount}/${question.totalCount} 人对</div>
          </div>
        </div>
        <div class="accuracy-track">
          <div class="accuracy-fill" style="width:${Math.max(2, question.accuracy)}%;background:${question.accuracy >= 80 ? "#34c759" : question.accuracy >= 60 ? "#f3a52d" : "#e05b52"}"></div>
        </div>
      </article>
    `).join("");
  }

  function renderStudents() {
    document.getElementById("studentSummary").textContent = `共 ${totalStudents} 人，已交卷 ${submittedCount} 人，未交卷 ${totalStudents - submittedCount} 人`;
    document.getElementById("studentCountLabel").innerHTML = `<strong>${submittedCount}</strong> 人已交卷`;
    document.getElementById("studentList").innerHTML = students.map((student, rank) => `
      <button class="student-row${student.submitted ? "" : " unsubmitted"}" type="button" ${student.submitted ? `data-student-index="${student.index}"` : "disabled"}>
        <span class="student-rank">${student.submitted ? rank + 1 : "—"}</span>
        <span class="student-name">
          ${escapeHtml(student.name)}
          <span class="student-number">${student.studentNo}</span>
          <span class="student-submit-mobile">${escapeHtml(student.className)}${student.submitted ? ` · ${fmtTime(student.submittedAt)}` : " · 未交卷"}</span>
        </span>
        <span class="student-class">${escapeHtml(student.className)}</span>
        <span class="student-score">${student.submitted ? `${student.score}<small> / ${maxScore}</small>` : "未交卷"}</span>
        <span class="student-count">${student.attemptCount || "—"} 次</span>
        <span class="student-time">${student.submitted ? fmtTime(student.submittedAt) : "—"}</span>
        <span class="chevron">${student.submitted ? icon("chevronRight", 15) : ""}</span>
      </button>
    `).join("");
  }

  function openStudentDetail(student) {
    const wrongQuestions = questions.slice(Math.max(0, student.index % 3), Math.max(0, student.index % 3) + 4);
    document.getElementById("studentDetailTitle").textContent = student.name;
    document.getElementById("studentDetailSub").textContent = `${student.studentNo} · ${student.className}`;
    document.getElementById("studentDetailBody").innerHTML = `
      <div class="student-score-summary">
        <strong>${student.score} / ${maxScore} 分</strong>
        <span>·</span><span>第 ${student.attemptCount} 次作答</span>
        <span>·</span><span>${fmtTime(student.submittedAt)}</span>
      </div>
      <div class="detail-questions">
        ${wrongQuestions.map((question, index) => {
          const correct = index % 3 !== 0;
          return `
            <article class="wrong-card ${correct ? "correct" : "wrong"}">
              <div class="wrong-head">${icon(correct ? "check" : "x", 14)}<strong>第 ${question.index} 题</strong><span>${question.type} · ${question.score} 分</span></div>
              <p class="wrong-stem">${escapeHtml(question.stem)}</p>
              <p class="answer-line">该生答案：<strong class="${correct ? "answer-ok" : "answer-bad"}">${correct ? "回答正确" : "回答错误"}</strong></p>
              ${correct ? "" : `<p class="answer-line">正确答案：<strong class="answer-ok">${escapeHtml(question.answer)}</strong></p>`}
            </article>
          `;
        }).join("")}
      </div>
    `;
    const dialog = document.getElementById("studentDetail");
    dialog.showModal();
    document.body.classList.add("modal-open");
  }

  document.getElementById("studentList").addEventListener("click", (event) => {
    const row = event.target.closest("[data-student-index]");
    if (!row) return;
    const student = students.find((item) => item.index === Number(row.dataset.studentIndex));
    if (student) openStudentDetail(student);
  });
  const detail = document.getElementById("studentDetail");
  document.getElementById("closeStudentDetail").addEventListener("click", () => detail.close());
  detail.addEventListener("close", () => document.body.classList.remove("modal-open"));

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-demo-link]")) {
      event.preventDefault();
      const toast = document.createElement("div");
      toast.className = "toast success";
      toast.innerHTML = `${icon("check", 16)}<span>演示只包含题库管理与考试管理</span>`;
      document.getElementById("toastRegion").appendChild(toast);
      window.setTimeout(() => toast.remove(), 2200);
    }
    const toastTrigger = event.target.closest("[data-toast]");
    if (toastTrigger) {
      const toast = document.createElement("div");
      toast.className = "toast success";
      toast.innerHTML = `${icon("check", 16)}<span>${escapeHtml(toastTrigger.dataset.toast)}</span>`;
      document.getElementById("toastRegion").appendChild(toast);
      window.setTimeout(() => toast.remove(), 2200);
    }
  });

  renderHeader();
  renderKpis();
  renderBuckets();
  renderQuestions();
  renderStudents();
})();
