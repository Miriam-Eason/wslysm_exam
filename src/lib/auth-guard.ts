// 服务端二次鉴权（PRD §9 line113：鉴权在 middleware + handler 内双重校验）。
// proxy.ts 是第一道路由网关；此处为受保护页面/接口提供第二道防线，
// 即便未来 proxy matcher 漂移也不会裸奔。
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import type { Session } from "next-auth";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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
 *
 * 同时校验 JWT 中的 userId 在数据库中仍然存在：reseed 或手动删除账号后，
 * 旧 JWT 的 userId 会失效，导致班级/学生统计等查询静默返回 0。
 * 若 userId 已失效，携带 ?forceSignIn=1 跳登录页（proxy.ts 识别此参数并放行，
 * 避免"中间件看到 role → 回首页 → 服务端失效 → 回登录页"的死循环）。
 */
export async function requireRole(role: Role): Promise<Session> {
  const session = await auth();
  if (!session || session.user?.role !== role) {
    redirect(LOGIN_PATH[role]);
  }

  const userId = Number(session.user.id);
  if (!Number.isFinite(userId)) {
    redirect(`${LOGIN_PATH[role]}?forceSignIn=1`);
  }

  if (role === "teacher" || role === "admin") {
    const exists = await prisma.teacher.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) redirect(`${LOGIN_PATH[role]}?forceSignIn=1`);
  } else if (role === "student") {
    const exists = await prisma.student.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) redirect(`${LOGIN_PATH[role]}?forceSignIn=1`);
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
