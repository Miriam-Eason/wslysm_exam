"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

type Bank = {
  id: number;
  name: string;
  description: string | null;
  subject: string | null;
  questionCount: number;
};

const EMPTY = { name: "", subject: "", description: "" };

export function BankList({ banks }: { banks: Bank[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Bank | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bank | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setForm(EMPTY);
    setCreateOpen(true);
  }
  function openEdit(b: Bank) {
    setForm({ name: b.name, subject: b.subject ?? "", description: b.description ?? "" });
    setEditTarget(b);
  }

  async function submit(url: string, method: string, onClose: () => void) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          subject: form.subject.trim() || null,
          description: form.description.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "操作失败");
      toast.success("已保存");
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/banks/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "删除失败");
      toast.success(`已删除题库「${deleteTarget.name}」`);
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  const fields = (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="bank-name">题库名称</Label>
        <Input
          id="bank-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="如：通识基础题库"
          autoFocus
          maxLength={80}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="bank-subject">科目（可选）</Label>
        <Input
          id="bank-subject"
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          placeholder="如：数学"
          maxLength={50}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="bank-desc">描述（可选）</Label>
        <Textarea
          id="bank-desc"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="题库说明…"
          maxLength={500}
        />
      </div>
    </>
  );

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          新建题库
        </Button>
      </div>

      {banks.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-surface-container-high text-on-surface-variant">
            <BookOpen className="size-7" />
          </div>
          <h3 className="text-lg font-semibold text-on-surface">还没有题库</h3>
          <p className="max-w-xs text-sm text-on-surface-variant">创建题库后即可添加题目、用于组卷。</p>
          <Button onClick={openCreate} variant="outline" className="mt-2">
            <Plus className="size-4" />
            新建题库
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banks.map((b) => (
            <Card key={b.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <Link
                    href={`/teacher/banks/${b.id}`}
                    className="text-base font-semibold text-on-surface hover:text-primary"
                  >
                    {b.name}
                  </Link>
                  {b.subject && <Badge variant="primary" className="w-fit">{b.subject}</Badge>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="-mr-1 -mt-1 rounded-lg p-1.5 text-on-surface-variant outline-none transition hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary/40"
                      aria-label="题库操作"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => openEdit(b)}>
                      <Pencil className="size-4" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(b)}>
                      <Trash2 className="size-4" />
                      删除题库
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {b.description && (
                <p className="line-clamp-2 text-sm text-on-surface-variant">{b.description}</p>
              )}

              <div className="mt-auto flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">{b.questionCount} 道题</span>
                <Link
                  href={`/teacher/banks/${b.id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:gap-2"
                >
                  管理题目
                  <ArrowRight className="size-4 transition-all" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 新建 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit("/api/banks", "POST", () => setCreateOpen(false));
            }}
            className="flex flex-col gap-5"
          >
            <DialogHeader>
              <DialogTitle>新建题库</DialogTitle>
              <DialogDescription>创建后可在题库内添加四种题型的题目。</DialogDescription>
            </DialogHeader>
            {fields}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">取消</Button>
              </DialogClose>
              <Button type="submit" disabled={busy || !form.name.trim()}>
                {busy ? "创建中…" : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 编辑 */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(`/api/banks/${editTarget!.id}`, "PATCH", () => setEditTarget(null));
            }}
            className="flex flex-col gap-5"
          >
            <DialogHeader>
              <DialogTitle>编辑题库</DialogTitle>
            </DialogHeader>
            {fields}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">取消</Button>
              </DialogClose>
              <Button type="submit" disabled={busy || !form.name.trim()}>
                {busy ? "保存中…" : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除题库？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{deleteTarget?.name}」及其 {deleteTarget?.questionCount} 道题目。
              <span className="font-medium text-on-surface">已组卷的试卷快照不受影响。</span>此操作不可撤销。
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
