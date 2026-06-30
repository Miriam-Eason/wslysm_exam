// POST /api/student/wrong-questions/:id/redo — 错题重做（PRD §11 S9）
// 判分、redoCount+1、写 lastResult，返回结果与正确答案
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { gradeQuestion } from "@/lib/grading";
import type { QuestionType } from "@prisma/client";

const redoSchema = z.object({
  chosen: z.unknown(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiRole("student");
  if (g.error) return g.error;
  const studentId = g.userId;
  const wqId = Number((await params).id);
  if (!wqId) return fail("VALIDATION", "无效的错题 ID");

  const body = await req.json().catch(() => null);
  const parsed = redoSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION", "参数校验失败");
  const { chosen } = parsed.data;

  const wq = await prisma.wrongQuestion.findFirst({
    where: { id: wqId, studentId },
    include: {
      examQuestion: {
        select: { type: true, answer: true, analysis: true },
      },
    },
  });
  if (!wq) return fail("NOT_FOUND", "错题不存在");

  const isCorrect = gradeQuestion(
    wq.examQuestion.type as QuestionType,
    wq.examQuestion.answer,
    chosen,
  );

  const updated = await prisma.wrongQuestion.update({
    where: { id: wqId },
    data: {
      redoCount: { increment: 1 },
      lastResult: isCorrect,
    },
  });

  return ok({
    isCorrect,
    correctAnswer: wq.examQuestion.answer,
    analysis: wq.examQuestion.analysis,
    redoCount: updated.redoCount,
  });
}
