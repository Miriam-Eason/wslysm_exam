"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GraduationCap, Users, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/auth/sign-out-button";

const NAV = [
  { href: "/admin", label: "控制台", icon: LayoutDashboard },
  { href: "/admin/teachers", label: "教师账号", icon: GraduationCap },
  { href: "/admin/students", label: "学生账号", icon: Users },
  { href: "/admin/browse", label: "数据浏览", icon: Database },
];

export function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-outline-variant bg-surface-container-low">
      <div className="flex h-16 items-center px-5">
        <Image
          src="/school-logo.png"
          alt="无锡旅商智能练测系统"
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
            pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"));

          return (
            <Link
              key={item.href}
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
            <p className="text-xs text-on-surface-variant">超级管理员</p>
          </div>
        </div>
        <SignOutButton redirectTo="/admin/login" />
      </div>
    </aside>
  );
}
