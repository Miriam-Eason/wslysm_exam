"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  ArrowRight,
  LogOut,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AllClassesDialog } from "@/components/teacher/classes/all-classes-dialog";

type ClassItem = {
  id: number;
  name: string;
  studentCount: number;
  creatorName: string;
  isCreator: boolean;
};

export function ClassList({ classes }: { classes: ClassItem[] }) {
  const router = useRouter();
  const [allOpen, setAllOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ClassItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setFormName("");
    setFormError(null);
    setCreateOpen(true);
  }
  function openRename(c: ClassItem) {
    setFormName(c.name);
    setFormError(null);
    setRenameTarget(c);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "创建失败");
      toast.success(`已创建班级「${json.data.name}」`);
      setCreateOpen(false);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameTarget) return;
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/classes/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "重命名失败");
      toast.success("班级已重命名");
      setRenameTarget(null);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "重命名失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/classes/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "删除失败");
      toast.success(`已删除班级「${deleteTarget.name}」`);
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave(c: ClassItem) {
    try {
      const res = await fetch(`/api/classes/${c.id}/teachers`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "操作失败");
      toast.success(`已将「${c.name}」移出我的授课`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setAllOpen(true)}>
          <List className="size-4" />
          班级列表
        </Button>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          新建班级
        </Button>
      </div>

      {classes.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-surface-container-high text-on-surface-variant">
            <Users className="size-7" />
          </div>
          <h3 className="text-lg font-semibold text-on-surface">还没有授课的班级</h3>
          <p className="max-w-xs text-sm text-on-surface-variant">
            新建一个班级，或从「班级列表」中把已存在的班级加入我的授课。
          </p>
          <div className="mt-2 flex gap-2">
            <Button onClick={() => setAllOpen(true)} variant="outline">
              <List className="size-4" />
              班级列表
            </Button>
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              新建班级
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Card key={c.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link
                    href={`/teacher/classes/${c.id}`}
                    className="text-base font-semibold text-on-surface hover:text-primary"
                  >
                    {c.name}
                  </Link>
                  <span className="text-xs text-on-surface-variant">
                    创建者：{c.creatorName}
                    {c.isCreator && "（我）"}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="-mr-1 -mt-1 rounded-lg p-1.5 text-on-surface-variant outline-none transition hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary/40"
                      aria-label="班级操作"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {c.isCreator && (
                      <>
                        <DropdownMenuItem onSelect={() => openRename(c)}>
                          <Pencil className="size-4" />
                          重命名
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(c)}>
                          <Trash2 className="size-4" />
                          删除班级
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onSelect={() => handleLeave(c)}>
                      <LogOut className="size-4" />
                      移出我的授课
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                <Users className="size-4" />
                {c.studentCount} 名学生
              </div>

              <Link
                href={`/teacher/classes/${c.id}`}
                className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:gap-2"
              >
                查看名单
                <ArrowRight className="size-4 transition-all" />
              </Link>
            </Card>
          ))}
        </div>
      )}

      <AllClassesDialog open={allOpen} onOpenChange={setAllOpen} />

      {/* 新建班级 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreate} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>新建班级</DialogTitle>
              <DialogDescription>班级名称全校唯一；如已存在请到「班级列表」中加入授课。</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="create-name">班级名称</Label>
              <Input
                id="create-name"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  setFormError(null);
                }}
                placeholder="请输入班级名称"
                autoFocus
                maxLength={50}
              />
              {formError && <p className="text-sm font-medium text-danger">{formError}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">取消</Button>
              </DialogClose>
              <Button type="submit" disabled={busy || !formName.trim()}>
                {busy ? "创建中…" : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 重命名 */}
      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <form onSubmit={handleRename} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>重命名班级</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rename-name">班级名称</Label>
              <Input
                id="rename-name"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  setFormError(null);
                }}
                autoFocus
                maxLength={50}
              />
              {formError && <p className="text-sm font-medium text-danger">{formError}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">取消</Button>
              </DialogClose>
              <Button type="submit" disabled={busy || !formName.trim()}>
                {busy ? "保存中…" : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除班级（创建者） */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除班级？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{deleteTarget?.name}」及其学生成员关系（共 {deleteTarget?.studentCount} 人）与所有教师的授课关联，
              但<span className="font-medium text-on-surface">不会删除学生身份与历史考试</span>。此操作不可撤销。
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
    </>
  );
}
