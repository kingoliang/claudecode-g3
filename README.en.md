# Helix

Iterative multi-agent code generation framework for Claude Code. Automatically generates, reviews, and improves code through specialized AI agents working in collaboration.

## Features

### Core Capabilities

- **Multi-Agent Collaboration** - 11 specialized agents working together, covering the complete development workflow from research to documentation
- **Automated Quality Checks** - Security, code quality, and performance reviews run in parallel
- **Iterative Improvement** - Automatic iteration cycles until code meets quality standards
- **Configurable Quality Thresholds** - Supports strict/standard/mvp presets, customizable per project

### Tech Stack Support

- **Tech Stack Awareness** - Automatic detection with caching, supports multi-language and monorepo projects
- **Cross-Platform Support** - Works on macOS, Linux, and Windows

### Workflow Management

- **End-to-End Workflow** - `/helix:full-cycle` for complete flow from requirements to documentation
- **Cross-Session Recovery** - Resume interrupted work from previous state
- **OpenSpec Integration** - Enabled by default, seamless integration with OpenSpec specification management

### Infrastructure

- **Dynamic Discovery** - Agents, commands, and skills are auto-discovered from templates
- **Type-Safe Schemas** - Zod-based validation for all agent communication
- **Observability** - Built-in tracing, structured logging, and metrics collection
- **Error Recovery** - Retry with backoff, fallback strategies, and circuit breaker patterns

## Installation

### Install from GitHub

```bash
# Install directly from GitHub repository
npm install -g github:kingoliang/claudecode-g3

# Or use full URL
npm install -g git+https://github.com/kingoliang/claudecode-g3.git
```

### Initialize in your project

```bash
cd /path/to/your-project
helix init
```

OpenSpec integration is enabled by default. To disable it:

```bash
helix init --no-openspec
```

### CLI Commands

```bash
# Initialize in current project (OpenSpec enabled by default)
helix init [--no-openspec]

# Check installed version and updates
helix status

# Upgrade to latest version
helix upgrade [--force]
```

## Architecture

### Workflow Architecture

```
User Requirement
    ↓
┌─────────────────┐
│  /helix:stack   │  ← Load or detect tech stack (.claude/tech-stack.json)
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

### End-to-End Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    /helix:full-cycle                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Stage 1: RESEARCH (optional)                               │
│  ├── /helix:research --depth <depth>                       │
│  └── Output: Technical research report                      │
│       ↓                                                     │
│  Stage 2: DESIGN                                            │
│  ├── /helix:design --scope full                            │
│  └── Output: Architecture design docs, ADR                  │
│       ↓                                                     │
│  Stage 3: CODE                                              │
│  ├── /helix:code --quality-gate <level>                    │
│  └── Output: Quality-compliant code                         │
│       ↓ (iterate until pass)                                │
│  Stage 4: TEST (optional)                                   │
│  ├── /helix:test --coverage <number>                       │
│  └── Output: Test suite                                     │
│       ↓                                                     │
│  Stage 5: DOCUMENT (optional)                               │
│  ├── /helix:document --type all                            │
│  └── Output: API docs, README                               │
│       ↓                                                     │
│  ✓ Complete                                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Commands

### Core Commands

| Command | Description | Alias |
|---------|-------------|-------|
| `/helix:stack` | Tech stack detection and configuration | tech-stack |
| `/helix:code` | Iterative code generation (with quality gate) | iterative-code |
| `/helix:apply` | OpenSpec integration implementation | os-apply-iterative |

### Extended Commands

| Command | Description |
|---------|-------------|
| `/helix:research` | Deep technical research |
| `/helix:design` | Architecture design |
| `/helix:test` | Test generation |
| `/helix:document` | Documentation generation |
| `/helix:full-cycle` | End-to-end complete workflow |

### Usage Examples

```bash
# Tech stack management
/helix:stack              # View or generate tech stack config
/helix:stack --refresh    # Force re-detection

# Iterative code generation
/helix:code Implement user login with password encryption and JWT token generation

# Using quality gates
/helix:code --quality-gate strict Implement payment processing module

# Deep research
/helix:research --depth deep JWT authentication best practices

# End-to-end flow
/helix:full-cycle Implement user authentication system with OAuth and JWT support

# Quick prototype (MVP mode)
/helix:full-cycle --quality-gate mvp --skip-test Product demo page
```

## Agents

### Agent Categories

| Category | Agent | Responsibility |
|----------|-------|----------------|
| **Core** | code-writer | Write code based on requirements, iterate based on feedback |
| | security-reviewer | Detect OWASP Top 10, auth issues, sensitive data leaks |
| | quality-checker | Check code standards, maintainability, design patterns |
| | performance-analyzer | Analyze algorithm complexity, memory usage, query efficiency |
| | result-aggregator | Aggregate results, determine pass/fail, generate feedback |
| **Research** | deep-researcher | Autonomous web research, multi-hop reasoning, adaptive planning |
| **Design** | system-architect | System architecture design, technology selection, ADR generation |
| **Management** | pm-agent | Pattern analysis, checklists, milestone planning |
| **Domain** | testing-specialist | Test strategy, automated testing, coverage planning |
| **Specialized** | code-analyst | Code quality analysis, complexity assessment, technical debt |
| | knowledge-facilitator | Documentation generation, knowledge transfer, best practices |

## Quality Standards

### Quality Gate Presets

| Preset | Min Security | Min Quality | Max High Issues | Use Case |
|--------|-------------|-------------|-----------------|----------|
| **strict** | 95 | 90 | 0 | Financial, healthcare systems |
| **standard** | 85 | 80 | 2 | Normal production systems (default) |
| **mvp** | 75 | 70 | 5 | Prototypes, demo projects |

### Default Pass Thresholds

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
Overall Score = Security×weight + Quality×weight + Performance×weight
```

### Custom Configuration

Customize thresholds in `.claude/tech-stack.json`:

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

## Project Structure

```
helix/
├── bin/                    # CLI executables
│   └── cli.js              # CLI entry point
├── src/                    # TypeScript source code
│   ├── commands/           # CLI commands
│   ├── schemas/            # Zod schema definitions
│   ├── observability/      # Observability infrastructure
│   └── utils/              # Utility modules
├── templates/              # Template files (auto-discovered)
│   ├── agents/             # Agent definitions (11 agents)
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
│   ├── commands/           # Command templates
│   │   ├── stack.md            # Tech stack management
│   │   ├── code.md             # Iterative code generation
│   │   ├── apply.md            # OpenSpec integration
│   │   ├── research.md         # Deep research
│   │   ├── design.md           # Architecture design
│   │   ├── test.md             # Test generation
│   │   ├── document.md         # Documentation generation
│   │   └── full-cycle.md       # End-to-end workflow
│   ├── workflows/          # Workflow definitions
│   │   ├── quality-gate.md     # Quality gate system
│   │   └── cycle-state.md      # Workflow state management
│   ├── presets/            # Preset configurations
│   │   └── quality-presets.md  # Quality presets
│   └── config/             # Configuration files
│       └── aliases.md          # Command aliases
├── test/                   # Test suite (Vitest)
└── package.json            # Package configuration
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
  groupAgentsByCategory,
  filterAgentsBySource,

  // Schemas & Validation
  AggregatorOutputSchema,
  CodeWriterInputSchema,
  safeValidate,
  parseAndValidate,

  // Observability
  createTracer,
  createLogger,
  createMetricsCollector,

  // Error Recovery
  withRetry,
  withFallback,
  withTimeout,
  CircuitBreaker,

  // Types
  type AgentMetadata,
  type AgentCategory,
  type AgentSource,
} from 'helix';
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
- **Type-safe schemas** with Zod validation
- **Observability infrastructure** (tracer, logger, metrics)
- **Smart iteration strategy** with selective re-checking
- **Enhanced stall detection** (issue fingerprint, oscillation, regression)
- **Reliability features** (aggregator validator, error recovery, checkpoints)
- **OpenSpec integration enabled by default**
- Renamed to **Helix**
- **SuperClaude integration** - 11 specialized agents, end-to-end workflows, quality gate system

## License

MIT License

## Contributing

Issues and Pull Requests are welcome.

---

*Built on Claude Code framework for automated high-quality code generation through AI multi-agent collaboration.*
