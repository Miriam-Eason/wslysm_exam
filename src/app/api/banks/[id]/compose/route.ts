// 组卷预览（S14 灵活组卷）：按规则解析出具体选题，返回题目列表 + 总数/满分/每规则命中。
// "预览即定稿"：前端拿本接口返回的 questionId 列表，确认组卷时原样回传给 POST /api/exams。
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { composePreviewSchema, selectQuestions } from "@/lib/exam-compose";
import type { QType, Diff } from "@/lib/question";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const { id } = await params;
  const bankId = Number(id);
  if (!Number.isInteger(bankId) || bankId <= 0) return fail("VALIDATION", "无效的题库 ID");

  const bank = await prisma.questionBank.findUnique({ where: { id: bankId } });
  if (!bank) return fail("NOT_FOUND", "题库不存在");
  if (bank.createdBy !== g.userId) return fail("FORBIDDEN", "无权访问该题库");

  const body = await req.json().catch(() => null);
  const parsed = composePreviewSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION", "参数校验失败", parsed.error.flatten());

  const questions = await prisma.question.findMany({
    where: { bankId },
    select: { id: true, type: true, difficulty: true, unit: true, knowledgePoint: true, stem: true },
  });

  const candidates = questions.map((q) => ({
    id: q.id,
    type: q.type as QType,
    difficulty: q.difficulty as Diff,
    unit: q.unit,
    knowledgePoint: q.knowledgePoint,
  }));

  const result = selectQuestions(candidates, parsed.data.rules);

  const stemById = new Map(questions.map((q) => [q.id, q]));
  const items = result.picks.map((p) => {
    const q = stemById.get(p.questionId)!;
    return {
      questionId: p.questionId,
      order: p.order,
      score: p.score,
      ruleIndex: p.ruleIndex,
      type: q.type,
      difficulty: q.difficulty,
      unit: q.unit,
      knowledgePoint: q.knowledgePoint,
      stem: q.stem.length > 60 ? q.stem.slice(0, 60) + "…" : q.stem,
    };
  });

  return ok({
    totalCount: result.totalCount,
    totalScore: result.totalScore,
    ruleResults: result.ruleResults,
    hasShortfall: result.ruleResults.some((r) => r.shortfall > 0),
    items,
  });
}
