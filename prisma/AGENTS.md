# 数据模型、迁移与初始化

上级规则：[根 AGENTS.md](../AGENTS.md)。执行数据库操作前读 [README](../README.md)；生产操作另读 [部署文档](../document/部署文档.md)。

## 权威与入口

- [schema.prisma](schema.prisma) 与已提交的 [migrations](migrations) 定义数据库结构；字段含义和 JSON 契约核对 [数据模型总表](../document/数据模型总表.md)。
- [seed.ts](seed.ts) 是开发演示数据重建脚本，会清空业务表；`npm run db:seed` 调用它。
- [seed.prod.mjs](seed.prod.mjs) 仅用于生产一次性管理员引导，不重建演示数据，不重置已存在账号密码。
- App 使用 [src/lib/prisma.ts](../src/lib/prisma.ts) 单例；这两个独立脚本自行创建并断开 PrismaClient。

## 迁移边界

- 不改写已提交迁移；schema 变更通过新增迁移表达，并检查生成的 SQL 是否符合预期。
- 本地 `npm run db:migrate` 创建并应用开发迁移，`npm run db:deploy` 只应用已有迁移；前者只针对已核实的开发库。生产限制遵循根文件。
- 初始迁移 [20260702000000_initial_baseline](migrations/20260702000000_initial_baseline/migration.sql) 对应提交 `0d0879b`，不含 `Exam.blueprint`；后续 [20260703081020_exam_compose_blueprint](migrations/20260703081020_exam_compose_blueprint/migration.sql) 仅新增 nullable JSON 字段 `Exam.blueprint`。
- 已有库不能直接执行 baseline 建表 SQL；先备份并核对实际结构和迁移记录，再按部署文档决定登记方式。历史迁移存在不等于当前数据库已经应用。
- 关系、级联或删除规则变更时核对学生软删除、作答记录、试卷快照和班级授课关系，不通过硬删历史数据消除约束错误。

## 验证与同步

- 执行 `npx prisma validate`；在独立临时 MySQL 8.4 卷上从零应用全部迁移并运行开发 seed，随后验证受影响的查询与写入。临时环境不得指向现有开发或生产数据卷。
- 字段或关系契约变化时同步核对数据模型文档、`src/lib/validations`、相关 API 和消费字段的页面；只有入口或规则变化才更新本指令。
- `db:seed`、`db:reset` 和删除卷均不是连接故障的修复步骤；先查连接与迁移状态，遵循根文件的数据保留约束。
