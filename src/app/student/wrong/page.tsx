"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StudentTabBar } from "@/components/student/student-tab-bar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WrongQuestionItem {
  wrongQuestionId: number;
  lastResult: boolean | null;
}

interface ExamGroup {
  examId: number;
  examName: string;
  questions: WrongQuestionItem[];
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WrongQuestionsPage() {
  const [groups, setGroups] = useState<ExamGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/student/wrong-questions")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setGroups(json.data);
        else setError(json.error?.message ?? "加载失败");
      })
      .catch(() => setError("网络错误，请重试"))
      .finally(() => setLoading(false));
  }, []);

  const totalWrong = groups.reduce((s, g) => s + g.questions.length, 0);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col">
      {/* Header */}
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
          <h1 className="text-[20px] font-semibold text-on-surface">错题本</h1>
          {!loading && totalWrong > 0 && (
            <span
              className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold"
              style={{ background: "rgba(255,59,48,0.1)", color: "#ff3b30" }}
            >
              {totalWrong} 道
            </span>
          )}
        </div>
      </header>

      {/* Content */}
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
              <ExamGroupCard
                key={group.examId}
                group={group}
                onClick={() => router.push(`/student/wrong/${group.examId}`)}
              />
            ))}
          </div>
        )}
      </main>

      <StudentTabBar />
    </div>
  );
}

// ─── Exam Group Card ──────────────────────────────────────────────────────────

function ExamGroupCard({
  group,
  onClick,
}: {
  group: ExamGroup;
  onClick: () => void;
}) {
  const masteredCount = group.questions.filter(
    (q) => q.lastResult === true,
  ).length;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 overflow-hidden rounded-3xl px-5 py-4 text-left transition-all duration-200 active:scale-[0.98]"
      style={{
        background: "rgba(255,255,255,0.78)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.65)",
        boxShadow: "0 2px 20px -2px rgba(0,90,200,0.07)",
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-semibold text-on-surface">
          {group.examName}
        </p>
        <p className="mt-0.5 text-[12px] text-secondary">
          {group.questions.length} 道错题
          {masteredCount > 0 && (
            <span className="ml-1.5" style={{ color: "#34c759" }}>
              · 已掌握 {masteredCount}
            </span>
          )}
        </p>
      </div>
      {/* Right-pointing chevron */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#c1c6d7"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

// ─── Loading / Empty / Error ──────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[80, 72, 80].map((h, i) => (
        <div
          key={i}
          className="animate-pulse rounded-3xl"
          style={{ height: h, background: "rgba(193,198,215,0.25)" }}
        />
      ))}
    </div>
  );
}

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
        <p className="text-[20px] font-semibold text-on-surface">太棒了！</p>
        <p className="mt-1.5 text-[14px] text-secondary">暂无错题，继续保持！</p>
      </div>
    </div>
  );
}

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
