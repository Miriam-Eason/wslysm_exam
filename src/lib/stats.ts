// 成绩统计聚合（PRD §7-22 / S11）
// 口径：取每生最近一次 SUBMITTED Attempt（attemptNo 最大）参与平均分/分段/准确率/选项选择率计算
import { prisma } from "@/lib/prisma";

export type ScoreBucket = { range: string; count: number };

export type OptionRate = { key: string; text: string; count: number; rate: number };

export type QuestionStat = {
  examQuestionId: number;
  order: number;
  type: string;
  stem: string;
  score: number;
  answer: unknown;
  correctCount: number;
  totalCount: number;
  accuracy: number;
  optionRates: OptionRate[] | null;
};

export type StudentRow = {
  studentId: number;
  name: string;
  studentNo: string;
  className: string | null;
  submitted: boolean;
  attemptId: number | null;
  attemptNo: number;
  attemptCount: number;
  score: number | null;
  submittedAt: string | null;
};

export type ExamStats = {
  maxScore: number;
  totalStudents: number;
  submittedCount: number;
  avgScore: number;
  passRate: number; // >=60% 的比例
  highScore: number;
  lowScore: number;
  scoreBuckets: ScoreBucket[];
  questionStats: QuestionStat[];
  students: StudentRow[];
};

const BUCKET_DEFS = [
  { range: "0-59", min: 0, max: 60 },
  { range: "60-69", min: 60, max: 70 },
  { range: "70-79", min: 70, max: 80 },
  { range: "80-89", min: 80, max: 90 },
  { range: "90-100", min: 90, max: Infinity },
];

async function getClassNamesByStudent(examId: number, studentIds: number[]) {
  const map = new Map<number, string>();
  if (studentIds.length === 0) return map;
  const rows = await prisma.enrollment.findMany({
    where: {
      studentId: { in: studentIds },
      class: { examClasses: { some: { examId } } },
    },
    select: { studentId: true, class: { select: { name: true } } },
  });
  for (const r of rows) {
    if (!map.has(r.studentId)) map.set(r.studentId, r.class.name);
  }
  return map;
}

export async function getExamStats(examId: number): Promise<ExamStats> {
  const examQuestions = await prisma.examQuestion.findMany({
    where: { examId },
    orderBy: { order: "asc" },
    select: { id: true, order: true, type: true, stem: true, options: true, answer: true, score: true },
  });
  const maxScore = examQuestions.reduce((s, q) => s + q.score, 0);

  const [enrolled, submittedAttempts] = await Promise.all([
    prisma.enrollment.findMany({
      where: { class: { examClasses: { some: { examId } } } },
      select: {
        studentId: true,
        student: { select: { name: true, studentNo: true } },
      },
      distinct: ["studentId"],
    }),
    prisma.attempt.findMany({
      where: { examId, status: "SUBMITTED" },
      orderBy: { attemptNo: "asc" },
      select: {
        id: true,
        studentId: true,
        attemptNo: true,
        score: true,
        submittedAt: true,
        student: { select: { name: true, studentNo: true } },
      },
    }),
  ]);
  const totalStudents = enrolled.length;

  // 按学生分组取最近一次（attemptNo 最大），并统计每人作答次数
  const latestByStudent = new Map<number, (typeof submittedAttempts)[number]>();
  const attemptCountByStudent = new Map<number, number>();
  for (const a of submittedAttempts) {
    attemptCountByStudent.set(a.studentId, (attemptCountByStudent.get(a.studentId) ?? 0) + 1);
    const cur = latestByStudent.get(a.studentId);
    if (!cur || a.attemptNo > cur.attemptNo) latestByStudent.set(a.studentId, a);
  }
  const latestAttempts = [...latestByStudent.values()];
  const latestAttemptIds = latestAttempts.map((a) => a.id);
  const scores = latestAttempts.map((a) => a.score ?? 0);

  const avgScore = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
  const highScore = scores.length ? Math.max(...scores) : 0;
  const lowScore = scores.length ? Math.min(...scores) : 0;
  const passRate = scores.length
    ? scores.filter((s) => (maxScore > 0 ? s / maxScore : 0) >= 0.6).length / scores.length
    : 0;

  const scoreBuckets: ScoreBucket[] = BUCKET_DEFS.map((b) => ({ range: b.range, count: 0 }));
  for (const s of scores) {
    const pct = maxScore > 0 ? (s / maxScore) * 100 : 0;
    const idx = BUCKET_DEFS.findIndex((b) => pct >= b.min && pct < b.max);
    scoreBuckets[idx === -1 ? BUCKET_DEFS.length - 1 : idx].count += 1;
  }

  const answerItems = latestAttemptIds.length
    ? await prisma.answerItem.findMany({
        where: { attemptId: { in: latestAttemptIds } },
        select: { examQuestionId: true, chosen: true, isCorrect: true },
      })
    : [];
  const itemsByQuestion = new Map<number, typeof answerItems>();
  for (const it of answerItems) {
    const list = itemsByQuestion.get(it.examQuestionId) ?? [];
    list.push(it);
    itemsByQuestion.set(it.examQuestionId, list);
  }

  const questionStats: QuestionStat[] = examQuestions.map((q) => {
    const items = itemsByQuestion.get(q.id) ?? [];
    const totalCount = items.length;
    const correctCount = items.filter((i) => i.isCorrect).length;

    let optionRates: OptionRate[] | null = null;
    if ((q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") && Array.isArray(q.options)) {
      optionRates = (q.options as { key: string; text: string }[]).map((opt) => {
        const count = items.filter(
          (i) => Array.isArray(i.chosen) && (i.chosen as string[]).includes(opt.key),
        ).length;
        return { key: opt.key, text: opt.text, count, rate: totalCount > 0 ? count / totalCount : 0 };
      });
    }

    return {
      examQuestionId: q.id,
      order: q.order,
      type: q.type,
      stem: q.stem,
      score: q.score,
      answer: q.answer,
      correctCount,
      totalCount,
      accuracy: totalCount > 0 ? correctCount / totalCount : 0,
      optionRates,
    };
  });

  const classNames = await getClassNamesByStudent(examId, enrolled.map((e) => e.studentId));

  const submittedRows: StudentRow[] = latestAttempts
    .map((a) => ({
      studentId: a.studentId,
      name: a.student.name,
      studentNo: a.student.studentNo,
      className: classNames.get(a.studentId) ?? null,
      submitted: true,
      attemptId: a.id,
      attemptNo: a.attemptNo,
      attemptCount: attemptCountByStudent.get(a.studentId) ?? 1,
      score: a.score ?? 0,
      submittedAt: a.submittedAt?.toISOString() ?? null,
    }))
    .sort((x, y) => (y.score ?? 0) - (x.score ?? 0));

  // 未提交作答的学生（已加入考试班级但无任何 SUBMITTED 记录）
  const unsubmittedRows: StudentRow[] = enrolled
    .filter((e) => !latestByStudent.has(e.studentId))
    .map((e) => ({
      studentId: e.studentId,
      name: e.student.name,
      studentNo: e.student.studentNo,
      className: classNames.get(e.studentId) ?? null,
      submitted: false,
      attemptId: null,
      attemptNo: 0,
      attemptCount: 0,
      score: null,
      submittedAt: null,
    }))
    .sort((x, y) => x.studentNo.localeCompare(y.studentNo));

  const students: StudentRow[] = [...submittedRows, ...unsubmittedRows];

  return {
    maxScore,
    totalStudents,
    submittedCount: latestAttempts.length,
    avgScore,
    passRate,
    highScore,
    lowScore,
    scoreBuckets,
    questionStats,
    students,
  };
}

export type StudentAttemptDetail = {
  attemptId: number;
  studentName: string;
  studentNo: string;
  attemptNo: number;
  score: number;
  maxScore: number;
  elapsedSec: number;
  submittedAt: string | null;
  questions: {
    id: number;
    order: number;
    type: string;
    stem: string;
    options: unknown;
    answer: unknown;
    analysis: string | null;
    score: number;
    chosen: unknown;
    isCorrect: boolean;
    scoreGot: number;
  }[];
};

// 取该学生在此考试的最近一次已提交作答详情（教师下钻用）
export async function getStudentLatestAttemptDetail(
  examId: number,
  studentId: number,
): Promise<StudentAttemptDetail | null> {
  const attempt = await prisma.attempt.findFirst({
    where: { examId, studentId, status: "SUBMITTED" },
    orderBy: { attemptNo: "desc" },
    select: {
      id: true,
      attemptNo: true,
      score: true,
      elapsedSec: true,
      submittedAt: true,
      student: { select: { name: true, studentNo: true } },
    },
  });
  if (!attempt) return null;

  const [examQuestions, answerItems] = await Promise.all([
    prisma.examQuestion.findMany({
      where: { examId },
      orderBy: { order: "asc" },
      select: { id: true, order: true, type: true, stem: true, options: true, answer: true, analysis: true, score: true },
    }),
    prisma.answerItem.findMany({
      where: { attemptId: attempt.id },
      select: { examQuestionId: true, chosen: true, isCorrect: true, scoreGot: true },
    }),
  ]);
  const answerByQuestion = new Map(answerItems.map((a) => [a.examQuestionId, a]));
  const maxScore = examQuestions.reduce((s, q) => s + q.score, 0);

  return {
    attemptId: attempt.id,
    studentName: attempt.student.name,
    studentNo: attempt.student.studentNo,
    attemptNo: attempt.attemptNo,
    score: attempt.score ?? 0,
    maxScore,
    elapsedSec: attempt.elapsedSec,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    questions: examQuestions.map((q) => {
      const a = answerByQuestion.get(q.id);
      return {
        id: q.id,
        order: q.order,
        type: q.type,
        stem: q.stem,
        options: q.options,
        answer: q.answer,
        analysis: q.analysis,
        score: q.score,
        chosen: a?.chosen ?? null,
        isCorrect: a?.isCorrect ?? false,
        scoreGot: a?.scoreGot ?? 0,
      };
    }),
  };
}
