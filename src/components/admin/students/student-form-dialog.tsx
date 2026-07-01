"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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

type ClassOption = { id: number; name: string };
type Student = { id: number; studentNo: string; name: string; deletedAt: string | Date | null };

export function StudentFormDialog({
  classes,
  student,
}: {
  classes: ClassOption[];
  student?: Student;
}) {
  const router = useRouter();
  const isEdit = !!student;
  const [open, setOpen] = useState(false);
  const [studentNo, setStudentNo] = useState(student?.studentNo ?? "");
  const [name, setName] = useState(student?.name ?? "");
  const [classId, setClassId] = useState<string>("");
  const [resetPassword, setResetPassword] = useState(false);
  const [restore, setRestore] = useState(false);
  const [busy, setBusy] = useState(false);

  function reset() {
    setStudentNo(student?.studentNo ?? "");
    setName(student?.name ?? "");
    setClassId("");
    setResetPassword(false);
    setRestore(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const url = isEdit ? `/api/admin/students/${student!.id}` : "/api/admin/students";
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit
        ? { name, resetPassword, restore }
        : { studentNo, name, ...(classId ? { classId: Number(classId) } : {}) };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "操作失败");
      toast.success(isEdit ? "已保存" : "已创建学生账号");
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
          <Button variant="ghost" size="icon" aria-label={`编辑 ${student!.name}`}>
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button variant="outline">
            <Plus className="size-4" />
            新建学生
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? "编辑学生账号" : "新建学生账号"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "学号不可修改；可重置密码为默认密码，或恢复已停用账号。" : "默认密码为 wxls12345，可选立即加入某班级。"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="studentNo">学号</Label>
              <Input
                id="studentNo"
                value={studentNo}
                onChange={(e) => setStudentNo(e.target.value)}
                disabled={isEdit}
                placeholder="9-10 位数字"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">姓名</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            {!isEdit && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="classId">加入班级（可选）</Label>
                <Select id="classId" value={classId} onChange={(e) => setClassId(e.target.value)}>
                  <option value="">不加入班级</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {isEdit && (
              <div className="flex flex-col gap-2.5">
                <label className="flex items-center gap-2.5 text-sm text-on-surface">
                  <Checkbox checked={resetPassword} onChange={(e) => setResetPassword(e.target.checked)} />
                  重置密码为默认密码（wxls12345）
                </label>
                {student?.deletedAt && (
                  <label className="flex items-center gap-2.5 text-sm text-on-surface">
                    <Checkbox checked={restore} onChange={(e) => setRestore(e.target.checked)} />
                    恢复该账号（取消停用）
                  </label>
                )}
              </div>
            )}
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
