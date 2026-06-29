// 学生导入：解析 xlsx + dry-run 预检（学生导入方案设计 §5/§6）。
// 预检不写库；preview 与 import 复用同一套分析逻辑，保证一致与安全。
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { STUDENT_NO_REGEX, MAX_IMPORT_ROWS } from "@/lib/constants";

export type RawRow = { rowNo: number; studentNo: string; name: string };

export type ImportableRow = RawRow & { kind: "new" | "existing" };

export type AnalysisResult = {
  importable: ImportableRow[]; // 将导入（新建学生 / 仅建关系）
  skipped: (RawRow & { reason: string })[]; // 已属别班 / 已停用 → 跳过
  alreadyInClass: RawRow[]; // 已在本班 → 幂等跳过
  nameConflicts: (RawRow & { existingName: string })[]; // 学号已存在但姓名不一致
  fileDupRows: (RawRow & { firstRow: number })[]; // 文件内学号重复（第 2 次起）
  invalid: (RawRow & { reason: string })[]; // 格式异常
  truncated: boolean; // 是否因超过上限被截断
};

// 解析首个 sheet 的 A=学号 B=姓名（首行表头跳过）。学号/姓名一律取文本（防数字丢前导零）。
export async function parseStudentSheet(buf: Buffer): Promise<RawRow[]> {
  const wb = new ExcelJS.Workbook();
  // exceljs 的 load 形参类型与新版 @types/node 的泛型 Buffer 不兼容，强转兜底
  await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const rows: RawRow[] = [];
  ws.eachRow((row, rowNo) => {
    if (rowNo === 1) return; // 表头
    const studentNo = String(row.getCell(1).text ?? "").trim();
    const name = String(row.getCell(2).text ?? "").trim();
    if (!studentNo && !name) return; // 跳过空行
    rows.push({ rowNo, studentNo, name });
  });
  return rows;
}

export async function analyzeStudentImport(
  allRows: RawRow[],
  classId: number,
): Promise<AnalysisResult> {
  const truncated = allRows.length > MAX_IMPORT_ROWS;
  const rows = truncated ? allRows.slice(0, MAX_IMPORT_ROWS) : allRows;

  const invalid: AnalysisResult["invalid"] = [];
  const fileDupRows: AnalysisResult["fileDupRows"] = [];
  const seen = new Map<string, number>(); // studentNo -> 首次出现行号
  const validUnique: RawRow[] = [];

  for (const r of rows) {
    if (!r.studentNo) {
      invalid.push({ ...r, reason: "学号为空" });
      continue;
    }
    if (!STUDENT_NO_REGEX.test(r.studentNo)) {
      invalid.push({ ...r, reason: "学号须为 9–10 位数字" });
      continue;
    }
    if (!r.name) {
      invalid.push({ ...r, reason: "姓名为空" });
      continue;
    }
    const first = seen.get(r.studentNo);
    if (first !== undefined) {
      fileDupRows.push({ ...r, firstRow: first });
      continue;
    }
    seen.set(r.studentNo, r.rowNo);
    validUnique.push(r);
  }

  const nos = validUnique.map((r) => r.studentNo);
  const existing = nos.length
    ? await prisma.student.findMany({
        where: { studentNo: { in: nos } },
        select: {
          studentNo: true,
          name: true,
          deletedAt: true,
          enrollments: { select: { classId: true } },
        },
      })
    : [];
  const byNo = new Map(existing.map((s) => [s.studentNo, s]));

  // 收集“已属别班”的班级 id，批量取名用于提示
  const otherClassIds = new Set<number>();
  for (const r of validUnique) {
    const s = byNo.get(r.studentNo);
    if (!s || s.deletedAt) continue;
    const here = s.enrollments.some((e) => e.classId === classId);
    if (here) continue;
    const other = s.enrollments.find((e) => e.classId !== classId);
    if (other) otherClassIds.add(other.classId);
  }
  const classNameById = otherClassIds.size
    ? new Map(
        (
          await prisma.class.findMany({
            where: { id: { in: [...otherClassIds] } },
            select: { id: true, name: true },
          })
        ).map((c) => [c.id, c.name]),
      )
    : new Map<number, string>();

  const importable: ImportableRow[] = [];
  const skipped: AnalysisResult["skipped"] = [];
  const alreadyInClass: AnalysisResult["alreadyInClass"] = [];
  const nameConflicts: AnalysisResult["nameConflicts"] = [];

  for (const r of validUnique) {
    const s = byNo.get(r.studentNo);
    if (!s) {
      importable.push({ ...r, kind: "new" }); // 新建学生 + 建关系
      continue;
    }
    if (s.deletedAt) {
      skipped.push({ ...r, reason: "该学号已停用（软删除），请联系管理员" });
      continue;
    }
    const here = s.enrollments.some((e) => e.classId === classId);
    if (here) {
      alreadyInClass.push(r); // 已在本班，幂等跳过
      continue;
    }
    const other = s.enrollments.find((e) => e.classId !== classId);
    if (other) {
      const cname = classNameById.get(other.classId) ?? `班级#${other.classId}`;
      skipped.push({ ...r, reason: `已属于「${cname}」，本次跳过` }); // A 方案
      continue;
    }
    if (s.name !== r.name) {
      nameConflicts.push({ ...r, existingName: s.name }); // 不静默覆盖
      continue;
    }
    importable.push({ ...r, kind: "existing" }); // 学生已存在、仅建关系
  }

  return { importable, skipped, alreadyInClass, nameConflicts, fileDupRows, invalid, truncated };
}
