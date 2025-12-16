---
description: 迭代式代码生成，自动循环改进直到达标（支持质量门槛配置）
argument-hint: [需求描述] [--quality-gate <level>] [--quality-min <score>] [--skip-quality]
aliases: [iterative-code]
---

# /helix:code - 迭代式代码生成

执行需求: $ARGUMENTS

---

## 命令参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--quality-gate <level>` | 质量门槛预设: strict/standard/mvp | `--quality-gate strict` |
| `--quality-min <score>` | 自定义最低综合评分 | `--quality-min 90` |
| `--security-min <score>` | 自定义最低安全评分 | `--security-min 95` |
| `--performance-min <score>` | 自定义最低性能评分 | `--performance-min 85` |
| `--skip-quality` | 跳过质量检查（仅限原型） | `--skip-quality` |

## 执行流程

**你必须按以下流程执行：**

### Step 0: 配置加载

```python
# 0.1 技术栈加载
IF .claude/tech-stack.json 不存在:
    调用 /helix:stack 命令生成

tech_stack = 读取 .claude/tech-stack.json

# 0.2 质量门槛配置
IF flags.skip_quality:
    quality_gate = None  # 跳过质量检查
ELIF flags.quality_gate:
    quality_gate = load_preset(flags.quality_gate)  # strict/standard/mvp
ELIF tech_stack.quality_thresholds:
    quality_gate = tech_stack.quality_thresholds
ELSE:
    quality_gate = load_preset('standard')  # 默认

# 0.3 应用命令行覆盖
IF flags.quality_min:
    quality_gate.overall_min = flags.quality_min
IF flags.security_min:
    quality_gate.security_min = flags.security_min
IF flags.performance_min:
    quality_gate.performance_min = flags.performance_min
```

### Step 1-4: 智能迭代循环

```python
iteration = 0
failed_dimensions = []
previous_issues = []
max_iterations = quality_gate.max_iterations if quality_gate else 5

WHILE (NOT PASS AND iteration < max_iterations):
    iteration++

    # Step 1: 调用 code-writer 生成/改进代码
    Task(subagent_type="code-writer", prompt="""
        需求: $ARGUMENTS
        技术栈: {tech_stack}
        质量要求: {quality_gate}
        反馈: {feedback}
    """)

    # Step 2: 智能选择 reviewer (除非 skip_quality)
    IF quality_gate is None:
        BREAK  # 跳过质量检查

    IF iteration == 1 OR len(failed_dimensions) == 0:
        # 首次迭代：运行全部 reviewer (必须并行)
        reviewers = ["security-reviewer", "quality-checker", "performance-analyzer"]
    ELSE:
        # 后续迭代：只运行失败维度的 reviewer + 随机抽检
        passed_dimensions = ALL_DIMENSIONS - failed_dimensions
        spot_check = random_sample(passed_dimensions, 1) if passed_dimensions else []
        reviewers = failed_dimensions + spot_check

    # 并行调用选中的 reviewers (必须在单个消息中)
    FOR reviewer IN reviewers:
        Task(subagent_type=reviewer, prompt="...", run_in_parallel=True)

    # Step 3: 调用 result-aggregator 汇总
    aggregator_result = Task(subagent_type="result-aggregator", prompt="""
        iteration: {iteration}
        tech_stack: {tech_stack}
        quality_gate: {quality_gate}
        security_result: {security_result}
        quality_result: {quality_result}
        performance_result: {performance_result}
        previous_scores: {previous_scores}
        previous_issues: {previous_issues}
    """)

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

## 质量门槛预设

| 级别 | security_min | quality_min | performance_min | overall_min | max_high |
|------|-------------|-------------|-----------------|-------------|----------|
| strict | 95 | 90 | 85 | 90 | 0 |
| standard | 85 | 80 | 80 | 80 | 2 |
| mvp | 75 | 70 | 70 | 70 | 5 |

详细配置参见 `templates/presets/quality-presets.md`。

## 选择性复检规则

| 条件 | 运行的 Reviewer | 理由 |
|------|-----------------|------|
| 第1轮 | 全部 3 个 | 首次需要全面检查 |
| 仅安全不达标 | security-reviewer + 随机1个 | 聚焦问题 + 防止回归 |
| 仅质量不达标 | quality-checker + 随机1个 | 聚焦问题 + 防止回归 |
| 仅性能不达标 | performance-analyzer + 随机1个 | 聚焦问题 + 防止回归 |
| 多维度不达标 | 所有不达标维度 | 全部需要重检 |
| --skip-quality | 无 | 跳过质量检查 |

## 停滞检测

| 停滞类型 | 触发条件 | 建议 |
|----------|----------|------|
| `STALLED_SCORE` | 分数连续2轮提升<5分 | 检查是否需要更多上下文 |
| `STALLED_CRITICAL` | 同一Critical问题持续3轮 | 人工介入审查该问题 |
| `STALLED_OSCILLATING` | 分数在±3分内震荡3轮 | 检查反馈是否矛盾 |
| `STALLED_REGRESSION` | 某维度分数下降>10分 | 回滚到之前版本 |

## 禁止行为

- ❌ 不加载技术栈就开始生成代码
- ❌ 直接编写代码而不调用 code-writer
- ❌ 跳过 reviewer 检查（除非使用 --skip-quality）
- ❌ 首轮不运行全部 reviewer
- ❌ 每次迭代都重新检测技术栈（应使用缓存）
- ❌ 忽略停滞警告继续迭代
- ❌ 忽略 quality_gate 配置中的阈值

## 使用示例

```bash
# 基本使用（默认 standard 级别）
/helix:code 实现用户登录 API，支持邮箱密码登录

# 严格模式（金融/医疗场景）
/helix:code --quality-gate strict 实现支付处理模块

# MVP 模式（快速原型）
/helix:code --quality-gate mvp 快速实现演示页面

# 自定义安全要求
/helix:code --security-min 95 实现密码重置功能

# 跳过质量检查（仅限原型）
/helix:code --skip-quality 实现 UI 原型

# 复杂需求
/helix:code --quality-gate strict 实现文件上传服务，支持断点续传和并发上传

# 带上下文
/helix:code 根据 spec.md 中的设计，实现订单处理模块
```

## 输出格式

迭代完成后，输出以下摘要：

```markdown
## 迭代完成摘要

**最终状态**: PASS / FAIL_MAX_ITERATIONS / STALLED
**迭代次数**: 3/5
**质量门槛**: standard (命令行参数)

**最终评分**:
- 安全: 92/100 (要求: >= 85) ✅
- 质量: 88/100 (要求: >= 80) ✅
- 性能: 85/100 (要求: >= 80) ✅
- 综合: 88.6/100 (要求: >= 80) ✅

**问题统计**:
- Critical: 0 (上限: 0) ✅
- High: 1 (上限: 2) ✅
- Medium: 3
- Low: 5

**修改文件**:
- src/controllers/auth.ts
- src/services/auth.ts
- src/models/user.ts

**解决的问题**:
- [SEC-001] SQL 注入风险 → 使用参数化查询
- [QA-002] 函数过长 → 拆分为多个职责单一的函数
```

## 向后兼容

此命令是 `/iterative-code` 的升级版本，支持别名：
- `/helix:code` (推荐)
- `/iterative-code` (向后兼容)
