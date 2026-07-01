"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, FileUp, CheckCircle2, AlertTriangle, XCircle, Info, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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

type ClassOption = { id: number; name: string };
type RawRow = { rowNo: number; studentNo: string; name: string };
type Preview = {
  importable: (RawRow & { kind: string })[];
  skipped: (RawRow & { reason: string })[];
  alreadyInClass: RawRow[];
  nameConflicts: (RawRow & { existingName: string })[];
  fileDupRows: (RawRow & { firstRow: number })[];
  invalid: (RawRow & { reason: string })[];
  truncated: boolean;
  summary: {
    total: number;
    importable: number;
    skipped: number;
    alreadyInClass: number;
    nameConflicts: number;
    fileDup: number;
    invalid: number;
  };
};

export function ImportStudentsDialog({ classes }: { classes: ClassOption[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [phase, setPhase] = useState<"idle" | "previewing" | "importing">("idle");
  const [dragging, setDragging] = useState(false);

  function reset() {
    setClassId("");
    setFile(null);
    setPreview(null);
    setPhase("idle");
    setDragging(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function runPreview(f: File, cid: string) {
    setPhase("previewing");
    setPreview(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("classId", cid);
      const res = await fetch("/api/admin/students/import/preview", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "预检失败");
      setPreview(json.data as Preview);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "预检失败");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setPhase((p) => (p === "previewing" ? "idle" : p));
    }
  }

  function handleFile(f: File) {
    if (!classId) {
      toast.error("请先选择目标班级");
      return;
    }
    if (!f.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("请上传 .xlsx 格式的 Excel 文件");
      return;
    }
    setFile(f);
    runPreview(f, classId);
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
    if (!file || !classId) return;
    setPhase("importing");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("classId", classId);
      const res = await fetch("/api/admin/students/import", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "导入失败");
      const d = json.data;
      toast.success(`导入完成：新增 ${d.createdStudents} 人 · 加入班级 ${d.enrolled} 人`, {
        description:
          d.skipped || d.nameConflicts || d.invalid
            ? `跳过 ${d.skipped} · 姓名冲突 ${d.nameConflicts} · 异常 ${d.invalid}`
            : undefined,
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
          导入学生
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>批量导入学生</DialogTitle>
          <DialogDescription>
            选择目标班级后上传 .xlsx 文件（仅学号、姓名两列）。系统会先预检，确认无误后再导入。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="import-classId">目标班级</Label>
          <div className="flex items-center gap-2">
            <Select
              id="import-classId"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              disabled={phase !== "idle" || !!preview}
              className="flex-1"
            >
              <option value="">请选择班级</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Button asChild variant="outline" size="sm">
              <a href="/api/students/template">
                <Download className="size-4" />
                模板
              </a>
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => classId && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!dragging) setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={onDrop}
          disabled={!classId}
          className={`flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition disabled:cursor-not-allowed disabled:opacity-50 ${
            dragging
              ? "border-primary bg-primary-container/50 ring-4 ring-primary/15"
              : "border-outline-variant bg-surface-container-low/50 hover:border-primary hover:bg-primary-container/30"
          }`}
        >
          <FileUp className={`size-7 transition-transform ${dragging ? "scale-110 text-primary" : "text-primary"}`} />
          <span className="text-sm font-medium text-on-surface">
            {dragging ? "松开以导入" : file ? file.name : classId ? "点击选择，或拖拽 .xlsx 文件到此处" : "请先选择目标班级"}
          </span>
          <span className="text-xs text-on-surface-variant">
            {phase === "previewing" ? "正在预检…" : "支持模板导出的 Excel 文件，上限 2MB"}
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={onPick}
        />

        {preview && (
          <div className="flex max-h-[38vh] flex-col gap-3 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              <Chip icon={CheckCircle2} tone="success" label="可导入" n={preview.summary.importable} />
              <Chip icon={Info} tone="muted" label="已在本班" n={preview.summary.alreadyInClass} />
              <Chip icon={AlertTriangle} tone="warning" label="已属别班" n={preview.summary.skipped} />
              <Chip icon={AlertTriangle} tone="warning" label="姓名冲突" n={preview.summary.nameConflicts} />
              <Chip icon={AlertTriangle} tone="warning" label="文件内重复" n={preview.summary.fileDup} />
              <Chip icon={XCircle} tone="danger" label="格式异常" n={preview.summary.invalid} />
            </div>

            {preview.truncated && (
              <p className="rounded-lg bg-warning-container px-3 py-2 text-xs text-on-surface">
                文件行数过多，仅预检前 1000 行。
              </p>
            )}

            <Section
              title="格式异常"
              tone="danger"
              rows={preview.invalid.map((r) => ({ rowNo: r.rowNo, text: `${r.studentNo || "(空)"} ${r.name || ""} — ${r.reason}` }))}
            />
            <Section
              title="姓名冲突（不会自动覆盖）"
              tone="warning"
              rows={preview.nameConflicts.map((r) => ({ rowNo: r.rowNo, text: `${r.studentNo} 文件「${r.name}」≠ 系统「${r.existingName}」` }))}
            />
            <Section
              title="已属别班（跳过）"
              tone="warning"
              rows={preview.skipped.map((r) => ({ rowNo: r.rowNo, text: `${r.studentNo} ${r.name} — ${r.reason}` }))}
            />
            <Section
              title="文件内重复（跳过）"
              tone="warning"
              rows={preview.fileDupRows.map((r) => ({ rowNo: r.rowNo, text: `${r.studentNo} 与第 ${r.firstRow} 行重复` }))}
            />
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              取消
            </Button>
          </DialogClose>
          <Button onClick={confirmImport} disabled={!canImport}>
            {phase === "importing" ? "导入中…" : preview ? `确认导入 ${preview.summary.importable} 人` : "确认导入"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Chip({
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
  const tones = {
    success: "bg-success-container text-success",
    warning: "bg-warning-container text-on-surface",
    danger: "bg-danger-container text-danger",
    muted: "bg-surface-container text-on-surface-variant",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tones[tone]}`}>
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
  const bar = {
    warning: "border-warning",
    danger: "border-danger",
    muted: "border-outline-variant",
  }[tone];
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
