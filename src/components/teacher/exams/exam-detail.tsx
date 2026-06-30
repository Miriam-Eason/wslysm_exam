"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pencil, Trash2, X, ArrowLeft, Clock, Users,
  RotateCcw, Shuffle, ChevronDown, ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  SINGLE_CHOICE: "单选",
  MULTIPLE_CHOICE: "多选",
  TRUE_FALSE: "判断",
  FILL_BLANK: "填空",
};

type ClassInfo = { id: number; name: string };

type Question = {
  id: number;
  order: number;
  score: number;
  type: string;
  stem: string;
  options: unknown;
  answer: unknown;
  analysis: string | null;
  sourceId: number | null;
};

type Exam = {
  id: number;
  name: string;
  type: "EXAM" | "PRACTICE";
  allowRepeat: boolean;
  repeatLimit: number | null;
  deadline: string | null;
  timeLimitSec: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  attemptCount: number;
  classes: ClassInfo[];
  questions: Question[];
  createdAt: string;
};

type EditForm = {
  name: string;
  type: "EXAM" | "PRACTICE";
  allowRepeat: boolean;
  repeatLimit: string;
  deadlineDate: string;
  deadlineTime: string;
  timeLimitMin: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
};

export function ExamDetail({ exam: initial }: { exam: Exam }) {
  const router = useRouter();
  const [exam, setExam] = useState(initial);
  const [questions, setQuestions] = useState(initial.questions);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteExamOpen, setDeleteExamOpen] = useState(false);
  const [deleteQTarget, setDeleteQTarget] = useState<Question | null>(null);
  const [busy, setBusy] = useState(false);

  const initDeadline = initial.deadline ? new Date(initial.deadline).toISOString().slice(0, 16) : "";
  const [editForm, setEditForm] = useState<EditForm>({
    name: initial.name,
    type: initial.type,
    allowRepeat: initial.allowRepeat,
    repeatLimit: initial.repeatLimit?.toString() ?? "",
    deadlineDate: initDeadline.slice(0, 10),
    deadlineTime: initDeadline.slice(11, 16),
    timeLimitMin: initial.timeLimitSec ? Math.floor(initial.timeLimitSec / 60).toString() : "",
    shuffleQuestions: initial.shuffleQuestions,
    shuffleOptions: initial.shuffleOptions,
  });

  function setEF<K extends keyof EditForm>(k: K, v: EditForm[K]) {
    setEditForm((f) => ({ ...f, [k]: v }));
  }

  function deadlineValue() {
    if (!editForm.deadlineDate) return null;
    return `${editForm.deadlineDate}T${editForm.deadlineTime || "23:59"}`;
  }

  async function saveEdit() {
    setBusy(true);
    try {
      const dl = deadlineValue();
      const payload = {
        name: editForm.name.trim(),
        type: editForm.type,
        allowRepeat: editForm.allowRepeat,
        repeatLimit: editForm.allowRepeat && editForm.repeatLimit ? Number(editForm.repeatLimit) : null,
        deadline: dl || null,
        timeLimitSec: editForm.timeLimitMin ? Number(editForm.timeLimitMin) * 60 : null,
        shuffleQuestions: editForm.shuffleQuestions,
        shuffleOptions: editForm.shuffleOptions,
      };
      const res = await fetch(`/api/exams/${exam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "保存失败");
      toast.success("已保存");
      setExam((e) => ({
        ...e,
        ...payload,
        deadline: payload.deadline ? new Date(payload.deadline).toISOString() : null,
      }));
      setEditOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function deleteExam() {
    setBusy(true);
    try {
      const res = await fetch(`/api/exams/${exam.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "删除失败");
      toast.success(json.data.softDeleted ? "已下架（有作答记录）" : "已删除");
      router.push("/teacher/exams");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
      setBusy(false);
    }
  }

  async function deleteQuestion(q: Question) {
    setBusy(true);
    try {
      const res = await fetch(`/api/exams/${exam.id}/questions/${q.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "删除失败");
      toast.success(`已从试卷移除第 ${q.order} 题`);
      setDeleteQTarget(null);
      setQuestions((prev) => prev.filter((x) => x.id !== q.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  const totalScore = questions.reduce((s, q) => s + q.score, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/teacher/exams")}>
          <ArrowLeft className="size-4" />
          返回列表
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            编辑信息
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteExamOpen(true)}>
            <Trash2 className="size-4" />
            删除考试
          </Button>
        </div>
      </div>

      {/* 考试信息卡 */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-on-surface">{exam.name}</h1>
          <Badge variant={exam.type === "EXAM" ? "danger" : "primary"}>
            {exam.type === "EXAM" ? "考试" : "练习"}
          </Badge>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-on-surface-variant">
          <span>{questions.length} 道题 · 共 {totalScore} 分</span>
          <span>{exam.attemptCount} 次作答</span>
          {exam.timeLimitSec && (
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {Math.floor(exam.timeLimitSec / 60)} 分钟
            </span>
          )}
          {exam.deadline && (
            <span>截止 {new Date(exam.deadline).toLocaleString("zh-CN")}</span>
          )}
          {exam.allowRepeat && (
            <span className="flex items-center gap-1">
              <RotateCcw className="size-3.5" />
              可重做{exam.repeatLimit ? `（最多 ${exam.repeatLimit} 次）` : "（不限次数）"}
            </span>
          )}
          {(exam.shuffleQuestions || exam.shuffleOptions) && (
            <span className="flex items-center gap-1">
              <Shuffle className="size-3.5" />
              {[exam.shuffleQuestions && "随机题序", exam.shuffleOptions && "随机选项"].filter(Boolean).join("、")}
            </span>
          )}
          {exam.classes.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {exam.classes.map((c) => c.name).join("、")}
            </span>
          )}
        </div>
      </div>

      {/* 试卷详情（可折叠） */}
      <div className="flex flex-col gap-0 overflow-hidden rounded-xl border border-outline-variant">
        {/* 折叠头部 */}
        <button
          type="button"
          onClick={() => setQuestionsOpen((o) => !o)}
          className={cn(
            "flex w-full items-center gap-3 bg-surface-container-lowest px-5 py-4 text-left transition-colors hover:bg-surface-container-low",
            questionsOpen && "border-b border-outline-variant",
          )}
        >
          <ListOrdered className="size-4 shrink-0 text-on-surface-variant" />
          <span className="flex-1 text-sm font-medium text-on-surface">试卷详情</span>
          <span className="text-xs text-on-surface-variant">
            {questions.length} 道题 · {totalScore} 分
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-on-surface-variant transition-transform duration-200",
              questionsOpen && "rotate-180",
            )}
          />
        </button>

        {/* 题目列表 */}
        {questionsOpen && (
          <div className="flex flex-col gap-0 bg-surface-container-lowest">
            {questions.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-on-surface-variant">
                所有题目已被移除。
              </div>
            ) : (
              questions.map((q, idx) => (
                <div
                  key={q.id}
                  className={cn(
                    "flex gap-4 px-5 py-4",
                    idx !== questions.length - 1 && "border-b border-outline-variant/50",
                  )}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-container text-xs font-semibold text-on-surface-variant">
                    {q.order}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          q.type === "SINGLE_CHOICE" ? "primary"
                            : q.type === "MULTIPLE_CHOICE" ? "warning"
                            : q.type === "TRUE_FALSE" ? "success"
                            : "neutral"
                        }
                      >
                        {TYPE_LABEL[q.type] ?? q.type}
                      </Badge>
                      <span className="text-xs text-on-surface-variant">{q.score} 分</span>
                    </div>
                    <p className="mt-1.5 text-sm text-on-surface line-clamp-3">{q.stem}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeleteQTarget(q)}
                    title="从试卷移除"
                    className="shrink-0 rounded-lg p-1.5 text-on-surface-variant/60 transition hover:bg-danger-container hover:text-danger"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 编辑考试信息 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <form
            onSubmit={(e) => { e.preventDefault(); saveEdit(); }}
            className="flex flex-col gap-5"
          >
            <DialogHeader>
              <DialogTitle>编辑考试信息</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-name">名称</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEF("name", e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-type">类型</Label>
              <Select
                id="edit-type"
                value={editForm.type}
                onChange={(e) => setEF("type", e.target.value as "EXAM" | "PRACTICE")}
              >
                <option value="PRACTICE">练习</option>
                <option value="EXAM">考试</option>
              </Select>
            </div>

            {/* 截止时间 — 拆分日期+时间 */}
            <div className="flex flex-col gap-2">
              <Label>截止时间（可选）</Label>
              <div className="flex items-center gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-xs text-on-surface-variant">日期</span>
                  <Input
                    type="date"
                    value={editForm.deadlineDate}
                    onChange={(e) => setEF("deadlineDate", e.target.value)}
                  />
                </div>
                <div className="flex w-[110px] flex-col gap-1">
                  <span className="text-xs text-on-surface-variant">时间</span>
                  <Input
                    type="time"
                    value={editForm.deadlineTime}
                    disabled={!editForm.deadlineDate}
                    onChange={(e) => setEF("deadlineTime", e.target.value)}
                  />
                </div>
                {editForm.deadlineDate && (
                  <button
                    type="button"
                    onClick={() => { setEF("deadlineDate", ""); setEF("deadlineTime", ""); }}
                    className="mt-5 rounded-lg p-2 text-on-surface-variant transition hover:bg-surface-container-low"
                    title="清除截止时间"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              {editForm.deadlineDate && (
                <p className="text-xs text-primary">
                  {new Date(`${editForm.deadlineDate}T${editForm.deadlineTime || "23:59"}`).toLocaleString("zh-CN", {
                    year: "numeric", month: "long", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              )}
            </div>

            {editForm.type === "EXAM" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-timelimit">答题时长限制（分钟，可选）</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="edit-timelimit"
                    type="number"
                    min="1"
                    step="1"
                    value={editForm.timeLimitMin}
                    onChange={(e) => setEF("timeLimitMin", e.target.value)}
                    placeholder="不限"
                    className="max-w-[120px]"
                  />
                  <span className="text-sm text-on-surface-variant">分钟</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <Checkbox
                  checked={editForm.allowRepeat}
                  onChange={(e) => setEF("allowRepeat", e.target.checked)}
                />
                允许重复练习
              </label>
              {editForm.allowRepeat && (
                <div className="ml-7">
                  <Label htmlFor="edit-repeat">重做次数上限（空=不限）</Label>
                  <Input
                    id="edit-repeat"
                    type="number"
                    min="1"
                    value={editForm.repeatLimit}
                    onChange={(e) => setEF("repeatLimit", e.target.value)}
                    placeholder="不限"
                    className="mt-2 max-w-[120px]"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <Checkbox
                  checked={editForm.shuffleQuestions}
                  onChange={(e) => setEF("shuffleQuestions", e.target.checked)}
                />
                随机题目顺序
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <Checkbox
                  checked={editForm.shuffleOptions}
                  onChange={(e) => setEF("shuffleOptions", e.target.checked)}
                />
                随机选项顺序（选择题）
              </label>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">取消</Button>
              </DialogClose>
              <Button type="submit" disabled={busy || !editForm.name.trim()}>
                {busy ? "保存中…" : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除考试确认 */}
      <AlertDialog open={deleteExamOpen} onOpenChange={setDeleteExamOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除考试？</AlertDialogTitle>
            <AlertDialogDescription>
              {exam.attemptCount > 0 ? (
                <>
                  该考试已有 {exam.attemptCount} 条作答记录，将执行
                  <span className="font-medium text-on-surface">软删除（下架）</span>，不影响历史成绩。
                </>
              ) : (
                <>将删除「{exam.name}」及其 {questions.length} 道题目快照。此操作不可撤销。</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); deleteExam(); }}
              disabled={busy}
            >
              {busy ? "处理中…" : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除题目确认 */}
      <AlertDialog open={!!deleteQTarget} onOpenChange={(o) => !o && setDeleteQTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>从试卷移除该题？</AlertDialogTitle>
            <AlertDialogDescription>
              将从试卷快照中移除第 {deleteQTarget?.order} 题，不影响原题库。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); deleteQTarget && deleteQuestion(deleteQTarget); }}
              disabled={busy}
            >
              {busy ? "移除中…" : "确认移除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
