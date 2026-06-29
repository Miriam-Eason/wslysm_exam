// 题库改 / 删（PRD §11；删库级联删题目，试卷快照不受影响）
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { updateBankSchema } from "@/lib/validations/bank";

async function ownBankOr(idParam: string, teacherId: number) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return { error: fail("VALIDATION", "无效的题库 ID") } as const;
  const bank = await prisma.questionBank.findUnique({ where: { id } });
  if (!bank) return { error: fail("NOT_FOUND", "题库不存在") } as const;
  if (bank.createdBy !== teacherId) return { error: fail("FORBIDDEN", "无权操作该题库") } as const;
  return { id } as const;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;
  const { id } = await params;
  const owned = await ownBankOr(id, g.userId);
  if (owned.error) return owned.error;

  const body = await req.json().catch(() => null);
  const parsed = updateBankSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION", "参数校验失败", parsed.error.flatten());

  const updated = await prisma.questionBank.update({
    where: { id: owned.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      subject: parsed.data.subject || null,
    },
  });
  return ok({ id: updated.id, name: updated.name });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;
  const { id } = await params;
  const owned = await ownBankOr(id, g.userId);
  if (owned.error) return owned.error;

  await prisma.questionBank.delete({ where: { id: owned.id } }); // 级联删 Question；ExamQuestion 快照为弱引用，不受影响
  return ok({ id: owned.id, deleted: true });
}
