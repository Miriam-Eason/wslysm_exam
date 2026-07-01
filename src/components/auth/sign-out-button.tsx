"use client";

import { signOut } from "next-auth/react";

const DEFAULT_CLASSNAME =
  "inline-flex h-10 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest px-5 text-sm font-medium text-danger transition hover:bg-danger-container";

export function SignOutButton({
  redirectTo,
  className,
  style,
}: {
  redirectTo: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={() => signOut({ redirectTo })}
      className={className ?? DEFAULT_CLASSNAME}
      style={style}
    >
      退出登录
    </button>
  );
}
