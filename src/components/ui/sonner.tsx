"use client";

import { Toaster as Sonner } from "sonner";

// 全局 Toast 容器，挂在 Providers 内。用法：import { toast } from "sonner"
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-outline-variant/60 !bg-surface-container-lowest !text-on-surface !shadow-[0_12px_40px_rgba(0,0,0,0.12)]",
          description: "!text-on-surface-variant",
          actionButton: "!bg-primary !text-on-primary",
          error: "!text-danger",
          success: "!text-success",
        },
      }}
    />
  );
}
