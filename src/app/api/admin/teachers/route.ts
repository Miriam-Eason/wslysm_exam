// 超管：教师账号列表 / 新建（PRD §13 `/api/admin/teachers`）
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, parsePagination } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { createTeacherSchema } from "@/lib/validations/teacher";

// GET /api/admin/teachers?q=&page=&pageSize= —— 全量教师列表，按用户名/姓名搜索
export async function GET(req: NextRequest) {
  const g = await requireApiRole("admin");
  if (g.error) return g.error;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const { page, pageSize, skip, take } = parsePagination(req.nextUrl.searchParams);

  const where: Prisma.TeacherWhereInput = q
    ? { OR: [{ username: { contains: q } }, { name: { contains: q } }] }
    : {};

  const [total, rows] = await Promise.all([
    prisma.teacher.count({ where }),
    prisma.teacher.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { classes: true, teaching: true, questionBanks: true, exams: true } },
      },
    }),
  ]);

  return ok({
    items: rows.map((t) => ({
      id: t.id,
      username: t.username,
      name: t.name,
      isAdmin: t.isAdmin,
      createdAt: t.createdAt,
      classCount: t._count.classes,
      teachingCount: t._count.teaching,
      bankCount: t._count.questionBanks,
      examCount: t._count.exams,
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

// POST /api/admin/teachers —— 新建教师 / 超管账号；用户名撞车 409
export async function POST(req: NextRequest) {
  const g = await requireApiRole("admin");
  if (g.error) return g.error;

  const body = await req.json().catch(() => null);
  const parsed = createTeacherSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION", "参数校验失败", parsed.error.flatten());

  const dup = await prisma.teacher.findUnique({ where: { username: parsed.data.username } });
  if (dup) return fail("CONFLICT", `账号「${parsed.data.username}」已存在`);

  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const created = await prisma.teacher.create({
      data: {
        username: parsed.data.username,
        name: parsed.data.name,
        isAdmin: parsed.data.isAdmin,
        passwordHash,
      },
    });
    return ok(
      { id: created.id, username: created.username, name: created.name, isAdmin: created.isAdmin },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("CONFLICT", "账号已存在");
    }
    throw e;
  }
}
