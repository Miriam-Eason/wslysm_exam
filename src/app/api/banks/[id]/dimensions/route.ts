// 题库维度统计（S14 灵活组卷）：按 单元/知识点/题型/难度 分组出库存，喂配额表 & 明细下拉。
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";

type Bucket = { value: string; count: number };

// 归一化（trim，null→""=未标注）后按值合并计数，空桶排到最后
function mergeBuckets(rows: { value: string | null; count: number }[]): Bucket[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = (r.value ?? "").trim();
    map.set(key, (map.get(key) ?? 0) + r.count);
  }
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => {
      if (a.value === "" && b.value !== "") return 1;
      if (b.value === "" && a.value !== "") return -1;
      return a.value.localeCompare(b.value, "zh-CN");
    });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const { id } = await params;
  const bankId = Number(id);
  if (!Number.isInteger(bankId) || bankId <= 0) return fail("VALIDATION", "无效的题库 ID");

  const bank = await prisma.questionBank.findUnique({ where: { id: bankId } });
  if (!bank) return fail("NOT_FOUND", "题库不存在");
  if (bank.createdBy !== g.userId) return fail("FORBIDDEN", "无权查看该题库");

  const [byUnit, byKp, byType, byDiff, total] = await Promise.all([
    prisma.question.groupBy({ by: ["unit"], where: { bankId }, _count: { _all: true } }),
    prisma.question.groupBy({ by: ["knowledgePoint"], where: { bankId }, _count: { _all: true } }),
    prisma.question.groupBy({ by: ["type"], where: { bankId }, _count: { _all: true } }),
    prisma.question.groupBy({ by: ["difficulty"], where: { bankId }, _count: { _all: true } }),
    prisma.question.count({ where: { bankId } }),
  ]);

  return ok({
    bank: { id: bank.id, name: bank.name },
    total,
    units: mergeBuckets(byUnit.map((r) => ({ value: r.unit, count: r._count._all }))),
    knowledgePoints: mergeBuckets(byKp.map((r) => ({ value: r.knowledgePoint, count: r._count._all }))),
    types: byType.map((r) => ({ value: r.type, count: r._count._all })),
    difficulties: byDiff.map((r) => ({ value: r.difficulty, count: r._count._all })),
  });
}
