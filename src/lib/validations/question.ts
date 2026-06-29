// 题目入参校验（数据模型总表 §6：options=[{key,text}]，answer 一律数组化）
import { z } from "zod";

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

const optionSchema = z.object({
  key: z.string().trim().min(1),
  text: z.string().trim().min(1, "选项内容不能为空"),
});

// 各题型公共字段
const base = {
  stem: z.string().trim().min(1, "题干不能为空").max(2000),
  difficulty: z.enum(DIFFICULTIES).default("MEDIUM"),
  analysis: z.string().trim().max(2000).optional().nullable(),
  textbook: z.string().trim().max(100).optional().nullable(),
  unit: z.string().trim().max(100).optional().nullable(),
  knowledgePoint: z.string().trim().max(100).optional().nullable(),
};

export const questionInputSchema = z
  .discriminatedUnion("type", [
    z.object({
      ...base,
      type: z.literal("SINGLE_CHOICE"),
      options: z.array(optionSchema).min(2, "至少 2 个选项").max(8, "最多 8 个选项"),
      answer: z.array(z.string()).length(1, "单选必须有且仅有 1 个正确项"),
    }),
    z.object({
      ...base,
      type: z.literal("MULTIPLE_CHOICE"),
      options: z.array(optionSchema).min(2, "至少 2 个选项").max(8, "最多 8 个选项"),
      answer: z.array(z.string()).min(1, "多选至少 1 个正确项"),
    }),
    z.object({
      ...base,
      type: z.literal("TRUE_FALSE"),
      options: z.null().optional(),
      answer: z.tuple([z.enum(["T", "F"])]),
    }),
    z.object({
      ...base,
      type: z.literal("FILL_BLANK"),
      options: z.null().optional(),
      // 每个空一个「可接受答案」数组，全部空命中才算对（判分见 S9）
      answer: z
        .array(z.array(z.string().trim().min(1)).min(1, "每个空至少 1 个可接受答案"))
        .min(1, "至少 1 个填空"),
    }),
  ])
  .superRefine((v, ctx) => {
    if (v.type === "SINGLE_CHOICE" || v.type === "MULTIPLE_CHOICE") {
      const keys = v.options.map((o) => o.key);
      if (new Set(keys).size !== keys.length) {
        ctx.addIssue({ code: "custom", path: ["options"], message: "选项编号重复" });
      }
      const keySet = new Set(keys);
      for (const a of v.answer) {
        if (!keySet.has(a)) {
          ctx.addIssue({ code: "custom", path: ["answer"], message: `正确答案 ${a} 不在选项中` });
        }
      }
    }
  });

export type QuestionInput = z.infer<typeof questionInputSchema>;
