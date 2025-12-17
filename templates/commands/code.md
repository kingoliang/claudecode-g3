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

1. **技术栈加载**
   - 检查 `.claude/tech-stack.json` 是否存在
   - 如果不存在，先调用 `/helix:stack` 命令生成
   - 读取技术栈配置

2. **质量门槛配置**（按优先级）
   - 如果指定了 `--skip-quality`：跳过质量检查
   - 如果指定了 `--quality-gate`：加载对应预设 (strict/standard/mvp)
   - 如果 tech_stack 包含 quality_thresholds：使用该配置
   - 否则：使用 standard 预设作为默认值

3. **命令行覆盖**
   - `--quality-min` 覆盖 `overall_min`
   - `--security-min` 覆盖 `security_min`
   - `--performance-min` 覆盖 `performance_min`

### Step 1-4: 智能迭代循环

**循环条件**: 未通过检查 且 迭代次数 < max_iterations

#### Step 1: 调用 code-writer

使用 Task 工具调用 code-writer agent，传入：
- 需求描述
- 技术栈配置
- 质量要求
- 上一轮反馈（如果有）

#### Step 2: 智能选择 reviewer

**如果 skip_quality 为 true**：直接结束，跳过质量检查

**首次迭代或无失败维度时**：
- 运行全部 3 个 reviewer（必须并行）
- security-reviewer, quality-checker, performance-analyzer

**后续迭代有失败维度时**：
- 只运行失败维度的 reviewer
- 加上随机抽检一个已通过维度（防止回归）

**重要**: 多个 reviewer 必须在单个消息中并行调用

#### Step 3: 调用 result-aggregator

汇总所有 reviewer 结果，传入：
- 当前迭代轮次
- 技术栈配置
- 质量门槛配置
- 各 reviewer 的检查结果
- 历史分数（用于停滞检测）

#### Step 4: 决策与状态更新

根据 aggregator 的 recommendation：
- **PASS**: 结束循环，输出成功摘要
- **STALLED**: 结束循环，输出停滞警告，建议人工介入
- **ITERATE**: 将 feedback_for_code_writer 传给下一轮 code-writer
- **FAIL_MAX_ITERATIONS**: 结束循环，输出失败摘要

## 质量门槛预设

| 级别 | security_min | quality_min | performance_min | overall_min | max_high |
|------|-------------|-------------|-----------------|-------------|----------|
| strict | 95 | 90 | 85 | 90 | 0 |
| standard | 85 | 80 | 80 | 80 | 2 |
| mvp | 75 | 70 | 70 | 70 | 5 |

详细配置参见 `templates/presets/quality-presets.md`

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

- 不加载技术栈就开始生成代码
- 直接编写代码而不调用 code-writer
- 跳过 reviewer 检查（除非使用 --skip-quality）
- 首轮不运行全部 reviewer
- 每次迭代都重新检测技术栈（应使用缓存）
- 忽略停滞警告继续迭代
- 忽略 quality_gate 配置中的阈值

## 输出格式

迭代完成后，输出摘要包含：

- **最终状态**: PASS / FAIL_MAX_ITERATIONS / STALLED
- **迭代次数**: 当前/最大
- **质量门槛**: 使用的预设或配置来源
- **最终评分**: 各维度评分及是否达标
- **问题统计**: 各级别问题数量
- **修改文件**: 本次迭代修改的文件列表
- **解决的问题**: 已修复问题的简要说明

## 向后兼容

此命令支持别名：
- `/helix:code` (推荐)
- `/iterative-code` (向后兼容)
