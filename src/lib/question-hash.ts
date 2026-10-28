// 题目去重计算（服务端，使用 node:crypto）。
import { createHash } from "node:crypto";
import type { QuestionType } from "@prisma/client";

export function normalizeStem(stem: string): string {
  return stem.replace(/\s+/g, "").trim();
}

// 旧版计算保留给历史数据兼容；新写入使用 questionIdentityHash。
export function contentHash(type: string, stem: string, answer: unknown): string {
  return createHash("sha1")
    .update(`${type}|${normalizeStem(stem)}|${JSON.stringify(answer)}`)
    .digest("hex");
}

/** 可直接接受数据库中的 options / answer JSON；不依赖其他题目字段。 */
export type QuestionFingerprintInput = {
  type: QuestionType;
  stem: string;
  options?: unknown;
  answer: unknown;
};

function normalizeOption(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function sortedSet(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function choiceOptions(options: unknown): Map<string, string> {
  if (!Array.isArray(options)) throw new Error("选择题选项必须是数组");
  const byKey = new Map<string, string>();
  for (const option of options) {
    if (!option || typeof option !== "object" || typeof option.key !== "string" ||
        typeof option.text !== "string" || byKey.has(option.key)) {
      throw new Error("选择题选项格式无效或编号重复");
    }
    byKey.set(option.key, normalizeOption(option.text));
  }
  return byKey;
}

/** 题型和题干决定身份；选择题还包括归一化的选项文本集合。 */
export function questionIdentityHash(question: Pick<QuestionFingerprintInput, "type" | "stem" | "options">): string {
  const identity: unknown[] = [question.type, normalizeStem(question.stem)];
  switch (question.type) {
    case "SINGLE_CHOICE":
    case "MULTIPLE_CHOICE":
      identity.push(sortedSet([...choiceOptions(question.options).values()]));
      break;
    case "TRUE_FALSE":
    case "FILL_BLANK":
      break;
    default:
      throw new Error("不支持的题型");
  }
  return `v2:${createHash("sha256").update(JSON.stringify(identity)).digest("hex")}`;
}

/** 同一身份下比较签名；选择题按选中的文本，填空按每空的别名集合。 */
export function questionAnswerSignature(question: Pick<QuestionFingerprintInput, "type" | "options" | "answer">): string {
  if (!Array.isArray(question.answer)) throw new Error("题目答案必须是数组");
  switch (question.type) {
    case "SINGLE_CHOICE":
    case "MULTIPLE_CHOICE": {
      const options = choiceOptions(question.options);
      const texts = question.answer.map((key: unknown) => {
        if (typeof key !== "string" || !options.has(key)) {
          throw new Error("选择题答案不在选项中");
        }
        return options.get(key)!;
      });
      return JSON.stringify(sortedSet(texts));
    }
    case "TRUE_FALSE":
      if (question.answer.length !== 1 || (question.answer[0] !== "T" && question.answer[0] !== "F")) {
        throw new Error("判断题答案必须为 T 或 F 的单元素数组");
      }
      return JSON.stringify(question.answer);
    case "FILL_BLANK":
      return JSON.stringify(question.answer.map((aliases: unknown) => {
        if (!Array.isArray(aliases) || !aliases.every((alias: unknown) => typeof alias === "string")) {
          throw new Error("填空答案必须是别名数组的数组");
        }
        return sortedSet(aliases.map((alias: string) => alias.trim()));
      }));
    default:
      throw new Error("不支持的题型");
  }
}
