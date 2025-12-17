---
name: document
description: 文档生成命令 - 生成技术文档和 API 文档
version: 1.0.0
aliases: []
agents: [knowledge-facilitator, quality-checker]
namespace: helix
---

# /helix:document 命令

为代码库生成全面的技术文档，包括 API 文档、架构文档、操作手册等。

## 使用方法

```bash
/helix:document [目标]

# 参数选项
--type api|architecture|readme|changelog|runbook|all  # 文档类型 (默认: api)
--format markdown|html|openapi                        # 输出格式 (默认: markdown)
--audience developer|operator|end-user|all           # 目标受众 (默认: developer)
--output <path>                                       # 输出目录 (默认: docs/)
--lang zh|en|both                                     # 语言 (默认: zh)
```

## 示例

```bash
# 生成 API 文档
/helix:document --type api src/api/

# 生成 README
/helix:document --type readme

# 生成架构文档
/helix:document --type architecture --format html

# 生成运维手册
/helix:document --type runbook --audience operator

# 生成 OpenAPI 规格
/helix:document --type api --format openapi src/routes/
```

## 文档类型

### api - API 文档

```markdown
# API Reference

## 用户服务

### POST /api/users

创建新用户。

**请求体**:
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| name | string | 是 | 用户名称 |
| email | string | 是 | 邮箱地址 |

**响应**:
| 状态码 | 描述 |
|--------|------|
| 201 | 创建成功 |
| 400 | 参数错误 |
| 409 | 邮箱已存在 |

**示例**:
```json
{
  "name": "John",
  "email": "john@example.com"
}
```
```

### architecture - 架构文档

```markdown
# 系统架构

## 概述
[系统简介和设计目标]

## 架构图
[C4 模型图]

## 组件说明
[各组件职责和交互]

## 数据流
[数据流转说明]

## 部署架构
[部署拓扑和基础设施]
```

### readme - README 文档

```markdown
# 项目名称

简短描述。

## 功能特性
- 特性 1
- 特性 2

## 快速开始

### 安装
```bash
npm install
```

### 配置
[配置说明]

### 运行
```bash
npm start
```

## 开发指南
[开发说明]

## 贡献指南
[贡献流程]

## 许可证
[许可证信息]
```

### changelog - 变更日志

```markdown
# Changelog

## [1.2.0] - 2024-01-15

### Added
- 新增用户认证功能

### Changed
- 优化数据库查询性能

### Fixed
- 修复登录超时问题

### Security
- 更新依赖修复安全漏洞
```

### runbook - 操作手册

```markdown
# 运维手册

## 部署流程
1. 前置检查
2. 部署步骤
3. 验证步骤
4. 回滚步骤

## 故障处理
### 问题: 服务无响应
**症状**: ...
**诊断**: ...
**解决**: ...

## 监控告警
[告警规则和响应]

## 定期维护
[维护任务清单]
```

## 执行流程

```
1. 代码分析
   ├── 扫描源文件
   ├── 提取注释和文档字符串
   ├── 识别 API 端点
   └── 分析代码结构

2. 调用 quality-checker 代理 (analysis 模式)
   ├── 代码结构分析
   ├── 依赖关系分析
   └── 复杂度评估

3. 调用 knowledge-facilitator 代理
   ├── 文档模板选择
   ├── 内容生成
   └── 格式化输出

4. 文档验证
   ├── 链接检查
   ├── 代码示例验证
   └── 格式一致性检查

5. 输出生成
   ├── 写入文档文件
   ├── 生成索引
   └── 更新导航
```

## 与其他命令协作

- **前置**: `/helix:code` (代码实现), `/helix:test` (测试生成)
- **相关**: `/helix:design` (设计文档)
- **工作流**: `/helix:full-cycle` (完整流程)

## 输出示例

```json
{
  "documentation": {
    "type": "api",
    "format": "markdown",
    "target": "src/api/",
    "output": "docs/api/",
    "files_generated": [
      {
        "path": "docs/api/users.md",
        "endpoints": 5,
        "word_count": 1200
      },
      {
        "path": "docs/api/orders.md",
        "endpoints": 8,
        "word_count": 1800
      }
    ],
    "statistics": {
      "total_endpoints": 13,
      "documented_endpoints": 13,
      "code_examples": 26,
      "total_word_count": 3000
    }
  },
  "quality": {
    "completeness": 100,
    "accuracy": 95,
    "readability": 88,
    "formatting": 92
  },
  "recommendations": [
    {
      "type": "enhancement",
      "description": "建议添加更多错误响应示例"
    },
    {
      "type": "missing",
      "description": "缺少认证流程说明"
    }
  ]
}
```

## 文档质量标准

| 指标 | 良好 | 警告 | 不足 |
|------|------|------|------|
| 完整性 | >= 90% | 70-90% | < 70% |
| 准确性 | >= 95% | 85-95% | < 85% |
| 可读性 | >= 85 | 70-85 | < 70 |
| 代码示例 | 每端点 >= 2 | 1 | 0 |

## 自动更新

支持通过 Git Hook 自动更新文档:

```bash
# pre-commit hook
/helix:document --type api --output docs/api/

# 检查文档是否需要更新
git diff --name-only | grep -E '\.(ts|js|py)$' && /helix:document --check
```
