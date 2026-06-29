// 扩展 NextAuth 的 Session / User / JWT 类型，注入 role、id（PRD §14：session 含 id/role/name）
import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/validations/auth";

declare module "next-auth" {
  interface User {
    // authorize 返回值的扩展字段
    role?: Role;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

// 注意：next-auth/jwt 仅 `export * from "@auth/core/jwt"`，是纯再导出，
// 在其上做模块增强不会与真正的 JWT 接口合并；必须直接增强 @auth/core/jwt。
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    name?: string | null;
  }
}
