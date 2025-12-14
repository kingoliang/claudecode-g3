---
name: tech-stack-detection
description: 动态技术栈检测。在代码生成前自动检测项目语言、框架、依赖版本，确保生成代码符合项目规范。
---

# 技术栈检测技能

在生成任何代码之前，**必须**先检测目标项目的技术栈，确保生成的代码与项目兼容。

## 检测流程

### Step 1: 检测项目类型

按优先级检查以下文件：

| 文件 | 语言/框架 | 检测内容 |
|------|----------|---------|
| `package.json` | JavaScript/TypeScript | dependencies, devDependencies, engines |
| `pom.xml` | Java (Maven) | dependencies, plugins, java.version |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin (Gradle) | dependencies, plugins |
| `requirements.txt` | Python | 依赖列表 |
| `pyproject.toml` | Python (现代) | dependencies, python-requires |
| `setup.py` | Python (传统) | install_requires |
| `go.mod` | Go | module, require |
| `Cargo.toml` | Rust | dependencies |
| `Gemfile` | Ruby | gem 依赖 |
| `composer.json` | PHP | require |
| `*.csproj` | C# (.NET) | PackageReference |

### Step 2: 识别框架

**JavaScript/TypeScript:**
```json
{
  "react": "React 前端框架",
  "vue": "Vue 前端框架",
  "angular": "Angular 前端框架",
  "next": "Next.js 全栈框架",
  "express": "Express 后端框架",
  "nestjs": "NestJS 后端框架",
  "fastify": "Fastify 后端框架"
}
```

**Python:**
```json
{
  "django": "Django Web 框架",
  "flask": "Flask 微框架",
  "fastapi": "FastAPI 异步框架",
  "tornado": "Tornado 异步框架",
  "pytest": "Pytest 测试框架"
}
```

**Java:**
```json
{
  "spring-boot": "Spring Boot 框架",
  "spring-cloud": "Spring Cloud 微服务",
  "mybatis": "MyBatis ORM",
  "hibernate": "Hibernate ORM",
  "junit": "JUnit 测试框架"
}
```

### Step 3: 读取项目配置

检查项目特定配置文件：

- `.editorconfig` - 编辑器配置
- `.eslintrc.*` / `eslint.config.js` - JavaScript 代码规范
- `.prettierrc` - 代码格式化
- `tsconfig.json` - TypeScript 配置
- `pylintrc` / `.flake8` / `pyproject.toml [tool.black]` - Python 代码规范
- `checkstyle.xml` / `pmd.xml` - Java 代码规范

### Step 4: 生成技术栈报告

输出格式：

```json
{
  "language": {
    "name": "TypeScript",
    "version": "5.0"
  },
  "framework": {
    "name": "Next.js",
    "version": "14.0.0"
  },
  "build_tool": {
    "name": "npm",
    "version": "10.x"
  },
  "test_framework": {
    "name": "Jest",
    "version": "29.x"
  },
  "dependencies": {
    "runtime": ["react@18.2.0", "axios@1.6.0"],
    "dev": ["typescript@5.0.0", "eslint@8.0.0"]
  },
  "code_style": {
    "linter": "ESLint",
    "formatter": "Prettier",
    "config_files": [".eslintrc.js", ".prettierrc"]
  },
  "constraints": {
    "node_version": ">=18.0.0",
    "strict_mode": true,
    "module_system": "ESM"
  }
}
```

## 代码生成约束

检测到技术栈后，**必须**遵循以下约束：

### 1. 语言版本约束

| 语言 | 检查项 | 约束 |
|------|--------|------|
| TypeScript | `tsconfig.json` target | 使用对应 ES 版本特性 |
| Python | `python-requires` | 不使用高于指定版本的语法 |
| Java | `java.version` | 不使用高于指定版本的 API |
| Node.js | `engines.node` | 不使用不支持的 Node API |

### 2. 框架约束

- **使用框架推荐的模式** - 如 React Hooks、Vue Composition API
- **遵循框架目录结构** - 如 Next.js 的 `app/` 或 `pages/`
- **使用框架内置功能** - 不引入重复功能的第三方库

### 3. 依赖约束

- **不引入新依赖** - 除非绝对必要且获得确认
- **使用已有依赖的功能** - 如项目已有 lodash，使用 lodash 而非手写
- **版本兼容** - 新依赖必须与现有依赖版本兼容

### 4. 代码风格约束

- **遵循项目 linter 配置** - ESLint、Pylint、Checkstyle 等
- **遵循项目 formatter 配置** - Prettier、Black、Google Java Format 等
- **保持一致性** - 与项目现有代码风格保持一致

## 集成方式

### 在 iterative-code 命令中

```markdown
## Step 0: 技术栈检测 (MUST - 在 code-writer 之前执行)

1. 读取项目根目录的配置文件
2. 生成技术栈报告
3. 将报告传递给 code-writer 的 `tech_stack` 参数
```

### 传递给 code-writer

```json
{
  "requirement": "用户需求",
  "tech_stack": {
    "language": "TypeScript",
    "framework": "Next.js@14.0.0",
    "constraints": ["ESM modules", "React Server Components", "App Router"]
  }
}
```

### 传递给 reviewers

```json
{
  "code": "待检查代码",
  "tech_stack": {
    "language": "Python",
    "framework": "FastAPI@0.100.0",
    "style_guide": "PEP8 + Black"
  }
}
```

## 常见技术栈模板

### Node.js + TypeScript + React

```json
{
  "language": "TypeScript",
  "runtime": "Node.js 18+",
  "framework": "React 18",
  "build": "Vite/Webpack",
  "test": "Jest/Vitest",
  "style": "ESLint + Prettier"
}
```

### Python + FastAPI

```json
{
  "language": "Python 3.10+",
  "framework": "FastAPI",
  "orm": "SQLAlchemy/Tortoise",
  "test": "pytest",
  "style": "Black + isort + mypy"
}
```

### Java + Spring Boot

```json
{
  "language": "Java 17+",
  "framework": "Spring Boot 3.x",
  "build": "Maven/Gradle",
  "orm": "MyBatis/JPA",
  "test": "JUnit 5 + Mockito",
  "style": "Checkstyle/SpotBugs"
}
```

## 错误处理

### 无法检测技术栈

如果无法自动检测，**必须**向用户询问：

```
无法自动检测项目技术栈。请提供以下信息：
1. 主要编程语言及版本
2. 使用的框架
3. 构建工具
4. 是否有特定的代码规范要求
```

### 技术栈冲突

如果检测到冲突（如同时存在多种配置），提示用户确认。

## 重要提示

1. **技术栈检测是强制步骤** - 不能跳过
2. **检测结果必须传递给所有 agents** - code-writer 和所有 reviewers
3. **生成代码必须符合技术栈约束** - 否则视为质量问题
4. **不确定时询问** - 不要假设技术栈
