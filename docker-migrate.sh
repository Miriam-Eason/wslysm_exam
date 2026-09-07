#!/bin/sh
# 一次性迁移任务：由 compose 的 migrate 服务执行（运行在含完整依赖的 migrator 镜像中）。
# 完成后容器退出，app 服务通过 service_completed_successfully 等待其成功。
set -e

# 只使用业务数据库账号，migrate 容器无需获得 MySQL root 口令。
: "${MYSQL_USER:?MYSQL_USER is required}"
: "${MYSQL_PASSWORD:?MYSQL_PASSWORD is required}"
: "${MYSQL_DATABASE:?MYSQL_DATABASE is required}"

: "${DATABASE_URL:=mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@db:3306/${MYSQL_DATABASE}}"
export DATABASE_URL

echo "▶ [1/2] 应用数据库迁移 (prisma migrate deploy)…"
node node_modules/prisma/build/index.js migrate deploy

echo "▶ [2/2] 检查一次性管理员引导配置…"
node prisma/seed.prod.mjs

echo "✅ 数据库就绪。"
