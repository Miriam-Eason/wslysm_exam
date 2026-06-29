// 题目改 / 删（PRD §11；不影响已组卷的 ExamQuestion 快照）
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { questionInputSchema } from "@/lib/validations/question";
import { buildQuestionData } from "@/lib/question-data";

// 校验题目存在且其题库归属当前教师
async function ownQuestionOr(idParam: string, teacherId: number) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return { error: fail("VALIDATION", "无效的题目 ID") } as const;
  const q = await prisma.question.findUnique({
    where: { id },
    select: { id: true, bank: { select: { createdBy: true } } },
  });
  if (!q) return { error: fail("NOT_FOUND", "题目不存在") } as const;
  if (q.bank.createdBy !== teacherId) return { error: fail("FORBIDDEN", "无权操作该题目") } as const;
  return { id } as const;
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
    await prisma.question.update({
      where: { id: owned.id },
      data: buildQuestionData(parsed.data),
    });
    return ok({ id: owned.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("CONFLICT", "题库内已存在相同题目（题干与答案重复）");
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
