import Link from "next/link";
import { GraduationCap, Users, BookOpen, FileText, Database, ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

export default async function AdminHome() {
  const session = await requireRole("admin");

  const [teacherCount, studentCount, classCount, bankCount, examCount] = await Promise.all([
    prisma.teacher.count(),
    prisma.student.count({ where: { deletedAt: null } }),
    prisma.class.count(),
    prisma.questionBank.count(),
    prisma.exam.count({ where: { deletedAt: null } }),
  ]);

  const stats = [
    { label: "教师账号", value: teacherCount, icon: GraduationCap, href: "/admin/teachers" },
    { label: "学生账号", value: studentCount, icon: Users, href: "/admin/students" },
    { label: "班级", value: classCount, icon: Database, href: "/admin/browse?table=classes" },
    { label: "题库", value: bankCount, icon: BookOpen, href: "/admin/browse?table=banks" },
    { label: "考试 / 练习", value: examCount, icon: FileText, href: "/admin/browse?table=exams" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">超管控制台</span>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">你好，{session.user.name}</h1>
        <p className="text-sm text-on-surface-variant">
          在此管理全校教师 / 学生账号，并只读浏览班级、题库、考试等数据。
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} className="block">
              <Card className="h-full p-5 transition hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(0,91,193,0.10)]">
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary-container text-primary">
                    <Icon className="size-5" />
                  </div>
                  <ArrowRight className="size-4 text-on-surface-variant/50" />
                </div>
                <p className="mt-4 text-3xl font-bold tracking-tight text-on-surface">{s.value}</p>
                <p className="mt-1 text-sm text-on-surface-variant">{s.label}</p>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-base font-semibold text-on-surface">教师账号管理</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            新建 / 编辑 / 删除教师账号，授予或取消超管权限。
          </p>
          <div className="mt-4">
            <Link
              href="/admin/teachers"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary transition hover:bg-primary/90"
            >
              <GraduationCap className="size-4" />
              前往教师管理
            </Link>
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="text-base font-semibold text-on-surface">学生账号管理</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            新建 / 编辑 / 删除学生账号，重置密码，或批量导入学生名单。
          </p>
          <div className="mt-4">
            <Link
              href="/admin/students"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary transition hover:bg-primary/90"
            >
              <Users className="size-4" />
              前往学生管理
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
