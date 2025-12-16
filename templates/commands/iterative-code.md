---
description: 迭代式代码生成，自动循环改进直到达标
argument-hint: [需求描述]
---

# 迭代式代码生成（优化版）

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

### Step 1-4: 智能迭代循环

```python
iteration = 0
failed_dimensions = []  # 追踪失败维度
previous_issues = []    # 追踪历史问题

WHILE (NOT PASS AND iteration < max_iterations):
    iteration++

    # Step 1: 调用 code-writer 生成/改进代码
    Task(subagent_type="code-writer", prompt="需求: $ARGUMENTS, 技术栈: {...}, 反馈: {...}")

    # Step 2: 智能选择 reviewer
    IF iteration == 1 OR len(failed_dimensions) == 0:
        # 首次迭代：运行全部 reviewer (必须并行)
        reviewers = ["security-reviewer", "quality-checker", "performance-analyzer"]
    ELSE:
        # 后续迭代：只运行失败维度的 reviewer + 随机抽检一个通过的
        passed_dimensions = ALL_DIMENSIONS - failed_dimensions
        spot_check = random_sample(passed_dimensions, 1) if passed_dimensions else []
        reviewers = failed_dimensions + spot_check

    # 并行调用选中的 reviewers (必须在单个消息中)
    FOR reviewer IN reviewers:
        Task(subagent_type=reviewer, prompt="...", run_in_parallel=True)

    # Step 3: 调用 result-aggregator 汇总
    aggregator_result = Task(subagent_type="result-aggregator", prompt="{
        iteration: ...,
        tech_stack: {...},
        security_result: {...},
        quality_result: {...},
        performance_result: {...},
        previous_scores: [...],
        previous_issues: [...]  # 用于停滞检测
    }")

    # Step 4: 更新状态并决策
    failed_dimensions = get_failed_dimensions(aggregator_result)
    previous_issues.append(aggregator_result.issues)

    IF aggregator_result.recommendation == "PASS":
        BREAK
    ELIF aggregator_result.recommendation == "STALLED":
        输出停滞警告，建议人工介入
        BREAK
    ELIF aggregator_result.recommendation == "ITERATE":
        将 feedback_for_code_writer 传给 code-writer
```

## 选择性复检规则

| 条件 | 运行的 Reviewer | 理由 |
|------|-----------------|------|
| 第1轮 | 全部 3 个 | 首次需要全面检查 |
| 仅安全不达标 | security-reviewer + 随机1个 | 聚焦问题 + 防止回归 |
| 仅质量不达标 | quality-checker + 随机1个 | 聚焦问题 + 防止回归 |
| 仅性能不达标 | performance-analyzer + 随机1个 | 聚焦问题 + 防止回归 |
| 多维度不达标 | 所有不达标维度 | 全部需要重检 |

**优势**：
- 减少 30-60% 的 API 调用
- 加速迭代循环
- 随机抽检防止回归

## 达标标准

从 `tech_stack.quality_thresholds` 读取，默认值：

| 维度 | 要求 | 配置项 |
|------|------|--------|
| Critical 问题 | 0 个 | `max_critical_issues` |
| High 问题 | ≤ 2 个 | `max_high_issues` |
| 安全评分 | ≥ 85 分 | `security_min` |
| 质量评分 | ≥ 80 分 | `quality_min` |
| 性能评分 | ≥ 80 分 | `performance_min` |
| 综合评分 | ≥ 80 分 | `overall_min` |

## 停滞检测

当检测到以下情况时，自动触发停滞警告：

| 停滞类型 | 触发条件 | 建议 |
|----------|----------|------|
| `STALLED_SCORE` | 分数连续2轮提升<5分 | 检查是否需要更多上下文 |
| `STALLED_CRITICAL` | 同一Critical问题持续3轮 | 人工介入审查该问题 |
| `STALLED_OSCILLATING` | 分数在±3分内震荡3轮 | 检查反馈是否矛盾 |
| `STALLED_REGRESSION` | 某维度分数下降>10分 | 回滚到之前版本 |

## 禁止行为

- ❌ 不加载技术栈就开始生成代码
- ❌ 直接编写代码而不调用 code-writer
- ❌ 跳过 reviewer 检查
- ❌ 首轮不运行全部 reviewer
- ❌ 每次迭代都重新检测技术栈（应使用缓存）
- ❌ 忽略停滞警告继续迭代

## 使用示例

```bash
# 基本使用
/iterative-code 实现用户登录 API，支持邮箱密码登录

# 复杂需求
/iterative-code 实现文件上传服务，支持断点续传和并发上传

# 带上下文
/iterative-code 根据 spec.md 中的设计，实现订单处理模块
```

## 输出格式

迭代完成后，输出以下摘要：

```markdown
## 迭代完成摘要

**最终状态**: PASS / FAIL_MAX_ITERATIONS / STALLED
**迭代次数**: 3/5
**最终评分**:
- 安全: 92/100
- 质量: 88/100
- 性能: 85/100
- 综合: 88.6/100

**修改文件**:
- src/controllers/auth.ts
- src/services/auth.ts
- src/models/user.ts

**解决的问题**:
- [SEC-001] SQL 注入风险 → 使用参数化查询
- [QA-002] 函数过长 → 拆分为多个职责单一的函数
```
