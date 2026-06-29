// 服务端二次鉴权（PRD §9 line113：鉴权在 middleware + handler 内双重校验）。
// proxy.ts 是第一道路由网关；此处为受保护页面/接口提供第二道防线，
// 即便未来 proxy matcher 漂移也不会裸奔。
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import type { Session } from "next-auth";

import { auth } from "@/auth";
import { fail } from "@/lib/api";
import type { Role } from "@/lib/validations/auth";

const LOGIN_PATH: Record<Role, string> = {
  teacher: "/teacher/login",
  admin: "/admin/login",
  student: "/student/login",
};

/**
 * 要求当前会话角色等于 role，否则重定向到对应登录页。
 * 返回值保证 session 非空且 role 匹配，调用方可直接读取 session.user。
 */
export async function requireRole(role: Role): Promise<Session> {
  const session = await auth();
  if (!session || session.user?.role !== role) {
    redirect(LOGIN_PATH[role]);
  }
  return session;
}

/**
 * API 路由版鉴权：成功返回 { session, userId }，失败返回 { error: NextResponse }。
 * 用法：const g = await requireApiRole("teacher"); if (g.error) return g.error;
 */
export async function requireApiRole(
  role: Role,
): Promise<
  | { session: Session; userId: number; error?: undefined }
  | { session?: undefined; userId?: undefined; error: NextResponse }
> {
  const session = await auth();
  if (!session?.user) {
    return { error: fail("UNAUTHORIZED", "未登录或会话已失效") };
  }
  if (session.user.role !== role) {
    return { error: fail("FORBIDDEN", "无权访问该资源") };
  }
  return { session, userId: Number(session.user.id) };
}
