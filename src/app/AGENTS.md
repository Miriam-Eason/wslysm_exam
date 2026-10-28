# 页面与布局

上级规则：[根 AGENTS.md](../../AGENTS.md)。本文件的页面规则用于 `page.tsx`、布局及页面内交互；Route Handler 另读 [api/AGENTS.md](api/AGENTS.md)。

## 入口与边界

| 任务 | 先看 |
| --- | --- |
| 角色路由与登录 | [教师/学生登录路由组](%28auth%29)、[管理员登录](superadmin/page.tsx)、[auth.ts](../auth.ts)、[proxy.ts](../proxy.ts) |
| 教师、管理员布局 | [teacher/layout.tsx](teacher/layout.tsx)、[admin/layout.tsx](admin/layout.tsx) |
| 学生页面与作答 | [student/layout.tsx](student/layout.tsx)、[作答服务端页面](student/exams/[id]/page.tsx)、[作答客户端](student/exams/[id]/exam-client.tsx) |
| 样式与公共组件 | [globals.css](globals.css)、[components 指令](../components/AGENTS.md) |

## 修改要求

- 教师与管理员布局调用 `requireRole`；教师、学生登录位于 `(auth)`，管理员登录入口为 `/superadmin`，均不受相应业务布局包裹。修改路由时核对公开登录入口与受保护页面边界。
- 学生布局只提供外壳，不统一鉴权。服务端页面读取受保护数据前使用 `requireRole`；客户端页面通过有鉴权的 API 获取数据，不以客户端角色判断代替服务端校验。
- `proxy.ts` 是路由网关，不替代页面数据读取或 API 的角色与资源权限检查；改动登录跳转时核对 `forceSignIn` 失效会话路径。
- 保持 Server/Client 边界；交互状态放在客户端组件，Prisma、服务端鉴权及正确答案不随普通作答页面传给浏览器。Next.js 具体 API 先查根规则指定的本地指南。
- 页面内也有完整交互代码。调整 UI 时复用 `src/components/ui` 与全局样式，遵循根文件的简洁表达要求；不要只检查 components 目录。
- 改动后验证受影响角色的登录、直接访问、无权访问及业务流程；学生 UI 同时检查手机宽度下的作答与导航。
