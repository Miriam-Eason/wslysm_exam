import { z } from "zod";

export const createExamSchema = z.object({
  name: z.string().min(1, "考试名称不能为空").max(100),
  type: z.enum(["EXAM", "PRACTICE"]),
  bankId: z.number().int().positive("请选择题库"),
  allowRepeat: z.boolean().default(false),
  repeatLimit: z.number().int().min(1).nullable().optional(),
  deadline: z.string().nullable().optional(),
  timeLimitSec: z.number().int().min(60).nullable().optional(),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  classIds: z.array(z.number().int().positive()).min(1, "至少选择一个班级"),
  defaultScore: z.number().min(0.5).default(1),
});

export const updateExamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["EXAM", "PRACTICE"]).optional(),
  allowRepeat: z.boolean().optional(),
  repeatLimit: z.number().int().min(1).nullable().optional(),
  deadline: z.string().nullable().optional(),
  timeLimitSec: z.number().int().min(60).nullable().optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
