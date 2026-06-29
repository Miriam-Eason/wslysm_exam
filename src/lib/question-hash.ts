// 题目内容去重哈希（服务端，使用 node:crypto）。
// 口径与 prisma/seed.ts 保持一致：题型 + 归一化题干（去空白）+ JSON 化答案 的 SHA1。
import { createHash } from "node:crypto";

export function normalizeStem(stem: string): string {
  return stem.replace(/\s+/g, "").trim();
}

export function contentHash(type: string, stem: string, answer: unknown): string {
  return createHash("sha1")
    .update(`${type}|${normalizeStem(stem)}|${JSON.stringify(answer)}`)
    .digest("hex");
}
