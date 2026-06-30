// 考试列表 / 组卷（PRD §11）
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { createExamSchema } from "@/lib/validations/exam";

export async function GET(req: NextRequest) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const archived = req.nextUrl.searchParams.get("archived") === "1";

  const exams = await prisma.exam.findMany({
    where: {
      createdBy: g.userId,
      deletedAt: archived ? { not: null } : null,
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { examQuestions: true, attempts: true } },
      classes: { include: { class: { select: { id: true, name: true } } } },
    },
  });

  return ok(
    exams.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      allowRepeat: e.allowRepeat,
      repeatLimit: e.repeatLimit,
      deadline: e.deadline,
      timeLimitSec: e.timeLimitSec,
      shuffleQuestions: e.shuffleQuestions,
      shuffleOptions: e.shuffleOptions,
      questionCount: e._count.examQuestions,
      attemptCount: e._count.attempts,
      classes: e.classes.map((ec) => ({ id: ec.class.id, name: ec.class.name })),
      createdAt: e.createdAt,
      deletedAt: e.deletedAt,
    })),
  );
}

export async function POST(req: NextRequest) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const body = await req.json().catch(() => null);
  const parsed = createExamSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION", "参数校验失败", parsed.error.flatten());

  const {
    name, type, bankId, allowRepeat, repeatLimit, deadline,
    timeLimitSec, shuffleQuestions, shuffleOptions, classIds, defaultScore,
  } = parsed.data;

  // 验证题库属于该教师
  const bank = await prisma.questionBank.findFirst({
    where: { id: bankId, createdBy: g.userId },
    include: { questions: { orderBy: { id: "asc" } } },
  });
  if (!bank) return fail("NOT_FOUND", "题库不存在或无权访问");
  if (bank.questions.length === 0) return fail("VALIDATION", "该题库没有题目，无法组卷");

  // 验证班级均在教师授课列表内
  const teachingClasses = await prisma.classTeacher.findMany({
    where: { teacherId: g.userId, classId: { in: classIds } },
  });
  if (teachingClasses.length !== classIds.length) {
    return fail("FORBIDDEN", "包含无权限的班级");
  }

  // $transaction：建考试 + ExamQuestion 快照 + ExamClass
  const exam = await prisma.$transaction(async (tx) => {
    const created = await tx.exam.create({
      data: {
        name,
        type,
        allowRepeat,
        repeatLimit: allowRepeat ? (repeatLimit ?? null) : null,
        deadline: deadline ? new Date(deadline) : null,
        timeLimitSec: timeLimitSec ?? null,
        shuffleQuestions,
        shuffleOptions,
        createdBy: g.userId,
      },
    });

    await tx.examQuestion.createMany({
      data: bank.questions.map((q, i) => ({
        examId: created.id,
        sourceId: q.id,
        order: i + 1,
        score: defaultScore,
        type: q.type,
        stem: q.stem,
        options: q.options !== null ? (q.options as Prisma.InputJsonValue) : Prisma.DbNull,
        answer: q.answer as Prisma.InputJsonValue,
        analysis: q.analysis ?? null,
      })),
    });

    await tx.examClass.createMany({
      data: classIds.map((classId) => ({ examId: created.id, classId })),
    });

    return created;
  });

  return ok({ id: exam.id, name: exam.name }, { status: 201 });
}
