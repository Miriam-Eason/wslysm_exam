// 生产环境初始化脚本（幂等）—— 仅确保两个超管账号存在，不写入任何测试数据。
// 由 docker-entrypoint.sh 在每次容器启动时执行；已存在的账号不会被覆盖。
//
// 说明：使用纯 ESM + @prisma/client（standalone 已打包），无需 tsx，可直接 `node` 运行。
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_ADMIN_PWD = "wxlysm";
const ADMINS = [
  { username: "admin01", name: "管理员一" },
  { username: "admin02", name: "管理员二" },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PWD, 10);

  for (const a of ADMINS) {
    await prisma.teacher.upsert({
      where: { username: a.username },
      // 已存在则不动：避免每次重启重置管理员改过的密码
      update: {},
      create: {
        username: a.username,
        name: a.name,
        passwordHash,
        isAdmin: true,
      },
    });
    console.log(`  ✓ 管理员就绪：${a.username}`);
  }
}

main()
  .catch((e) => {
    console.error("✗ 管理员初始化失败：", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
