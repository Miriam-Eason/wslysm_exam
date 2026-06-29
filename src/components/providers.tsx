"use client";

// 客户端会话上下文：供 useSession() / signIn() / signOut() 使用
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
