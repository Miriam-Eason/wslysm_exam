import { LoginForm } from "@/components/auth/login-form";
import { LoginBrand } from "@/components/auth/login-brand";

export const metadata = { title: "超管登录 · 无锡旅商智能练测系统" };

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-inverse-surface px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-[var(--radius-card)] border border-white/10 bg-surface-container-lowest p-8 shadow-[0_8px_40px_rgba(0,0,0,0.35)] sm:p-10">
          <LoginBrand
            role="超管控制台"
            subtitle="仅限管理员账号访问，管理教师与学生账号"
            roleClassName="text-on-surface-variant"
          />

          <LoginForm
            role="admin"
            identifierLabel="管理员账号"
            identifierPlaceholder="请输入管理员账号"
            homePath="/admin"
            accentClassName="bg-inverse-surface hover:bg-inverse-surface/90 focus-visible:outline-inverse-surface"
          />
        </div>
      </div>
    </main>
  );
}
