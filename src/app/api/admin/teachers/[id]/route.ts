// 超管：教师账号编辑 / 删除（PRD §13）
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { updateTeacherSchema } from "@/lib/validations/teacher";

function parseId(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireApiRole("admin");
  if (g.error) return g.error;

  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return fail("VALIDATION", "无效的教师 ID");

  const target = await prisma.teacher.findUnique({ where: { id } });
  if (!target) return fail("NOT_FOUND", "教师不存在");

  const body = await req.json().catch(() => null);
  const parsed = updateTeacherSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION", "参数校验失败", parsed.error.flatten());

  // 禁止超管取消自己的超管权限，避免误操作后无人能进入 /admin
  if (id === g.userId && target.isAdmin && !parsed.data.isAdmin) {
    return fail("FORBIDDEN", "不能取消自己的超管权限，请让另一位超管操作");
  }

  const data: { name: string; isAdmin: boolean; passwordHash?: string } = {
    name: parsed.data.name,
    isAdmin: parsed.data.isAdmin,
  };
  if (parsed.data.password) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }

  const updated = await prisma.teacher.update({ where: { id }, data });
  return ok({ id: updated.id, name: updated.name, isAdmin: updated.isAdmin });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireApiRole("admin");
  if (g.error) return g.error;

  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return fail("VALIDATION", "无效的教师 ID");

  if (id === g.userId) return fail("FORBIDDEN", "不能删除自己的账号");

  const target = await prisma.teacher.findUnique({ where: { id } });
  if (!target) return fail("NOT_FOUND", "教师不存在");

  // Class.teacherId / QuestionBank.createdBy / Exam.createdBy 外键为 Restrict：
  // 该教师创建过班级/题库/考试时禁止删除，需先转移或删除这些内容
  const counts = await prisma.$transaction([
    prisma.class.count({ where: { teacherId: id } }),
    prisma.questionBank.count({ where: { createdBy: id } }),
    prisma.exam.count({ where: { createdBy: id } }),
  ]);
  const [classCount, bankCount, examCount] = counts;
  if (classCount > 0 || bankCount > 0 || examCount > 0) {
    return fail(
      "CONFLICT",
      `该教师创建过 ${classCount} 个班级 / ${bankCount} 个题库 / ${examCount} 场考试，需先转移或清理后才能删除`,
    );
  }

  await prisma.teacher.delete({ where: { id } }); // 级联清 ClassTeacher（授课关系）
  return ok({ id, deleted: true });
}
