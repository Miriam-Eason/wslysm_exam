import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeQuestionImportBatch, type QuestionRowResult } from "./question-import";
import { buildQuestionData } from "../question-data";
import { questionAnswerSignature } from "../question-hash";
import type { QuestionInput } from "../validations/question";

function choice(stem: string, options: string[], answer: string, rowNo: number): Extract<QuestionRowResult, { ok: true }> {
  const input: QuestionInput = { type: "SINGLE_CHOICE", stem, options: options.map((text, i) => ({ key: String.fromCharCode(65 + i), text })), answer: [answer], difficulty: "MEDIUM" };
  return { ok: true, input, contentHash: buildQuestionData(input).contentHash, sheet: "单选题", rowNo };
}

test("全批判定答案冲突，重复选项顺序可变，旧题按新身份匹配", () => {
  const legacy = choice("旧题", ["甲", "乙"], "A", 1);
  const first = choice("相同题", ["甲", "乙"], "A", 2);
  const reordered = choice("相同题", ["乙", "甲"], "B", 2);
  const conflictA = choice("冲突题", ["甲", "乙"], "A", 3);
  const conflictB = choice("冲突题", ["乙", "甲"], "A", 3);
  const invalid: QuestionRowResult = { ok: false, sheet: "单选题", rowNo: 4, stemPreview: "坏题", reason: "选项内容重复" };
  const existing = new Map([[legacy.contentHash, new Set([questionAnswerSignature(legacy.input)])]]);
  const result = analyzeQuestionImportBatch([
    { index: 0, name: "a.xlsx", rows: [legacy, first, conflictA, invalid] },
    { index: 1, name: "b.xlsx", rows: [reordered, conflictB] },
    { index: 2, name: "bad.xlsx", rows: [], error: "无法读取" },
  ], existing);
  assert.deepEqual(result.summary, { total: 6, importable: 1, duplicates: 1, fileDups: 1, conflicts: 2, invalid: 1 });
  assert.equal(result.files[0].importable[0].rowNo, 2);
  assert.match(result.files[1].issues.find(i => i.kind === "fileDup")!.reason, /a.xlsx/);
  assert.equal(result.files[2].error, "无法读取");
});

test("同身份但历史答案混乱时，所有新题都报告冲突", () => {
  const row = choice("历史题", ["甲", "乙"], "A", 2);
  const other = choice("历史题", ["甲", "乙"], "B", 3);
  const existing = new Map([[row.contentHash, new Set([questionAnswerSignature(row.input), questionAnswerSignature(other.input)])]]);
  const result = analyzeQuestionImportBatch([{ index: 0, name: "a.xlsx", rows: [row] }], existing);
  assert.equal(result.summary.conflicts, 1);
  assert.equal(result.summary.importable, 0);
});
