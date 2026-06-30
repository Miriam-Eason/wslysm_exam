// POST /api/student/exams/:id/attempt — 开始或续答（PRD §11 S8）
// 若有 IN_PROGRESS Attempt 则断点续答（恢复草稿 + elapsedSec）；
// 否则按 allowRepeat/repeatLimit 校验后新建 attemptNo。
// 返回题目时绝不包含 answer 字段（安全约束）。
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";

// 基于 seed 的 Fisher-Yates 乱序（LCG）—— 相同 seed 得到相同结果（断点续答一致性）
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = (seed ^ 0xdeadbeef) >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = s ^ (s >>> 16);
    const j = ((s >>> 0) % (i + 1) + (i + 1)) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

type RawExamQuestion = {
  id: number;
  order: number;
  type: string;
  stem: string;
  options: unknown;
  score: number;
};

function buildQuestions(
  raw: Array<{
    id: number;
    order: number;
    type: string;
    stem: string;
    options: unknown;
    score: number;
    // answer 字段存在于原始查询但此处不使用
  }>,
  shuffleQuestions: boolean,
  shuffleOptions: boolean,
  seed: number,
): RawExamQuestion[] {
  let qs = [...raw];
  if (shuffleQuestions) {
    qs = seededShuffle(qs, seed);
  }
  return qs.map((q, displayIndex) => {
    let options = q.options as { key: string; text: string }[] | null;
    if (options && shuffleOptions) {
      options = seededShuffle(options, seed + q.id);
    }
    return {
      id: q.id,
      order: shuffleQuestions ? displayIndex + 1 : q.order,
      type: q.type,
      stem: q.stem,
      options,
      score: q.score,
    };
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiRole("student");
  if (g.error) return g.error;
  const studentId = g.userId;
  const examId = Number((await params).id);
  if (!examId) return fail("VALIDATION", "无效的考试 ID");

  // 1. 校验考试存在且学生通过 Enrollment∩ExamClass 可见
  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      deletedAt: null,
      classes: {
        some: {
          class: {
            enrollments: { some: { studentId } },
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      type: true,
      allowRepeat: true,
      repeatLimit: true,
      deadline: true,
      timeLimitSec: true,
      shuffleQuestions: true,
      shuffleOptions: true,
      examQuestions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          type: true,
          stem: true,
          options: true,
          score: true,
          // answer 字段不包含在 select 中，确保绝不下发
        },
      },
    },
  });
  if (!exam) return fail("NOT_FOUND", "考试不存在或无权访问");

  // 2. 截止时间校验
  if (exam.deadline && exam.deadline < new Date()) {
    return fail("FORBIDDEN", "该考试已截止");
  }

  // 3. 查找进行中的作答（断点续答）
  const inProgress = await prisma.attempt.findFirst({
    where: { examId, studentId, status: "IN_PROGRESS" },
    select: {
      id: true,
      elapsedSec: true,
      answerItems: {
        select: { examQuestionId: true, chosen: true },
      },
    },
  });

  if (inProgress) {
    const drafts: Record<number, unknown> = {};
    for (const item of inProgress.answerItems) {
      drafts[item.examQuestionId] = item.chosen;
    }
    const questions = buildQuestions(
      exam.examQuestions,
      exam.shuffleQuestions,
      exam.shuffleOptions,
      inProgress.id,
    );
    return ok({
      attemptId: inProgress.id,
      examId: exam.id,
      examName: exam.name,
      examType: exam.type,
      timeLimitSec: exam.timeLimitSec,
      elapsedSec: inProgress.elapsedSec,
      questions,
      drafts,
    });
  }

  // 4. 检查重做次数
  const submittedCount = await prisma.attempt.count({
    where: { examId, studentId, status: "SUBMITTED" },
  });
  if (submittedCount > 0 && !exam.allowRepeat) {
    return fail("FORBIDDEN", "该考试不允许重复作答");
  }
  if (
    exam.allowRepeat &&
    exam.repeatLimit !== null &&
    submittedCount >= exam.repeatLimit
  ) {
    return fail("FORBIDDEN", "已达到最大作答次数限制");
  }

  // 5. 新建 Attempt（捕获并发竞争写入导致的唯一约束冲突 P2002）
  let attempt: { id: number };
  try {
    attempt = await prisma.attempt.create({
      data: {
        examId,
        studentId,
        attemptNo: submittedCount + 1,
        status: "IN_PROGRESS",
        elapsedSec: 0,
      },
      select: { id: true },
    });
  } catch (e: unknown) {
    // React StrictMode 在开发环境下会 double-invoke effect，导致两个并发 POST 同时
    // 尝试 create，其中一个命中 @@unique([examId, studentId, attemptNo])，
    // 此时将其降级为"断点续答"，直接返回另一请求已创建好的 IN_PROGRESS attempt。
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const concurrent = await prisma.attempt.findFirst({
        where: { examId, studentId, status: "IN_PROGRESS" },
        select: {
          id: true,
          elapsedSec: true,
          answerItems: { select: { examQuestionId: true, chosen: true } },
        },
      });
      if (concurrent) {
        const drafts: Record<number, unknown> = {};
        for (const item of concurrent.answerItems) {
          drafts[item.examQuestionId] = item.chosen;
        }
        const questions = buildQuestions(
          exam.examQuestions,
          exam.shuffleQuestions,
          exam.shuffleOptions,
          concurrent.id,
        );
        return ok({
          attemptId: concurrent.id,
          examId: exam.id,
          examName: exam.name,
          examType: exam.type,
          timeLimitSec: exam.timeLimitSec,
          elapsedSec: concurrent.elapsedSec,
          questions,
          drafts,
        });
      }
    }
    throw e;
  }

  const questions = buildQuestions(
    exam.examQuestions,
    exam.shuffleQuestions,
    exam.shuffleOptions,
    attempt.id,
  );

  return ok(
    {
      attemptId: attempt.id,
      examId: exam.id,
      examName: exam.name,
      examType: exam.type,
      timeLimitSec: exam.timeLimitSec,
      elapsedSec: 0,
      questions,
      drafts: {},
    },
    { status: 201 },
  );
}
