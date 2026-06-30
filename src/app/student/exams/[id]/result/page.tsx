"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type QType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK";

interface ResultQuestion {
  id: number;
  order: number;
  type: QType;
  stem: string;
  options: { key: string; text: string }[] | null;
  answer: unknown;
  analysis: string | null;
  score: number;
  chosen: unknown;
  isCorrect: boolean;
  scoreGot: number;
}

interface ResultData {
  attemptId: number;
  examId: number;
  examName: string;
  examType: string;
  score: number;
  maxScore: number;
  elapsedSec: number;
  submittedAt: string | null;
  questions: ResultQuestion[];
}

const TYPE_LABELS: Record<QType, string> = {
  SINGLE_CHOICE: "单选",
  MULTIPLE_CHOICE: "多选",
  TRUE_FALSE: "判断",
  FILL_BLANK: "填空",
};

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h${m % 60}m`;
  return `${m}m${s < 10 ? "0" : ""}${s}s`;
}

function renderAnswer(type: QType, answer: unknown): string {
  if (!answer) return "—";
  if (type === "FILL_BLANK") {
    const blanks = answer as string[][];
    return blanks.map((b, i) => `空${i + 1}: ${b[0]}`).join("，");
  }
  return (answer as string[]).join("、");
}

function renderChosen(type: QType, chosen: unknown): string {
  if (!chosen) return "未作答";
  if (type === "FILL_BLANK") {
    const blanks = chosen as string[];
    if (!blanks.length || blanks.every((s) => !s)) return "未作答";
    return blanks.map((s, i) => `空${i + 1}: ${s || "（未填）"}`).join("，");
  }
  const arr = chosen as string[];
  if (!arr.length) return "未作答";
  if (type === "TRUE_FALSE") return arr[0] === "T" ? "正确" : "错误";
  return arr.join("、");
}

export default function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [examId, setExamId] = useState<number>(0);

  useEffect(() => {
    params.then((p) => setExamId(Number(p.id)));
  }, [params]);

  useEffect(() => {
    const attemptId = searchParams.get("attemptId");
    if (!attemptId) {
      setError("缺少作答 ID");
      setLoading(false);
      return;
    }
    fetch(`/api/student/attempts/${attemptId}/result`)
      .then(async (r) => {
        const json = await r.json();
        if (!json.ok) {
          setError(json.error?.message ?? "无法加载结果");
          return;
        }
        setData(json.data);
      })
      .catch(() => setError("网络错误"))
      .finally(() => setLoading(false));
  }, [searchParams]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-[430px] items-center justify-center">
        <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-primary/15 border-t-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col items-center justify-center gap-4 px-8">
        <p className="text-center text-[16px] text-on-surface">{error ?? "加载失败"}</p>
        <button
          onClick={() => router.push("/student")}
          className="rounded-full bg-primary px-6 py-3 text-[15px] font-semibold text-white"
        >
          返回首页
        </button>
      </div>
    );
  }

  const pct = data.maxScore > 0 ? Math.round((data.score / data.maxScore) * 100) : 0;
  const correctCount = data.questions.filter((q) => q.isCorrect).length;
  const totalCount = data.questions.length;

  return (
    <>
      <style>{`
        @keyframes scorePop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        .score-pop { animation: scorePop 0.6s cubic-bezier(0.34,1.3,0.64,1) 0.2s both; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.4s ease-out both; }
      `}</style>

      <div className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col">
        {/* Header */}
        <header
          className="sticky top-0 z-40"
          style={{
            background: "rgba(241,243,254,0.9)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(193,198,215,0.22)",
          }}
        >
          <div className="flex h-14 items-center px-3">
            <button
              onClick={() => router.push("/student")}
              className="flex h-9 w-9 items-center justify-center rounded-full text-primary active:scale-90"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h1 className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold text-on-surface">
              作答结果
            </h1>
          </div>
        </header>

        <main className="flex-1 px-5 pb-10 pt-4">
          {/* Score card */}
          <div
            className="fade-up mb-4 overflow-hidden rounded-3xl p-6 text-center"
            style={{
              background: "rgba(255,255,255,0.82)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.7)",
              boxShadow: "0 4px 32px -4px rgba(0,122,255,0.1)",
            }}
          >
            <p className="mb-2 text-[13px] font-medium text-secondary">
              {data.examName}
            </p>

            {/* Score ring */}
            <div className="relative mx-auto mb-4 flex h-32 w-32 items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(193,198,215,0.3)" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52"
                  fill="none"
                  stroke="#007aff"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  strokeDashoffset={`${2 * Math.PI * 52 * (1 - pct / 100)}`}
                  style={{ transition: "stroke-dashoffset 1s ease-out 0.4s" }}
                />
              </svg>
              <div className="score-pop flex flex-col items-center">
                <span className="text-[36px] font-bold leading-none text-on-surface tabular-nums">
                  {data.score.toFixed(data.score % 1 === 0 ? 0 : 1)}
                </span>
                <span className="text-[12px] text-secondary">
                  / {data.maxScore} 分
                </span>
              </div>
            </div>

            {/* Stats row */}
            <div className="fade-up flex divide-x divide-outline-variant/20" style={{ animationDelay: "0.3s" }}>
              {[
                { label: "正确", value: correctCount, color: "#34c759" },
                { label: "错误", value: totalCount - correctCount, color: "#ff3b30" },
                { label: "用时", value: formatElapsed(data.elapsedSec), color: "#575f66" },
              ].map((s) => (
                <div key={s.label} className="flex flex-1 flex-col items-center gap-0.5">
                  <span className="text-[20px] font-bold" style={{ color: s.color }}>
                    {s.value}
                  </span>
                  <span className="text-[11px] text-secondary">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Back button */}
          {examId > 0 && (
            <div className="fade-up mb-4 flex gap-2.5" style={{ animationDelay: "0.4s" }}>
              <button
                onClick={() => router.push("/student")}
                className="flex-1 rounded-full border border-outline-variant/50 py-3 text-[14px] font-medium text-secondary transition-all hover:bg-surface-container active:scale-98"
              >
                返回首页
              </button>
              <button
                onClick={() => router.push(`/student/exams/${examId}`)}
                className="flex-1 rounded-full py-3 text-[14px] font-semibold text-white transition-all active:scale-98"
                style={{ background: "#007aff", boxShadow: "0 2px 12px rgba(0,122,255,0.28)" }}
              >
                再次作答
              </button>
            </div>
          )}

          {/* Per-question breakdown */}
          <div className="fade-up" style={{ animationDelay: "0.5s" }}>
            <h2 className="mb-3 px-1 text-[15px] font-semibold text-on-surface">
              逐题详情
            </h2>
            <div className="flex flex-col gap-2.5">
              {data.questions.map((q, i) => (
                <QuestionResultCard
                  key={q.id}
                  q={q}
                  index={i}
                  expanded={expandedIdx === i}
                  onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

function QuestionResultCard({
  q,
  index,
  expanded,
  onToggle,
}: {
  q: ResultQuestion;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl transition-all duration-200"
      style={{
        background: q.isCorrect ? "rgba(52,199,89,0.06)" : "rgba(255,59,48,0.05)",
        border: `1.5px solid ${q.isCorrect ? "rgba(52,199,89,0.25)" : "rgba(255,59,48,0.2)"}`,
      }}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        {/* Status icon */}
        <span
          className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
          style={{
            background: q.isCorrect ? "rgba(52,199,89,0.15)" : "rgba(255,59,48,0.12)",
            color: q.isCorrect ? "#34c759" : "#ff3b30",
          }}
        >
          {q.isCorrect ? "✓" : "✗"}
        </span>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[11px] font-semibold text-secondary">
              {index + 1}. {TYPE_LABELS[q.type]}
            </span>
            <span className="ml-auto text-[11px] font-medium" style={{ color: q.isCorrect ? "#34c759" : "#ff3b30" }}>
              {q.isCorrect ? `+${q.scoreGot}` : `0/${q.score}`} 分
            </span>
          </div>
          <p className="line-clamp-2 text-[14px] leading-snug text-on-surface">
            {q.stem.replace(/_{4}|\{\{[\d]+\}\}/g, "____")}
          </p>
        </div>

        {/* Expand chevron */}
        <span
          className="mt-1 flex-shrink-0 text-secondary transition-transform duration-200"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="border-t border-outline-variant/15 px-4 pb-4 pt-3">
          {/* Your answer */}
          <div className="mb-2.5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-secondary">
              你的答案
            </p>
            <p
              className="text-[14px] font-medium"
              style={{ color: q.isCorrect ? "#34c759" : "#ff3b30" }}
            >
              {renderChosen(q.type, q.chosen)}
            </p>
          </div>

          {/* Correct answer */}
          {!q.isCorrect && (
            <div className="mb-2.5">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-secondary">
                正确答案
              </p>
              <p className="text-[14px] font-medium text-success">
                {renderAnswer(q.type, q.answer)}
              </p>
            </div>
          )}

          {/* Options (for choice questions) */}
          {q.options && (
            <div className="mb-2.5 flex flex-col gap-1.5">
              {q.options.map((opt) => {
                const correctArr = q.answer as string[];
                const chosenArr = (q.chosen as string[]) ?? [];
                const isCorrectOpt = correctArr.includes(opt.key);
                const isChosenOpt = chosenArr.includes(opt.key);
                return (
                  <div
                    key={opt.key}
                    className="flex items-start gap-2 rounded-xl p-2.5"
                    style={{
                      background: isCorrectOpt
                        ? "rgba(52,199,89,0.08)"
                        : isChosenOpt
                          ? "rgba(255,59,48,0.07)"
                          : "transparent",
                    }}
                  >
                    <span
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{
                        background: isCorrectOpt ? "#34c759" : isChosenOpt ? "#ff3b30" : "rgba(113,119,134,0.12)",
                        color: isCorrectOpt || isChosenOpt ? "#fff" : "#717786",
                      }}
                    >
                      {opt.key}
                    </span>
                    <span className="text-[13px] leading-snug text-on-surface">
                      {opt.text}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Analysis */}
          {q.analysis && (
            <div className="rounded-xl bg-surface-container p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-secondary">
                解析
              </p>
              <p className="text-[13px] leading-relaxed text-on-surface-variant">
                {q.analysis}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
