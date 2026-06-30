// 从试卷删除某题（操作快照，不影响原题库）
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; eqId: string }> },
) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const { id, eqId } = await params;
  const examId = Number(id);
  const eqIdNum = Number(eqId);
  if (!Number.isFinite(examId) || !Number.isFinite(eqIdNum)) {
    return fail("VALIDATION", "无效的 ID");
  }

  // 确认考试属于该教师
  const exam = await prisma.exam.findFirst({
    where: { id: examId, createdBy: g.userId, deletedAt: null },
    select: { id: true },
  });
  if (!exam) return fail("NOT_FOUND", "考试不存在或无权访问");

  // 确认题目属于该考试
  const eq = await prisma.examQuestion.findFirst({
    where: { id: eqIdNum, examId },
    select: { id: true },
  });
  if (!eq) return fail("NOT_FOUND", "试卷题目不存在");

  await prisma.examQuestion.delete({ where: { id: eqIdNum } });
  return ok({ deleted: true });
}
