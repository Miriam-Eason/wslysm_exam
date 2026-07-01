// POST /api/teacher/change-password — 教师自助修改密码（校验原密码后更新）
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { changePasswordSchema } from "@/lib/validations/change-password";

export async function POST(req: NextRequest) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const body = await req.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "参数错误");
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: g.userId },
    select: { passwordHash: true },
  });
  if (!teacher) return fail("NOT_FOUND", "教师不存在");

  const matches = await bcrypt.compare(parsed.data.oldPassword, teacher.passwordHash);
  if (!matches) return fail("VALIDATION", "原密码不正确");

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.teacher.update({
    where: { id: g.userId },
    data: { passwordHash },
  });

  return ok({ success: true });
}
