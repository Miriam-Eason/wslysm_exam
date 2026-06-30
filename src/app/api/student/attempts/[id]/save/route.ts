// PATCH /api/student/attempts/:id/save — 草稿增量保存（PRD §11 S9）
// upsert AnswerItem（仅 chosen，不判分）+ 更新 elapsedSec/lastSavedAt
import type { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";

const saveSchema = z.object({
  answers: z.array(
    z.object({
      examQuestionId: z.number().int().positive(),
      chosen: z.unknown(),
    }),
  ),
  elapsedSec: z.number().int().min(0),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiRole("student");
  if (g.error) return g.error;
  const studentId = g.userId;
  const attemptId = Number((await params).id);
  if (!attemptId) return fail("VALIDATION", "无效的作答 ID");

  const body = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION", "参数校验失败", parsed.error.flatten());
  }
  const { answers, elapsedSec } = parsed.data;

  // 校验 attempt 归属 + 状态
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, studentId, status: "IN_PROGRESS" },
    select: { id: true },
  });
  if (!attempt) return fail("NOT_FOUND", "作答不存在或已提交");

  if (!answers.length) {
    await prisma.attempt.update({
      where: { id: attemptId },
      data: { elapsedSec, lastSavedAt: new Date() },
    });
    return ok({ saved: 0, elapsedSec });
  }

  // 查出已有 AnswerItem（AnswerItem 没有 @@unique，需手动 update-or-create）
  const qIds = answers.map((a) => a.examQuestionId);
  const existing = await prisma.answerItem.findMany({
    where: { attemptId, examQuestionId: { in: qIds } },
    select: { id: true, examQuestionId: true },
  });
  const existingMap = new Map(existing.map((e) => [e.examQuestionId, e.id]));

  await prisma.$transaction(async (tx) => {
    for (const a of answers) {
      const existingId = existingMap.get(a.examQuestionId);
      if (existingId !== undefined) {
        await tx.answerItem.update({
          where: { id: existingId },
          data: { chosen: a.chosen as Prisma.InputJsonValue },
        });
      } else {
        await tx.answerItem.create({
          data: {
            attemptId,
            examQuestionId: a.examQuestionId,
            chosen: a.chosen as Prisma.InputJsonValue,
            isCorrect: false,
            scoreGot: 0,
          },
        });
      }
    }
    await tx.attempt.update({
      where: { id: attemptId },
      data: { elapsedSec, lastSavedAt: new Date() },
    });
  });

  return ok({ saved: answers.length, elapsedSec });
}
