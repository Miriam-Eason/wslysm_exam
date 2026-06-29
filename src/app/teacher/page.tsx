import { requireRole } from "@/lib/auth-guard";
import { SignOutButton } from "@/components/auth/sign-out-button";

// S1 占位仪表盘：验证教师登录与路由隔离。真正的教师仪表盘在 S2+ 实现。
export default async function TeacherHome() {
  const session = await requireRole("teacher"); // 服务端二次鉴权
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <span className="text-xs font-semibold uppercase tracking-widest text-primary">
        教师端
      </span>
      <h1 className="text-3xl font-bold tracking-tight text-on-surface">
        你好，{session.user.name}
      </h1>
      <p className="text-on-surface-variant">
        当前角色：<code className="rounded bg-surface-container px-2 py-0.5">{session.user.role}</code>
        （S1 鉴权占位页，S2 起接入班级 / 题库 / 考试管理）
      </p>
      <div>
        <SignOutButton redirectTo="/teacher/login" />
      </div>
    </main>
  );
}
