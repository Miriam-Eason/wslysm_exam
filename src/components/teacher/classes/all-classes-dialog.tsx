"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type AllClass = {
  id: number;
  name: string;
  studentCount: number;
  creatorName: string;
  teaching: boolean;
};

export function AllClassesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [list, setList] = useState<AllClass[] | null>(null);
  const [joining, setJoining] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setList(null);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/classes?scope=all");
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "加载失败");
        setList(json.data as AllClass[]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "加载失败");
      }
    })();
  }, [open]);

  async function join(c: AllClass) {
    setJoining(c.id);
    try {
      const res = await fetch(`/api/classes/${c.id}/teachers`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "添加失败");
      toast.success(`已将「${c.name}」加入我的授课`);
      setList((l) => l?.map((x) => (x.id === c.id ? { ...x, teaching: true } : x)) ?? null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "添加失败");
    } finally {
      setJoining(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>全校班级</DialogTitle>
          <DialogDescription>
            选择已存在的班级加入「我的授课」，无需重复创建；同一班级全校仅一个。
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto">
          {list === null ? (
            <p className="py-10 text-center text-sm text-on-surface-variant">加载中…</p>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-on-surface-variant">全校还没有班级</p>
          ) : (
            list.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/60 px-4 py-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium text-on-surface">{c.name}</span>
                  <span className="text-xs text-on-surface-variant">
                    创建者：{c.creatorName} · {c.studentCount} 名学生
                  </span>
                </div>
                {c.teaching ? (
                  <Badge variant="success" className="shrink-0 gap-1">
                    <Check className="size-3.5" />
                    已授课
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={joining === c.id}
                    onClick={() => join(c)}
                  >
                    <Plus className="size-4" />
                    {joining === c.id ? "添加中…" : "添加授课"}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
