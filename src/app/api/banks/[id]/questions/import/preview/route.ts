// 题目导入 dry-run 预检（不写库；PRD §11）
import type { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { parseQuestionWorkbook, analyzeQuestionImport } from "@/lib/import/question-import";

const MAX_FILE = 5 * 1024 * 1024; // 5MB（题目文件稍大）

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
    return fail("VALIDATION", "未读取到任何题目数据（请确认已按模板格式填写）");
  }

  const result = await analyzeQuestionImport(rows, bankId);
  return ok(result);
}
