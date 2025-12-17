---
name: aliases
description: 命令别名配置 - 支持向后兼容和自定义别名
version: 1.0.0
---

# 命令别名系统

本文档定义了 Helix 框架的命令别名映射，支持向后兼容和用户自定义。

## 默认别名映射

### 核心命令

| 新命令 (推荐) | 旧命令 (兼容) | 说明 |
|---------------|---------------|------|
| `/helix:code` | `/iterative-code` | 迭代式代码生成 |
| `/helix:stack` | `/tech-stack` | 技术栈检测 |
| `/helix:apply` | `/os-apply-iterative` | OpenSpec 集成 |

### 新增命令 (无旧别名)

| 命令 | 说明 |
|------|------|
| `/helix:research` | 深度研究 |
| `/helix:design` | 架构设计 |
| `/helix:analyze` | 代码分析 |
| `/helix:improve` | 代码优化 |
| `/helix:test` | 测试生成 |
| `/helix:document` | 文档生成 |
| `/helix:brainstorm` | 需求细化 |
| `/helix:full-cycle` | 端到端工作流 |

## 别名解析规则

### 解析顺序

按以下优先级解析命令别名：

1. **检查 /helix: 前缀命令** - 如果命令以 `helix:` 开头，直接映射到对应的命令模板
2. **检查用户自定义别名** - 查找 `.claude/config/aliases.json` 中的自定义映射
3. **检查默认别名映射** - 使用系统内置的向后兼容映射
4. **直接查找命令文件** - 尝试直接匹配命令名称

## 用户自定义别名

用户可以在 `.claude/config/aliases.json` 中定义自定义别名：

```json
{
  "version": "1.0.0",
  "aliases": {
    "c": "helix:code",
    "s": "helix:stack",
    "r": "helix:research",
    "d": "helix:design",
    "t": "helix:test",
    "fc": "helix:full-cycle",

    "impl": "helix:code",
    "detect": "helix:stack",
    "arch": "helix:design",
    "docs": "helix:document"
  }
}
```

### 使用自定义别名

```bash
# 使用短别名
/c 实现用户登录  # 等同于 /helix:code

# 使用语义别名
/impl 实现用户登录  # 等同于 /helix:code
/arch 设计订单系统  # 等同于 /helix:design
```

## 别名优先级

当存在冲突时，按以下优先级解析：

1. **用户自定义别名** (最高优先级)
2. **默认别名映射**
3. **直接文件名匹配** (最低优先级)

## 别名管理命令

### 查看所有别名

```bash
/helix:aliases --list
```

输出：
```
## 命令别名列表

### 系统别名
/iterative-code → /helix:code
/tech-stack → /helix:stack
/os-apply-iterative → /helix:apply

### 用户自定义别名
/c → /helix:code
/s → /helix:stack
/impl → /helix:code
```

### 添加别名

```bash
/helix:aliases --add mycode helix:code
```

### 删除别名

```bash
/helix:aliases --remove mycode
```

### 重置为默认

```bash
/helix:aliases --reset
```

## 向后兼容保证

为确保现有脚本和工作流不受影响：

1. **旧命令永远有效**：`/iterative-code` 将始终被支持
2. **行为完全一致**：别名只是名称映射，功能完全相同
3. **参数传递**：所有参数原样传递给目标命令

## 弃用警告

当使用旧命令时，会显示弃用警告（可配置关闭）：

```
⚠️ 命令 /iterative-code 已弃用，请使用 /helix:code
   此警告可通过 --no-deprecation-warning 关闭
```

关闭弃用警告：

```json
// .claude/config/aliases.json
{
  "show_deprecation_warnings": false
}
```

## 命令补全

支持命令自动补全：

```bash
/helix:<Tab>
# 显示：code, stack, apply, research, design, analyze, improve, test, document, brainstorm, full-cycle

/helix:c<Tab>
# 自动补全为：/helix:code
```

## 最佳实践

1. **新项目使用 /helix: 前缀**：保持命名一致性
2. **为常用命令设置短别名**：提高输入效率
3. **团队统一别名配置**：将 `aliases.json` 加入版本控制
4. **避免与系统命令冲突**：不要使用 `git`, `npm` 等作为别名
