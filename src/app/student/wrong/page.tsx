"use client";

import { Fragment, useEffect, useState } from "react";
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
    return {
      text: `重做${item.redoCount}次`,
      color: "#ff9500",
      bg: "rgba(255,149,0,0.1)",
    };
  if (item.redoCount > 0)
    return {
      text: `重做${item.redoCount}次`,
      color: "#575f66",
      bg: "rgba(87,95,102,0.08)",
    };
  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WrongQuestionsPage() {
  const [groups, setGroups] = useState<ExamGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<number>>(new Set());
  const [openQuestions, setOpenQuestions] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/student/wrong-questions")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) {
          setGroups(json.data);
          if (json.data.length > 0) {
            setOpenGroups(new Set([json.data[0].examId]));
          }
        } else {
          setError(json.error?.message ?? "加载失败");
        }
      })
      .catch(() => setError("网络错误，请重试"))
      .finally(() => setLoading(false));
  }, []);

  const totalWrong = groups.reduce((s, g) => s + g.questions.length, 0);

  const toggleGroup = (examId: number) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(examId)) next.delete(examId);
      else next.add(examId);
      return next;
    });
  };

  const toggleQuestion = (wqId: number) => {
    setOpenQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(wqId)) next.delete(wqId);
      else next.add(wqId);
      return next;
    });
  };

  const updateQuestion = (
    wqId: number,
    update: Pick<WrongQuestionItem, "redoCount" | "lastResult">,
  ) => {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        questions: g.questions.map((q) =>
          q.wrongQuestionId === wqId ? { ...q, ...update } : q,
        ),
      })),
    );
  };

  return (
    <>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .slide-down { animation: slideDown 0.22s ease-out both; }
        @keyframes resultPop {
          0%   { transform: scale(0.88); opacity: 0; }
          70%  { transform: scale(1.04); }
          100% { transform: scale(1); opacity: 1; }
        }
        .result-pop { animation: resultPop 0.4s cubic-bezier(0.34,1.2,0.64,1) both; }
      `}</style>

      <div className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-40"
          style={{
            background: "rgba(241,243,254,0.92)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderBottom: "1px solid rgba(193,198,215,0.22)",
          }}
        >
          <div className="flex h-14 items-center px-5">
            <h1 className="text-[20px] font-semibold text-on-surface">
              错题本
            </h1>
            {!loading && totalWrong > 0 && (
              <span
                className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold"
                style={{
                  background: "rgba(255,59,48,0.1)",
                  color: "#ff3b30",
                }}
              >
                {totalWrong} 道
              </span>
            )}
          </div>
        </header>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <main className="flex-1 px-4 pb-32 pt-4">
          {loading ? (
            <LoadingSkeleton />
          ) : error ? (
            <ErrorState message={error} />
          ) : totalWrong === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-3">
              {groups.map((group) => (
                <ExamGroupSection
                  key={group.examId}
                  group={group}
                  isOpen={openGroups.has(group.examId)}
                  openQuestions={openQuestions}
                  onToggleGroup={() => toggleGroup(group.examId)}
                  onToggleQuestion={toggleQuestion}
                  onQuestionUpdate={updateQuestion}
                />
              ))}
            </div>
          )}
        </main>

        <StudentTabBar />
      </div>
    </>
  );
}

// ─── Exam Group Section ───────────────────────────────────────────────────────

function ExamGroupSection({
  group,
  isOpen,
  openQuestions,
  onToggleGroup,
  onToggleQuestion,
  onQuestionUpdate,
}: {
  group: ExamGroup;
  isOpen: boolean;
  openQuestions: Set<number>;
  onToggleGroup: () => void;
  onToggleQuestion: (id: number) => void;
  onQuestionUpdate: (
    id: number,
    u: Pick<WrongQuestionItem, "redoCount" | "lastResult">,
  ) => void;
}) {
  const masteredCount = group.questions.filter(
    (q) => q.lastResult === true,
  ).length;

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
      {/* Group header */}
      <button
        onClick={onToggleGroup}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="truncate text-[16px] font-semibold text-on-surface">
            {group.examName}
          </p>
          <p className="mt-0.5 text-[12px] text-secondary">
            {group.questions.length} 道错题
            {masteredCount > 0 && (
              <span className="ml-2" style={{ color: "#34c759" }}>
                · 已掌握 {masteredCount}
              </span>
            )}
          </p>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#717786"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0 transition-transform duration-250"
          style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Questions list */}
      {isOpen && (
        <div className="slide-down border-t border-outline-variant/15 px-4 pb-4 pt-3">
          <div className="flex flex-col gap-2.5">
            {group.questions.map((q) => (
              <WrongQuestionCard
                key={q.wrongQuestionId}
                item={q}
                isOpen={openQuestions.has(q.wrongQuestionId)}
                onToggle={() => onToggleQuestion(q.wrongQuestionId)}
                onUpdate={(u) => onQuestionUpdate(q.wrongQuestionId, u)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Wrong Question Card ──────────────────────────────────────────────────────

function WrongQuestionCard({
  item,
  isOpen,
  onToggle,
  onUpdate,
}: {
  item: WrongQuestionItem;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (u: Pick<WrongQuestionItem, "redoCount" | "lastResult">) => void;
}) {
  const badge = statusBadge(item);

  return (
    <div
      className="overflow-hidden rounded-2xl transition-shadow duration-200"
      style={{
        background: "rgba(255,255,255,0.7)",
        border: `1.5px solid ${isOpen ? "rgba(0,122,255,0.2)" : "rgba(193,198,215,0.3)"}`,
        boxShadow: isOpen
          ? "0 0 0 3px rgba(0,122,255,0.05)"
          : "0 1px 6px -1px rgba(0,0,0,0.04)",
      }}
    >
      {/* Card header */}
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-3.5 text-left"
      >
        <span className="mt-0.5 flex-shrink-0">
          <TypeBadge type={item.type} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[14px] leading-snug text-on-surface">
            {item.stem.replace(BLANK_RE, "____")}
          </p>
          {badge && (
            <span
              className="mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ color: badge.color, background: badge.bg }}
            >
              {badge.text}
            </span>
          )}
        </div>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#717786"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-1 flex-shrink-0 transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <ExpandedCard item={item} onUpdate={onUpdate} />
      )}
    </div>
  );
}

// ─── Expanded Card ────────────────────────────────────────────────────────────

function ExpandedCard({
  item,
  onUpdate,
}: {
  item: WrongQuestionItem;
  onUpdate: (u: Pick<WrongQuestionItem, "redoCount" | "lastResult">) => void;
}) {
  const [mode, setMode] = useState<"memory" | "redo">("memory");
  const [chosen, setChosen] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [redoResult, setRedoResult] = useState<{
    isCorrect: boolean;
    redoCount: number;
  } | null>(null);

  const switchMode = (m: "memory" | "redo") => {
    setMode(m);
    setChosen(null);
    setRedoResult(null);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const r = await fetch(
        `/api/student/wrong-questions/${item.wrongQuestionId}/redo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chosen }),
        },
      );
      const json = await r.json();
      if (json.ok) {
        setRedoResult({
          isCorrect: json.data.isCorrect,
          redoCount: json.data.redoCount,
        });
        onUpdate({
          redoCount: json.data.redoCount,
          lastResult: json.data.isCorrect,
        });
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = (() => {
    if (chosen == null) return false;
    if (Array.isArray(chosen)) {
      if (chosen.length === 0) return false;
      if (item.type === "FILL_BLANK")
        return (chosen as string[]).some((s) => s.trim() !== "");
    }
    return true;
  })();

  return (
    <div className="slide-down border-t border-outline-variant/12 px-4 pb-4 pt-3.5">
      {/* Mode toggle */}
      <div
        className="mb-4 flex gap-1 rounded-2xl p-1"
        style={{ background: "rgba(193,198,215,0.18)" }}
      >
        {(["memory", "redo"] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className="flex-1 rounded-xl py-1.5 text-[13px] font-medium transition-all duration-200"
            style={{
              background: mode === m ? "#fff" : "transparent",
              color: mode === m ? "#181c23" : "#717786",
              boxShadow:
                mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {m === "memory" ? "记忆模式" : "重做模式"}
          </button>
        ))}
      </div>

      {/* Stem */}
      {item.type === "FILL_BLANK" ? (
        mode === "memory" ? (
          <p className="mb-4 text-[15px] leading-relaxed text-on-surface">
            {item.stem.replace(BLANK_RE, "____")}
          </p>
        ) : (
          <FillBlankStem
            stem={item.stem}
            chosen={chosen as string[] | null}
            onChange={setChosen}
          />
        )
      ) : (
        <p className="mb-4 text-[15px] leading-relaxed text-on-surface">
          {item.stem}
        </p>
      )}

      {mode === "memory" ? (
        <MemoryView item={item} />
      ) : redoResult ? (
        <RedoResultBanner
          isCorrect={redoResult.isCorrect}
          redoCount={redoResult.redoCount}
          item={item}
          onRetry={() => {
            setRedoResult(null);
            setChosen(null);
          }}
        />
      ) : (
        <RedoView
          item={item}
          chosen={chosen}
          onChange={setChosen}
          canSubmit={canSubmit}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

// ─── Memory Mode ──────────────────────────────────────────────────────────────

function MemoryView({ item }: { item: WrongQuestionItem }) {
  if (item.type === "FILL_BLANK") {
    const blanks = item.answer as string[][];
    return (
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-secondary">
          正确答案
        </p>
        <div className="flex flex-col gap-1.5">
          {blanks.map((accepts, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-xl px-3 py-2"
              style={{ background: "rgba(52,199,89,0.08)" }}
            >
              <span className="flex-shrink-0 text-[12px] text-secondary">
                空{i + 1}:
              </span>
              <div>
                <span className="text-[14px] font-medium text-on-surface">
                  {accepts[0]}
                </span>
                {accepts.length > 1 && (
                  <span className="ml-1.5 text-[12px] text-secondary">
                    (也可: {accepts.slice(1).join("、")})
                  </span>
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
          {(
            [
              { key: "T", label: "正确", mark: "✓", color: "#34c759" },
              { key: "F", label: "错误", mark: "✗", color: "#ff3b30" },
            ] as const
          ).map((opt) => {
            const isCorrect = opt.key === correct;
            return (
              <div
                key={opt.key}
                className="flex flex-1 flex-col items-center gap-2 rounded-2xl py-4"
                style={{
                  background: isCorrect
                    ? `${opt.color}12`
                    : "rgba(193,198,215,0.1)",
                  border: `1.5px solid ${isCorrect ? `${opt.color}35` : "rgba(193,198,215,0.25)"}`,
                }}
              >
                <span
                  className="text-[28px] font-bold leading-none"
                  style={{ color: isCorrect ? opt.color : "#c1c6d7" }}
                >
                  {opt.mark}
                </span>
                <span
                  className="text-[14px] font-semibold"
                  style={{ color: isCorrect ? opt.color : "#c1c6d7" }}
                >
                  {opt.label}
                </span>
                {isCorrect && (
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: opt.color }}
                  >
                    ✓ 正确答案
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {item.analysis && <AnalysisBox analysis={item.analysis} />}
      </div>
    );
  }

  // Single / Multiple choice
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
                background: isCorrect
                  ? "rgba(52,199,89,0.07)"
                  : "transparent",
                border: `1.5px solid ${isCorrect ? "rgba(52,199,89,0.28)" : "rgba(193,198,215,0.3)"}`,
              }}
            >
              <span
                className="mt-0.5 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                style={{
                  background: isCorrect
                    ? "#34c759"
                    : "rgba(113,119,134,0.1)",
                  color: isCorrect ? "#fff" : "#717786",
                }}
              >
                {isCorrect ? "✓" : opt.key}
              </span>
              <span className="text-[14px] leading-snug text-on-surface">
                {opt.text}
              </span>
            </div>
          );
        })}
      </div>
      {item.analysis && <AnalysisBox analysis={item.analysis} />}
    </div>
  );
}

// ─── Redo Mode ────────────────────────────────────────────────────────────────

function RedoView({
  item,
  chosen,
  onChange,
  canSubmit,
  submitting,
  onSubmit,
}: {
  item: WrongQuestionItem;
  chosen: unknown;
  onChange: (v: unknown) => void;
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: () => void;
}) {
  if (item.type === "SINGLE_CHOICE") {
    const sel = (chosen as string[] | null)?.[0] ?? null;
    return (
      <div>
        <div className="flex flex-col gap-2">
          {(item.options ?? []).map((opt) => {
            const active = sel === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => onChange([opt.key])}
                className="flex items-start gap-3 rounded-xl p-3 text-left transition-all duration-150 active:scale-[0.98]"
                style={{
                  background: active
                    ? "rgba(0,122,255,0.06)"
                    : "rgba(255,255,255,0.6)",
                  border: `1.5px solid ${active ? "#007aff" : "rgba(193,198,215,0.4)"}`,
                  boxShadow: active
                    ? "0 0 0 3px rgba(0,122,255,0.07)"
                    : "none",
                }}
              >
                <span
                  className="mt-0.5 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-150"
                  style={{
                    background: active
                      ? "#007aff"
                      : "rgba(113,119,134,0.1)",
                    color: active ? "#fff" : "#575f66",
                  }}
                >
                  {opt.key}
                </span>
                <span className="text-[14px] leading-snug text-on-surface">
                  {opt.text}
                </span>
              </button>
            );
          })}
        </div>
        <SubmitButton
          canSubmit={canSubmit}
          submitting={submitting}
          onSubmit={onSubmit}
        />
      </div>
    );
  }

  if (item.type === "MULTIPLE_CHOICE") {
    const sel = new Set((chosen as string[] | null) ?? []);
    const toggle = (key: string) => {
      const next = new Set(sel);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      onChange(next.size ? [...next] : null);
    };
    return (
      <div>
        <p className="mb-2 text-[12px] font-medium text-secondary">可多选</p>
        <div className="flex flex-col gap-2">
          {(item.options ?? []).map((opt) => {
            const active = sel.has(opt.key);
            return (
              <button
                key={opt.key}
                onClick={() => toggle(opt.key)}
                className="flex items-start gap-3 rounded-xl p-3 text-left transition-all duration-150 active:scale-[0.98]"
                style={{
                  background: active
                    ? "rgba(0,122,255,0.06)"
                    : "rgba(255,255,255,0.6)",
                  border: `1.5px solid ${active ? "#007aff" : "rgba(193,198,215,0.4)"}`,
                  boxShadow: active
                    ? "0 0 0 3px rgba(0,122,255,0.07)"
                    : "none",
                }}
              >
                <span
                  className="mt-0.5 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-[7px] text-[11px] font-bold transition-all duration-150"
                  style={{
                    background: active
                      ? "#007aff"
                      : "rgba(113,119,134,0.1)",
                    color: active ? "#fff" : "#575f66",
                  }}
                >
                  {active ? "✓" : opt.key}
                </span>
                <span className="text-[14px] leading-snug text-on-surface">
                  {opt.text}
                </span>
              </button>
            );
          })}
        </div>
        <SubmitButton
          canSubmit={canSubmit}
          submitting={submitting}
          onSubmit={onSubmit}
        />
      </div>
    );
  }

  if (item.type === "TRUE_FALSE") {
    const sel = (chosen as string[] | null)?.[0] ?? null;
    return (
      <div>
        <div className="mb-4 flex gap-3">
          {(
            [
              { key: "T", label: "正确", mark: "✓", color: "#34c759" },
              { key: "F", label: "错误", mark: "✗", color: "#ff3b30" },
            ] as const
          ).map((opt) => {
            const active = sel === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => onChange([opt.key])}
                className="flex flex-1 flex-col items-center gap-2 rounded-2xl py-5 transition-all duration-150 active:scale-[0.97]"
                style={{
                  background: active
                    ? `${opt.color}14`
                    : "rgba(255,255,255,0.6)",
                  border: `1.5px solid ${active ? opt.color : "rgba(193,198,215,0.4)"}`,
                  boxShadow: active
                    ? `0 0 0 3px ${opt.color}18`
                    : "none",
                }}
              >
                <span
                  className="text-[28px] font-bold leading-none transition-colors duration-150"
                  style={{ color: active ? opt.color : "#c1c6d7" }}
                >
                  {opt.mark}
                </span>
                <span
                  className="text-[14px] font-semibold transition-colors duration-150"
                  style={{ color: active ? opt.color : "#575f66" }}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
        <SubmitButton
          canSubmit={canSubmit}
          submitting={submitting}
          onSubmit={onSubmit}
        />
      </div>
    );
  }

  // FILL_BLANK — stem is rendered by parent in redo mode
  return (
    <div>
      <SubmitButton
        canSubmit={canSubmit}
        submitting={submitting}
        onSubmit={onSubmit}
      />
    </div>
  );
}

// ─── Fill Blank Stem (interactive) ───────────────────────────────────────────

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
    <p className="mb-4 text-[15px] leading-[2.2] text-on-surface">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < blankCount && (
            <input
              type="text"
              value={vals[i] ?? ""}
              onChange={(e) => update(i, e.target.value)}
              placeholder={`第${i + 1}空`}
              className="mx-1.5 inline-block w-24 min-w-0 border-0 border-b-2 bg-transparent px-1 pb-0 pt-0.5 text-[15px] font-medium text-primary outline-none transition-colors placeholder:text-outline-variant/60 focus:border-primary"
              style={{
                borderColor:
                  vals[i]?.trim() ? "#007aff" : "#c1c6d7",
              }}
            />
          )}
        </Fragment>
      ))}
    </p>
  );
}

// ─── Redo Result Banner ───────────────────────────────────────────────────────

function RedoResultBanner({
  isCorrect,
  redoCount,
  item,
  onRetry,
}: {
  isCorrect: boolean;
  redoCount: number;
  item: WrongQuestionItem;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Result banner */}
      <div
        className="result-pop flex items-center gap-3 rounded-2xl px-4 py-3.5"
        style={{
          background: isCorrect
            ? "rgba(52,199,89,0.1)"
            : "rgba(255,59,48,0.08)",
          border: `1.5px solid ${isCorrect ? "rgba(52,199,89,0.3)" : "rgba(255,59,48,0.22)"}`,
        }}
      >
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[18px] font-bold"
          style={{
            background: isCorrect
              ? "rgba(52,199,89,0.15)"
              : "rgba(255,59,48,0.12)",
            color: isCorrect ? "#34c759" : "#ff3b30",
          }}
        >
          {isCorrect ? "✓" : "✗"}
        </span>
        <div>
          <p
            className="text-[15px] font-semibold"
            style={{ color: isCorrect ? "#34c759" : "#ff3b30" }}
          >
            {isCorrect ? "回答正确！" : "回答错误"}
          </p>
          <p className="text-[12px] text-secondary">
            已重做 {redoCount} 次
          </p>
        </div>
        {!isCorrect && (
          <button
            onClick={onRetry}
            className="ml-auto rounded-full px-3 py-1.5 text-[13px] font-medium text-primary transition-all hover:bg-primary/10 active:scale-95"
          >
            再试
          </button>
        )}
      </div>

      {/* Show correct answer on failure */}
      {!isCorrect && <MemoryView item={item} />}
    </div>
  );
}

// ─── Submit Button ────────────────────────────────────────────────────────────

function SubmitButton({
  canSubmit,
  submitting,
  onSubmit,
}: {
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <button
      onClick={onSubmit}
      disabled={!canSubmit || submitting}
      className="mt-4 w-full rounded-full py-3 text-[15px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40"
      style={{
        background: canSubmit && !submitting ? "#007aff" : "#007aff",
        boxShadow:
          canSubmit && !submitting
            ? "0 2px 16px rgba(0,122,255,0.3)"
            : "none",
      }}
    >
      {submitting ? "提交中..." : "确认作答"}
    </button>
  );
}

// ─── Analysis Box ─────────────────────────────────────────────────────────────

function AnalysisBox({ analysis }: { analysis: string }) {
  return (
    <div
      className="mt-3 rounded-xl px-3 py-2.5"
      style={{ background: "rgba(0,122,255,0.05)" }}
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-secondary">
        解析
      </p>
      <p className="text-[13px] leading-relaxed text-on-surface-variant">
        {analysis}
      </p>
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

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[120, 88, 104].map((h, i) => (
        <div
          key={i}
          className="animate-pulse rounded-3xl"
          style={{ height: h, background: "rgba(193,198,215,0.25)" }}
        />
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 pt-24 text-center">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-[28px] text-4xl"
        style={{ background: "rgba(52,199,89,0.1)" }}
      >
        🎉
      </div>
      <div>
        <p className="text-[20px] font-semibold text-on-surface">
          太棒了！
        </p>
        <p className="mt-1.5 text-[14px] text-secondary">
          暂无错题，继续保持！
        </p>
      </div>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 pt-24 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-3xl text-3xl"
        style={{ background: "rgba(255,59,48,0.1)" }}
      >
        ⚠️
      </div>
      <p className="text-[15px] text-secondary">{message}</p>
    </div>
  );
}
