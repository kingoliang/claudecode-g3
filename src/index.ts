/**
 * iterative-workflow - Iterative multi-agent code generation framework for Claude Code
 *
 * This package provides templates (agents, commands, skills) for Claude Code.
 * Tech stack detection is handled by Claude itself through the skill instructions.
 */

// Commands
export { init, type InitOptions } from './commands/init.js';
export { upgrade, type UpgradeOptions } from './commands/upgrade.js';
export { status, type StatusOptions } from './commands/status.js';

// Template management
export {
  copyTemplates,
  getTemplatesDir,
  getTemplatesDirInfo,
  getInstalledVersion,
  checkUpgrade,
  FRAMEWORK_VERSION,
  type CopyOptions,
  type TemplatesInfo,
  type VersionInfo,
  type TemplateDiscoveryResult,
  type UpgradeStatus,
} from './utils/templates.js';

// Agent discovery
export {
  discoverAgents,
  parseAgentFrontmatter,
  formatAgentNames,
  AgentFrontmatterSchema,
  VALID_MODELS,
  type AgentMetadata,
  type AgentModel,
  type AgentFrontmatter,
  type DiscoveryResult,
} from './utils/agent-discovery.js';

// Command discovery
export {
  discoverCommands,
  parseCommandFrontmatter,
  filterCommands,
  formatCommandNames,
  type CommandMetadata,
  type CommandDiscoveryResult,
} from './utils/command-discovery.js';

// Skill discovery
export {
  discoverSkills,
  parseSkillFrontmatter,
  formatSkillNames,
  type SkillMetadata,
  type SkillDiscoveryResult,
} from './utils/skill-discovery.js';

// YAML parsing utilities
export {
  parseSimpleYaml,
  extractFrontmatter,
  FRONTMATTER_REGEX,
} from './utils/yaml-parser.js';

// ============ Shared Constants (Single Source of Truth) ============
export {
  CONSTANTS_VERSION,
  DEFAULT_QUALITY_THRESHOLDS,
  DEFAULT_WEIGHTS,
  STALL_DETECTION,
  validateWeightsSum,
  generateThresholdsMarkdownTable,
  generatePythonStyleDefaults,
  type QualityThresholdKeys,
  type WeightKeys,
  type StallDetectionKeys,
} from './constants.js';

// ============ Phase 1: Schema Validation ============
export * from './schemas/index.js';

export {
  safeValidate,
  parseAndValidate,
  validateWithDefaults,
  isValidationSuccess,
  formatValidationErrors,
  type ValidationResult,
  type ValidationError,
} from './utils/validation.js';

// ============ Phase 2: Observability ============
export {
  tracer,
  createTracer,
  type Span,
  type SpanEvent,
  type ExecutionTrace,
  type IterationTrace,
  type IterationScores,
  type IterationIssueCounts,
  type TracerConfig,
} from './observability/tracer.js';

export {
  logger,
  createLogger,
  type LogLevel,
  type LogEntry,
  type LoggerConfig,
} from './observability/logger.js';

export {
  metrics,
  createMetricsCollector,
  type MetricsSummary,
  type ExecutionRecord,
  type ScoreDistribution,
} from './observability/metrics.js';

// ============ Phase 4: Reliability ============
export {
  sanityCheckAggregatorOutput,
  secondOpinionScore,
  compareWithSecondOpinion,
  type SanityCheckResult,
} from './utils/aggregator-validator.js';

export {
  withRetry,
  withFallback,
  withTimeout,
  withGracefulDegradation,
  CircuitBreaker,
  type RetryConfig,
  type FallbackConfig,
  type CircuitBreakerConfig,
  type CircuitState,
} from './utils/error-recovery.js';

export {
  saveCheckpoint,
  loadCheckpoint,
  loadLatestCheckpoint,
  listCheckpoints,
  deleteCheckpoint,
  cleanOldCheckpoints,
  createCheckpoint,
  updateCheckpointWithIteration,
  createFileSnapshot,
  hasFilesChanged,
  migrateCheckpoint,
  CHECKPOINT_VERSION,
  type IterationCheckpoint,
  type IterationSnapshot,
  type FileSnapshot,
} from './utils/checkpoint.js';
