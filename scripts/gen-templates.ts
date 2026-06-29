// 生成物理模板文件用于测试：document/templates/ 下
//   学生导入模板.xlsx        —— 空白模板（与下载接口一致）
//   学生导入示例数据.xlsx     —— 含 12 条示例学生，供 S3 导入联调
// 运行：npx tsx scripts/gen-templates.ts
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { buildStudentImportWorkbook } from "../src/lib/templates/student-import";

async function main() {
  const outDir = path.resolve(process.cwd(), "document/templates");
  await mkdir(outDir, { recursive: true });

  const blank = buildStudentImportWorkbook();
  await blank.xlsx.writeFile(path.join(outDir, "学生导入模板.xlsx"));

  const sample = buildStudentImportWorkbook({ withSample: true });
  await sample.xlsx.writeFile(path.join(outDir, "学生导入示例数据.xlsx"));

  console.log("✅ 已生成：");
  console.log("   document/templates/学生导入模板.xlsx（空白）");
  console.log("   document/templates/学生导入示例数据.xlsx（12 条示例）");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
