# 组件与交互

上级规则：[根 AGENTS.md](../../AGENTS.md)。页面与布局见 [app/AGENTS.md](../app/AGENTS.md)。

## 复用入口

- [ui](ui) 提供按钮、输入、表格、对话框等基础组件；样式使用 [globals.css](../app/globals.css) 中的语义 token，类名合并使用 [utils.ts](../lib/utils.ts) 的 `cn`。
- [teacher](teacher)、[student](student)、[admin](admin) 放各角色业务组件；[auth](auth) 放登录与退出交互。
- 表单参考 [题目编辑](teacher/banks/question-form-dialog.tsx)；分步流程参考 [组卷向导](teacher/exams/create-exam-wizard.tsx)；题型与标签复用 [question.ts](../lib/question.ts)。
- [providers.tsx](providers.tsx) 与 [ui/sonner.tsx](ui/sonner.tsx) 提供全局 Toast 容器，反馈沿用现有 Sonner 用法。

## 修改要求

- 先查已有组件与变体，保留现有视觉和交互惯例；角色业务规则留在业务组件，不塞入通用 `ui` 组件。
- 客户端组件通过现有 API 协议读写，不导入 Prisma 或服务端鉴权模块；隐藏按钮不能代替服务端权限校验。
- 表单保持数组化答案契约，特别是填空 `answer: string[][]` 与 `chosen: string[]` 的区别；校验规则先查 [validations](../lib/validations)。
- UI 文案遵循根文件的简洁要求；保留必要的错误、状态与无障碍标签，不用额外说明弥补不清楚的布局。
- 保留基础组件的焦点、禁用、键盘及对话框行为；验证本次涉及的成功、失败、提交中状态，学生端同时检查手机宽度。
