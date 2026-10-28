<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 智慧题库项目协作约定

## 项目概况

- Next.js 16 App Router + React 19 + TypeScript + Tailwind CSS 4；Auth.js v5 Credentials。
- Prisma 6 + MySQL；本地由 Mac 运行 Next.js，MySQL 8.4 运行在 Docker。
- 生产为单实例 Next.js standalone + MySQL + Nginx，由 [docker-compose.yml](docker-compose.yml) 编排。
- 构建固定使用 `npm run build`（Webpack），避免受限环境的 Turbopack PostCSS 子进程端口问题。依赖版本以 [package.json](package.json) 和锁文件为准。

## 指令读取与任务导航

- 先明确任务目标、约束和完成标准；从已有入口查证，不把惯例当作项目事实。
- 确定目标文件后，读取根目录到目标文件所在目录路径上的 `AGENTS.md`；跨目录修改分别读取各路径上的规则。不要假定根目录启动的会话已自动加载子目录指令。
- 局部指令补充本文件，不削弱全局业务与数据安全约束；发生冲突时先核实依据，不通过修改业务代码来迁就错误文档。
- 按任务读取下表入口和资料，无需每次通读全部文档。表中入口用于定位，不是完整文件清单。

| 任务 | 代码入口与局部指令 | 按需资料 |
| --- | --- | --- |
| 页面、布局、登录与路由 | [src/app/AGENTS.md](src/app/AGENTS.md)、[src/auth.ts](src/auth.ts)、[src/proxy.ts](src/proxy.ts) | Next.js 本地文档 |
| API、权限、作答数据 | [src/app/api/AGENTS.md](src/app/api/AGENTS.md) | [开发PRD文档](document/开发PRD文档.md) |
| 组件、表单与交互 | [src/components/AGENTS.md](src/components/AGENTS.md)、[全局样式](src/app/globals.css) | 页面中的 UI 同时遵循 app 指令 |
| 判分、组卷、统计与导入 | [src/lib/AGENTS.md](src/lib/AGENTS.md) | [数据模型总表](document/数据模型总表.md)、开发PRD文档 |
| schema、迁移与 seed | [prisma/AGENTS.md](prisma/AGENTS.md) | 数据模型总表；生产操作另读部署文档 |
| 启动、部署与恢复 | [README.md](README.md)、[scripts](scripts)、[nginx](nginx)、根 Docker 文件 | [部署文档](document/部署文档.md) |
| 依赖风险 | package.json 与锁文件 | [依赖安全审计](document/依赖安全审计.md) |

## 权威资料

- 数据库结构以 [schema](prisma/schema.prisma) 与已提交的 [migrations](prisma/migrations) 为先，其次为数据模型总表、开发PRD文档。
- 业务含义与权限先查数据模型总表，再查开发PRD文档，并与实际实现核对；发现不一致时说明差异，不把现有实现自动视为正确需求。
- [开发日志](document/开发日志.md) 仅供历史追溯，不作为当前命令或密钥来源；除非任务明确要求，不改写历史日志。
- Next.js API/约定先查 `node_modules/next/dist/docs/` 中的相关指南；保留文件顶部由 Next.js 维护的规则块。

## 不可破坏的业务约束

- `answer` / `chosen` 始终使用数组。单选 `['A']`、多选 `['A','B']`、判断 `['T']`；填空 `answer=[['答案1','别名'],['答案2']]`，`chosen=['答案1','答案2']`。不要改成字符串或混淆数组层级。
- 作答中的题目下发接口不得返回 `answer` 或泄露正确答案、解析；提交后的结果与错题复习按权限和业务阶段展示答案。判分只在服务端执行。
- `ExamQuestion` 是组卷时的内容快照；修改或删除原题不得改变已生成试卷。
- 学生有作答记录时不得硬删；沿用现有软删除流程。
- 班级为全校唯一实体；创建者负责改名/删除，授课关系使用 `ClassTeacher`。
- 教师/管理员身份来自 `Teacher`，学生来自 `Student`；受保护页面与业务 API 都必须执行服务端角色鉴权，不能只靠菜单或 proxy。具体边界见 app 与 API 指令。
- App 数据库访问使用 [src/lib/prisma.ts](src/lib/prisma.ts) 的全局单例；独立 seed 脚本自行管理客户端生命周期。
- UI/UX 避免不必要的次级标签和说明，让布局表达关系；此要求同时适用于页面和组件。

## 数据库安全

- `db:seed` 与 `db:reset` 都会删除业务数据；仅在明确允许重建数据、且核实为目标开发库后运行，不作为普通启动、排错或验证步骤。
- 生产只使用 `prisma migrate deploy`，禁止 `migrate dev`、`db push` 和 `migrate reset`。
- 已有生产库必须先备份、检查实际表结构和 `_prisma_migrations`，再决定 baseline；不允许假设线上为空库。
- App 和迁移容器只使用业务数据库账号；MySQL root 口令不得注入 App。
- `.env` / `.env.production` 不提交；生产管理员仅通过临时 `BOOTSTRAP_ADMIN_*` 创建，成功后移除这些变量。
- 不升级 Prisma 主版本，除非任务明确包含 Prisma 7 迁移和 Docker 验证。

## 验证与规则维护

- 启动与命令说明查 README；`npm run db:up` 启动开发 MySQL，`npm run db:deploy` 应用已有迁移，`npm run dev` 启动应用。连接目标先核实。
- 应用代码改动执行 `npm run check`（依次 lint、typecheck、Webpack build），并验证受影响的角色与业务流程。
- 数据库改动另执行 `npx prisma validate`，在独立的全新 MySQL 8.4 卷上验证迁移与 seed；不要复用含现有数据的开发卷。
- 部署改动另验证 Compose 配置、镜像构建与 `/api/health`；操作步骤以部署文档为准。
- 仅文档改动检查引用路径、规则与代码的一致性，以及 `git diff --check`；无需启动数据库或重建应用。
- 模块职责、契约、关键入口或验证方式变化时，同步更新对应指令或其引用文档；根导航变化才更新根地图。未变化的说明不必改写。
- 只在存在独立规则的边界新增局部指令；注释解释特殊契约和设计原因，不强制为每个文件添加头部，不把任务流水记入 `AGENTS.md`。
- 汇报实际完成的检查及未验证项，不把文档检查当作业务运行验证。
