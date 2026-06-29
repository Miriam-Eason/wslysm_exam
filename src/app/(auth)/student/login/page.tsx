import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { LoginBrand } from "@/components/auth/login-brand";

export const metadata = { title: "学生登录 · 无锡旅商智能练测系统" };

export default function StudentLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5 py-10">
      {/* 移动优先：居中、最大宽度 430px，贴合 iPhone 触达 */}
      <div className="w-full max-w-[430px]">
        <LoginBrand
          role="学生端"
          subtitle="登录后开始练习与考试"
          align="center"
        />

        <div className="rounded-[var(--radius-card)] border border-outline-variant/50 bg-surface-container-lowest/80 p-6 shadow-[0_8px_40px_rgba(0,91,193,0.08)] backdrop-blur-xl">
          <LoginForm
            role="student"
            identifierLabel="学号"
            identifierPlaceholder="请输入学号"
            homePath="/student"
          />
        </div>

        <p className="mt-6 text-center text-sm text-on-surface-variant">
          教师 / 管理员请前往{" "}
          <Link href="/teacher/login" className="font-medium text-primary hover:underline">
            教师登录
          </Link>
        </p>
      </div>
    </main>
  );
}
