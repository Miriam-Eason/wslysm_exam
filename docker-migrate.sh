#!/bin/sh
# 一次性迁移任务：由 compose 的 migrate 服务执行（运行在含完整依赖的 migrator 镜像中）。
# 完成后容器退出，app 服务通过 service_completed_successfully 等待其成功。
set -e

# 若未显式提供 DATABASE_URL，则按 MYSQL_* 自动拼装（主机名固定为 compose 服务名 db）
: "${DATABASE_URL:=mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@db:3306/${MYSQL_DATABASE}}"
export DATABASE_URL

echo "▶ [1/2] 应用数据库迁移 (prisma migrate deploy)…"
node node_modules/prisma/build/index.js migrate deploy

echo "▶ [2/2] 初始化管理员账号 (admin01 / admin02)…"
node prisma/seed.prod.mjs

echo "✅ 数据库就绪。"
