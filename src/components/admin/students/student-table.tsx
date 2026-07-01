"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { StudentFormDialog } from "@/components/admin/students/student-form-dialog";

type ClassOption = { id: number; name: string };
type Student = {
  id: number;
  studentNo: string;
  name: string;
  deletedAt: string | Date | null;
  classes: ClassOption[];
};

export function StudentTable({ students, classes }: { students: Student[]; classes: ClassOption[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const headerRef = useRef<HTMLInputElement>(null);

  const allChecked = students.length > 0 && students.every((s) => selected.has(s.id));
  const someChecked = selected.size > 0 && !allChecked;
  useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = someChecked;
  }, [someChecked]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(students.map((s) => s.id)));
  }

  async function handleDelete() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "删除失败");
      const d = json.data;
      toast.success(
        `已删除 ${d.hardDeleted + d.softDeleted} 名学生`,
        d.softDeleted ? { description: `其中 ${d.softDeleted} 名有作答记录，已停用（软删除）` } : undefined,
      );
      setSelected(new Set());
      setConfirmOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest">
        {selected.size > 0 && (
          <div className="flex items-center justify-between border-b border-outline-variant/50 bg-primary-container/40 px-4 py-2.5">
            <span className="text-sm text-on-surface">已选 {selected.size} 名学生</span>
            <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="size-4" />
              删除所选
            </Button>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <input
                  ref={headerRef}
                  type="checkbox"
                  aria-label="全选本页"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="size-4 accent-primary"
                />
              </TableHead>
              <TableHead className="w-16">序号</TableHead>
              <TableHead>学号</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>班级</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="w-24 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-on-surface-variant">
                  暂无学生账号
                </TableCell>
              </TableRow>
            ) : (
              students.map((s, i) => (
                <TableRow key={s.id} data-state={selected.has(s.id) ? "selected" : undefined}>
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`选择 ${s.name}`}
                      checked={selected.has(s.id)}
                      onChange={() => toggle(s.id)}
                      className="size-4 accent-primary"
                    />
                  </TableCell>
                  <TableCell className="text-on-surface-variant">{i + 1}</TableCell>
                  <TableCell className="font-medium tabular-nums">{s.studentNo}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell className="text-on-surface-variant">
                    {s.classes.length === 0 ? (
                      <span className="text-on-surface-variant/50">未加入班级</span>
                    ) : (
                      s.classes.map((c) => c.name).join("、")
                    )}
                  </TableCell>
                  <TableCell>
                    {s.deletedAt ? (
                      <Badge variant="danger">已停用</Badge>
                    ) : (
                      <Badge variant="success">在用</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <StudentFormDialog classes={classes} student={s} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !o && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除所选学生？</AlertDialogTitle>
            <AlertDialogDescription>
              无作答记录的学生<span className="font-medium text-on-surface">直接删除</span>；
              已有作答记录的将<span className="font-medium text-on-surface">停用（软删除）</span>
              以保护成绩数据。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={busy}
            >
              {busy ? "删除中…" : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
