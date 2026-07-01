"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

const FIELD_BG = "rgba(120,120,128,0.08)";

function fieldClassName(hasError: boolean) {
  return [
    "h-12 w-full rounded-xl px-4 text-[15px] text-on-surface outline-none transition",
    "placeholder:text-secondary/60",
    hasError ? "ring-2 ring-[#ff3b30]/60" : "focus:ring-2 focus:ring-[#007aff]/30",
  ].join(" ");
}

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mismatch =
    newPassword.length > 0 && confirmPassword.length > 0 && newPassword !== confirmPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < 6;
  const canSubmit =
    oldPassword.length > 0 &&
    newPassword.length >= 6 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword &&
    !submitting;

  function reset() {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrorMsg(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/student/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error?.message ?? "修改失败，请重试");
      }
      setOpen(false);
      toast.success("密码已修改，请重新登录");
      await signOut({ redirectTo: "/student/login" });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "修改失败，请重试");
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex h-14 w-full items-center justify-center rounded-2xl text-[17px] font-semibold text-white transition active:scale-[0.98]"
          style={{ background: "#007aff", boxShadow: "0 4px 16px rgba(0,122,255,0.28)" }}
        >
          修改密码
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[340px] gap-5 rounded-[28px] border-none bg-[#f7f8fc] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle className="text-center text-[18px]">修改密码</DialogTitle>
            <DialogDescription className="text-center text-[13px]">
              修改后需使用新密码重新登录。
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <p className="rounded-xl bg-[rgba(255,59,48,0.08)] px-3 py-2 text-center text-[13px] font-medium text-[#ff3b30]">
              {errorMsg}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="px-1 text-[12px] font-medium text-secondary">原密码</label>
              <input
                type="password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="请输入原密码"
                className={fieldClassName(false)}
                style={{ background: FIELD_BG }}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="px-1 text-[12px] font-medium text-secondary">新密码</label>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少 6 位"
                className={fieldClassName(tooShort)}
                style={{ background: FIELD_BG }}
                required
              />
              {tooShort && <p className="px-1 text-[12px] text-[#ff3b30]">新密码至少 6 位</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="px-1 text-[12px] font-medium text-secondary">确认新密码</label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                className={fieldClassName(mismatch)}
                style={{ background: FIELD_BG }}
                required
              />
              {mismatch && (
                <p className="px-1 text-[12px] text-[#ff3b30]">两次输入的新密码不一致</p>
              )}
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3">
            <DialogClose asChild>
              <button
                type="button"
                className="h-12 rounded-xl text-[15px] font-medium text-on-surface transition active:scale-[0.98]"
                style={{ background: "rgba(120,120,128,0.1)" }}
              >
                取消
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={!canSubmit}
              className="h-12 rounded-xl text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: "#007aff" }}
            >
              {submitting ? "提交中…" : "确认修改"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
