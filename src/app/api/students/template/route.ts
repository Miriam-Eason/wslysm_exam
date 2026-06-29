// 学生导入模板下载（PRD S2「Excel 模板下载」）
import { requireApiRole } from "@/lib/auth-guard";
import { buildStudentImportWorkbook } from "@/lib/templates/student-import";

export async function GET() {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const wb = buildStudentImportWorkbook();
  const buf = await wb.xlsx.writeBuffer();

  const filename = "学生导入模板.xlsx";
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // ASCII 兜底文件名 + RFC5987 UTF-8 文件名（中文）
      "Content-Disposition": `attachment; filename="student-import-template.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
