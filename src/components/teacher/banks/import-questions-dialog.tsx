"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, FileUp, CheckCircle2, AlertTriangle, XCircle, Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

type InvalidRow = { rowNo: number; sheet: string; stemPreview: string; reason: string };
type DupRow = { rowNo: number; sheet: string; contentHash: string };
type FileDupRow = { rowNo: number; sheet: string; firstRow: number };
type ImportableRow = { rowNo: number; sheet: string; contentHash: string };

type Preview = {
  importable: ImportableRow[];
  duplicates: DupRow[];
  fileDups: FileDupRow[];
  invalid: InvalidRow[];
  truncated: boolean;
  summary: {
    total: number;
    importable: number;
    duplicates: number;
    fileDups: number;
    invalid: number;
  };
};

export function ImportQuestionsDialog({ bankId }: { bankId: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [phase, setPhase] = useState<"idle" | "previewing" | "importing">("idle");
  const [dragging, setDragging] = useState(false);

  function reset() {
    setFile(null);
    setPreview(null);
    setPhase("idle");
    setDragging(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function runPreview(f: File) {
    setPhase("previewing");
    setPreview(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch(`/api/banks/${bankId}/questions/import/preview`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "预检失败");
      setPreview(json.data as Preview);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "预检失败");
      reset();
    } finally {
      setPhase((p) => (p === "previewing" ? "idle" : p));
    }
  }

  function handleFile(f: File) {
    if (!f.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("请上传 .xlsx 格式的 Excel 文件");
      return;
    }
    setFile(f);
    runPreview(f);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (phase === "previewing" || phase === "importing") return;
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  async function confirmImport() {
    if (!file) return;
    setPhase("importing");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/banks/${bankId}/questions/import/confirm`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "导入失败");
      const d = json.data;
      toast.success(`导入完成：新增 ${d.created} 题`, {
        description: d.skipped > 0 ? `已跳过 ${d.skipped} 题（重复）` : undefined,
      });
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "导入失败");
      setPhase("idle");
    }
  }

  const canImport = !!preview && preview.summary.importable > 0 && phase !== "importing";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="size-4" />
          批量导入
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>批量导入题目</DialogTitle>
          <DialogDescription>
            上传使用「下载模板」得到的 .xlsx 文件（四个 Sheet 对应四种题型）。系统先预检，确认后再导入。
          </DialogDescription>
        </DialogHeader>

        {/* 上传区 */}
        <button
          type="button"
          onClick={() => {
            if (phase === "idle") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!dragging) setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={onDrop}
          className={`flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition ${
            dragging
              ? "border-primary bg-primary-container/50 ring-4 ring-primary/15"
              : "border-outline-variant bg-surface-container-low/50 hover:border-primary hover:bg-primary-container/30"
          } ${phase === "previewing" ? "cursor-wait opacity-70" : "cursor-pointer"}`}
        >
          {phase === "previewing" ? (
            <RefreshCw className="size-7 animate-spin text-primary" />
          ) : (
            <FileUp className={`size-7 transition-transform ${dragging ? "scale-110 text-primary" : "text-primary"}`} />
          )}
          <span className="text-sm font-medium text-on-surface">
            {dragging
              ? "松开以导入"
              : file
                ? file.name
                : "点击选择，或拖拽 .xlsx 文件到此处"}
          </span>
          <span className="text-xs text-on-surface-variant">
            {phase === "previewing" ? "正在预检…" : "支持模板导出的 Excel 文件，上限 5MB"}
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={onPick}
        />

        {/* 预检结果 */}
        {preview && (
          <div className="flex max-h-[45vh] flex-col gap-3 overflow-y-auto pr-1">
            {/* 摘要 chips */}
            <div className="flex flex-wrap gap-2">
              <StatChip icon={CheckCircle2} tone="success" label="可导入" n={preview.summary.importable} />
              <StatChip icon={Info} tone="muted" label="已在题库" n={preview.summary.duplicates} />
              <StatChip icon={AlertTriangle} tone="warning" label="文件内重复" n={preview.summary.fileDups} />
              <StatChip icon={XCircle} tone="danger" label="格式异常" n={preview.summary.invalid} />
            </div>

            {preview.truncated && (
              <p className="rounded-lg bg-warning-container px-3 py-2 text-xs text-on-surface">
                文件数据行过多，仅预检前 500 行。
              </p>
            )}

            <Section
              title="格式异常（不会导入）"
              tone="danger"
              rows={preview.invalid.map((r) => ({
                rowNo: r.rowNo,
                text: `[${r.sheet}] ${r.stemPreview} — ${r.reason}`,
              }))}
            />
            <Section
              title="文件内重复（跳过）"
              tone="warning"
              rows={preview.fileDups.map((r) => ({
                rowNo: r.rowNo,
                text: `[${r.sheet}] 与第 ${r.firstRow} 行重复`,
              }))}
            />
            <Section
              title="已在题库中（跳过）"
              tone="muted"
              rows={preview.duplicates.map((r) => ({
                rowNo: r.rowNo,
                text: `[${r.sheet}] 题目已存在（内容哈希相同）`,
              }))}
            />
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              取消
            </Button>
          </DialogClose>
          {preview && preview.summary.importable === 0 && !canImport && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setTimeout(() => inputRef.current?.click(), 50);
              }}
            >
              重新上传
            </Button>
          )}
          <Button onClick={confirmImport} disabled={!canImport}>
            {phase === "importing"
              ? "导入中…"
              : preview
                ? `确认导入 ${preview.summary.importable} 题`
                : "确认导入"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatChip({
  icon: Icon,
  tone,
  label,
  n,
}: {
  icon: React.ElementType;
  tone: "success" | "warning" | "danger" | "muted";
  label: string;
  n: number;
}) {
  const cls = {
    success: "bg-success-container text-success",
    warning: "bg-warning-container text-on-surface",
    danger: "bg-danger-container text-danger",
    muted: "bg-surface-container text-on-surface-variant",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
      <Icon className="size-3.5" />
      {label} {n}
    </span>
  );
}

function Section({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: "warning" | "danger" | "muted";
  rows: { rowNo: number; text: string }[];
}) {
  if (rows.length === 0) return null;
  const bar = { warning: "border-warning", danger: "border-danger", muted: "border-outline-variant" }[tone];
  return (
    <div className={`rounded-lg border-l-2 ${bar} bg-surface-container-low px-3 py-2`}>
      <p className="mb-1 text-xs font-semibold text-on-surface">
        {title}（{rows.length}）
      </p>
      <ul className="flex flex-col gap-0.5">
        {rows.map((r, i) => (
          <li key={i} className="text-xs text-on-surface-variant">
            <span className="tabular-nums text-on-surface-variant/70">第 {r.rowNo} 行</span> · {r.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
