"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Users, Target, TrendingUp, Award,
  ChevronRight, X, CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ExamStats as ExamStatsData, QuestionStat, StudentRow } from "@/lib/stats";
import type { StudentAttemptDetail } from "@/lib/stats";

const TYPE_LABEL: Record<string, string> = {
  SINGLE_CHOICE: "单选",
  MULTIPLE_CHOICE: "多选",
  TRUE_FALSE: "判断",
  FILL_BLANK: "填空",
};

function accuracyTone(rate: number) {
  if (rate >= 0.8) return { text: "text-success", bar: "bg-success" };
  if (rate >= 0.6) return { text: "text-warning", bar: "bg-warning" };
  return { text: "text-danger", bar: "bg-danger" };
}

const BUCKET_TONE: Record<string, string> = {
  "0-59": "#ff3b30",
  "60-69": "#ff9500",
  "70-79": "#ffc542",
  "80-89": "#5bc26a",
  "90-100": "#34c759",
};

function fmtScore(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function fmtPct(n: number) {
  return `${Math.round(n * 100)}%`;
}

type ExamMeta = {
  id: number;
  name: string;
  type: "EXAM" | "PRACTICE";
  deadline: string | null;
  isArchived: boolean;
};

export function ExamStats({ exam, stats }: { exam: ExamMeta; stats: ExamStatsData }) {
  const router = useRouter();
  const [drillStudent, setDrillStudent] = useState<StudentRow | null>(null);
  const maxBucket = Math.max(1, ...stats.scoreBuckets.map((b) => b.count));

  const kpis = [
    {
      label: "平均分",
      value: `${fmtScore(stats.avgScore)}`,
      sub: `满分 ${fmtScore(stats.maxScore)}`,
      icon: TrendingUp,
    },
    {
      label: "提交人数",
      value: `${stats.submittedCount}`,
      sub: `共 ${stats.totalStudents} 人`,
      icon: Users,
    },
    {
      label: "及格率",
      value: fmtPct(stats.passRate),
      sub: "≥ 60% 满分",
      icon: Target,
    },
    {
      label: "最高 / 最低分",
      value: `${fmtScore(stats.highScore)} / ${fmtScore(stats.lowScore)}`,
      sub: stats.submittedCount > 0 ? "已提交作答区间" : "暂无作答",
      icon: Award,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/teacher/exams/${exam.id}`)}>
          <ArrowLeft className="size-4" />
          返回试卷
        </Button>
      </div>

      {/* 标题 */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-on-surface">{exam.name}</h1>
        <Badge variant={exam.type === "EXAM" ? "danger" : "primary"}>
          {exam.type === "EXAM" ? "考试" : "练习"}
        </Badge>
        <span className="text-sm text-on-surface-variant">成绩统计</span>
      </div>

      {/* KPI 卡片 */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary-container text-primary">
                  <Icon className="size-4.5" />
                </div>
              </div>
              <p className="mt-4 text-2xl font-bold tracking-tight text-on-surface tabular-nums">
                {k.value}
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">{k.label}</p>
              <p className="mt-0.5 text-xs text-on-surface-variant/70">{k.sub}</p>
            </Card>
          );
        })}
      </section>

      {stats.submittedCount === 0 ? (
        <Card className="p-10 text-center text-sm text-on-surface-variant">
          暂无学生提交作答，统计数据将在首份作答提交后生成。
        </Card>
      ) : (
        <>
          {/* 分数段分布 */}
          <Card className="p-6">
            <h2 className="text-base font-semibold text-on-surface">分数段分布</h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              按满分百分比分段，取每人最近一次已提交作答
            </p>
            <div className="mt-6 flex h-44 items-end gap-4 px-2 sm:gap-8">
              {stats.scoreBuckets.map((b, i) => {
                const pct = (b.count / maxBucket) * 100;
                return (
                  <div key={b.range} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-on-surface">
                      {b.count}
                    </span>
                    <div className="flex h-32 w-full max-w-12 items-end overflow-hidden rounded-t-md bg-surface-container">
                      <div
                        className="w-full rounded-t-md transition-[height] duration-700 ease-out"
                        style={{
                          height: `${b.count > 0 ? Math.max(pct, 6) : 0}%`,
                          background: BUCKET_TONE[b.range],
                          animation: `barGrow 0.7s ease-out ${i * 0.06}s both`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-on-surface-variant">{b.range}</span>
                  </div>
                );
              })}
            </div>
            <style>{`
              @keyframes barGrow {
                from { transform: scaleY(0); transform-origin: bottom; }
                to   { transform: scaleY(1); transform-origin: bottom; }
              }
            `}</style>
          </Card>

          {/* 每题准确率 + 选项选择率 */}
          <Card className="overflow-hidden p-0">
            <div className="p-6 pb-0">
              <h2 className="text-base font-semibold text-on-surface">每题作答情况</h2>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                准确率 = 答对人数 / 已提交人数；选项选择率仅统计选择题
              </p>
            </div>
            <div className="mt-4 flex flex-col">
              {stats.questionStats.map((q) => (
                <QuestionStatRow key={q.examQuestionId} q={q} />
              ))}
            </div>
          </Card>

          {/* 学生成绩列表 */}
          <Card className="overflow-hidden p-0">
            <div className="p-6 pb-4">
              <h2 className="text-base font-semibold text-on-surface">学生成绩</h2>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                按最近一次已提交得分排序，点击「详情」按题下钻；
                共 {stats.totalStudents} 人，已交卷 {stats.submittedCount} 人，未交卷 {stats.totalStudents - stats.submittedCount} 人
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">排名</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>学号</TableHead>
                  <TableHead>班级</TableHead>
                  <TableHead>得分</TableHead>
                  <TableHead>作答次数</TableHead>
                  <TableHead>提交时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.students.map((s, idx) => (
                  <TableRow key={s.studentId} className={cn(!s.submitted && "opacity-60")}>
                    <TableCell className="tabular-nums text-on-surface-variant">
                      {s.submitted ? idx + 1 : "—"}
                    </TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-on-surface-variant">{s.studentNo}</TableCell>
                    <TableCell className="text-on-surface-variant">{s.className ?? "—"}</TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {s.submitted ? (
                        <>
                          {fmtScore(s.score ?? 0)}
                          <span className="text-on-surface-variant"> / {fmtScore(stats.maxScore)}</span>
                        </>
                      ) : (
                        <Badge variant="neutral">未交卷</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-on-surface-variant">{s.attemptCount}</TableCell>
                    <TableCell className="text-on-surface-variant">
                      {s.submittedAt ? new Date(s.submittedAt).toLocaleString("zh-CN") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.submitted ? (
                        <button
                          onClick={() => setDrillStudent(s)}
                          className="inline-flex items-center gap-0.5 text-sm font-medium text-primary hover:underline"
                        >
                          详情
                          <ChevronRight className="size-3.5" />
                        </button>
                      ) : (
                        <span className="text-sm text-on-surface-variant">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <StudentDrillDialog
        examId={exam.id}
        maxScore={stats.maxScore}
        student={drillStudent}
        onClose={() => setDrillStudent(null)}
      />
    </div>
  );
}

function QuestionStatRow({ q }: { q: QuestionStat }) {
  const tone = accuracyTone(q.accuracy);
  const correctKeys = new Set(Array.isArray(q.answer) ? (q.answer as string[]) : []);

  return (
    <div className="border-t border-outline-variant/50 px-6 py-4 first:border-t-0">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-container text-xs font-semibold text-on-surface-variant">
          {q.order}
        </div>
        <div className="min-w-0 flex-1">
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
          <p className="mt-1.5 text-sm text-on-surface line-clamp-2">{q.stem}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={cn("text-sm font-bold tabular-nums", tone.text)}>
            {fmtPct(q.accuracy)}
          </span>
          <span className="text-xs text-on-surface-variant">
            {q.correctCount}/{q.totalCount} 人对
          </span>
        </div>
      </div>

      {/* 准确率条 */}
      <div className="mt-3 ml-9 h-1.5 overflow-hidden rounded-full bg-surface-container">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", tone.bar)}
          style={{ width: `${Math.max(q.accuracy * 100, q.totalCount > 0 ? 2 : 0)}%` }}
        />
      </div>

      {/* 选项选择率 */}
      {q.optionRates && q.optionRates.length > 0 && (
        <div className="mt-3 ml-9 flex flex-col gap-1.5">
          {q.optionRates.map((opt) => {
            const isCorrect = correctKeys.has(opt.key);
            return (
              <div key={opt.key} className="flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-bold",
                    isCorrect ? "bg-success text-white" : "bg-surface-container text-on-surface-variant",
                  )}
                >
                  {opt.key}
                </span>
                <span className="w-0 flex-1 truncate text-on-surface-variant" title={opt.text}>
                  {opt.text}
                </span>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-container sm:w-40">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-700 ease-out",
                      isCorrect ? "bg-success" : "bg-outline",
                    )}
                    style={{ width: `${Math.max(opt.rate * 100, opt.count > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right tabular-nums text-on-surface-variant">
                  {fmtPct(opt.rate)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StudentDrillDialog({
  examId,
  maxScore,
  student,
  onClose,
}: {
  examId: number;
  maxScore: number;
  student: StudentRow | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<StudentAttemptDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!student) return;
    const studentId = student.studentId;
    let cancelled = false;

    async function run() {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      setDetail(null);
      try {
        const r = await fetch(`/api/exams/${examId}/students/${studentId}`);
        const json = await r.json();
        if (!json.ok) throw new Error(json.error?.message ?? "加载失败");
        if (!cancelled) setDetail(json.data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();

    return () => {
      cancelled = true;
    };
  }, [examId, student]);

  return (
    <Dialog open={!!student} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {student?.name} <span className="text-on-surface-variant font-normal">· {student?.studentNo}</span>
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-10 text-sm text-on-surface-variant">加载中…</div>
        )}
        {error && (
          <div className="rounded-xl bg-danger-container p-4 text-sm text-danger">{error}</div>
        )}

        {detail && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4 rounded-xl bg-surface-container-low px-4 py-3 text-sm">
              <span className="font-semibold text-on-surface">
                {fmtScore(detail.score)} / {fmtScore(maxScore)} 分
              </span>
              <span className="text-on-surface-variant">第 {detail.attemptNo} 次作答</span>
              {detail.submittedAt && (
                <span className="text-on-surface-variant">
                  {new Date(detail.submittedAt).toLocaleString("zh-CN")}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {detail.questions.map((q) => (
                <DrillQuestion key={q.id} q={q} />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DrillQuestion({
  q,
}: {
  q: StudentAttemptDetail["questions"][number];
}) {
  function render(val: unknown) {
    if (val == null) return "未作答";
    if (q.type === "FILL_BLANK") {
      const blanks = val as string[][] | string[];
      const arr = blanks as unknown[];
      if (!arr.length) return "未作答";
      return (arr as string[]).map((v, i) => `空${i + 1}: ${Array.isArray(v) ? v[0] : v || "（未填）"}`).join("，");
    }
    const arr = val as string[];
    if (!arr.length) return "未作答";
    if (q.type === "TRUE_FALSE") return arr[0] === "T" ? "正确" : "错误";
    return arr.join("、");
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-3.5",
        q.isCorrect ? "border-success/25 bg-success-container/20" : "border-danger/25 bg-danger-container/20",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
            q.isCorrect ? "bg-success text-white" : "bg-danger text-white",
          )}
        >
          {q.isCorrect ? <CheckCircle2 className="size-3.5" /> : <X className="size-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span>{q.order}. {TYPE_LABEL[q.type] ?? q.type}</span>
            <span className={cn("ml-auto font-medium", q.isCorrect ? "text-success" : "text-danger")}>
              {q.isCorrect ? `+${fmtScore(q.scoreGot)}` : `0/${fmtScore(q.score)}`} 分
            </span>
          </div>
          <p className="mt-1 text-sm text-on-surface">{q.stem.replace(/_{4}|\{\{\d+\}\}/g, "____")}</p>
          <p className="mt-1.5 text-xs">
            <span className="text-on-surface-variant">该生答案：</span>
            <span className={q.isCorrect ? "text-success" : "text-danger"}>{render(q.chosen)}</span>
          </p>
          {!q.isCorrect && (
            <p className="mt-0.5 text-xs">
              <span className="text-on-surface-variant">正确答案：</span>
              <span className="text-success">{render(q.answer)}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

