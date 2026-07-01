import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ChangePasswordDialog } from "@/components/student/change-password-dialog";
import { StudentTabBar } from "@/components/student/student-tab-bar";

export default async function StudentMePage() {
  const session = await requireRole("student");
  const studentId = Number(session.user.id);

  const [student, wrongCount, attemptCount] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId }, select: { name: true, studentNo: true } }),
    prisma.wrongQuestion.count({ where: { studentId } }),
    prisma.attempt.count({ where: { studentId, status: "SUBMITTED" } }),
  ]);

  if (!student) return null;

  // Derive initials for avatar
  const initials = student.name.slice(0, 1);

  const stats = [
    { label: "完成考试", value: attemptCount, color: "#007aff", bg: "rgba(0,122,255,0.08)" },
    { label: "错题总数", value: wrongCount, color: "#ff3b30", bg: "rgba(255,59,48,0.08)" },
  ];

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
          <h1 className="text-[20px] font-semibold text-on-surface">我的</h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 pb-32 pt-6">

        {/* Profile card */}
        <div
          className="mb-5 flex flex-col items-center gap-4 rounded-3xl py-8"
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.65)",
            boxShadow: "0 2px 24px -4px rgba(0,90,200,0.08)",
          }}
        >
          {/* Avatar */}
          <div
            className="flex h-20 w-20 items-center justify-center rounded-[28px] text-[32px] font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #007aff 0%, #0058bc 100%)",
              boxShadow: "0 4px 20px rgba(0,122,255,0.32)",
            }}
          >
            {initials}
          </div>

          <div className="text-center">
            <p className="text-[22px] font-semibold text-on-surface">
              {student.name}
            </p>
            <p className="mt-1 text-[14px] text-secondary">
              学号 {student.studentNo}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center gap-1 rounded-2xl py-5"
              style={{
                background: "rgba(255,255,255,0.75)",
                border: "1px solid rgba(255,255,255,0.6)",
                boxShadow: "0 2px 12px -2px rgba(0,0,0,0.05)",
              }}
            >
              <span
                className="text-[32px] font-bold tabular-nums leading-none"
                style={{ color: s.color }}
              >
                {s.value}
              </span>
              <span className="text-[12px] text-secondary">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          className="mb-5 rounded-3xl px-5 py-4"
          style={{
            background: "rgba(255,255,255,0.72)",
            border: "1px solid rgba(255,255,255,0.6)",
          }}
        >
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-secondary">
            默认密码
          </p>
          <p className="text-[14px] text-on-surface-variant">
            如仍使用初始密码 <span className="font-mono font-semibold text-on-surface">wxls12345</span>，请联系老师修改。
          </p>
        </div>

        {/* Account actions */}
        <div className="flex flex-col gap-3">
          <ChangePasswordDialog />
          <SignOutButton
            redirectTo="/student/login"
            className="flex h-14 w-full items-center justify-center rounded-2xl text-[17px] font-semibold transition active:scale-[0.98]"
            style={{ background: "rgba(120,120,128,0.12)", color: "#ff3b30" }}
          />
        </div>
      </main>

      <StudentTabBar />
    </div>
  );
}
