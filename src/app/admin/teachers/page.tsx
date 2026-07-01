import { Search } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { TeacherTable } from "@/components/admin/teachers/teacher-table";

export const metadata = { title: "教师账号管理 · 无锡旅商智能练测系统" };

export default async function AdminTeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireRole("admin");
  const currentUserId = Number(session.user.id);

  const { q } = await searchParams;
  const query = q?.trim();

  const where: Prisma.TeacherWhereInput = query
    ? { OR: [{ username: { contains: query } }, { name: { contains: query } }] }
    : {};

  const rows = await prisma.teacher.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { classes: true, teaching: true, questionBanks: true, exams: true } } },
  });

  const teachers = rows.map((t) => ({
    id: t.id,
    username: t.username,
    name: t.name,
    isAdmin: t.isAdmin,
    classCount: t._count.classes,
    teachingCount: t._count.teaching,
    bankCount: t._count.questionBanks,
    examCount: t._count.exams,
  }));

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">教师账号管理</h1>
        <p className="text-sm text-on-surface-variant">
          共 {teachers.length} 个账号；可新建教师 / 超管账号，或编辑权限、重置密码。
        </p>
      </header>

      <form action="/admin/teachers" method="get" className="flex max-w-sm items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant/60" />
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="搜索账号或姓名"
            className="flex h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-9 pr-3 text-sm text-on-surface outline-none transition placeholder:text-on-surface-variant/60 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
          />
        </div>
      </form>

      <TeacherTable teachers={teachers} currentUserId={currentUserId} />
    </div>
  );
}
