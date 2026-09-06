import { z } from "zod";
import { composeRuleSchema } from "@/lib/exam-compose";

// 灵活组卷：预览产出的具体选题（questionId + 卷面分值），按数组顺序即卷面题序
const examSelectionItem = z.object({
  questionId: z.number().int().positive(),
  score: z.number().min(0.5).max(100),
});

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
  // 灵活组卷（可选）：省略=整库组卷（向后兼容）；提供=按 selection 快照
  selection: z.array(examSelectionItem).min(1).max(2000).optional(),
  blueprint: z
    .object({
      mode: z.enum(["QUICK", "DETAILED"]),
      rules: z.array(composeRuleSchema),
    })
    .optional(),
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
