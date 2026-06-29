// 路由鉴权与角色隔离（PRD §15）。
// 用 Edge 安全的 authConfig 构建 middleware 实例（不引入 Prisma），仅解析 JWT 判定角色。
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import type { Role } from "@/lib/validations/auth";

const { auth } = NextAuth(authConfig);

// 受保护区域：前缀 → 角色 + 该区域登录页
const AREAS: { prefix: string; role: Role; login: string }[] = [
  { prefix: "/admin", role: "admin", login: "/admin/login" },
  { prefix: "/teacher", role: "teacher", login: "/teacher/login" },
  { prefix: "/student", role: "student", login: "/student/login" },
];

function homeForRole(role: Role): string {
  return AREAS.find((a) => a.role === role)?.prefix ?? "/";
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role as Role | undefined;

  // 命中哪个受保护区域（精确等于前缀，或以「前缀/」开头）
  const area = AREAS.find(
    (a) => pathname === a.prefix || pathname.startsWith(a.prefix + "/"),
  );
  if (!area) return NextResponse.next(); // 非受保护区域，放行

  const isLoginPage = pathname === area.login;

  if (isLoginPage) {
    // 任何已登录用户访问任意登录页 → 回各自首页（与下方跨角色保护页逻辑对称，
    // 避免给已登录的教师展示 /admin/login 等异区门户）
    if (role) {
      return NextResponse.redirect(new URL(homeForRole(role), req.nextUrl));
    }
    return NextResponse.next(); // 未登录，允许查看登录页
  }

  // 受保护页面：未登录 → 跳本区域登录页（带 callbackUrl 回跳）
  if (!role) {
    const url = new URL(area.login, req.nextUrl);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // 已登录但角色不符 → 跨角色拦截，送回各自首页
  if (role !== area.role) {
    return NextResponse.redirect(new URL(homeForRole(role), req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // 仅拦截三大受保护前缀；不触达 /、/api/auth/*、静态资源
  matcher: ["/teacher/:path*", "/admin/:path*", "/student/:path*"],
};
