---
description: 检测并管理项目技术栈配置，生成 .claude/tech-stack.json
argument-hint: [--refresh]
---

# 技术栈管理

参数: $ARGUMENTS

---

## 功能

管理项目技术栈配置文件 `.claude/tech-stack.json`。

## 执行逻辑

```
IF $ARGUMENTS 包含 "--refresh":
    强制重新检测，覆盖已有配置
ELSE IF .claude/tech-stack.json 存在:
    读取并显示当前配置
ELSE:
    检测项目技术栈
    生成 .claude/tech-stack.json
    显示检测结果
```

## 检测流程

### 1. 查找项目配置文件

按优先级检测以下文件：

| 文件 | 语言/框架 |
|------|----------|
| `package.json` | JavaScript/TypeScript, Node.js |
| `pom.xml` | Java (Maven) |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin (Gradle) |
| `pyproject.toml` | Python (Poetry/PDM) |
| `requirements.txt` / `setup.py` | Python (pip) |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `composer.json` | PHP |
| `Gemfile` | Ruby |

### 2. 提取技术栈信息

从配置文件中提取：
- **语言**: 主要编程语言
- **语言版本**: 如 TypeScript 5.0, Python 3.11
- **框架**: 如 Next.js, FastAPI, Spring Boot
- **框架版本**: 如 14.0.0, 0.100.0
- **构建工具**: npm, maven, gradle, pip
- **测试框架**: Jest, pytest, JUnit
- **代码规范**: ESLint, Prettier, Black, Checkstyle

### 3. 读取代码规范配置

检测以下配置文件：
- `.eslintrc.*` / `eslint.config.*`
- `.prettierrc.*`
- `tsconfig.json`
- `pyproject.toml` (tool.black, tool.isort, tool.mypy)
- `checkstyle.xml`
- `.editorconfig`

### 4. 生成技术栈文件

**文件路径**: `.claude/tech-stack.json`

**文件格式**:
```json
{
  "version": "1.0.0",
  "detected_at": "2025-01-15T14:30:00Z",
  "source_files": ["package.json", "tsconfig.json", ".eslintrc.js"],

  "language": "TypeScript",
  "language_version": "5.0",
  "framework": "Next.js",
  "framework_version": "14.0.0",
  "build_tool": "npm",
  "test_framework": "Jest",
  "code_style": "ESLint + Prettier",
  "constraints": [
    "ESM modules",
    "React 18",
    "Node 18+",
    "Strict TypeScript"
  ],

  "quality_thresholds": {
    "security_min": 85,
    "quality_min": 80,
    "performance_min": 80,
    "overall_min": 80,
    "max_critical_issues": 0,
    "max_high_issues": 2,
    "max_iterations": 5,
    "stall_threshold": 5,
    "stall_rounds": 2
  },

  "weights": {
    "security": 0.4,
    "quality": 0.35,
    "performance": 0.25
  }
}
```

### 5. 质量阈值配置说明

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `security_min` | 85 | 安全评分最低阈值 |
| `quality_min` | 80 | 质量评分最低阈值 |
| `performance_min` | 80 | 性能评分最低阈值 |
| `overall_min` | 80 | 综合评分最低阈值 |
| `max_critical_issues` | 0 | 允许的最大 Critical 问题数 |
| `max_high_issues` | 2 | 允许的最大 High 问题数 |
| `max_iterations` | 5 | 每个任务最大迭代次数 |
| `stall_threshold` | 5 | 进步判定阈值（分数） |
| `stall_rounds` | 2 | 连续多少轮进步不足视为停滞 |

**预设配置模板**:

```json
// 严格模式（金融/医疗系统）
"quality_thresholds": {
  "security_min": 95,
  "quality_min": 90,
  "performance_min": 85,
  "overall_min": 90,
  "max_critical_issues": 0,
  "max_high_issues": 0,
  "max_iterations": 10
}

// 宽松模式（MVP/原型）
"quality_thresholds": {
  "security_min": 75,
  "quality_min": 70,
  "performance_min": 70,
  "overall_min": 70,
  "max_critical_issues": 0,
  "max_high_issues": 5,
  "max_iterations": 3
}
```

## 输出格式

### 已有配置时
```
✅ 技术栈配置 (.claude/tech-stack.json)

Language:    TypeScript 5.0
Framework:   Next.js 14.0.0
Build Tool:  npm
Test:        Jest
Code Style:  ESLint + Prettier
Constraints: ESM modules, React 18, Node 18+

检测时间: 2025-01-15 14:30

💡 重新检测: /tech-stack --refresh
💡 手动编辑: 直接修改 .claude/tech-stack.json
```

### 新检测时
```
📝 正在检测项目技术栈...

发现配置文件:
  - package.json
  - tsconfig.json
  - .eslintrc.js

✅ 技术栈配置已保存到 .claude/tech-stack.json

Language:    TypeScript 5.0
Framework:   Next.js 14.0.0
Build Tool:  npm
Test:        Jest
Code Style:  ESLint + Prettier
Constraints: ESM modules, React 18, Node 18+
```

### 无法检测时
```
⚠️ 无法自动检测项目技术栈

未找到以下配置文件:
  - package.json
  - pom.xml
  - pyproject.toml
  - go.mod
  - ...

请手动创建 .claude/tech-stack.json 或提供以下信息:
1. 主要编程语言及版本
2. 使用的框架及版本
3. 代码规范要求
```

## 使用示例

```bash
# 检查/生成技术栈（首次运行会自动检测）
/tech-stack

# 强制重新检测（项目升级后使用）
/tech-stack --refresh

# 查看帮助
/tech-stack --help
```

## 与其他命令的关系

| 命令 | 调用方式 |
|------|---------|
| `/iterative-code` | Step 0 自动调用 `/tech-stack` |
| `/os-apply-iterative` | Step 0 自动调用 `/tech-stack` |

这些命令在开始时会检查 `.claude/tech-stack.json` 是否存在：
- **存在** → 直接读取使用
- **不存在** → 自动调用 `/tech-stack` 生成

## 文件管理

| 操作 | 方法 |
|------|------|
| 查看当前配置 | `/tech-stack` |
| 重新检测 | `/tech-stack --refresh` |
| 手动修改 | 直接编辑 `.claude/tech-stack.json` |
| 删除缓存 | `rm .claude/tech-stack.json` |

## 版本控制建议

建议将 `.claude/tech-stack.json` 提交到 Git，这样：
- 团队成员共享相同的技术栈配置
- 避免每个人重复检测
- 确保配置一致性

---

## 多语言/Monorepo 项目支持

### 检测策略

当发现多个配置文件时（如同时存在 `package.json` 和 `pom.xml`），使用以下策略：

1. **根目录优先**: 根目录的配置文件优先级最高
2. **主语言识别**: 根据代码量或项目结构确定主语言
3. **分区配置**: 不同目录可能使用不同技术栈

### 多语言项目配置格式

```json
{
  "version": "1.0.0",
  "detected_at": "2025-01-15T14:30:00Z",
  "project_type": "multi-language",
  "source_files": ["package.json", "pom.xml", "pyproject.toml"],

  "primary": {
    "language": "TypeScript",
    "language_version": "5.0",
    "framework": "Next.js",
    "framework_version": "14.0.0",
    "build_tool": "npm",
    "test_framework": "Jest",
    "code_style": "ESLint + Prettier",
    "constraints": ["ESM modules", "React 18"],
    "scope": "frontend/*"
  },

  "secondary": [
    {
      "language": "Java",
      "language_version": "17",
      "framework": "Spring Boot",
      "framework_version": "3.2.0",
      "build_tool": "Maven",
      "test_framework": "JUnit 5",
      "code_style": "Checkstyle",
      "constraints": ["Java 17 features"],
      "scope": "backend/*"
    },
    {
      "language": "Python",
      "language_version": "3.11",
      "framework": null,
      "build_tool": "pip",
      "test_framework": "pytest",
      "code_style": "Black + isort",
      "constraints": ["Type hints required"],
      "scope": "scripts/*"
    }
  ],

  "quality_thresholds": { ... },
  "weights": { ... }
}
```

### Monorepo 结构支持

对于常见的 Monorepo 结构（Turborepo, Nx, Lerna）：

```json
{
  "version": "1.0.0",
  "project_type": "monorepo",
  "monorepo_tool": "Turborepo",
  "source_files": ["package.json", "turbo.json"],

  "workspace_config": {
    "root": {
      "language": "TypeScript",
      "build_tool": "npm",
      "code_style": "ESLint + Prettier"
    },
    "packages": {
      "apps/web": {
        "language": "TypeScript",
        "framework": "Next.js",
        "framework_version": "14.0.0"
      },
      "apps/api": {
        "language": "TypeScript",
        "framework": "Express",
        "framework_version": "4.18.0"
      },
      "packages/ui": {
        "language": "TypeScript",
        "framework": "React",
        "constraints": ["No framework-specific code"]
      },
      "packages/shared": {
        "language": "TypeScript",
        "constraints": ["Pure functions only", "No side effects"]
      }
    }
  },

  "quality_thresholds": { ... },
  "weights": { ... }
}
```

### 检测多语言项目的逻辑

```python
def detect_multi_language_project(root_dir):
    config_files = find_all_config_files(root_dir)

    # 单语言项目
    if len(config_files) == 1:
        return detect_single_language(config_files[0])

    # 检测 Monorepo
    if is_monorepo(root_dir):
        return detect_monorepo(root_dir)

    # 多语言项目
    languages = []
    for config_file in config_files:
        lang_info = extract_language_info(config_file)
        lang_info["scope"] = infer_scope(config_file, root_dir)
        languages.append(lang_info)

    # 确定主语言（按代码量或目录深度）
    primary = determine_primary_language(languages)
    secondary = [l for l in languages if l != primary]

    return {
        "project_type": "multi-language",
        "primary": primary,
        "secondary": secondary
    }

def is_monorepo(root_dir):
    """检测是否为 Monorepo"""
    indicators = [
        "turbo.json",           # Turborepo
        "nx.json",              # Nx
        "lerna.json",           # Lerna
        "pnpm-workspace.yaml",  # pnpm workspace
        "rush.json",            # Rush
    ]
    for indicator in indicators:
        if exists(join(root_dir, indicator)):
            return True

    # 检查 package.json 中的 workspaces 字段
    pkg_json = read_json(join(root_dir, "package.json"))
    if pkg_json and "workspaces" in pkg_json:
        return True

    return False
```

### 多语言项目中的 Agent 行为

当使用多语言项目配置时，Agents 会：

1. **code-writer**:
   - 根据文件路径确定使用哪个技术栈
   - 生成代码时遵循对应的语言规范

2. **security-reviewer**:
   - 对每种语言应用对应的安全检查规则
   - OWASP 检查根据语言调整

3. **quality-checker**:
   - 应用对应语言的代码质量标准
   - 复杂度阈值可能因语言而异

4. **performance-analyzer**:
   - 根据语言和框架应用特定的性能检查

### 使用示例

```bash
# 检测多语言项目
/tech-stack

# 输出示例
📝 正在检测项目技术栈...

发现多语言项目:
  - TypeScript (frontend/*)
  - Java (backend/*)
  - Python (scripts/*)

主语言: TypeScript (Next.js 14.0.0)

✅ 技术栈配置已保存到 .claude/tech-stack.json

💡 查看完整配置: cat .claude/tech-stack.json
💡 手动调整分区: 编辑 tech-stack.json 中的 scope 字段
```

### 手动指定作用域

如果自动检测的 `scope` 不准确，可以手动编辑：

```json
{
  "primary": {
    "language": "TypeScript",
    "scope": "src/frontend/**"  // 使用 glob 模式
  },
  "secondary": [
    {
      "language": "Python",
      "scope": "src/ml/**,scripts/**"  // 多个路径用逗号分隔
    }
  ]
}
```

### 冲突检测

当同一文件路径匹配多个技术栈时，按以下优先级处理：

1. 最具体的 `scope` 匹配
2. `primary` 优先于 `secondary`
3. `secondary` 按数组顺序匹配
