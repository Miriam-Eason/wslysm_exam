// 题目列表（按 type/difficulty 过滤分页）/ 新建（PRD §11）
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, parsePagination } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { questionInputSchema } from "@/lib/validations/question";
import { buildQuestionData } from "@/lib/question-data";
import { QUESTION_TYPES, DIFFICULTIES, type QType, type Diff } from "@/lib/question";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const { id } = await params;
  const bankId = Number(id);
  if (!Number.isInteger(bankId) || bankId <= 0) return fail("VALIDATION", "无效的题库 ID");

  const bank = await prisma.questionBank.findUnique({ where: { id: bankId } });
  if (!bank) return fail("NOT_FOUND", "题库不存在");
  if (bank.createdBy !== g.userId) return fail("FORBIDDEN", "无权查看该题库");

  const sp = req.nextUrl.searchParams;
  const typeParam = sp.get("type");
  const diffParam = sp.get("difficulty");
  const { page, pageSize, skip, take } = parsePagination(sp);

  const where: Prisma.QuestionWhereInput = { bankId };
  if (typeParam && (QUESTION_TYPES as readonly string[]).includes(typeParam)) {
    where.type = typeParam as QType;
  }
  if (diffParam && (DIFFICULTIES as readonly string[]).includes(diffParam)) {
    where.difficulty = diffParam as Diff;
  }

  const [total, items] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      skip,
      take,
      orderBy: { id: "desc" },
      // 教师端可见 answer（仅学生下发接口才屏蔽 answer）
      select: {
        id: true,
        type: true,
        stem: true,
        options: true,
        answer: true,
        difficulty: true,
        analysis: true,
        textbook: true,
        unit: true,
        knowledgePoint: true,
      },
    }),
  ]);

  return ok({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    bank: { id: bank.id, name: bank.name },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const { id } = await params;
  const bankId = Number(id);
  if (!Number.isInteger(bankId) || bankId <= 0) return fail("VALIDATION", "无效的题库 ID");

  const bank = await prisma.questionBank.findUnique({ where: { id: bankId } });
  if (!bank) return fail("NOT_FOUND", "题库不存在");
  if (bank.createdBy !== g.userId) return fail("FORBIDDEN", "无权操作该题库");

  const body = await req.json().catch(() => null);
  const parsed = questionInputSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION", "题目校验失败", parsed.error.flatten());

  try {
    const created = await prisma.question.create({
      data: { bankId, ...buildQuestionData(parsed.data) },
      select: { id: true },
    });
    return ok({ id: created.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("CONFLICT", "题库内已存在相同题目（题干与答案重复）");
    }
    throw e;
  }
}
