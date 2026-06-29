import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Users,
  ArrowLeft,
} from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

const PAGE_SIZE = 20;

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireRole("teacher");
  const teacherId = Number(session.user.id);

  const { id } = await params;
  const classId = Number(id);
  if (!Number.isInteger(classId) || classId <= 0) notFound();

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls || cls.teacherId !== teacherId) notFound();

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where = { classId, student: { deletedAt: null } };
  const [total, enrollments] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { student: { studentNo: "asc" } },
      select: {
        student: { select: { id: true, studentNo: true, name: true, createdAt: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const students = enrollments.map((e) => e.student);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <Link
          href="/teacher/classes"
          className="inline-flex w-fit items-center gap-1 text-sm text-on-surface-variant hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          返回班级列表
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">{cls.name}</h1>
            <p className="flex items-center gap-1.5 text-sm text-on-surface-variant">
              <Users className="size-4" />
              共 {total} 名学生
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <a href="/api/students/template">
                <Download className="size-4" />
                下载导入模板
              </a>
            </Button>
            {/* 学生导入将在 S3 开放 */}
            <Button disabled title="学生导入将在下一步（S3）开放">
              <Upload className="size-4" />
              导入学生
            </Button>
          </div>
        </div>
      </div>

      {students.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-surface-container-high text-on-surface-variant">
            <Users className="size-7" />
          </div>
          <h3 className="text-lg font-semibold text-on-surface">班级暂无学生</h3>
          <p className="max-w-sm text-sm text-on-surface-variant">
            点击「下载导入模板」，填写学号与姓名后即可在下一步批量导入。
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16">序号</TableHead>
                <TableHead>学号</TableHead>
                <TableHead>姓名</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell className="text-on-surface-variant">
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">{s.studentNo}</TableCell>
                  <TableCell>{s.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t border-outline-variant/50 px-4 py-3 text-sm">
            <span className="text-on-surface-variant">
              第 {page} / {totalPages} 页 · 共 {total} 人
            </span>
            <div className="flex items-center gap-2">
              <PagerLink
                href={`/teacher/classes/${classId}?page=${page - 1}`}
                disabled={page <= 1}
                label="上一页"
                dir="prev"
              />
              <PagerLink
                href={`/teacher/classes/${classId}?page=${page + 1}`}
                disabled={page >= totalPages}
                label="下一页"
                dir="next"
              />
            </div>
          </div>
        </Card>
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
  const cls =
    "inline-flex h-9 items-center gap-1 rounded-lg border border-outline-variant px-3 text-sm transition";
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
