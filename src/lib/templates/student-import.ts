// 学生导入 Excel 模板构建（学生导入方案设计 §7）：
// 单 sheet、两列「学号 | 姓名」；首行冻结 + 批注；学号以文本存储防丢前导零。
// 班级不在模板中，由导入所在页面上下文决定。
import ExcelJS from "exceljs";

export const STUDENT_TEMPLATE_HEADERS = ["学号", "姓名"] as const;

export type StudentRow = { studentNo: string; name: string };

// 示例数据（学号用 2025 段，避免与 seed 的 2024 段冲突，便于测试“新建学生”主流程）
export const SAMPLE_STUDENT_ROWS: StudentRow[] = [
  { studentNo: "2025010001", name: "王梓涵" },
  { studentNo: "2025010002", name: "李欣怡" },
  { studentNo: "2025010003", name: "张子轩" },
  { studentNo: "2025010004", name: "刘思远" },
  { studentNo: "2025010005", name: "陈雨桐" },
  { studentNo: "2025010006", name: "杨浩然" },
  { studentNo: "2025010007", name: "赵梦琪" },
  { studentNo: "2025010008", name: "黄宇航" },
  { studentNo: "2025010009", name: "周诗涵" },
  { studentNo: "2025010010", name: "吴俊杰" },
  { studentNo: "2025010011", name: "徐若曦" },
  { studentNo: "2025010012", name: "孙嘉懿" },
];

export function buildStudentImportWorkbook(
  opts: { withSample?: boolean } = {},
): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "无锡旅商智能练测系统";

  const ws = wb.addWorksheet("学生名单", {
    views: [{ state: "frozen", ySplit: 1 }], // 冻结首行
  });

  ws.columns = [
    { header: STUDENT_TEMPLATE_HEADERS[0], key: "studentNo", width: 22 },
    { header: STUDENT_TEMPLATE_HEADERS[1], key: "name", width: 16 },
  ];

  // 学号整列按文本格式，保留前导零
  ws.getColumn(1).numFmt = "@";

  // 表头样式：主色底 + 白字
  const header = ws.getRow(1);
  header.height = 26;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF007AFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // 批注（学生导入方案 §7：说明格式与“班级无需填写”）
  ws.getCell("A1").note =
    "学号：9–10 位数字，全局唯一，必填。\n以文本存储以保留前导零。\n班级无需填写——由导入所在的班级页面决定。";
  ws.getCell("B1").note = "学生姓名：必填。";

  if (opts.withSample) {
    SAMPLE_STUDENT_ROWS.forEach((r) => ws.addRow(r));
  }

  return wb;
}
