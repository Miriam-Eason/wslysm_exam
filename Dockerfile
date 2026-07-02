# syntax=docker/dockerfile:1
# ============================================================================
# 智慧题库与智能练测系统 —— 生产镜像（多阶段构建，最终镜像仅含运行期产物）
# 基础镜像用 Debian slim 而非 alpine：Prisma 在 glibc + openssl3 上零折腾。
# ============================================================================

# ---------- 公共基础层 ----------
FROM node:22-slim AS base
# 国内构建加速：Debian 源 → 镜像（默认腾讯云内网，在腾讯云服务器上最快）；
# npm / Prisma 引擎 → 淘宝镜像。境外构建时可用 --build-arg DEBIAN_MIRROR=deb.debian.org 还原。
ARG DEBIAN_MIRROR=mirrors.tencentyun.com
ENV NEXT_TELEMETRY_DISABLED=1 \
    npm_config_registry=https://registry.npmmirror.com \
    PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
# Prisma 运行/生成引擎需要 openssl
RUN sed -i "s|deb.debian.org|${DEBIAN_MIRROR}|g; s|security.debian.org|${DEBIAN_MIRROR}|g" /etc/apt/sources.list.d/debian.sources 2>/dev/null || true; \
    sed -i "s|deb.debian.org|${DEBIAN_MIRROR}|g; s|security.debian.org|${DEBIAN_MIRROR}|g" /etc/apt/sources.list 2>/dev/null || true; \
    apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---------- 依赖层（缓存 npm ci）----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---------- 构建层（产出 Next standalone）----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 构建期占位环境变量，避免任何早期实例化因缺变量报错（运行期由 compose 注入真实值）
ENV DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder" \
    NEXTAUTH_SECRET="build-time-placeholder"
# 生成 Prisma Client（linux 引擎）+ 产出 Next standalone
RUN npx prisma generate \
  && npm run build

# ---------- 迁移层（一次性任务镜像：完整依赖 + Prisma CLI，但不含 Next 构建产物）----------
FROM base AS migrator
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma
COPY docker-migrate.sh ./
# 生成 linux 引擎供 migrate deploy 与 seed 使用
RUN npx prisma generate

# ---------- 运行层（精简：仅运行 Next 服务，不含 Prisma CLI）----------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# 非 root 用户运行
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Next standalone 运行产物（含精简后的 node_modules 与 server.js）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# 补齐 Prisma 运行期引擎（standalone 追踪偶有遗漏），保证服务端查询可用
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
# 启动脚本：按 MYSQL_* 自动拼装 DATABASE_URL 后再启动服务
COPY --chown=nextjs:nodejs docker-app-entrypoint.sh ./docker-app-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["sh", "./docker-app-entrypoint.sh"]
