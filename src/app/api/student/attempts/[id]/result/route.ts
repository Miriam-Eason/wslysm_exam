// GET /api/student/attempts/:id/result — 作答结果（PRD §11 S10）
// 返回：得分、逐题对错、正确答案与解析
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiRole("student");
  if (g.error) return g.error;
  const studentId = g.userId;
  const attemptId = Number((await params).id);
  if (!attemptId) return fail("VALIDATION", "无效的作答 ID");

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, studentId, status: "SUBMITTED" },
    select: {
      id: true,
      examId: true,
      score: true,
      elapsedSec: true,
      submittedAt: true,
      exam: {
        select: {
          id: true,
          name: true,
          type: true,
          allowRepeat: true,
          repeatLimit: true,
        },
      },
      answerItems: {
        select: {
          examQuestionId: true,
          chosen: true,
          isCorrect: true,
          scoreGot: true,
        },
      },
    },
  });
  if (!attempt) return fail("NOT_FOUND", "作答记录不存在或尚未提交");

  // 获取题目快照（含正确答案和解析，结果页才允许下发）
  const examQuestions = await prisma.examQuestion.findMany({
    where: { examId: attempt.examId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      order: true,
      type: true,
      stem: true,
      options: true,
      answer: true,
      analysis: true,
      score: true,
    },
  });

  const answerMap = new Map(
    attempt.answerItems.map((a) => [a.examQuestionId, a]),
  );

  const maxScore = examQuestions.reduce((s, q) => s + q.score, 0);

  return ok({
    attemptId: attempt.id,
    examId: attempt.examId,
    examName: attempt.exam.name,
    examType: attempt.exam.type,
    score: attempt.score ?? 0,
    maxScore,
    elapsedSec: attempt.elapsedSec,
    submittedAt: attempt.submittedAt,
    questions: examQuestions.map((q) => {
      const item = answerMap.get(q.id);
      return {
        id: q.id,
        order: q.order,
        type: q.type,
        stem: q.stem,
        options: q.options,
        answer: q.answer, // 结果页允许下发正确答案
        analysis: q.analysis,
        score: q.score,
        chosen: item?.chosen ?? null,
        isCorrect: item?.isCorrect ?? false,
        scoreGot: item?.scoreGot ?? 0,
      };
    }),
  });
}
