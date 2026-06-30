import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { CreateExamWizard } from "@/components/teacher/exams/create-exam-wizard";

export const metadata = { title: "新建考试 · 无锡旅商智能练测系统" };

export default async function NewExamPage() {
  const session = await requireRole("teacher");
  const teacherId = Number(session.user.id);

  const [bankRows, classRows] = await Promise.all([
    prisma.questionBank.findMany({
      where: { createdBy: teacherId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { questions: true } } },
    }),
    prisma.classTeacher.findMany({
      where: { teacherId },
      include: {
        class: {
          include: { _count: { select: { enrollments: true } } },
        },
      },
    }),
  ]);

  const banks = bankRows.map((b) => ({
    id: b.id,
    name: b.name,
    subject: b.subject,
    questionCount: b._count.questions,
  }));

  const classes = classRows.map((ct) => ({
    id: ct.class.id,
    name: ct.class.name,
    studentCount: ct.class._count.enrollments,
  }));

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">新建考试 / 练习</h1>
        <p className="text-sm text-on-surface-variant">
          按步骤填写信息，确认后将题库题目复制为试卷快照。
        </p>
      </header>
      <CreateExamWizard banks={banks} classes={classes} />
    </div>
  );
}
