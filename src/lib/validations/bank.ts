// 题库入参校验（PRD §11）
import { z } from "zod";

export const createBankSchema = z.object({
  name: z.string().trim().min(1, "题库名称不能为空").max(80, "题库名称过长"),
  description: z.string().trim().max(500).optional().nullable(),
  subject: z.string().trim().max(50).optional().nullable(),
});

export const updateBankSchema = createBankSchema;

export type CreateBankInput = z.infer<typeof createBankSchema>;
