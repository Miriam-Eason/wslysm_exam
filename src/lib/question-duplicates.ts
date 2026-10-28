// 题库写入时先锁库，再读取全部题目重新计算身份，兼容历史哈希。
import type { Prisma, PrismaClient } from "@prisma/client";
import { questionAnswerSignature, questionIdentityHash, type QuestionFingerprintInput } from "@/lib/question-hash";

export type BankQuestionIdentity = { id: number; answerSignature: string | null };
export type BankQuestionIdentityGroups = Map<string, BankQuestionIdentity[]>;
// 正常答案签名都是 JSON 字符串；空字符串标记无法比较的历史答案。
export const INVALID_ANSWER_SIGNATURE = "";

export class QuestionBankNotFoundError extends Error {
  constructor() {
    super("题库不存在");
    this.name = "QuestionBankNotFoundError";
  }
}

export class InvalidQuestionIdentityError extends Error {
  constructor(public readonly questionId: number) {
    super(`题目 ${questionId} 的身份数据无效，无法查重`);
    this.name = "InvalidQuestionIdentityError";
  }
}

/** 必须在交互事务中调用，且在读取题库题目之前调用。 */
export async function lockQuestionBank(tx: Prisma.TransactionClient, bankId: number): Promise<void> {
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM QuestionBank WHERE id = ${bankId} FOR UPDATE`;
  if (rows.length === 0) throw new QuestionBankNotFoundError();
}

/** 包含全部历史重复记录；身份无效时抛出题目 ID，答案无效则签名为 null。 */
export async function loadBankQuestionIdentityGroups(
  db: Pick<Prisma.TransactionClient, "question">,
  bankId: number,
  excludeQuestionId?: number,
): Promise<BankQuestionIdentityGroups> {
  const questions = await db.question.findMany({
    where: { bankId, ...(excludeQuestionId === undefined ? {} : { id: { not: excludeQuestionId } }) },
    select: { id: true, type: true, stem: true, options: true, answer: true },
  });
  const groups: BankQuestionIdentityGroups = new Map();
  for (const question of questions) {
    let identity: string;
    try {
      identity = questionIdentityHash(question);
    } catch {
      throw new InvalidQuestionIdentityError(question.id);
    }
    let answerSignature: string | null = null;
    try {
      answerSignature = questionAnswerSignature(question);
    } catch {
      // 保留身份，避免把无法比较答案的历史题目当作不存在。
    }
    const group = groups.get(identity) ?? [];
    group.push({ id: question.id, answerSignature });
    groups.set(identity, group);
  }
  return groups;
}

/** 支持 Prisma 单例和交互事务客户端；确认写入时应在取得题库锁后调用。 */
export async function loadQuestionIdentities(
  client: PrismaClient | Prisma.TransactionClient,
  bankId: number,
): Promise<Map<string, Set<string>>> {
  const groups = await loadBankQuestionIdentityGroups(client, bankId);
  return new Map([...groups].map(([identity, questions]) => [
    identity,
    new Set(questions.map(({ answerSignature }) => answerSignature ?? INVALID_ANSWER_SIGNATURE)),
  ]));
}

/** 同一身份若有任何不同或无法比较的答案，优先报告答案冲突。 */
export function classifyQuestionDuplicate(
  groups: BankQuestionIdentityGroups,
  question: Omit<QuestionFingerprintInput, "options"> & { options?: unknown },
): "duplicate" | "conflict" | null {
  const fingerprint = { ...question, options: question.options };
  const matches = groups.get(questionIdentityHash(fingerprint));
  if (!matches?.length) return null;
  const signature = questionAnswerSignature(fingerprint);
  return matches.some((match) => match.answerSignature !== signature) ? "conflict" : "duplicate";
}
