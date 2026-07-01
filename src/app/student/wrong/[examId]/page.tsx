"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StudentTabBar } from "@/components/student/student-tab-bar";

// ─── Types ────────────────────────────────────────────────────────────────────

type QType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK";

interface WrongQuestionItem {
  wrongQuestionId: number;
  examQuestionId: number;
  type: QType;
  stem: string;
  options: { key: string; text: string }[] | null;
  answer: unknown;
  analysis: string | null;
  score: number;
  redoCount: number;
  lastResult: boolean | null;
}

interface ExamGroup {
  examId: number;
  examName: string;
  questions: WrongQuestionItem[];
}

interface QState {
  chosen: unknown;
  result: { isCorrect: boolean; redoCount: number } | null;
  submitting: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<QType, string> = {
  SINGLE_CHOICE: "单选",
  MULTIPLE_CHOICE: "多选",
  TRUE_FALSE: "判断",
  FILL_BLANK: "填空",
};

const BLANK_RE = /_{4}|\{\{[\d]+\}\}/g;

function statusBadge(item: WrongQuestionItem) {
  if (item.lastResult === true)
    return { text: "已掌握", color: "#34c759", bg: "rgba(52,199,89,0.1)" };
  if (item.lastResult === false)
    return { text: `重做${item.redoCount}次`, color: "#ff9500", bg: "rgba(255,149,0,0.1)" };
  if (item.redoCount > 0)
    return { text: `重做${item.redoCount}次`, color: "#575f66", bg: "rgba(87,95,102,0.08)" };
  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WrongDetailPage() {
  const params = useParams();
  const router = useRouter();
  const examId = Number(params.examId);

  const [group, setGroup] = useState<ExamGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"memory" | "redo">("memory");

  // redo mode: per-question state + current index
  const [redoIdx, setRedoIdx] = useState(0);
  const [qStates, setQStates] = useState<Record<number, QState>>({});
  const [showGrid, setShowGrid] = useState(false);

  useEffect(() => {
    fetch("/api/student/wrong-questions")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) {
          const found = (json.data as ExamGroup[]).find((g) => g.examId === examId);
          setGroup(found ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, [examId]);

  const updateQuestion = (wqId: number, update: Partial<WrongQuestionItem>) => {
    setGroup((prev) =>
      prev
        ? { ...prev, questions: prev.questions.map((q) => q.wrongQuestionId === wqId ? { ...q, ...update } : q) }
        : null,
    );
  };

  const handleSubmit = async (item: WrongQuestionItem) => {
    const state = qStates[item.wrongQuestionId];
    if (!state?.chosen) return;
    setQStates((prev) => ({
      ...prev,
      [item.wrongQuestionId]: { ...prev[item.wrongQuestionId], submitting: true },
    }));
    try {
      const r = await fetch(`/api/student/wrong-questions/${item.wrongQuestionId}/redo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chosen: state.chosen }),
      });
      const json = await r.json();
      if (json.ok) {
        setQStates((prev) => ({
          ...prev,
          [item.wrongQuestionId]: {
            ...prev[item.wrongQuestionId],
            result: { isCorrect: json.data.isCorrect, redoCount: json.data.redoCount },
            submitting: false,
          },
        }));
        updateQuestion(item.wrongQuestionId, {
          redoCount: json.data.redoCount,
          lastResult: json.data.isCorrect,
        });
      }
    } catch {
      setQStates((prev) => ({
        ...prev,
        [item.wrongQuestionId]: { ...prev[item.wrongQuestionId], submitting: false },
      }));
    }
  };

  const switchMode = (m: "memory" | "redo") => {
    setMode(m);
    if (m === "redo") {
      setRedoIdx(0);
      setQStates({});
    }
  };

  // ─── Shared header ──────────────────────────────────────────────────────────

  const Header = (
    <header
      className="sticky top-0 z-40 px-4 pb-3 pt-4"
      style={{
        background: "rgba(241,243,254,0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(193,198,215,0.22)",
      }}
    >
      <div className="mb-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all active:scale-90"
          style={{ background: "rgba(193,198,215,0.2)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#414755" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold text-on-surface">
          {loading ? "加载中…" : (group?.examName ?? "错题回顾")}
        </h1>
        {group && (
          <span className="flex-shrink-0 text-[13px] text-secondary">
            {group.questions.length} 道
          </span>
        )}
      </div>
      <div className="flex gap-1 rounded-2xl p-1" style={{ background: "rgba(193,198,215,0.18)" }}>
        {(["memory", "redo"] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className="flex-1 rounded-xl py-2 text-[14px] font-medium transition-all duration-200"
            style={{
              background: mode === m ? "#fff" : "transparent",
              color: mode === m ? "#181c23" : "#717786",
              boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {m === "memory" ? "记忆模式" : "重做模式"}
          </button>
        ))}
      </div>
    </header>
  );

  // ─── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col">
        {Header}
        <main className="flex-1 px-4 pb-32 pt-4">
          <div className="flex flex-col gap-4">
            {[160, 140, 180].map((h, i) => (
              <div key={i} className="animate-pulse rounded-3xl" style={{ height: h, background: "rgba(193,198,215,0.25)" }} />
            ))}
          </div>
        </main>
        <StudentTabBar />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col">
        {Header}
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl text-3xl" style={{ background: "rgba(255,59,48,0.1)" }}>⚠️</div>
            <p className="text-[15px] text-secondary">未找到该错题集</p>
          </div>
        </main>
        <StudentTabBar />
      </div>
    );
  }

  // ─── Memory mode: scrollable list ──────────────────────────────────────────

  if (mode === "memory") {
    return (
      <>
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .slide-up { animation: slideUp 0.24s ease-out both; }
        `}</style>
        <div className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col">
          {Header}
          <main className="flex-1 px-4 pb-32 pt-4">
            <div className="slide-up flex flex-col gap-4">
              {group.questions.map((item, idx) => (
                <MemoryQuestionCard key={item.wrongQuestionId} item={item} index={idx + 1} />
              ))}
            </div>
          </main>
          <StudentTabBar />
        </div>
      </>
    );
  }

  // ─── Redo mode: one-question-at-a-time ─────────────────────────────────────

  const total = group.questions.length;
  const item = group.questions[redoIdx];
  const qs = qStates[item.wrongQuestionId] ?? { chosen: null, result: null, submitting: false };

  const canSubmit = (() => {
    if (qs.chosen == null) return false;
    if (Array.isArray(qs.chosen)) {
      if (qs.chosen.length === 0) return false;
      if (item.type === "FILL_BLANK") return (qs.chosen as string[]).some((s) => s.trim() !== "");
    }
    return true;
  })();

  const isSubmitted = qs.result !== null;
  const isLast = redoIdx === total - 1;

  const goNext = () => {
    if (!isLast) setRedoIdx((i) => i + 1);
    else router.back();
  };

  const masteredCount = group.questions.filter((q) => {
    const s = qStates[q.wrongQuestionId];
    return s?.result?.isCorrect === true;
  }).length;

  return (
    <>
      <style>{`
        @keyframes qFadeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.995); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .q-enter { animation: qFadeIn 0.28s cubic-bezier(0.34,1.15,0.64,1) both; }
        @keyframes resultPop {
          0%   { transform: scale(0.88); opacity: 0; }
          70%  { transform: scale(1.04); }
          100% { transform: scale(1); opacity: 1; }
        }
        .result-pop { animation: resultPop 0.4s cubic-bezier(0.34,1.2,0.64,1) both; }
      `}</style>

      <div className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col">
        {Header}

        {/* Content */}
        <main className="flex flex-1 flex-col gap-3 px-5 pb-36 pt-4">

          {/* Progress row */}
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[13px] text-secondary">
              第 <span className="font-semibold text-on-surface">{redoIdx + 1}</span> / {total} 题
            </span>
            {masteredCount > 0 && (
              <span className="text-[12px]" style={{ color: "#34c759" }}>
                已掌握 {masteredCount}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-1 overflow-hidden rounded-full" style={{ background: "rgba(193,198,215,0.25)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((redoIdx + 1) / total) * 100}%`,
                background: "#007aff",
              }}
            />
          </div>

          {/* Question card — key forces re-mount + fade animation on question change */}
          <div
            key={redoIdx}
            className="q-enter overflow-hidden rounded-3xl"
            style={{
              background: "rgba(255,255,255,0.82)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.7)",
              boxShadow:
                "0 4px 32px -4px rgba(0,122,255,0.08), 0 1px 0 rgba(255,255,255,0.9) inset",
            }}
          >
            {/* Stem section */}
            <div className="px-5 pb-4 pt-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <TypeBadge type={item.type} />
                {(() => {
                  const b = statusBadge(item);
                  return b ? (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ color: b.color, background: b.bg }}
                    >
                      {b.text}
                    </span>
                  ) : null;
                })()}
              </div>

              {item.type === "FILL_BLANK" && !isSubmitted ? (
                <FillBlankStem
                  stem={item.stem}
                  chosen={qs.chosen as string[] | null}
                  onChange={(v) =>
                    setQStates((prev) => ({
                      ...prev,
                      [item.wrongQuestionId]: { chosen: v, result: null, submitting: false },
                    }))
                  }
                />
              ) : (
                <p className="text-[17px] leading-[1.65] text-on-surface">
                  {item.stem.replace(BLANK_RE, "____")}
                </p>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "rgba(193,198,215,0.18)" }} />

            {/* Answer / result section */}
            <div className="px-5 py-5">
              {isSubmitted ? (
                <div className="flex flex-col gap-4">
                  {/* Result banner */}
                  <div
                    className="result-pop flex items-center gap-3 rounded-2xl px-4 py-3.5"
                    style={{
                      background: qs.result!.isCorrect ? "rgba(52,199,89,0.1)" : "rgba(255,59,48,0.08)",
                      border: `1.5px solid ${qs.result!.isCorrect ? "rgba(52,199,89,0.3)" : "rgba(255,59,48,0.22)"}`,
                    }}
                  >
                    <span
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[20px] font-bold"
                      style={{
                        background: qs.result!.isCorrect ? "rgba(52,199,89,0.15)" : "rgba(255,59,48,0.12)",
                        color: qs.result!.isCorrect ? "#34c759" : "#ff3b30",
                      }}
                    >
                      {qs.result!.isCorrect ? "✓" : "✗"}
                    </span>
                    <div>
                      <p className="text-[16px] font-semibold" style={{ color: qs.result!.isCorrect ? "#34c759" : "#ff3b30" }}>
                        {qs.result!.isCorrect ? "回答正确！" : "回答错误"}
                      </p>
                      <p className="text-[12px] text-secondary">
                        已重做 {qs.result!.redoCount} 次
                      </p>
                    </div>
                    {!qs.result!.isCorrect && (
                      <button
                        onClick={() =>
                          setQStates((prev) => ({
                            ...prev,
                            [item.wrongQuestionId]: { chosen: null, result: null, submitting: false },
                          }))
                        }
                        className="ml-auto rounded-full px-3 py-1.5 text-[13px] font-medium text-primary transition-all hover:bg-primary/10 active:scale-95"
                      >
                        再试
                      </button>
                    )}
                  </div>

                  {/* Show correct answer */}
                  <MemoryView item={item} />
                </div>
              ) : (
                <RedoOptions
                  item={item}
                  chosen={qs.chosen}
                  onChange={(v) =>
                    setQStates((prev) => ({
                      ...prev,
                      [item.wrongQuestionId]: { chosen: v, result: null, submitting: false },
                    }))
                  }
                />
              )}
            </div>
          </div>
        </main>

        {/* Fixed bottom nav — replaces StudentTabBar in redo mode */}
        <nav
          className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2"
          style={{
            background: "rgba(241,243,254,0.92)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderTop: "1px solid rgba(193,198,215,0.22)",
            boxShadow: "0 -6px 28px rgba(0,0,0,0.05)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <div className="flex items-center justify-between px-5 py-3.5">
            {/* Prev */}
            <button
              disabled={redoIdx === 0}
              onClick={() => setRedoIdx((i) => i - 1)}
              className="flex h-11 items-center gap-1 rounded-full border px-4 text-[14px] font-medium transition-all active:scale-95 disabled:opacity-25"
              style={{
                background: "rgba(255,255,255,0.7)",
                borderColor: "rgba(193,198,215,0.4)",
                color: "#414755",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              上一题
            </button>

            {/* Grid button — opens question picker */}
            <button
              onClick={() => setShowGrid(true)}
              className="flex flex-col items-center gap-0.5 rounded-full px-3 py-2 transition-all active:scale-90"
              style={{ color: "#717786" }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <rect x="2" y="2" width="6" height="6" rx="1.5" />
                <rect x="12" y="2" width="6" height="6" rx="1.5" />
                <rect x="2" y="12" width="6" height="6" rx="1.5" />
                <rect x="12" y="12" width="6" height="6" rx="1.5" />
              </svg>
              <span className="text-[10px]">
                {Object.values(qStates).filter((s) => s.result != null).length}/{total}
              </span>
            </button>

            {/* Submit / Next */}
            {isSubmitted ? (
              <button
                onClick={goNext}
                className="flex h-11 items-center gap-1 rounded-full px-5 text-[14px] font-semibold text-white transition-all active:scale-95"
                style={{
                  background: isLast ? "#34c759" : "#007aff",
                  boxShadow: isLast
                    ? "0 2px 16px rgba(52,199,89,0.32)"
                    : "0 2px 16px rgba(0,122,255,0.32)",
                }}
              >
                {isLast ? "完成" : "下一题"}
                {!isLast && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(item)}
                disabled={!canSubmit || qs.submitting}
                className="flex h-11 items-center gap-1.5 rounded-full px-5 text-[14px] font-semibold text-white transition-all active:scale-95 disabled:opacity-35"
                style={{
                  background: "#007aff",
                  boxShadow: canSubmit ? "0 2px 16px rgba(0,122,255,0.32)" : "none",
                }}
              >
                {qs.submitting ? "提交中…" : "确认作答"}
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* Question grid sheet */}
      {showGrid && (
        <QuestionGridSheet
          questions={group.questions}
          qStates={qStates}
          currentIdx={redoIdx}
          onSelect={(i) => { setRedoIdx(i); setShowGrid(false); }}
          onClose={() => setShowGrid(false)}
        />
      )}
    </>
  );
}

// ─── Question Grid Sheet ──────────────────────────────────────────────────────

function QuestionGridSheet({
  questions,
  qStates,
  currentIdx,
  onSelect,
  onClose,
}: {
  questions: WrongQuestionItem[];
  qStates: Record<number, QState>;
  currentIdx: number;
  onSelect: (i: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="mx-auto w-full max-w-[430px] rounded-t-3xl px-5 pb-10 pt-5"
        style={{
          background: "rgba(241,243,254,0.97)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          animation: "sheetUp 0.28s cubic-bezier(0.34,1.1,0.64,1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes sheetUp {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0); opacity: 1; }
          }
        `}</style>

        {/* Handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "rgba(193,198,215,0.5)" }} />

        <div className="mb-4 flex items-center justify-between">
          <p className="text-[16px] font-semibold text-on-surface">选择题目</p>
          <div className="flex gap-3 text-[12px] text-secondary">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#34c759" }} /> 已掌握
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#ff3b30" }} /> 答错
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "rgba(193,198,215,0.6)" }} /> 未做
            </span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2.5">
          {questions.map((q, i) => {
            const s = qStates[q.wrongQuestionId];
            const done = s?.result != null;
            const correct = s?.result?.isCorrect === true;
            const isCurrent = i === currentIdx;
            return (
              <button
                key={i}
                onClick={() => onSelect(i)}
                className="flex h-12 items-center justify-center rounded-2xl text-[15px] font-semibold transition-all active:scale-90"
                style={{
                  background: isCurrent
                    ? "#007aff"
                    : done
                      ? correct ? "rgba(52,199,89,0.15)" : "rgba(255,59,48,0.12)"
                      : "rgba(193,198,215,0.2)",
                  color: isCurrent
                    ? "#fff"
                    : done
                      ? correct ? "#34c759" : "#ff3b30"
                      : "#575f66",
                  border: isCurrent ? "none" : `1.5px solid ${
                    done ? (correct ? "rgba(52,199,89,0.3)" : "rgba(255,59,48,0.25)") : "rgba(193,198,215,0.3)"
                  }`,
                  boxShadow: isCurrent ? "0 2px 12px rgba(0,122,255,0.3)" : "none",
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Memory Question Card (for memory mode list) ──────────────────────────────

function MemoryQuestionCard({ item, index }: { item: WrongQuestionItem; index: number }) {
  const badge = statusBadge(item);
  return (
    <div
      className="overflow-hidden rounded-3xl"
      style={{
        background: "rgba(255,255,255,0.78)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.65)",
        boxShadow: "0 2px 20px -2px rgba(0,90,200,0.07)",
      }}
    >
      <div className="px-5 pb-4 pt-5">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <TypeBadge type={item.type} />
          <span className="text-[12px] text-secondary">第 {index} 题</span>
          {badge && (
            <span
              className="ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ color: badge.color, background: badge.bg }}
            >
              {badge.text}
            </span>
          )}
        </div>
        <p className="text-[15px] leading-relaxed text-on-surface">
          {item.stem.replace(BLANK_RE, "____")}
        </p>
      </div>
      <div style={{ height: "1px", background: "rgba(193,198,215,0.2)" }} />
      <div className="px-5 py-4">
        <MemoryView item={item} />
      </div>
    </div>
  );
}

// ─── Redo Options (interactive, no submit button — handled by bottom nav) ─────

function RedoOptions({
  item,
  chosen,
  onChange,
}: {
  item: WrongQuestionItem;
  chosen: unknown;
  onChange: (v: unknown) => void;
}) {
  if (item.type === "SINGLE_CHOICE") {
    const sel = (chosen as string[] | null)?.[0] ?? null;
    return (
      <div className="flex flex-col gap-2.5">
        {(item.options ?? []).map((opt) => {
          const active = sel === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange([opt.key])}
              className="flex items-start gap-3 rounded-2xl p-3.5 text-left transition-all duration-150 active:scale-[0.98]"
              style={{
                background: active ? "rgba(0,122,255,0.06)" : "rgba(255,255,255,0.6)",
                border: `1.5px solid ${active ? "#007aff" : "rgba(193,198,215,0.4)"}`,
                boxShadow: active ? "0 0 0 3px rgba(0,122,255,0.07)" : "none",
              }}
            >
              <span
                className="mt-0.5 flex h-[24px] w-[24px] flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-all duration-150"
                style={{ background: active ? "#007aff" : "rgba(113,119,134,0.1)", color: active ? "#fff" : "#575f66" }}
              >
                {opt.key}
              </span>
              <span className="text-[15px] leading-snug text-on-surface">{opt.text}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (item.type === "MULTIPLE_CHOICE") {
    const sel = new Set((chosen as string[] | null) ?? []);
    const toggle = (key: string) => {
      const next = new Set(sel);
      if (next.has(key)) next.delete(key); else next.add(key);
      onChange(next.size ? [...next] : null);
    };
    return (
      <div>
        <p className="mb-2.5 text-[12px] font-medium text-secondary">可多选</p>
        <div className="flex flex-col gap-2.5">
          {(item.options ?? []).map((opt) => {
            const active = sel.has(opt.key);
            return (
              <button
                key={opt.key}
                onClick={() => toggle(opt.key)}
                className="flex items-start gap-3 rounded-2xl p-3.5 text-left transition-all duration-150 active:scale-[0.98]"
                style={{
                  background: active ? "rgba(0,122,255,0.06)" : "rgba(255,255,255,0.6)",
                  border: `1.5px solid ${active ? "#007aff" : "rgba(193,198,215,0.4)"}`,
                  boxShadow: active ? "0 0 0 3px rgba(0,122,255,0.07)" : "none",
                }}
              >
                <span
                  className="mt-0.5 flex h-[24px] w-[24px] flex-shrink-0 items-center justify-center rounded-[7px] text-[12px] font-bold transition-all duration-150"
                  style={{ background: active ? "#007aff" : "rgba(113,119,134,0.1)", color: active ? "#fff" : "#575f66" }}
                >
                  {active ? "✓" : opt.key}
                </span>
                <span className="text-[15px] leading-snug text-on-surface">{opt.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (item.type === "TRUE_FALSE") {
    const sel = (chosen as string[] | null)?.[0] ?? null;
    return (
      <div className="flex gap-3">
        {([
          { key: "T", label: "正确", mark: "✓", color: "#34c759" },
          { key: "F", label: "错误", mark: "✗", color: "#ff3b30" },
        ] as const).map((opt) => {
          const active = sel === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange([opt.key])}
              className="flex flex-1 flex-col items-center gap-2 rounded-2xl py-6 transition-all duration-150 active:scale-[0.97]"
              style={{
                background: active ? `${opt.color}14` : "rgba(255,255,255,0.6)",
                border: `1.5px solid ${active ? opt.color : "rgba(193,198,215,0.4)"}`,
                boxShadow: active ? `0 0 0 3px ${opt.color}18` : "none",
              }}
            >
              <span className="text-[32px] font-bold leading-none" style={{ color: active ? opt.color : "#c1c6d7" }}>{opt.mark}</span>
              <span className="text-[15px] font-semibold" style={{ color: active ? opt.color : "#575f66" }}>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // FILL_BLANK — rendered by parent (FillBlankStem handles it)
  return null;
}

// ─── Memory View ──────────────────────────────────────────────────────────────

function MemoryView({ item }: { item: WrongQuestionItem }) {
  if (item.type === "FILL_BLANK") {
    const blanks = item.answer as string[][];
    return (
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-secondary">正确答案</p>
        <div className="flex flex-col gap-1.5">
          {blanks.map((accepts, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(52,199,89,0.08)" }}>
              <span className="flex-shrink-0 text-[12px] text-secondary">空{i + 1}:</span>
              <div>
                <span className="text-[14px] font-medium text-on-surface">{accepts[0]}</span>
                {accepts.length > 1 && (
                  <span className="ml-1.5 text-[12px] text-secondary">(也可: {accepts.slice(1).join("、")})</span>
                )}
              </div>
            </div>
          ))}
        </div>
        {item.analysis && <AnalysisBox analysis={item.analysis} />}
      </div>
    );
  }

  if (item.type === "TRUE_FALSE") {
    const correct = (item.answer as string[])[0];
    return (
      <div>
        <div className="mb-3 flex gap-3">
          {([
            { key: "T", label: "正确", mark: "✓", color: "#34c759" },
            { key: "F", label: "错误", mark: "✗", color: "#ff3b30" },
          ] as const).map((opt) => {
            const isCorrect = opt.key === correct;
            return (
              <div
                key={opt.key}
                className="flex flex-1 flex-col items-center gap-2 rounded-2xl py-4"
                style={{
                  background: isCorrect ? `${opt.color}12` : "rgba(193,198,215,0.1)",
                  border: `1.5px solid ${isCorrect ? `${opt.color}35` : "rgba(193,198,215,0.25)"}`,
                }}
              >
                <span className="text-[28px] font-bold leading-none" style={{ color: isCorrect ? opt.color : "#c1c6d7" }}>{opt.mark}</span>
                <span className="text-[14px] font-semibold" style={{ color: isCorrect ? opt.color : "#c1c6d7" }}>{opt.label}</span>
                {isCorrect && <span className="text-[10px] font-semibold" style={{ color: opt.color }}>✓ 正确答案</span>}
              </div>
            );
          })}
        </div>
        {item.analysis && <AnalysisBox analysis={item.analysis} />}
      </div>
    );
  }

  const correctKeys = item.answer as string[];
  return (
    <div>
      <div className="mb-3 flex flex-col gap-2">
        {(item.options ?? []).map((opt) => {
          const isCorrect = correctKeys.includes(opt.key);
          return (
            <div
              key={opt.key}
              className="flex items-start gap-3 rounded-xl px-3 py-2.5"
              style={{
                background: isCorrect ? "rgba(52,199,89,0.07)" : "transparent",
                border: `1.5px solid ${isCorrect ? "rgba(52,199,89,0.28)" : "rgba(193,198,215,0.3)"}`,
              }}
            >
              <span
                className="mt-0.5 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                style={{ background: isCorrect ? "#34c759" : "rgba(113,119,134,0.1)", color: isCorrect ? "#fff" : "#717786" }}
              >
                {isCorrect ? "✓" : opt.key}
              </span>
              <span className="text-[14px] leading-snug text-on-surface">{opt.text}</span>
            </div>
          );
        })}
      </div>
      {item.analysis && <AnalysisBox analysis={item.analysis} />}
    </div>
  );
}

// ─── Fill Blank Stem ──────────────────────────────────────────────────────────

function FillBlankStem({
  stem,
  chosen,
  onChange,
}: {
  stem: string;
  chosen: string[] | null;
  onChange: (v: string[]) => void;
}) {
  const parts = stem.split(BLANK_RE);
  const blankCount = parts.length - 1;
  const vals = chosen ?? Array<string>(blankCount).fill("");
  const update = (i: number, val: string) => {
    const next = [...vals];
    while (next.length < blankCount) next.push("");
    next[i] = val;
    onChange(next);
  };
  return (
    <p className="mb-2 text-[17px] leading-[2.2] text-on-surface">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < blankCount && (
            <input
              type="text"
              value={vals[i] ?? ""}
              onChange={(e) => update(i, e.target.value)}
              placeholder={`第${i + 1}空`}
              className="mx-1.5 inline-block w-24 min-w-0 border-0 border-b-2 bg-transparent px-1 pb-0 pt-0.5 text-[16px] font-medium text-primary outline-none transition-colors placeholder:text-outline-variant/60 focus:border-primary"
              style={{ borderColor: vals[i]?.trim() ? "#007aff" : "#c1c6d7" }}
            />
          )}
        </Fragment>
      ))}
    </p>
  );
}

// ─── Analysis Box ─────────────────────────────────────────────────────────────

function AnalysisBox({ analysis }: { analysis: string }) {
  return (
    <div className="mt-3 rounded-xl px-3 py-2.5" style={{ background: "rgba(0,122,255,0.05)" }}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-secondary">解析</p>
      <p className="text-[13px] leading-relaxed text-on-surface-variant">{analysis}</p>
    </div>
  );
}

// ─── Type Badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: QType }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color: "#004493", background: "rgba(0,68,147,0.07)" }}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}
