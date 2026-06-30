# 智慧题库与智能练测系统 — 开发 PRD（详细版）

> 本文档是面向**实际编码**的总纲，供按模块交给 Claude Code 在本地逐步开发、最终部署到服务器。
> 它整合并细化以下文档，遇冲突一律以本文档及《数据模型总表》为准：
> - 《数据模型总表》— 权威 schema（数据库设计的唯一来源）
> - 《项目功能设计》— 功能范围
> - 《学生导入方案设计》/《题库导入方案设计与技术选型》— 两条导入管线
> - 《题库与题目管理架构设计》— 快照解耦
> - 《技术路线文档》— 环境、Docker、Nginx、部署
>
> 本文档新增：**API 设计**、**界面逻辑设计**、**关键流程时序**、**开发里程碑拆分**、**验收清单**。

---

## 第一部分 · 总览

### 1. 角色与端

| 角色 | 端 | 登录方式 | 主要能力 |
|---|---|---|---|
| 教师 Teacher | PC Web | 账号 username + 密码 | 班级/学生导入、题库/题目导入、组卷、成绩统计 |
| 学生 Student | 移动响应式 Web（可 PWA） | 学号 studentNo + 默认密码 wxls12345 | 做题、断点续答、查成绩、错题本 |
| 超管 Admin | PC Web | 账号 + 密码 | 全表增删改查、教师/学生账号管理 |

### 2. 技术栈（详见《技术路线文档》）

Next.js(App Router) + React + shadcn/ui + Tailwind｜Prisma｜MySQL 8.0｜NextAuth(Credentials)｜SheetJS(xlsx)｜Zod｜bcryptjs｜Docker Compose(app + db + nginx)。

### 3. 一期范围边界（务必锁死）

- **题型**：单选、多选、判断、**填空**（自动判分，全对才算对）。简答=二期。
- **组卷**：整库导入（复制全部题目为试卷快照）。按条件筛选/勾选=二期。
- **学生**：一个学生只属于一个班（应用层校验，DB 为多对多）。
- **统计口径**：可重复练习取**最近一次已提交**作答。
- **删除**：误导入硬删；有作答的学生/考试走软删除（Restrict / deletedAt）。
- **安全**：统一默认密码属一期权宜；密码一律 bcrypt 哈希；改密=二期。

### 4. 目录结构建议

```
exam-system/
├─ prisma/
│  ├─ schema.prisma          # 严格按《数据模型总表》
│  └─ seed.ts                # 测试数据：1 超管 + 2 教师 + 班级 + 题库 + 题目 + 考试
├─ src/
│  ├─ app/
│  │  ├─ (auth)/teacher/login, student/login, admin/login
│  │  ├─ teacher/...         # 教师端页面
│  │  ├─ student/...         # 学生端页面（移动优先）
│  │  ├─ admin/...           # 超管端页面
│  │  └─ api/...             # Route Handlers（见第三部分）
│  ├─ lib/
│  │  ├─ prisma.ts           # PrismaClient 单例（挂 globalThis）
│  │  ├─ auth.ts             # NextAuth 配置
│  │  ├─ zod-schemas/        # 题目/学生导入校验 schema
│  │  ├─ import/             # Excel 解析 + dry-run 预检管线（学生/题库共用）
│  │  ├─ grading.ts          # 各题型判分
│  │  └─ stats.ts            # 成绩统计聚合
│  ├─ components/            # shadcn/ui 派生组件
│  └─ middleware.ts          # 路由鉴权与角色隔离
├─ nginx/conf.d/, nginx/certs/
├─ Dockerfile, docker-compose.yml, next.config.js
└─ .env / .env.example
```

---

## 第二部分 · 数据库设计

数据库设计**完整以《数据模型总表》为准**，此处只补充开发要点，不重复 schema。

### 5. 模型清单（12 张表 + 4 枚举）

`Teacher`、`Student`、`Class`、`Enrollment`、`ClassTeacher`｜`QuestionBank`、`Question`、`KnowledgePoint`(二期)、`QuestionKnowledgePoint`(二期)｜`Exam`、`ExamQuestion`、`ExamClass`｜`Attempt`、`AnswerItem`、`WrongQuestion`。
枚举：`Difficulty`、`QuestionType`、`ExamType`、`AttemptStatus`。

> `ClassTeacher` 为班级共享重构新增（教师↔班级授课 M2M）；`Class.name` 全局唯一、`Class.teacherId`=创建者。详见《数据模型总表》§2.3/§2.5。

### 6. 关键约束与索引（开发时务必落实）

| 约束 | 作用 |
|---|---|
| `Student.studentNo @unique @db.VarChar(10)` | 学号全局唯一身份，String 防丢前导零 |
| `Enrollment @@unique([studentId, classId])` | 同人不在同班重复 |
| `Question @@unique([bankId, contentHash])` | 库内去重，允许同题进多库 |
| `Attempt @@unique([examId, studentId, attemptNo])` | 作答次数唯一 |
| `Attempt.studentId onDelete: Restrict` | 有作答禁止硬删学生 |
| `ExamQuestion` 全部内容字段为快照 | 与原题解耦 |
| 各 `@@index`（type/difficulty/importBatchId/examQuestionId/classId） | 查询性能 |

### 7. 迁移与初始化流程

```bash
npx prisma migrate dev --name init      # 本地建表
npx prisma db seed                       # 灌测试数据
# 生产：npx prisma migrate deploy
```

`seed.ts` 应覆盖全链路：超管 1、教师 2、班级 2、学生 ~30（默认密码哈希整批算一次）、题库 2、各题型题目若干、考试 1（含整库快照 + 关联班级）、若干作答记录（便于联调统计与错题本）。

### 8. JSON 字段读写约定（判分/统计的命脉）

- `options`：`[{key,text}]`，key 生命周期内稳定，乱序只改展示顺序。
- `answer`/`chosen`：一律数组。单选 `["A"]`｜多选 `["A","C"]`｜判断 `["T"]`/`["F"]`｜填空 `answer=[["北京","京城"],["上海"]]` / `chosen=["北京","上海"]`。
- 所有读写经统一序列化工具，禁止散落手写 JSON.parse。

---

## 第三部分 · API 设计

### 9. 通用约定

- 路由用 App Router 的 **Route Handlers**（`app/api/.../route.ts`），重写操作可用 Server Actions。
- 统一响应封装：成功 `{ ok: true, data }`；失败 `{ ok: false, error: { code, message, details? } }`。
- 入参一律 **Zod 校验**；鉴权在 middleware + handler 内双重校验（见第四部分）。
- 列表接口支持 `?page&pageSize&keyword` 分页。
- 所有"教师只能操作自己资源"的接口，handler 内校验 `resource.createdBy === session.teacherId`。

### 10. 鉴权 API

| Method | Path | 说明 |
|---|---|---|
| POST | `/api/auth/callback/credentials` | NextAuth Credentials；入参 `{ role, identifier, password }`：teacher/admin 用 username、student 用 studentNo。返回 session（含 role、id、name）。 |
| POST | `/api/auth/signout` | 登出 |

### 11. 教师端 API

**班级**
| Method | Path | 入参 | 出参 |
|---|---|---|---|
| GET | `/api/classes` | — | 当前教师可见班级列表（含人数） |
| POST | `/api/classes` | `{ name }` | 新建班级 |
| PATCH | `/api/classes/:id` | `{ name }` | 改名 |
| DELETE | `/api/classes/:id` | — | 删班级（仅删 Enrollment/ExamClass 关联，不删学生身份与考试） |

**学生导入（复用 dry-run 预检管线）**
| Method | Path | 入参 | 出参 |
|---|---|---|---|
| POST | `/api/classes/:id/students/preview` | `multipart` xlsx | dry-run 结果：`{ importable[], skipped[(已属别班)], nameConflicts[], fileDupRows[], invalid[] }`，不写库 |
| POST | `/api/classes/:id/students/import` | 预检通过的数据/或重传文件 | 批量 createMany(skipDuplicates) 学生 + Enrollment；返回 `{ created, skipped }` |
| GET | `/api/classes/:id/students` | 分页 | 班内学生列表 |
| DELETE | `/api/students` | `{ ids[] }` | 批量删（无作答硬删；有作答的走软删 deletedAt，二次确认在前端） |

> 学生导入逻辑严格按《学生导入方案设计》：classId 取自路径；A 方案"已属别班则跳过+提示"；姓名不一致提示不静默覆盖；bcrypt 整批一次。

**题库与题目**
| Method | Path | 入参 | 出参 |
|---|---|---|---|
| GET/POST | `/api/banks` | — / `{ name, description?, subject? }` | 题库列表 / 新建 |
| PATCH/DELETE | `/api/banks/:id` | `{...}` / — | 改 / 删（级联删题目；试卷快照不受影响） |
| GET | `/api/banks/:id/questions` | 分页+按 type/difficulty 过滤 | 题目列表 |
| POST | `/api/banks/:id/questions` | 单题 JSON | 新建题目 |
| PATCH/DELETE | `/api/questions/:id` | — | 改 / 删原题（不影响已组卷快照） |
| POST | `/api/banks/:id/questions/import/preview` | `multipart` xlsx 或 JSON | dry-run：逐行 Zod 按题型分流校验 + contentHash 查重，返回 `{ importable N, invalid M(行号+原因), duplicates K }` |
| POST | `/api/banks/:id/questions/import/confirm` | 预检数据 | createMany(skipDuplicates)，打 importBatchId；返回 `{ created, skipped }` |

> 题库导入严格按《题库导入方案设计》：bankId 取自路径上下文；Excel→归一化 JSON→Zod→createMany；先建分类避免 N+1；`@@unique([bankId, contentHash])` 去重。

**组卷 / 考试**
| Method | Path | 入参 | 出参 |
|---|---|---|---|
| POST | `/api/exams` | `{ name, type, bankId, allowRepeat, repeatLimit?, deadline?, timeLimitSec?, shuffleQuestions, shuffleOptions, classIds[] }` | **整库组卷**：读 bank 全部题目→为每题 createMany 一条 ExamQuestion 快照(复制 stem/options/answer/analysis/type + order + score)→建 ExamClass。`$transaction` 包裹 |
| GET | `/api/exams` | 分页 | 教师的考试列表（含参与班级、作答人数） |
| GET | `/api/exams/:id` | — | 整卷（ExamQuestion 列表，可浏览/删题） |
| PATCH | `/api/exams/:id` | 基本信息 | 改考试信息 |
| DELETE | `/api/exams/:id/questions/:eqId` | — | 从试卷删除某题（操作快照，不动原题） |
| DELETE | `/api/exams/:id` | — | 无作答→物理删；有作答→软删 deletedAt |

**成绩统计**（数据源全部为快照，详见《题库管理》§8）
| Method | Path | 出参 |
|---|---|---|
| GET | `/api/exams/:id/stats` | `{ avgScore, scoreBuckets[{range,count}], questionStats[{examQuestionId, accuracy, optionRates}] }`，可重复练习取最近一次 |
| GET | `/api/exams/:id/students/:sid` | 该生最近一次作答详情（得分 + 错题列表） |

### 12. 学生端 API

| Method | Path | 入参 | 出参 |
|---|---|---|---|
| GET | `/api/student/exams` | — | 通过 Enrollment∩ExamClass 可见、未过 deadline 的考试/练习；标注是否做过、剩余可重做次数 |
| POST | `/api/student/exams/:id/attempt` | — | **开始或续答**：若存在 IN_PROGRESS 的 Attempt 则返回它（断点续答）+已存草稿；否则按 allowRepeat/repeatLimit 校验后新建 attemptNo。返回题目（按 shuffle 配置乱序，**不下发 answer**） |
| PATCH | `/api/student/attempts/:id/save` | `{ answers:[{examQuestionId,chosen}], elapsedSec }` | 草稿增量保存：upsert AnswerItem(草稿)、更新 elapsedSec/lastSavedAt |
| POST | `/api/student/attempts/:id/submit` | `{ answers, elapsedSec }` | **判分**：对每题调 grading→写 isCorrect/scoreGot→汇总 Attempt.score、status=SUBMITTED→更新 WrongQuestion；返回总分 |
| GET | `/api/student/attempts/:id/result` | — | 作答结果（得分、逐题对错、解析、正确答案） |
| GET | `/api/student/wrong-questions` | 按 exam 分组 | 错题本：错题列表 + redoCount |
| POST | `/api/student/wrong-questions/:id/redo` | `{ chosen }` | 错题重做：判分、redoCount+1、写 lastResult |

> 安全红线：下发题目接口**绝不返回 answer**；判分只在服务端。

### 13. 超管端 API

`/api/admin/*`：教师账号 CRUD（`/api/admin/teachers`）、学生账号 CRUD + 批量导入（复用学生导入管线）、对各表只读浏览。注意删除级联与软删除约束。一期重点是权限管理与账号增删改查。

---

## 第四部分 · 鉴权与权限

### 14. NextAuth Credentials（两张身份表）

- 单一 Credentials Provider，`authorize({ role, identifier, password })`：
  - role=teacher/admin → 查 Teacher.username（admin 可用 Teacher 表加 isAdmin 标志，或独立 Admin；一期建议 Teacher 表加 `role` 区分，最简）。
  - role=student → 查 Student.studentNo（过滤 deletedAt=null）。
  - 统一 `bcrypt.compare`。
- JWT/session 注入 `{ id, role, name }`。

> 备注：本期 Admin 可简化为"Teacher 表中标记为管理员的账号"，避免再开一表；若偏好独立，在总表追加 Admin 表即可（影响面仅鉴权层）。

### 15. middleware.ts 路由隔离

| 前缀 | 允许角色 | 否则 |
|---|---|---|
| `/teacher/*`、`/api/(classes\|banks\|questions\|exams)` | teacher | 跳 `/teacher/login` |
| `/student/*`、`/api/student/*` | student | 跳 `/student/login` |
| `/admin/*`、`/api/admin/*` | admin | 跳 `/admin/login` |

handler 内再做资源归属校验（教师只能碰自己的班级/题库/考试）。

---

## 第五部分 · 界面逻辑设计

### 16. 教师端（PC）页面树与逻辑

- `/teacher/login` — 账号密码登录。
- `/teacher` — 仪表盘：班级数/题库数/考试数概览，快捷入口。
- `/teacher/classes` — 班级列表（新建/改名/删除）。
  - `/teacher/classes/:id` — 班内学生表 + **导入弹窗**：上传 xlsx→展示 dry-run 预检结果（可导入/跳过/姓名冲突/文件内重复/异常，各带行号）→确认导入→结果回显；批量勾选删除（二次确认）。
- `/teacher/banks` — 题库列表（CRUD）。
  - `/teacher/banks/:id` — 题目列表（按 type/difficulty 过滤、分页）；单题增删改；**导入弹窗**（同款 dry-run 预检 + 查重反馈）；下载 Excel 模板。
- `/teacher/exams` — 考试/练习列表（状态、参与班级、作答人数）。
  - `/teacher/exams/new` — 组卷向导：①填基本信息（名称/类型/可重复+次数/截止/限时/乱序）②选题库（整库导入）③选班级 ④确认生成快照。
  - `/teacher/exams/:id` — 整卷浏览，可删某题（操作快照）；改基本信息；删考试（有作答提示软删）。
  - `/teacher/exams/:id/stats` — 平均分、分数段柱状图、每题准确率、选项选择率、按学生下钻。

### 17. 学生端（移动优先）页面树与逻辑

- `/student/login` — 学号 + 默认密码。
- `/student` — 我的考试/练习列表（卡片：名称、类型、截止、是否做过、剩余次数）。
- `/student/exams/:id` — **做题页**（核心）：
  - 进入即调 attempt 接口，若有进行中作答则**恢复进度与已用时间**；考试类按 timeLimitSec 倒计时。
  - 逐题作答，**自动/防抖草稿保存**（PATCH save，含 elapsedSec），意外退出再进可续。
  - 交卷→判分→跳结果页。
- `/student/exams/:id/result` — 得分、逐题对错、正确答案与解析。
- `/student/wrong` — 错题本：按考试/练习分组，显示重做次数。
  - 记忆模式：直接看答案+解析。
  - 重做模式：重做错题→判分→redoCount+1。

### 18. 超管端（PC）

- `/admin/login` → `/admin` 控制台：教师账号增删改查、学生账号增删改查+批量导入、各表只读浏览（类 Django admin 心智）。

---

## 第六部分 · 关键流程时序

### 19. 导入 dry-run（学生/题库共用管线）

`上传xlsx → SheetJS解析为行数组 → 内存去重(记行号) → 逐行Zod按类型分流校验(不写库) → 返回[可导入/跳过/冲突/异常]预览 → 教师确认 → createMany(skipDuplicates)[+importBatchId] → 结果回显`

### 20. 组卷快照

`选题库 → 读全部Question → $transaction{ createMany ExamQuestion(复制内容+order+score) ; createMany ExamClass } → 自此试卷与原题解耦`

### 21. 做题断点续答 + 判分

`进入→查IN_PROGRESS Attempt(有则恢复草稿+elapsedSec) → 作答中防抖PATCH save → submit{ 逐题grading→写AnswerItem(isCorrect,scoreGot)→汇总Attempt.score→status=SUBMITTED→upsert WrongQuestion } → 结果页`

判分（`lib/grading.ts`）：
- 单选/多选：`chosen` 数组与 `answer` 数组集合相等 → 对。
- 判断：`chosen[0]===answer[0]`。
- 填空：逐空归一化（trim/全半角/可选忽略大小写）后命中该空可接受答案集合任一；**全空命中才算对**，否则 0 分。

### 22. 统计

`取每生最近一次SUBMITTED Attempt → 平均分/分数段(Attempt.score) → 每题accuracy(AnswerItem按examQuestionId分组) → 选项选择率(chosen按key聚合，仅选择题)`

---

## 第七部分 · 开发进程表（标准交付顺序）

共 14 步，每步独立可测，完成后更新 `CLAUDE.md` 进度 + 追加 `document/开发日志.md` 记录。

| 步骤 | 模块 | 核心内容 | 测试验收标准 |
|------|------|----------|-------------|
| **S0** | 脚手架 | create-next-app + Prisma + shadcn/ui；`prisma/schema.prisma` 严格按《数据模型总表》全量建表；prisma migrate；seed（超管+教师+班级+学生+题库+题目+考试+作答）；prisma 单例（globalThis） | `npm run dev` 起；Prisma Studio 可见 11 张表及种子数据 |
| **SD** | Stitch 设计 | 用 `/generate-design` 出 4 个关键页面设计稿（登录页/学生做题页/学生考试列表/教师仪表盘）；用 `/extract-design-md` 提取 DESIGN.md；将 token（颜色/圆角/毛玻璃参数）写入 `tailwind.config.ts` 和 CSS 变量 | 设计稿产出（Apple风格 + 圆角 + 毛玻璃）；DESIGN.md 生成；tailwind.config 更新完毕 |
| **S1** | 鉴权系统 | NextAuth Credentials（Teacher/Student 双身份表）；三套 login 页（教师/学生/超管）；middleware 路由隔离（/teacher /student /admin） | 三角色各自登录成功；错误凭证被拒；跨角色路由被拦截跳转 |
| **S2** | 班级管理 | 班级 CRUD API + UI；班内学生列表（分页）；Excel 模板下载 | 增删改班级；删班级不删学生身份；学生列表正确分页 |
| **S3** | 学生导入 | dry-run 预检 API + UI 预览（跳过/姓名冲突/文件内重复/异常各带行号）；确认导入；批量硬删（二次确认） | 四种冲突场景全正确；同文件重复导入幂等；删除无作答学生级联清 Enrollment |
| **S4** | 题库 + 题目 CRUD | 题库增删改查 API + UI；单题手动增删改（四种题型表单）；题目列表按 type/difficulty 过滤分页 | 四类题目各自 CRUD 正确；options/answer JSON 格式符合总表 §6 |
| **S5** | 题目导入 | Excel 模板（四题型下拉校验）；解析→Zod 分流→dry-run 预检；确认导入+查重反馈；`@@unique([bankId, contentHash])` 去重 | 四题型样例全部导入；异常行精确提示行号；重复导入跳过并回显计数 |
| **S6** | 组卷 | 组卷向导 UI（基本信息→选题库→选班级→确认）；`$transaction` 快照（ExamQuestion createMany 复制内容）；整卷浏览 + 删题（操作快照） | 组卷后改/删原题，试卷内容不变；从卷内删题，原题库不受影响 |
| **S7** | 考试管理 | 考试列表（状态/班级/作答人数）；改基本信息；软删有作答考试（deletedAt）；软删后历史仍可查 | 软删考试后列表不显示；历史成绩不受影响 |
| **S8** | 学生做题流程 | 考试列表（Enrollment∩ExamClass + deadline 过滤，标注是否做过/剩余次数）；开始/续答（IN_PROGRESS 复用，恢复进度+elapsedSec）；题目展示（shuffle + 绝不下发 answer） | 中途关闭再进入，进度与已用时间恢复；answer 字段不出现在响应中 |
| **S9** | 答题 + 判分 | 四题型作答 UI；防抖草稿保存（每次切题 + 每 15s）；计时器（timeLimitSec 倒计时，到 0 自动提交）；提交判分（grading.ts 四题型）；WrongQuestion upsert | 四题型判分结果各自验证；计时到 0 自动提交；草稿每 15s 保存 |
| **S10** | 结果 + 错题本 | 结果页（总分+逐题对错+解析+正确答案）；错题本（按考试分组+重做次数）；记忆模式/重做模式（redoCount+1） | 结果与判分吻合；重做计数正确；记忆模式直接展示答案 |
| **S11** | 成绩统计 | 统计 API（平均分/分段/准确率/选项选择率，取最近一次已提交）；统计 UI（图表）；按学生下钻 | 统计值与 seed 手算吻合；可重复练习取最近一次正确 |
| **S12** | 超管面板 | Admin（Teacher.isAdmin=true）专属路由；教师账号 CRUD；学生账号 CRUD + 批量导入（复用管线）；各表只读浏览 | 账号管理全链路；删除级联约束生效；非超管无法访问 /admin |
| **S13** | 部署上线 | Dockerfile；docker-compose（app+db+nginx）；nginx.conf 反代 + HTTPS；`prisma migrate deploy`；crontab 备份脚本 | 服务器域名访问；HTTPS 生效；三角色功能 smoke test；备份文件每日生成 |

> 每步完成后：① 勾掉 `CLAUDE.md` 进度 checkbox ② 更新"当前已知问题" ③ 在 `document/开发日志.md` 追加本步记录。

> **关键依赖链**：S0 → SD → S1 → S2/S3（可并行）→ S4/S5（可并行）→ S6 → S7 → S8 → S9 → S10 → S11 → S12 → S13。

---

## 第八部分 · 部署（详见《技术路线文档》）

- Docker Compose 三服务：`app`(Next.js standalone) + `db`(MySQL8, 数据卷持久化) + `nginx`(80/443 反代到 app:3000, Let's Encrypt 证书)。
- 首次：`docker compose up -d --build` → `migrate deploy` → `db seed`。
- 更新：`git pull` → `docker compose up -d --build app`（+ 必要时 migrate deploy）。
- 备份：crontab 每日 mysqldump；定期下载到本地。
- 服务器：2核起步建议 4G 内存。

---

## 第九部分 · 验收清单（一期 Done 的定义）

- [ ] 三角色登录与路由隔离正确；密码全为 bcrypt 哈希。
- [ ] 学生导入：A 方案跳过、姓名冲突提示、文件内去重、重复导入幂等。
- [ ] 题目导入：四题型校验、`[bankId,contentHash]` 去重、dry-run 预检。
- [ ] 组卷为快照，改/删原题不影响已发布试卷与成绩。
- [ ] 学生做题断点续答（含考试计时）；四题型判分正确。
- [ ] 成绩统计四项口径正确，取最近一次作答。
- [ ] 错题本记忆/重做，重做次数正确。
- [ ] 学生/考试删除遵守 Restrict/软删除，不误删成绩。
- [ ] Docker Compose（app+db+nginx）一键部署，数据持久化，每日备份。

---

## 附 · 小决策记录

### 已拍板（全部锁定，不再讨论）

1. ✅ **Admin 实现**：Teacher 表加 `isAdmin Boolean @default(false)` 标志，不独立建表。超管登录走同一 Credentials Provider，authorize 时检查 isAdmin。
2. ✅ **填空判分归一化**：trim + 全角转半角 + 忽略大小写，中文题不受影响。全空命中才算整题正确（isCorrect=true，scoreGot=满分）；否则 0 分。
3. ✅ **草稿保存频率**：每次切题立即保存 + 每 15s 防抖保存，elapsedSec 随之更新。

### 待定（开工到对应步骤时再决定）

4. **学生端 PWA**：一期是否启用（可放 S13 部署之后，不阻断其他步骤）。
