// GET /api/student/wrong-questions — 错题本列表（按考试分组，含答案供回顾，PRD §11 S9）
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";

export async function GET(_req: NextRequest) {
  const g = await requireApiRole("student");
  if (g.error) return g.error;
  const studentId = g.userId;

  const wrongQuestions = await prisma.wrongQuestion.findMany({
    where: { studentId },
    include: {
      examQuestion: {
        select: {
          id: true,
          examId: true,
          type: true,
          stem: true,
          options: true,
          answer: true,
          analysis: true,
          score: true,
          exam: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Group by examId
  const groupMap = new Map<
    number,
    {
      examId: number;
      examName: string;
      questions: {
        wrongQuestionId: number;
        examQuestionId: number;
        type: string;
        stem: string;
        options: unknown;
        answer: unknown;
        analysis: string | null;
        score: number;
        redoCount: number;
        lastResult: boolean | null;
      }[];
    }
  >();

  for (const wq of wrongQuestions) {
    const eq = wq.examQuestion;
    if (!groupMap.has(eq.examId)) {
      groupMap.set(eq.examId, {
        examId: eq.examId,
        examName: eq.exam.name,
        questions: [],
      });
    }
    groupMap.get(eq.examId)!.questions.push({
      wrongQuestionId: wq.id,
      examQuestionId: eq.id,
      type: eq.type,
      stem: eq.stem,
      options: eq.options,
      answer: eq.answer,
      analysis: eq.analysis,
      score: eq.score,
      redoCount: wq.redoCount,
      lastResult: wq.lastResult,
    });
  }

  return ok(Array.from(groupMap.values()));
}
