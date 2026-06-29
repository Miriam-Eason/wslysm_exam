// 学生删除入参校验（PRD §11 DELETE /api/students）
import { z } from "zod";

export const deleteStudentsSchema = z.object({
  ids: z
    .array(z.number().int().positive())
    .min(1, "请至少选择一名学生")
    .max(500, "单次最多删除 500 名学生"),
});

export type DeleteStudentsInput = z.infer<typeof deleteStudentsSchema>;
