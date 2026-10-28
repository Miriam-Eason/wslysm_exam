import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { analyzeQuestionImportBatch } from "@/lib/import/question-import";
import { readImportRequest } from "@/lib/import/question-import-request";
import { InvalidQuestionIdentityError, loadQuestionIdentities } from "@/lib/question-duplicates";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;
  const bankId = Number((await params).id);
  if (!Number.isInteger(bankId) || bankId <= 0) return fail("VALIDATION", "无效的题库 ID");
  const bank = await prisma.questionBank.findUnique({ where: { id: bankId }, select: { createdBy: true } });
  if (!bank) return fail("NOT_FOUND", "题库不存在");
  if (bank.createdBy !== g.userId) return fail("FORBIDDEN", "无权操作该题库");
  const request = await readImportRequest(req);
  if ("error" in request) return fail("VALIDATION", request.error);
  try {
    const existing = await loadQuestionIdentities(prisma, bankId);
    const result = analyzeQuestionImportBatch(request.files, existing);
    return ok({ files: result.files.map(file => ({ index: file.index, name: file.name, error: file.error, summary: file.summary, issues: file.issues })), summary: result.summary });
  } catch (error) {
    if (error instanceof InvalidQuestionIdentityError) return fail("CONFLICT", `题库中题目 ${error.questionId} 的身份数据无效，请先检查该题`);
    throw error;
  }
}
