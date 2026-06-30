import Link from "next/link";
import { Users, GraduationCap, BookOpen, FileText, ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

export default async function TeacherDashboard() {
  const session = await requireRole("teacher");
  const teacherId = Number(session.user.id);

  // 「我的班级」= 我授课的班级；学生总数 = 我授课班级内的去重学生
  const [classCount, studentCount] = await Promise.all([
    prisma.class.count({ where: { teachers: { some: { teacherId } } } }),
    prisma.student.count({
      where: {
        deletedAt: null,
        enrollments: { some: { class: { teachers: { some: { teacherId } } } } },
      },
    }),
  ]);

  const stats = [
    { label: "我的班级", value: classCount, icon: Users, href: "/teacher/classes", accent: true },
    { label: "学生总数", value: studentCount, icon: GraduationCap, href: "/teacher/classes", accent: true },
    { label: "题库", value: "—", icon: BookOpen, href: null, accent: false },
    { label: "考试 / 练习", value: "—", icon: FileText, href: null, accent: false },
  ];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          教师端
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">
          你好，{session.user.name}
        </h1>
        <p className="text-sm text-on-surface-variant">
          欢迎回到无锡旅商智能练测系统，从这里管理你的班级与教学。
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          const body = (
            <Card className="h-full p-5 transition hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(0,91,193,0.10)]">
              <div className="flex items-center justify-between">
                <div
                  className={
                    "flex size-10 items-center justify-center rounded-xl " +
                    (s.accent
                      ? "bg-primary-container text-primary"
                      : "bg-surface-container text-on-surface-variant")
                  }
                >
                  <Icon className="size-5" />
                </div>
                {s.href && <ArrowRight className="size-4 text-on-surface-variant/50" />}
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-on-surface">
                {s.value}
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">{s.label}</p>
            </Card>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="block">
              {body}
            </Link>
          ) : (
            <div key={s.label} className="opacity-70">
              {body}
            </div>
          );
        })}
      </section>

      <section>
        <Card className="p-6">
          <h2 className="text-base font-semibold text-on-surface">快速开始</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            先创建班级并导入学生，后续即可组卷、布置练习与考试。
          </p>
          <div className="mt-4">
            <Link
              href="/teacher/classes"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary transition hover:bg-primary/90"
            >
              <Users className="size-4" />
              前往班级管理
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
