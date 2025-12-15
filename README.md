# Iterative Workflow

Iterative multi-agent code generation framework for Claude Code. Automatically generates, reviews, and improves code through specialized AI agents working in collaboration.

## Features

- **Multi-Agent Collaboration** - 5 specialized agents working together for comprehensive code generation and quality assurance
- **Automated Quality Checks** - Security, code quality, and performance reviews run in parallel
- **Iterative Improvement** - Automatic iteration cycles until code meets quality standards
- **Configurable Quality Thresholds** - Customize scoring thresholds and weights per project
- **Tech Stack Awareness** - Automatic detection with caching, supports multi-language and monorepo projects
- **Version Management** - Semantic versioning with `iterative-workflow status` and `upgrade` commands
- **Cross-Platform Support** - Works on macOS, Linux, and Windows
- **OpenSpec Integration** - Seamless integration with OpenSpec specification management system
- **Cross-Session Recovery** - Resume interrupted work from previous state
- **Dynamic Discovery** - Agents, commands, and skills are auto-discovered from templates

## Installation

```bash
npm install -g iterative-workflow
```

Then initialize in your project:

```bash
cd /path/to/your-project
iterative-workflow init
```

To include OpenSpec integration commands:

```bash
iterative-workflow init --with-openspec
```

### CLI Commands

```bash
# Initialize in current project
iterative-workflow init [--with-openspec]

# Check installed version and updates
iterative-workflow status

# Upgrade to latest version
iterative-workflow upgrade [--force]
```

## Architecture

```
User Requirement
    ↓
┌─────────────────┐
│   /tech-stack   │  ← Load or detect tech stack (.claude/tech-stack.json)
└────────┬────────┘
         ↓
┌─────────────────┐
│   code-writer   │  ← Code generation/improvement
└────────┬────────┘
         ↓
┌────────┴────────┐
│  Parallel QA    │
├─────────────────┤
│ security-reviewer│  Security vulnerability detection
│ quality-checker  │  Code quality review
│ performance-analyzer │  Performance analysis
└────────┬────────┘
         ↓
┌─────────────────┐
│ result-aggregator│  ← Result aggregation and judgment
└────────┬────────┘
         ↓
    Pass? ──Yes──→ Output Code
      │
      No
      ↓
    Feedback to code-writer (loop, max 5 rounds)
```

## Agents

| Agent | Responsibility | Tools |
|-------|----------------|-------|
| `code-writer` | Write code based on requirements, iterate based on feedback | Read, Edit, Write, Grep, Glob, Bash |
| `security-reviewer` | Detect OWASP Top 10, auth issues, sensitive data leaks | Read, Grep, Glob |
| `quality-checker` | Check code standards, maintainability, design patterns | Read, Grep, Glob |
| `performance-analyzer` | Analyze algorithm complexity, memory usage, query efficiency | Read, Grep, Glob, Bash |
| `result-aggregator` | Aggregate results, determine pass/fail, generate feedback | Read |

## Quality Standards

### Default Pass Thresholds

| Dimension | Requirement | Weight |
|-----------|-------------|--------|
| Critical Issues | 0 (veto) | - |
| High Issues | ≤ 2 | - |
| Security Score | ≥ 85/100 | 40% |
| Quality Score | ≥ 80/100 | 35% |
| Performance Score | ≥ 80/100 | 25% |
| Overall Score | ≥ 80/100 | - |

### Configurable Thresholds

Thresholds can be customized in `.claude/tech-stack.json`:

```json
{
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

**Preset Templates:**

```json
// Strict mode (financial/healthcare systems)
"quality_thresholds": {
  "security_min": 95,
  "quality_min": 90,
  "max_high_issues": 0,
  "max_iterations": 10
}

// Relaxed mode (MVP/prototypes)
"quality_thresholds": {
  "security_min": 75,
  "quality_min": 70,
  "max_high_issues": 5,
  "max_iterations": 3
}
```

### Scoring Formula

```
Security Score = 100 - 25×(Critical) - 15×(High) - 5×(Medium) - 2×(Low)
Quality Score = 100 - 10×(High) - 5×(Medium) - 2×(Low)
Performance Score = 100 - 15×(High) - 8×(Medium) - 3×(Low)
Overall Score = Security×weight + Quality×weight + Performance×weight
```

## Usage

### Tech Stack Management

The `/tech-stack` command manages project technology stack configuration:

```bash
# View or generate tech stack config
/tech-stack

# Force re-detection (after project upgrades)
/tech-stack --refresh
```

Tech stack is cached in `.claude/tech-stack.json`:
```json
{
  "version": "1.0.0",
  "detected_at": "2025-01-15T14:30:00Z",
  "source_files": ["package.json", "tsconfig.json"],
  "language": "TypeScript",
  "language_version": "5.0",
  "framework": "Next.js",
  "framework_version": "14.0.0",
  "build_tool": "npm",
  "test_framework": "Jest",
  "code_style": "ESLint + Prettier",
  "constraints": ["ESM", "React 18", "Node 18+"],
  "quality_thresholds": { ... },
  "weights": { ... }
}
```

### Multi-Language / Monorepo Projects

For projects with multiple languages or monorepo structures:

```json
{
  "project_type": "multi-language",
  "primary": {
    "language": "TypeScript",
    "framework": "Next.js",
    "scope": "frontend/*"
  },
  "secondary": [
    {
      "language": "Java",
      "framework": "Spring Boot",
      "scope": "backend/*"
    },
    {
      "language": "Python",
      "scope": "scripts/*"
    }
  ]
}
```

Supported monorepo tools: Turborepo, Nx, Lerna, pnpm workspaces, Rush

### Standalone Usage

```bash
/iterative-code [requirement description]
```

**Example:**
```bash
/iterative-code Implement user login with password encryption and JWT token generation
```

### With OpenSpec Integration

```bash
# 1. Initialize OpenSpec (install base commands)
openspec init

# 2. Create change proposal
/openspec:proposal "Implement user authentication"

# 3. Use iterative implementation
/os-apply-iterative [change-id]
```

## Project Structure

```
iterative-workflow/
├── bin/                    # CLI executables
│   └── cli.js              # CLI entry point
├── src/                    # TypeScript source code
│   ├── commands/           # CLI commands
│   │   ├── init.ts         # Initialize framework
│   │   ├── upgrade.ts      # Upgrade templates
│   │   └── status.ts       # Show version info
│   ├── utils/              # Utility modules
│   │   ├── templates.ts    # Template & version management
│   │   ├── agent-discovery.ts    # Agent metadata parsing
│   │   ├── command-discovery.ts  # Command metadata parsing
│   │   ├── skill-discovery.ts    # Skill metadata parsing
│   │   ├── yaml-parser.ts        # YAML frontmatter parser
│   │   └── version.ts            # Version constant
│   └── index.ts            # Public API exports
├── test/                   # Test suite (Vitest)
│   ├── templates.test.ts
│   ├── agent-discovery.test.ts
│   └── command-discovery.test.ts
├── templates/              # Template files (auto-discovered)
│   ├── agents/             # Agent definitions (5 agents)
│   │   ├── code-writer.md
│   │   ├── security-reviewer.md
│   │   ├── quality-checker.md
│   │   ├── performance-analyzer.md
│   │   └── result-aggregator.md
│   ├── commands/           # Command templates
│   │   ├── tech-stack.md       # Tech stack management
│   │   ├── iterative-code.md   # Standalone iterative code gen
│   │   └── os-apply-iterative.md  # OpenSpec integration (optional)
│   └── skills/             # Skill definitions
│       └── iterative-workflow/
├── scripts/                # Build scripts
│   └── inject-version.js   # Version injection at build time
├── package.json            # Package configuration
├── tsconfig.json           # TypeScript configuration
└── vitest.config.ts        # Test configuration
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint
npm run lint

# Format
npm run format
```

## Check Coverage

### Security Checks
- SQL/NoSQL/Command/LDAP/XPath injection
- Authentication and authorization flaws
- Sensitive data exposure (hardcoded credentials, API keys)
- XSS cross-site scripting
- Insecure dependencies
- OWASP Top 10 full coverage

### Code Quality Checks
- Cyclomatic complexity (target < 10)
- Function length (target < 50 lines)
- Class length (target < 300 lines)
- Naming conventions
- Code duplication
- Error handling
- Documentation completeness

### Performance Checks
- Algorithm complexity (Big O notation)
- N+1 query problems
- Database indexing
- Memory leaks
- I/O bottlenecks
- Caching opportunities

## API

The package exports utilities for programmatic use:

```typescript
import {
  // Commands
  init,
  upgrade,
  status,

  // Template management
  copyTemplates,
  checkUpgrade,
  getInstalledVersion,
  FRAMEWORK_VERSION,

  // Discovery utilities
  discoverAgents,
  discoverCommands,
  discoverSkills,

  // Types
  type AgentMetadata,
  type CommandMetadata,
  type SkillMetadata,
  type UpgradeStatus,
} from 'iterative-workflow';

// Example: Check if upgrade is available
const result = await checkUpgrade('/path/to/project');
if (result.needsUpgrade) {
  console.log(`Upgrade available: ${result.currentVersion} → ${result.availableVersion}`);
  console.log(`Status: ${result.status}`); // 'needs_upgrade' | 'up_to_date' | 'newer_installed'
}

// Example: Initialize with custom target directory
await init({ targetDir: '/path/to/project', withOpenspec: true });
```

## Requirements

- Node.js >= 20.0.0
- Claude Code CLI
- Claude Opus model access
- (Optional) OpenSpec system

## Changelog

### v1.0.0
- Initial release with multi-agent code generation
- Semantic version comparison using semver
- Cross-platform support (macOS, Linux, Windows)
- Dynamic discovery for agents, commands, and skills
- Improved YAML parser with edge case handling
- Dependency injection support for testability

## License

MIT License

## Contributing

Issues and Pull Requests are welcome.

---

*Built on Claude Code framework for automated high-quality code generation through AI multi-agent collaboration.*
