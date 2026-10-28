# 公共业务能力

上级规则：[根 AGENTS.md](../../AGENTS.md)。数据契约查 [数据模型总表](../../document/数据模型总表.md)，业务流程查 [开发PRD文档](../../document/开发PRD文档.md)。

## 任务入口

| 任务 | 入口与职责 |
| --- | --- |
| 数据库与鉴权 | [prisma.ts](prisma.ts) 为 App 单例；[auth-guard.ts](auth-guard.ts) 提供页面/API 角色鉴权；[class-access.ts](class-access.ts) 判断班级权限 |
| 输入与题目写入 | [validations](validations) 校验输入；[question-data.ts](question-data.ts) 构造题目写入数据；[question-hash.ts](question-hash.ts) 计算去重哈希 |
| 判分与成绩 | [grading.ts](grading.ts) 的 `gradeQuestion`；[stats.ts](stats.ts) 提供考试统计与学生作答明细 |
| 组卷 | [exam-compose.ts](exam-compose.ts) 校验规则并抽题；API 负责鉴权、快照与持久化 |
| Excel 导入与模板 | [import](import) 解析、预检；[templates](templates) 生成模板；题目导入复用校验与题目写入能力 |
| 展示与响应 | [question.ts](question.ts) 提供题型与标签；[api.ts](api.ts) 提供统一业务 JSON 响应与分页 |

题目新写入使用 `questionIdentityHash` 的 `v2:` 身份哈希，答案差异通过 `questionAnswerSignature` 比较；两者均可接收数据库 JSON。历史 `contentHash` 仍为旧口径，不能与 v2 直接比较，跨版本查重须读取历史题目计算身份。编辑历史题目保持原哈希；新增及编辑时锁定题库后比较新旧身份。选项内容重复由公共题目校验拒绝。

## 修改要求

- 先复用上述入口；服务端数据库能力与可供客户端使用的纯函数分开，不通过公共导出把 Prisma、鉴权或导入依赖带到客户端。
- 填空正确答案每空包含可接受答案集，学生每空提交一个字符串；判分先归一化，再要求全部空命中。修改时核对题目编辑、导入校验、作答保存与服务端提交链路，不只改 `grading.ts`。
- 组卷筛选中 `null` 表示不限，空字符串表示未标注；抽题按规则顺序排除已选题。更改这些语义时同步核对组卷向导、预览与创建试卷的接口。
- 题目导入的 preview / confirm 共用解析与分析逻辑；修改列、别名或去重口径时同时核对模板、输入校验和写入数据。
- 特殊契约或设计原因变化时更新对应说明；不要逐文件复述 imports / exports，不要求统一三段式文件头。
- 判分验证覆盖各题型及填空别名、归一化、缺空和错空；组卷验证覆盖筛选、库存不足和不重题；导入验证覆盖有效、无效与重复数据。根文件规定的代码检查仍需执行。
