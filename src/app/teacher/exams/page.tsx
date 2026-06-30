import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { ExamList } from "@/components/teacher/exams/exam-list";

export const metadata = { title: "考试管理 · 无锡旅商智能练测系统" };

export default async function ExamsPage() {
  const session = await requireRole("teacher");
  const teacherId = Number(session.user.id);

  const [activeRows, archivedRows] = await Promise.all([
    prisma.exam.findMany({
      where: { createdBy: teacherId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { examQuestions: true, attempts: true } },
        classes: { include: { class: { select: { id: true, name: true } } } },
      },
    }),
    prisma.exam.findMany({
      where: { createdBy: teacherId, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      include: {
        _count: { select: { examQuestions: true, attempts: true } },
        classes: { include: { class: { select: { id: true, name: true } } } },
      },
    }),
  ]);

  function mapExam(e: typeof activeRows[0]) {
    return {
      id: e.id,
      name: e.name,
      type: e.type as "EXAM" | "PRACTICE",
      allowRepeat: e.allowRepeat,
      repeatLimit: e.repeatLimit,
      deadline: e.deadline?.toISOString() ?? null,
      timeLimitSec: e.timeLimitSec,
      questionCount: e._count.examQuestions,
      attemptCount: e._count.attempts,
      classes: e.classes.map((ec) => ({ id: ec.class.id, name: ec.class.name })),
      createdAt: e.createdAt.toISOString(),
      deletedAt: e.deletedAt?.toISOString() ?? null,
    };
  }

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">考试管理</h1>
        <p className="text-sm text-on-surface-variant">
          创建考试或练习；从题库整库组卷，生成快照后原题改动不影响试卷。
        </p>
      </header>
      <ExamList exams={activeRows.map(mapExam)} archivedExams={archivedRows.map(mapExam)} />
    </div>
  );
}
