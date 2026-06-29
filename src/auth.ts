// NextAuth v5 主配置（Node runtime）：在 Edge 安全的 authConfig 之上注入
// 真正访问数据库的 Credentials Provider。route handler 与服务端 auth() 由此导出。
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      // 入参：{ role, identifier, password }
      credentials: {
        role: {},
        identifier: {},
        password: {},
      },
      async authorize(raw) {
        // 1) Zod 校验入参
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { role, identifier, password } = parsed.data;

        // 2) 学生：查 Student.studentNo（过滤软删除）
        if (role === "student") {
          const student = await prisma.student.findFirst({
            where: { studentNo: identifier, deletedAt: null },
          });
          if (!student) return null;
          const ok = await bcrypt.compare(password, student.passwordHash);
          if (!ok) return null;
          return { id: String(student.id), name: student.name, role: "student" };
        }

        // 3) 教师 / 超管：查 Teacher.username
        const teacher = await prisma.teacher.findUnique({
          where: { username: identifier },
        });
        if (!teacher) return null;
        // 超管门户要求 isAdmin=true；普通教师即便密码正确也不得从 admin 登录
        if (role === "admin" && !teacher.isAdmin) return null;
        const ok = await bcrypt.compare(password, teacher.passwordHash);
        if (!ok) return null;
        // role 取自登录门户（teacher / admin），而非 isAdmin 标志
        return { id: String(teacher.id), name: teacher.name, role };
      },
    }),
  ],
});
