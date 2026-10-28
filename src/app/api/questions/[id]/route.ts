// 题目改 / 删（PRD §11；不影响已组卷的 ExamQuestion 快照）
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { questionInputSchema } from "@/lib/validations/question";
import { buildQuestionData } from "@/lib/question-data";
import { classifyQuestionDuplicate, InvalidQuestionIdentityError, loadBankQuestionIdentityGroups, lockQuestionBank, QuestionBankNotFoundError } from "@/lib/question-duplicates";

// 校验题目存在且其题库归属当前教师
async function ownQuestionOr(idParam: string, teacherId: number) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return { error: fail("VALIDATION", "无效的题目 ID") } as const;
  const q = await prisma.question.findUnique({
    where: { id },
    select: { id: true, bankId: true, bank: { select: { createdBy: true } } },
  });
  if (!q) return { error: fail("NOT_FOUND", "题目不存在") } as const;
  if (q.bank.createdBy !== teacherId) return { error: fail("FORBIDDEN", "无权操作该题目") } as const;
  return { id, bankId: q.bankId } as const;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;
  const { id } = await params;
  const owned = await ownQuestionOr(id, g.userId);
  if (owned.error) return owned.error;

  const body = await req.json().catch(() => null);
  const parsed = questionInputSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION", "题目校验失败", parsed.error.flatten());

  try {
    const result = await prisma.$transaction(async (tx) => {
      await lockQuestionBank(tx, owned.bankId);
      const question = await tx.question.findUnique({
        where: { id: owned.id },
        select: { bankId: true, contentHash: true, bank: { select: { createdBy: true } } },
      });
      if (!question || question.bankId !== owned.bankId) return { error: "missing" } as const;
      if (question.bank.createdBy !== g.userId) return { error: "forbidden" } as const;
      const groups = await loadBankQuestionIdentityGroups(tx, owned.bankId, owned.id);
      const duplicate = classifyQuestionDuplicate(groups, parsed.data);
      if (duplicate) return { error: duplicate } as const;
      const data = buildQuestionData(parsed.data);
      await tx.question.update({
        where: { id: owned.id },
        // 历史哈希保持原值；新版哈希随身份变化更新。
        data: { ...data, contentHash: question.contentHash.startsWith("v2:") ? data.contentHash : question.contentHash },
      });
      return { id: owned.id } as const;
    });
    if ("error" in result) {
      if (result.error === "missing") return fail("NOT_FOUND", "题目不存在");
      if (result.error === "forbidden") return fail("FORBIDDEN", "无权操作该题目");
      return fail("CONFLICT", result.error === "conflict" ? "题库内已存在相同题目，但答案不同" : "题库内已存在相同题目");
    }
    return ok({ id: owned.id });
  } catch (e) {
    if (e instanceof QuestionBankNotFoundError) return fail("NOT_FOUND", "题目不存在");
    if (e instanceof InvalidQuestionIdentityError) return fail("CONFLICT", `题库中题目 ${e.questionId} 的身份数据无效，无法查重，请先检查该题`);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("CONFLICT", "题库内已存在相同题目");
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;
  const { id } = await params;
  const owned = await ownQuestionOr(id, g.userId);
  if (owned.error) return owned.error;

  await prisma.question.delete({ where: { id: owned.id } }); // 试卷快照为内容复制，不受影响
  return ok({ id: owned.id, deleted: true });
}
