// 测试数据填充 —— 覆盖全链路：超管/教师/班级/学生/题库/题目/考试快照/作答/错题
// 运行：npx prisma db seed   （会先清空再重建，幂等）
import { PrismaClient, QuestionType, Difficulty, ExamType, AttemptStatus, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";

const prisma = new PrismaClient();

const DEFAULT_STUDENT_PWD = "wxls12345";

// 内容哈希：题型 + 归一化题干 + 答案（与正式导入逻辑保持一致）
function contentHash(type: QuestionType, stem: string, answer: unknown): string {
  const normalized = stem.replace(/\s+/g, "").trim();
  return createHash("sha1").update(`${type}|${normalized}|${JSON.stringify(answer)}`).digest("hex");
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

// 判分（与 S9 grading 口径一致：选择类集合相等，填空全空命中才算对）
function grade(type: QuestionType, answer: any, chosen: any): boolean {
  if (type === QuestionType.FILL_BLANK) {
    const ans: string[][] = answer;
    const cho: string[] = chosen;
    if (!Array.isArray(cho) || cho.length !== ans.length) return false;
    return ans.every((accept, i) => accept.map(normalize).includes(normalize(cho[i] ?? "")));
  }
  const a = [...(answer as string[])].sort();
  const c = [...(chosen as string[])].sort();
  return a.length === c.length && a.every((v, i) => v === c[i]);
}

async function main() {
  console.log("🧹 清空旧数据...");
  // 按外键依赖顺序删除（子表 → 父表）
  await prisma.answerItem.deleteMany();
  await prisma.wrongQuestion.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.examClass.deleteMany();
  await prisma.examQuestion.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.questionKnowledgePoint.deleteMany();
  await prisma.question.deleteMany();
  await prisma.knowledgePoint.deleteMany();
  await prisma.questionBank.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.class.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();

  // ---------- 账号（密码哈希）----------
  console.log("👤 创建教师 / 超管...");
  const adminHash = await bcrypt.hash("admin123", 10);
  const teacherHash = await bcrypt.hash("teacher123", 10);

  const admin = await prisma.teacher.create({
    data: { username: "admin", passwordHash: adminHash, name: "超级管理员", isAdmin: true },
  });
  const teacher1 = await prisma.teacher.create({
    data: { username: "teacher01", passwordHash: teacherHash, name: "张老师" },
  });
  const teacher2 = await prisma.teacher.create({
    data: { username: "teacher02", passwordHash: teacherHash, name: "李老师" },
  });

  // ---------- 班级 ----------
  console.log("🏫 创建班级...");
  const class1 = await prisma.class.create({ data: { name: "高一(1)班", teacherId: teacher1.id } });
  const class2 = await prisma.class.create({ data: { name: "高一(2)班", teacherId: teacher1.id } });

  // ---------- 学生（默认密码整批只算一次哈希）----------
  console.log("🎓 创建 30 名学生...");
  const studentHash = await bcrypt.hash(DEFAULT_STUDENT_PWD, 10);
  const surnames = ["王", "李", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴"];
  const givenNames = ["伟", "芳", "娜", "敏", "静", "强", "磊", "洋", "勇", "艳"];

  const studentsData: Prisma.StudentCreateManyInput[] = [];
  for (let i = 1; i <= 30; i++) {
    const studentNo = `20240${String(100 + i).padStart(5, "0")}`; // 9-10位数字学号
    const name = surnames[i % surnames.length] + givenNames[(i * 3) % givenNames.length];
    studentsData.push({ studentNo, name, passwordHash: studentHash });
  }
  await prisma.student.createMany({ data: studentsData });
  const students = await prisma.student.findMany({ orderBy: { studentNo: "asc" } });

  // 1-15 入 1 班，16-30 入 2 班
  console.log("📝 建立选课关系...");
  await prisma.enrollment.createMany({
    data: students.map((s, idx) => ({
      studentId: s.id,
      classId: idx < 15 ? class1.id : class2.id,
    })),
  });

  // ---------- 题库与题目 ----------
  console.log("📚 创建题库与题目...");
  const bank1 = await prisma.questionBank.create({
    data: { name: "通识基础题库", subject: "综合", description: "示例题库，含四种题型", createdBy: teacher1.id },
  });
  await prisma.questionBank.create({
    data: { name: "数学题库", subject: "数学", createdBy: teacher1.id },
  });

  type Q = {
    type: QuestionType;
    stem: string;
    options: Prisma.InputJsonValue | null;
    answer: Prisma.InputJsonValue;
    difficulty: Difficulty;
    analysis?: string;
  };
  const questions: Q[] = [
    {
      type: QuestionType.SINGLE_CHOICE,
      stem: "中华人民共和国成立于哪一年？",
      options: [
        { key: "A", text: "1947" },
        { key: "B", text: "1948" },
        { key: "C", text: "1949" },
        { key: "D", text: "1950" },
      ],
      answer: ["C"],
      difficulty: Difficulty.EASY,
      analysis: "1949 年 10 月 1 日中华人民共和国成立。",
    },
    {
      type: QuestionType.MULTIPLE_CHOICE,
      stem: "下列属于唐代诗人的有？",
      options: [
        { key: "A", text: "李白" },
        { key: "B", text: "杜甫" },
        { key: "C", text: "苏轼" },
        { key: "D", text: "白居易" },
      ],
      answer: ["A", "B", "D"],
      difficulty: Difficulty.MEDIUM,
      analysis: "苏轼为北宋人，其余三人为唐代诗人。",
    },
    {
      type: QuestionType.TRUE_FALSE,
      stem: "地球是太阳系中离太阳最近的行星。",
      options: null,
      answer: ["F"],
      difficulty: Difficulty.EASY,
      analysis: "离太阳最近的是水星。",
    },
    {
      type: QuestionType.FILL_BLANK,
      stem: "中国的首都是____，目前常住人口最多的直辖市是____。",
      options: null,
      answer: [["北京", "京城"], ["上海"]],
      difficulty: Difficulty.MEDIUM,
      analysis: "首都北京；常住人口最多的直辖市为上海。",
    },
    {
      type: QuestionType.SINGLE_CHOICE,
      stem: "水的化学式是？",
      options: [
        { key: "A", text: "CO₂" },
        { key: "B", text: "H₂O" },
        { key: "C", text: "O₂" },
        { key: "D", text: "NaCl" },
      ],
      answer: ["B"],
      difficulty: Difficulty.EASY,
    },
  ];

  await prisma.question.createMany({
    data: questions.map((q) => ({
      bankId: bank1.id,
      type: q.type,
      stem: q.stem,
      options: q.options ?? Prisma.JsonNull,
      answer: q.answer,
      difficulty: q.difficulty,
      analysis: q.analysis ?? null,
      contentHash: contentHash(q.type, q.stem, q.answer),
      importBatchId: "seed-batch-001",
    })),
  });
  const bank1Questions = await prisma.question.findMany({ where: { bankId: bank1.id }, orderBy: { id: "asc" } });

  // ---------- 组卷（整库快照）----------
  console.log("🧾 组卷（复制为试卷快照）...");
  const exam = await prisma.exam.create({
    data: {
      name: "通识基础第一次练习",
      type: ExamType.PRACTICE,
      allowRepeat: true,
      repeatLimit: 3,
      timeLimitSec: 1800,
      shuffleQuestions: false,
      shuffleOptions: false,
      createdBy: teacher1.id,
      classes: { create: [{ classId: class1.id }] },
      examQuestions: {
        create: bank1Questions.map((q, idx) => ({
          sourceId: q.id,
          order: idx + 1,
          score: 20, // 5 题 × 20 = 100
          type: q.type,
          stem: q.stem,
          options: q.options ?? Prisma.JsonNull,
          answer: q.answer as Prisma.InputJsonValue,
          analysis: q.analysis,
        })),
      },
    },
    include: { examQuestions: { orderBy: { order: "asc" } } },
  });
  const eqs = exam.examQuestions;

  // ---------- 作答记录 + 错题 ----------
  console.log("✍️  生成作答记录...");
  // 三名学生的作答（学生作答数组按 examQuestion.order 对应）
  const submissions: Record<number, any[]> = {
    [students[0].id]: [["C"], ["A", "B", "D"], ["F"], ["北京", "上海"], ["B"]], // 全对 → 100
    [students[1].id]: [["A"], ["A", "B", "D"], ["F"], ["北京", "上海"], ["B"]], // 第1题错 → 80
    [students[2].id]: [["C"], ["A", "B"], ["T"], ["北京", "上海"], ["B"]], // 第2、3题错 → 60
  };

  for (const [sid, chosenList] of Object.entries(submissions)) {
    const studentId = Number(sid);
    let totalScore = 0;
    const attempt = await prisma.attempt.create({
      data: {
        examId: exam.id,
        studentId,
        attemptNo: 1,
        status: AttemptStatus.SUBMITTED,
        elapsedSec: 600,
        startedAt: new Date(),
        submittedAt: new Date(),
      },
    });
    for (let i = 0; i < eqs.length; i++) {
      const eq = eqs[i];
      const chosen = chosenList[i];
      const correct = grade(eq.type, eq.answer, chosen);
      const got = correct ? eq.score : 0;
      totalScore += got;
      await prisma.answerItem.create({
        data: {
          attemptId: attempt.id,
          examQuestionId: eq.id,
          chosen,
          isCorrect: correct,
          scoreGot: got,
        },
      });
      if (!correct) {
        await prisma.wrongQuestion.create({
          data: { studentId, examQuestionId: eq.id, redoCount: 0, lastResult: null },
        });
      }
    }
    await prisma.attempt.update({ where: { id: attempt.id }, data: { score: totalScore } });
    console.log(`   学生 ${studentId} 得分 ${totalScore}`);
  }

  console.log("\n✅ Seed 完成！");
  console.log("   登录账号：");
  console.log("   - 超管 admin / admin123");
  console.log("   - 教师 teacher01 / teacher123, teacher02 / teacher123");
  console.log(`   - 学生 学号(${students[0].studentNo} 等) / ${DEFAULT_STUDENT_PWD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
