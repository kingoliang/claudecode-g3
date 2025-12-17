---
name: full-cycle
description: 端到端开发工作流命令 - 从研究到文档的完整流程
version: 1.0.0
aliases: [e2e, complete]
agents: [deep-researcher, system-architect, pm-agent, code-writer, security-reviewer, quality-checker, performance-analyzer, result-aggregator, testing-specialist, knowledge-facilitator]
namespace: helix
---

# /helix:full-cycle 命令

执行从需求分析到文档生成的完整开发工作流，自动编排所有 Helix 命令和代理。

## 使用方法

```bash
/helix:full-cycle [需求描述]

# 参数选项
--skip-research              # 跳过研究阶段
--skip-design                # 跳过设计阶段
--skip-test                  # 跳过测试阶段
--skip-document              # 跳过文档阶段
--resume-from <stage>        # 从指定阶段恢复
--quality-gate <level>       # 质量门槛 (strict|standard|mvp)
--research-depth <depth>     # 研究深度 (quick|standard|deep)
--coverage <number>          # 测试覆盖率目标
--save-state                 # 保存工作流状态
--dry-run                    # 预览工作流，不执行
```

## 示例

```bash
# 完整流程
/helix:full-cycle 实现用户认证系统，支持 OAuth 和 JWT

# 跳过研究，直接设计实现
/helix:full-cycle --skip-research 添加购物车功能

# 高质量要求
/helix:full-cycle --quality-gate strict --coverage 95 支付处理模块

# 从设计阶段恢复
/helix:full-cycle --resume-from design 用户管理系统

# MVP 快速原型
/helix:full-cycle --quality-gate mvp --skip-test 产品演示页面
```

## 工作流阶段

```
┌─────────────────────────────────────────────────────────────┐
│                    /helix:full-cycle                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Stage 1: RESEARCH (可选)                                   │
│  ├── /helix:research --depth <depth>                       │
│  └── 输出: 技术调研报告                                      │
│       ↓                                                     │
│  Stage 2: DESIGN                                            │
│  ├── /helix:design --scope full                            │
│  └── 输出: 架构设计文档, ADR                                 │
│       ↓                                                     │
│  Stage 3: CODE                                              │
│  ├── /helix:code --quality-gate <level>                    │
│  └── 输出: 质量达标代码                                      │
│       ↓ (迭代直到 PASS)                                     │
│  Stage 4: TEST (可选)                                       │
│  ├── /helix:test --coverage <number>                       │
│  └── 输出: 测试套件                                         │
│       ↓                                                     │
│  Stage 5: DOCUMENT (可选)                                   │
│  ├── /helix:document --type all                            │
│  └── 输出: API 文档, README                                 │
│       ↓                                                     │
│  ✓ COMPLETE                                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 阶段详情

### Stage 1: RESEARCH (研究)

**触发条件**: 未指定 `--skip-research`

**执行内容**:
- 技术方案调研
- 最佳实践收集
- 潜在风险识别
- 依赖评估

**代理**: `deep-researcher`

**输出**:
```json
{
  "research": {
    "findings": [...],
    "recommendations": [...],
    "risks": [...],
    "references": [...]
  }
}
```

### Stage 2: DESIGN (设计)

**触发条件**: 始终执行

**执行内容**:
- 系统架构设计
- 组件划分
- 接口定义
- 技术选型
- ADR 生成

**代理**: `system-architect`, `pm-agent`

**输出**:
```json
{
  "design": {
    "architecture": {...},
    "components": [...],
    "interfaces": [...],
    "adrs": [...],
    "checklist": [...]
  }
}
```

### Stage 3: CODE (编码)

**触发条件**: 始终执行

**执行内容**:
- 代码生成
- 安全审查
- 质量检查
- 性能分析
- 迭代改进

**代理**: `code-writer`, `security-reviewer`, `quality-checker`, `performance-analyzer`, `result-aggregator`

**迭代逻辑**:

循环执行直到满足以下任一条件：
- 质量评分达标（所有维度通过）
- 达到最大迭代次数

每轮迭代步骤：
1. 生成/改进代码
2. 并行运行 3 个 reviewer
3. 如果通过则结束循环
4. 否则根据反馈改进代码

**输出**:
```json
{
  "code": {
    "files_created": [...],
    "files_modified": [...],
    "quality_scores": {
      "security": 92,
      "quality": 88,
      "performance": 85
    },
    "iterations": 2
  }
}
```

### Stage 4: TEST (测试)

**触发条件**: 未指定 `--skip-test`

**执行内容**:
- 测试用例设计
- 测试代码生成
- 测试执行
- 覆盖率报告

**代理**: `testing-specialist`, `code-writer`

**输出**:
```json
{
  "tests": {
    "test_files": [...],
    "coverage": {
      "lines": 85,
      "branches": 80,
      "functions": 90
    },
    "results": {
      "passed": 45,
      "failed": 0,
      "skipped": 2
    }
  }
}
```

### Stage 5: DOCUMENT (文档)

**触发条件**: 未指定 `--skip-document`

**执行内容**:
- API 文档生成
- README 更新
- 架构文档归档
- 变更日志更新

**代理**: `knowledge-facilitator`, `quality-checker` (analysis 模式)

**输出**:
```json
{
  "documentation": {
    "files_generated": [...],
    "api_endpoints_documented": 12,
    "word_count": 5000
  }
}
```

## 状态管理

### 保存状态

```bash
/helix:full-cycle --save-state 用户认证系统
```

状态文件保存到 `.claude/cycle-state.json`:

```json
{
  "id": "cycle_abc123",
  "task": "用户认证系统",
  "current_stage": "code",
  "completed_stages": ["research", "design"],
  "stage_outputs": {
    "research": {...},
    "design": {...}
  },
  "config": {
    "quality_gate": "standard",
    "coverage": 80
  },
  "started_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T11:30:00Z"
}
```

### 恢复执行

```bash
/helix:full-cycle --resume-from code 用户认证系统
```

从保存的状态继续执行，跳过已完成的阶段。

## 失败处理

### 阶段失败

如果某个阶段失败，工作流会:

1. 保存当前状态
2. 输出失败详情
3. 提供恢复建议

```json
{
  "status": "failed",
  "failed_stage": "code",
  "error": "Quality gate not met after 5 iterations",
  "recovery": {
    "command": "/helix:full-cycle --resume-from code --quality-gate mvp",
    "suggestion": "考虑降低质量门槛或手动修复关键问题"
  }
}
```

### 回滚机制

支持 Git 检查点回滚:

```bash
# 工作流自动创建检查点
git tag helix/cycle_abc123/design  # 设计完成后
git tag helix/cycle_abc123/code    # 编码完成后

# 手动回滚
git reset --hard helix/cycle_abc123/design
```

## 与其他命令的关系

`/helix:full-cycle` 是以下命令的编排器:

| 阶段 | 命令 | 说明 |
|------|------|------|
| research | `/helix:research` | 深度技术调研 |
| design | `/helix:design` | 架构设计 |
| code | `/helix:code` | 迭代代码生成 |
| test | `/helix:test` | 测试生成 |
| document | `/helix:document` | 文档生成 |

## 完整输出示例

```json
{
  "cycle_id": "cycle_abc123",
  "task": "用户认证系统",
  "status": "completed",
  "stages": {
    "research": {
      "status": "completed",
      "duration_seconds": 120,
      "output": {...}
    },
    "design": {
      "status": "completed",
      "duration_seconds": 180,
      "output": {...}
    },
    "code": {
      "status": "completed",
      "duration_seconds": 600,
      "iterations": 2,
      "output": {...}
    },
    "test": {
      "status": "completed",
      "duration_seconds": 300,
      "output": {...}
    },
    "document": {
      "status": "completed",
      "duration_seconds": 150,
      "output": {...}
    }
  },
  "summary": {
    "total_duration_seconds": 1350,
    "files_created": 15,
    "files_modified": 3,
    "tests_generated": 45,
    "coverage": 85,
    "quality_scores": {
      "security": 92,
      "quality": 88,
      "performance": 85
    }
  },
  "artifacts": {
    "design_doc": ".claude/designs/auth-system.md",
    "api_doc": "docs/api/auth.md",
    "test_report": "coverage/index.html"
  }
}
```

## 最佳实践

1. **首次使用**: 完整流程，不跳过任何阶段
2. **快速迭代**: `--skip-research --skip-document`
3. **高质量需求**: `--quality-gate strict --coverage 95`
4. **原型开发**: `--quality-gate mvp --skip-test`
5. **恢复工作**: `--resume-from <stage> --save-state`
