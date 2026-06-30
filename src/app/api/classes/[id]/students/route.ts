// 班内学生列表（分页，PRD §11）
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, parsePagination } from "@/lib/api";
import { requireApiRole } from "@/lib/auth-guard";
import { loadClassForTeacher } from "@/lib/class-access";

// GET /api/classes/:id/students?page&pageSize —— 班内学生分页列表
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiRole("teacher");
  if (g.error) return g.error;

  const { id: idParam } = await params;
  const classId = Number(idParam);
  if (!Number.isInteger(classId) || classId <= 0) {
    return fail("VALIDATION", "无效的班级 ID");
  }

  const cls = await loadClassForTeacher(classId, g.userId);
  if (!cls) return fail("NOT_FOUND", "班级不存在");
  if (!cls.teaches) return fail("FORBIDDEN", "你未授课该班级，请先在「班级列表」中添加");

  const { page, pageSize, skip, take } = parsePagination(req.nextUrl.searchParams);

  // 只统计 / 列出未软删除的学生
  const where = { classId, student: { deletedAt: null } };
  const [total, enrollments] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({
      where,
      skip,
      take,
      orderBy: { student: { studentNo: "asc" } },
      select: {
        student: { select: { id: true, studentNo: true, name: true, createdAt: true } },
      },
    }),
  ]);

  return ok({
    items: enrollments.map((e) => e.student),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    class: { id: cls.id, name: cls.name },
  });
}
