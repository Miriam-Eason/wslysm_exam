# API 与权限边界

上级规则：[app/AGENTS.md](../AGENTS.md)、[根 AGENTS.md](../../../AGENTS.md)。业务流程与接口定义查 [开发PRD文档](../../../document/开发PRD文档.md)。

## 复用入口

- [auth-guard.ts](../../lib/auth-guard.ts)：`requireApiRole`；[api.ts](../../lib/api.ts)：`ok`、`fail`、`parsePagination`。
- [class-access.ts](../../lib/class-access.ts)：区分班级创建者与授课教师；[validations](../../lib/validations) 提供已有输入校验。
- 学生作答链路：[开始/续答](student/exams/[id]/attempt/route.ts) → [保存](student/attempts/[id]/save/route.ts) → [提交](student/attempts/[id]/submit/route.ts) → [结果](student/attempts/[id]/result/route.ts)。
- 题目、组卷、导入及判分能力见 [lib/AGENTS.md](../../lib/AGENTS.md)，不要在新接口中另建一套规则。

## 修改要求

- 受保护业务接口调用 `requireApiRole`，失败立即返回；角色匹配后仍须检查题库、试卷、班级或作答记录的资源归属。不能仅凭请求中的 ID 读写数据。
- 班级权限使用 `loadClassForTeacher` 的 `teaches` / `isCreator`，按操作区分授课关系与创建者权限；参考 [班级修改接口](classes/[id]/route.ts)。
- 业务 JSON 响应沿用 `ok` / `fail`；请求按对应 Zod schema 校验。Auth.js 回调、健康探针和文件下载保留各自协议，不机械包装成业务 JSON 或强加角色登录。
- 作答题目来自 `ExamQuestion` 快照。开始/续答响应不含正确答案和解析；保存只写草稿，不接受客户端判分结果；提交在服务端判分。
- 结果接口校验作答归属及 `SUBMITTED` 状态后才返回正确答案与解析；错题复习遵循其独立流程。不得把结果接口直接复用于作答中的题目下发。
- 响应字段按业务阶段明确选择，不把含答案、密码哈希等内部字段的 Prisma 记录直接返回。
- 修改后检查正确角色、未登录、错误角色与其他用户资源访问；涉及作答时覆盖保存、提交、结果阶段及答案披露边界。
