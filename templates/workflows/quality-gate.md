---
name: quality-gate
description: 质量门槛系统 - 为代码生成命令提供可配置的质量保证
version: 1.0.0
---

# 质量门槛系统

本文档定义了 Helix 框架的质量门槛配置和触发逻辑。

## 概述

质量门槛系统为所有代码生成命令提供三个预设级别：
- **strict**: 金融/医疗等高安全要求场景
- **standard**: 默认级别，适合大多数生产项目
- **mvp**: 快速原型，宽松要求

## 质量门槛配置

### 预设级别

| 级别 | security_min | quality_min | performance_min | overall_min | max_critical | max_high |
|------|-------------|-------------|-----------------|-------------|--------------|----------|
| strict | 95 | 90 | 85 | 90 | 0 | 0 |
| standard | 85 | 80 | 80 | 80 | 0 | 2 |
| mvp | 75 | 70 | 70 | 70 | 0 | 5 |

### 权重配置

所有预设使用相同的默认权重：

```json
{
  "security": 0.40,
  "quality": 0.35,
  "performance": 0.25
}
```

## 命令参数

所有代码生成命令支持以下质量相关参数：

### `--quality-gate <level>`

选择质量门槛预设级别。

```bash
/helix:code --quality-gate strict  实现支付处理模块
/helix:code --quality-gate mvp     快速实现 POC 演示
```

### `--quality-min <score>`

自定义最低综合评分要求（覆盖预设）。

```bash
/helix:code --quality-min 95  实现核心交易逻辑
```

### `--security-min <score>`

自定义最低安全评分要求。

```bash
/helix:code --security-min 98  实现身份验证模块
```

### `--skip-quality`

跳过质量检查，直接输出代码（仅限原型场景）。

```bash
/helix:code --skip-quality  快速实现 UI 原型
```

## 触发逻辑

### 质量门槛检查流程

```python
def apply_quality_gate(flags, tech_stack):
    """
    根据命令参数和技术栈配置确定质量门槛。

    优先级：
    1. 命令行参数 (--quality-min, --security-min 等)
    2. 命令行预设 (--quality-gate <level>)
    3. 技术栈配置 (tech_stack.quality_thresholds)
    4. 默认预设 (standard)
    """

    # 检查是否跳过质量检查
    if flags.get('skip_quality'):
        return None  # 不应用质量门槛

    # 加载基础配置
    if flags.get('quality_gate'):
        thresholds = load_preset(flags['quality_gate'])
    elif tech_stack.get('quality_thresholds'):
        thresholds = tech_stack['quality_thresholds']
    else:
        thresholds = load_preset('standard')

    # 应用命令行覆盖
    if flags.get('quality_min'):
        thresholds['overall_min'] = flags['quality_min']
    if flags.get('security_min'):
        thresholds['security_min'] = flags['security_min']
    if flags.get('performance_min'):
        thresholds['performance_min'] = flags['performance_min']

    return thresholds
```

### 评分计算

```python
def calculate_overall_score(security, quality, performance, weights):
    """
    计算加权综合评分。

    公式: overall = security * w_s + quality * w_q + performance * w_p
    """
    return (
        security * weights['security'] +
        quality * weights['quality'] +
        performance * weights['performance']
    )

def check_pass_criteria(scores, issues, thresholds):
    """
    检查是否满足通过标准。

    必须同时满足：
    1. 无 Critical 问题（或符合 max_critical 限制）
    2. High 问题数 <= max_high
    3. 各维度评分 >= 对应 min 值
    4. 综合评分 >= overall_min
    """
    critical_count = count_issues_by_severity(issues, 'Critical')
    high_count = count_issues_by_severity(issues, 'High')

    return (
        critical_count <= thresholds['max_critical_issues'] and
        high_count <= thresholds['max_high_issues'] and
        scores['security'] >= thresholds['security_min'] and
        scores['quality'] >= thresholds['quality_min'] and
        scores['performance'] >= thresholds['performance_min'] and
        scores['overall'] >= thresholds['overall_min']
    )
```

## 与技术栈集成

质量门槛可以在 `.claude/tech-stack.json` 中预配置：

```json
{
  "language": "TypeScript",
  "framework": "Next.js",
  "quality_thresholds": {
    "security_min": 90,
    "quality_min": 85,
    "performance_min": 80,
    "overall_min": 85,
    "max_critical_issues": 0,
    "max_high_issues": 1
  },
  "weights": {
    "security": 0.45,
    "quality": 0.30,
    "performance": 0.25
  }
}
```

## 行业特定预设

### 金融科技 (FinTech)

```json
{
  "preset": "fintech",
  "security_min": 98,
  "quality_min": 90,
  "performance_min": 85,
  "overall_min": 92,
  "max_critical_issues": 0,
  "max_high_issues": 0,
  "extra_checks": [
    "pci_dss_compliance",
    "data_encryption",
    "audit_logging"
  ]
}
```

### 医疗健康 (Healthcare)

```json
{
  "preset": "healthcare",
  "security_min": 98,
  "quality_min": 92,
  "performance_min": 80,
  "overall_min": 90,
  "max_critical_issues": 0,
  "max_high_issues": 0,
  "extra_checks": [
    "hipaa_compliance",
    "phi_protection",
    "access_control"
  ]
}
```

### 电子商务 (E-Commerce)

```json
{
  "preset": "ecommerce",
  "security_min": 90,
  "quality_min": 85,
  "performance_min": 88,
  "overall_min": 87,
  "max_critical_issues": 0,
  "max_high_issues": 1,
  "extra_checks": [
    "payment_security",
    "csrf_protection",
    "rate_limiting"
  ]
}
```

## 使用示例

### 基本使用

```bash
# 使用默认 standard 级别
/helix:code 实现用户注册 API

# 使用 strict 级别
/helix:code --quality-gate strict 实现支付处理模块

# 使用 mvp 级别快速原型
/helix:code --quality-gate mvp 实现演示页面
```

### 自定义配置

```bash
# 自定义安全要求
/helix:code --security-min 95 实现密码重置功能

# 组合使用
/helix:code --quality-gate strict --performance-min 90 实现高并发 API
```

### 跳过质量检查

```bash
# 仅用于原型和测试
/helix:code --skip-quality 快速实现 UI 组件
```

## 输出格式

质量门槛检查结果会在迭代摘要中显示：

```markdown
## 质量门槛检查结果

**应用的预设**: strict
**配置来源**: 命令行参数

| 维度 | 要求 | 实际 | 状态 |
|------|------|------|------|
| 安全评分 | >= 95 | 96 | PASS |
| 质量评分 | >= 90 | 92 | PASS |
| 性能评分 | >= 85 | 87 | PASS |
| 综合评分 | >= 90 | 92.1 | PASS |
| Critical 问题 | = 0 | 0 | PASS |
| High 问题 | <= 0 | 0 | PASS |

**最终状态**: PASS - 满足所有质量门槛要求
```
