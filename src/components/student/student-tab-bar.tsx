"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/student", label: "考试", type: "exam" },
  { href: "/student/wrong", label: "错题本", type: "bookmark" },
  { href: "/student/me", label: "我的", type: "person" },
] as const;

export function StudentTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2"
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(193,198,215,0.3)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex h-[49px] items-stretch">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 transition-transform active:scale-90"
            >
              <TabIcon type={tab.type} active={active} />
              <span
                className="text-[10px] font-medium leading-none"
                style={{ color: active ? "#007aff" : "#414755" }}
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
  type: "exam" | "bookmark" | "person";
  active: boolean;
}) {
  const color = active ? "#007aff" : "#414755";
  if (type === "exam") {
    return active ? (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
        <rect x="3" y="4" width="18" height="2" rx="1" />
        <rect x="3" y="11" width="18" height="2" rx="1" />
        <rect x="3" y="18" width="18" height="2" rx="1" />
      </svg>
    ) : (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <line x1="3" y1="5" x2="21" y2="5" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="19" x2="21" y2="19" />
      </svg>
    );
  }
  if (type === "bookmark") {
    return active ? (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ) : (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
