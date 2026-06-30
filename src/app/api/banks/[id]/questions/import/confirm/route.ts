// 题目导入确认：重解析文件（不信任客户端数据）→ createMany(skipDuplicates) + importBatchId
import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { parseQuestionWorkbook, analyzeQuestionImport } from "@/lib/import/question-import";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

const MAX_FILE = 5 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const { id } = await params;
  const bankId = Number(id);
  if (!Number.isInteger(bankId) || bankId <= 0) return fail("VALIDATION", "无效的题库 ID");

  const bank = await prisma.questionBank.findUnique({ where: { id: bankId } });
  if (!bank) return fail("NOT_FOUND", "题库不存在");
  if (bank.createdBy !== g.userId) return fail("FORBIDDEN", "无权操作该题库");

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("VALIDATION", "请上传 Excel 文件");
  if (file.size === 0) return fail("VALIDATION", "文件为空");
  if (file.size > MAX_FILE) return fail("VALIDATION", "文件过大（上限 5MB）");

  let rows;
  try {
    rows = await parseQuestionWorkbook(Buffer.from(await file.arrayBuffer()));
  } catch {
    return fail("VALIDATION", "无法解析该文件，请使用模板导出的 .xlsx 格式");
  }
  if (rows.length === 0) {
    return fail("VALIDATION", "未读取到任何题目数据");
  }

  const { importable } = await analyzeQuestionImport(rows, bankId);
  if (importable.length === 0) {
    return ok({ created: 0, skipped: rows.length });
  }

  const importBatchId = randomUUID();

  // buildQuestionData 已正确返回 Prisma.JsonNull（非 null），可直接写入
  const result = await prisma.question.createMany({
    data: importable.map((q) => ({
      bankId,
      importBatchId,
      ...q.data,
      options: q.data.options as Prisma.InputJsonValue,
    })),
    skipDuplicates: true, // 兜底：极端竞争场景（两人同时导入同题）
  });

  return ok({
    created: result.count,
    skipped: importable.length - result.count,
    importBatchId,
  });
}
