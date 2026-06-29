"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ redirectTo }: { redirectTo: string }) {
  return (
    <button
      onClick={() => signOut({ redirectTo })}
      className="inline-flex h-10 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest px-5 text-sm font-medium text-danger transition hover:bg-danger-container"
    >
      退出登录
    </button>
  );
}
