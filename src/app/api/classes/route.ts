// 班级列表 / 新建（PRD §11；班级为全校共享实体）
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { createClassSchema } from "@/lib/validations/class";

// GET /api/classes            —— 我授课的班级
// GET /api/classes?scope=all  —— 全校班级（用于「班级列表」弹窗，附是否已授课）
export async function GET(req: NextRequest) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const scope = req.nextUrl.searchParams.get("scope");

  if (scope === "all") {
    const all = await prisma.class.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { enrollments: true } },
        teacher: { select: { name: true } },
        teachers: { where: { teacherId: g.userId }, select: { teacherId: true } },
      },
    });
    return ok(
      all.map((c) => ({
        id: c.id,
        name: c.name,
        studentCount: c._count.enrollments,
        creatorName: c.teacher.name,
        teaching: c.teachers.length > 0,
      })),
    );
  }

  const classes = await prisma.class.findMany({
    where: { teachers: { some: { teacherId: g.userId } } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { enrollments: true } },
      teacher: { select: { name: true } },
    },
  });
  return ok(
    classes.map((c) => ({
      id: c.id,
      name: c.name,
      studentCount: c._count.enrollments,
      creatorName: c.teacher.name,
      isCreator: c.teacherId === g.userId,
    })),
  );
}

// POST /api/classes —— 新建班级（同时把创建者设为授课教师）；撞名 409
export async function POST(req: NextRequest) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const body = await req.json().catch(() => null);
  const parsed = createClassSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION", "参数校验失败", parsed.error.flatten());

  const dup = await prisma.class.findUnique({ where: { name: parsed.data.name } });
  if (dup) return fail("CONFLICT", `班级名称「${parsed.data.name}」已存在，请勿重复创建`);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.class.create({ data: { name: parsed.data.name, teacherId: g.userId } });
      await tx.classTeacher.create({ data: { classId: c.id, teacherId: g.userId } });
      return c;
    });
    return ok({ id: created.id, name: created.name }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("CONFLICT", "班级名称已存在，请勿重复创建");
    }
    throw e;
  }
}
