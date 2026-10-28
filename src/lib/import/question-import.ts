// 题目导入：解析 xlsx（四题型多 Sheet）+ dry-run 预检（不写库）。
// preview 与 confirm 共用同一套解析与分析逻辑，保证一致与安全。
import ExcelJS from "exceljs";
import { questionInputSchema, type QuestionInput } from "@/lib/validations/question";
import { buildQuestionData } from "@/lib/question-data";
import { questionAnswerSignature } from "@/lib/question-hash";
import { readQuestionWorkbook } from "@/lib/import/question-workbook";

// --- 类型定义 ---

export type QuestionRowResult =
  | { ok: true; input: QuestionInput; contentHash: string; rowNo: number; sheet: string }
  | { ok: false; rowNo: number; sheet: string; stemPreview: string; reason: string };

export const MAX_FILE_ROWS = 20_000;
export const MAX_BATCH_ROWS = 100_000;
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

// 读取三级归属列（教材/单元/知识点），统一位于各 Sheet「解析」列之后；空值归一为 null
function parseAttrs(row: ExcelJS.Row, startCol: number) {
  return {
    textbook: cellText(row.getCell(startCol)) || null,
    unit: cellText(row.getCell(startCol + 1)) || null,
    knowledgePoint: cellText(row.getCell(startCol + 2)) || null,
  };
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
      ...parseAttrs(row, 11),
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
      ...parseAttrs(row, 11),
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
      ...parseAttrs(row, 5),
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
      ...parseAttrs(row, 8),
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
  const wb = await readQuestionWorkbook(buf);

  const results: QuestionRowResult[] = [];
  for (const ws of wb.worksheets) {
    const parser = SHEET_PARSERS[ws.name];
    if (!parser) continue; // 忽略未知 Sheet
    results.push(...parser(ws));
  }
  return results;
}

// Each row is accounted for exactly once, including cross-file conflicts.
export type ImportFileInput = {
  index: number;
  name: string;
  rows: QuestionRowResult[];
  error?: string;
};
type IssueKind = "duplicate" | "fileDup" | "conflict" | "invalid";
type Summary = { total: number; importable: number; duplicates: number; fileDups: number; conflicts: number; invalid: number };
export type ImportFileAnalysis = {
  index: number;
  name: string;
  error?: string;
  summary: Summary;
  issues: { kind: IssueKind; sheet: string; rowNo: number; reason: string }[];
  importable: Extract<QuestionRowResult, { ok: true }>[];
};
const emptySummary = (): Summary => ({ total: 0, importable: 0, duplicates: 0, fileDups: 0, conflicts: 0, invalid: 0 });

export function analyzeQuestionImportBatch(
  files: ImportFileInput[],
  existing: Map<string, Set<string>>,
): { files: ImportFileAnalysis[]; summary: Summary } {
  const results: ImportFileAnalysis[] = files.map(f => ({
    index: f.index, name: f.name, error: f.error, summary: { ...emptySummary(), total: f.rows.length },
    issues: [], importable: [],
  }));
  type Candidate = { file: ImportFileAnalysis; row: Extract<QuestionRowResult, { ok: true }>; signature: string };
  const groups = new Map<string, Candidate[]>();
  for (const [i, file] of files.entries()) {
    const result = results[i];
    if (file.error) continue;
    for (const row of file.rows) {
      if (!row.ok) {
        result.summary.invalid++;
        result.issues.push({ kind: "invalid", sheet: row.sheet, rowNo: row.rowNo, reason: `${row.stemPreview}：${row.reason}` });
        continue;
      }
      const group = groups.get(row.contentHash) ?? [];
      group.push({ file: result, row, signature: questionAnswerSignature(row.input) });
      groups.set(row.contentHash, group);
    }
  }
  for (const [identity, group] of groups) {
    const signatures = new Set(group.map(item => item.signature));
    const previous = existing.get(identity);
    const conflict = signatures.size > 1 || (previous && [...signatures].some(sig => previous.size !== 1 || !previous.has(sig)));
    if (conflict) {
      const first = group[0];
      for (const item of group) {
        item.file.summary.conflicts++;
        const location = group.length > 1 ? `（批次中 ${first.file.name}「${first.row.sheet}」第 ${first.row.rowNo} 行）` : "（与题库中的题目不一致）";
        item.file.issues.push({ kind: "conflict", sheet: item.row.sheet, rowNo: item.row.rowNo, reason: `答案冲突${location}` });
      }
    } else if (previous) {
      for (const item of group) {
        item.file.summary.duplicates++;
        item.file.issues.push({ kind: "duplicate", sheet: item.row.sheet, rowNo: item.row.rowNo, reason: "题库中已有相同题目" });
      }
    } else {
      const [first, ...duplicates] = group;
      first.file.importable.push(first.row);
      first.file.summary.importable++;
      for (const item of duplicates) {
        item.file.summary.fileDups++;
        item.file.issues.push({ kind: "fileDup", sheet: item.row.sheet, rowNo: item.row.rowNo, reason: `与 ${first.file.name}「${first.row.sheet}」第 ${first.row.rowNo} 行重复` });
      }
    }
  }
  const summary = emptySummary();
  for (const file of results) for (const key of Object.keys(summary) as (keyof Summary)[]) summary[key] += file.summary[key];
  return { files: results, summary };
}
