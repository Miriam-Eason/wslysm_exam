// 超管：教师账号入参校验（PRD §13/§18）
import { z } from "zod";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "账号至少 3 位")
  .max(20, "账号最多 20 位")
  .regex(/^[A-Za-z0-9_]+$/, "账号仅支持字母、数字、下划线");

const passwordSchema = z.string().min(6, "密码至少 6 位").max(50, "密码过长");

export const createTeacherSchema = z.object({
  username: usernameSchema,
  name: z.string().trim().min(1, "姓名不能为空").max(30, "姓名过长"),
  password: passwordSchema,
  isAdmin: z.boolean().optional().default(false),
});

export const updateTeacherSchema = z.object({
  name: z.string().trim().min(1, "姓名不能为空").max(30, "姓名过长"),
  isAdmin: z.boolean(),
  password: z.union([passwordSchema, z.literal("")]).optional(),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
