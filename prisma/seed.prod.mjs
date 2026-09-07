// 生产环境一次性管理员引导。
// 未提供 BOOTSTRAP_ADMIN_* 时安全跳过；已存在的账号绝不会被重置密码。
//
// 说明：使用纯 ESM + @prisma/client（standalone 已打包），无需 tsx，可直接 `node` 运行。
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim();
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  const supplied = [username, name, password].filter(Boolean).length;
  if (supplied === 0) {
    console.log("  → 未配置 BOOTSTRAP_ADMIN_*，跳过管理员引导。");
    return;
  }
  if (supplied !== 3) {
    throw new Error("BOOTSTRAP_ADMIN_USERNAME/NAME/PASSWORD 必须同时提供");
  }
  if (password.length < 12) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD 至少需要 12 个字符");
  }

  const existing = await prisma.teacher.findUnique({ where: { username } });
  if (existing) {
    console.log(`  → 管理员账号 ${username} 已存在，保持原密码。`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.teacher.create({
    data: { username, name, passwordHash, isAdmin: true },
  });
  console.log(`  ✓ 管理员已创建：${username}`);
}

main()
  .catch((e) => {
    console.error("✗ 管理员初始化失败：", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
