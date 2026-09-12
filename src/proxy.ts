// 路由鉴权与角色隔离（PRD §15）。
// 用 Edge 安全的 authConfig 构建 middleware 实例（不引入 Prisma），仅解析 JWT 判定角色。
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import type { Role } from "@/lib/validations/auth";

const { auth } = NextAuth(authConfig);

// 受保护区域：前缀 → 角色 + 对应登录页。
const AREAS: { prefix: string; role: Role; login: string }[] = [
  { prefix: "/admin", role: "admin", login: "/superadmin" },
  { prefix: "/teacher", role: "teacher", login: "/teacher/login" },
  { prefix: "/student", role: "student", login: "/student/login" },
];

const LOGIN_PAGES: { path: string; role: Role }[] = [
  { path: "/superadmin", role: "admin" },
  { path: "/teacher/login", role: "teacher" },
  { path: "/student/login", role: "student" },
];

function homeForRole(role: Role): string {
  return AREAS.find((a) => a.role === role)?.prefix ?? "/";
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role as Role | undefined;

  // 旧超管登录地址不再提供页面，统一收口到独立入口，且丢弃其回跳参数。
  if (pathname === "/admin/login") {
    return NextResponse.redirect(new URL("/superadmin", req.nextUrl));
  }

  // 登录页是独立公开路由，但已登录用户不应再次看到任何登录页。
  const loginPage = LOGIN_PAGES.find((page) => pathname === page.path);
  if (loginPage) {
    // forceSignIn=1 由服务端校验发现 JWT 中的 userId 已失效时附加。
    const forceSignIn = req.nextUrl.searchParams.get("forceSignIn");
    if (role && !forceSignIn) {
      return NextResponse.redirect(new URL(homeForRole(role), req.nextUrl));
    }
    return NextResponse.next();
  }

  // 命中哪个受保护区域（精确等于前缀，或以「前缀/」开头）
  const area = AREAS.find(
    (a) => pathname === a.prefix || pathname.startsWith(a.prefix + "/"),
  );
  if (!area) return NextResponse.next(); // 非受保护区域，放行

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
  // 受保护区域及各登录页；不触达 /、/api/auth/*、静态资源。
  matcher: ["/teacher/:path*", "/admin/:path*", "/student/:path*", "/superadmin/:path*"],
};
