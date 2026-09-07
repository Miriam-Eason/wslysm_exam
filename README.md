# 无锡旅游商贸助考宝

面向教师、学生和管理员的题库、组卷、在线作答与成绩管理系统。开发环境采用“Next.js 直接运行在 Mac + MySQL 8.4 运行在 Docker”：前端热更新快，数据库版本和数据卷可复现。

## 本地首次启动

需要 Node.js 22、npm 和已启动的 Docker Desktop。

```bash
npm ci
cp .env.example .env
npm run db:up
npm run db:deploy
npm run db:seed
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。开发数据账号：

| 身份 | 账号 | 密码 |
|---|---|---|
| 管理员 | `admin` | `admin123` |
| 教师 | `teacher01` | `teacher123` |
| 学生 | `2024000101` | `wxls12345` |

`db:seed` 会删除当前开发库中的全部业务数据并重新生成演示数据，不能对生产数据库运行。执行前先确认 `.env` 中的主机是 `127.0.0.1`。

## 日常开发

```bash
npm run db:up       # 启动本地 MySQL，等待健康检查通过
npm run db:down     # 删除容器和网络，保留命名卷中的数据
npm run db:logs     # 跟踪 MySQL 日志
npm run db:migrate  # 开发时根据 schema 创建并应用新迁移
npm run db:deploy   # 只应用仓库中已有迁移
npm run db:seed     # 破坏性重建完整演示数据
npm run db:reset    # 破坏性重建 schema，并运行 seed
npm run dev         # Mac 上运行 Next.js
```

本地数据库只绑定 `127.0.0.1:3306`，容器删除后数据仍保存在命名卷 `wxlysm-exam-dev_db_dev_data`。只有显式执行下面命令才会清除本地数据库：

```bash
docker compose -f docker-compose.dev.yml down -v
```

## 提交前检查

```bash
npm run lint
npm run typecheck
npx prisma validate
npm run build
```

也可用 `npm run check` 一次执行 lint、类型检查和构建。应用/数据库存活探针为 `GET /api/health`：数据库可连接时返回 200，否则返回 503，响应不暴露连接信息。

## 数据库迁移约定

- 开发：修改 `prisma/schema.prisma` 后使用 `npm run db:migrate -- --name <name>`。
- 生产：只使用 `prisma migrate deploy`，由 Compose 的一次性 `migrate` 服务执行。
- `20260702000000_initial_baseline` 是提交 `0d0879b` 已部署结构的 baseline，不含 `Exam.blueprint`。
- `20260703081020_exam_compose_blueprint` 只增加 nullable 的 `Exam.blueprint JSON`。
- 现有生产数据默认必须保留。上线前必须先备份并检查真实 schema / `_prisma_migrations`，不能直接 reset 或盲目执行 baseline SQL。

## 生产部署

生产 Compose 默认锁定 `mysql:8.0.46`，避免一次应用发布顺带进行数据库大版本升级；本地固定 MySQL 8.4。生产升级到 8.4 应作为独立变更，先完成异地备份、升级检查和恢复演练。

完整的首次部署、已有库 baseline、备份恢复和回滚步骤见 [`document/部署文档.md`](document/部署文档.md)。当前生产域名为 `https://tk.wxlysm.com.cn`。
