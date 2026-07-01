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
| `document/数据模型总表.md` | **权威 Schema**（12张表+4枚举，遇字段冲突以此为准） |
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
| 11 | 班级共享 | 班级=全校实体，`name` 全局唯一；`Class.teacherId`=创建者（仅审计+改名/删班鉴权）；授课关系走 `ClassTeacher`(M2M)，"我授课的班级"=该表口径；查看/导入=授课老师，改名/删班/删学生=创建者+超管 |

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

**当前步骤**：✅ S13 完成（Docker Compose + nginx 全栈部署，本地端到端验证通过）

**进度概览**：
- [x] **S0** 脚手架 + Schema + Seed（Next 16.2.9 + Prisma 6.19.3 + MySQL exam_system；11表已建；seed=3教师/30学生/2题库/5题/1考试快照/3作答）
- [x] **SD** 前端设计（改为手写 `design/学生端风格design.md`，放弃 Stitch；token 写入 `globals.css` 的 Tailwind v4 `@theme`）
- [x] **S1** 鉴权系统（NextAuth **v5** 双身份 + 三套 login + `proxy.ts` 路由隔离 + `requireRole` 二次鉴权；18 项集成测试全过）
- [x] **S2** 班级管理（班级 CRUD + 学生列表分页 + Excel 模板下载；教师端 Sidebar 框架 + shadcn 风格 UI 组件；20 项集成测试全过）
- [x] **S3** 学生导入（dry-run 预检 6 类 + 确认导入幂等 + 批量硬删/软删；exceljs 解析；23 项集成测试全过）
- [x] **S4** 题库 + 题目 CRUD（题库 CRUD + 四题型表单 + type/difficulty 过滤分页 + contentHash 去重 409；15 项集成测试全过）
- [x] **S5** 题目导入（四题型 Excel 模板 + 解析 + Zod 分流校验 + dry-run 预检 + 确认导入 + contentHash 去重）
- [x] **S6** 组卷（组卷向导 4 步 UI + $transaction 快照 + 整卷浏览 + 删题快照 + 考试 CRUD API）
- [x] **S7** 考试管理（考试状态标签进行中/已截止；已下架考试折叠区 + 历史记录查看；仪表盘题库/考试真实计数；`GET /api/exams?archived=1`；软删后详情页只读模式）
- [x] **S8** 学生做题流程（考试列表 Enrollment∩ExamClass + status 标注；开始/续答 seededShuffle；四题型做题 UI；计时器；草稿 15s 防抖；提交判分；错题 upsert；结果页）
- [x] **S9** 错题本（`GET /api/student/wrong-questions` 按考试分组；`POST /api/student/wrong-questions/:id/redo` 重做判分；`/student/wrong` 错题本页（记忆模式+重做模式）；`/student/me` 我的页面；底部 Tab Bar 三入口）
- [x] **S10** 结果 + 错题本（PRD 定义的结果页/错题本/记忆重做模式已在 S8/S9 提前实现，此处补记）
- [x] **S11** 成绩统计（`GET /api/exams/:id/stats` 平均分/及格率/最高低分/分数段/每题准确率+选项选择率；`GET /api/exams/:id/students/:studentId` 按学生下钻；`/teacher/exams/:id/stats` 页面）
- [x] **S12** 超管面板（`/admin` 教师账号 CRUD + 学生账号 CRUD/批量导入/软硬删 + 只读数据浏览三表；`/api/admin/*`）
- [x] **S13** 部署上线（多阶段 Dockerfile + docker-compose：db/migrate/app/nginx；生产 seed 仅建 admin01/admin02(wxlysm)；部署文档见 `document/部署文档.md`）

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
- [S4] 题目校验/写入共享：`src/lib/validations/question.ts`（四题型 discriminatedUnion）、`src/lib/question-hash.ts`（contentHash）、`src/lib/question-data.ts`（buildQuestionData，选择题答案排序）；客户端安全常量在 `src/lib/question.ts`
- [S4] 选择题答案入库前排序；判断 `["T"]/["F"]`；填空 `[["可接受1","可接受2"],...]`；去重冲突返回 409
- [班级共享重构] 新增 `ClassTeacher`(M2M 授课表) + `Class.name @unique`（migration `20260630120000_class_teaching_sharing`）；班级访问判定在 `src/lib/class-access.ts`（teaches/isCreator）；班级列表/加入授课接口 `GET /api/classes?scope=all`、`POST|DELETE /api/classes/:id/teachers`
- [S6] 组卷整库导入；`Prisma.DbNull` 处理 options 空字段（nullable JSON createMany 用法）；删题操作快照，原题库不受影响；删考试：无作答→硬删，有作答→软删（`deletedAt`）；新增 `src/components/ui/select.tsx` + `checkbox.tsx` 两个基础 UI 组件
- [S8] 判分逻辑在 `src/lib/grading.ts`；草稿保存：AnswerItem 无 @@unique，用 findMany+update-or-create 模式；seededShuffle 使用 LCG 确保 attemptId 相同则顺序一致（断点续答）；填空答案 `string[]` 存储，初始化时按 stem 中 `____` 数量创建空串数组；AnswerItem 没有 `@@unique([attemptId, examQuestionId])`——如需去重需在 submit 时先 deleteMany 再 createMany
- [S8] 学生端页面：`src/app/student/layout.tsx`（全局渐变背景）；`src/components/student/exam-list.tsx`（Client Component, 两 tab 筛选）；`src/app/student/exams/[id]/exam-client.tsx`（完整做题 Client Component，含 Question Grid Sheet + Submit Sheet）；`src/app/student/exams/[id]/result/page.tsx`（结果页，含逐题展开/折叠）
- [S9] 错题本 API：`GET /api/student/wrong-questions`（按考试分组，含答案/解析）；`POST /api/student/wrong-questions/[id]/redo`（重做判分+redoCount+1）；页面：`/student/wrong`（Client Component；记忆模式=答案高亮；重做模式=四题型交互+判分+结果横幅）；`/student/me`（Server Component；学生信息+统计）；`src/components/student/student-tab-bar.tsx`（考试/错题本/我的 三 Tab，usePathname 激活检测）
- [S11] 统计聚合口径与 PRD §7-22 一致：取每生最近一次 `SUBMITTED` Attempt（按 `attemptNo` 取最大）参与平均分/分段/准确率/选项选择率；聚合逻辑集中在 `src/lib/stats.ts`（`getExamStats` + `getStudentLatestAttemptDetail`），API 与 Server Component 页面共用同一份逻辑，页面直调 lib 免一次网络往返，仅按学生下钻走 Dialog 内 `fetch`
- [S11] 图表未引入 recharts（PRD 提及但项目未装且无既有图表组件），改为手写 SVG/CSS 条形图与百分比进度条，风格与结果页的手写评分圆环保持一致，避免引入新依赖与默认图表样式割裂
- [S11] 分数段固定按满分百分比分 5 档（<60/60-69/70-79/80-89/90-100），不随满分数值变化；`optionRates` 仅对 SINGLE_CHOICE/MULTIPLE_CHOICE 计算，依据 submit 时"每题必写 AnswerItem"的保证，分母=已提交人数
- [S12] 教师 CRUD：`src/lib/validations/teacher.ts` + `/api/admin/teachers`、`/api/admin/teachers/:id`；删除前置校验该教师是否创建过班级/题库/考试（`Class.teacherId`/`QuestionBank.createdBy`/`Exam.createdBy` 均为 FK Restrict，无法级联硬删，需先转移/清理），并禁止自我删除与自我取消超管权限
- [S12] 学生 CRUD + 批量导入：`src/lib/validations/admin-student.ts` + `/api/admin/students`、`/api/admin/students/:id`；批量删除复用「有作答→软删/无作答→硬删」逻辑但不受教师归属限制；批量导入新增 `/api/admin/students/import/preview`、`/api/admin/students/import` 两个平行路由，直接复用 `src/lib/import/student-import.ts` 底层函数（`parseStudentSheet`/`analyzeStudentImport`），超管选目标班级导入，不受教师侧「授课关系」限制
- [S12] `/api/students/template`（导入模板下载）原仅限 teacher 角色，已放宽为 teacher/admin 均可访问
- [S12] 只读数据浏览（`/admin/browse`）未做通用表格引擎，Classes/QuestionBanks/Exams 三表各自手写查询+列，Server Component 直查 Prisma，无独立只读 API
- [S12] 页面：`src/app/admin/layout.tsx`+`src/components/admin/sidebar.tsx`（仿教师端）；`/admin/teachers`+`teacher-table`/`teacher-form-dialog`；`/admin/students`+`student-table`/`student-form-dialog`/`import-dialog`
- [S13] **部署架构**：多阶段 `Dockerfile`（`base→deps→builder`(standalone) / `→migrator`(迁移镜像) / `→runner`(精简运行镜像)）+ `docker-compose.yml`(db/migrate/app/nginx)。app 镜像≈560MB（`node:22-slim`，非 root，仅 standalone），不含 Prisma CLI
- [S13] **迁移拆成独立一次性服务**：Prisma 6 CLI 依赖被提升的传递依赖（`effect` 等），standalone 精简 node_modules 跑不了 `migrate deploy`；故 `migrate` 服务用 `migrator` 阶段（完整依赖）执行 `prisma migrate deploy`+`prisma/seed.prod.mjs`，跑完退出，`app` 靠 `depends_on: service_completed_successfully` 等待
- [S13] **生产 seed**：`prisma/seed.prod.mjs`（纯 ESM，用 `@prisma/client`+`bcryptjs`，无需 tsx）幂等 upsert 仅两个超管 `admin01`/`admin02`（密码 `wxlysm`，`update:{}` 不覆盖已改密码）；开发 seed(`seed.ts`) 生产不执行
- [S13] **基于 Debian slim 而非 alpine**：规避 Prisma musl/openssl 引擎兼容问题；runner 额外 `COPY .prisma`（补齐 standalone 偶漏的查询引擎）
- [S13] **环境变量**：`.env.production`（gitignore；模板 `.env.production.example`），db 与 app/migrate 共用 `env_file`；`DATABASE_URL` 主机名须为 compose 服务名 `db`；nginx 反代 `app:3000`，`client_max_body_size 20m`（Excel 导入），透传 `X-Forwarded-Proto`（NextAuth 回调依赖）
- [S13] **本机 80 端口验证坑**：本机 80 已被其他容器占用；用 `-f` 叠加 override（`ports: !override [8080:80]`，注意 compose 对 ports 是**追加合并**，必须用 `!override` 才能替换）在 8080 验证，已跑通 nginx→app→db 全链路

**下一步具体任务**：
一期功能与部署已全部完成。可选后续：正式服务器上线（改强口令 + `NEXTAUTH_SECRET` + 启用 HTTPS，详见 `document/部署文档.md` §7/§10）；二期简答题（`SHORT_ANSWER` + 人工批改流程）；登录频率限制加固。

---

## 📋 每步完成后的例行动作（~5分钟）

1. 勾掉上方进度 checkbox `[x]`，更新"当前步骤"和"下一步具体任务"
2. 若有遗留问题，在"当前已知问题"追加 `- [Sxx] 问题描述`
3. 在 `document/开发日志.md` 追加本步记录（模板见日志文件开头）
