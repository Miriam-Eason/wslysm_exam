"use client";

import { useState } from "react";
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
import { TeacherFormDialog } from "@/components/admin/teachers/teacher-form-dialog";

type Teacher = {
  id: number;
  username: string;
  name: string;
  isAdmin: boolean;
  classCount: number;
  teachingCount: number;
  bankCount: number;
  examCount: number;
};

export function TeacherTable({
  teachers,
  currentUserId,
}: {
  teachers: Teacher[];
  currentUserId: number;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<Teacher | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!target) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/teachers/${target.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "删除失败");
      toast.success(`已删除教师「${target.name}」`);
      setTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <TeacherFormDialog />
      </div>

      <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16">序号</TableHead>
              <TableHead>账号</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>班级 / 授课</TableHead>
              <TableHead>题库 / 考试</TableHead>
              <TableHead className="w-24 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-on-surface-variant">
                  暂无教师账号
                </TableCell>
              </TableRow>
            ) : (
              teachers.map((t, i) => (
                <TableRow key={t.id}>
                  <TableCell className="text-on-surface-variant">{i + 1}</TableCell>
                  <TableCell className="font-medium tabular-nums">{t.username}</TableCell>
                  <TableCell>
                    {t.name}
                    {t.id === currentUserId && (
                      <span className="ml-1.5 text-xs text-on-surface-variant">（我）</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.isAdmin ? "primary" : "neutral"}>
                      {t.isAdmin ? "超级管理员" : "教师"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-on-surface-variant tabular-nums">
                    {t.classCount} / {t.teachingCount}
                  </TableCell>
                  <TableCell className="text-on-surface-variant tabular-nums">
                    {t.bankCount} / {t.examCount}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <TeacherFormDialog teacher={t} />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`删除 ${t.name}`}
                        disabled={t.id === currentUserId}
                        onClick={() => setTarget(t)}
                      >
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除教师「{target?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              若该教师创建过班级 / 题库 / 考试，需先转移或清理，否则无法删除。此操作不可撤销。
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
