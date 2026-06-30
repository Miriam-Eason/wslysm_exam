// 题目导入模板下载（四题型，含下拉校验）
import type { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/auth-guard";
import { fail } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { buildQuestionImportWorkbook } from "@/lib/templates/question-import";

export async function GET(
  _req: NextRequest,
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

  const wb = buildQuestionImportWorkbook();
  const buf = await wb.xlsx.writeBuffer();

  const filename = `题目导入模板_${bank.name}.xlsx`;
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="question-import-template.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
