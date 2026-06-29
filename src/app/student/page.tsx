import { requireRole } from "@/lib/auth-guard";
import { SignOutButton } from "@/components/auth/sign-out-button";

// S1 占位页：验证学生登录与路由隔离。真正的考试/练习列表在 S8 实现。
export default async function StudentHome() {
  const session = await requireRole("student"); // 服务端二次鉴权
  return (
    <main className="mx-auto flex min-h-screen max-w-[430px] flex-col gap-6 px-5 py-14">
      <span className="text-xs font-semibold uppercase tracking-widest text-primary">
        学生端
      </span>
      <h1 className="text-2xl font-bold tracking-tight text-on-surface">
        你好，{session.user.name}
      </h1>
      <p className="text-on-surface-variant">
        当前角色：<code className="rounded bg-surface-container px-2 py-0.5">{session.user.role}</code>
        （S1 鉴权占位页，S8 起接入做题流程）
      </p>
      <div>
        <SignOutButton redirectTo="/student/login" />
      </div>
    </main>
  );
}
