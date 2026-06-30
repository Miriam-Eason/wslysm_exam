// 班级改名 / 删除（PRD §11；仅创建者可操作）
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { loadClassForTeacher } from "@/lib/class-access";
import { updateClassSchema } from "@/lib/validations/class";

async function creatorClassOr(idParam: string, teacherId: number) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return { error: fail("VALIDATION", "无效的班级 ID") } as const;
  const c = await loadClassForTeacher(id, teacherId);
  if (!c) return { error: fail("NOT_FOUND", "班级不存在") } as const;
  if (!c.isCreator) return { error: fail("FORBIDDEN", "仅班级创建者可改名 / 删除") } as const;
  return { id } as const;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;
  const { id } = await params;
  const owned = await creatorClassOr(id, g.userId);
  if (owned.error) return owned.error;

  const body = await req.json().catch(() => null);
  const parsed = updateClassSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION", "参数校验失败", parsed.error.flatten());

  // 改名撞名检测（排除自己）
  const dup = await prisma.class.findUnique({ where: { name: parsed.data.name } });
  if (dup && dup.id !== owned.id) return fail("CONFLICT", `班级名称「${parsed.data.name}」已存在`);

  try {
    const updated = await prisma.class.update({
      where: { id: owned.id },
      data: { name: parsed.data.name },
    });
    return ok({ id: updated.id, name: updated.name });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("CONFLICT", "班级名称已存在");
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;
  const { id } = await params;
  const owned = await creatorClassOr(id, g.userId);
  if (owned.error) return owned.error;

  // 级联清 Enrollment 与 ClassTeacher；学生身份与试卷快照不受影响
  await prisma.class.delete({ where: { id: owned.id } });
  return ok({ id: owned.id, deleted: true });
}
