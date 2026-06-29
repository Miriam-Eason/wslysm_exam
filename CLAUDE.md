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

**当前步骤**：✅ S0 完成，准备进入 SD

**进度概览**：
- [x] **S0** 脚手架 + Schema + Seed（Next 16.2.9 + Prisma 6.19.3 + MySQL exam_system；11表已建；seed=3教师/30学生/2题库/5题/1考试快照/3作答）
- [ ] **SD** Stitch 设计（Apple风格，S0完成后约半天）
- [ ] **S1** 鉴权系统（NextAuth 双身份 + 三套 login + middleware）
- [ ] **S2** 班级管理
- [ ] **S3** 学生导入
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

**下一步具体任务**：
进入 SD（Stitch 设计）：用 `/generate-design` 出 4 个关键页面（登录页/学生做题页/学生考试列表/教师仪表盘，Apple 风格+圆角+毛玻璃）→ `/extract-design-md` 提取 DESIGN.md → token 写入 `tailwind.config` 与全局 CSS 变量。

---

## 📋 每步完成后的例行动作（~5分钟）

1. 勾掉上方进度 checkbox `[x]`，更新"当前步骤"和"下一步具体任务"
2. 若有遗留问题，在"当前已知问题"追加 `- [Sxx] 问题描述`
3. 在 `document/开发日志.md` 追加本步记录（模板见日志文件开头）
