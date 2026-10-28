import ExcelJS from "exceljs";
import JSZip from "jszip";
import { SaxesParser } from "saxes";
import { inflateRawSync } from "node:zlib";

// ExcelJS holds the uncompressed XML and the resulting object model in memory.
// These limits apply before *either* the normal parse or the compatibility retry.
const MAX_INPUT = 20 * 1024 * 1024;
const MAX_ENTRY = 48 * 1024 * 1024;
const MAX_TOTAL = 64 * 1024 * 1024;
const MAX_ENTRIES = 512;
const MAX_CELLS = 400_000;
const MAX_ROWS = 25_000;
const MAX_ROW = 25_000;
const MAX_COLUMN = 256;
const MAX_RANGE_CELLS = 100_000;
const MAX_MERGES = 1_000;
const MAX_XML_ELEMENTS = 1_500_000;
const MAX_XML_DEPTH = 256;
const COMMENT_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments";

function invalid(reason: string): never {
  throw new Error(`无法安全读取 XLSX：${reason}`);
}

function address(ref: string): [number, number] {
  const match = /^\$?([A-Z]+)\$?([1-9]\d*)$/.exec(ref);
  if (!match) invalid("单元格引用无效");
  let col = 0;
  for (const ch of match[1]) col = col * 26 + ch.charCodeAt(0) - 64;
  const row = Number(match[2]);
  if (col > MAX_COLUMN || row > MAX_ROW) invalid("单元格位置超出限制");
  return [row, col];
}

function inspectXml(xml: Buffer, worksheet: boolean, counts: { cells: number; rows: number; ranges: number; merges: number; elements: number }) {
  const parser = new SaxesParser();
  let depth = 0;
  parser.on("opentag", (tag) => {
    if (++counts.elements > MAX_XML_ELEMENTS || ++depth > MAX_XML_DEPTH) invalid("XML 结构超出限制");
    if (!worksheet) return;
    if (tag.name === "row" && ++counts.rows > MAX_ROWS) invalid("工作表行数超出限制");
    if (tag.name === "row" && tag.attributes.r !== undefined) {
      const row = String(tag.attributes.r);
      if (!/^[1-9]\d*$/.test(row) || Number(row) > MAX_ROW) invalid("工作表行号超出限制");
    }
    if (tag.name === "c") {
      if (++counts.cells > MAX_CELLS) invalid("单元格数量超出限制");
      address(String(tag.attributes.r ?? ""));
    }
    if (tag.name === "col") {
      const min = Number(tag.attributes.min);
      const max = Number(tag.attributes.max);
      if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min || max > MAX_COLUMN) invalid("列范围超出限制");
    }
    if (tag.name === "mergeCell" || tag.name === "dataValidation") {
      if (tag.name === "mergeCell" && ++counts.merges > MAX_MERGES) invalid("合并区域数量超出限制");
      const refs = String(tag.attributes[tag.name === "mergeCell" ? "ref" : "sqref"] ?? "").trim().split(/\s+/);
      for (const ref of refs) {
        const ends = ref.split(":");
        if (ends.length > 2) invalid("工作表区域无效");
        const first = address(ends[0]);
        const last = address(ends[1] ?? ends[0]);
        counts.ranges += (Math.abs(first[0] - last[0]) + 1) * (Math.abs(first[1] - last[1]) + 1);
        if (counts.ranges > MAX_RANGE_CELLS) invalid("合并及数据验证区域超出限制");
      }
    }
  });
  parser.on("closetag", () => { depth--; });
  parser.write(xml.toString("utf8")).close();
}

function inspectExtra(extra: Buffer) {
  let pos = 0;
  while (pos < extra.length) {
    if (pos + 4 > extra.length) invalid("ZIP 扩展字段损坏");
    const id = extra.readUInt16LE(pos);
    const size = extra.readUInt16LE(pos + 2);
    pos += 4;
    if (pos + size > extra.length || id === 0x0001 || id === 0x7075) invalid("ZIP 扩展字段不受支持");
    pos += size;
  }
}

// Validate the ZIP directory and local headers, then actually inflate every entry
// with a hard output cap. Declared sizes and compression ratios alone are untrusted.
function inspectZip(input: Buffer) {
  if (input.length === 0 || input.length > MAX_INPUT) invalid("文件为空或超过 20 MiB");
  let eocd = -1;
  for (let p = input.length - 22; p >= Math.max(0, input.length - 22 - 65535); p--) {
    if (input.readUInt32LE(p) === 0x06054b50 && p + 22 + input.readUInt16LE(p + 20) === input.length) {
      eocd = p;
      break;
    }
  }
  if (eocd < 0) invalid("ZIP 目录缺失");
  const disk = input.readUInt16LE(eocd + 4);
  const directoryDisk = input.readUInt16LE(eocd + 6);
  const count = input.readUInt16LE(eocd + 10);
  const directorySize = input.readUInt32LE(eocd + 12);
  const directoryOffset = input.readUInt32LE(eocd + 16);
  if (disk || directoryDisk || count !== input.readUInt16LE(eocd + 8) || count === 0 || count > MAX_ENTRIES || directoryOffset + directorySize !== eocd) invalid("ZIP 目录不受支持");
  let pos = directoryOffset;
  let total = 0;
  const names = new Set<string>();
  const ranges: Array<[number, number]> = [];
  const counts = { cells: 0, rows: 0, ranges: 0, merges: 0, elements: 0 };
  for (let i = 0; i < count; i++) {
    if (pos + 46 > eocd || input.readUInt32LE(pos) !== 0x02014b50) invalid("ZIP 目录损坏");
    const flags = input.readUInt16LE(pos + 8);
    const method = input.readUInt16LE(pos + 10);
    const compressed = input.readUInt32LE(pos + 20);
    const size = input.readUInt32LE(pos + 24);
    const nameLength = input.readUInt16LE(pos + 28);
    const extraLength = input.readUInt16LE(pos + 30);
    const commentLength = input.readUInt16LE(pos + 32);
    const offset = input.readUInt32LE(pos + 42);
    const end = pos + 46 + nameLength + extraLength + commentLength;
    if (end > eocd || !nameLength || (flags & 1) || (method !== 0 && method !== 8) || input.readUInt16LE(pos + 34) !== 0) invalid("ZIP 条目不受支持");
    const nameBytes = input.subarray(pos + 46, pos + 46 + nameLength);
    const name = nameBytes.toString("utf8");
    if (name.includes("\uFFFD") || name.includes("\\") || name.startsWith("/") || name.split("/").some(part => part === "." || part === "..") || names.has(name)) invalid("ZIP 条目路径无效或重复");
    names.add(name);
    inspectExtra(input.subarray(pos + 46 + nameLength, pos + 46 + nameLength + extraLength));
    if (size > MAX_ENTRY || (total += size) > MAX_TOTAL) invalid("解压大小超出限制");
    if (offset + 30 > directoryOffset || input.readUInt32LE(offset) !== 0x04034b50 || input.readUInt16LE(offset + 6) !== flags || input.readUInt16LE(offset + 8) !== method) invalid("ZIP 本地头损坏");
    const localNameLength = input.readUInt16LE(offset + 26);
    const localExtraLength = input.readUInt16LE(offset + 28);
    const dataStart = offset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressed;
    if (dataEnd > directoryOffset || !input.subarray(offset + 30, offset + 30 + localNameLength).equals(nameBytes)) invalid("ZIP 条目范围无效");
    inspectExtra(input.subarray(offset + 30 + localNameLength, dataStart));
    if (!(flags & 8) && (input.readUInt32LE(offset + 18) !== compressed || input.readUInt32LE(offset + 22) !== size)) invalid("ZIP 条目大小不一致");
    ranges.push([offset, dataEnd]);
    let data: Buffer;
    try {
      data = method === 0 ? input.subarray(dataStart, dataEnd) : inflateRawSync(input.subarray(dataStart, dataEnd), { maxOutputLength: Math.max(1, size) });
    } catch {
      invalid("ZIP 解压失败或实际大小超出限制");
    }
    if (data.length !== size) invalid("ZIP 解压大小不一致");
    const worksheet = /^xl\/worksheets\/sheet\d+\.xml$/.test(name);
    if (/xl\/worksheets\/sheet\d+\.xml/.test(name) && !worksheet) invalid("工作表路径无效");
    if (/\.(xml|rels|vml)$/i.test(name)) inspectXml(data, worksheet, counts);
    pos = end;
  }
  if (pos !== eocd) invalid("ZIP 目录长度不一致");
  ranges.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < ranges.length; i++) if (ranges[i][0] < ranges[i - 1][1]) invalid("ZIP 条目重叠");
}

/**
 * Read a question XLSX into an ExcelJS workbook. Input is a Node Buffer (max 20 MiB).
 * ZIP: at most 512 entries, 48 MiB per entry, 64 MiB total uncompressed.
 * Worksheets: at most 25,000 rows in total, row index <= 25,000, column <= 256,
 * 400,000 cell elements, 1,000 merges, and 100,000 cells across merge and
 * validation ranges. XML: 1,500,000 elements total and depth <= 256.
 * ZIP64, encrypted ZIPs and Unicode-path extras are unsupported.
 * Normal ExcelJS parsing is attempted first. If its known comments reconciliation
 * error occurs, retry on an in-memory copy with comment relationships disabled;
 * cell contents are preserved, but notes are unavailable in that fallback.
 * Throws on invalid/oversized files or other parse errors; never changes the input.
 */
export async function readQuestionWorkbook(input: Buffer): Promise<ExcelJS.Workbook> {
  if (input.length === 0 || input.length > MAX_INPUT) invalid("文件为空或超过 20 MiB");
  input = Buffer.from(input);
  inspectZip(input);
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(input as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    return workbook;
  } catch (error) {
    if (!(error instanceof TypeError) || !/Cannot read properties of undefined \(reading 'comments'\)/.test(error.message)) throw error;
    const zip = await JSZip.loadAsync(input);
    let changed = 0;
    for (const entry of Object.values(zip.files)) {
      if (!/^xl\/worksheets\/_rels\/sheet\d+\.xml\.rels$/.test(entry.name)) continue;
      const xml = await entry.async("string");
      const updated = xml.replace(/<Relationship(?=[\s/>])(?:[^>"']|"[^"]*"|'[^']*')*\/?>/g, tag => tag.replace(/\bType\s*=\s*(["'])([^"']*)\1/g, (match, quote: string, type: string) => {
        if (type !== COMMENT_TYPE) return match;
        changed++;
        return `Type=${quote}urn:question-import:ignored-comments${quote}`;
      }));
      if (updated !== xml) zip.file(entry.name, updated);
    }
    if (!changed) throw error;
    const sanitized = await zip.generateAsync({ type: "nodebuffer", compression: "STORE" });
    const retry = new ExcelJS.Workbook();
    await retry.xlsx.load(sanitized as unknown as Parameters<typeof retry.xlsx.load>[0]);
    return retry;
  }
}
