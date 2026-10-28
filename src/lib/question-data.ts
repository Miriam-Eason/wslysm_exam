// 由校验后的题目输入构造 Prisma 写入数据（create/update 共用）。
import { Prisma } from "@prisma/client";
import { questionIdentityHash } from "@/lib/question-hash";
import type { QuestionInput } from "@/lib/validations/question";

export function buildQuestionData(input: QuestionInput) {
  const isChoice = input.type === "SINGLE_CHOICE" || input.type === "MULTIPLE_CHOICE";
  // 保持选择题答案存储顺序稳定；去重身份不包含答案。
  const answer = isChoice ? [...(input.answer as string[])].sort() : input.answer;

  return {
    type: input.type,
    stem: input.stem,
    options: isChoice ? (input.options as Prisma.InputJsonValue) : Prisma.JsonNull,
    answer: answer as Prisma.InputJsonValue,
    difficulty: input.difficulty,
    analysis: input.analysis || null,
    textbook: input.textbook || null,
    unit: input.unit || null,
    knowledgePoint: input.knowledgePoint || null,
    contentHash: questionIdentityHash({ type: input.type, stem: input.stem, options: input.options }),
  };
}
