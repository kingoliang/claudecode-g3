---
description: 迭代式代码生成，自动循环改进直到达标
argument-hint: [需求描述]
---

# 迭代式代码生成

执行需求: $ARGUMENTS

---

## 执行流程

**你必须按以下流程执行：**

### Step 0: 技术栈加载 (在生成代码前)

```
IF .claude/tech-stack.json 不存在:
    调用 /tech-stack 命令生成

tech_stack = 读取 .claude/tech-stack.json
```

**说明**:
- `/tech-stack` 命令负责检测项目配置并生成 `.claude/tech-stack.json`
- 如果文件已存在，直接读取使用（不重复检测）
- 需要重新检测时，运行 `/tech-stack --refresh`

### Step 1-4: 迭代循环

```
iteration = 0
WHILE (NOT PASS AND iteration < 5):
    iteration++

    # Step 1: 调用 code-writer 生成/改进代码
    Task(subagent_type="code-writer", prompt="需求: $ARGUMENTS, 技术栈: {...}, 反馈: {...}")

    # Step 2: 并行调用 3 个 reviewer (必须在单个消息中)
    Task(subagent_type="security-reviewer", prompt="...")
    Task(subagent_type="quality-checker", prompt="...")
    Task(subagent_type="performance-analyzer", prompt="...")

    # Step 3: 调用 result-aggregator 汇总
    Task(subagent_type="result-aggregator", prompt="...")

    # Step 4: 根据结果
    IF PASS: BREAK
    IF ITERATE: 将 feedback 传给 code-writer
```

## 达标标准

| 维度 | 要求 |
|------|------|
| Critical 问题 | 0 个 |
| High 问题 | ≤ 2 个 |
| 综合评分 | ≥ 80 分 |

## 禁止行为

- ❌ 不加载技术栈就开始生成代码
- ❌ 直接编写代码而不调用 code-writer
- ❌ 跳过 reviewer 检查
- ❌ 逐个调用 reviewer (必须并行)
- ❌ 每次迭代都重新检测技术栈（应使用缓存）

## 使用示例

```bash
/iterative-code 实现用户登录 API，支持邮箱密码登录
/iterative-code 实现文件上传服务，支持断点续传
```
