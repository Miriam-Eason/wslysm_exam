"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, Trash2, ArrowRight, FileText,
  Clock, Users, MoreHorizontal, CalendarDays,
  AlertTriangle, CheckCircle2, Archive, ChevronDown,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ClassInfo = { id: number; name: string };

type Exam = {
  id: number;
  name: string;
  type: "EXAM" | "PRACTICE";
  allowRepeat: boolean;
  repeatLimit: number | null;
  deadline: string | null;
  timeLimitSec: number | null;
  questionCount: number;
  attemptCount: number;
  classes: ClassInfo[];
  createdAt: string;
  deletedAt: string | null;
};

function examStatus(exam: Exam) {
  if (exam.deletedAt) return "archived";
  if (exam.deadline && new Date(exam.deadline) < new Date()) return "expired";
  return "active";
}

function ExamCard({
  exam,
  onDelete,
}: {
  exam: Exam;
  onDelete: (e: Exam) => void;
}) {
  const status = examStatus(exam);
  const isArchived = status === "archived";

  return (
    <Card
      className={cn(
        "flex items-start gap-4 p-5 transition-colors",
        status === "expired" && "border-danger/30 bg-danger-container/10",
        isArchived && "opacity-70",
      )}
    >
      <div className="flex-1 min-w-0">
        {/* 标题行 */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/teacher/exams/${exam.id}`}
            className="text-base font-semibold text-on-surface hover:text-primary"
          >
            {exam.name}
          </Link>
          <Badge variant={exam.type === "EXAM" ? "danger" : "primary"}>
            {exam.type === "EXAM" ? "考试" : "练习"}
          </Badge>

          {status === "active" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-container px-2.5 py-0.5 text-xs font-semibold text-success">
              <CheckCircle2 className="size-3" />
              进行中
            </span>
          )}
          {status === "expired" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger px-2.5 py-0.5 text-xs font-semibold text-white">
              <AlertTriangle className="size-3" />
              已截止
            </span>
          )}
          {isArchived && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant">
              <Archive className="size-3" />
              已下架
            </span>
          )}

          {exam.allowRepeat && (
            <Badge variant="neutral">
              可重做{exam.repeatLimit ? `×${exam.repeatLimit}` : ""}
            </Badge>
          )}
        </div>

        {/* 元数据行 */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-0.5 font-medium">
            <CalendarDays className="size-3" />
            {new Date(exam.createdAt).toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </span>
          <span className="text-outline-variant">·</span>
          <span>{exam.questionCount} 道题</span>
          <span>{exam.attemptCount} 次作答</span>
          {exam.timeLimitSec && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {Math.floor(exam.timeLimitSec / 60)} 分钟
            </span>
          )}
          {exam.deadline && (
            <span className={cn(status === "expired" && "text-danger font-medium")}>
              截止 {new Date(exam.deadline).toLocaleDateString("zh-CN")}
            </span>
          )}
          {exam.classes.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {exam.classes.map((c) => c.name).join("、")}
            </span>
          )}
          {isArchived && exam.deletedAt && (
            <span className="text-on-surface-variant/60">
              已下架于 {new Date(exam.deletedAt).toLocaleDateString("zh-CN")}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {exam.attemptCount > 0 && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/teacher/exams/${exam.id}/stats`}>
              <BarChart3 className="size-4" />
              统计
            </Link>
          </Button>
        )}
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/teacher/exams/${exam.id}`}>
            {isArchived ? "查看历史" : "查看试卷"}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        {!isArchived && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="rounded-lg p-1.5 text-on-surface-variant outline-none transition hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="更多操作"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(exam)}>
                <Trash2 className="size-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </Card>
  );
}

export function ExamList({
  exams: initial,
  archivedExams: initialArchived = [],
}: {
  exams: Exam[];
  archivedExams?: Exam[];
}) {
  const router = useRouter();
  const [exams, setExams] = useState(initial);
  const [archivedExams, setArchivedExams] = useState(initialArchived);
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);
  const [busy, setBusy] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/exams/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "删除失败");

      if (json.data.softDeleted) {
        toast.success(`已下架「${deleteTarget.name}」（有作答记录，已软删除）`);
        // 从活动列表移到已下架列表
        const now = new Date().toISOString();
        setExams((prev) => prev.filter((e) => e.id !== deleteTarget.id));
        setArchivedExams((prev) => [{ ...deleteTarget, deletedAt: now }, ...prev]);
      } else {
        toast.success(`已删除「${deleteTarget.name}」`);
        setExams((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      }
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/teacher/exams/new">
            <Plus className="size-4" />
            新建考试/练习
          </Link>
        </Button>
      </div>

      {exams.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-surface-container-high text-on-surface-variant">
            <FileText className="size-7" />
          </div>
          <h3 className="text-lg font-semibold text-on-surface">还没有考试或练习</h3>
          <p className="max-w-xs text-sm text-on-surface-variant">
            通过"组卷向导"从题库中选择题目生成试卷快照。
          </p>
          <Button asChild variant="outline" className="mt-2">
            <Link href="/teacher/exams/new">
              <Plus className="size-4" />
              新建考试/练习
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {exams.map((exam) => (
            <ExamCard key={exam.id} exam={exam} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {/* 已下架（软删除）考试折叠区 */}
      {archivedExams.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-xl border border-outline-variant">
          <button
            type="button"
            onClick={() => setArchivedOpen((o) => !o)}
            className={cn(
              "flex w-full items-center gap-3 bg-surface-container-lowest px-5 py-4 text-left transition-colors hover:bg-surface-container-low",
              archivedOpen && "border-b border-outline-variant",
            )}
          >
            <Archive className="size-4 shrink-0 text-on-surface-variant" />
            <span className="flex-1 text-sm font-medium text-on-surface-variant">
              已下架的考试/练习
            </span>
            <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant">
              {archivedExams.length}
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-on-surface-variant transition-transform duration-200",
                archivedOpen && "rotate-180",
              )}
            />
          </button>
          {archivedOpen && (
            <div className="flex flex-col gap-3 bg-surface-container-lowest p-4">
              <p className="text-xs text-on-surface-variant">
                以下考试已下架（软删除），学生无法访问，历史作答记录完整保留。
              </p>
              {archivedExams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} onDelete={setDeleteTarget} />
              ))}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除考试？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.attemptCount && deleteTarget.attemptCount > 0 ? (
                <>
                  「{deleteTarget?.name}」已有 {deleteTarget.attemptCount} 条作答记录，将执行
                  <span className="font-medium text-on-surface">软删除（下架）</span>，不影响历史成绩。
                </>
              ) : (
                <>将删除「{deleteTarget?.name}」及其所有题目快照。此操作不可撤销。</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={busy}
            >
              {busy ? "处理中…" : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
