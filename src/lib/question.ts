// 题目相关常量与客户端安全工具（不引入 node 模块，可在客户端组件使用）
export const QUESTION_TYPES = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "FILL_BLANK",
] as const;
export type QType = (typeof QUESTION_TYPES)[number];

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type Diff = (typeof DIFFICULTIES)[number];

export const QUESTION_TYPE_LABELS: Record<QType, string> = {
  SINGLE_CHOICE: "单选",
  MULTIPLE_CHOICE: "多选",
  TRUE_FALSE: "判断",
  FILL_BLANK: "填空",
};

export const DIFFICULTY_LABELS: Record<Diff, string> = {
  EASY: "简单",
  MEDIUM: "中等",
  HARD: "困难",
};

// 选项序号 0→A 1→B ...
export function letterForIndex(i: number): string {
  return String.fromCharCode(65 + i);
}

export type QuestionOption = { key: string; text: string };

// 将 answer 数组转为人读摘要（用于列表展示）
export function answerSummary(
  type: QType,
  options: QuestionOption[] | null,
  answer: unknown,
): string {
  if (type === "TRUE_FALSE") {
    return (answer as string[])?.[0] === "T" ? "正确" : "错误";
  }
  if (type === "FILL_BLANK") {
    const blanks = answer as string[][];
    return (blanks ?? []).map((b, i) => `空${i + 1}:${b.join("/")}`).join("；");
  }
  // 选择题：显示选中的 key
  return (answer as string[])?.join("、") ?? "";
}
