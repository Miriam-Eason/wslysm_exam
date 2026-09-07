<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 智慧题库项目协作约定

## 项目概况

- Next.js 16 App Router + React 19 + TypeScript + Tailwind CSS 4；生产构建固定使用 Webpack，避免受限/离线环境中 Turbopack PostCSS 子进程绑定端口失败。
- Auth.js v5 Credentials，教师/管理员来自 `Teacher`，学生来自 `Student`。
- Prisma 6 + MySQL；本地由 Mac 直接运行 Next.js，MySQL 8.4 运行在 Docker。
- 生产为单实例 Next.js standalone + MySQL + Nginx，均由 `docker-compose.yml` 编排。

## 权威资料

发生冲突时按以下顺序处理：

1. `prisma/schema.prisma` 与已提交的 `prisma/migrations/`
2. `document/数据模型总表.md`
3. `document/开发PRD文档.md`
4. `document/开发日志.md`（历史背景，不作为当前命令或密钥的权威来源）

Next.js API/约定必须先查 `node_modules/next/dist/docs/`。部署操作查 `README.md` 与 `document/部署文档.md`，剩余依赖风险查 `document/依赖安全审计.md`。

## 不可破坏的业务约束

- `answer` / `chosen` 始终使用数组：单选 `['A']`、多选 `['A','B']`、判断 `['T']`、填空 `[['答案1','别名'], ...]`；不要改成字符串。
- 学生作答接口绝不返回 `answer`；判分只在服务端执行。
- `ExamQuestion` 是组卷时的内容快照；修改或删除原题不得改变已生成试卷。
- 学生有作答记录时不得硬删；沿用现有软删除流程。
- 班级为全校唯一实体；创建者负责改名/删除，授课关系使用 `ClassTeacher`。
- PrismaClient 必须使用 `src/lib/prisma.ts` 的全局单例。
- 页面与 Route Handler 都必须执行角色鉴权；API 使用 `requireApiRole` 和统一的 `ok` / `fail` 响应。
- 不要升级 Prisma 主版本，除非任务明确包含 Prisma 7 迁移和 Docker 验证。

## 数据库安全

- 本地可显式运行 `npm run db:reset`，它会清空并重建开发库；不要在不确定的连接串上运行。
- 生产只使用 `prisma migrate deploy`，禁止 `migrate dev`、`db push` 和 `migrate reset`。
- 已有生产库必须先备份、检查实际表结构和 `_prisma_migrations`，再决定 baseline；不允许假设线上为空库。
- 第一份迁移 `20260702000000_initial_baseline` 对应提交 `0d0879b`，不含 `Exam.blueprint`；第二份迁移仅新增 nullable JSON 字段 `Exam.blueprint`。
- App 和迁移容器只使用业务数据库账号；MySQL root 口令不得注入 App。
- `.env` / `.env.production` 不提交；生产管理员仅通过临时 `BOOTSTRAP_ADMIN_*` 创建，成功后移除这些变量。

## 常用命令与完成标准

```bash
npm run db:up
npm run db:deploy
npm run db:seed
npm run dev

npm run lint
npm run typecheck
npm run build
npx prisma validate
```

`npm run check` 顺序执行 lint、typecheck、build。改动数据库时还要验证全新 MySQL 8.4 卷上的迁移和 seed；改动部署时还要验证 Compose 配置、镜像构建和 `/api/health`。不要改写历史开发日志，除非任务明确要求记录新条目。
