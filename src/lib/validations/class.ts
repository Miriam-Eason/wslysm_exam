// 班级相关入参校验（PRD §11）
import { z } from "zod";

export const createClassSchema = z.object({
  name: z.string().trim().min(1, "班级名称不能为空").max(50, "班级名称过长"),
});

export const updateClassSchema = z.object({
  name: z.string().trim().min(1, "班级名称不能为空").max(50, "班级名称过长"),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
