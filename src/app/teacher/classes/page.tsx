import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { ClassList } from "@/components/teacher/classes/class-list";

export const metadata = { title: "班级管理 · 无锡旅商智能练测系统" };

export default async function ClassesPage() {
  const session = await requireRole("teacher");
  const teacherId = Number(session.user.id);

  // 我授课的班级（全校共享模型）
  const rows = await prisma.class.findMany({
    where: { teachers: { some: { teacherId } } },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { enrollments: true } }, teacher: { select: { name: true } } },
  });

  const classes = rows.map((c) => ({
    id: c.id,
    name: c.name,
    studentCount: c._count.enrollments,
    creatorName: c.teacher.name,
    isCreator: c.teacherId === teacherId,
  }));

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">班级管理</h1>
          <p className="text-sm text-on-surface-variant">
            创建班级并导入学生名单；删除班级不会删除学生身份与历史考试。
          </p>
        </div>
      </header>

      <ClassList classes={classes} />
    </div>
  );
}
