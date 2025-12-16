---
description: 实现 OpenSpec 变更提案，支持跨会话恢复
argument-hint: [change-id] [--resume]
aliases: [os-apply-iterative]
---

# /helix:apply - OpenSpec 集成

实现指定的 OpenSpec 变更提案，支持迭代质量保证和跨会话恢复。

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

```python
# Step 0: 加载 OpenSpec 上下文
change_dir = f'.claude/openspec/changes/{change_id}'
proposal = read(f'{change_dir}/proposal.md')
design = read(f'{change_dir}/design.md')
tasks = read(f'{change_dir}/tasks.md')

# Step 1: 检查恢复状态
IF --resume AND exists(f'{change_dir}/context.md'):
    context = load_context(f'{change_dir}/context.md')
    start_from_task = context.last_completed_task + 1
ELSE:
    start_from_task = 1

# Step 2: 加载技术栈
IF NOT exists('.claude/tech-stack.json'):
    execute('/helix:stack')
tech_stack = read('.claude/tech-stack.json')

# Step 3: 加载质量门槛
IF --quality_gate:
    quality_gate = load_preset(flags.quality_gate)
ELIF tech_stack.quality_thresholds:
    quality_gate = tech_stack.quality_thresholds
ELSE:
    quality_gate = load_preset('standard')

# Step 4: 执行任务
FOR task IN tasks[start_from_task:]:
    # 4.1 调用 code-writer 实现任务
    code_result = Task(subagent_type="code-writer", prompt=f"""
        任务: {task}
        设计文档: {design}
        技术栈: {tech_stack}
        质量要求: {quality_gate}
    """)

    # 4.2 运行质量检查（并行）
    security_result = Task(subagent_type="security-reviewer", ...)
    quality_result = Task(subagent_type="quality-checker", ...)
    performance_result = Task(subagent_type="performance-analyzer", ...)

    # 4.3 汇总结果
    aggregator_result = Task(subagent_type="result-aggregator", ...)

    # 4.4 处理结果
    IF aggregator_result.recommendation == "PASS":
        mark_task_complete(task)
        save_context()  # 保存进度
    ELIF aggregator_result.recommendation == "ITERATE":
        # 迭代改进直到通过
        iterate_until_pass(task, quality_gate)
    ELSE:
        save_context()  # 保存进度以便恢复
        raise StalledException()

# Step 5: 完成
update_openspec_status(change_id, 'implemented')
```

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
