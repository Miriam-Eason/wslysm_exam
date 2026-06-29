import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { ChevronLeft, ChevronRight, ArrowLeft, BookOpen } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { QuestionList } from "@/components/teacher/banks/question-list";
import type { EditableQuestion } from "@/components/teacher/banks/question-form-dialog";
import { QUESTION_TYPES, DIFFICULTIES, type QType, type Diff, type QuestionOption } from "@/lib/question";

const PAGE_SIZE = 10;

export default async function BankDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string; difficulty?: string; page?: string }>;
}) {
  const session = await requireRole("teacher");
  const teacherId = Number(session.user.id);

  const { id } = await params;
  const bankId = Number(id);
  if (!Number.isInteger(bankId) || bankId <= 0) notFound();

  const bank = await prisma.questionBank.findUnique({ where: { id: bankId } });
  if (!bank || bank.createdBy !== teacherId) notFound();

  const sp = await searchParams;
  const filterType = (QUESTION_TYPES as readonly string[]).includes(sp.type ?? "") ? (sp.type as QType) : "";
  const filterDifficulty = (DIFFICULTIES as readonly string[]).includes(sp.difficulty ?? "")
    ? (sp.difficulty as Diff)
    : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.QuestionWhereInput = { bankId };
  if (filterType) where.type = filterType;
  if (filterDifficulty) where.difficulty = filterDifficulty;

  const [total, rows] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { id: "desc" },
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const questions: EditableQuestion[] = rows.map((q) => ({
    id: q.id,
    type: q.type as QType,
    stem: q.stem,
    options: (q.options as unknown as QuestionOption[] | null) ?? null,
    answer: q.answer,
    difficulty: q.difficulty as Diff,
    analysis: q.analysis,
    textbook: q.textbook,
    unit: q.unit,
    knowledgePoint: q.knowledgePoint,
  }));

  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    if (filterType) q.set("type", filterType);
    if (filterDifficulty) q.set("difficulty", filterDifficulty);
    q.set("page", String(p));
    return `/teacher/banks/${bankId}?${q.toString()}`;
  };

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <Link
          href="/teacher/banks"
          className="inline-flex w-fit items-center gap-1 text-sm text-on-surface-variant hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          返回题库列表
        </Link>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">{bank.name}</h1>
          <p className="flex items-center gap-1.5 text-sm text-on-surface-variant">
            <BookOpen className="size-4" />
            共 {total} 道题{bank.subject ? ` · ${bank.subject}` : ""}
          </p>
        </div>
      </div>

      <QuestionList
        bankId={bankId}
        questions={questions}
        filterType={filterType}
        filterDifficulty={filterDifficulty}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-on-surface-variant">
            第 {page} / {totalPages} 页 · 共 {total} 题
          </span>
          <div className="flex items-center gap-2">
            <PagerLink href={pageHref(page - 1)} disabled={page <= 1} label="上一页" dir="prev" />
            <PagerLink href={pageHref(page + 1)} disabled={page >= totalPages} label="下一页" dir="next" />
          </div>
        </div>
      )}
    </div>
  );
}

function PagerLink({
  href,
  disabled,
  label,
  dir,
}: {
  href: string;
  disabled: boolean;
  label: string;
  dir: "prev" | "next";
}) {
  const cls = "inline-flex h-9 items-center gap-1 rounded-lg border border-outline-variant px-3 text-sm transition";
  if (disabled) {
    return (
      <span className={`${cls} cursor-not-allowed text-on-surface-variant/40`}>
        {dir === "prev" && <ChevronLeft className="size-4" />}
        {label}
        {dir === "next" && <ChevronRight className="size-4" />}
      </span>
    );
  }
  return (
    <Link href={href} className={`${cls} text-on-surface hover:bg-surface-container-low`}>
      {dir === "prev" && <ChevronLeft className="size-4" />}
      {label}
      {dir === "next" && <ChevronRight className="size-4" />}
    </Link>
  );
}
