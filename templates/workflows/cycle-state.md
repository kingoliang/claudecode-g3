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

## 状态 Schema

```typescript
interface CycleState {
  // 唯一标识
  id: string;                    // 格式: cycle_<random_id>
  version: string;               // 状态 schema 版本

  // 任务信息
  task: {
    description: string;         // 原始需求描述
    created_at: string;          // ISO 8601 时间戳
    updated_at: string;
  };

  // 配置
  config: {
    quality_gate: 'strict' | 'standard' | 'mvp';
    research_depth: 'quick' | 'standard' | 'deep' | 'exhaustive';
    coverage_target: number;
    skip_stages: string[];       // 跳过的阶段
    max_iterations: number;      // 代码迭代最大次数
  };

  // 阶段状态
  stages: {
    research: StageState;
    design: StageState;
    code: StageState;
    test: StageState;
    document: StageState;
  };

  // 当前状态
  current_stage: StageName | null;
  status: 'running' | 'paused' | 'completed' | 'failed';

  // Git 检查点
  checkpoints: {
    [stage: string]: string;     // stage -> git tag
  };

  // 元数据
  metadata: {
    started_at: string;
    completed_at?: string;
    total_duration_seconds?: number;
    failure_reason?: string;
  };
}

interface StageState {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  iterations?: number;           // 仅用于 code 阶段
  output_path?: string;          // 输出文件路径
  error?: {
    message: string;
    details: any;
    recoverable: boolean;
  };
}

type StageName = 'research' | 'design' | 'code' | 'test' | 'document';
```

## 状态操作

### 创建新工作流

```typescript
async function createCycle(task: string, config: CycleConfig): Promise<CycleState> {
  const id = `cycle_${generateId()}`;

  const state: CycleState = {
    id,
    version: '1.0.0',
    task: {
      description: task,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    config: {
      quality_gate: config.qualityGate || 'standard',
      research_depth: config.researchDepth || 'standard',
      coverage_target: config.coverage || 80,
      skip_stages: config.skipStages || [],
      max_iterations: config.maxIterations || 5,
    },
    stages: {
      research: { status: 'pending' },
      design: { status: 'pending' },
      code: { status: 'pending' },
      test: { status: 'pending' },
      document: { status: 'pending' },
    },
    current_stage: null,
    status: 'running',
    checkpoints: {},
    metadata: {
      started_at: new Date().toISOString(),
    },
  };

  await saveState(state);
  return state;
}
```

### 更新阶段状态

```typescript
async function updateStage(
  cycleId: string,
  stage: StageName,
  update: Partial<StageState>
): Promise<CycleState> {
  const state = await loadState(cycleId);

  state.stages[stage] = {
    ...state.stages[stage],
    ...update,
  };

  state.task.updated_at = new Date().toISOString();

  // 如果阶段完成，创建 Git 检查点
  if (update.status === 'completed') {
    const tag = await createCheckpoint(cycleId, stage);
    state.checkpoints[stage] = tag;
  }

  await saveState(state);
  return state;
}
```

### 恢复工作流

```typescript
async function resumeCycle(
  cycleId: string,
  fromStage?: StageName
): Promise<CycleState> {
  const state = await loadState(cycleId);

  if (fromStage) {
    // 回滚到指定阶段
    const checkpoint = state.checkpoints[fromStage];
    if (checkpoint) {
      await gitReset(checkpoint);
    }

    // 重置后续阶段状态
    const stages: StageName[] = ['research', 'design', 'code', 'test', 'document'];
    const startIndex = stages.indexOf(fromStage);

    for (let i = startIndex; i < stages.length; i++) {
      state.stages[stages[i]] = { status: 'pending' };
    }
  }

  state.status = 'running';
  state.current_stage = fromStage || findNextStage(state);

  await saveState(state);
  return state;
}
```

### 完成工作流

```typescript
async function completeCycle(cycleId: string): Promise<CycleState> {
  const state = await loadState(cycleId);

  state.status = 'completed';
  state.current_stage = null;
  state.metadata.completed_at = new Date().toISOString();
  state.metadata.total_duration_seconds = calculateDuration(
    state.metadata.started_at,
    state.metadata.completed_at
  );

  // 移动到历史目录
  await archiveState(state);

  return state;
}
```

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

```typescript
async function getStageOutput(cycleId: string, stage: StageName): Promise<any> {
  const outputPath = `.claude/cycle-outputs/${cycleId}/${stage}/`;

  switch (stage) {
    case 'research':
      return await readJson(`${outputPath}/findings.json`);
    case 'design':
      return {
        architecture: await readJson(`${outputPath}/architecture.json`),
        components: await readJson(`${outputPath}/components.json`),
      };
    case 'code':
      return {
        manifest: await readJson(`${outputPath}/manifest.json`),
        quality: await readJson(`${outputPath}/quality-report.json`),
      };
    case 'test':
      return {
        manifest: await readJson(`${outputPath}/manifest.json`),
        coverage: await readJson(`${outputPath}/coverage-report.json`),
      };
    case 'document':
      return await readJson(`${outputPath}/manifest.json`);
    default:
      throw new Error(`Unknown stage: ${stage}`);
  }
}
```

## Git 检查点

### 创建检查点

```typescript
async function createCheckpoint(cycleId: string, stage: StageName): Promise<string> {
  const tag = `helix/${cycleId}/${stage}`;

  // 提交当前更改
  await exec(`git add -A`);
  await exec(`git commit -m "Helix: Complete ${stage} stage for ${cycleId}" --allow-empty`);

  // 创建标签
  await exec(`git tag ${tag}`);

  return tag;
}
```

### 回滚到检查点

```typescript
async function rollbackToCheckpoint(tag: string): Promise<void> {
  // 保存当前未提交的更改
  await exec(`git stash push -m "helix-rollback-${Date.now()}"`);

  // 回滚到检查点
  await exec(`git reset --hard ${tag}`);
}
```

### 清理检查点

```typescript
async function cleanupCheckpoints(cycleId: string): Promise<void> {
  const tags = await exec(`git tag -l "helix/${cycleId}/*"`);

  for (const tag of tags.split('\n')) {
    if (tag.trim()) {
      await exec(`git tag -d ${tag.trim()}`);
    }
  }
}
```

## 失败恢复

### 失败处理

```typescript
async function handleFailure(
  cycleId: string,
  stage: StageName,
  error: Error
): Promise<CycleState> {
  const state = await loadState(cycleId);

  state.stages[stage] = {
    ...state.stages[stage],
    status: 'failed',
    error: {
      message: error.message,
      details: error.stack,
      recoverable: isRecoverable(error),
    },
  };

  state.status = 'failed';
  state.metadata.failure_reason = `Stage ${stage} failed: ${error.message}`;

  await saveState(state);

  // 生成恢复建议
  const recovery = generateRecoverySuggestion(state, stage, error);

  return { ...state, recovery };
}
```

### 恢复建议

```typescript
function generateRecoverySuggestion(
  state: CycleState,
  failedStage: StageName,
  error: Error
): RecoverySuggestion {
  if (failedStage === 'code' && error.message.includes('Quality gate')) {
    return {
      command: `/helix:full-cycle --resume-from code --quality-gate mvp "${state.task.description}"`,
      suggestion: '考虑降低质量门槛或手动修复关键问题后重试',
    };
  }

  if (failedStage === 'test' && error.message.includes('Coverage')) {
    return {
      command: `/helix:full-cycle --resume-from test --coverage ${state.config.coverage_target - 10}`,
      suggestion: '降低覆盖率目标或手动补充测试用例',
    };
  }

  return {
    command: `/helix:full-cycle --resume-from ${failedStage} "${state.task.description}"`,
    suggestion: '检查错误详情后重试该阶段',
  };
}
```

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
