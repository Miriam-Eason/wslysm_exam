import { MAX_BATCH_ROWS, MAX_FILE_ROWS, parseQuestionWorkbook, type ImportFileInput } from "@/lib/import/question-import";

export const MAX_IMPORT_FILES = 10;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** Parse each file separately so one malformed workbook does not hide the others. */
export async function readImportRequest(req: Request): Promise<{ files: ImportFileInput[] } | { error: string }> {
  const form = await req.formData().catch(() => null);
  if (!form) return { error: "无法读取上传文件" };
  const uploaded = form.getAll("files");
  if (!uploaded.length || uploaded.length > MAX_IMPORT_FILES || uploaded.some(file => !(file instanceof File))) {
    return { error: "请选择 1 至 10 个 Excel 文件" };
  }
  const files: ImportFileInput[] = [];
  let total = 0;
  for (const [index, entry] of uploaded.entries()) {
    const file = entry as File;
    let rows: ImportFileInput["rows"] = [];
    let error: string | undefined;
    if (!file.name.toLowerCase().endsWith(".xlsx")) error = "请上传 .xlsx 格式的 Excel 文件";
    else if (!file.size) error = "文件为空";
    else if (file.size > MAX_FILE_BYTES) error = "文件超过 20MB";
    else {
      try {
        rows = await parseQuestionWorkbook(Buffer.from(await file.arrayBuffer()));
        if (!rows.length) error = "未读取到题目，请检查工作表名称及模板格式";
        else if (rows.length > MAX_FILE_ROWS) error = `文件有 ${rows.length} 道题，超过 20000 题上限`;
      } catch (e) {
        error = e instanceof Error && e.message.startsWith("无法安全读取 XLSX：")
          ? e.message : "无法解析该文件，请检查 Excel 格式";
      }
    }
    if (error) rows = [];
    total += rows.length;
    if (total > MAX_BATCH_ROWS) return { error: "本批次超过 100000 题，请分批导入" };
    files.push({ index, name: file.name, rows, error });
  }
  return { files };
}
