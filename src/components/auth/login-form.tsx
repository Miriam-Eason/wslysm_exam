"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import type { Role } from "@/lib/validations/auth";

type Props = {
  role: Role;
  identifierLabel: string;
  identifierPlaceholder: string;
  /** 登录成功后默认跳转的区域首页（同时用于校验 callbackUrl 防开放重定向） */
  homePath: string;
  /** 强调色工具类，用于按钮与聚焦环（默认主色） */
  accentClassName?: string;
};

export function LoginForm({
  role,
  identifierLabel,
  identifierPlaceholder,
  homePath,
  accentClassName = "bg-primary hover:bg-primary/90 focus-visible:outline-primary",
}: Props) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        role,
        identifier,
        password,
        redirect: false,
      });
      if (!res || res.error) {
        setError("账号或密码错误，请重试");
        setLoading(false);
        return;
      }
      // 安全回跳：仅接受本区域内的 callbackUrl（按路径段边界判定，与 proxy.ts 一致），
      // 否则回首页 —— 防止 /teacherX 这类越界路径与开放重定向
      const cb = new URLSearchParams(window.location.search).get("callbackUrl");
      const safe = cb && (cb === homePath || cb.startsWith(homePath + "/"));
      const target = safe ? cb : homePath;
      router.push(target);
      router.refresh();
    } catch {
      setError("登录失败，请稍后重试");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="identifier"
          className="text-sm font-medium text-on-surface-variant"
        >
          {identifierLabel}
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder={identifierPlaceholder}
          className="h-12 rounded-[var(--radius-field)] border border-outline-variant bg-surface-container-lowest px-4 text-base text-on-surface outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="text-sm font-medium text-on-surface-variant"
        >
          密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="请输入密码"
          className="h-12 rounded-[var(--radius-field)] border border-outline-variant bg-surface-container-lowest px-4 text-base text-on-surface outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-[var(--radius-field)] bg-danger-container px-4 py-3 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        // h-14 = 56px，满足 design.md「Action Buttons 最小 56px 触摸目标」
        className={`mt-1 flex h-14 min-h-14 items-center justify-center rounded-full px-6 text-base font-semibold text-on-primary transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 ${accentClassName}`}
      >
        {loading ? "登录中…" : "登录"}
      </button>
    </form>
  );
}
