---
description: 检测项目技术栈并生成配置文件
argument-hint: [--refresh] [--preset <name>]
aliases: [tech-stack]
---

# /helix:stack - 技术栈检测

检测当前项目的技术栈并生成 `.claude/tech-stack.json` 配置文件。

---

## 命令参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--refresh` | 强制重新检测（忽略缓存） | `--refresh` |
| `--preset <name>` | 应用质量预设 | `--preset strict` |
| `--show` | 仅显示当前配置，不修改 | `--show` |

## 执行流程

```python
# 1. 检查是否需要重新检测
IF --refresh OR NOT exists('.claude/tech-stack.json'):
    perform_detection()
ELSE:
    load_cached_config()

# 2. 检测逻辑
def perform_detection():
    # 扫描项目文件
    config_files = scan_for_config_files([
        'package.json',      # Node.js/JavaScript/TypeScript
        'tsconfig.json',     # TypeScript
        'pyproject.toml',    # Python
        'requirements.txt',  # Python
        'pom.xml',           # Java Maven
        'build.gradle',      # Java Gradle
        'go.mod',            # Go
        'Cargo.toml',        # Rust
        'composer.json',     # PHP
        'Gemfile',           # Ruby
    ])

    # 检测各项配置
    language = detect_language(config_files)
    framework = detect_framework(config_files)
    build_tool = detect_build_tool(config_files)
    test_framework = detect_test_framework(config_files)
    code_style = detect_code_style(config_files)

    # 检测 monorepo
    monorepo = detect_monorepo()

    # 生成配置
    tech_stack = {
        'version': '1.0.0',
        'detected_at': now(),
        'source_files': config_files,
        'language': language,
        'framework': framework,
        'build_tool': build_tool,
        'test_framework': test_framework,
        'code_style': code_style,
        'monorepo': monorepo,
        'quality_thresholds': get_default_thresholds(),
        'weights': get_default_weights()
    }

    # 应用预设（如果指定）
    IF --preset:
        tech_stack['quality_thresholds'] = load_preset(--preset)

    # 写入文件
    write_json('.claude/tech-stack.json', tech_stack)
```

## 支持的语言和框架

### JavaScript/TypeScript

| 检测条件 | 结果 |
|----------|------|
| `package.json` 存在 | JavaScript |
| `tsconfig.json` 存在 | TypeScript |
| `next.config.*` 存在 | Next.js |
| `nuxt.config.*` 存在 | Nuxt.js |
| `vite.config.*` 存在 | Vite |
| `angular.json` 存在 | Angular |
| `vue.config.*` 存在 | Vue.js |
| `remix.config.*` 存在 | Remix |

### Python

| 检测条件 | 结果 |
|----------|------|
| `pyproject.toml` / `requirements.txt` | Python |
| `django` in dependencies | Django |
| `fastapi` in dependencies | FastAPI |
| `flask` in dependencies | Flask |

### Java

| 检测条件 | 结果 |
|----------|------|
| `pom.xml` 存在 | Java (Maven) |
| `build.gradle` 存在 | Java (Gradle) |
| `spring-boot` in dependencies | Spring Boot |

### Go

| 检测条件 | 结果 |
|----------|------|
| `go.mod` 存在 | Go |
| `gin` in dependencies | Gin |
| `echo` in dependencies | Echo |

### Rust

| 检测条件 | 结果 |
|----------|------|
| `Cargo.toml` 存在 | Rust |
| `actix-web` in dependencies | Actix Web |
| `axum` in dependencies | Axum |

## Monorepo 检测

支持的 Monorepo 工具：

| 工具 | 检测条件 |
|------|----------|
| Turborepo | `turbo.json` 存在 |
| Nx | `nx.json` 存在 |
| Lerna | `lerna.json` 存在 |
| pnpm workspaces | `pnpm-workspace.yaml` 存在 |
| Rush | `rush.json` 存在 |
| Yarn workspaces | `package.json` 中有 `workspaces` |

## 输出格式

`.claude/tech-stack.json` 示例：

```json
{
  "version": "1.0.0",
  "detected_at": "2024-01-15T10:30:00Z",
  "source_files": ["package.json", "tsconfig.json"],

  "language": "TypeScript",
  "language_version": "5.3.0",
  "framework": "Next.js",
  "framework_version": "14.0.4",
  "build_tool": "npm",
  "test_framework": "Jest",
  "code_style": "ESLint + Prettier",

  "constraints": [
    "ESM modules",
    "React 18",
    "Node.js >= 18"
  ],

  "monorepo": {
    "type": "Turborepo",
    "packages": ["apps/*", "packages/*"]
  },

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
    "security": 0.40,
    "quality": 0.35,
    "performance": 0.25
  }
}
```

## 使用示例

```bash
# 首次检测（自动运行）
/helix:stack

# 强制重新检测
/helix:stack --refresh

# 检测并应用严格预设
/helix:stack --preset strict

# 仅查看当前配置
/helix:stack --show

# 检测并应用金融科技预设
/helix:stack --preset fintech
```

## 与其他命令的集成

技术栈配置会被以下命令自动读取：

- `/helix:code` - 根据框架应用最佳实践
- `/helix:design` - 根据技术栈选择架构模式
- `/helix:test` - 根据测试框架生成测试
- `/helix:analyze` - 根据语言选择分析规则

## 向后兼容

此命令是 `/tech-stack` 的升级版本，支持别名：
- `/helix:stack` (推荐)
- `/tech-stack` (向后兼容)
