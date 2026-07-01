// GET /api/exams/:id/stats — 成绩统计（PRD §7-22 / S11）
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { getExamStats } from "@/lib/stats";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const examId = Number((await params).id);
  if (!Number.isFinite(examId)) return fail("VALIDATION", "无效的考试 ID");

  const exam = await prisma.exam.findFirst({
    where: { id: examId, createdBy: g.userId },
    select: { id: true },
  });
  if (!exam) return fail("NOT_FOUND", "考试不存在或无权访问");

  const stats = await getExamStats(examId);
  return ok(stats);
}
