import { requireRole } from "@/lib/auth-guard";
import { AdminSidebar } from "@/components/admin/sidebar";

// 超管端统一框架：左侧 Sidebar（240px）+ 右侧内容区（max-w 1200）；服务端二次鉴权。
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("admin");

  return (
    <div className="flex min-h-screen bg-surface">
      <AdminSidebar userName={session.user.name ?? "超管"} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1200px] px-8 py-7">{children}</div>
      </main>
    </div>
  );
}
