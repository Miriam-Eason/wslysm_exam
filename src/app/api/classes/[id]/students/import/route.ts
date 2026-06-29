// 学生导入确认（PRD §11）：重新解析同一文件并重跑分析（安全、与预检一致），再批量写库。
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { DEFAULT_STUDENT_PASSWORD } from "@/lib/constants";
import { parseStudentSheet, analyzeStudentImport } from "@/lib/import/student-import";

const MAX_FILE = 2 * 1024 * 1024;

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
  if (file.size === 0 || file.size > MAX_FILE) return fail("VALIDATION", "文件为空或过大（上限 2MB）");

  let rows;
  try {
    rows = await parseStudentSheet(Buffer.from(await file.arrayBuffer()));
  } catch {
    return fail("VALIDATION", "无法解析该文件，请使用模板导出的 .xlsx 格式");
  }
  if (rows.length === 0) return fail("VALIDATION", "未读取到任何数据行");

  const analysis = await analyzeStudentImport(rows, classId);
  const newRows = analysis.importable.filter((r) => r.kind === "new");
  const allNos = analysis.importable.map((r) => r.studentNo);

  if (allNos.length === 0) {
    return ok({ createdStudents: 0, enrolled: 0, skipped: analysis.skipped.length, message: "没有可导入的学生" });
  }

  // 默认密码整批只算一次哈希（学生导入方案 §9.2）
  const passwordHash = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, 10);

  const result = await prisma.$transaction(async (tx) => {
    let createdStudents = 0;
    if (newRows.length) {
      const res = await tx.student.createMany({
        data: newRows.map((r) => ({ studentNo: r.studentNo, name: r.name, passwordHash })),
        skipDuplicates: true,
      });
      createdStudents = res.count;
    }
    // 取齐所有 importable 学生 id（含新建的），批量建关系（[studentId,classId] 唯一 + skipDuplicates 兜底幂等）
    const students = await tx.student.findMany({
      where: { studentNo: { in: allNos }, deletedAt: null },
      select: { id: true },
    });
    const enr = await tx.enrollment.createMany({
      data: students.map((s) => ({ studentId: s.id, classId })),
      skipDuplicates: true,
    });
    return { createdStudents, enrolled: enr.count };
  });

  return ok({
    createdStudents: result.createdStudents,
    enrolled: result.enrolled,
    skipped: analysis.skipped.length,
    alreadyInClass: analysis.alreadyInClass.length,
    nameConflicts: analysis.nameConflicts.length,
    invalid: analysis.invalid.length,
    fileDup: analysis.fileDupRows.length,
  });
}
