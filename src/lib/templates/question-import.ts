// 题目导入 Excel 模板构建（四题型，各占一个 Sheet）
// 列约定：
//   单选/多选：题干|选项A|选项B|选项C|选项D|选项E|选项F|正确答案|难度|解析
//   判断：      题干|正确答案（正确/错误）|难度|解析
//   填空：      题干（____标空）|空1答案(|||分隔)|空2|空3|空4|难度|解析
import ExcelJS from "exceljs";

const MAX_DATA_ROWS = 200; // 数据校验生效的行数
const DIFF_LIST = "简单,中等,困难";
const HEADER_COLOR = "FF007AFF";

function styleHeader(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_COLOR } };
  cell.alignment = { vertical: "middle", horizontal: "center" };
  cell.border = {
    bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
  };
}

function addListValidation(ws: ExcelJS.Worksheet, col: string, list: string) {
  for (let r = 2; r <= MAX_DATA_ROWS + 1; r++) {
    ws.getCell(`${col}${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${list}"`],
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: "输入有误",
      error: `请从下拉列表中选择：${list}`,
    };
  }
}

function buildChoiceSheet(
  wb: ExcelJS.Workbook,
  sheetName: "单选题" | "多选题",
) {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = [
    { header: "题干（必填）", key: "stem", width: 42 },
    { header: "选项A（必填）", key: "optA", width: 26 },
    { header: "选项B（必填）", key: "optB", width: 26 },
    { header: "选项C", key: "optC", width: 26 },
    { header: "选项D", key: "optD", width: 26 },
    { header: "选项E", key: "optE", width: 26 },
    { header: "选项F", key: "optF", width: 26 },
    {
      header: sheetName === "单选题" ? "正确答案（单字母如 A）" : "正确答案（逗号分隔如 A,C）",
      key: "answer",
      width: 22,
    },
    { header: "难度（默认中等）", key: "difficulty", width: 16 },
    { header: "解析（可选）", key: "analysis", width: 36 },
  ];

  const header = ws.getRow(1);
  header.height = 28;
  header.eachCell((cell) => styleHeader(cell));

  addListValidation(ws, "I", DIFF_LIST);
  if (sheetName === "单选题") addListValidation(ws, "H", "A,B,C,D,E,F");

  ws.getCell("A1").note = "题干：必填，最长 2000 字符。";
  ws.getCell("B1").note = "至少填写 A、B 两个选项；C–F 可选。空白选项不会被导入。";
  ws.getCell("H1").note =
    sheetName === "单选题"
      ? "填写对应选项的大写字母，如：B"
      : "填写正确选项字母，多个用英文逗号分隔，如：A,C";
  ws.getCell("I1").note = "可选：简单 / 中等（默认）/ 困难";
  ws.getCell("J1").note = "可选：答案解析，最长 2000 字符。";

  // 样例数据
  if (sheetName === "单选题") {
    ws.addRow({
      stem: "中华人民共和国的首都是哪个城市？",
      optA: "上海",
      optB: "北京",
      optC: "广州",
      optD: "深圳",
      optE: "",
      optF: "",
      answer: "B",
      difficulty: "简单",
      analysis: "北京是中华人民共和国的首都，1949 年开始定都于此。",
    });
  } else {
    ws.addRow({
      stem: "下列属于中国四大直辖市的是哪些？",
      optA: "北京",
      optB: "上海",
      optC: "重庆",
      optD: "天津",
      optE: "成都",
      optF: "",
      answer: "A,B,C,D",
      difficulty: "中等",
      analysis: "中国四大直辖市：北京、上海、重庆、天津。",
    });
  }
}

function buildTrueFalseSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet("判断题", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = [
    { header: "题干（必填）", key: "stem", width: 52 },
    { header: "正确答案（正确/错误）", key: "answer", width: 20 },
    { header: "难度（默认中等）", key: "difficulty", width: 16 },
    { header: "解析（可选）", key: "analysis", width: 36 },
  ];

  const header = ws.getRow(1);
  header.height = 28;
  header.eachCell((cell) => styleHeader(cell));

  addListValidation(ws, "B", "正确,错误");
  addListValidation(ws, "C", DIFF_LIST);

  ws.getCell("A1").note = "题干：必填，最长 2000 字符。";
  ws.getCell("B1").note = '从下拉列表选择"正确"或"错误"。也接受 T/F。';
  ws.getCell("C1").note = "可选：简单 / 中等（默认）/ 困难";

  ws.addRow({
    stem: "太阳从东方升起，从西方落下。",
    answer: "正确",
    difficulty: "简单",
    analysis: "地球自西向东自转，导致太阳表观上从东方升起、西方落下。",
  });
}

function buildFillBlankSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet("填空题", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = [
    { header: "题干（用____标空，必填）", key: "stem", width: 46 },
    { header: "空1答案（|||分隔多答案）", key: "blank1", width: 26 },
    { header: "空2答案（可选）", key: "blank2", width: 26 },
    { header: "空3答案（可选）", key: "blank3", width: 26 },
    { header: "空4答案（可选）", key: "blank4", width: 26 },
    { header: "难度（默认中等）", key: "difficulty", width: 16 },
    { header: "解析（可选）", key: "analysis", width: 36 },
  ];

  const header = ws.getRow(1);
  header.height = 28;
  header.eachCell((cell) => styleHeader(cell));

  addListValidation(ws, "F", DIFF_LIST);

  ws.getCell("A1").note =
    "在题干中用 ____ （四个下划线）标记每个填空位置。\n" +
    "____的数量必须与填写的「空N答案」列数量一致。";
  ws.getCell("B1").note =
    "必填（至少空1）。\n若该空有多个可接受答案，用 ||| 分隔，如：北京|||首都|||京城";
  ws.getCell("C1").note = "若题目有第2个空，在此填写；否则留空。";
  ws.getCell("F1").note = "可选：简单 / 中等（默认）/ 困难";

  ws.addRow({
    stem: "中国的首都是____，简称____。",
    blank1: "北京|||首都",
    blank2: "京|||北京",
    blank3: "",
    blank4: "",
    difficulty: "简单",
    analysis: "北京是中华人民共和国的首都，古称燕京，简称京。",
  });
}

export function buildQuestionImportWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "无锡旅商智能练测系统";
  wb.lastModifiedBy = "wxlysm-exam";

  buildChoiceSheet(wb, "单选题");
  buildChoiceSheet(wb, "多选题");
  buildTrueFalseSheet(wb);
  buildFillBlankSheet(wb);

  return wb;
}
