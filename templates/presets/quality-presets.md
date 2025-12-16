---
name: quality-presets
description: 质量预设配置 - 定义 strict/standard/mvp 三个级别
version: 1.0.0
---

# 质量预设配置

本文档定义了 Helix 框架的质量预设级别。

## 预设级别定义

### Standard (默认)

适用于：大多数生产项目

```json
{
  "name": "standard",
  "description": "默认质量级别，适合大多数生产项目",
  "thresholds": {
    "security_min": 85,
    "quality_min": 80,
    "performance_min": 80,
    "overall_min": 80,
    "max_critical_issues": 0,
    "max_high_issues": 2,
    "max_iterations": 5,
    "stall_threshold": 5,
    "stall_rounds": 2
  },
  "weights": {
    "security": 0.40,
    "quality": 0.35,
    "performance": 0.25
  }
}
```

### Strict

适用于：金融、医疗、安全敏感应用

```json
{
  "name": "strict",
  "description": "严格质量级别，适用于金融/医疗等高安全要求场景",
  "thresholds": {
    "security_min": 95,
    "quality_min": 90,
    "performance_min": 85,
    "overall_min": 90,
    "max_critical_issues": 0,
    "max_high_issues": 0,
    "max_iterations": 7,
    "stall_threshold": 3,
    "stall_rounds": 2
  },
  "weights": {
    "security": 0.50,
    "quality": 0.30,
    "performance": 0.20
  }
}
```

### MVP

适用于：原型、演示、概念验证

```json
{
  "name": "mvp",
  "description": "宽松质量级别，适用于快速原型和 MVP",
  "thresholds": {
    "security_min": 75,
    "quality_min": 70,
    "performance_min": 70,
    "overall_min": 70,
    "max_critical_issues": 0,
    "max_high_issues": 5,
    "max_iterations": 3,
    "stall_threshold": 8,
    "stall_rounds": 2
  },
  "weights": {
    "security": 0.35,
    "quality": 0.35,
    "performance": 0.30
  }
}
```

## 对比表

| 特性 | MVP | Standard | Strict |
|------|-----|----------|--------|
| **安全评分要求** | >= 75 | >= 85 | >= 95 |
| **质量评分要求** | >= 70 | >= 80 | >= 90 |
| **性能评分要求** | >= 70 | >= 80 | >= 85 |
| **综合评分要求** | >= 70 | >= 80 | >= 90 |
| **Critical 问题** | 0 | 0 | 0 |
| **High 问题上限** | 5 | 2 | 0 |
| **最大迭代次数** | 3 | 5 | 7 |
| **停滞阈值** | 8 分 | 5 分 | 3 分 |
| **安全权重** | 35% | 40% | 50% |
| **质量权重** | 35% | 35% | 30% |
| **性能权重** | 30% | 25% | 20% |

## 行业特化预设

### FinTech (金融科技)

```json
{
  "name": "fintech",
  "extends": "strict",
  "description": "金融科技行业预设，强调安全和合规",
  "thresholds": {
    "security_min": 98,
    "quality_min": 90,
    "performance_min": 85,
    "overall_min": 92,
    "max_critical_issues": 0,
    "max_high_issues": 0
  },
  "weights": {
    "security": 0.55,
    "quality": 0.25,
    "performance": 0.20
  },
  "extra_rules": [
    "必须使用参数化查询",
    "必须加密敏感数据",
    "必须记录审计日志",
    "禁止硬编码密钥"
  ]
}
```

### Healthcare (医疗健康)

```json
{
  "name": "healthcare",
  "extends": "strict",
  "description": "医疗健康行业预设，强调隐私保护",
  "thresholds": {
    "security_min": 98,
    "quality_min": 92,
    "performance_min": 80,
    "overall_min": 90,
    "max_critical_issues": 0,
    "max_high_issues": 0
  },
  "weights": {
    "security": 0.50,
    "quality": 0.35,
    "performance": 0.15
  },
  "extra_rules": [
    "必须保护 PHI 数据",
    "必须实现访问控制",
    "必须支持数据脱敏",
    "禁止未授权数据访问"
  ]
}
```

### E-Commerce (电子商务)

```json
{
  "name": "ecommerce",
  "extends": "standard",
  "description": "电子商务行业预设，平衡安全和性能",
  "thresholds": {
    "security_min": 90,
    "quality_min": 85,
    "performance_min": 88,
    "overall_min": 87,
    "max_critical_issues": 0,
    "max_high_issues": 1
  },
  "weights": {
    "security": 0.40,
    "quality": 0.30,
    "performance": 0.30
  },
  "extra_rules": [
    "必须实现 CSRF 保护",
    "必须实现速率限制",
    "支付流程必须加密",
    "必须优化页面加载"
  ]
}
```

### Startup (初创项目)

```json
{
  "name": "startup",
  "extends": "mvp",
  "description": "初创项目预设，快速迭代",
  "thresholds": {
    "security_min": 80,
    "quality_min": 75,
    "performance_min": 75,
    "overall_min": 75,
    "max_critical_issues": 0,
    "max_high_issues": 3
  },
  "weights": {
    "security": 0.35,
    "quality": 0.35,
    "performance": 0.30
  }
}
```

## 自定义预设

用户可以在 `.claude/tech-stack.json` 中定义自定义预设：

```json
{
  "quality_thresholds": {
    "preset": "custom",
    "security_min": 88,
    "quality_min": 82,
    "performance_min": 78,
    "overall_min": 82,
    "max_critical_issues": 0,
    "max_high_issues": 1
  },
  "weights": {
    "security": 0.42,
    "quality": 0.33,
    "performance": 0.25
  }
}
```

## 使用指南

### 如何选择预设

```
开始
  |
  v
是否是生产代码？
  |
  +-- 否 --> MVP
  |
  +-- 是 --> 是否涉及敏感数据？
              |
              +-- 是 --> Strict 或行业特化
              |
              +-- 否 --> Standard
```

### 预设升级路径

```
开发阶段    生产阶段    合规阶段
   |           |           |
   v           v           v
  MVP  -->  Standard  --> Strict
```

### 命令行使用

```bash
# 使用 standard (默认)
/helix:code 实现用户列表 API

# 使用 strict
/helix:code --quality-gate strict 实现支付回调处理

# 使用 mvp
/helix:code --quality-gate mvp 实现登录页面原型

# 使用行业预设
/helix:code --quality-gate fintech 实现交易记录查询

# 使用自定义阈值
/helix:code --security-min 92 --quality-min 88 实现敏感操作
```
