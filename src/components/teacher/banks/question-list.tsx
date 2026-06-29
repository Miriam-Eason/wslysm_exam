"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  QuestionFormDialog,
  type EditableQuestion,
} from "@/components/teacher/banks/question-form-dialog";
import {
  QUESTION_TYPES,
  DIFFICULTIES,
  QUESTION_TYPE_LABELS,
  DIFFICULTY_LABELS,
  answerSummary,
  type QType,
  type Diff,
} from "@/lib/question";

const DIFF_VARIANT: Record<Diff, "success" | "warning" | "danger"> = {
  EASY: "success",
  MEDIUM: "warning",
  HARD: "danger",
};

export function QuestionList({
  bankId,
  questions,
  filterType,
  filterDifficulty,
}: {
  bankId: number;
  questions: EditableQuestion[];
  filterType: string;
  filterDifficulty: string;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EditableQuestion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EditableQuestion | null>(null);
  const [busy, setBusy] = useState(false);

  function navigate(type: string, difficulty: string) {
    const sp = new URLSearchParams();
    if (type) sp.set("type", type);
    if (difficulty) sp.set("difficulty", difficulty);
    const qs = sp.toString();
    router.push(`/teacher/banks/${bankId}${qs ? `?${qs}` : ""}`);
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(q: EditableQuestion) {
    setEditing(q);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/questions/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "删除失败");
      toast.success("题目已删除");
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  const selectCls =
    "h-9 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15";

  return (
    <div className="flex flex-col gap-4">
      {/* 工具栏：过滤 + 新建 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => navigate(e.target.value, filterDifficulty)}
            className={selectCls}
            aria-label="按题型过滤"
          >
            <option value="">全部题型</option>
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {QUESTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <select
            value={filterDifficulty}
            onChange={(e) => navigate(filterType, e.target.value)}
            className={selectCls}
            aria-label="按难度过滤"
          >
            <option value="">全部难度</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABELS[d]}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          新建题目
        </Button>
      </div>

      {questions.length === 0 ? (
        <Card className="px-6 py-14 text-center text-sm text-on-surface-variant">
          {filterType || filterDifficulty ? "没有符合筛选条件的题目" : "题库还没有题目，点击「新建题目」开始添加"}
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {questions.map((q) => (
            <Card key={q.id} className="flex items-start justify-between gap-4 p-5">
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="primary">{QUESTION_TYPE_LABELS[q.type]}</Badge>
                  <Badge variant={DIFF_VARIANT[q.difficulty]}>{DIFFICULTY_LABELS[q.difficulty]}</Badge>
                </div>
                <p className="font-medium text-on-surface">{q.stem}</p>

                {(q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") && q.options && (
                  <div className="flex flex-col gap-1">
                    {q.options.map((o) => {
                      const correct = (q.answer as string[]).includes(o.key);
                      return (
                        <span
                          key={o.key}
                          className={`flex items-center gap-1.5 text-sm ${
                            correct ? "font-medium text-success" : "text-on-surface-variant"
                          }`}
                        >
                          <span className="inline-flex w-4">{correct ? <Check className="size-4" /> : null}</span>
                          {o.key}. {o.text}
                        </span>
                      );
                    })}
                  </div>
                )}

                {(q.type === "TRUE_FALSE" || q.type === "FILL_BLANK") && (
                  <p className="text-sm text-on-surface-variant">
                    正确答案：
                    <span className="font-medium text-success">
                      {answerSummary(q.type, q.options, q.answer)}
                    </span>
                  </p>
                )}

                {q.analysis && (
                  <p className="text-xs text-on-surface-variant">解析：{q.analysis}</p>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="shrink-0 rounded-lg p-1.5 text-on-surface-variant outline-none transition hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-label="题目操作"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => openEdit(q)}>
                    <Pencil className="size-4" />
                    编辑
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(q)}>
                    <Trash2 className="size-4" />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Card>
          ))}
        </div>
      )}

      <QuestionFormDialog bankId={bankId} question={editing} open={formOpen} onOpenChange={setFormOpen} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除题目？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后不可恢复；已组卷的试卷快照不受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={busy}
            >
              {busy ? "删除中…" : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
