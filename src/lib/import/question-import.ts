// 题目导入：解析 xlsx（四题型多 Sheet）+ dry-run 预检（不写库）。
// preview 与 confirm 共用同一套解析与分析逻辑，保证一致与安全。
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { questionInputSchema, type QuestionInput } from "@/lib/validations/question";
import { buildQuestionData } from "@/lib/question-data";
import { contentHash as computeHash } from "@/lib/question-hash";

// --- 类型定义 ---

export type QuestionRowResult =
  | { ok: true; input: QuestionInput; contentHash: string; rowNo: number; sheet: string }
  | { ok: false; rowNo: number; sheet: string; stemPreview: string; reason: string };

export type ImportableQuestion = {
  rowNo: number;
  sheet: string;
  contentHash: string;
  data: ReturnType<typeof buildQuestionData>;
};

export type AnalysisResult = {
  importable: ImportableQuestion[];
  duplicates: { rowNo: number; sheet: string; contentHash: string }[]; // 已在题库中
  fileDups: { rowNo: number; sheet: string; firstRow: number }[]; // 文件内重复
  invalid: { rowNo: number; sheet: string; stemPreview: string; reason: string }[];
  truncated: boolean;
  summary: {
    total: number;
    importable: number;
    duplicates: number;
    fileDups: number;
    invalid: number;
  };
};

const MAX_IMPORT_ROWS = 500;
const BLANK_SEP = "|||"; // 填空可接受答案分隔符

// --- 工具函数 ---

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.text ?? "";
  return typeof v === "string" ? v.trim() : String(v).trim();
}

function parseDifficulty(raw: string): "EASY" | "MEDIUM" | "HARD" {
  const s = raw.trim();
  if (s === "简单" || s === "EASY") return "EASY";
  if (s === "困难" || s === "HARD") return "HARD";
  return "MEDIUM"; // 默认中等
}

function parseTrueFalseAnswer(raw: string): ["T"] | ["F"] | null {
  const s = raw.trim().toUpperCase();
  if (s === "正确" || s === "T" || s === "TRUE" || s === "1" || s === "是") return ["T"];
  if (s === "错误" || s === "F" || s === "FALSE" || s === "0" || s === "否") return ["F"];
  return null;
}

function parseChoiceAnswer(raw: string): string[] {
  return raw
    .split(/[,，]/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0 && /^[A-Z]$/.test(s));
}

// 取前 30 字符作为预览（截断）
function stemPreview(stem: string): string {
  return stem.length > 30 ? stem.slice(0, 30) + "…" : stem;
}

// --- 按题型解析各行 ---

function parseSingleChoice(ws: ExcelJS.Worksheet): QuestionRowResult[] {
  const results: QuestionRowResult[] = [];
  ws.eachRow((row, rowNo) => {
    if (rowNo === 1) return; // 跳过表头
    const stem = cellText(row.getCell(1));
    if (!stem) return; // 跳过空行

    const optTexts = [
      cellText(row.getCell(2)), // A
      cellText(row.getCell(3)), // B
      cellText(row.getCell(4)), // C
      cellText(row.getCell(5)), // D
      cellText(row.getCell(6)), // E
      cellText(row.getCell(7)), // F
    ];
    const options = optTexts
      .map((text, i) => ({ key: String.fromCharCode(65 + i), text }))
      .filter((o) => o.text.length > 0);

    const rawAnswer = cellText(row.getCell(8));
    const answerKeys = parseChoiceAnswer(rawAnswer);
    const difficulty = parseDifficulty(cellText(row.getCell(9)));
    const analysis = cellText(row.getCell(10)) || null;

    const input = {
      type: "SINGLE_CHOICE" as const,
      stem,
      options,
      answer: answerKeys.slice(0, 1), // 单选只取第一个
      difficulty,
      analysis,
    };

    const parsed = questionInputSchema.safeParse(input);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join("；");
      results.push({ ok: false, rowNo, sheet: "单选题", stemPreview: stemPreview(stem), reason: issues });
    } else {
      const data = buildQuestionData(parsed.data);
      results.push({ ok: true, input: parsed.data, contentHash: data.contentHash, rowNo, sheet: "单选题" });
    }
  });
  return results;
}

function parseMultipleChoice(ws: ExcelJS.Worksheet): QuestionRowResult[] {
  const results: QuestionRowResult[] = [];
  ws.eachRow((row, rowNo) => {
    if (rowNo === 1) return;
    const stem = cellText(row.getCell(1));
    if (!stem) return;

    const optTexts = [
      cellText(row.getCell(2)),
      cellText(row.getCell(3)),
      cellText(row.getCell(4)),
      cellText(row.getCell(5)),
      cellText(row.getCell(6)),
      cellText(row.getCell(7)),
    ];
    const options = optTexts
      .map((text, i) => ({ key: String.fromCharCode(65 + i), text }))
      .filter((o) => o.text.length > 0);

    const rawAnswer = cellText(row.getCell(8));
    const answerKeys = parseChoiceAnswer(rawAnswer);
    const difficulty = parseDifficulty(cellText(row.getCell(9)));
    const analysis = cellText(row.getCell(10)) || null;

    const input = {
      type: "MULTIPLE_CHOICE" as const,
      stem,
      options,
      answer: answerKeys,
      difficulty,
      analysis,
    };

    const parsed = questionInputSchema.safeParse(input);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join("；");
      results.push({ ok: false, rowNo, sheet: "多选题", stemPreview: stemPreview(stem), reason: issues });
    } else {
      const data = buildQuestionData(parsed.data);
      results.push({ ok: true, input: parsed.data, contentHash: data.contentHash, rowNo, sheet: "多选题" });
    }
  });
  return results;
}

function parseTrueFalse(ws: ExcelJS.Worksheet): QuestionRowResult[] {
  const results: QuestionRowResult[] = [];
  ws.eachRow((row, rowNo) => {
    if (rowNo === 1) return;
    const stem = cellText(row.getCell(1));
    if (!stem) return;

    const rawAnswer = cellText(row.getCell(2));
    const tfAnswer = parseTrueFalseAnswer(rawAnswer);
    const difficulty = parseDifficulty(cellText(row.getCell(3)));
    const analysis = cellText(row.getCell(4)) || null;

    if (!tfAnswer) {
      results.push({
        ok: false,
        rowNo,
        sheet: "判断题",
        stemPreview: stemPreview(stem),
        reason: `正确答案填写无效（"${rawAnswer}"），请填「正确」或「错误」`,
      });
      return;
    }

    const input = {
      type: "TRUE_FALSE" as const,
      stem,
      answer: tfAnswer,
      difficulty,
      analysis,
    };

    const parsed = questionInputSchema.safeParse(input);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join("；");
      results.push({ ok: false, rowNo, sheet: "判断题", stemPreview: stemPreview(stem), reason: issues });
    } else {
      const data = buildQuestionData(parsed.data);
      results.push({ ok: true, input: parsed.data, contentHash: data.contentHash, rowNo, sheet: "判断题" });
    }
  });
  return results;
}

function parseFillBlank(ws: ExcelJS.Worksheet): QuestionRowResult[] {
  const results: QuestionRowResult[] = [];
  ws.eachRow((row, rowNo) => {
    if (rowNo === 1) return;
    const stem = cellText(row.getCell(1));
    if (!stem) return;

    // 空1-空4（列 B-E）
    const blankCols = [
      cellText(row.getCell(2)),
      cellText(row.getCell(3)),
      cellText(row.getCell(4)),
      cellText(row.getCell(5)),
    ].filter((s) => s.length > 0);

    const difficulty = parseDifficulty(cellText(row.getCell(6)));
    const analysis = cellText(row.getCell(7)) || null;

    if (blankCols.length === 0) {
      results.push({
        ok: false,
        rowNo,
        sheet: "填空题",
        stemPreview: stemPreview(stem),
        reason: "至少填写「空1答案」",
      });
      return;
    }

    // 统计题干中的 ____ 数量
    const placeholderCount = (stem.match(/_{4}/g) ?? []).length;
    if (placeholderCount !== blankCols.length) {
      results.push({
        ok: false,
        rowNo,
        sheet: "填空题",
        stemPreview: stemPreview(stem),
        reason: `题干中有 ${placeholderCount} 个____，但填写了 ${blankCols.length} 列答案，数量不一致`,
      });
      return;
    }

    // 每列按 ||| 分割为可接受答案数组
    const answer = blankCols.map((col) =>
      col
        .split(BLANK_SEP)
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    );

    const emptyBlanks = answer.findIndex((a) => a.length === 0);
    if (emptyBlanks >= 0) {
      results.push({
        ok: false,
        rowNo,
        sheet: "填空题",
        stemPreview: stemPreview(stem),
        reason: `空${emptyBlanks + 1} 没有有效的答案内容（|||之间不能为空）`,
      });
      return;
    }

    const input = {
      type: "FILL_BLANK" as const,
      stem,
      answer,
      difficulty,
      analysis,
    };

    const parsed = questionInputSchema.safeParse(input);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join("；");
      results.push({ ok: false, rowNo, sheet: "填空题", stemPreview: stemPreview(stem), reason: issues });
    } else {
      const data = buildQuestionData(parsed.data);
      results.push({ ok: true, input: parsed.data, contentHash: data.contentHash, rowNo, sheet: "填空题" });
    }
  });
  return results;
}

const SHEET_PARSERS: Record<string, (ws: ExcelJS.Worksheet) => QuestionRowResult[]> = {
  单选题: parseSingleChoice,
  多选题: parseMultipleChoice,
  判断题: parseTrueFalse,
  填空题: parseFillBlank,
};

// --- 主入口 ---

export async function parseQuestionWorkbook(buf: Buffer): Promise<QuestionRowResult[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0]);

  const results: QuestionRowResult[] = [];
  for (const ws of wb.worksheets) {
    const parser = SHEET_PARSERS[ws.name];
    if (!parser) continue; // 忽略未知 Sheet
    results.push(...parser(ws));
  }
  return results;
}

export async function analyzeQuestionImport(
  rows: QuestionRowResult[],
  bankId: number,
): Promise<AnalysisResult> {
  const truncated = rows.length > MAX_IMPORT_ROWS;
  const limited = truncated ? rows.slice(0, MAX_IMPORT_ROWS) : rows;

  const invalid: AnalysisResult["invalid"] = [];
  const fileDups: AnalysisResult["fileDups"] = [];
  const seenHashes = new Map<string, { rowNo: number; sheet: string }>(); // hash → 首次出现位置
  const validRows: Extract<QuestionRowResult, { ok: true }>[] = [];

  for (const r of limited) {
    if (!r.ok) {
      invalid.push({ rowNo: r.rowNo, sheet: r.sheet, stemPreview: r.stemPreview, reason: r.reason });
      continue;
    }
    const existing = seenHashes.get(r.contentHash);
    if (existing) {
      fileDups.push({ rowNo: r.rowNo, sheet: r.sheet, firstRow: existing.rowNo });
      continue;
    }
    seenHashes.set(r.contentHash, { rowNo: r.rowNo, sheet: r.sheet });
    validRows.push(r);
  }

  // 批量查 DB：哪些 hash 已在题库中
  const hashes = validRows.map((r) => r.contentHash);
  const existing = hashes.length
    ? await prisma.question.findMany({
        where: { bankId, contentHash: { in: hashes } },
        select: { contentHash: true },
      })
    : [];
  const existingSet = new Set(existing.map((q) => q.contentHash));

  const importable: ImportableQuestion[] = [];
  const duplicates: AnalysisResult["duplicates"] = [];

  for (const r of validRows) {
    if (existingSet.has(r.contentHash)) {
      duplicates.push({ rowNo: r.rowNo, sheet: r.sheet, contentHash: r.contentHash });
    } else {
      importable.push({
        rowNo: r.rowNo,
        sheet: r.sheet,
        contentHash: r.contentHash,
        data: buildQuestionData(r.input),
      });
    }
  }

  const total = limited.length;
  return {
    importable,
    duplicates,
    fileDups,
    invalid,
    truncated,
    summary: {
      total,
      importable: importable.length,
      duplicates: duplicates.length,
      fileDups: fileDups.length,
      invalid: invalid.length,
    },
  };
}

// confirm 时调用：返回可导入的 Prisma 数据（直接来自 analyzeQuestionImport）
export async function getImportableData(buf: Buffer, bankId: number) {
  const rows = await parseQuestionWorkbook(buf);
  return analyzeQuestionImport(rows, bankId);
}
