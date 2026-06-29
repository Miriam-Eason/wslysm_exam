import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { LoginBrand } from "@/components/auth/login-brand";

export const metadata = { title: "教师登录 · 无锡旅商智能练测系统" };

export default function TeacherLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-[var(--radius-card)] border border-outline-variant/60 bg-surface-container-lowest p-8 shadow-[0_8px_40px_rgba(0,91,193,0.08)] sm:p-10">
          <LoginBrand
            role="教师端"
            subtitle="使用教师账号登录，管理班级、题库与考试"
          />

          <LoginForm
            role="teacher"
            identifierLabel="用户名"
            identifierPlaceholder="请输入教师账号"
            homePath="/teacher"
          />

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            学生请前往{" "}
            <Link href="/student/login" className="font-medium text-primary hover:underline">
              学生登录
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
