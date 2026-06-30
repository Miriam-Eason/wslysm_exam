// 授课关联：把已存在班级加入 / 移出「我的授课」（PRD 班级共享）
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";

function parseId(idParam: string) {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// POST /api/classes/:id/teachers —— 当前教师加入该班授课
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;
  const { id } = await params;
  const classId = parseId(id);
  if (!classId) return fail("VALIDATION", "无效的班级 ID");

  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { id: true } });
  if (!cls) return fail("NOT_FOUND", "班级不存在");

  await prisma.classTeacher.upsert({
    where: { classId_teacherId: { classId, teacherId: g.userId } },
    create: { classId, teacherId: g.userId },
    update: {},
  });
  return ok({ classId, joined: true });
}

// DELETE /api/classes/:id/teachers —— 当前教师移出该班授课（不删班级）
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;
  const { id } = await params;
  const classId = parseId(id);
  if (!classId) return fail("VALIDATION", "无效的班级 ID");

  await prisma.classTeacher.deleteMany({ where: { classId, teacherId: g.userId } });
  return ok({ classId, left: true });
}
