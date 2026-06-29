import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { BankList } from "@/components/teacher/banks/bank-list";

export const metadata = { title: "题库管理 · 无锡旅商智能练测系统" };

export default async function BanksPage() {
  const session = await requireRole("teacher");
  const teacherId = Number(session.user.id);

  const rows = await prisma.questionBank.findMany({
    where: { createdBy: teacherId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  const banks = rows.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    subject: b.subject,
    questionCount: b._count.questions,
  }));

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">题库管理</h1>
        <p className="text-sm text-on-surface-variant">
          管理题库与题目；删除题库会删除其题目，但不影响已组卷的试卷快照。
        </p>
      </header>
      <BankList banks={banks} />
    </div>
  );
}
