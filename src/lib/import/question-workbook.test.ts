import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { readQuestionWorkbook } from "./question-workbook";

async function sample(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("单选题");
  sheet.addRow(["题干", "选项A", "正确答案"]);
  sheet.addRow(["题目内容", "选项内容", "A"]);
  sheet.getCell("A1").note = "表头批注";
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function editSheet(buffer: Buffer, transform: (xml: string) => string): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  const entry = zip.file("xl/worksheets/sheet1.xml");
  assert.ok(entry);
  zip.file(entry.name, transform(await entry.async("string")));
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

test("正常读取保留批注与单元格，且不改变输入", async () => {
  const input = await sample();
  const before = Buffer.from(input);
  const workbook = await readQuestionWorkbook(input);
  assert.equal(workbook.getWorksheet("单选题")?.getCell("A2").text, "题目内容");
  assert.ok(workbook.getWorksheet("单选题")?.getCell("A1").note);
  assert.deepEqual(input, before);
});

test("批注路径不兼容时仅后备移除批注关联，保留题目", async () => {
  const zip = await JSZip.loadAsync(await sample());
  const name = "xl/worksheets/_rels/sheet1.xml.rels";
  const rel = zip.file(name);
  assert.ok(rel);
  zip.file(name, (await rel.async("string")).replace("../comments1.xml", "/xl/comments/comment1.xml"));
  const input = await zip.generateAsync({ type: "nodebuffer" });
  await assert.rejects(new ExcelJS.Workbook().xlsx.load(input as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0]), /comments/);
  const workbook = await readQuestionWorkbook(input);
  assert.equal(workbook.getWorksheet("单选题")?.getCell("A2").text, "题目内容");
  assert.equal(workbook.getWorksheet("单选题")?.getCell("B2").text, "选项内容");
  assert.equal(workbook.getWorksheet("单选题")?.getCell("A1").note, undefined);
});

test("拒绝压缩包伪造解压大小、解压炸弹与过大输入", async () => {
  const zip = new JSZip();
  zip.file("bomb", Buffer.alloc(49 * 1024 * 1024));
  const bomb = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  await assert.rejects(readQuestionWorkbook(bomb), /解压大小超出限制/);
  const forged = Buffer.from(bomb);
  const central = forged.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  assert.ok(central > 0);
  forged.writeUInt32LE(10, central + 24);
  forged.writeUInt32LE(10, 22);
  await assert.rejects(readQuestionWorkbook(forged), /解压失败或实际大小超出限制/);
  await assert.rejects(readQuestionWorkbook(Buffer.alloc(20 * 1024 * 1024 + 1)), /20 MiB/);
});

test("拒绝稀疏坐标和会被 ExcelJS 展开的巨大区域", async () => {
  const buffer = await sample();
  const sparse = await editSheet(buffer, xml => xml.replace('r="A2"', 'r="XFD1048576"'));
  await assert.rejects(readQuestionWorkbook(sparse), /位置超出限制/);
  const validation = await editSheet(buffer, xml => xml.replace("</worksheet>", '<dataValidations count="1"><dataValidation type="list" sqref="A1:XFD1048576"/></dataValidations></worksheet>'));
  await assert.rejects(readQuestionWorkbook(validation), /位置超出限制/);
  const merge = await editSheet(buffer, xml => xml.replace("</worksheet>", '<mergeCells count="1"><mergeCell ref="A1:IV25000"/></mergeCells></worksheet>'));
  await assert.rejects(readQuestionWorkbook(merge), /区域超出限制/);
});

test("限制单元格总数，同时允许正常解析错误向上传递", async () => {
  const buffer = await sample();
  const excessive = await editSheet(buffer, xml => xml.replace("</sheetData>", `<row r="3">${'<c r="A3"/>'.repeat(400_001)}</row></sheetData>`));
  await assert.rejects(readQuestionWorkbook(excessive), /单元格数量超出限制/);
  const broken = await editSheet(buffer, xml => xml.replace("</worksheet>", '<mergeCells count="2"><mergeCell ref="A1:B1"/><mergeCell ref="A1:B1"/></mergeCells></worksheet>'));
  await assert.rejects(readQuestionWorkbook(broken), /Cannot merge already merged cells/);
});
