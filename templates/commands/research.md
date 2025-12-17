---
description: 深度研究命令 - 自主网络研究、多跳推理、自适应规划
argument-hint: <topic> [--depth <level>] [--output <format>] [--save]
---

# /helix:research - 深度研究

执行深度研究，自主收集和综合信息。

研究主题: $ARGUMENTS

---

## 命令参数

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `topic` | 研究主题（必填） | - | `"React Server Components"` |
| `--depth <level>` | 研究深度 | `standard` | `--depth deep` |
| `--output <format>` | 输出格式 | `markdown` | `--output json` |
| `--save` | 保存研究结果 | `false` | `--save` |
| `--continue` | 继续上次研究 | `false` | `--continue` |
| `--questions <list>` | 具体问题 | - | `--questions "性能,兼容性"` |

### 研究深度级别

| 级别 | 来源数 | 搜索轮数 | 适用场景 |
|------|--------|----------|----------|
| `quick` | 5-10 | 1-2 | 快速了解，事实确认 |
| `standard` | 15-20 | 2-3 | 一般调研，技术选型 |
| `deep` | 25-35 | 3-4 | 深入分析，竞品研究 |
| `exhaustive` | 40+ | 4-5 | 学术研究，关键决策 |

## 执行流程

### Step 0: 加载上下文

加载项目技术栈和已有知识作为研究上下文。

### Step 1: 规划研究

根据以下参数创建研究计划：
- 研究主题
- 研究深度（默认 `standard`）
- 项目上下文
- 具体问题列表

### Step 2: 调用 deep-researcher 代理

使用 Task 工具调用 `deep-researcher` 代理，传入：
- topic: 研究主题
- depth: 研究深度
- strategy: full-research
- context: 项目上下文
- specific_questions: 具体问题列表

### Step 3: 处理输出

| 输出格式 | 处理方式 |
|----------|----------|
| `markdown`（默认） | 格式化为 Markdown 报告 |
| `json` | 格式化为 JSON 结构 |

### Step 4: 保存结果

如果指定了 `--save` 参数，将研究结果保存到 `.claude/research/{topic-slug}/` 目录

## 研究结果存储

当使用 `--save` 参数时，研究结果保存到：

```
.claude/research/
├── {topic-slug}/
│   ├── report.md           # 研究报告
│   ├── sources.json        # 来源列表
│   ├── findings.json       # 结构化发现
│   └── metadata.json       # 元数据
```

### metadata.json 格式

```json
{
  "topic": "React Server Components",
  "depth": "deep",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T14:45:00Z",
  "confidence": 85,
  "source_count": 32,
  "search_rounds": 4
}
```

## 使用示例

### 基本使用

```bash
# 标准深度研究
/helix:research React Server Components

# 快速了解
/helix:research --depth quick GraphQL vs REST

# 深度研究
/helix:research --depth deep "微服务架构最佳实践"
```

### 带问题的研究

```bash
# 指定具体问题
/helix:research "Next.js 14" --questions "性能优化,SEO,部署方案"

# 技术选型研究
/helix:research "状态管理库选型" --questions "Redux vs Zustand vs Jotai"
```

### 保存和继续

```bash
# 保存研究结果
/helix:research "Kubernetes 安全" --depth deep --save

# 继续上次研究
/helix:research "Kubernetes 安全" --continue
```

### 输出格式

```bash
# Markdown 格式（默认）
/helix:research "WebAssembly 应用场景"

# JSON 格式
/helix:research "WebAssembly 应用场景" --output json
```

## 输出格式

### Markdown 报告

```markdown
# 研究报告: React Server Components

**研究深度**: standard
**置信度**: 87%
**来源数量**: 18

## 执行摘要

React Server Components (RSC) 是 React 18 引入的新范式，允许在服务端
渲染组件并仅发送 HTML 到客户端。主要优势包括：减少客户端 JavaScript
体积、改善首屏加载性能、简化数据获取逻辑。

## 主要发现

### 1. 性能优势

RSC 可减少高达 50% 的客户端 JavaScript 体积，通过在服务端执行组件
逻辑并流式传输 HTML...

**来源**:
- React 官方文档
- Vercel 技术博客

### 2. 使用限制

RSC 不支持：useState、useEffect 等客户端 hooks；事件处理；
浏览器 API...

**来源**:
- React RFC #188
- Next.js 文档

## 建议与行动项

| 优先级 | 行动 | 理由 |
|--------|------|------|
| 高 | 评估迁移 ROI | 大型应用可获得显著性能提升 |
| 中 | 小范围试点 | 从低风险页面开始 |

## 后续问题

1. 如何与现有状态管理库集成？
2. 缓存策略如何配置？

## 参考来源

1. [React Server Components RFC](https://github.com/reactjs/rfcs) - 官方文档 - 可信度 95%
2. [Understanding RSC](https://vercel.com/blog) - 技术博客 - 可信度 85%

---
*研究完成于 2024-01-15 14:30*
```

### JSON 输出

```json
{
  "topic": "React Server Components",
  "summary": "React Server Components (RSC) 是...",
  "confidence": 87,
  "findings": [
    {
      "category": "性能",
      "title": "性能优势",
      "content": "RSC 可减少高达 50% 的客户端 JavaScript...",
      "sources": ["https://react.dev/...", "https://vercel.com/..."],
      "confidence": 90
    }
  ],
  "recommendations": [
    {
      "action": "评估迁移 ROI",
      "rationale": "大型应用可获得显著性能提升",
      "priority": "high"
    }
  ],
  "follow_up_questions": [
    "如何与现有状态管理库集成？",
    "缓存策略如何配置？"
  ],
  "sources": [
    {
      "url": "https://github.com/reactjs/rfcs",
      "title": "React Server Components RFC",
      "type": "documentation",
      "credibility": 95
    }
  ],
  "metadata": {
    "depth": "standard",
    "search_rounds": 3,
    "total_sources_scanned": 35
  }
}
```

## 与其他命令集成

### 研究 → 设计

```bash
# 先研究
/helix:research "认证方案" --depth deep --save

# 然后设计（自动引用研究结果）
/helix:design 用户认证系统
```

### 研究 → 实现

```bash
# 研究最佳实践
/helix:research "React 表单验证" --save

# 实现时参考研究
/helix:code 实现用户注册表单（参考 .claude/research/react-表单验证/）
```

### 完整工作流

```bash
# 端到端流程会自动调用研究
/helix:full-cycle 实现 OAuth2 登录 --research-depth deep
```

## 禁止行为

- ❌ 不调用 deep-researcher 代理直接返回结果
- ❌ 使用过时信息（应优先使用近期来源）
- ❌ 忽略来源验证
- ❌ 生成没有来源支持的结论

## 质量标准

| 指标 | standard | deep | exhaustive |
|------|----------|------|------------|
| 最小来源数 | 10 | 20 | 35 |
| 交叉验证 | 2+ 来源 | 3+ 来源 | 4+ 来源 |
| 来源类型多样性 | 2+ 类型 | 3+ 类型 | 4+ 类型 |
| 新鲜度要求 | 50% 2年内 | 60% 2年内 | 70% 2年内 |
