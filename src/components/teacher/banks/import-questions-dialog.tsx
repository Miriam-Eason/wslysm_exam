"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp, RefreshCw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter,
  DialogTitle, DialogDescription, DialogClose,
} from "@/components/ui/dialog";

type Counts = {
  total: number;
  importable: number;
  duplicates: number;
  fileDups: number;
  conflicts: number;
  invalid: number;
};
type Issue = { kind: "duplicate" | "fileDup" | "conflict" | "invalid"; sheet: string; rowNo: number; reason: string };
type PreviewFile = { index: number; name: string; error?: string; summary: Counts; issues: Issue[] };
type Preview = { files: PreviewFile[]; summary: Counts };
type ResultFile = {
  index: number;
  name: string;
  status: "completed" | "failed" | "not_processed";
  created: number;
  duplicates: number;
  fileDups: number;
  conflicts: number;
  invalid: number;
  error?: string;
  issues: Issue[];
};
type Result = { files: ResultFile[]; summary: Omit<Counts, "total" | "importable"> & { created: number } };

const MAX_FILES = 10;
const MAX_SIZE = 20 * 1024 * 1024;
const MAX_ROWS = 20_000;
const MAX_BATCH_ROWS = 100_000;
const issueLabels: Record<Issue["kind"], string> = {
  duplicate: "库内重复", fileDup: "批次重复", conflict: "答案冲突", invalid: "异常",
};
const statusLabels: Record<ResultFile["status"], string> = {
  completed: "成功", failed: "失败", not_processed: "未处理",
};

function formFor(files: File[]) {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  return form;
}

async function readResponse<T>(response: Response): Promise<T> {
  const json = await response.json();
  if (!response.ok || json.ok === false) {
    throw new Error(json?.error?.message ?? (typeof json?.error === "string" ? json.error : "请求失败"));
  }
  return (json.ok === true ? json.data : json) as T;
}

function csvCell(value: string | number) {
  let text = String(value);
  // Excel may interpret formulas even after whitespace or control characters.
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function issueDetails(file: PreviewFile, result?: ResultFile) {
  const usePreviewIssues = !result || (result.status !== "completed" && result.issues.length === 0);
  const usePreviewError = !result || (result.status !== "completed" && !result.error);
  return {
    issues: usePreviewIssues ? file.issues : result.issues,
    issueSource: usePreviewIssues ? "预检" : "确认",
    error: usePreviewError ? file.error : result.error,
    errorSource: usePreviewError ? "预检" : "确认",
  };
}

function downloadIssues(preview: Preview, result: Result | null) {
  const rows: (string | number)[][] = [["文件", "状态", "来源", "工作表", "行", "类型", "原因"]];
  for (const file of preview.files) {
    const final = result?.files[file.index];
    const details = issueDetails(file, final);
    const status = final ? statusLabels[final.status] : "预检";
    if (details.error) rows.push([file.name, status, details.errorSource, "", "", "文件异常", details.error]);
    for (const issue of details.issues) rows.push([file.name, status, details.issueSource, issue.sheet, issue.rowNo, issueLabels[issue.kind], issue.reason]);
  }
  const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "题目导入问题明细.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function ImportQuestionsDialog({ bankId }: { bankId: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "previewing" | "importing" | "uncertain">("idle");
  const [dragging, setDragging] = useState(false);
  const busy = phase === "previewing" || phase === "importing";

  function reset() {
    setFiles([]);
    setPreview(null);
    setResult(null);
    setMessage(null);
    setPhase("idle");
    setDragging(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function runPreview(next: File[]) {
    setFiles(next);
    setPreview(null);
    setResult(null);
    setMessage(null);
    if (!next.length) return;
    setPhase("previewing");
    try {
      const response = await fetch(`/api/banks/${bankId}/questions/import/preview`, {
        method: "POST", body: formFor(next),
      });
      const data = await readResponse<Preview>(response);
      if (!Array.isArray(data.files) || !data.summary || data.files.length !== next.length ||
        data.files.some((file) => !file || !Number.isInteger(file.index) || file.index < 0 || file.index >= next.length || !file.summary || !Array.isArray(file.issues)) ||
        new Set(data.files.map((file) => file.index)).size !== next.length) {
        throw new Error("预检响应格式不符合多文件导入协议");
      }
      setPreview({ ...data, files: [...data.files].sort((a, b) => a.index - b.index) });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "预检失败");
    } finally {
      setPhase("idle");
    }
  }

  function selectFiles(selected: File[]) {
    if (!selected.length || busy) return;
    const valid = selected.filter((file) => file.name.toLowerCase().endsWith(".xlsx") && file.size > 0 && file.size <= MAX_SIZE);
    const rejected = selected.filter((file) => !valid.includes(file));
    const notice = rejected.length ? `未添加 ${rejected.map((file) => file.name).join("、")}：请选择非空且不超过 20MB 的 .xlsx 文件` : null;
    if (!valid.length) return setMessage(notice);
    const next = result || phase === "uncertain" ? valid : [...files, ...valid];
    if (next.length > MAX_FILES) return setMessage(`最多选择 ${MAX_FILES} 个文件`);
    void runPreview(next);
    if (notice) setMessage(notice);
  }

  async function confirmImport() {
    if (!preview || busy || result || phase === "uncertain") return;
    setPhase("importing");
    setMessage(null);
    try {
      const response = await fetch(`/api/banks/${bankId}/questions/import/confirm`, {
        method: "POST", body: formFor(files),
      });
      const data = await readResponse<Result>(response);
      if (!Array.isArray(data.files) || !data.summary || data.files.length !== files.length ||
        data.files.some((file) => !file || !Number.isInteger(file.index) || file.index < 0 || file.index >= files.length || !["completed", "failed", "not_processed"].includes(file.status) || !Array.isArray(file.issues)) ||
        new Set(data.files.map((file) => file.index)).size !== files.length) {
        throw new Error("导入响应格式不符合多文件导入协议");
      }
      setResult({ ...data, files: [...data.files].sort((a, b) => a.index - b.index) });
      setPhase("idle");
      router.refresh();
    } catch (error) {
      setMessage(`${error instanceof Error ? error.message : "导入请求失败"}。导入结果未确认，请先核对题库后再重新选择文件。`);
      setPhase("uncertain");
      router.refresh();
    }
  }

  const overLimit = !!preview && (preview.files.reduce((total, file) => total + (file.error ? 0 : file.summary.total), 0) > MAX_BATCH_ROWS || preview.files.some((file) => !file.error && file.summary.total > MAX_ROWS));
  const canImport = !!preview && preview.summary.importable > 0 && !overLimit && phase === "idle" && !result;
  const hasIssues = !!preview && preview.files.some((file) => {
    const details = issueDetails(file, result?.files[file.index]);
    return details.error || details.issues.length > 0;
  });

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next && busy) return;
      setOpen(next);
      if (!next) reset();
    }}>
      <DialogTrigger asChild><Button variant="outline"><Upload className="size-4" />批量导入</Button></DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col" onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }} onPointerDownOutside={(event) => { if (busy) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>批量导入题目</DialogTitle>
          <DialogDescription>支持多文件导入，文件小于20MB，题目数量小于10万。</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}
            onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
            onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
            onDrop={(event) => { event.preventDefault(); setDragging(false); selectFiles(Array.from(event.dataTransfer.files)); }}
            className={`flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-5 text-center transition disabled:cursor-wait disabled:opacity-70 ${dragging ? "border-primary bg-primary-container/50 ring-4 ring-primary/15" : "border-outline-variant bg-surface-container-low/50 hover:border-primary"}`}>
            {busy ? <RefreshCw className="size-6 animate-spin text-primary" /> : <FileUp className="size-6 text-primary" />}
            <span className="text-sm font-medium">{phase === "previewing" ? "正在预检…" : phase === "importing" ? "正在导入…" : result || phase === "uncertain" ? "选择或拖入文件，开始新一批" : "选择或拖入 .xlsx 文件"}</span>
          </button>
          <input ref={inputRef} type="file" multiple accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => { selectFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
          {message && <p role="alert" className="rounded-lg bg-danger-container px-3 py-2 text-sm text-danger">{message}</p>}
          {overLimit && <p role="alert" className="rounded-lg bg-danger-container px-3 py-2 text-sm text-danger">题目数量超过限制，请移除超限文件后重新预检。</p>}
          {preview && <div className="flex flex-wrap items-center gap-2"><CountsView counts={result ? result.summary : preview.summary} />{hasIssues && <Button type="button" variant="outline" size="sm" onClick={() => downloadIssues(preview, result)}><Download className="size-4" />导出问题明细</Button>}</div>}
          {files.map((file, index) => {
            const checked = preview?.files[index];
            const completed = result?.files[index];
            const details = checked && issueDetails(checked, completed);
            return <div key={`${index}-${file.name}-${file.lastModified}`} className="rounded-lg border border-outline-variant p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="break-all text-sm font-medium">{file.name}</p>{completed && <p className={`mt-1 text-sm ${completed.status === "completed" ? "text-success" : "text-danger"}`}>{statusLabels[completed.status]}</p>}{details?.error && <p className="mt-1 text-sm text-danger">{completed && details.errorSource === "预检" ? "预检：" : ""}{details.error}</p>}</div>
                {!result && phase !== "uncertain" && <Button type="button" variant="ghost" size="icon" disabled={busy} aria-label={`移除 ${file.name}`} onClick={() => void runPreview(files.filter((_, i) => i !== index))}><X className="size-4" /></Button>}
              </div>
              {checked && <div className="mt-2 flex flex-wrap gap-2"><CountsView counts={completed ?? checked.summary} /></div>}
              {details && details.issues.length > 0 && <details className="mt-2 text-sm"><summary className="cursor-pointer text-primary">{completed && details.issueSource === "预检" ? "预检问题" : "问题明细"}（{details.issues.length}）</summary><ul className="mt-2 space-y-1 text-on-surface-variant">{details.issues.slice(0, 100).map((issue, i) => <li key={i} className="break-words">{issue.sheet} · 第 {issue.rowNo} 行 · {issueLabels[issue.kind]}：{issue.reason}</li>)}</ul>{details.issues.length > 100 && <p className="mt-2 text-xs text-on-surface-variant">显示前 100 条，完整明细可导出。</p>}</details>}
            </div>;
          })}
          {!preview && files.length > 0 && !busy && phase === "idle" && <Button type="button" variant="outline" onClick={() => void runPreview(files)}>重新预检</Button>}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline" disabled={busy}>{result || phase === "uncertain" ? "关闭" : "取消"}</Button></DialogClose>
          {!result && phase !== "uncertain" && <Button type="button" onClick={confirmImport} disabled={!canImport}>{phase === "importing" ? "导入中…" : preview ? `确认导入 ${preview.summary.importable} 题` : "确认导入"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CountsView({ counts }: { counts: Pick<Counts, "duplicates" | "fileDups" | "conflicts" | "invalid"> & Partial<Pick<Counts, "importable">> & { created?: number } }) {
  const items: [string, number | undefined][] = [["新增", counts.created], ["可导入", counts.importable], ["库内重复", counts.duplicates], ["批次重复", counts.fileDups], ["答案冲突", counts.conflicts], ["异常", counts.invalid]];
  return <>{items.filter(([, value]) => value !== undefined).map(([label, value]) => <span key={label} className="rounded-full bg-surface-container px-2.5 py-1 text-xs text-on-surface-variant">{label} {value}</span>)}</>;
}
