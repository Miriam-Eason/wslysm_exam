// 班级改名 / 删除（PRD §11）
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { updateClassSchema } from "@/lib/validations/class";

// 校验班级存在且归属当前教师；返回 classId 或错误响应
async function ownClassOr404(idParam: string, teacherId: number) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return { error: fail("VALIDATION", "无效的班级 ID") } as const;
  }
  const cls = await prisma.class.findUnique({ where: { id } });
  if (!cls) return { error: fail("NOT_FOUND", "班级不存在") } as const;
  if (cls.teacherId !== teacherId) {
    return { error: fail("FORBIDDEN", "无权操作该班级") } as const;
  }
  return { id } as const;
}

// PATCH /api/classes/:id —— 改名 { name }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const { id } = await params;
  const owned = await ownClassOr404(id, g.userId);
  if (owned.error) return owned.error;

  const body = await req.json().catch(() => null);
  const parsed = updateClassSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION", "参数校验失败", parsed.error.flatten());
  }

  const updated = await prisma.class.update({
    where: { id: owned.id },
    data: { name: parsed.data.name },
  });
  return ok({ id: updated.id, name: updated.name });
}

// DELETE /api/classes/:id —— 删班级（Enrollment / ExamClass 由外键级联清除；不删学生身份与考试）
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const { id } = await params;
  const owned = await ownClassOr404(id, g.userId);
  if (owned.error) return owned.error;

  await prisma.class.delete({ where: { id: owned.id } });
  return ok({ id: owned.id, deleted: true });
}
