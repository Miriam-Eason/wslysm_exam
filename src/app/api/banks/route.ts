// 题库列表 / 新建（PRD §11）
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { createBankSchema } from "@/lib/validations/bank";

export async function GET() {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const banks = await prisma.questionBank.findMany({
    where: { createdBy: g.userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  return ok(
    banks.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      subject: b.subject,
      questionCount: b._count.questions,
      updatedAt: b.updatedAt,
    })),
  );
}

export async function POST(req: NextRequest) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const body = await req.json().catch(() => null);
  const parsed = createBankSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION", "参数校验失败", parsed.error.flatten());

  const created = await prisma.questionBank.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      subject: parsed.data.subject || null,
      createdBy: g.userId,
    },
  });

  return ok({ id: created.id, name: created.name }, { status: 201 });
}
