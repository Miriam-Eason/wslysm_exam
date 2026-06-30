"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Check, BookOpen,
  Users, ClipboardList, Info, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Bank = { id: number; name: string; subject: string | null; questionCount: number };
type ClassItem = { id: number; name: string; studentCount: number };

type Props = {
  banks: Bank[];
  classes: ClassItem[];
};

type StepId = 0 | 1 | 2 | 3;

const STEPS = [
  { label: "基本信息", icon: Info },
  { label: "选题库", icon: BookOpen },
  { label: "选班级", icon: Users },
  { label: "确认", icon: ClipboardList },
];

type FormData = {
  name: string;
  type: "EXAM" | "PRACTICE";
  allowRepeat: boolean;
  repeatLimit: string;
  deadlineDate: string;
  deadlineTime: string;
  timeLimitMin: string;   // 用户输入分钟，提交时乘以 60 转为秒
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  bankId: number | null;
  classIds: number[];
  defaultScore: string;
};

const INIT: FormData = {
  name: "",
  type: "PRACTICE",
  allowRepeat: false,
  repeatLimit: "",
  deadlineDate: "",
  deadlineTime: "",
  timeLimitMin: "",
  shuffleQuestions: false,
  shuffleOptions: false,
  bankId: null,
  classIds: [],
  defaultScore: "1",
};

export function CreateExamWizard({ banks, classes }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>(0);
  const [form, setForm] = useState<FormData>(INIT);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function canProceed(): boolean {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 1) return form.bankId !== null;
    if (step === 2) return form.classIds.length > 0;
    return true;
  }

  function next() {
    if (!canProceed()) return;
    setStep((s) => Math.min(s + 1, 3) as StepId);
  }

  function prev() {
    setStep((s) => Math.max(s - 1, 0) as StepId);
  }

  function deadlineISO() {
    if (!form.deadlineDate) return null;
    return `${form.deadlineDate}T${form.deadlineTime || "23:59"}`;
  }

  async function submit() {
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        bankId: form.bankId!,
        allowRepeat: form.allowRepeat,
        repeatLimit: form.allowRepeat && form.repeatLimit ? Number(form.repeatLimit) : null,
        deadline: deadlineISO(),
        timeLimitSec: form.timeLimitMin ? Number(form.timeLimitMin) * 60 : null,
        shuffleQuestions: form.shuffleQuestions,
        shuffleOptions: form.shuffleOptions,
        classIds: form.classIds,
        defaultScore: Number(form.defaultScore) || 1,
      };

      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "组卷失败");

      toast.success(`「${form.name}」组卷成功`);
      router.push(`/teacher/exams/${json.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "组卷失败");
    } finally {
      setBusy(false);
    }
  }

  const selectedBank = banks.find((b) => b.id === form.bankId);

  return (
    <div className="flex flex-col gap-8">
      {/* 步骤指示器 */}
      <nav className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} className="flex items-center">
              <button
                type="button"
                onClick={() => done && setStep(i as StepId)}
                disabled={!done}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active && "text-primary",
                  done && "cursor-pointer text-on-surface-variant hover:text-primary",
                  !active && !done && "cursor-default text-on-surface-variant/40",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                    active && "bg-primary text-white",
                    done && "bg-success text-white",
                    !active && !done && "bg-surface-container text-on-surface-variant/50",
                  )}
                >
                  {done ? <Check className="size-3" /> : i + 1}
                </span>
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="size-4 text-outline-variant" />
              )}
            </div>
          );
        })}
      </nav>

      {/* 步骤内容 */}
      <Card className="p-6">
        {step === 0 && <Step0 form={form} set={set} />}
        {step === 1 && <Step1 banks={banks} form={form} set={set} />}
        {step === 2 && <Step2 classes={classes} form={form} set={set} />}
        {step === 3 && (
          <Step3
            form={form}
            selectedBank={selectedBank}
            classes={classes}
            deadlineISO={deadlineISO()}
          />
        )}
      </Card>

      {/* 导航按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => step === 0 ? router.back() : prev()} disabled={busy}>
          <ChevronLeft className="size-4" />
          {step === 0 ? "取消" : "上一步"}
        </Button>
        {step < 3 ? (
          <Button onClick={next} disabled={!canProceed()}>
            下一步
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={busy}>
            {busy ? "组卷中…" : "确认组卷"}
            <Check className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── 步骤 0：基本信息 ───────────────────────────────────────────
function Step0({
  form,
  set,
}: {
  form: FormData;
  set: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  const deadlinePreview =
    form.deadlineDate
      ? new Date(`${form.deadlineDate}T${form.deadlineTime || "23:59"}`).toLocaleString("zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-on-surface">基本信息</h2>

      <div className="flex flex-col gap-2">
        <Label htmlFor="exam-name">名称 *</Label>
        <Input
          id="exam-name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="如：期末综合测试"
          autoFocus
          maxLength={100}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="exam-type">类型</Label>
        <Select
          id="exam-type"
          value={form.type}
          onChange={(e) => set("type", e.target.value as "EXAM" | "PRACTICE")}
        >
          <option value="PRACTICE">练习</option>
          <option value="EXAM">考试</option>
        </Select>
        <p className="text-xs text-on-surface-variant">
          考试类型可设置计时；练习类型适合不限时自测。
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="exam-default-score">每题默认分值</Label>
        <Input
          id="exam-default-score"
          type="number"
          min="0.5"
          step="0.5"
          value={form.defaultScore}
          onChange={(e) => set("defaultScore", e.target.value)}
          className="max-w-[120px]"
        />
      </div>

      {/* 截止时间 — 分离日期 + 时间，符合中文习惯 */}
      <div className="flex flex-col gap-2">
        <Label>截止时间（可选）</Label>
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-xs text-on-surface-variant">日期</span>
            <Input
              type="date"
              value={form.deadlineDate}
              onChange={(e) => set("deadlineDate", e.target.value)}
            />
          </div>
          <div className="flex w-[120px] flex-col gap-1">
            <span className="text-xs text-on-surface-variant">截止时刻</span>
            <Input
              type="time"
              value={form.deadlineTime}
              disabled={!form.deadlineDate}
              onChange={(e) => set("deadlineTime", e.target.value)}
            />
          </div>
          {form.deadlineDate && (
            <button
              type="button"
              onClick={() => { set("deadlineDate", ""); set("deadlineTime", ""); }}
              className="mb-0 rounded-lg p-2.5 text-on-surface-variant transition hover:bg-surface-container-low"
              title="清除"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {deadlinePreview && (
          <p className="text-xs font-medium text-primary">{deadlinePreview} 截止</p>
        )}
      </div>

      {/* 答题时长（仅考试类型，单位：分钟） */}
      {form.type === "EXAM" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="exam-timelimit">答题时长限制（可选）</Label>
          <div className="flex items-center gap-2">
            <Input
              id="exam-timelimit"
              type="number"
              min="1"
              step="1"
              value={form.timeLimitMin}
              onChange={(e) => set("timeLimitMin", e.target.value)}
              placeholder="不限时"
              className="max-w-[120px]"
            />
            <span className="text-sm text-on-surface-variant">分钟</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <Checkbox
            checked={form.allowRepeat}
            onChange={(e) => set("allowRepeat", e.target.checked)}
          />
          <span className="font-medium text-on-surface">允许重复练习</span>
        </label>
        {form.allowRepeat && (
          <div className="ml-7 flex flex-col gap-2">
            <Label htmlFor="exam-repeat-limit">重做次数上限（空=不限）</Label>
            <Input
              id="exam-repeat-limit"
              type="number"
              min="1"
              value={form.repeatLimit}
              onChange={(e) => set("repeatLimit", e.target.value)}
              placeholder="不限"
              className="max-w-[120px]"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <Checkbox
            checked={form.shuffleQuestions}
            onChange={(e) => set("shuffleQuestions", e.target.checked)}
          />
          <span className="font-medium text-on-surface">随机题目顺序</span>
        </label>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <Checkbox
            checked={form.shuffleOptions}
            onChange={(e) => set("shuffleOptions", e.target.checked)}
          />
          <span className="font-medium text-on-surface">随机选项顺序（选择题）</span>
        </label>
      </div>
    </div>
  );
}

// ─── 步骤 1：选题库 ─────────────────────────────────────────────
function Step1({
  banks,
  form,
  set,
}: {
  banks: Bank[];
  form: FormData;
  set: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-on-surface">选择题库</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          将整库所有题目导入试卷快照，后续改/删原题不影响试卷。
        </p>
      </div>

      {banks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant px-6 py-12 text-center text-sm text-on-surface-variant">
          暂无题库，请先在题库管理页面创建并添加题目。
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {banks.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => set("bankId", b.id)}
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
                form.bankId === b.id
                  ? "border-primary bg-primary-container"
                  : "border-outline-variant bg-surface-container-lowest hover:border-primary/40 hover:bg-surface-container-low",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-on-surface">{b.name}</span>
                {form.bankId === b.id && (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary">
                    <Check className="size-3 text-white" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {b.subject && <Badge variant="primary">{b.subject}</Badge>}
                <span className="text-xs text-on-surface-variant">{b.questionCount} 道题</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 步骤 2：选班级 ─────────────────────────────────────────────
function Step2({
  classes,
  form,
  set,
}: {
  classes: ClassItem[];
  form: FormData;
  set: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  function toggle(id: number) {
    set(
      "classIds",
      form.classIds.includes(id)
        ? form.classIds.filter((c) => c !== id)
        : [...form.classIds, id],
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-on-surface">选择参与班级</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          至少选择一个班级。该班级的学生将可见此考试/练习。
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant px-6 py-12 text-center text-sm text-on-surface-variant">
          暂无授课班级，请先在班级管理页面加入班级。
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => {
            const checked = form.classIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                  checked
                    ? "border-primary bg-primary-container"
                    : "border-outline-variant bg-surface-container-lowest hover:border-primary/40 hover:bg-surface-container-low",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded border transition",
                    checked ? "border-primary bg-primary" : "border-outline-variant",
                  )}
                >
                  {checked && <Check className="size-3 text-white" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-on-surface">{c.name}</p>
                  <p className="text-xs text-on-surface-variant">{c.studentCount} 名学生</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 步骤 3：确认 ────────────────────────────────────────────────
function Step3({
  form,
  selectedBank,
  classes,
  deadlineISO,
}: {
  form: FormData;
  selectedBank: Bank | undefined;
  classes: ClassItem[];
  deadlineISO: string | null;
}) {
  const selectedClasses = classes.filter((c) => form.classIds.includes(c.id));

  const deadlineDisplay = deadlineISO
    ? new Date(deadlineISO).toLocaleString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "不限";

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-on-surface">确认信息</h2>

      <dl className="divide-y divide-outline-variant/50 rounded-xl border border-outline-variant">
        {[
          { label: "名称", value: form.name },
          { label: "类型", value: form.type === "EXAM" ? "考试" : "练习" },
          { label: "题库", value: selectedBank ? `${selectedBank.name}（${selectedBank.questionCount} 道题）` : "—" },
          { label: "每题分值", value: `${form.defaultScore} 分` },
          {
            label: "参与班级",
            value: selectedClasses.length > 0 ? selectedClasses.map((c) => c.name).join("、") : "—",
          },
          { label: "截止时间", value: deadlineDisplay },
          { label: "答题时限", value: form.timeLimitMin ? `${form.timeLimitMin} 分钟` : "不限时" },
          { label: "允许重做", value: form.allowRepeat ? (form.repeatLimit ? `最多 ${form.repeatLimit} 次` : "不限次数") : "否" },
          { label: "随机题序", value: form.shuffleQuestions ? "是" : "否" },
          { label: "随机选项", value: form.shuffleOptions ? "是" : "否" },
        ].map(({ label, value }) => (
          <div key={label} className="flex px-4 py-3">
            <dt className="w-28 shrink-0 text-sm text-on-surface-variant">{label}</dt>
            <dd className="text-sm font-medium text-on-surface">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-xs text-on-surface-variant">
        确认后将把题库中所有 {selectedBank?.questionCount ?? 0} 道题目复制为试卷快照，后续对原题的修改不影响本试卷。
      </p>
    </div>
  );
}
