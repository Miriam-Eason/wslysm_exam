// GET /api/exams/:id/students/:studentId — 按学生下钻（PRD §7-11：该生最近一次作答详情）
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { getStudentLatestAttemptDetail } from "@/lib/stats";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> },
) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const { id, studentId } = await params;
  const examId = Number(id);
  const studentIdNum = Number(studentId);
  if (!Number.isFinite(examId) || !Number.isFinite(studentIdNum)) {
    return fail("VALIDATION", "无效的 ID");
  }

  const exam = await prisma.exam.findFirst({
    where: { id: examId, createdBy: g.userId },
    select: { id: true },
  });
  if (!exam) return fail("NOT_FOUND", "考试不存在或无权访问");

  const detail = await getStudentLatestAttemptDetail(examId, studentIdNum);
  if (!detail) return fail("NOT_FOUND", "该学生暂无已提交作答");

  return ok(detail);
}
