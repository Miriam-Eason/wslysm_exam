// 班级列表 / 新建（PRD §11）
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { createClassSchema } from "@/lib/validations/class";

// GET /api/classes —— 当前教师的班级列表（含人数）
export async function GET() {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const classes = await prisma.class.findMany({
    where: { teacherId: g.userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { enrollments: true } } },
  });

  return ok(
    classes.map((c) => ({
      id: c.id,
      name: c.name,
      studentCount: c._count.enrollments,
      createdAt: c.createdAt,
    })),
  );
}

// POST /api/classes —— 新建班级 { name }
export async function POST(req: NextRequest) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const body = await req.json().catch(() => null);
  const parsed = createClassSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION", "参数校验失败", parsed.error.flatten());
  }

  const created = await prisma.class.create({
    data: { name: parsed.data.name, teacherId: g.userId },
  });

  return ok(
    { id: created.id, name: created.name, studentCount: 0, createdAt: created.createdAt },
    { status: 201 },
  );
}
