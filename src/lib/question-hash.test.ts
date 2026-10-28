import assert from "node:assert/strict";
import { test } from "node:test";
import { contentHash, questionAnswerSignature, questionIdentityHash } from "./question-hash";
import { buildQuestionData } from "./question-data";
import type { QuestionInput } from "./validations/question";

test("选择题身份和答案按选项文本比较，不受编号和顺序影响", () => {
  const first = {
    type: "MULTIPLE_CHOICE" as const,
    stem: "题 干\n内容",
    options: [{ key: "A", text: " 甲\t选项 " }, { key: "B", text: "乙" }, { key: "C", text: "丙" }],
    answer: ["A", "C"],
  };
  const reordered = {
    type: "MULTIPLE_CHOICE" as const,
    stem: "题干内容",
    options: [{ key: "A", text: "丙" }, { key: "B", text: "甲 选项" }, { key: "C", text: "乙" }],
    answer: ["B", "A"],
  };
  assert.equal(questionIdentityHash(first), questionIdentityHash(reordered));
  assert.equal(questionAnswerSignature(first), questionAnswerSignature(reordered));
  assert.notEqual(questionAnswerSignature(first), questionAnswerSignature({ ...reordered, answer: ["C", "A"] }));
  assert.notEqual(questionIdentityHash(first), questionIdentityHash({ ...reordered, options: [...reordered.options, { key: "D", text: "丁" }] }));
  assert.notEqual(questionIdentityHash(first), questionIdentityHash({ ...first, type: "SINGLE_CHOICE" }));
  assert.match(questionIdentityHash(first), /^v2:[a-f0-9]{64}$/);
});

test("选择题文本按集合比较，歧义选项的标记交给调用方", () => {
  const question = { type: "SINGLE_CHOICE" as const, stem: "题", options: [{ key: "A", text: "相同" }, { key: "B", text: " 相同 " }], answer: ["A"] };
  assert.equal(questionIdentityHash(question), questionIdentityHash({ ...question, options: [question.options[0]] }));
  assert.equal(questionAnswerSignature(question), questionAnswerSignature({ ...question, answer: ["B"] }));
  assert.throws(() => questionAnswerSignature({ ...question, answer: ["C"] }), /不在选项中/);
  assert.throws(() => questionIdentityHash({ ...question, options: [{ key: "A", text: "一" }, { key: "A", text: "二" }] }), /编号重复/);
});

test("判断和填空的身份不包含答案，填空别名忽略顺序和首尾空白", () => {
  const fill = { type: "FILL_BLANK" as const, stem: "题  干", options: null, answer: [[" 北京 ", "京城"], ["上海"]] };
  const same = { ...fill, stem: "题干", answer: [["京城", "北京", "北京"], [" 上海 "]] };
  assert.equal(questionIdentityHash(fill), questionIdentityHash(same));
  assert.equal(questionAnswerSignature(fill), questionAnswerSignature(same));
  assert.notEqual(questionAnswerSignature(fill), questionAnswerSignature({ ...fill, answer: [["上海"], ["北京", "京城"]] }));
  assert.notEqual(questionAnswerSignature(fill), questionAnswerSignature({ ...fill, answer: [["北 京", "京城"], ["上海"]] }));
  const judge = { type: "TRUE_FALSE" as const, stem: "题干", options: null, answer: ["T"] };
  const opposite = { ...judge, answer: ["F"] };
  assert.equal(questionIdentityHash(judge), questionIdentityHash(opposite));
  assert.notEqual(questionAnswerSignature(judge), questionAnswerSignature({ ...judge, answer: ["F"] }));
  assert.notEqual(questionIdentityHash(judge), questionIdentityHash(fill));
  assert.throws(() => questionAnswerSignature({ ...fill, answer: ["北京"] }), /别名数组/);
});

test("写入 v2 身份，保留旧哈希函数", () => {
  const input: QuestionInput = { type: "SINGLE_CHOICE", stem: "题", options: [{ key: "A", text: "甲" }, { key: "B", text: "乙" }], answer: ["A"], difficulty: "MEDIUM" };
  assert.equal(buildQuestionData(input).contentHash, questionIdentityHash(input));
  assert.equal(buildQuestionData(input).contentHash, buildQuestionData({ ...input, answer: ["B"] }).contentHash);
  assert.equal(contentHash("SINGLE_CHOICE", "题", ["A"]), "a297a113c161d33ed6c14a5d95c155f2ad6e3e74");
});
