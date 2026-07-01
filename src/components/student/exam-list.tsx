"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { StudentTabBar } from "@/components/student/student-tab-bar";

interface ExamItem {
  id: number;
  name: string;
  type: "EXAM" | "PRACTICE";
  questionCount: number;
  deadline: string | null;
  timeLimitSec: number | null;
  allowRepeat: boolean;
  repeatLimit: number | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";
  inProgressAttemptId: number | null;
  submittedCount: number;
  canRepeat: boolean;
  remaining: number | null;
  latestScore: number | null;
  createdAt: string;
}

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const hours = Math.floor(diff / 1000 / 3600);
  if (hours < 0) return "已截止";
  if (hours < 24) return `${hours} 小时后截止`;
  const days = Math.floor(hours / 24);
  return `${days} 天后截止`;
}

function formatTimeLimit(sec: number): string {
  const m = Math.floor(sec / 60);
  return m < 60 ? `${m} 分钟` : `${Math.floor(m / 60)} 小时 ${m % 60 ? (m % 60) + " 分" : ""}`;
}

export function StudentExamList({ studentName }: { studentName: string }) {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "exam" | "practice">("all");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/student/exams")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setExams(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    activeTab === "all"
      ? exams
      : activeTab === "exam"
        ? exams.filter((e) => e.type === "EXAM")
        : exams.filter((e) => e.type === "PRACTICE");

  const handleStart = (exam: ExamItem) => {
    router.push(`/student/exams/${exam.id}`);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b px-5 py-4"
        style={{
          background: "rgba(241,243,254,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderColor: "rgba(193,198,215,0.3)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-primary opacity-70">
              学生端
            </p>
            <h1 className="mt-0.5 text-[22px] font-semibold leading-7 text-on-surface">
              你好，{studentName}
            </h1>
          </div>
          <SignOutButton redirectTo="/student/login" />
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 rounded-2xl bg-surface-container-highest/50 p-1">
          {[
            { key: "all", label: "全部" },
            { key: "exam", label: "考试" },
            { key: "practice", label: "练习" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className="flex-1 rounded-xl py-2 text-[14px] font-medium transition-all duration-200"
              style={{
                background: activeTab === tab.key ? "#fff" : "transparent",
                color: activeTab === tab.key ? "#181c23" : "#575f66",
                boxShadow:
                  activeTab === tab.key
                    ? "0 1px 4px rgba(0,0,0,0.08)"
                    : "none",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 pb-28 pt-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-3xl bg-surface-container"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 pt-20 text-secondary">
            <span className="text-5xl">📋</span>
            <p className="text-[15px]">暂无可参加的考试/练习</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                onStart={() => handleStart(exam)}
              />
            ))}
          </div>
        )}
      </main>

      <StudentTabBar />
    </div>
  );
}

function ExamCard({
  exam,
  onStart,
}: {
  exam: ExamItem;
  onStart: () => void;
}) {
  const isPractice = exam.type === "PRACTICE";
  const canStart =
    exam.status === "NOT_STARTED" ||
    exam.status === "IN_PROGRESS" ||
    exam.canRepeat;

  const statusConfig = {
    NOT_STARTED: {
      label: "未开始",
      color: "#575f66",
      bg: "rgba(87,95,102,0.08)",
    },
    IN_PROGRESS: {
      label: "进行中",
      color: "#007aff",
      bg: "rgba(0,122,255,0.1)",
    },
    SUBMITTED: {
      label: "已完成",
      color: "#34c759",
      bg: "rgba(52,199,89,0.1)",
    },
  }[exam.status];

  const buttonLabel =
    exam.status === "IN_PROGRESS"
      ? "继续作答"
      : exam.status === "SUBMITTED" && exam.canRepeat
        ? "重新作答"
        : exam.status === "NOT_STARTED"
          ? isPractice
            ? "开始练习"
            : "开始考试"
          : "查看成绩";

  const buttonDisabled = exam.status === "SUBMITTED" && !exam.canRepeat;

  return (
    <div
      className="overflow-hidden rounded-3xl"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.6)",
        boxShadow: "0 2px 20px -2px rgba(0,122,255,0.06)",
      }}
    >
      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  color: isPractice ? "#9e3d00" : "#004493",
                  background: isPractice
                    ? "rgba(158,61,0,0.08)"
                    : "rgba(0,68,147,0.08)",
                }}
              >
                {isPractice ? "练习" : "考试"}
              </span>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ color: statusConfig.color, background: statusConfig.bg }}
              >
                {statusConfig.label}
              </span>
            </div>
            <h3 className="mt-2 text-[17px] font-semibold leading-snug text-on-surface line-clamp-2">
              {exam.name}
            </h3>
          </div>
          {exam.status === "SUBMITTED" && exam.latestScore !== null && (
            <div className="flex-shrink-0 flex flex-col items-center">
              <span className="text-[24px] font-bold leading-none text-primary">
                {exam.latestScore.toFixed(1)}
              </span>
              <span className="text-[10px] text-secondary mt-0.5">分</span>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-secondary">
          <span className="flex items-center gap-1">
            <QuestionIcon />
            {exam.questionCount} 题
          </span>
          {exam.timeLimitSec && (
            <span className="flex items-center gap-1">
              <TimerIcon />
              {formatTimeLimit(exam.timeLimitSec)}
            </span>
          )}
          {exam.deadline && (
            <span
              className="flex items-center gap-1"
              style={{
                color:
                  new Date(exam.deadline).getTime() - Date.now() < 86400000
                    ? "#ff3b30"
                    : undefined,
              }}
            >
              <CalendarIcon />
              {formatDeadline(exam.deadline)}
            </span>
          )}
          {exam.allowRepeat && exam.remaining !== null && (
            <span className="flex items-center gap-1">
              <RepeatIcon />
              剩余 {exam.remaining} 次
            </span>
          )}
        </div>

        {/* Action */}
        <div className="mt-4 flex items-center justify-between">
          {exam.status === "SUBMITTED" && exam.submittedCount > 0 && (
            <span className="text-[12px] text-secondary">
              已完成 {exam.submittedCount} 次
            </span>
          )}
          <div className="ml-auto">
            <button
              onClick={onStart}
              disabled={buttonDisabled}
              className="h-10 rounded-full px-5 text-[15px] font-semibold transition-all duration-200 active:scale-95"
              style={{
                background: buttonDisabled
                  ? "rgba(87,95,102,0.1)"
                  : "#007aff",
                color: buttonDisabled ? "#717786" : "#fff",
                cursor: buttonDisabled ? "not-allowed" : "pointer",
                boxShadow: buttonDisabled
                  ? "none"
                  : "0 2px 12px rgba(0,122,255,0.3)",
              }}
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionIcon() {
  return (
    <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
      <path d="M2.5 3a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1h-11zm0 4a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1h-11zm0 4a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1h-6z"/>
    </svg>
  );
}
function TimerIcon() {
  return (
    <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
      <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
      <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
    </svg>
  );
}
function RepeatIcon() {
  return (
    <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
      <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
      <path fillRule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
    </svg>
  );
}
