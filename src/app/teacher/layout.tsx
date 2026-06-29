import { requireRole } from "@/lib/auth-guard";
import { TeacherSidebar } from "@/components/teacher/sidebar";

// 教师端统一框架：左侧 Sidebar（240px）+ 右侧内容区（max-w 1200）。
// 同时承担服务端二次鉴权——本布局包裹所有 /teacher/* 页面（登录页在 (auth) 组内，不受影响）。
export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("teacher");

  return (
    <div className="flex min-h-screen bg-surface">
      <TeacherSidebar userName={session.user.name ?? "教师"} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1200px] px-8 py-7">{children}</div>
      </main>
    </div>
  );
}
