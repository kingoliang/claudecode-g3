---
name: iterative-workflow
description: 迭代式多 Agent 协作工作流。代码生成后自动检查，反馈改进，循环直到达标。支持独立使用或与 OpenSpec 集成。
---

# 迭代式协作工作流

## ⚠️ MANDATORY (必须执行)

当此 Skill 被激活时，你**必须**：

1. **使用 Task tool 调用 Agents** - 禁止直接编写代码
   ```
   Task(subagent_type="code-writer", prompt="...")
   Task(subagent_type="security-reviewer", prompt="...")
   Task(subagent_type="quality-checker", prompt="...")
   Task(subagent_type="performance-analyzer", prompt="...")
   Task(subagent_type="result-aggregator", prompt="...")
   ```

2. **并行执行 3 个 Reviewer** - 单个消息包含 3 个 Task 调用

3. **根据 result-aggregator 结果决定下一步**
   - PASS → 任务完成
   - ITERATE → 将 feedback 传给 code-writer 继续迭代
   - STALLED → 记录阻塞，请求人工介入

---

## 概述

这是一个自动化的代码质量保证工作流，通过多个专业 Agent 协作，确保生成的代码满足安全、质量和性能标准。

## 核心理念

```
写代码 → 检查 → 反馈 → 改进 → 再检查 → 循环直到达标
```

## 参与的 Agents

| Agent | 职责 | 模型 |
|-------|------|------|
| code-writer | 编写和改进代码 | opus |
| security-reviewer | 安全漏洞检测 | opus |
| quality-checker | 代码质量检查 | opus |
| performance-analyzer | 性能分析 | opus |
| result-aggregator | 汇总判定 | opus |

## 工作流程图

```
用户需求 / OpenSpec 任务
           ↓
┌─────────────────────────────────┐
│      code-writer                │
│  - 理解需求                      │
│  - 编写/改进代码                 │
│  - 接收反馈                      │
└─────────────────────────────────┘
           ↓ 代码产出
┌─────────────────────────────────┐
│     并行质量检查                 │
├──────────┬──────────┬───────────┤
│ security │ quality  │ perform   │
│ -reviewer│ -checker │ -analyzer │
└──────────┴──────────┴───────────┘
           ↓ 检查结果
┌─────────────────────────────────┐
│     result-aggregator           │
│  - 汇总所有检查结果              │
│  - 计算综合评分                  │
│  - 判断是否达标                  │
│  - 生成改进反馈                  │
└─────────────────────────────────┘
           ↓
     ┌─────┴─────┐
     ↓           ↓
  [达标]      [未达标]
     ↓           ↓
 输出代码    反馈给 code-writer
                 ↓
           继续迭代...
           (最多 5 轮)
```

## 主协调逻辑

```python
# 伪代码展示主协调流程

MAX_ITERATIONS = 5
PASS_THRESHOLD = 80
SECURITY_THRESHOLD = 85

def iterative_code_generation(requirement, spec=None, design=None):
    """
    迭代式代码生成主流程

    Args:
        requirement: 用户需求描述
        spec: OpenSpec 规范 (可选)
        design: 技术设计 (可选)
    """
    iteration = 0
    passed = False
    previous_scores = []
    feedback = None

    while not passed and iteration < MAX_ITERATIONS:
        iteration += 1
        print(f"\n=== 第 {iteration} 轮迭代 ===")

        # Step 1: 生成/改进代码
        if iteration == 1:
            code = call_agent("code-writer", {
                "requirement": requirement,
                "spec": spec,
                "design": design
            })
        else:
            code = call_agent("code-writer", {
                "previous_code": code,
                "feedback": feedback,
                "issues": aggregated["high_issues"] + aggregated["critical_issues"]
            })

        # Step 2: 并行质量检查
        # 使用 Task 工具并行启动 3 个 Agent
        security_result = call_agent_async("security-reviewer", code)
        quality_result = call_agent_async("quality-checker", code)
        performance_result = call_agent_async("performance-analyzer", code)

        # 等待所有检查完成
        await_all([security_result, quality_result, performance_result])

        # Step 3: 聚合判定
        aggregated = call_agent("result-aggregator", {
            "iteration": iteration,
            "security_result": security_result,
            "quality_result": quality_result,
            "performance_result": performance_result,
            "previous_scores": previous_scores
        })

        passed = aggregated["passed"]
        feedback = aggregated["feedback_for_code_writer"]
        previous_scores.append(aggregated["overall_score"])

        # 检查进度停滞
        if aggregated["recommendation"] == "STALLED":
            print("⚠️ 进度停滞，建议人工介入")
            break

        print(f"评分: {aggregated['overall_score']}/100")
        print(f"状态: {'✅ 达标' if passed else '🔄 继续迭代'}")

    # 返回结果
    if passed:
        return {
            "status": "SUCCESS",
            "code": code,
            "iterations": iteration,
            "final_score": aggregated["overall_score"],
            "report": aggregated
        }
    else:
        return {
            "status": "MAX_ITERATIONS_REACHED" if iteration >= MAX_ITERATIONS else "STALLED",
            "code": code,
            "iterations": iteration,
            "final_score": aggregated["overall_score"],
            "remaining_issues": aggregated["high_issues"],
            "report": aggregated
        }
```

## 达标标准

| 维度 | 要求 | 权重 |
|------|------|------|
| Critical 问题 | 0 个 | 一票否决 |
| High 问题 | ≤ 2 个 | - |
| 安全评分 | ≥ 85 分 | 40% |
| 质量评分 | ≥ 80 分 | 35% |
| 性能评分 | ≥ 80 分 | 25% |
| **综合评分** | **≥ 80 分** | - |

## 评分计算

```python
def calculate_overall_score(security, quality, performance):
    """
    计算综合评分

    权重:
    - 安全: 40% (最重要)
    - 质量: 35%
    - 性能: 25%
    """
    return (
        security * 0.40 +
        quality * 0.35 +
        performance * 0.25
    )
```

## 与 OpenSpec 集成

当与 OpenSpec 结合使用时:

### 输入来源

| 数据 | 来源 |
|------|------|
| 任务描述 | tasks.md |
| 需求规范 | specs/*.md |
| 技术设计 | design.md |
| 上下文 | context.md |

### 输出更新

| 文件 | 更新内容 |
|------|---------|
| context.md | 会话历史、决策、进度 |
| tasks.md | 任务状态、完成时间 |

### 跨会话恢复

通过 `context.md` 的 **Quick Resume** 部分实现:

```markdown
## Quick Resume (For Context Reset)

> **TL;DR for next session**: 继续实现 TokenService

**Last Working State**:
- **What I was doing**: Task 3 - TokenService 实现
- **Files modified**: TokenService.java (进行中)
- **Test status**: ✅ 8/8 pass
- **Blockers**: 无

**Next Steps**:
1. 完成 refreshToken() 方法
2. 添加单元测试
```

## 使用方式

### 方式 1: 独立使用

```bash
/iterative-code 实现一个用户登录 API
```

### 方式 2: 与 OpenSpec 结合

```bash
# 1. 创建提案
/openspec:proposal "实现用户认证"

# 2. 迭代式实现
/os-apply-iterative CHG-user-auth

# 3. 归档
/openspec:archive CHG-user-auth
```

### 方式 3: 直接对话

```
> 用迭代式协作帮我实现文件上传功能，要求安全和性能达标
```

## 迭代控制参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| MAX_ITERATIONS | 5 | 最大迭代次数 |
| PASS_THRESHOLD | 80 | 综合评分达标阈值 |
| SECURITY_THRESHOLD | 85 | 安全评分阈值 |
| STALL_DETECTION | 2 | 停滞检测轮数 |
| STALL_THRESHOLD | 5 | 停滞判定分数阈值 |

## 最佳实践

### 1. 明确需求
- 提供清晰的功能描述
- 指定技术约束和偏好
- 如有必要，提供参考代码

### 2. 使用 OpenSpec
- 对于复杂功能，先创建 OpenSpec 提案
- 利用 spec.md 明确需求
- 利用 design.md 指导实现

### 3. 关注反馈
- 查看每轮迭代的反馈
- 理解为什么某些问题需要修复
- 如有分歧，可以人工介入

### 4. 控制范围
- 每次只实现一个功能点
- 避免需求过于复杂
- 必要时拆分为多个变更

## 故障排除

### 问题: 达到最大迭代仍未达标

**可能原因**:
- 需求过于复杂
- 存在难以自动解决的技术问题
- 达标标准过高

**解决方案**:
1. 检查剩余问题，考虑人工解决
2. 降低达标阈值后重试
3. 拆分需求为更小的任务

### 问题: 进度停滞

**可能原因**:
- 问题修复引入新问题
- 互相冲突的要求
- 代码结构问题

**解决方案**:
1. 人工检查代码，理解问题根源
2. 调整设计方案
3. 考虑重构现有代码
