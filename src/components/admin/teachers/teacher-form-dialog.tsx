"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

type Teacher = { id: number; username: string; name: string; isAdmin: boolean };

export function TeacherFormDialog({ teacher }: { teacher?: Teacher }) {
  const router = useRouter();
  const isEdit = !!teacher;
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(teacher?.username ?? "");
  const [name, setName] = useState(teacher?.name ?? "");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(teacher?.isAdmin ?? false);
  const [busy, setBusy] = useState(false);

  function reset() {
    setUsername(teacher?.username ?? "");
    setName(teacher?.name ?? "");
    setPassword("");
    setIsAdmin(teacher?.isAdmin ?? false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const url = isEdit ? `/api/admin/teachers/${teacher!.id}` : "/api/admin/teachers";
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit
        ? { name, isAdmin, ...(password ? { password } : {}) }
        : { username, name, isAdmin, password };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "操作失败");
      toast.success(isEdit ? "已保存" : "已创建教师账号");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
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
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label={`编辑 ${teacher!.name}`}>
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" />
            新建教师
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? "编辑教师账号" : "新建教师账号"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "留空密码表示不修改密码。" : "创建后教师可用该账号 + 密码登录教师端或超管端。"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">账号</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isEdit}
                placeholder="3-20 位字母 / 数字 / 下划线"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">姓名</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{isEdit ? "重置密码（可选）" : "密码"}</Label>
              <Input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? "留空表示不修改" : "至少 6 位"}
                required={!isEdit}
              />
            </div>
            <label className="flex items-center gap-2.5 text-sm text-on-surface">
              <Checkbox checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
              授予超级管理员权限
            </label>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={busy}>
                取消
              </Button>
            </DialogClose>
            <Button type="submit" disabled={busy}>
              {busy ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
