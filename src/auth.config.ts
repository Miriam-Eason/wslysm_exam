// Edge 安全的 NextAuth 基础配置（middleware 专用，不可 import Prisma / bcrypt）。
// 仅含 JWT/session 回调与 pages —— 真正访问数据库的 Credentials Provider 在 auth.ts 注入。
// 这是 Auth.js v5 官方推荐的「split config」模式：middleware 跑在 Edge runtime，
// 而 Prisma 与 bcryptjs 依赖 Node API，分离后才能在 Edge 解析 JWT。
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  // Credentials 登录必须用 JWT 会话策略（无法使用 database session）
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  trustHost: true,
  pages: {
    // 兜底登录页；实际跨角色重定向由 middleware.ts 精细处理
    signIn: "/teacher/login",
  },
  // 此处留空，真正的 Credentials Provider 在 auth.ts 注入（避免 Edge 打包进 Prisma）
  providers: [],
  callbacks: {
    // authorize 返回的 user 字段在首次登录时写入 token
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        if (user.role) token.role = user.role; // authorize 必返回 role
        token.name = user.name;
      }
      return token;
    },
    // token → session.user，供服务端 auth() 与客户端 useSession() 读取
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.name = token.name ?? session.user.name;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
