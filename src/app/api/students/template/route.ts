// 学生导入模板下载（PRD S2「Excel 模板下载」；教师端 + 超管端共用）
import { auth } from "@/auth";
import { fail } from "@/lib/api";
import { buildStudentImportWorkbook } from "@/lib/templates/student-import";

export async function GET() {
  const session = await auth();
  if (!session?.user) return fail("UNAUTHORIZED", "未登录或会话已失效");
  if (session.user.role !== "teacher" && session.user.role !== "admin") {
    return fail("FORBIDDEN", "无权访问该资源");
  }

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
