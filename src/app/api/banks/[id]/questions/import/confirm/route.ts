import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { buildQuestionData } from "@/lib/question-data";
import { analyzeQuestionImportBatch } from "@/lib/import/question-import";
import { readImportRequest } from "@/lib/import/question-import-request";
import { InvalidQuestionIdentityError, loadQuestionIdentities, lockQuestionBank } from "@/lib/question-duplicates";

type FileResult = {
  index: number; name: string; status: "completed" | "failed" | "not_processed";
  created: number; duplicates: number; fileDups: number; conflicts: number; invalid: number; error?: string;
  issues: { kind: "duplicate" | "fileDup" | "conflict" | "invalid"; sheet: string; rowNo: number; reason: string }[];
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;
  const bankId = Number((await params).id);
  if (!Number.isInteger(bankId) || bankId <= 0) return fail("VALIDATION", "无效的题库 ID");
  const bank = await prisma.questionBank.findUnique({ where: { id: bankId }, select: { createdBy: true } });
  if (!bank) return fail("NOT_FOUND", "题库不存在");
  if (bank.createdBy !== g.userId) return fail("FORBIDDEN", "无权操作该题库");
  const request = await readImportRequest(req);
  if ("error" in request) return fail("VALIDATION", request.error);

  // Decide conflicts across the entire batch before writing any file.
  let analyzed;
  try {
    analyzed = analyzeQuestionImportBatch(request.files, await loadQuestionIdentities(prisma, bankId));
  } catch (error) {
    if (error instanceof InvalidQuestionIdentityError) return fail("CONFLICT", `题库中题目 ${error.questionId} 的身份数据无效，请先检查该题`);
    throw error;
  }
  const files: FileResult[] = [];
  let stopped = false;
  for (const file of analyzed.files) {
    const base: FileResult = { index: file.index, name: file.name, status: "completed", created: 0,
      duplicates: file.summary.duplicates, fileDups: file.summary.fileDups,
      conflicts: file.summary.conflicts, invalid: file.summary.invalid, issues: file.issues };
    if (file.error) { files.push({ ...base, status: "failed", error: file.error }); continue; }
    if (stopped) { files.push({ ...base, status: "not_processed" }); continue; }
    if (!file.importable.length) { files.push(base); continue; }
    try {
      const written = await prisma.$transaction(async tx => {
        await lockQuestionBank(tx, bankId);
        const currentBank = await tx.questionBank.findUnique({ where: { id: bankId }, select: { createdBy: true } });
        if (!currentBank || currentBank.createdBy !== g.userId) throw new Error("题库不存在或无权操作");
        // Another page can change the bank after preview or between files.
        const latest = analyzeQuestionImportBatch([{ index: file.index, name: file.name, rows: file.importable }], await loadQuestionIdentities(tx, bankId));
        const pending = latest.files[0];
        let created = 0;
        const importBatchId = randomUUID();
        for (let i = 0; i < pending.importable.length; i += 200) {
          const batch = pending.importable.slice(i, i + 200);
          // MySQL INSERT IGNORE can hide non-duplicate data errors. The bank lock
          // serializes supported writers, so any write error must roll back the file.
          const result = await tx.question.createMany({ data: batch.map(q => ({ bankId, importBatchId, ...buildQuestionData(q.input) })) });
          created += result.count;
        }
        return { created, duplicates: pending.summary.duplicates, conflicts: pending.summary.conflicts, issues: pending.issues };
      }, { maxWait: 30_000, timeout: 300_000 });
      files.push({ ...base, created: written.created, duplicates: base.duplicates + written.duplicates, conflicts: base.conflicts + written.conflicts, issues: [...base.issues, ...written.issues] });
    } catch (error) {
      console.error("题目导入失败", error);
      const message = error instanceof InvalidQuestionIdentityError ? `题库中题目 ${error.questionId} 的身份数据无效，请先检查该题` : "导入失败，本文件未写入，请重试";
      files.push({ ...base, status: "failed", error: message });
      stopped = true;
    }
  }
  const summary = files.reduce((sum, file) => ({ created: sum.created + file.created, duplicates: sum.duplicates + file.duplicates,
    fileDups: sum.fileDups + file.fileDups, conflicts: sum.conflicts + file.conflicts, invalid: sum.invalid + file.invalid }),
  { created: 0, duplicates: 0, fileDups: 0, conflicts: 0, invalid: 0 });
  return ok({ files, summary });
}
