# 迭代式多 Agent 代码生成框架

一个基于 Claude Code 的智能代码生成和质量保证框架，通过多个专业化 Agent 协作，实现代码的自动生成、审查和迭代改进。

## 特性

- **多 Agent 协作** - 5 个专业化 Agent 协同工作，覆盖代码生成和质量保证全流程
- **自动化质量检查** - 安全、代码质量、性能三维度并行审查
- **迭代式改进** - 最多 5 轮自动迭代，直到代码达到质量标准
- **OpenSpec 集成** - 与 OpenSpec 规范管理系统无缝集成
- **跨会话恢复** - 支持中断后从上次状态继续

## 架构概览

```
用户需求
    ↓
┌─────────────────┐
│   code-writer   │  ← 代码生成/改进
└────────┬────────┘
         ↓
┌────────┴────────┐
│   并行质量检查   │
├─────────────────┤
│ security-reviewer│  安全漏洞检测
│ quality-checker  │  代码质量审查
│ performance-analyzer │  性能分析
└────────┬────────┘
         ↓
┌─────────────────┐
│ result-aggregator│  ← 结果聚合与判定
└────────┬────────┘
         ↓
    通过? ──是──→ 输出代码
      │
      否
      ↓
    反馈至 code-writer (循环，最多5轮)
```

## Agent 说明

| Agent | 职责 | 工具 |
|-------|------|------|
| `code-writer` | 根据需求编写代码，接收反馈后迭代改进 | Read, Edit, Write, Grep, Glob, Bash |
| `security-reviewer` | 检测 OWASP Top 10、认证授权、敏感信息泄露等安全漏洞 | Read, Grep, Glob |
| `quality-checker` | 检查代码规范、可维护性、设计模式、命名规范 | Read, Grep, Glob |
| `performance-analyzer` | 分析算法复杂度、内存使用、数据库查询效率、潜在瓶颈 | Read, Grep, Glob, Bash |
| `result-aggregator` | 汇总所有检查结果，判定是否达标，生成改进反馈 | Read |

## 质量标准

### 通过阈值

| 维度 | 要求 | 权重 |
|------|------|------|
| 关键问题 | 0 个（一票否决） | - |
| 高危问题 | ≤ 2 个 | - |
| 安全分数 | ≥ 85/100 | 40% |
| 质量分数 | ≥ 80/100 | 35% |
| 性能分数 | ≥ 80/100 | 25% |
| 综合分数 | ≥ 80/100 | - |

### 评分公式

```
安全分数 = 100 - 25×(Critical) - 15×(High) - 5×(Medium) - 2×(Low)
质量分数 = 100 - 10×(High) - 5×(Medium) - 2×(Low)
性能分数 = 100 - 15×(High) - 8×(Medium) - 3×(Low)
综合分数 = 安全×0.4 + 质量×0.35 + 性能×0.25
```

## 使用方法

### 独立使用

```bash
/iterative-code [需求描述]
```

直接启动迭代式代码生成，无需 OpenSpec 集成。

**示例：**
```bash
/iterative-code 实现一个用户登录功能，包含密码加密和JWT token生成
```

### 与 OpenSpec 集成

需要先初始化 OpenSpec 系统：

```bash
# 1. 初始化 OpenSpec（安装基础命令）
openspec init

# 2. 创建变更提案
/openspec:proposal "实现用户认证功能"

# 3. 使用迭代式实现（本项目提供的增强功能）
/os-apply-iterative [change-id]
```

`/os-apply-iterative` 是对标准 `/openspec:apply` 的增强，增加了多 Agent 质量保证循环。

**示例：**
```bash
/os-apply-iterative user-auth-001
```

## 检查覆盖范围

### 安全检查

- SQL/NoSQL/命令/LDAP/XPath 注入
- 认证与授权缺陷
- 敏感数据暴露（硬编码凭据、API 密钥）
- XSS 跨站脚本攻击
- 不安全的依赖项
- OWASP Top 10 全覆盖

### 代码质量检查

- 圈复杂度（目标 < 10）
- 函数长度（目标 < 50 行）
- 类长度（目标 < 300 行）
- 命名规范
- 代码重复
- 错误处理
- 文档完整性

### 性能检查

- 算法复杂度（O 表示法）
- N+1 查询问题
- 数据库索引
- 内存泄漏
- I/O 瓶颈
- 缓存优化机会

## 项目结构

```
.claude/
├── agents/                    # Agent 定义
│   ├── code-writer.md         # 代码编写 Agent
│   ├── security-reviewer.md   # 安全审查 Agent
│   ├── quality-checker.md     # 质量检查 Agent
│   ├── performance-analyzer.md# 性能分析 Agent
│   └── result-aggregator.md   # 结果聚合 Agent
├── commands/                  # 自定义命令
│   ├── iterative-code.md      # 独立迭代命令
│   └── os-apply-iterative.md  # OpenSpec 集成命令
└── skills/                    # 技能定义
    └── iterative-workflow/
        └── SKILL.md           # 迭代工作流技能
```

> **注意**: OpenSpec 基础命令（`/openspec:proposal`, `/openspec:apply`, `/openspec:archive`）由 OpenSpec 系统通过 `openspec init` 提供，不包含在本项目中。

## 工作流程详解

### 1. 初始化

- 解析用户需求或 OpenSpec 规范
- 创建任务列表

### 2. 代码生成

- `code-writer` Agent 根据需求生成初始代码
- 或根据反馈改进现有代码

### 3. 并行审查

三个审查 Agent **同时**执行（单条消息中并行调用）：

- `security-reviewer` - 安全漏洞扫描
- `quality-checker` - 代码质量评估
- `performance-analyzer` - 性能问题检测

### 4. 结果聚合

- `result-aggregator` 汇总所有审查结果
- 计算各维度分数和综合分数
- 判定是否通过

### 5. 迭代决策

- **通过**: 输出最终代码，任务完成
- **未通过**: 生成改进反馈，返回步骤 2
- **停滞**: 连续 2 轮改进 < 5 分，请求人工介入

### 6. 终止条件

- 达到质量标准
- 达到最大迭代次数（5 轮）
- 检测到停滞状态

## 配置要求

- Claude Code CLI
- Claude Opus 模型访问权限
- （可选）OpenSpec 系统

## 最佳实践

1. **明确需求** - 提供清晰、具体的需求描述
2. **分解任务** - 复杂功能拆分为多个小任务
3. **关注反馈** - 查看每轮迭代的改进建议
4. **及时干预** - 停滞时提供人工指导

## 故障排除

### 迭代次数过多

- 检查需求是否过于复杂
- 考虑拆分为更小的任务

### 安全分数持续低

- 审查生成代码的安全模式
- 提供更明确的安全要求

### 性能分数不达标

- 明确性能约束（如响应时间要求）
- 提供数据规模预估

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request。

---

*本项目基于 Claude Code 框架构建，旨在通过 AI 多 Agent 协作实现高质量代码的自动化生成。*
