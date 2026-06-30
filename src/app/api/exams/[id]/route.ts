// 考试详情 / 修改 / 删除（PRD §11）
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { updateExamSchema } from "@/lib/validations/exam";

async function getExamForWrite(id: number, teacherId: number) {
  return prisma.exam.findFirst({
    where: { id, createdBy: teacherId, deletedAt: null },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const { id } = await params;
  const examId = Number(id);
  if (!Number.isFinite(examId)) return fail("VALIDATION", "无效的考试 ID");

  // 允许查看已下架（软删除）考试，用于历史记录查看
  const exam = await prisma.exam.findFirst({
    where: { id: examId, createdBy: g.userId },
    include: {
      examQuestions: { orderBy: { order: "asc" } },
      classes: { include: { class: { select: { id: true, name: true } } } },
      _count: { select: { attempts: true } },
    },
  });
  if (!exam) return fail("NOT_FOUND", "考试不存在或无权访问");

  return ok({
    id: exam.id,
    name: exam.name,
    type: exam.type,
    allowRepeat: exam.allowRepeat,
    repeatLimit: exam.repeatLimit,
    deadline: exam.deadline,
    timeLimitSec: exam.timeLimitSec,
    shuffleQuestions: exam.shuffleQuestions,
    shuffleOptions: exam.shuffleOptions,
    attemptCount: exam._count.attempts,
    deletedAt: exam.deletedAt,
    classes: exam.classes.map((ec) => ({ id: ec.class.id, name: ec.class.name })),
    questions: exam.examQuestions.map((q) => ({
      id: q.id,
      order: q.order,
      score: q.score,
      type: q.type,
      stem: q.stem,
      options: q.options,
      answer: q.answer,
      analysis: q.analysis,
      sourceId: q.sourceId,
    })),
    createdAt: exam.createdAt,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const { id } = await params;
  const examId = Number(id);
  if (!Number.isFinite(examId)) return fail("VALIDATION", "无效的考试 ID");

  const exam = await getExamForWrite(examId, g.userId);
  if (!exam) return fail("NOT_FOUND", "考试不存在或无权访问");

  const body = await req.json().catch(() => null);
  const parsed = updateExamSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION", "参数校验失败", parsed.error.flatten());

  const data = parsed.data;
  const updated = await prisma.exam.update({
    where: { id: examId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.allowRepeat !== undefined && { allowRepeat: data.allowRepeat }),
      ...(data.repeatLimit !== undefined && { repeatLimit: data.repeatLimit }),
      ...(data.deadline !== undefined && {
        deadline: data.deadline ? new Date(data.deadline) : null,
      }),
      ...(data.timeLimitSec !== undefined && { timeLimitSec: data.timeLimitSec }),
      ...(data.shuffleQuestions !== undefined && { shuffleQuestions: data.shuffleQuestions }),
      ...(data.shuffleOptions !== undefined && { shuffleOptions: data.shuffleOptions }),
    },
  });

  return ok({ id: updated.id, name: updated.name });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const { id } = await params;
  const examId = Number(id);
  if (!Number.isFinite(examId)) return fail("VALIDATION", "无效的考试 ID");

  const exam = await prisma.exam.findFirst({
    where: { id: examId, createdBy: g.userId, deletedAt: null },
    include: { _count: { select: { attempts: true } } },
  });
  if (!exam) return fail("NOT_FOUND", "考试不存在或无权访问");

  if (exam._count.attempts > 0) {
    // 有作答记录 → 软删除
    await prisma.exam.update({
      where: { id: examId },
      data: { deletedAt: new Date() },
    });
    return ok({ deleted: false, softDeleted: true });
  }

  // 无作答 → 物理删除（ExamQuestion/ExamClass 级联删）
  await prisma.exam.delete({ where: { id: examId } });
  return ok({ deleted: true, softDeleted: false });
}
