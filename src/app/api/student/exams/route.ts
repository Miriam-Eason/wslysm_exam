// GET /api/student/exams — 学生可见考试列表（PRD §11 S8）
// 通过 Enrollment∩ExamClass 确定可见范围，deadline 过滤，返回作答状态
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";

export async function GET(_req: NextRequest) {
  const g = await requireApiRole("student");
  if (g.error) return g.error;
  const studentId = g.userId;

  // 1. 找学生加入的班级
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    select: { classId: true },
  });
  const classIds = enrollments.map((e) => e.classId);
  if (!classIds.length) return ok([]);

  // 2. 找有关联班级的考试 id（去重）
  const examClasses = await prisma.examClass.findMany({
    where: { classId: { in: classIds } },
    select: { examId: true },
  });
  const examIds = [...new Set(examClasses.map((ec) => ec.examId))];
  if (!examIds.length) return ok([]);

  // 3. 查考试：过滤软删除 + deadline 未过
  const now = new Date();
  const exams = await prisma.exam.findMany({
    where: {
      id: { in: examIds },
      deletedAt: null,
      OR: [{ deadline: null }, { deadline: { gte: now } }],
    },
    include: {
      _count: { select: { examQuestions: true } },
      attempts: {
        where: { studentId },
        orderBy: { attemptNo: "desc" },
        select: {
          id: true,
          status: true,
          score: true,
          attemptNo: true,
          startedAt: true,
          submittedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(
    exams.map((e) => {
      const inProgress = e.attempts.find((a) => a.status === "IN_PROGRESS");
      const submitted = e.attempts.filter((a) => a.status === "SUBMITTED");
      const submittedCount = submitted.length;

      const canRepeat =
        e.allowRepeat &&
        (e.repeatLimit === null || submittedCount < e.repeatLimit);
      const remaining =
        e.allowRepeat && e.repeatLimit !== null
          ? Math.max(0, e.repeatLimit - submittedCount)
          : null;

      let status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";
      if (inProgress) status = "IN_PROGRESS";
      else if (submittedCount > 0) status = "SUBMITTED";
      else status = "NOT_STARTED";

      const latestSubmitted = submitted[0] ?? null;

      return {
        id: e.id,
        name: e.name,
        type: e.type,
        questionCount: e._count.examQuestions,
        deadline: e.deadline,
        timeLimitSec: e.timeLimitSec,
        allowRepeat: e.allowRepeat,
        repeatLimit: e.repeatLimit,
        status,
        inProgressAttemptId: inProgress?.id ?? null,
        submittedCount,
        canRepeat,
        remaining,
        latestScore: latestSubmitted?.score ?? null,
        latestAttemptId: latestSubmitted?.id ?? null,
        completedAt: latestSubmitted?.submittedAt ?? null,
        createdAt: e.createdAt,
      };
    }),
  );
}
