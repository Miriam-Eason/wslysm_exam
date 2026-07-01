// 超管：学生账号列表 / 新建 / 批量删除（PRD §13）
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, parsePagination } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { DEFAULT_STUDENT_PASSWORD } from "@/lib/constants";
import { createStudentSchema } from "@/lib/validations/admin-student";
import { deleteStudentsSchema } from "@/lib/validations/student";

// GET /api/admin/students?q=&page=&pageSize=&deleted=active|deleted|all —— 全量学生列表
export async function GET(req: NextRequest) {
  const g = await requireApiRole("admin");
  if (g.error) return g.error;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const deleted = req.nextUrl.searchParams.get("deleted") ?? "active";
  const { page, pageSize, skip, take } = parsePagination(req.nextUrl.searchParams);

  const where: Prisma.StudentWhereInput = {
    ...(deleted === "active" ? { deletedAt: null } : deleted === "deleted" ? { deletedAt: { not: null } } : {}),
    ...(q ? { OR: [{ studentNo: { contains: q } }, { name: { contains: q } }] } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        enrollments: { select: { class: { select: { id: true, name: true } } } },
        _count: { select: { attempts: true } },
      },
    }),
  ]);

  return ok({
    items: rows.map((s) => ({
      id: s.id,
      studentNo: s.studentNo,
      name: s.name,
      mustResetPwd: s.mustResetPwd,
      deletedAt: s.deletedAt,
      createdAt: s.createdAt,
      classes: s.enrollments.map((e) => e.class),
      attemptCount: s._count.attempts,
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

// POST /api/admin/students —— 新建单个学生账号，可选立即加入某班级
export async function POST(req: NextRequest) {
  const g = await requireApiRole("admin");
  if (g.error) return g.error;

  const body = await req.json().catch(() => null);
  const parsed = createStudentSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION", "参数校验失败", parsed.error.flatten());

  const dup = await prisma.student.findUnique({ where: { studentNo: parsed.data.studentNo } });
  if (dup) return fail("CONFLICT", `学号「${parsed.data.studentNo}」已存在`);

  if (parsed.data.classId) {
    const cls = await prisma.class.findUnique({ where: { id: parsed.data.classId } });
    if (!cls) return fail("VALIDATION", "所选班级不存在");
  }

  try {
    const passwordHash = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, 10);
    const created = await prisma.student.create({
      data: {
        studentNo: parsed.data.studentNo,
        name: parsed.data.name,
        passwordHash,
        ...(parsed.data.classId
          ? { enrollments: { create: { classId: parsed.data.classId } } }
          : {}),
      },
    });
    return ok({ id: created.id, studentNo: created.studentNo, name: created.name }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("CONFLICT", "学号已存在");
    }
    throw e;
  }
}

// DELETE /api/admin/students —— 批量删除；有作答→软删除，无作答→硬删除（不受班级归属限制）
export async function DELETE(req: NextRequest) {
  const g = await requireApiRole("admin");
  if (g.error) return g.error;

  const body = await req.json().catch(() => null);
  const parsed = deleteStudentsSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION", "参数校验失败", parsed.error.flatten());
  const ids = parsed.data.ids;

  const withAttempts = await prisma.attempt.findMany({
    where: { studentId: { in: ids } },
    select: { studentId: true },
    distinct: ["studentId"],
  });
  const softIds = withAttempts.map((a) => a.studentId);
  const hardIds = ids.filter((id) => !softIds.includes(id));

  const [hard, soft] = await prisma.$transaction([
    prisma.student.deleteMany({ where: { id: { in: hardIds } } }), // 级联清 Enrollment
    prisma.student.updateMany({ where: { id: { in: softIds } }, data: { deletedAt: new Date() } }),
  ]);

  return ok({ hardDeleted: hard.count, softDeleted: soft.count });
}
