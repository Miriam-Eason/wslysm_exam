import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { ExamDetail } from "@/components/teacher/exams/exam-detail";

export const metadata = { title: "试卷详情 · 无锡旅商智能练测系统" };

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("teacher");
  const teacherId = Number(session.user.id);
  const { id } = await params;
  const examId = Number(id);
  if (!Number.isFinite(examId)) notFound();

  // 允许查看已下架考试（deletedAt 不限）
  const exam = await prisma.exam.findFirst({
    where: { id: examId, createdBy: teacherId },
    include: {
      examQuestions: { orderBy: { order: "asc" } },
      classes: { include: { class: { select: { id: true, name: true } } } },
      _count: { select: { attempts: true } },
    },
  });
  if (!exam) notFound();

  const data = {
    id: exam.id,
    name: exam.name,
    type: exam.type as "EXAM" | "PRACTICE",
    allowRepeat: exam.allowRepeat,
    repeatLimit: exam.repeatLimit,
    deadline: exam.deadline?.toISOString() ?? null,
    timeLimitSec: exam.timeLimitSec,
    shuffleQuestions: exam.shuffleQuestions,
    shuffleOptions: exam.shuffleOptions,
    attemptCount: exam._count.attempts,
    classes: exam.classes.map((ec) => ({ id: ec.class.id, name: ec.class.name })),
    questions: exam.examQuestions.map((q) => ({
      id: q.id,
      order: q.order,
      score: q.score,
      type: q.type as string,
      stem: q.stem,
      options: q.options,
      answer: q.answer,
      analysis: q.analysis,
      sourceId: q.sourceId,
    })),
    createdAt: exam.createdAt.toISOString(),
    deletedAt: exam.deletedAt?.toISOString() ?? null,
  };

  return (
    <div className="flex flex-col gap-7">
      <ExamDetail exam={data} />
    </div>
  );
}
