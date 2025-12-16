# Helix

迭代式多代理代码生成框架，专为 Claude Code 设计。通过多个专业 AI 代理协作，自动生成、审查和改进代码。

## 特性

### 核心能力

- **多代理协作** - 11 个专业代理协同工作，覆盖从研究到文档的完整开发流程
- **自动化质量检查** - 安全、代码质量、性能审查并行执行
- **迭代式改进** - 自动迭代直到代码达到质量标准
- **可配置质量门槛** - 支持 strict/standard/mvp 三种预设，可按项目自定义

### 技术栈支持

- **技术栈感知** - 自动检测并缓存，支持多语言和 Monorepo 项目
- **跨平台支持** - 支持 macOS、Linux 和 Windows

### 工作流管理

- **端到端工作流** - `/helix:full-cycle` 从需求到文档的完整流程
- **跨会话恢复** - 从之前的状态恢复中断的工作
- **OpenSpec 集成** - 默认启用，与 OpenSpec 规范管理无缝集成

### 基础设施

- **动态发现** - 代理、命令和技能自动从模板发现
- **类型安全** - 基于 Zod 的所有代理通信验证
- **可观测性** - 内置追踪、结构化日志和指标收集
- **错误恢复** - 重试回退、降级策略和熔断器模式

## 安装

### 从 GitHub 安装

```bash
# 直接从 GitHub 仓库安装
npm install -g github:kingoliang/claudecode-g3

# 或使用完整 URL
npm install -g git+https://github.com/kingoliang/claudecode-g3.git
```

### 在项目中初始化

```bash
cd /path/to/your-project
helix init
```

OpenSpec 集成默认启用。要禁用它：

```bash
helix init --no-openspec
```

### CLI 命令

```bash
# 在当前项目初始化 (默认启用 OpenSpec)
helix init [--no-openspec]

# 检查已安装版本和更新
helix status

# 升级到最新版本
helix upgrade [--force]
```

## 架构

### 工作流架构

```
用户需求
    ↓
┌─────────────────┐
│  /helix:stack   │  ← 加载或检测技术栈 (.claude/tech-stack.json)
└────────┬────────┘
         ↓
┌─────────────────┐
│   code-writer   │  ← 代码生成/改进
└────────┬────────┘
         ↓
┌────────┴────────┐
│    并行 QA      │
├─────────────────┤
│ security-reviewer│  安全漏洞检测
│ quality-checker  │  代码质量审查
│ performance-analyzer │  性能分析
└────────┬────────┘
         ↓
┌─────────────────┐
│ result-aggregator│  ← 结果聚合和判定
└────────┬────────┘
         ↓
    通过? ──是──→ 输出代码
      │
      否
      ↓
    反馈给 code-writer (循环，最多 5 轮)
```

### 端到端工作流

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
│       ↓ (迭代直到通过)                                      │
│  Stage 4: TEST (可选)                                       │
│  ├── /helix:test --coverage <number>                       │
│  └── 输出: 测试套件                                         │
│       ↓                                                     │
│  Stage 5: DOCUMENT (可选)                                   │
│  ├── /helix:document --type all                            │
│  └── 输出: API 文档, README                                 │
│       ↓                                                     │
│  ✓ 完成                                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 命令

### 核心命令

| 命令 | 说明 | 别名 |
|------|------|------|
| `/helix:stack` | 技术栈检测和配置 | tech-stack |
| `/helix:code` | 迭代代码生成 (含质量门槛) | iterative-code |
| `/helix:apply` | OpenSpec 集成实现 | os-apply-iterative |

### 扩展命令

| 命令 | 说明 |
|------|------|
| `/helix:research` | 深度技术调研 |
| `/helix:design` | 架构设计 |
| `/helix:test` | 测试生成 |
| `/helix:document` | 文档生成 |
| `/helix:full-cycle` | 端到端完整工作流 |

### 使用示例

```bash
# 技术栈管理
/helix:stack              # 查看或生成技术栈配置
/helix:stack --refresh    # 强制重新检测

# 迭代代码生成
/helix:code 实现用户登录，支持密码加密和 JWT 令牌生成

# 使用质量门槛
/helix:code --quality-gate strict 实现支付处理模块

# 深度研究
/helix:research --depth deep JWT 认证最佳实践

# 端到端流程
/helix:full-cycle 实现用户认证系统，支持 OAuth 和 JWT

# 快速原型 (MVP 模式)
/helix:full-cycle --quality-gate mvp --skip-test 产品演示页面
```

## 代理

### 代理分类

| 类别 | 代理 | 职责 |
|------|------|------|
| **核心** | code-writer | 根据需求编写代码，根据反馈迭代 |
| | security-reviewer | 检测 OWASP Top 10、认证问题、敏感数据泄露 |
| | quality-checker | 检查代码标准、可维护性、设计模式 |
| | performance-analyzer | 分析算法复杂度、内存使用、查询效率 |
| | result-aggregator | 聚合结果、判定通过/失败、生成反馈 |
| **研究** | deep-researcher | 自主网络研究、多跳推理、自适应规划 |
| **设计** | system-architect | 系统架构设计、技术选型、ADR 生成 |
| **管理** | pm-agent | 模式分析、检查清单、里程碑规划 |
| **领域** | testing-specialist | 测试策略、自动化测试、覆盖率规划 |
| **专业** | code-analyst | 代码质量分析、复杂度评估、技术债务 |
| | knowledge-facilitator | 文档生成、知识转移、最佳实践传播 |

## 质量标准

### 质量门槛预设

| 预设 | 安全最低分 | 质量最低分 | 最大高危问题 | 适用场景 |
|------|-----------|-----------|-------------|----------|
| **strict** | 95 | 90 | 0 | 金融、医疗系统 |
| **standard** | 85 | 80 | 2 | 普通生产系统 (默认) |
| **mvp** | 75 | 70 | 5 | 原型、演示项目 |

### 默认通过阈值

| 维度 | 要求 | 权重 |
|------|------|------|
| 严重问题 | 0 (一票否决) | - |
| 高危问题 | ≤ 2 | - |
| 安全分数 | ≥ 85/100 | 40% |
| 质量分数 | ≥ 80/100 | 35% |
| 性能分数 | ≥ 80/100 | 25% |
| 综合分数 | ≥ 80/100 | - |

### 评分公式

```
安全分数 = 100 - 25×(严重) - 15×(高危) - 5×(中危) - 2×(低危)
质量分数 = 100 - 10×(高危) - 5×(中危) - 2×(低危)
性能分数 = 100 - 15×(高危) - 8×(中危) - 3×(低危)
综合分数 = 安全×权重 + 质量×权重 + 性能×权重
```

### 自定义配置

在 `.claude/tech-stack.json` 中自定义阈值：

```json
{
  "quality_thresholds": {
    "security_min": 85,
    "quality_min": 80,
    "performance_min": 80,
    "overall_min": 80,
    "max_critical_issues": 0,
    "max_high_issues": 2,
    "max_iterations": 5
  },
  "weights": {
    "security": 0.4,
    "quality": 0.35,
    "performance": 0.25
  }
}
```

## 项目结构

```
helix/
├── bin/                    # CLI 可执行文件
│   └── cli.js              # CLI 入口点
├── src/                    # TypeScript 源代码
│   ├── commands/           # CLI 命令
│   ├── schemas/            # Zod Schema 定义
│   ├── observability/      # 可观测性基础设施
│   └── utils/              # 工具模块
├── templates/              # 模板文件 (自动发现)
│   ├── agents/             # 代理定义 (11 个代理)
│   │   ├── code-writer.md
│   │   ├── security-reviewer.md
│   │   ├── quality-checker.md
│   │   ├── performance-analyzer.md
│   │   ├── result-aggregator.md
│   │   ├── deep-researcher.md
│   │   ├── system-architect.md
│   │   ├── pm-agent.md
│   │   ├── testing-specialist.md
│   │   ├── code-analyst.md
│   │   └── knowledge-facilitator.md
│   ├── commands/           # 命令模板
│   │   ├── stack.md            # 技术栈管理
│   │   ├── code.md             # 迭代代码生成
│   │   ├── apply.md            # OpenSpec 集成
│   │   ├── research.md         # 深度研究
│   │   ├── design.md           # 架构设计
│   │   ├── test.md             # 测试生成
│   │   ├── document.md         # 文档生成
│   │   └── full-cycle.md       # 端到端工作流
│   ├── workflows/          # 工作流定义
│   │   ├── quality-gate.md     # 质量门槛系统
│   │   └── cycle-state.md      # 工作流状态管理
│   ├── presets/            # 预设配置
│   │   └── quality-presets.md  # 质量预设
│   └── config/             # 配置文件
│       └── aliases.md          # 命令别名
├── test/                   # 测试套件 (Vitest)
└── package.json            # 包配置
```

## 检查覆盖范围

### 安全检查

- SQL/NoSQL/命令/LDAP/XPath 注入
- 认证和授权缺陷
- 敏感数据暴露 (硬编码凭据、API 密钥)
- XSS 跨站脚本
- 不安全依赖
- OWASP Top 10 全覆盖

### 代码质量检查

- 圈复杂度 (目标 < 10)
- 函数长度 (目标 < 50 行)
- 类长度 (目标 < 300 行)
- 命名规范
- 代码重复
- 错误处理
- 文档完整性

### 性能检查

- 算法复杂度 (Big O 表示法)
- N+1 查询问题
- 数据库索引
- 内存泄漏
- I/O 瓶颈
- 缓存机会

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 运行测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## API

该包导出了一些实用工具供编程使用：

```typescript
import {
  // 命令
  init,
  upgrade,
  status,

  // 模板管理
  copyTemplates,
  checkUpgrade,
  getInstalledVersion,
  FRAMEWORK_VERSION,

  // 发现工具
  discoverAgents,
  discoverCommands,
  discoverSkills,
  groupAgentsByCategory,
  filterAgentsBySource,

  // Schema 和验证
  AggregatorOutputSchema,
  CodeWriterInputSchema,
  safeValidate,
  parseAndValidate,

  // 可观测性
  createTracer,
  createLogger,
  createMetricsCollector,

  // 错误恢复
  withRetry,
  withFallback,
  withTimeout,
  CircuitBreaker,

  // 类型
  type AgentMetadata,
  type AgentCategory,
  type AgentSource,
} from 'helix';
```

## 系统要求

- Node.js >= 20.0.0
- Claude Code CLI
- Claude Opus 模型访问权限
- (可选) OpenSpec 系统

## 更新日志

### v1.0.0

- 初始发布，支持多代理代码生成
- 使用 semver 进行语义版本比较
- 跨平台支持 (macOS, Linux, Windows)
- 代理、命令和技能的动态发现
- 改进的 YAML 解析器，处理边界情况
- 支持依赖注入以提高可测试性
- **类型安全 Schema** - 基于 Zod 验证
- **可观测性基础设施** - 追踪、日志、指标
- **智能迭代策略** - 选择性重新检查
- **增强的停滞检测** - 问题指纹、振荡、回归
- **可靠性特性** - 聚合器验证、错误恢复、检查点
- **默认启用 OpenSpec 集成**
- 重命名为 **Helix**
- **SuperClaude 整合** - 11 个专业代理、端到端工作流、质量门槛系统

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request。

---

*基于 Claude Code 框架构建，通过 AI 多代理协作实现自动化高质量代码生成。*
