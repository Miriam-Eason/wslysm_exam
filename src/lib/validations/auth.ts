// 登录入参校验（PRD §9：入参一律 Zod 校验）
import { z } from "zod";

// 三套登录共用一个 Credentials Provider，靠 role 区分身份表与门户
export const RoleEnum = z.enum(["teacher", "admin", "student"]);
export type Role = z.infer<typeof RoleEnum>;

export const loginSchema = z.object({
  role: RoleEnum,
  // teacher/admin 用 username，student 用 studentNo；统一收口为 identifier
  identifier: z.string().trim().min(1, "请输入账号"),
  password: z.string().min(1, "请输入密码"),
});

export type LoginInput = z.infer<typeof loginSchema>;
