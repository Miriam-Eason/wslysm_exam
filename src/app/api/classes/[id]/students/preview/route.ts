// 学生导入 dry-run 预检（PRD §11；不写库）
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { parseStudentSheet, analyzeStudentImport } from "@/lib/import/student-import";

const MAX_FILE = 2 * 1024 * 1024; // 2MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const { id } = await params;
  const classId = Number(id);
  if (!Number.isInteger(classId) || classId <= 0) return fail("VALIDATION", "无效的班级 ID");

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) return fail("NOT_FOUND", "班级不存在");
  if (cls.teacherId !== g.userId) return fail("FORBIDDEN", "无权操作该班级");

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("VALIDATION", "请上传 Excel 文件");
  if (file.size === 0) return fail("VALIDATION", "文件为空");
  if (file.size > MAX_FILE) return fail("VALIDATION", "文件过大（上限 2MB）");

  let rows;
  try {
    rows = await parseStudentSheet(Buffer.from(await file.arrayBuffer()));
  } catch {
    return fail("VALIDATION", "无法解析该文件，请使用模板导出的 .xlsx 格式");
  }
  if (rows.length === 0) return fail("VALIDATION", "未读取到任何数据行（请确认表头下方已填写）");

  const r = await analyzeStudentImport(rows, classId);
  return ok({
    ...r,
    summary: {
      total: rows.length,
      importable: r.importable.length,
      skipped: r.skipped.length,
      alreadyInClass: r.alreadyInClass.length,
      nameConflicts: r.nameConflicts.length,
      fileDup: r.fileDupRows.length,
      invalid: r.invalid.length,
    },
  });
}
