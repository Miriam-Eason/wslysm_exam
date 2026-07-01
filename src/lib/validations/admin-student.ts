// 超管：学生账号单个新建 / 编辑入参校验（PRD §13/§18；批量删除复用 validations/student.ts）
import { z } from "zod";
import { STUDENT_NO_REGEX } from "@/lib/constants";

export const createStudentSchema = z.object({
  studentNo: z.string().trim().regex(STUDENT_NO_REGEX, "学号须为 9–10 位数字"),
  name: z.string().trim().min(1, "姓名不能为空").max(30, "姓名过长"),
  classId: z.number().int().positive().optional(),
});

export const updateStudentSchema = z.object({
  name: z.string().trim().min(1, "姓名不能为空").max(30, "姓名过长"),
  resetPassword: z.boolean().optional().default(false),
  restore: z.boolean().optional().default(false),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
