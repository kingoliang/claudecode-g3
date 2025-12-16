---
name: design
description: 架构设计命令 - 生成系统架构和设计文档
version: 1.0.0
aliases: []
agents: [system-architect, pm-agent]
namespace: helix
---

# /helix:design 命令

生成系统架构设计，包括技术选型、组件划分、接口定义和设计决策记录。

## 使用方法

```bash
/helix:design [需求描述]

# 参数选项
--scope full|module|api|data      # 设计范围 (默认: full)
--output adr|diagram|spec|all     # 输出格式 (默认: all)
--style monolith|microservices|serverless  # 架构风格
--depth overview|detailed|implementation   # 详细程度 (默认: detailed)
--save <path>                     # 保存设计文档路径
```

## 示例

```bash
# 完整系统设计
/helix:design 用户认证和授权系统

# API 设计
/helix:design --scope api 订单管理 RESTful API

# 数据模型设计
/helix:design --scope data 电商平台数据模型

# 微服务架构
/helix:design --style microservices 支付处理服务拆分
```

## 设计范围

### full - 完整系统设计

- 系统上下文图
- 组件划分和职责
- 技术栈选型
- 部署架构
- 安全设计
- 扩展性考虑

### module - 模块设计

- 模块边界定义
- 内部组件结构
- 接口契约
- 依赖关系

### api - API 设计

- 端点定义
- 请求/响应格式
- 认证授权
- 错误处理
- 版本策略

### data - 数据设计

- 数据模型 (ERD)
- 表结构定义
- 索引策略
- 数据迁移计划

## 输出格式

### adr - 架构决策记录

```markdown
# ADR-001: [决策标题]

## 状态
[Proposed | Accepted | Deprecated | Superseded]

## 上下文
[问题背景和需求]

## 决策
[选择的方案]

## 理由
[为什么选择这个方案]

## 后果
[正面和负面影响]

## 替代方案
[考虑过的其他方案]
```

### diagram - 架构图

- C4 模型图 (Context, Container, Component)
- 时序图
- 数据流图
- 部署图

### spec - 技术规格

- 详细接口定义
- 数据结构
- 配置规格
- 性能要求

## 执行流程

```
1. 需求分析
   ├── 识别核心需求
   ├── 识别非功能需求
   └── 识别约束条件

2. 调用 system-architect 代理
   ├── 技术栈评估
   ├── 架构模式选择
   └── 组件划分

3. 调用 pm-agent 代理
   ├── 风险分析
   ├── 检查清单生成
   └── 里程碑规划

4. 生成设计文档
   ├── 架构决策记录 (ADR)
   ├── 架构图
   └── 技术规格

5. 设计审查
   ├── 安全审查
   ├── 可扩展性审查
   └── 可维护性审查
```

## 与其他命令协作

- **前置**: `/helix:research` (技术调研)
- **后续**: `/helix:code` (代码实现)
- **相关**: `/helix:document` (文档生成)

## 输出示例

```json
{
  "design": {
    "title": "用户认证系统设计",
    "scope": "full",
    "architecture_style": "monolith",
    "components": [
      {
        "name": "AuthService",
        "responsibility": "处理认证逻辑",
        "interfaces": ["login", "logout", "refresh"]
      }
    ],
    "tech_stack": {
      "backend": "Node.js + Express",
      "database": "PostgreSQL",
      "cache": "Redis",
      "auth": "JWT + bcrypt"
    },
    "adrs": [
      {
        "id": "ADR-001",
        "title": "选择 JWT 作为认证机制",
        "status": "Accepted"
      }
    ],
    "diagrams": [
      {
        "type": "c4_container",
        "path": ".claude/designs/auth-system-c4.md"
      }
    ]
  },
  "checklist": [
    "实现密码哈希 (bcrypt)",
    "配置 JWT 密钥轮换",
    "实现 Rate Limiting",
    "添加审计日志"
  ],
  "risks": [
    {
      "risk": "Token 泄露",
      "mitigation": "短期 Token + Refresh Token 机制",
      "priority": "high"
    }
  ]
}
```
