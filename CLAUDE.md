# CLAUDE.md — 智慧题库与智能练测系统

> 此文件由 Claude Code 每次新 Session 启动时**自动加载**。
> 每个步骤完成后，请立即更新【🚧 当前进度】区块，并在 `document/开发日志.md` 追加本步记录。

---

## 项目简介

面向职业院校的智能题库练习平台，三端：
- **教师端**（PC Desktop）：班级/学生管理、题库/题目管理、组卷、成绩统计
- **学生端**（移动响应式，Apple 风格）：做题、断点续答、错题本
- **超管端**（PC Desktop）：教师/学生账号全量管理

---

## 关键文档索引

| 文档 | 用途 |
|---|---|
| `document/数据模型总表.md` | **权威 Schema**（11张表+4枚举，遇字段冲突以此为准） |
| `document/开发PRD文档.md` | API 设计 / 页面逻辑 / 开发进程表 / 验收标准 |
| `document/开发日志.md` | 每步详细记录（问题 + 解决方案 + 决策） |
| `prisma/schema.prisma` | 数据库定义（严格按数据模型总表，不得自行增改字段） |

---

## 技术栈速查

- **框架**：Next.js App Router + TypeScript + shadcn/ui + Tailwind CSS
- **后端**：Route Handlers + Prisma ORM + MySQL 8.0
- **认证**：NextAuth.js Credentials Provider（Teacher / Student 双身份表）
- **容器**：Docker Compose — `app`(Next.js standalone) + `db`(MySQL 8) + `nginx`(80/443)
- **工具库**：SheetJS(xlsx 解析) · Zod(入参校验) · bcryptjs(密码哈希) · recharts(图表)

---

## 常用命令

```bash
npm run dev                                    # 开发服务器 http://localhost:3000
npx prisma studio                              # 可视化数据库
npx prisma migrate dev --name <描述>           # 新建迁移
npx prisma db seed                             # 重置并填充测试数据
docker compose up -d --build                   # 容器启动（含 nginx）
docker compose exec app npx prisma migrate deploy  # 生产迁移
```

---

## ✅ 已拍板决策（禁止在代码中推翻）

| # | 决策 | 结论 |
|---|---|---|
| 1 | 主键类型 | 全库 `Int @id @default(autoincrement())` |
| 2 | 身份建模 | 独立 `Student` + `Teacher` 两张表；统一 User 表方案作废 |
| 3 | Admin 实现 | `Teacher.isAdmin Boolean @default(false)`，无独立 Admin 表 |
| 4 | 一期题型 | 单选 / 多选 / 判断 / 填空（4种），简答 = 二期 |
| 5 | 填空判分 | 归一化（trim + 全半角 + 小写）后命中可接受答案集，**全空命中才算对** |
| 6 | 统计口径 | 可重复练习取最近一次已提交作答（attemptNo 最大且 status=SUBMITTED） |
| 7 | 草稿保存 | 每次切题立即 + 每 15s 防抖，`elapsedSec` 随之更新 |
| 8 | 去重键 | `@@unique([bankId, contentHash])`（库内去重，允许同题进多库） |
| 9 | Nginx | 正式纳入 docker-compose，不再是可选 |
| 10 | 默认密码 | `wxls12345`，导入时 bcrypt 整批算一次哈希 |

---

## ⚠️ 重要约束（容易踩坑）

- **answer/chosen 一律数组格式**，禁止存字符串（`["A"]` 不是 `"A"`）；判分逻辑依赖此格式
- **下发题目给学生时绝不返回 `answer` 字段**；判分只在服务端进行
- **`Attempt.studentId` 配 `onDelete: Restrict`**；有作答记录的学生不可硬删，需走软删除
- **PrismaClient 必须单例**（挂 `globalThis`），避免 dev 热重载爆连接池
- **`onDelete: Cascade` 需 MySQL InnoDB 引擎**；schema 中 `datasource` 配好 charset=utf8mb4
- **组卷快照**：`ExamQuestion` 是内容复制，`sourceId` 是弱引用，原题改/删不影响试卷
- **学生做题**：需校验 deadline、repeatLimit，超限后禁止新建 Attempt

---

## 🚧 当前进度

**当前步骤**：✅ S3 完成，准备进入 S4

**进度概览**：
- [x] **S0** 脚手架 + Schema + Seed（Next 16.2.9 + Prisma 6.19.3 + MySQL exam_system；11表已建；seed=3教师/30学生/2题库/5题/1考试快照/3作答）
- [x] **SD** 前端设计（改为手写 `design/学生端风格design.md`，放弃 Stitch；token 写入 `globals.css` 的 Tailwind v4 `@theme`）
- [x] **S1** 鉴权系统（NextAuth **v5** 双身份 + 三套 login + `proxy.ts` 路由隔离 + `requireRole` 二次鉴权；18 项集成测试全过）
- [x] **S2** 班级管理（班级 CRUD + 学生列表分页 + Excel 模板下载；教师端 Sidebar 框架 + shadcn 风格 UI 组件；20 项集成测试全过）
- [x] **S3** 学生导入（dry-run 预检 6 类 + 确认导入幂等 + 批量硬删/软删；exceljs 解析；23 项集成测试全过）
- [ ] **S4** 题库 + 题目 CRUD
- [ ] **S5** 题目导入
- [ ] **S6** 组卷
- [ ] **S7** 考试管理
- [ ] **S8** 学生做题流程
- [ ] **S9** 答题 + 判分
- [ ] **S10** 结果 + 错题本
- [ ] **S11** 成绩统计
- [ ] **S12** 超管面板
- [ ] **S13** 部署上线

**当前已知问题 / 暂缓事项**：
- [S0] Prisma 锁定在 6.x（CLI 会提示升 7，**不要升**，7 改了客户端生成器与 Docker 输出布局）
- [S0] 用户主目录有游离的 `~/package-lock.json`，已用 next.config 的 turbopack.root 规避；如清理掉更干净
- [S0] 学生默认密码已 bcrypt（admin123/teacher123 为开发账号，部署前需改）
- [S1] **NextAuth 用 v5（Auth.js, beta）**，非 v4——API 与 v4 不同（`auth.ts` 导出 handlers/auth；split config）
- [S1] **middleware 已按 Next16 改名为 `src/proxy.ts`**（PRD/目录建议里的 `middleware.ts` 以此为准）
- [S1] 类型增强须改 `@auth/core/jwt`（非 `next-auth/jwt`，后者是纯再导出，增强不生效）
- [S1] 登录无频率限制 + authorize 有账号枚举时序侧信道 → 留待登录加固时一并处理；`NEXTAUTH_SECRET` 生产需换随机值
- [S2] **UI 组件为手写 shadcn 风格**（Radix + cva + 项目 token，在 `src/components/ui/`），非 shadcn CLI 生成——勿跑 `shadcn init`（会冲突 Tailwind v4 `@theme`）
- [S2] **Excel 用 exceljs**（非 PRD 所列 SheetJS）——生成/解析统一一库；模板构建器在 `src/lib/templates/`
- [S2] API 路由鉴权用 `requireApiRole(role)`（返回 401/403 JSON）；页面用 `requireRole`；响应统一走 `src/lib/api.ts` 的 ok/fail
- [S3] 导入解析/预检核心在 `src/lib/import/student-import.ts`（preview 与 import 复用）；import 重新解析文件重跑分析，不信任客户端数据
- [S3] **联调注意**：`db:seed` 不重置 MySQL 自增，reseed 后班级/教师 id 漂移；浏览器需重新登录（旧 JWT 的 teacherId 会失效致 404）

**下一步具体任务**：
进入 **S4 题库 + 题目 CRUD**：题库 `GET/POST /api/banks`、`PATCH/DELETE /api/banks/:id`；题目 `GET /api/banks/:id/questions`（按 type/difficulty 过滤分页）、`POST` 单题、`PATCH/DELETE /api/questions/:id`。四题型表单，**options/answer 严格数组格式**（总表 §6：单选`["A"]`/多选`["A","C"]`/判断`["T"]`/填空 answer`[["北京","京城"],["上海"]]`）；contentHash 去重沿用 seed 口径，抽到 `src/lib/` 复用。

---

## 📋 每步完成后的例行动作（~5分钟）

1. 勾掉上方进度 checkbox `[x]`，更新"当前步骤"和"下一步具体任务"
2. 若有遗留问题，在"当前已知问题"追加 `- [Sxx] 问题描述`
3. 在 `document/开发日志.md` 追加本步记录（模板见日志文件开头）
