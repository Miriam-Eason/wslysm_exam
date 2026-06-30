import type { ReactNode } from "react";

// 学生端统一壳：移动优先，430px 居中，背景渐变。
// 不做服务端鉴权——各页面自行调用 requireRole 或由 proxy.ts 覆盖。
export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse at 15% 15%, rgba(0,122,255,0.07) 0%, transparent 50%), " +
          "radial-gradient(ellipse at 85% 85%, rgba(0,122,255,0.05) 0%, transparent 50%), " +
          "#f1f3fe",
        backgroundAttachment: "fixed",
      }}
    >
      {children}
    </div>
  );
}
