// POST /api/student/attempts/:id/submit — 提交判分（PRD §11 S9）
// 逐题调 grading → 写 isCorrect/scoreGot → 汇总 Attempt.score/status=SUBMITTED
// → upsert WrongQuestion → 返回总分
import type { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { gradeQuestion } from "@/lib/grading";
import type { QuestionType } from "@prisma/client";

const submitSchema = z.object({
  answers: z.array(
    z.object({
      examQuestionId: z.number().int().positive(),
      chosen: z.unknown(),
    }),
  ),
  elapsedSec: z.number().int().min(0),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiRole("student");
  if (g.error) return g.error;
  const studentId = g.userId;
  const attemptId = Number((await params).id);
  if (!attemptId) return fail("VALIDATION", "无效的作答 ID");

  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION", "参数校验失败", parsed.error.flatten());
  }
  const { answers, elapsedSec } = parsed.data;

  // 1. 校验 attempt 归属 + 状态
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, studentId, status: "IN_PROGRESS" },
    select: { id: true, examId: true },
  });
  if (!attempt) return fail("NOT_FOUND", "作答不存在或已提交");

  // 2. 获取试卷所有题目（含 answer，仅服务端使用）
  const examQuestions = await prisma.examQuestion.findMany({
    where: { examId: attempt.examId },
    select: {
      id: true,
      type: true,
      answer: true,
      score: true,
    },
  });
  const qMap = new Map(examQuestions.map((q) => [q.id, q]));

  // 3. 构建 answers map（含未作答的空）
  const answersMap = new Map(
    answers.map((a) => [a.examQuestionId, a.chosen]),
  );

  // 4. 逐题判分
  type GradedItem = {
    examQuestionId: number;
    chosen: unknown;
    isCorrect: boolean;
    scoreGot: number;
  };
  const graded: GradedItem[] = [];
  let totalScore = 0;

  for (const eq of examQuestions) {
    const chosen = answersMap.get(eq.id) ?? null;
    const isCorrect = gradeQuestion(
      eq.type as QuestionType,
      eq.answer,
      chosen,
    );
    const scoreGot = isCorrect ? eq.score : 0;
    totalScore += scoreGot;
    graded.push({
      examQuestionId: eq.id,
      chosen,
      isCorrect,
      scoreGot,
    });
  }

  // 5. 事务：写 AnswerItem + 更新 Attempt + upsert WrongQuestion
  await prisma.$transaction(async (tx) => {
    // 删除旧草稿并重写（确保判分结果覆盖）
    await tx.answerItem.deleteMany({ where: { attemptId } });
    await tx.answerItem.createMany({
      data: graded.map((g) => ({
        attemptId,
        examQuestionId: g.examQuestionId,
        chosen: (g.chosen ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        isCorrect: g.isCorrect,
        scoreGot: g.scoreGot,
      })),
    });

    await tx.attempt.update({
      where: { id: attemptId },
      data: {
        status: "SUBMITTED",
        score: totalScore,
        elapsedSec,
        submittedAt: new Date(),
        lastSavedAt: new Date(),
      },
    });

    // upsert WrongQuestion（错题本）
    for (const g of graded) {
      if (!g.isCorrect && g.chosen !== null) {
        await tx.wrongQuestion.upsert({
          where: {
            studentId_examQuestionId: {
              studentId,
              examQuestionId: g.examQuestionId,
            },
          },
          create: {
            studentId,
            examQuestionId: g.examQuestionId,
            redoCount: 0,
            lastResult: false,
          },
          update: {
            lastResult: false,
            updatedAt: new Date(),
          },
        });
      } else if (g.isCorrect) {
        // 答对：更新错题本标记（若存在）
        await tx.wrongQuestion
          .update({
            where: {
              studentId_examQuestionId: {
                studentId,
                examQuestionId: g.examQuestionId,
              },
            },
            data: { lastResult: true, updatedAt: new Date() },
          })
          .catch(() => {}); // 若没有错题记录则忽略
      }
    }
  });

  const maxScore = examQuestions.reduce((s, q) => s + q.score, 0);

  return ok({
    score: totalScore,
    maxScore,
    correctCount: graded.filter((g) => g.isCorrect).length,
    totalCount: graded.length,
  });
}
