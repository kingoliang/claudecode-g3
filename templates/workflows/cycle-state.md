---
name: cycle-state
description: 工作流状态管理 - 跟踪和恢复 full-cycle 工作流状态
version: 1.0.0
---

# Cycle State Management

管理 `/helix:full-cycle` 工作流的状态，支持跨阶段数据传递、失败恢复和进度追踪。

## 状态文件位置

```
.claude/
├── cycle-state.json          # 当前活动的工作流状态
├── cycle-history/            # 历史工作流记录
│   ├── cycle_abc123.json
│   └── cycle_def456.json
└── cycle-outputs/            # 各阶段输出
    ├── research/
    ├── design/
    ├── code/
    ├── test/
    └── document/
```

## 状态结构

### CycleState 主结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识，格式: `cycle_<random_id>` |
| `version` | string | 状态 schema 版本 |
| `task` | object | 任务信息（description, created_at, updated_at） |
| `config` | object | 配置（quality_gate, research_depth, coverage_target, skip_stages, max_iterations） |
| `stages` | object | 各阶段状态（research, design, code, test, document） |
| `current_stage` | string | 当前执行阶段 |
| `status` | string | 工作流状态: running / paused / completed / failed |
| `checkpoints` | object | Git 检查点映射（stage -> git tag） |
| `metadata` | object | 元数据（started_at, completed_at, total_duration_seconds, failure_reason） |

### StageState 阶段状态

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | string | pending / running / completed / failed / skipped |
| `started_at` | string | 开始时间 |
| `completed_at` | string | 完成时间 |
| `duration_seconds` | number | 持续时间 |
| `iterations` | number | 迭代次数（仅用于 code 阶段） |
| `output_path` | string | 输出文件路径 |
| `error` | object | 错误信息（message, details, recoverable） |

### 阶段名称

支持的阶段：`research` | `design` | `code` | `test` | `document`

## 状态操作

### 创建新工作流

创建工作流时需执行以下步骤：

1. 生成唯一 ID，格式为 `cycle_<random_id>`
2. 初始化状态结构，包含任务描述和配置
3. 所有阶段初始状态设为 `pending`
4. 工作流状态设为 `running`
5. 记录开始时间
6. 保存状态到 `.claude/cycle-state.json`

**配置默认值**:

| 配置项 | 默认值 |
|--------|--------|
| quality_gate | standard |
| research_depth | standard |
| coverage_target | 80 |
| skip_stages | [] |
| max_iterations | 5 |

### 更新阶段状态

更新阶段状态时需执行以下步骤：

1. 加载当前工作流状态
2. 更新指定阶段的状态字段
3. 更新 `task.updated_at` 时间戳
4. 如果阶段状态变为 `completed`，自动创建 Git 检查点
5. 保存更新后的状态

### 恢复工作流

恢复工作流时需执行以下步骤：

1. 加载指定 cycleId 的工作流状态
2. 如果指定了恢复起点阶段：
   - 回滚到该阶段的 Git 检查点
   - 重置该阶段及后续所有阶段状态为 `pending`
3. 将工作流状态设为 `running`
4. 设置当前阶段为恢复起点或下一个待执行阶段
5. 保存状态

### 完成工作流

完成工作流时需执行以下步骤：

1. 将工作流状态设为 `completed`
2. 清空当前阶段
3. 记录完成时间
4. 计算总持续时间
5. 将状态文件移动到 `.claude/cycle-history/` 目录归档

## 跨阶段数据传递

### 数据流

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  RESEARCH   │────▶│   DESIGN    │────▶│    CODE     │
│             │     │             │     │             │
│ findings    │     │ architecture│     │ files       │
│ risks       │     │ components  │     │ quality     │
│ references  │     │ interfaces  │     │ scores      │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                    ┌─────────────┐     ┌─────────────┐
                    │  DOCUMENT   │◀────│    TEST     │
                    │             │     │             │
                    │ api_docs    │     │ test_files  │
                    │ readme      │     │ coverage    │
                    └─────────────┘     └─────────────┘
```

### 输出文件结构

```
.claude/cycle-outputs/<cycle_id>/
├── research/
│   └── findings.json          # 研究发现
├── design/
│   ├── architecture.json      # 架构设计
│   ├── components.json        # 组件定义
│   └── adrs/                  # 决策记录
│       ├── ADR-001.md
│       └── ADR-002.md
├── code/
│   ├── manifest.json          # 文件清单
│   ├── quality-report.json    # 质量报告
│   └── iterations/            # 迭代历史
│       ├── iteration-1.json
│       └── iteration-2.json
├── test/
│   ├── manifest.json          # 测试文件清单
│   └── coverage-report.json   # 覆盖率报告
└── document/
    └── manifest.json          # 文档清单
```

### 读取上游输出

各阶段输出文件映射规则：

| 阶段 | 读取文件 | 返回内容 |
|------|----------|----------|
| research | `findings.json` | 研究发现 |
| design | `architecture.json`, `components.json` | 架构和组件定义 |
| code | `manifest.json`, `quality-report.json` | 文件清单和质量报告 |
| test | `manifest.json`, `coverage-report.json` | 测试清单和覆盖率报告 |
| document | `manifest.json` | 文档清单 |

读取路径格式：`.claude/cycle-outputs/<cycle_id>/<stage>/`

## Git 检查点

### 创建检查点

阶段完成时创建 Git 检查点的步骤：

1. 生成标签名，格式：`helix/<cycle_id>/<stage>`
2. 暂存所有更改 (`git add -A`)
3. 提交更改，消息格式：`Helix: Complete <stage> stage for <cycle_id>`
4. 创建 Git 标签

### 回滚到检查点

回滚到指定检查点的步骤：

1. 保存当前未提交的更改到 stash，标记为 `helix-rollback-<timestamp>`
2. 硬重置到指定标签 (`git reset --hard <tag>`)

### 清理检查点

清理工作流检查点的步骤：

1. 列出所有匹配 `helix/<cycle_id>/*` 模式的标签
2. 逐个删除这些标签

## 失败恢复

### 失败处理

阶段失败时的处理步骤：

1. 将阶段状态设为 `failed`
2. 记录错误信息（message, details, recoverable）
3. 将工作流状态设为 `failed`
4. 记录失败原因到 `metadata.failure_reason`
5. 保存状态
6. 生成恢复建议

### 恢复建议

根据失败场景生成恢复建议：

| 失败场景 | 恢复建议 |
|----------|----------|
| code 阶段 Quality gate 失败 | 降低质量门槛或手动修复关键问题后重试 |
| test 阶段 Coverage 不足 | 降低覆盖率目标或手动补充测试用例 |
| 其他失败 | 检查错误详情后重试该阶段 |

恢复命令格式：`/helix:full-cycle --resume-from <stage> [options] "<task>"`

## 状态查询

### 列出活动工作流

```bash
# CLI 命令
helix cycle list

# 输出
ID              STATUS    STAGE     TASK
cycle_abc123    running   code      用户认证系统
cycle_def456    paused    design    订单管理模块
```

### 查看工作流详情

```bash
# CLI 命令
helix cycle show cycle_abc123

# 输出
Cycle: cycle_abc123
Task: 用户认证系统
Status: running
Current Stage: code

Stages:
  ✓ research   (completed, 2m 15s)
  ✓ design     (completed, 3m 42s)
  ⟳ code       (running, iteration 2/5)
  ○ test       (pending)
  ○ document   (pending)

Quality Scores:
  Security: 88
  Quality: 82
  Performance: 79

Checkpoints:
  helix/cycle_abc123/research
  helix/cycle_abc123/design
```

## 配置

### 默认配置

```yaml
# .claude/helix-config.yaml
cycle:
  default_quality_gate: standard
  default_research_depth: standard
  default_coverage: 80
  max_iterations: 5
  auto_checkpoint: true
  cleanup_on_complete: false  # 保留检查点
  history_retention_days: 30
```

### 环境变量

```bash
HELIX_QUALITY_GATE=strict
HELIX_RESEARCH_DEPTH=deep
HELIX_COVERAGE=90
HELIX_MAX_ITERATIONS=3
```
