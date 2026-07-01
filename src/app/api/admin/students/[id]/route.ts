// 超管：学生账号编辑 / 重置密码 / 恢复（PRD §13）
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { DEFAULT_STUDENT_PASSWORD } from "@/lib/constants";
import { updateStudentSchema } from "@/lib/validations/admin-student";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireApiRole("admin");
  if (g.error) return g.error;

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return fail("VALIDATION", "无效的学生 ID");

  const target = await prisma.student.findUnique({ where: { id } });
  if (!target) return fail("NOT_FOUND", "学生不存在");

  const body = await req.json().catch(() => null);
  const parsed = updateStudentSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION", "参数校验失败", parsed.error.flatten());

  const data: { name: string; passwordHash?: string; mustResetPwd?: boolean; deletedAt?: null } = {
    name: parsed.data.name,
  };
  if (parsed.data.resetPassword) {
    data.passwordHash = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, 10);
    data.mustResetPwd = true;
  }
  if (parsed.data.restore) {
    data.deletedAt = null;
  }

  const updated = await prisma.student.update({ where: { id }, data });
  return ok({ id: updated.id, name: updated.name, deletedAt: updated.deletedAt });
}
