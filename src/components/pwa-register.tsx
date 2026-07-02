"use client";

import { useEffect } from "react";

// 注册 Service Worker。仅在「安全上下文」（HTTPS 或 localhost）下生效——
// 公网 HTTP 下 window.isSecureContext=false，此处静默跳过，网站照常作为普通响应式站点运行；
// 待站点切到 HTTPS 后自动激活，无需改动代码。
export function PwaRegister() {
  useEffect(() => {
    if (
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      window.isSecureContext
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* 注册失败不影响网站使用 */
      });
    }
  }, []);

  return null;
}
