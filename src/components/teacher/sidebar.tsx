"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, BookOpen, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ChangePasswordDialog } from "@/components/teacher/change-password-dialog";

const NAV = [
  { href: "/teacher", label: "仪表盘", icon: LayoutDashboard, ready: true },
  { href: "/teacher/classes", label: "班级管理", icon: Users, ready: true },
  { href: "/teacher/banks", label: "题库管理", icon: BookOpen, ready: true },
  { href: "/teacher/exams", label: "考试管理", icon: FileText, ready: true },
];

const STATS_SUBNAV = [
  { hash: "score-buckets", label: "分数段分布" },
  { hash: "question-stats", label: "每题作答情况" },
  { hash: "student-scores", label: "学生成绩" },
];

export function TeacherSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const statsMatch = pathname.match(/^\/teacher\/exams\/\d+\/stats/);

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-outline-variant bg-surface-container-low">
      <div className="flex h-16 items-center px-5">
        <Image
          src="/school-logo.png"
          alt="无锡旅游商贸助考宝"
          width={1500}
          height={234}
          priority
          className="h-auto w-full max-w-[180px]"
        />
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/teacher" && pathname.startsWith(item.href + "/"));

          if (!item.ready) {
            return (
              <div
                key={item.href}
                title="即将开放"
                className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-on-surface-variant/45"
              >
                <Icon className="size-4" />
                {item.label}
                <span className="ml-auto rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-medium text-on-surface-variant/60">
                  待开发
                </span>
              </div>
            );
          }

          return (
            <div key={item.href} className="flex flex-col gap-1">
              <Link
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary-container text-primary"
                    : "text-on-surface-variant hover:bg-surface-container",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
                )}
                <Icon className="size-4" />
                {item.label}
              </Link>

              {item.href === "/teacher/exams" && statsMatch && (
                <div className="ml-[1.15rem] flex flex-col gap-0.5 border-l border-outline-variant/60 pl-4">
                  {STATS_SUBNAV.map((sub) => (
                    <Link
                      key={sub.hash}
                      href={`${statsMatch[0]}#${sub.hash}`}
                      className="rounded-lg px-2.5 py-1.5 text-[13px] text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-outline-variant/60 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary-container text-sm font-semibold text-primary">
            {userName.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-on-surface">{userName}</p>
            <p className="text-xs text-on-surface-variant">教师</p>
          </div>
        </div>
        <ChangePasswordDialog />
        <SignOutButton
          redirectTo="/teacher/login"
          className="flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold transition active:scale-[0.98]"
          style={{ background: "rgba(120,120,128,0.12)", color: "#ff3b30" }}
        />
      </div>
    </aside>
  );
}
