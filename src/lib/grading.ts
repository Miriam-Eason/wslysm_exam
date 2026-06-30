import type { QuestionType } from "@prisma/client";

// 归一化：trim + 全角半角统一 + lowercase
function normalize(s: string): string {
  return s
    .trim()
    .replace(/[！-～]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0),
    )
    .replace(/　/g, " ")
    .toLowerCase();
}

/**
 * 对单道题判分。
 * @param type  题型
 * @param answer  数据库中存储的正确答案（不含答案的响应绝不调用此函数）
 * @param chosen  学生作答
 * @returns 是否正确
 */
export function gradeQuestion(
  type: QuestionType,
  answer: unknown,
  chosen: unknown,
): boolean {
  if (chosen == null || answer == null) return false;

  switch (type) {
    case "SINGLE_CHOICE":
    case "TRUE_FALSE": {
      const a = (answer as string[])[0];
      const c = (chosen as string[])[0];
      return !!a && a === c;
    }

    case "MULTIPLE_CHOICE": {
      const a = [...(answer as string[])].sort().join(",");
      const c = [...(chosen as string[])].sort().join(",");
      return a.length > 0 && a === c;
    }

    case "FILL_BLANK": {
      // answer: string[][] — 每个空的可接受答案集（决策 #5：全空命中才算对）
      // chosen: string[]  — 每个空学生填写的内容
      const correctBlanks = answer as string[][];
      const filledBlanks = chosen as string[];
      if (filledBlanks.length !== correctBlanks.length) return false;
      return correctBlanks.every((accepts, i) => {
        const norm = normalize(filledBlanks[i] ?? "");
        if (!norm) return false;
        return accepts.some((a) => normalize(a) === norm);
      });
    }

    default:
      return false;
  }
}
