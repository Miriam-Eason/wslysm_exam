"use client";

// 灵活组卷编辑器（S14）：整库 / 快捷 / 明细 三档，共用 /api/banks/:id/compose 预览。
// 受控组件：draft 由父级持有（跨步导航不丢），解析结果经 onResolved 上抛。
import { useEffect, useState } from "react";
import { Layers, Zap, ListChecks, Plus, Trash2, Eye, AlertCircle, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  QUESTION_TYPES, DIFFICULTIES, QUESTION_TYPE_LABELS, DIFFICULTY_LABELS,
  type QType, type Diff,
} from "@/lib/question";

const ANY = "__ANY__"; // 不限
const NONE = "__NONE__"; // 未标注（字段为空）

export type ComposeMode = "WHOLE" | "QUICK" | "DETAILED";
type GroupDim = "type" | "unit" | "knowledgePoint";
type DetailRow = { unit: string; knowledgePoint: string; type: string; difficulty: string; count: string; score: string };

export type ComposeDraft = {
  mode: ComposeMode;
  quick: { groupDim: GroupDim; difficulty: Diff | null; score: string; quotas: Record<string, string> };
  rows: DetailRow[];
};

export const initialComposeDraft = (): ComposeDraft => ({
  mode: "WHOLE",
  quick: { groupDim: "knowledgePoint", difficulty: null, score: "2", quotas: {} },
  rows: [{ unit: ANY, knowledgePoint: ANY, type: ANY, difficulty: ANY, count: "5", score: "2" }],
});

type Bucket = { value: string; count: number };
type Dimensions = {
  total: number;
  units: Bucket[];
  knowledgePoints: Bucket[];
  types: { value: string; count: number }[];
  difficulties: { value: string; count: number }[];
};
type ComposeRule = {
  unit: string | null; knowledgePoint: string | null;
  type: QType | null; difficulty: Diff | null; count: number; score: number;
};
type PreviewItem = {
  questionId: number; order: number; score: number; type: QType; difficulty: Diff;
  unit: string | null; knowledgePoint: string | null; stem: string;
};
type PreviewResult = {
  totalCount: number; totalScore: number; hasShortfall: boolean;
  ruleResults: { index: number; requested: number; available: number; taken: number; shortfall: number }[];
  items: PreviewItem[];
};

type Props = {
  bankId: number;
  bankQuestionCount: number;
  draft: ComposeDraft;
  onDraftChange: (d: ComposeDraft) => void;
  onResolved: (mode: ComposeMode, selection: { questionId: number; score: number }[] | null, blueprint: { mode: ComposeMode; rules: ComposeRule[] } | null) => void;
};

function tokenToField(v: string): string | null {
  if (v === ANY) return null;
  if (v === NONE) return "";
  return v;
}

export function ComposeStep({ bankId, bankQuestionCount, draft, onDraftChange, onResolved }: Props) {
  const [dims, setDims] = useState<Dimensions | null>(null);
  const [dimsError, setDimsError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dimsLoading = draft.mode !== "WHOLE" && !dims && !dimsError;

  // 切库或进入非整库模式时拉维度（setState 仅在异步回调中，避免 effect 内同步 setState）
  useEffect(() => {
    if (draft.mode === "WHOLE" || dims) return;
    let cancelled = false;
    fetch(`/api/banks/${bankId}/dimensions`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.ok) setDims(j.data);
        else setDimsError(j?.error?.message ?? "读取题库维度失败");
      })
      .catch(() => { if (!cancelled) setDimsError("读取题库维度失败"); });
    return () => { cancelled = true; };
  }, [bankId, draft.mode, dims]);

  // draft 任何改动都作废上一次预览结果，强制重新预览后才能进入下一步
  function patch(next: Partial<ComposeDraft>) {
    setPreview(null);
    setError(null);
    const merged = { ...draft, ...next };
    onDraftChange(merged);
    if (next.mode === "WHOLE") onResolved("WHOLE", null, null);
    else onResolved(merged.mode, null, null); // 作废
  }

  function setMode(mode: ComposeMode) {
    if (mode === "WHOLE") { patch({ mode }); return; }
    patch({ mode });
  }

  // ── 编译 draft → rules[] ──────────────────────────────
  function compileRules(): ComposeRule[] {
    if (draft.mode === "QUICK") {
      const { groupDim, difficulty, score, quotas } = draft.quick;
      const sc = Number(score) || 1;
      const buckets: Bucket[] =
        groupDim === "type" ? (dims?.types.map((t) => ({ value: t.value, count: t.count })) ?? [])
          : groupDim === "unit" ? (dims?.units ?? [])
            : (dims?.knowledgePoints ?? []);
      return buckets
        .map((b) => ({ b, n: Number(quotas[b.value] || 0) }))
        .filter((x) => x.n > 0)
        .map(({ b, n }) => ({
          unit: groupDim === "unit" ? b.value : null,
          knowledgePoint: groupDim === "knowledgePoint" ? b.value : null,
          type: groupDim === "type" ? (b.value as QType) : null,
          difficulty,
          count: n,
          score: sc,
        }));
    }
    // DETAILED
    return draft.rows
      .filter((r) => Number(r.count) > 0)
      .map((r) => ({
        unit: tokenToField(r.unit),
        knowledgePoint: tokenToField(r.knowledgePoint),
        type: (tokenToField(r.type) as QType | null),
        difficulty: (tokenToField(r.difficulty) as Diff | null),
        count: Number(r.count),
        score: Number(r.score) || 1,
      }));
  }

  async function runPreview() {
    const rules = compileRules();
    if (rules.length === 0) { setError("请至少设置一条出题数量大于 0 的规则"); return; }
    setPreviewing(true);
    setError(null);
    try {
      const res = await fetch(`/api/banks/${bankId}/compose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: draft.mode, rules }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "预览失败");
      const result: PreviewResult = json.data;
      setPreview(result);
      if (result.totalCount === 0) {
        setError("按当前规则未抽到任何题目");
        onResolved(draft.mode, null, null);
      } else {
        onResolved(
          draft.mode,
          result.items.map((i) => ({ questionId: i.questionId, score: i.score })),
          { mode: draft.mode, rules },
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "预览失败");
      onResolved(draft.mode, null, null);
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-on-surface">组卷方式</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          默认整库组卷；也可按题型 / 单元 / 知识点灵活抽题，组卷后原题改删不影响试卷。
        </p>
      </div>

      {/* 三档切换 */}
      <div className="grid grid-cols-3 gap-2">
        {([
          { id: "WHOLE", label: "整库组卷", desc: `全部 ${bankQuestionCount} 题`, icon: Layers },
          { id: "QUICK", label: "快捷组卷", desc: "按单一维度配额", icon: Zap },
          { id: "DETAILED", label: "明细组卷", desc: "多维交叉规则", icon: ListChecks },
        ] as const).map((m) => {
          const active = draft.mode === m.id;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors",
                active
                  ? "border-primary bg-primary-container"
                  : "border-outline-variant bg-surface-container-lowest hover:border-primary/40",
              )}
            >
              <Icon className={cn("size-4", active ? "text-primary" : "text-on-surface-variant")} />
              <span className="text-sm font-medium text-on-surface">{m.label}</span>
              <span className="text-xs text-on-surface-variant">{m.desc}</span>
            </button>
          );
        })}
      </div>

      {draft.mode === "WHOLE" && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-6 text-center text-sm text-on-surface-variant">
          将把题库中全部 <span className="font-semibold text-on-surface">{bankQuestionCount}</span> 道题复制为试卷快照。
          每题分值在第一步的「每题默认分值」中设置。
        </div>
      )}

      {dimsLoading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-on-surface-variant">
          <Loader2 className="size-4 animate-spin" /> 正在读取题库维度…
        </div>
      )}
      {draft.mode !== "WHOLE" && dimsError && (
        <div className="flex items-center gap-2 rounded-lg bg-danger-container px-3 py-2 text-sm text-danger">
          <AlertCircle className="size-4 shrink-0" /> {dimsError}
        </div>
      )}

      {draft.mode === "QUICK" && dims && (
        <QuickEditor dims={dims} draft={draft} patch={patch} />
      )}
      {draft.mode === "DETAILED" && dims && (
        <DetailedEditor dims={dims} draft={draft} patch={patch} />
      )}

      {/* 预览触发 + 结果 */}
      {draft.mode !== "WHOLE" && dims && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={runPreview}
            disabled={previewing}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-primary bg-primary-container px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary-container/70 disabled:opacity-60"
          >
            {previewing ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
            预览抽题
          </button>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-danger-container px-3 py-2 text-sm text-danger">
              <AlertCircle className="size-4 shrink-0" /> {error}
            </div>
          )}

          {preview && <PreviewPanel preview={preview} />}
        </div>
      )}
    </div>
  );
}

// ─── 快捷模式 ───────────────────────────────────────────────
function QuickEditor({ dims, draft, patch }: {
  dims: Dimensions;
  draft: ComposeDraft;
  patch: (n: Partial<ComposeDraft>) => void;
}) {
  const { groupDim, difficulty, score, quotas } = draft.quick;
  const buckets: Bucket[] =
    groupDim === "type" ? dims.types.map((t) => ({ value: t.value, count: t.count }))
      : groupDim === "unit" ? dims.units
        : dims.knowledgePoints;

  function setQuick(n: Partial<ComposeDraft["quick"]>) {
    patch({ quick: { ...draft.quick, ...n } });
  }
  function setQuota(value: string, n: string) {
    setQuick({ quotas: { ...quotas, [value]: n } });
  }
  function labelFor(v: string): string {
    if (v === "") return "（未标注）";
    if (groupDim === "type") return QUESTION_TYPE_LABELS[v as QType] ?? v;
    return v;
  }

  const totalPlanned = buckets.reduce((s, b) => s + (Number(quotas[b.value] || 0)), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* 出题方式 */}
      <div className="flex flex-col gap-2">
        <span className="text-sm text-on-surface-variant">出题方式（选一个维度分配题数）</span>
        <div className="flex flex-wrap gap-2">
          {([
            { id: "type", label: "按题型" },
            { id: "unit", label: "按单元" },
            { id: "knowledgePoint", label: "按知识点" },
          ] as const).map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setQuick({ groupDim: d.id, quotas: {} })}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition",
                groupDim === d.id
                  ? "border-primary bg-primary-container text-primary font-medium"
                  : "border-outline-variant text-on-surface-variant hover:border-primary/40",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* 难度筛选 */}
      <div className="flex flex-col gap-2">
        <span className="text-sm text-on-surface-variant">难度筛选（仅缩小范围，不改配额）</span>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={difficulty === null} onClick={() => setQuick({ difficulty: null })}>全部</FilterChip>
          {DIFFICULTIES.map((d) => (
            <FilterChip key={d} active={difficulty === d} onClick={() => setQuick({ difficulty: d })}>
              {DIFFICULTY_LABELS[d]}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* 配额表 */}
      <div className="overflow-hidden rounded-xl border border-outline-variant">
        <div className="grid grid-cols-[1fr_80px_110px] bg-surface-container px-4 py-2.5 text-xs text-on-surface-variant">
          <span>{groupDim === "type" ? "题型" : groupDim === "unit" ? "单元" : "知识点"}</span>
          <span className="text-center">库存</span>
          <span className="text-center">出题数</span>
        </div>
        {buckets.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-on-surface-variant">该维度暂无数据</div>
        ) : (
          buckets.map((b) => (
            <div key={b.value || "__none__"} className="grid grid-cols-[1fr_80px_110px] items-center border-t border-outline-variant/60 px-4 py-2.5">
              <span className={cn("text-sm", b.value === "" ? "text-on-surface-variant" : "text-on-surface")}>{labelFor(b.value)}</span>
              <span className="text-center text-sm text-on-surface-variant">{b.count}</span>
              <div className="flex justify-center">
                <Input
                  type="number"
                  min="0"
                  max={b.count}
                  value={quotas[b.value] ?? ""}
                  placeholder="0"
                  onChange={(e) => setQuota(b.value, e.target.value)}
                  className="h-8 w-[80px] text-center"
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* 每题分值 */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-on-surface-variant">每题分值</span>
        <Input
          type="number" min="0.5" step="0.5" value={score}
          onChange={(e) => setQuick({ score: e.target.value })}
          className="h-8 w-[90px] text-center"
        />
        <span className="text-on-surface-variant">分</span>
        <span className="ml-auto text-on-surface-variant">计划出题 <span className="font-medium text-on-surface">{totalPlanned}</span> 题</span>
      </div>
    </div>
  );
}

// ─── 明细模式 ───────────────────────────────────────────────
function DetailedEditor({ dims, draft, patch }: {
  dims: Dimensions;
  draft: ComposeDraft;
  patch: (n: Partial<ComposeDraft>) => void;
}) {
  const rows = draft.rows;
  function setRow(i: number, n: Partial<DetailRow>) {
    patch({ rows: rows.map((r, idx) => (idx === i ? { ...r, ...n } : r)) });
  }
  function addRow() {
    patch({ rows: [...rows, { unit: ANY, knowledgePoint: ANY, type: ANY, difficulty: ANY, count: "5", score: "2" }] });
  }
  function delRow(i: number) {
    patch({ rows: rows.filter((_, idx) => idx !== i) });
  }

  const cols = "grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_90px_84px_60px_64px_36px] gap-2 items-center";

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className={cn(cols, "bg-surface-container rounded-lg px-3 py-2 text-xs text-on-surface-variant")}>
            <span>单元</span><span>知识点</span><span>题型</span><span>难度</span>
            <span className="text-center">数量</span><span className="text-center">分值</span><span></span>
          </div>
          {rows.map((r, i) => (
            <div key={i} className={cn(cols, "px-3 py-2")}>
              <Select value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })} className="h-8 text-sm">
                <option value={ANY}>不限</option>
                {dims.units.map((u) => (
                  <option key={u.value || "__none__"} value={u.value === "" ? NONE : u.value}>
                    {u.value === "" ? "（未标注）" : u.value}
                  </option>
                ))}
              </Select>
              <Select value={r.knowledgePoint} onChange={(e) => setRow(i, { knowledgePoint: e.target.value })} className="h-8 text-sm">
                <option value={ANY}>不限</option>
                {dims.knowledgePoints.map((k) => (
                  <option key={k.value || "__none__"} value={k.value === "" ? NONE : k.value}>
                    {k.value === "" ? "（未标注）" : k.value}
                  </option>
                ))}
              </Select>
              <Select value={r.type} onChange={(e) => setRow(i, { type: e.target.value })} className="h-8 text-sm">
                <option value={ANY}>不限</option>
                {QUESTION_TYPES.map((t) => <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>)}
              </Select>
              <Select value={r.difficulty} onChange={(e) => setRow(i, { difficulty: e.target.value })} className="h-8 text-sm">
                <option value={ANY}>不限</option>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>)}
              </Select>
              <Input type="number" min="1" value={r.count} onChange={(e) => setRow(i, { count: e.target.value })} className="h-8 px-1 text-center" />
              <Input type="number" min="0.5" step="0.5" value={r.score} onChange={(e) => setRow(i, { score: e.target.value })} className="h-8 px-1 text-center" />
              <button
                type="button" onClick={() => delRow(i)}
                disabled={rows.length === 1}
                className="flex size-8 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container-low disabled:opacity-30"
                aria-label="删除规则"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <button
        type="button" onClick={addRow}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-outline px-3.5 py-2 text-sm text-on-surface-variant transition hover:border-primary/50 hover:text-primary"
      >
        <Plus className="size-4" /> 添加规则
      </button>
    </div>
  );
}

// ─── 预览结果面板 ────────────────────────────────────────────
function PreviewPanel({ preview }: { preview: PreviewResult }) {
  const shortfalls = preview.ruleResults.filter((r) => r.shortfall > 0);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <div><span className="text-2xl font-semibold text-primary">{preview.totalCount}</span><span className="ml-1 text-sm text-on-surface-variant">题</span></div>
        <div><span className="text-2xl font-semibold text-primary">{preview.totalScore}</span><span className="ml-1 text-sm text-on-surface-variant">分（满分）</span></div>
        {!preview.hasShortfall && (
          <span className="flex items-center gap-1 text-sm text-success"><Check className="size-4" />规则均满足</span>
        )}
      </div>

      {shortfalls.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg bg-warning-container px-3 py-2 text-xs text-on-surface">
          {shortfalls.map((r) => (
            <div key={r.index} className="flex items-center gap-1.5">
              <AlertCircle className="size-3.5 shrink-0" />
              第 {r.index + 1} 条规则：要 {r.requested} 题，库中仅 {r.available} 题，缺 {r.shortfall} 题
            </div>
          ))}
        </div>
      )}

      <div className="max-h-56 overflow-y-auto rounded-lg border border-outline-variant/60">
        {preview.items.map((it) => (
          <div key={it.questionId} className="flex items-center gap-2 border-b border-outline-variant/40 px-3 py-1.5 text-sm last:border-0">
            <span className="w-6 shrink-0 text-right text-xs text-on-surface-variant">{it.order}</span>
            <Badge variant="primary">{QUESTION_TYPE_LABELS[it.type]}</Badge>
            <span className="min-w-0 flex-1 truncate text-on-surface">{it.stem}</span>
            {it.knowledgePoint && <span className="shrink-0 text-xs text-on-surface-variant">{it.knowledgePoint}</span>}
            <span className="shrink-0 text-xs text-on-surface-variant">{it.score}分</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition",
        active ? "border-primary bg-primary-container text-primary font-medium" : "border-outline-variant text-on-surface-variant hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}
