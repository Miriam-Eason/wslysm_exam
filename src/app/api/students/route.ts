// 批量删除学生（PRD §11）：无作答→硬删（级联清 Enrollment）；有作答→软删（deletedAt）。
// 仅允许删除归属当前教师班级的学生。
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { deleteStudentsSchema } from "@/lib/validations/student";

export async function DELETE(req: NextRequest) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const body = await req.json().catch(() => null);
  const parsed = deleteStudentsSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION", "参数校验失败", parsed.error.flatten());
  }
  const requestedIds = parsed.data.ids;

  // 归属过滤：仅保留属于当前教师某个班级的学生
  const owned = await prisma.student.findMany({
    where: {
      id: { in: requestedIds },
      enrollments: { some: { class: { teacherId: g.userId } } },
    },
    select: { id: true },
  });
  const ownedIds = owned.map((s) => s.id);
  const rejected = requestedIds.filter((id) => !ownedIds.includes(id));

  if (ownedIds.length === 0) {
    return fail("FORBIDDEN", "所选学生不属于你的班级，无法删除");
  }

  // 有作答记录的学生 → 软删除；其余 → 硬删除（Attempt.studentId 为 Restrict，硬删会被 DB 拒绝）
  const withAttempts = await prisma.attempt.findMany({
    where: { studentId: { in: ownedIds } },
    select: { studentId: true },
    distinct: ["studentId"],
  });
  const softIds = withAttempts.map((a) => a.studentId);
  const hardIds = ownedIds.filter((id) => !softIds.includes(id));

  const [hard, soft] = await prisma.$transaction([
    prisma.student.deleteMany({ where: { id: { in: hardIds } } }), // 级联清 Enrollment
    prisma.student.updateMany({
      where: { id: { in: softIds } },
      data: { deletedAt: new Date() },
    }),
  ]);

  return ok({
    hardDeleted: hard.count,
    softDeleted: soft.count,
    rejected: rejected.length,
  });
}
