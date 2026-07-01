import Link from "next/link";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { StudentTable } from "@/components/admin/students/student-table";
import { ImportStudentsDialog } from "@/components/admin/students/import-dialog";
import { StudentFormDialog } from "@/components/admin/students/student-form-dialog";

export const metadata = { title: "学生账号管理 · 无锡旅商智能练测系统" };

const PAGE_SIZE = 20;

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; deleted?: string }>;
}) {
  await requireRole("admin");

  const { q, page: pageParam, deleted: deletedParam } = await searchParams;
  const query = q?.trim();
  const deleted = deletedParam === "deleted" || deletedParam === "all" ? deletedParam : "active";
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.StudentWhereInput = {
    ...(deleted === "active" ? { deletedAt: null } : deleted === "deleted" ? { deletedAt: { not: null } } : {}),
    ...(query ? { OR: [{ studentNo: { contains: query } }, { name: { contains: query } }] } : {}),
  };

  const [total, rows, classes] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: { enrollments: { select: { class: { select: { id: true, name: true } } } } },
    }),
    prisma.class.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const students = rows.map((s) => ({
    id: s.id,
    studentNo: s.studentNo,
    name: s.name,
    deletedAt: s.deletedAt,
    classes: s.enrollments.map((e) => e.class),
  }));

  const qs = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (deleted !== "active") params.set("deleted", deleted);
    Object.entries(overrides).forEach(([k, v]) => {
      if (v === undefined) params.delete(k);
      else params.set(k, v);
    });
    const s = params.toString();
    return s ? `/admin/students?${s}` : "/admin/students";
  };

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">学生账号管理</h1>
          <p className="text-sm text-on-surface-variant">共 {total} 名学生</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportStudentsDialog classes={classes} />
          <StudentFormDialog classes={classes} />
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form action="/admin/students" method="get" className="flex max-w-sm flex-1 items-center gap-2">
          {deleted !== "active" && <input type="hidden" name="deleted" value={deleted} />}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant/60" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="搜索学号或姓名"
              className="flex h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-9 pr-3 text-sm text-on-surface outline-none transition placeholder:text-on-surface-variant/60 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
            />
          </div>
        </form>

        <div className="flex items-center gap-1 text-sm">
          {(
            [
              ["active", "在用"],
              ["deleted", "已停用"],
              ["all", "全部"],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              href={qs({ deleted: value === "active" ? undefined : value, page: undefined })}
              className={`rounded-full px-3 py-1.5 transition ${
                deleted === value
                  ? "bg-primary-container text-primary"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <StudentTable students={students} classes={classes} />

      <div className="flex items-center justify-between text-sm">
        <span className="text-on-surface-variant">
          第 {page} / {totalPages} 页 · 共 {total} 人
        </span>
        <div className="flex items-center gap-2">
          <PagerLink href={qs({ page: String(page - 1) })} disabled={page <= 1} label="上一页" dir="prev" />
          <PagerLink
            href={qs({ page: String(page + 1) })}
            disabled={page >= totalPages}
            label="下一页"
            dir="next"
          />
        </div>
      </div>
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
