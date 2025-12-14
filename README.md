# Iterative Workflow

Iterative multi-agent code generation framework for Claude Code. Automatically generates, reviews, and improves code through specialized AI agents working in collaboration.

## Features

- **Multi-Agent Collaboration** - 5 specialized agents working together for comprehensive code generation and quality assurance
- **Automated Quality Checks** - Security, code quality, and performance reviews run in parallel
- **Iterative Improvement** - Up to 5 automatic iteration cycles until code meets quality standards
- **Tech Stack Management** - Automatic detection with caching via `/tech-stack` command
- **OpenSpec Integration** - Seamless integration with OpenSpec specification management system
- **Cross-Session Recovery** - Resume interrupted work from previous state

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

### Pass Thresholds

| Dimension | Requirement | Weight |
|-----------|-------------|--------|
| Critical Issues | 0 (veto) | - |
| High Issues | ≤ 2 | - |
| Security Score | ≥ 85/100 | 40% |
| Quality Score | ≥ 80/100 | 35% |
| Performance Score | ≥ 80/100 | 25% |
| Overall Score | ≥ 80/100 | - |

### Scoring Formula

```
Security Score = 100 - 25×(Critical) - 15×(High) - 5×(Medium) - 2×(Low)
Quality Score = 100 - 10×(High) - 5×(Medium) - 2×(Low)
Performance Score = 100 - 15×(High) - 8×(Medium) - 3×(Low)
Overall Score = Security×0.4 + Quality×0.35 + Performance×0.25
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
  "detected_at": "2025-01-15T14:30:00Z",
  "source_files": ["package.json", "tsconfig.json"],
  "language": "TypeScript",
  "language_version": "5.0",
  "framework": "Next.js",
  "framework_version": "14.0.0",
  "build_tool": "npm",
  "test_framework": "Jest",
  "code_style": "ESLint + Prettier",
  "constraints": ["ESM", "React 18", "Node 18+"]
}
```

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
│   │   └── init.ts         # Init command
│   ├── utils/              # Utility modules
│   │   ├── tech-stack.ts   # Tech stack detection
│   │   └── templates.ts    # Template management
│   └── index.ts            # Main exports
├── test/                   # Test suite
│   ├── tech-stack.test.ts  # Tech stack tests
│   └── templates.test.ts   # Template tests
├── templates/              # Template files
│   ├── agents/             # Agent definitions (5 agents)
│   │   ├── code-writer.md
│   │   ├── security-reviewer.md
│   │   ├── quality-checker.md
│   │   ├── performance-analyzer.md
│   │   └── result-aggregator.md
│   ├── commands/           # Command templates (3 commands)
│   │   ├── tech-stack.md       # Tech stack management
│   │   ├── iterative-code.md   # Standalone iterative code gen
│   │   └── os-apply-iterative.md  # OpenSpec integration
│   └── skills/             # Skill definitions
│       └── iterative-workflow/
├── scripts/                # Build scripts
├── .github/                # GitHub workflows
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

## Requirements

- Node.js >= 20.0.0
- Claude Code CLI
- Claude Opus model access
- (Optional) OpenSpec system

## License

MIT License

## Contributing

Issues and Pull Requests are welcome.

---

*Built on Claude Code framework for automated high-quality code generation through AI multi-agent collaboration.*
