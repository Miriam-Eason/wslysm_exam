"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type QType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK";

interface ExamQuestion {
  id: number;
  order: number;
  type: QType;
  stem: string;
  options: { key: string; text: string }[] | null;
  score: number;
}

interface AttemptData {
  attemptId: number;
  examId: number;
  examName: string;
  examType: "EXAM" | "PRACTICE";
  timeLimitSec: number | null;
  elapsedSec: number;
  questions: ExamQuestion[];
  drafts: Record<string, unknown>;
}

type Answers = Record<number, unknown>; // examQuestionId → chosen

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BLANK_RE = /_{4}|\{\{[\d]+\}\}/g;

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function isAnswered(q: ExamQuestion, answers: Answers): boolean {
  const c = answers[q.id];
  if (c == null) return false;
  if (!Array.isArray(c)) return false;
  if (c.length === 0) return false;
  if (q.type === "FILL_BLANK") return (c as string[]).some((s) => s.trim() !== "");
  return true;
}

function initFillBlanks(q: ExamQuestion): string[] {
  const n = (q.stem.match(BLANK_RE) ?? []).length;
  return Array<string>(n).fill("");
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ExamClient({ examId }: { examId: number }) {
  const router = useRouter();
  const [data, setData] = useState<AttemptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [elapsed, setElapsed] = useState(0);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [showGrid, setShowGrid] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const elapsedRef = useRef(0);
  const answersRef = useRef<Answers>({});
  const attemptIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const periodicRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSubmitted = useRef(false);
  const doSubmitRef = useRef<() => Promise<void>>(async () => {});

  // ── Load exam ──────────────────────────────────────────────────────────────

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/student/exams/${examId}/attempt`, { method: "POST" })
      .then(async (r) => {
        const json = await r.json();
        if (!json.ok) {
          setError(json.error?.message ?? "无法加载考试");
          return;
        }
        const d: AttemptData = json.data;
        const init: Answers = {};
        for (const [k, v] of Object.entries(d.drafts)) {
          init[Number(k)] = v;
        }
        // Initialize fill blank blanks
        for (const q of d.questions) {
          if (q.type === "FILL_BLANK" && init[q.id] == null) {
            init[q.id] = initFillBlanks(q);
          }
        }
        setData(d);
        setAnswers(init);
        answersRef.current = init;
        elapsedRef.current = d.elapsedSec;
        setElapsed(d.elapsedSec);
        attemptIdRef.current = d.attemptId;
      })
      .catch(() => setError("网络错误，请重试"))
      .finally(() => setLoading(false));
  }, [examId]);

  useEffect(() => { load(); }, [load]);

  // ── Submit logic ───────────────────────────────────────────────────────────

  const doSubmit = useCallback(async () => {
    if (!data || !attemptIdRef.current) return;
    setSubmitting(true);
    setShowSubmit(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (periodicRef.current) clearInterval(periodicRef.current);

    const payload = data.questions.map((q) => ({
      examQuestionId: q.id,
      chosen: answersRef.current[q.id] ?? null,
    }));
    try {
      const r = await fetch(
        `/api/student/attempts/${attemptIdRef.current}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: payload, elapsedSec: elapsedRef.current }),
        },
      );
      const json = await r.json();
      if (json.ok) {
        router.push(`/student/exams/${examId}/result?attemptId=${attemptIdRef.current}`);
      } else {
        setError(json.error?.message ?? "提交失败，请重试");
        setSubmitting(false);
      }
    } catch {
      setError("网络错误，请重试");
      setSubmitting(false);
    }
  }, [data, examId, router]);

  useEffect(() => { doSubmitRef.current = doSubmit; }, [doSubmit]);

  // ── Timer ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!data) return;
    // Check if already expired on load
    if (data.timeLimitSec !== null && elapsedRef.current >= data.timeLimitSec) {
      if (!autoSubmitted.current) {
        autoSubmitted.current = true;
        doSubmitRef.current();
      }
      return;
    }
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      if (
        data.timeLimitSec !== null &&
        elapsedRef.current >= data.timeLimitSec &&
        !autoSubmitted.current
      ) {
        autoSubmitted.current = true;
        doSubmitRef.current();
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [data]);

  // ── Periodic save ──────────────────────────────────────────────────────────

  const saveDraft = useCallback(async () => {
    if (!attemptIdRef.current) return;
    const payload = Object.entries(answersRef.current)
      .filter(([, v]) => v != null)
      .map(([qId, chosen]) => ({ examQuestionId: Number(qId), chosen }));
    await fetch(`/api/student/attempts/${attemptIdRef.current}/save`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: payload, elapsedSec: elapsedRef.current }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!data) return;
    periodicRef.current = setInterval(saveDraft, 15000);
    return () => { if (periodicRef.current) clearInterval(periodicRef.current); };
  }, [data, saveDraft]);

  // ── Answer handling ────────────────────────────────────────────────────────

  const setAnswer = useCallback(
    (questionId: number, chosen: unknown) => {
      setAnswers((prev) => {
        const next = { ...prev, [questionId]: chosen };
        answersRef.current = next;
        return next;
      });
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(saveDraft, 500);
    },
    [saveDraft],
  );

  const goTo = useCallback((index: number) => {
    setIdx(index);
    setShowGrid(false);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onBack={() => router.push("/student")} onRetry={load} />;
  if (!data) return null;

  const q = data.questions[idx];
  const total = data.questions.length;
  const answeredCount = data.questions.filter((q) => isAnswered(q, answers)).length;
  const unansweredCount = total - answeredCount;
  const isCountdown = data.timeLimitSec !== null;
  const remaining = isCountdown ? Math.max(0, data.timeLimitSec! - elapsed) : null;
  const timerDisplay = isCountdown ? formatTime(remaining!) : formatTime(elapsed);
  const timerUrgent = isCountdown && remaining !== null && remaining < 300;

  return (
    <>
      <style>{`
        @keyframes qFadeIn {
          from { opacity: 0; transform: translateY(8px) scale(0.996); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .q-enter { animation: qFadeIn 0.25s cubic-bezier(0.34,1.15,0.64,1) both; }
        @keyframes sheetUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        .sheet-up { animation: sheetUp 0.28s cubic-bezier(0.34,1.1,0.64,1) both; }
      `}</style>

      <div className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col">

        {/* ── Top App Bar ──────────────────────────────────────────────────── */}
        <header
          className="fixed left-1/2 top-0 z-50 w-full max-w-[430px] -translate-x-1/2"
          style={{
            background: "rgba(241,243,254,0.9)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderBottom: "1px solid rgba(193,198,215,0.25)",
          }}
        >
          <div className="flex h-14 items-center px-3">
            <button
              onClick={() => { saveDraft(); router.push("/student"); }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-primary transition-all hover:bg-primary/10 active:scale-90"
            >
              <IcoChevLeft size={20} />
            </button>
            <h1 className="absolute left-1/2 w-[55%] -translate-x-1/2 truncate text-center text-[17px] font-semibold text-on-surface">
              {data.examName}
            </h1>
            <button
              onClick={() => setShowSubmit(true)}
              disabled={submitting}
              className="ml-auto rounded-full px-3.5 py-1.5 text-[15px] font-semibold text-primary transition-all hover:bg-primary/10 active:scale-95 disabled:opacity-40"
            >
              交卷
            </button>
          </div>
        </header>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <main className="flex flex-1 flex-col gap-3 px-5 pb-36 pt-[72px]">

          {/* Progress + timer row */}
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[13px] text-secondary">
              第{" "}
              <span className="font-semibold text-on-surface">{idx + 1}</span>
              {" "}/ {total} 题
            </span>
            <span
              className="flex items-center gap-1 tabular-nums text-[13px] font-medium transition-colors duration-300"
              style={{ color: timerUrgent ? "#ff3b30" : "#575f66" }}
            >
              {isCountdown
                ? <IcoAlarm size={14} urgent={timerUrgent} />
                : <IcoTimer size={14} />
              }
              {timerDisplay}
            </span>
          </div>

          {/* Thin progress track */}
          <div className="h-1 overflow-hidden rounded-full bg-outline-variant/25">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${((idx + 1) / total) * 100}%` }}
            />
          </div>

          {/* Question card */}
          <div
            key={idx}
            className="q-enter rounded-3xl p-5 sm:p-6"
            style={{
              background: "rgba(255,255,255,0.8)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.7)",
              boxShadow:
                "0 4px 32px -4px rgba(0,122,255,0.08), " +
                "0 1px 0 rgba(255,255,255,0.9) inset",
            }}
          >
            {/* Card header */}
            <div className="mb-4 flex items-center gap-2">
              <TypeBadge type={q.type} />
              <span className="text-[12px] font-medium text-secondary">
                {q.score} 分
              </span>
            </div>

            {/* Stem */}
            {q.type === "FILL_BLANK" ? (
              <FillBlankRenderer
                q={q}
                chosen={answers[q.id] as string[] | undefined}
                onChange={(v) => setAnswer(q.id, v)}
              />
            ) : (
              <p className="mb-5 text-[17px] leading-[1.65] text-on-surface">
                {q.stem}
              </p>
            )}

            {/* Options */}
            {q.type === "SINGLE_CHOICE" && q.options && (
              <SingleChoiceOpts
                options={q.options}
                chosen={answers[q.id] as string[] | undefined}
                onChange={(v) => setAnswer(q.id, v)}
              />
            )}
            {q.type === "MULTIPLE_CHOICE" && q.options && (
              <MultipleChoiceOpts
                options={q.options}
                chosen={answers[q.id] as string[] | undefined}
                onChange={(v) => setAnswer(q.id, v)}
              />
            )}
            {q.type === "TRUE_FALSE" && (
              <TrueFalseOpts
                chosen={answers[q.id] as string[] | undefined}
                onChange={(v) => setAnswer(q.id, v)}
              />
            )}
          </div>

          {/* Flag tool */}
          <div className="flex justify-end px-0.5">
            <button
              onClick={() =>
                setFlagged((prev) => {
                  const next = new Set(prev);
                  if (next.has(q.id)) next.delete(q.id);
                  else next.add(q.id);
                  return next;
                })
              }
              className="flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-[13px] transition-all duration-200 active:scale-95"
              style={{
                background: flagged.has(q.id) ? "rgba(255,149,0,0.1)" : "rgba(87,95,102,0.07)",
                color: flagged.has(q.id) ? "#ff9500" : "#717786",
              }}
            >
              <IcoFlag filled={flagged.has(q.id)} />
              {flagged.has(q.id) ? "已标记" : "标记"}
            </button>
          </div>
        </main>

        {/* ── Bottom Nav ───────────────────────────────────────────────────── */}
        <nav
          className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 rounded-t-3xl"
          style={{
            background: "rgba(241,243,254,0.92)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderTop: "1px solid rgba(193,198,215,0.22)",
            boxShadow: "0 -6px 28px rgba(0,0,0,0.05)",
          }}
        >
          <div className="flex items-center justify-between px-5 py-3.5">
            <button
              disabled={idx === 0}
              onClick={() => goTo(idx - 1)}
              className="flex h-13 items-center gap-1 rounded-full border border-outline-variant/30 bg-white/60 px-4 text-[14px] font-medium text-on-surface-variant transition-all active:scale-95 disabled:opacity-25"
            >
              <IcoChevLeft size={16} />
              上一题
            </button>

            <button
              onClick={() => setShowGrid(true)}
              className="flex flex-col items-center gap-0.5 rounded-full px-3 py-2 text-secondary transition-colors hover:bg-surface-container active:scale-90"
            >
              <IcoGrid />
              <span className="text-[10px]">{answeredCount}/{total}</span>
            </button>

            {idx < total - 1 ? (
              <button
                onClick={() => goTo(idx + 1)}
                className="flex h-13 items-center gap-1 rounded-full px-6 text-[14px] font-semibold text-white transition-all active:scale-95"
                style={{
                  background: "#007aff",
                  boxShadow: "0 2px 16px rgba(0,122,255,0.32)",
                }}
              >
                下一题
                <IcoChevRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => setShowSubmit(true)}
                disabled={submitting}
                className="flex h-13 items-center gap-1.5 rounded-full px-6 text-[14px] font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
                style={{
                  background: "#34c759",
                  boxShadow: "0 2px 16px rgba(52,199,89,0.32)",
                }}
              >
                提交
                <IcoCheck />
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* ── Question Grid Sheet ──────────────────────────────────────────── */}
      {showGrid && (
        <QuestionGridSheet
          questions={data.questions}
          answers={answers}
          flagged={flagged}
          currentIdx={idx}
          onSelect={goTo}
          onClose={() => setShowGrid(false)}
        />
      )}

      {/* ── Submit Dialog ────────────────────────────────────────────────── */}
      {showSubmit && (
        <SubmitSheet
          unanswered={unansweredCount}
          flaggedCount={flagged.size}
          onConfirm={doSubmit}
          onCancel={() => setShowSubmit(false)}
          submitting={submitting}
        />
      )}

      {/* ── Submitting Overlay ───────────────────────────────────────────── */}
      {submitting && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "rgba(241,243,254,0.8)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <p className="text-[15px] text-secondary">正在提交...</p>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Screens ──────────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col items-center justify-center gap-4">
      <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-primary/15 border-t-primary" />
      <p className="text-[14px] text-secondary">加载中...</p>
    </div>
  );
}

function ErrorScreen({
  message,
  onBack,
  onRetry,
}: {
  message: string;
  onBack: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col items-center justify-center gap-5 px-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-danger-container text-3xl">
        ⚠️
      </div>
      <div>
        <p className="text-[17px] font-semibold text-on-surface">出错了</p>
        <p className="mt-1 text-[14px] text-secondary">{message}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="rounded-full border border-outline-variant px-5 py-2.5 text-[14px] font-medium text-secondary transition-colors hover:bg-surface-container"
        >
          返回列表
        </button>
        <button
          onClick={onRetry}
          className="rounded-full bg-primary px-5 py-2.5 text-[14px] font-semibold text-white transition-all hover:bg-primary/90 active:scale-95"
          style={{ boxShadow: "0 2px 12px rgba(0,122,255,0.28)" }}
        >
          重试
        </button>
      </div>
    </div>
  );
}

// ─── Type badge ───────────────────────────────────────────────────────────────

const TYPE_MAP: Record<QType, string> = {
  SINGLE_CHOICE: "单选",
  MULTIPLE_CHOICE: "多选",
  TRUE_FALSE: "判断",
  FILL_BLANK: "填空",
};

function TypeBadge({ type }: { type: QType }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ color: "#004493", background: "rgba(0,68,147,0.07)" }}
    >
      {TYPE_MAP[type]}
    </span>
  );
}

// ─── Single Choice ────────────────────────────────────────────────────────────

function SingleChoiceOpts({
  options,
  chosen,
  onChange,
}: {
  options: { key: string; text: string }[];
  chosen: string[] | undefined;
  onChange: (v: string[]) => void;
}) {
  const sel = chosen?.[0] ?? null;
  return (
    <div className="flex flex-col gap-2.5">
      {options.map((opt) => {
        const active = sel === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange([opt.key])}
            className="flex items-start gap-3.5 rounded-2xl p-4 text-left transition-all duration-200 active:scale-[0.98]"
            style={{
              background: active ? "rgba(0,122,255,0.05)" : "rgba(255,255,255,0.65)",
              border: `1.5px solid ${active ? "#007aff" : "rgba(193,198,215,0.45)"}`,
              boxShadow: active ? "0 0 0 3px rgba(0,122,255,0.08)" : "none",
            }}
          >
            <span
              className="mt-0.5 flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-all duration-200"
              style={{
                background: active ? "#007aff" : "rgba(113,119,134,0.1)",
                color: active ? "#fff" : "#575f66",
              }}
            >
              {opt.key}
            </span>
            <span className="flex-1 text-[15px] leading-relaxed text-on-surface">
              {opt.text}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Multiple Choice ──────────────────────────────────────────────────────────

function MultipleChoiceOpts({
  options,
  chosen,
  onChange,
}: {
  options: { key: string; text: string }[];
  chosen: string[] | undefined;
  onChange: (v: string[] | null) => void;
}) {
  const sel = new Set(chosen ?? []);
  const toggle = (key: string) => {
    const next = new Set(sel);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    const arr = [...next];
    onChange(arr.length ? arr : null);
  };
  return (
    <div className="flex flex-col gap-2.5">
      <p className="mb-1 text-[12px] font-medium text-secondary">可多选</p>
      {options.map((opt) => {
        const active = sel.has(opt.key);
        return (
          <button
            key={opt.key}
            onClick={() => toggle(opt.key)}
            className="flex items-start gap-3.5 rounded-2xl p-4 text-left transition-all duration-200 active:scale-[0.98]"
            style={{
              background: active ? "rgba(0,122,255,0.05)" : "rgba(255,255,255,0.65)",
              border: `1.5px solid ${active ? "#007aff" : "rgba(193,198,215,0.45)"}`,
              boxShadow: active ? "0 0 0 3px rgba(0,122,255,0.08)" : "none",
            }}
          >
            <span
              className="mt-0.5 flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[8px] text-[12px] font-bold transition-all duration-200"
              style={{
                background: active ? "#007aff" : "rgba(113,119,134,0.1)",
                color: active ? "#fff" : "#575f66",
              }}
            >
              {active ? "✓" : opt.key}
            </span>
            <span className="flex-1 text-[15px] leading-relaxed text-on-surface">
              {opt.text}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── True / False ─────────────────────────────────────────────────────────────

function TrueFalseOpts({
  chosen,
  onChange,
}: {
  chosen: string[] | undefined;
  onChange: (v: string[]) => void;
}) {
  const sel = chosen?.[0] ?? null;
  return (
    <div className="flex gap-3">
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
            className="flex flex-1 flex-col items-center gap-2.5 rounded-3xl py-6 transition-all duration-200 active:scale-[0.97]"
            style={{
              background: active ? `${opt.color}14` : "rgba(255,255,255,0.65)",
              border: `1.5px solid ${active ? opt.color : "rgba(193,198,215,0.4)"}`,
              boxShadow: active ? `0 0 0 3px ${opt.color}18` : "none",
            }}
          >
            <span
              className="text-3xl font-bold leading-none transition-colors duration-200"
              style={{ color: active ? opt.color : "#c1c6d7" }}
            >
              {opt.mark}
            </span>
            <span
              className="text-[16px] font-semibold transition-colors duration-200"
              style={{ color: active ? opt.color : "#575f66" }}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Fill Blank ───────────────────────────────────────────────────────────────

function FillBlankRenderer({
  q,
  chosen,
  onChange,
}: {
  q: ExamQuestion;
  chosen: string[] | undefined;
  onChange: (v: string[]) => void;
}) {
  const parts = q.stem.split(BLANK_RE);
  const blankCount = parts.length - 1;
  const vals = chosen ?? Array<string>(blankCount).fill("");

  const update = (i: number, val: string) => {
    const next = [...vals];
    while (next.length < blankCount) next.push("");
    next[i] = val;
    onChange(next);
  };

  return (
    <div className="mb-5 text-[17px] leading-[2] text-on-surface">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < blankCount && (
            <input
              type="text"
              value={vals[i] ?? ""}
              onChange={(e) => update(i, e.target.value)}
              placeholder={`第${i + 1}空`}
              className="mx-1.5 inline-block w-28 min-w-0 border-0 border-b-2 bg-transparent px-1 pb-0 pt-0.5 text-[17px] font-medium text-primary outline-none transition-all duration-200 placeholder:text-outline-variant/60 focus:border-primary"
              style={{ borderColor: vals[i]?.trim() ? "#007aff" : "#c1c6d7" }}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}

// ─── Question Grid Sheet ──────────────────────────────────────────────────────

function QuestionGridSheet({
  questions,
  answers,
  flagged,
  currentIdx,
  onSelect,
  onClose,
}: {
  questions: ExamQuestion[];
  answers: Answers;
  flagged: Set<number>;
  currentIdx: number;
  onSelect: (i: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: "rgba(24,28,35,0.55)" }}
      onClick={onClose}
    >
      <div
        className="sheet-up mx-auto w-full max-w-[430px] rounded-t-3xl px-5 pb-10 pt-5"
        style={{ background: "#f9f9ff" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-outline-variant/40" />

        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[18px] font-semibold text-on-surface">题目导航</h3>
          <div className="flex items-center gap-3 text-[12px] text-secondary">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-[4px] bg-primary" />
              已答
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-[4px] bg-warning" />
              标记
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-[4px] bg-outline-variant/40" />
              未答
            </span>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2">
          {questions.map((q, i) => {
            const answered = isAnswered(q, answers);
            const isFlagged = flagged.has(q.id);
            const isCurrent = i === currentIdx;
            let bg = "rgba(193,198,215,0.25)";
            let color = "#717786";
            if (isFlagged) { bg = "rgba(255,149,0,0.15)"; color = "#ff9500"; }
            if (answered) { bg = "rgba(0,122,255,0.1)"; color = "#007aff"; }
            if (isCurrent) { bg = "#007aff"; color = "#fff"; }

            return (
              <button
                key={q.id}
                onClick={() => onSelect(i)}
                className="flex aspect-square items-center justify-center rounded-[14px] text-[14px] font-semibold transition-all duration-150 active:scale-90"
                style={{
                  background: bg,
                  color,
                  boxShadow: isCurrent ? "0 2px 10px rgba(0,122,255,0.25)" : "none",
                  outline: isCurrent ? "2px solid rgba(0,122,255,0.3)" : "none",
                  outlineOffset: "1px",
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

// ─── Submit Sheet ─────────────────────────────────────────────────────────────

function SubmitSheet({
  unanswered,
  flaggedCount,
  onConfirm,
  onCancel,
  submitting,
}: {
  unanswered: number;
  flaggedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: "rgba(24,28,35,0.45)" }}
      onClick={onCancel}
    >
      <div
        className="sheet-up mx-auto w-full max-w-[430px] rounded-t-3xl px-5 pb-10 pt-5"
        style={{ background: "#f9f9ff" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-outline-variant/40" />

        <h3 className="text-[20px] font-semibold text-on-surface">确认交卷</h3>

        <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-surface-container p-4">
          {unanswered > 0 && (
            <div className="flex items-center gap-2 text-[14px]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning/20 text-[11px] font-bold text-warning">!</span>
              <span className="text-on-surface">
                还有{" "}
                <span className="font-semibold text-warning">{unanswered}</span>{" "}
                道题未作答
              </span>
            </div>
          )}
          {flaggedCount > 0 && (
            <div className="flex items-center gap-2 text-[14px]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning/20 text-[11px] font-bold text-warning">⚑</span>
              <span className="text-on-surface">
                有{" "}
                <span className="font-semibold text-warning">{flaggedCount}</span>{" "}
                道题已标记待复查
              </span>
            </div>
          )}
          {unanswered === 0 && flaggedCount === 0 && (
            <div className="flex items-center gap-2 text-[14px] text-success">
              <span>✓</span>
              <span>全部题目已作答</span>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 rounded-full border border-outline-variant py-3.5 text-[15px] font-medium text-secondary transition-all hover:bg-surface-container active:scale-98"
          >
            继续作答
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 rounded-full py-3.5 text-[15px] font-semibold text-white transition-all active:scale-98 disabled:opacity-60"
            style={{
              background: "#007aff",
              boxShadow: "0 2px 16px rgba(0,122,255,0.3)",
            }}
          >
            {submitting ? "提交中..." : "确认交卷"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IcoChevLeft({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function IcoChevRight({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function IcoTimer({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IcoAlarm({ size = 16, urgent }: { size?: number; urgent?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={urgent ? "#ff3b30" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <polyline points="12 9 12 13 15 14" />
      <line x1="5" y1="3" x2="2" y2="6" />
      <line x1="19" y1="3" x2="22" y2="6" />
    </svg>
  );
}
function IcoGrid() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
function IcoFlag({ filled }: { filled: boolean }) {
  return filled ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}
function IcoCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
