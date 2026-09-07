"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  QUESTION_TYPES,
  DIFFICULTIES,
  QUESTION_TYPE_LABELS,
  DIFFICULTY_LABELS,
  letterForIndex,
  type QType,
  type Diff,
  type QuestionOption,
} from "@/lib/question";

export type EditableQuestion = {
  id: number;
  type: QType;
  stem: string;
  options: QuestionOption[] | null;
  answer: unknown;
  difficulty: Diff;
  analysis: string | null;
  textbook: string | null;
  unit: string | null;
  knowledgePoint: string | null;
};

function initialFormState(question: EditableQuestion | null) {
  const type = question?.type ?? "SINGLE_CHOICE";
  const choiceQuestion =
    question &&
    (question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_CHOICE");
  const options = choiceQuestion ? (question.options ?? []).map((option) => option.text) : ["", ""];
  const answer = choiceQuestion ? ((question.answer as string[]) ?? []) : [];
  const correctIdx = new Set(
    choiceQuestion
      ? (question.options ?? [])
          .map((option, index) => (answer.includes(option.key) ? index : -1))
          .filter((index) => index >= 0)
      : [],
  );

  return {
    type,
    stem: question?.stem ?? "",
    difficulty: question?.difficulty ?? "MEDIUM",
    analysis: question?.analysis ?? "",
    options,
    correctIdx,
    tfAnswer:
      question?.type === "TRUE_FALSE"
        ? (((question.answer as string[])?.[0] as "T" | "F") ?? "T")
        : ("T" as const),
    blanks:
      question?.type === "FILL_BLANK"
        ? ((question.answer as string[][]) ?? [[""]]).map((blank) => blank.join("/"))
        : [""],
  } satisfies {
    type: QType;
    stem: string;
    difficulty: Diff;
    analysis: string;
    options: string[];
    correctIdx: Set<number>;
    tfAnswer: "T" | "F";
    blanks: string[];
  };
}

export function QuestionFormDialog({
  bankId,
  question,
  open,
  onOpenChange,
}: {
  bankId: number;
  question: EditableQuestion | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const initial = initialFormState(question);
  const [type, setType] = useState<QType>(initial.type);
  const [stem, setStem] = useState(initial.stem);
  const [difficulty, setDifficulty] = useState<Diff>(initial.difficulty);
  const [analysis, setAnalysis] = useState(initial.analysis);
  const [options, setOptions] = useState<string[]>(initial.options);
  const [correctIdx, setCorrectIdx] = useState<Set<number>>(initial.correctIdx);
  const [tfAnswer, setTfAnswer] = useState<"T" | "F">(initial.tfAnswer);
  const [blanks, setBlanks] = useState<string[]>(initial.blanks);
  const [busy, setBusy] = useState(false);

  function switchType(t: QType) {
    setType(t);
    // 重置类型相关字段，避免脏数据
    setOptions(["", ""]);
    setCorrectIdx(new Set());
    setTfAnswer("T");
    setBlanks([""]);
  }

  const isChoice = type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE";

  function toggleCorrect(i: number) {
    setCorrectIdx((prev) => {
      if (type === "SINGLE_CHOICE") return new Set([i]);
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function removeOption(i: number) {
    setOptions((opts) => opts.filter((_, idx) => idx !== i));
    setCorrectIdx((prev) => {
      const next = new Set<number>();
      [...prev].forEach((c) => {
        if (c < i) next.add(c);
        else if (c > i) next.add(c - 1);
      });
      return next;
    });
  }

  function buildPayload() {
    const baseFields = {
      stem: stem.trim(),
      difficulty,
      analysis: analysis.trim() || null,
    };
    if (isChoice) {
      return {
        ...baseFields,
        type,
        options: options.map((t, i) => ({ key: letterForIndex(i), text: t.trim() })),
        answer: [...correctIdx].sort((a, b) => a - b).map((i) => letterForIndex(i)),
      };
    }
    if (type === "TRUE_FALSE") return { ...baseFields, type, answer: [tfAnswer] };
    return {
      ...baseFields,
      type,
      answer: blanks.map((b) => b.split("/").map((s) => s.trim()).filter(Boolean)),
    };
  }

  // 客户端轻校验（服务端权威）
  function validate(): string | null {
    if (!stem.trim()) return "请填写题干";
    if (isChoice) {
      if (options.length < 2) return "至少 2 个选项";
      if (options.some((o) => !o.trim())) return "选项内容不能为空";
      if (correctIdx.size === 0) return "请选择正确答案";
      if (type === "SINGLE_CHOICE" && correctIdx.size !== 1) return "单选只能有 1 个正确答案";
    }
    if (type === "FILL_BLANK") {
      if (blanks.length === 0) return "至少 1 个填空";
      if (blanks.some((b) => b.split("/").map((s) => s.trim()).filter(Boolean).length === 0))
        return "每个空至少 1 个可接受答案";
    }
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      const url = question ? `/api/questions/${question.id}` : `/api/banks/${bankId}/questions`;
      const res = await fetch(url, {
        method: question ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "保存失败");
      toast.success(question ? "题目已更新" : "题目已添加");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{question ? "编辑题目" : "新建题目"}</DialogTitle>
          </DialogHeader>

          <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto pr-1">
            {/* 题型 */}
            <div className="flex flex-col gap-2">
              <Label>题型</Label>
              <div className="flex flex-wrap gap-2">
                {QUESTION_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => switchType(t)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      type === t
                        ? "border-primary bg-primary-container text-primary"
                        : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                    }`}
                  >
                    {QUESTION_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* 题干 */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="q-stem">
                题干{type === "FILL_BLANK" && <span className="text-on-surface-variant">（用 ____ 表示填空处）</span>}
              </Label>
              <Textarea
                id="q-stem"
                value={stem}
                onChange={(e) => setStem(e.target.value)}
                placeholder={type === "FILL_BLANK" ? "中国的首都是____。" : "请输入题干"}
              />
            </div>

            {/* 选择题：选项 + 正确答案 */}
            {isChoice && (
              <div className="flex flex-col gap-2">
                <Label>
                  选项与答案
                  <span className="ml-1 text-on-surface-variant">
                    （{type === "SINGLE_CHOICE" ? "点选 1 个正确项" : "勾选多个正确项"}）
                  </span>
                </Label>
                <div className="flex flex-col gap-2">
                  {options.map((opt, i) => {
                    const correct = correctIdx.has(i);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCorrect(i)}
                          title="标记为正确答案"
                          className={`flex size-9 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold transition ${
                            correct
                              ? "border-success bg-success text-white"
                              : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-success"
                          }`}
                        >
                          {correct ? <Check className="size-4" /> : letterForIndex(i)}
                        </button>
                        <Input
                          value={opt}
                          onChange={(e) =>
                            setOptions((o) => o.map((x, idx) => (idx === i ? e.target.value : x)))
                          }
                          placeholder={`选项 ${letterForIndex(i)}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          disabled={options.length <= 2}
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-danger-container hover:text-danger disabled:opacity-30 disabled:hover:bg-transparent"
                          aria-label="删除选项"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                {options.length < 8 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-fit"
                    onClick={() => setOptions((o) => [...o, ""])}
                  >
                    <Plus className="size-4" />
                    添加选项
                  </Button>
                )}
              </div>
            )}

            {/* 判断题 */}
            {type === "TRUE_FALSE" && (
              <div className="flex flex-col gap-2">
                <Label>正确答案</Label>
                <div className="flex gap-2">
                  {(["T", "F"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTfAnswer(v)}
                      className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                        tfAnswer === v
                          ? "border-primary bg-primary-container text-primary"
                          : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                      }`}
                    >
                      {v === "T" ? "正确" : "错误"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 填空题 */}
            {type === "FILL_BLANK" && (
              <div className="flex flex-col gap-2">
                <Label>
                  各空可接受答案
                  <span className="ml-1 text-on-surface-variant">（多个答案用「/」分隔，命中任一即对）</span>
                </Label>
                <div className="flex flex-col gap-2">
                  {blanks.map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="flex h-9 shrink-0 items-center rounded-lg bg-surface-container px-2.5 text-sm font-medium text-on-surface-variant">
                        空{i + 1}
                      </span>
                      <Input
                        value={b}
                        onChange={(e) => setBlanks((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))}
                        placeholder="如：北京/京城"
                      />
                      <button
                        type="button"
                        onClick={() => setBlanks((arr) => arr.filter((_, idx) => idx !== i))}
                        disabled={blanks.length <= 1}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-danger-container hover:text-danger disabled:opacity-30 disabled:hover:bg-transparent"
                        aria-label="删除填空"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-fit"
                  onClick={() => setBlanks((arr) => [...arr, ""])}
                >
                  <Plus className="size-4" />
                  添加填空
                </Button>
              </div>
            )}

            {/* 难度 */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="q-diff">难度</Label>
              <select
                id="q-diff"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Diff)}
                className="h-10 w-40 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {DIFFICULTY_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>

            {/* 解析 */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="q-analysis">解析（可选）</Label>
              <Textarea
                id="q-analysis"
                value={analysis}
                onChange={(e) => setAnalysis(e.target.value)}
                placeholder="答案解析…"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">取消</Button>
            </DialogClose>
            <Button type="submit" disabled={busy}>
              {busy ? "保存中…" : question ? "保存修改" : "添加题目"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
