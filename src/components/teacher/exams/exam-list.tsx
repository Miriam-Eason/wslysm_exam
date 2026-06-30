"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, Trash2, ArrowRight, FileText,
  Clock, Users, MoreHorizontal, CalendarDays, AlertTriangle,
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
};

export function ExamList({ exams: initial }: { exams: Exam[] }) {
  const router = useRouter();
  const [exams, setExams] = useState(initial);
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/exams/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "删除失败");

      if (json.data.softDeleted) {
        toast.success(`已下架「${deleteTarget.name}」（有作答记录，已软删除）`);
      } else {
        toast.success(`已删除「${deleteTarget.name}」`);
      }
      setDeleteTarget(null);
      setExams((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  if (exams.length === 0) {
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
      </>
    );
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

      <div className="flex flex-col gap-3">
        {exams.map((exam) => {
          const isOverdue = exam.deadline ? new Date(exam.deadline) < new Date() : false;

          return (
            <Card
              key={exam.id}
              className={cn(
                "flex items-start gap-4 p-5 transition-colors",
                isOverdue && "border-danger/30 bg-danger-container/10",
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
                  {isOverdue && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-danger px-2.5 py-0.5 text-xs font-semibold text-white">
                      <AlertTriangle className="size-3" />
                      已截止
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
                  {/* 创建时间胶囊 */}
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
                    <span className={cn(isOverdue && "text-danger font-medium")}>
                      截止 {new Date(exam.deadline).toLocaleDateString("zh-CN")}
                    </span>
                  )}
                  {exam.classes.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />
                      {exam.classes.map((c) => c.name).join("、")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/teacher/exams/${exam.id}`}>
                    查看试卷
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
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
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(exam)}>
                      <Trash2 className="size-4" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          );
        })}
      </div>

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
