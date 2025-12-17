---
description: 实现 OpenSpec 变更提案，支持跨会话恢复
argument-hint: [change-id] [--resume]
aliases: [os-apply-iterative]
---

# /helix:apply - OpenSpec 集成

实现指定的 OpenSpec 变更提案，支持迭代质量保证和跨会话恢复。

---

## ⚠️ MANDATORY EXECUTION RULES (必须严格遵守)

**以下规则必须严格执行，不得跳过或简化。违反任何规则视为执行失败。**

### Rule 1: Agent 调用 (MUST)

你**必须**使用 Task tool 调用以下 agents，**禁止**直接编写代码或跳过检查：

```
代码生成:    Task(subagent_type="code-writer", prompt="...")
安全检查:    Task(subagent_type="security-reviewer", prompt="...")
质量检查:    Task(subagent_type="quality-checker", prompt="...")
性能分析:    Task(subagent_type="performance-analyzer", prompt="...")
结果聚合:    Task(subagent_type="result-aggregator", prompt="...")
```

### Rule 2: 技术栈加载 (MUST - 在代码生成前执行)

在调用 code-writer 之前，**必须**先加载项目技术栈。

### Rule 3: 迭代循环 (MUST)

对每个任务，你**必须**执行迭代循环，直到 PASS 或达到最大迭代次数(5轮)。
3 个 reviewer 必须在**单个消息**中**并行**调用。

### Rule 4: 禁止行为 (FORBIDDEN)

- ❌ **禁止**: 不加载技术栈就开始生成代码
- ❌ **禁止**: 直接编写代码而不调用 code-writer agent
- ❌ **禁止**: 跳过任何 reviewer agent 的检查
- ❌ **禁止**: 不调用 result-aggregator 就判定是否通过
- ❌ **禁止**: 逐个调用 reviewer agents (必须并行，单个消息 3 个 Task)
- ❌ **禁止**: 修改代码后不重新运行检查流程
- ❌ **禁止**: 生成与项目技术栈不兼容的代码
- ❌ **禁止**: 每次迭代都重新检测技术栈（应使用缓存）

### Rule 5: context.md 生成 (MUST)

会话结束前，你**必须**生成或更新 `openspec/changes/{change-id}/context.md` 文件。

---

## 命令参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `change-id` | OpenSpec 变更 ID | `auth-oauth2` |
| `--resume` | 从上次中断处恢复 | `--resume` |
| `--quality-gate <level>` | 质量门槛预设 | `--quality-gate strict` |
| `--dry-run` | 预览变更，不实际执行 | `--dry-run` |

## 前提条件

执行此命令前，必须存在以下 OpenSpec 文件：

```
.claude/openspec/changes/{change-id}/
├── proposal.md      # 变更提案
├── design.md        # 详细设计
└── tasks.md         # 任务分解
```

## 执行流程

### Step 0: 加载 OpenSpec 上下文

从 `.claude/openspec/changes/{change_id}/` 目录读取：
- `proposal.md` - 变更提案
- `design.md` - 详细设计
- `tasks.md` - 任务分解

### Step 1: 检查恢复状态

| 条件 | 行为 |
|------|------|
| 指定 `--resume` 且存在 `context.md` | 从上次完成的任务继续 |
| 否则 | 从第一个任务开始 |

### Step 2: 加载技术栈

- 检查 `.claude/tech-stack.json` 是否存在
- 不存在则先执行 `/helix:stack` 生成
- 读取技术栈配置

### Step 3: 加载质量门槛

按优先级确定质量门槛：
1. 命令行 `--quality-gate` 参数
2. tech_stack 中的 quality_thresholds
3. 默认使用 `standard` 预设

### Step 4: 执行任务循环

对每个任务执行以下步骤：

| 步骤 | 操作 | Agent |
|------|------|-------|
| 4.1 | 实现任务代码 | code-writer |
| 4.2 | 并行运行质量检查 | security-reviewer, quality-checker, performance-analyzer |
| 4.3 | 汇总检查结果 | result-aggregator |
| 4.4 | 根据结果决策 | - |

**结果处理**：

| 推荐值 | 行为 |
|--------|------|
| PASS | 标记任务完成，保存进度 |
| ITERATE | 迭代改进直到通过 |
| STALLED/FAIL | 保存进度，停止执行 |

### Step 5: 完成

更新 OpenSpec 变更状态为 `implemented`

## 跨会话恢复

### context.md 格式

```markdown
# 执行上下文

**变更 ID**: auth-oauth2
**开始时间**: 2024-01-15T10:30:00Z
**最后更新**: 2024-01-15T14:45:00Z

## 进度

- [x] Task 1: 添加 OAuth2 依赖
- [x] Task 2: 实现 OAuth2 配置
- [ ] Task 3: 实现回调处理
- [ ] Task 4: 添加用户绑定逻辑
- [ ] Task 5: 编写测试

## 当前状态

**当前任务**: Task 3
**迭代次数**: 2
**最新评分**: Security 78, Quality 82, Performance 85

## 上下文快照

### 已修改文件
- src/config/oauth.ts
- src/middleware/auth.ts

### 待解决问题
- [SEC-003] 需要验证 state 参数
```

### 恢复执行

```bash
# 从上次中断处恢复
/helix:apply auth-oauth2 --resume

# 重新开始（忽略之前进度）
/helix:apply auth-oauth2
```

## OpenSpec 状态流转

```
draft → approved → implementing → implemented → deployed → archived
                        ↑
                   /helix:apply
```

## 与 OpenSpec 工作流集成

```bash
# 1. 分析需求
/os-analyze "添加 OAuth2 登录支持"

# 2. 创建提案
/os-proposal auth-oauth2

# 3. 实现变更（使用本命令）
/helix:apply auth-oauth2 --quality-gate standard

# 4. 归档变更
/os-archive auth-oauth2
```

## 质量门槛

此命令支持与 `/helix:code` 相同的质量门槛配置：

```bash
# 默认 standard 级别
/helix:apply auth-oauth2

# 严格模式
/helix:apply auth-oauth2 --quality-gate strict

# MVP 模式（快速原型）
/helix:apply auth-oauth2 --quality-gate mvp
```

## 输出格式

```markdown
## OpenSpec 变更实现摘要

**变更 ID**: auth-oauth2
**变更标题**: 添加 OAuth2 登录支持
**状态**: implemented

### 任务完成情况

| 任务 | 状态 | 迭代次数 | 最终评分 |
|------|------|----------|----------|
| Task 1: 添加依赖 | ✅ PASS | 1 | 95 |
| Task 2: 实现配置 | ✅ PASS | 2 | 88 |
| Task 3: 回调处理 | ✅ PASS | 3 | 86 |
| Task 4: 用户绑定 | ✅ PASS | 2 | 90 |
| Task 5: 编写测试 | ✅ PASS | 1 | 92 |

### 总体评分

- 安全: 89/100
- 质量: 88/100
- 性能: 87/100
- 综合: 88.2/100

### 修改文件

- src/config/oauth.ts (新增)
- src/middleware/auth.ts (修改)
- src/controllers/auth.ts (修改)
- src/services/oauth.ts (新增)
- tests/oauth.test.ts (新增)

### 下一步

运行 `/os-archive auth-oauth2` 归档此变更。
```

## 禁止行为

- ❌ 不加载 OpenSpec 文档就开始实现
- ❌ 跳过质量检查
- ❌ 不保存进度就退出
- ❌ 修改 OpenSpec 文档内容（只能读取）
- ❌ 实现超出设计文档范围的功能

## 向后兼容

此命令是 `/os-apply-iterative` 的升级版本，支持别名：
- `/helix:apply` (推荐)
- `/os-apply-iterative` (向后兼容)
