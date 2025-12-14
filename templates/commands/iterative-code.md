---
description: 迭代式代码生成，自动循环改进直到达标 (独立使用，不依赖 OpenSpec)
argument-hint: [需求描述]
---

# 迭代式代码生成

执行需求: $ARGUMENTS

---

## ⚠️ MANDATORY EXECUTION RULES (必须严格遵守)

**以下规则必须严格执行，不得跳过或简化。**

### Rule 1: Agent 调用 (MUST)

你**必须**使用 Task tool 调用以下 agents：

```
Task(subagent_type="code-writer", prompt="...")
Task(subagent_type="security-reviewer", prompt="...")
Task(subagent_type="quality-checker", prompt="...")
Task(subagent_type="performance-analyzer", prompt="...")
Task(subagent_type="result-aggregator", prompt="...")
```

### Rule 2: 技术栈检测 (MUST - 在代码生成前执行)

在调用 code-writer 之前，**必须**先检测项目技术栈：

```
# Step 0: 技术栈检测 (MUST)
tech_stack = detect_tech_stack()

检测内容:
1. 检查 package.json / pom.xml / pyproject.toml / go.mod 等
2. 识别语言、框架、版本
3. 读取代码规范配置 (.eslintrc, pylintrc, checkstyle.xml 等)
4. 生成技术栈报告

如果无法检测，必须询问用户:
- 主要编程语言及版本
- 使用的框架
- 代码规范要求
```

### Rule 3: 迭代循环 (MUST)

```
iteration = 0
feedback = ""
tech_stack = detect_tech_stack()  # 必须先检测技术栈

WHILE (NOT PASS AND iteration < 5):
    iteration++

    # Step A: 你必须调用 code-writer，并传递技术栈信息
    code = Task(subagent_type="code-writer", prompt="
        需求: $ARGUMENTS
        技术栈: {tech_stack}
        反馈: {feedback}
    ")

    # Step B: 你必须在【单个消息】中【并行】调用 3 个 reviewer，并传递技术栈
    security = Task(subagent_type="security-reviewer", prompt="... 技术栈: {tech_stack}")
    quality = Task(subagent_type="quality-checker", prompt="... 技术栈: {tech_stack}")
    performance = Task(subagent_type="performance-analyzer", prompt="... 技术栈: {tech_stack}")

    # Step C: 你必须调用 result-aggregator
    result = Task(subagent_type="result-aggregator", prompt="汇总检查结果...")

    # Step D: 根据结果
    IF result == "PASS": BREAK
    IF result == "ITERATE": feedback = result.feedback; 继续循环
    IF result == "STALLED": 请求人工介入; BREAK
```

### Rule 4: 禁止行为 (FORBIDDEN)

- ❌ **禁止**: 不检测技术栈就开始生成代码
- ❌ **禁止**: 直接编写代码而不调用 code-writer
- ❌ **禁止**: 跳过 reviewer 检查
- ❌ **禁止**: 不调用 result-aggregator 就判定通过
- ❌ **禁止**: 逐个调用 reviewer (必须并行)
- ❌ **禁止**: 生成与项目技术栈不兼容的代码

---

## 工作流程

```
┌─────────────────────────────────────────────────┐
│                 迭代式代码生成                    │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ Step 0: 技术栈检测 (MUST)                        │
│ - 检测 package.json / pom.xml / pyproject.toml  │
│ - 识别语言、框架、版本                           │
│ - 读取代码规范配置                               │
│ - 无法检测时询问用户                             │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ Step 1: code-writer 编写初始代码                 │
│ - 理解需求 + 技术栈约束                          │
│ - 生成符合项目规范的代码                         │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ Step 2: 并行质量检查 (3 个 Agent 同时执行)       │
├─────────────┬─────────────┬─────────────────────┤
│ security    │ quality     │ performance         │
│ -reviewer   │ -checker    │ -analyzer           │
└─────────────┴─────────────┴─────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ Step 3: result-aggregator 汇总判定              │
│ - 计算综合评分                                   │
│ - 判断是否达标                                   │
│ - 生成改进反馈                                   │
└─────────────────────────────────────────────────┘
                      ↓
              ┌──────┴──────┐
              ↓             ↓
         [达标]          [未达标]
           ↓               ↓
      输出最终代码    反馈给 code-writer
                          ↓
                    继续迭代...
```

## 执行步骤

### 0. 技术栈检测 (MUST - 最先执行)

在生成任何代码之前，检测项目技术栈：

**检测文件:**
| 文件 | 语言/框架 |
|------|----------|
| `package.json` | JavaScript/TypeScript, Node.js |
| `pom.xml` | Java (Maven) |
| `build.gradle` | Java/Kotlin (Gradle) |
| `pyproject.toml` / `requirements.txt` | Python |
| `go.mod` | Go |
| `Cargo.toml` | Rust |

**输出技术栈报告:**
```json
{
  "language": "TypeScript",
  "framework": "Next.js@14.0.0",
  "build_tool": "npm",
  "test_framework": "Jest",
  "code_style": "ESLint + Prettier",
  "constraints": ["ESM", "React 18", "Node 18+"]
}
```

**如果无法检测，询问用户:**
```
无法自动检测项目技术栈。请提供：
1. 主要编程语言及版本
2. 使用的框架
3. 代码规范要求
```

### 1. 初始代码生成

使用 `code-writer` Agent:
- 输入: 用户需求 "$ARGUMENTS" + **技术栈信息**
- 输出: 符合项目规范的代码实现

### 2. 并行质量检查

**同时启动 3 个检查 Agent:**

1. **security-reviewer**: 安全漏洞检测
   - SQL 注入、XSS、硬编码凭据等

2. **quality-checker**: 代码质量检查
   - 复杂度、命名规范、代码结构等

3. **performance-analyzer**: 性能分析
   - 算法复杂度、N+1 查询、内存使用等

### 3. 结果聚合

使用 `result-aggregator` Agent:
- 汇总所有检查结果
- 计算综合评分
- 判断是否达标
- 生成改进反馈

### 4. 迭代或完成

**如果达标 (PASS):**
- 输出最终代码
- 显示质量报告

**如果未达标 (ITERATE):**
- 将反馈传递给 `code-writer`
- `code-writer` 根据反馈改进代码
- 返回步骤 2 继续检查

## 达标标准

| 维度 | 要求 |
|------|------|
| Critical 问题 | 0 个 |
| High 问题 | ≤ 2 个 |
| 安全评分 | ≥ 85 分 |
| 质量评分 | ≥ 80 分 |
| 性能评分 | ≥ 80 分 |
| 综合评分 | ≥ 80 分 |

## 迭代控制

- **最大迭代次数**: 5 轮
- **停滞检测**: 连续 2 轮进步 < 5 分时提示人工介入
- **提前终止**: 达标后立即停止

## 输出格式

### 成功时
```
✅ 代码生成完成！

## 迭代历程
- 第 1 轮: 综合评分 65 → 发现 3 个问题
- 第 2 轮: 综合评分 82 → 修复 2 个问题
- 第 3 轮: 综合评分 91 → 达标！

## 最终评分
- 安全: 92/100
- 质量: 88/100
- 性能: 95/100
- 综合: 91/100

## 生成的代码文件
- src/controllers/user.py
- src/services/user.py
- src/models/user.py
```

### 达到最大迭代时
```
⚠️ 达到最大迭代次数 (5 轮)

## 当前状态
- 综合评分: 75/100
- 剩余问题: 2 个 High

## 未解决的问题
1. ...
2. ...

## 建议
请人工检查上述问题，或调整需求后重试。
```

## 使用示例

```bash
# 简单功能
/iterative-code 实现一个用户登录 API

# 复杂功能
/iterative-code 实现一个文件上传服务，支持断点续传和进度显示

# 指定要求
/iterative-code 实现一个缓存服务，要求使用 Redis，支持过期时间和 LRU 淘汰
```
