"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/student", label: "练习", type: "practice" },
  { href: "/student/wrong", label: "错题本", type: "bookmark" },
  { href: "/student/me", label: "我的", type: "person" },
] as const;

export function StudentTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed z-50"
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 16px)",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
        borderRadius: "36px",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.5)",
        padding: "6px 8px",
        whiteSpace: "nowrap",
      }}
    >
      <div className="flex items-center gap-1">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-90"
              style={{
                background: active ? "rgba(0,122,255,0.10)" : "transparent",
                borderRadius: "20px",
                padding: "7px 18px",
                minWidth: "72px",
              }}
            >
              <TabIcon type={tab.type} active={active} />
              <span
                className="text-[10px] font-semibold leading-none"
                style={{ color: active ? "#007aff" : "#6b7280" }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function TabIcon({
  type,
  active,
}: {
  type: "practice" | "bookmark" | "person";
  active: boolean;
}) {
  const color = active ? "#007aff" : "#6b7280";
  if (type === "practice") {
    return active ? (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
      </svg>
    ) : (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    );
  }
  if (type === "bookmark") {
    return active ? (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ) : (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  // person
  return active ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ) : (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
