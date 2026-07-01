import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export const metadata = { title: "数据浏览 · 无锡旅商智能练测系统" };

const PAGE_SIZE = 20;
const TABLES = [
  { key: "classes", label: "班级" },
  { key: "banks", label: "题库" },
  { key: "exams", label: "考试 / 练习" },
] as const;
type TableKey = (typeof TABLES)[number]["key"];

export default async function AdminBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; page?: string }>;
}) {
  await requireRole("admin");

  const { table: tableParam, page: pageParam } = await searchParams;
  const table: TableKey = TABLES.some((t) => t.key === tableParam) ? (tableParam as TableKey) : "classes";
  const page = Math.max(1, Number(pageParam) || 1);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">数据浏览</h1>
        <p className="text-sm text-on-surface-variant">只读浏览全校班级、题库、考试数据，不支持编辑。</p>
      </header>

      <div className="flex items-center gap-1 text-sm">
        {TABLES.map((t) => (
          <Link
            key={t.key}
            href={`/admin/browse?table=${t.key}`}
            className={`rounded-full px-3.5 py-1.5 transition ${
              table === t.key
                ? "bg-primary-container text-primary"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {table === "classes" && <ClassesTable page={page} />}
      {table === "banks" && <BanksTable page={page} />}
      {table === "exams" && <ExamsTable page={page} />}
    </div>
  );
}

async function ClassesTable({ page }: { page: number }) {
  const [total, rows] = await Promise.all([
    prisma.class.count(),
    prisma.class.findMany({
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        teacher: { select: { name: true } },
        _count: { select: { enrollments: true, teachers: true } },
      },
    }),
  ]);

  const head = (
    <>
      <TableHead>ID</TableHead>
      <TableHead>班级名称</TableHead>
      <TableHead>创建者</TableHead>
      <TableHead>学生数</TableHead>
      <TableHead>授课教师数</TableHead>
      <TableHead>创建时间</TableHead>
    </>
  );
  const body = rows.map((c) => (
    <TableRow key={c.id}>
      <TableCell className="tabular-nums text-on-surface-variant">{c.id}</TableCell>
      <TableCell className="font-medium">{c.name}</TableCell>
      <TableCell className="text-on-surface-variant">{c.teacher.name}</TableCell>
      <TableCell className="tabular-nums">{c._count.enrollments}</TableCell>
      <TableCell className="tabular-nums">{c._count.teachers}</TableCell>
      <TableCell className="text-on-surface-variant">{c.createdAt.toLocaleDateString("zh-CN")}</TableCell>
    </TableRow>
  ));

  return <BrowseShell table="classes" page={page} total={total} colCount={6} head={head} rows={body} />;
}

async function BanksTable({ page }: { page: number }) {
  const [total, rows] = await Promise.all([
    prisma.questionBank.count(),
    prisma.questionBank.findMany({
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        teacher: { select: { name: true } },
        _count: { select: { questions: true } },
      },
    }),
  ]);

  const head = (
    <>
      <TableHead>ID</TableHead>
      <TableHead>题库名称</TableHead>
      <TableHead>科目</TableHead>
      <TableHead>创建者</TableHead>
      <TableHead>题目数</TableHead>
      <TableHead>创建时间</TableHead>
    </>
  );
  const body = rows.map((b) => (
    <TableRow key={b.id}>
      <TableCell className="tabular-nums text-on-surface-variant">{b.id}</TableCell>
      <TableCell className="font-medium">{b.name}</TableCell>
      <TableCell className="text-on-surface-variant">{b.subject ?? "—"}</TableCell>
      <TableCell className="text-on-surface-variant">{b.teacher.name}</TableCell>
      <TableCell className="tabular-nums">{b._count.questions}</TableCell>
      <TableCell className="text-on-surface-variant">{b.createdAt.toLocaleDateString("zh-CN")}</TableCell>
    </TableRow>
  ));

  return <BrowseShell table="banks" page={page} total={total} colCount={6} head={head} rows={body} />;
}

const EXAM_TYPE_LABEL: Record<string, string> = { EXAM: "考试", PRACTICE: "练习" };

async function ExamsTable({ page }: { page: number }) {
  const [total, rows] = await Promise.all([
    prisma.exam.count(),
    prisma.exam.findMany({
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        teacher: { select: { name: true } },
        _count: { select: { classes: true, attempts: true } },
      },
    }),
  ]);

  const head = (
    <>
      <TableHead>ID</TableHead>
      <TableHead>名称</TableHead>
      <TableHead>类型</TableHead>
      <TableHead>创建者</TableHead>
      <TableHead>关联班级</TableHead>
      <TableHead>作答数</TableHead>
      <TableHead>状态</TableHead>
    </>
  );
  const body = rows.map((e) => (
    <TableRow key={e.id}>
      <TableCell className="tabular-nums text-on-surface-variant">{e.id}</TableCell>
      <TableCell className="font-medium">{e.name}</TableCell>
      <TableCell className="text-on-surface-variant">{EXAM_TYPE_LABEL[e.type] ?? e.type}</TableCell>
      <TableCell className="text-on-surface-variant">{e.teacher.name}</TableCell>
      <TableCell className="tabular-nums">{e._count.classes}</TableCell>
      <TableCell className="tabular-nums">{e._count.attempts}</TableCell>
      <TableCell>
        {e.deletedAt ? <Badge variant="danger">已下架</Badge> : <Badge variant="success">进行中</Badge>}
      </TableCell>
    </TableRow>
  ));

  return <BrowseShell table="exams" page={page} total={total} colCount={7} head={head} rows={body} />;
}

function BrowseShell({
  table,
  page,
  total,
  colCount,
  head,
  rows,
}: {
  table: TableKey;
  page: number;
  total: number;
  colCount: number;
  head: React.ReactNode;
  rows: React.ReactNode[];
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">{head}</TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="py-10 text-center text-on-surface-variant">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              rows
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-on-surface-variant">
          第 {page} / {totalPages} 页 · 共 {total} 条
        </span>
        <div className="flex items-center gap-2">
          <PagerLink table={table} page={page - 1} disabled={page <= 1} label="上一页" dir="prev" />
          <PagerLink table={table} page={page + 1} disabled={page >= totalPages} label="下一页" dir="next" />
        </div>
      </div>
    </div>
  );
}

function PagerLink({
  table,
  page,
  disabled,
  label,
  dir,
}: {
  table: TableKey;
  page: number;
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
    <Link href={`/admin/browse?table=${table}&page=${page}`} className={`${cls} text-on-surface hover:bg-surface-container-low`}>
      {dir === "prev" && <ChevronLeft className="size-4" />}
      {label}
      {dir === "next" && <ChevronRight className="size-4" />}
    </Link>
  );
}
