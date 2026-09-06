// 灵活组卷核心：规则解析器 + Zod 校验（S14）
// 三档 UI（整库 / 快捷 / 明细）在前端统一编译为 rules[]，后端只认这一种形态。
// 规则字段语义：null=不限（通配）；""=未标注（该字段为空的题）；具体值=精确匹配（trim 后比较）。
import { z } from "zod";
import { QUESTION_TYPES, DIFFICULTIES, type QType, type Diff } from "@/lib/question";

// ── Zod 校验 ──────────────────────────────────────────────
export const composeRuleSchema = z.object({
  unit: z.string().max(100).nullable().default(null),
  knowledgePoint: z.string().max(100).nullable().default(null),
  type: z.enum(QUESTION_TYPES).nullable().default(null),
  difficulty: z.enum(DIFFICULTIES).nullable().default(null),
  count: z.number().int().min(1, "数量至少 1").max(1000),
  score: z.number().min(0.5, "分值至少 0.5").max(100),
});
export type ComposeRule = z.infer<typeof composeRuleSchema>;

export const composePreviewSchema = z.object({
  mode: z.enum(["QUICK", "DETAILED"]).default("DETAILED"),
  rules: z.array(composeRuleSchema).min(1, "至少一条规则").max(200),
});

// ── 解析器 ────────────────────────────────────────────────
export type CandidateQuestion = {
  id: number;
  type: QType;
  difficulty: Diff;
  unit: string | null;
  knowledgePoint: string | null;
};

export type ResolvedRule = {
  index: number;
  requested: number; // 规则要求的题数
  available: number; // 匹配且尚未被前序规则占用的题数
  taken: number; // 实际抽中数
  shortfall: number; // 缺口（requested - taken），>0 表示库存不足
};

export type Pick = { questionId: number; score: number; order: number; ruleIndex: number };

export type SelectionResult = {
  picks: Pick[];
  ruleResults: ResolvedRule[];
  totalCount: number;
  totalScore: number;
};

function norm(v: string | null | undefined): string {
  return (v ?? "").trim();
}

function matches(q: CandidateQuestion, r: ComposeRule): boolean {
  if (r.type !== null && q.type !== r.type) return false;
  if (r.difficulty !== null && q.difficulty !== r.difficulty) return false;
  if (r.unit !== null && norm(q.unit) !== r.unit) return false;
  if (r.knowledgePoint !== null && norm(q.knowledgePoint) !== r.knowledgePoint) return false;
  return true;
}

// Fisher-Yates（可注入 rng，便于测试确定性）
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 顺序抽题、抽过即从后续规则候选中排除，保证全卷不重题。
export function selectQuestions(
  questions: CandidateQuestion[],
  rules: ComposeRule[],
  rng: () => number = Math.random,
): SelectionResult {
  const used = new Set<number>();
  const picks: Pick[] = [];
  const ruleResults: ResolvedRule[] = [];
  let order = 1;

  rules.forEach((r, index) => {
    const candidates = questions.filter((q) => !used.has(q.id) && matches(q, r));
    const shuffled = shuffle(candidates, rng);
    const take = Math.min(r.count, shuffled.length);
    for (let i = 0; i < take; i++) {
      used.add(shuffled[i].id);
      picks.push({ questionId: shuffled[i].id, score: r.score, order: order++, ruleIndex: index });
    }
    ruleResults.push({
      index,
      requested: r.count,
      available: candidates.length,
      taken: take,
      shortfall: r.count - take,
    });
  });

  const totalScore = Math.round(picks.reduce((s, p) => s + p.score, 0) * 100) / 100;
  return { picks, ruleResults, totalCount: picks.length, totalScore };
}
