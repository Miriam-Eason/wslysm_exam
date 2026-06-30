// 班级访问判定：班级为全校共享实体。
//  - teaches：当前教师是否授课该班（ClassTeacher）——查看 / 导入 学生的门槛
//  - isCreator：是否创建者（Class.teacherId）——改名 / 删班 / 删学生 的门槛
import { prisma } from "@/lib/prisma";

export async function loadClassForTeacher(classId: number, teacherId: number) {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      teacherId: true,
      teachers: { where: { teacherId }, select: { teacherId: true } },
    },
  });
  if (!cls) return null;
  return {
    id: cls.id,
    name: cls.name,
    isCreator: cls.teacherId === teacherId,
    teaches: cls.teachers.length > 0,
  };
}
