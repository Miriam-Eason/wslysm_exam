import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getExamStats } from "@/lib/stats";
import { ExamStats } from "@/components/teacher/exams/exam-stats";

export const metadata = { title: "成绩统计 · 无锡旅商智能练测系统" };

export default async function ExamStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("teacher");
  const teacherId = Number(session.user.id);
  const { id } = await params;
  const examId = Number(id);
  if (!Number.isFinite(examId)) notFound();

  const exam = await prisma.exam.findFirst({
    where: { id: examId, createdBy: teacherId },
    select: { id: true, name: true, type: true, deadline: true, deletedAt: true },
  });
  if (!exam) notFound();

  const stats = await getExamStats(examId);

  return (
    <div className="flex flex-col gap-7">
      <ExamStats
        exam={{
          id: exam.id,
          name: exam.name,
          type: exam.type as "EXAM" | "PRACTICE",
          deadline: exam.deadline?.toISOString() ?? null,
          isArchived: !!exam.deletedAt,
        }}
        stats={stats}
      />
    </div>
  );
}
