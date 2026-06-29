import { requireRole } from "@/lib/auth-guard";
import { SignOutButton } from "@/components/auth/sign-out-button";

// S1 占位控制台：验证超管登录与路由隔离。真正的超管面板在 S12 实现。
export default async function AdminHome() {
  const session = await requireRole("admin"); // 服务端二次鉴权
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
        超管控制台
      </span>
      <h1 className="text-3xl font-bold tracking-tight text-on-surface">
        你好，{session.user.name}
      </h1>
      <p className="text-on-surface-variant">
        当前角色：<code className="rounded bg-surface-container px-2 py-0.5">{session.user.role}</code>
        （S1 鉴权占位页，S12 起接入教师 / 学生账号管理）
      </p>
      <div>
        <SignOutButton redirectTo="/admin/login" />
      </div>
    </main>
  );
}
