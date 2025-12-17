/**
 * Shared constants for quality thresholds and weights
 *
 * SINGLE SOURCE OF TRUTH for all default configuration values.
 * These constants are used by:
 * - src/schemas/index.ts (Zod schema defaults)
 * - src/utils/aggregator-validator.ts (validation logic)
 * - templates/agents/result-aggregator.md (agent instructions)
 *
 * When modifying these values, the template documentation will be
 * automatically validated by the consistency test.
 *
 * @version 1.0.0 - Must match CONSTANTS_VERSION in result-aggregator.md
 */

/**
 * Version identifier for constants synchronization.
 * Increment this when making breaking changes to default values.
 * The result-aggregator.md template should reference this version.
 */
export const CONSTANTS_VERSION = '1.0.0';

/**
 * Default quality thresholds for the iterative workflow.
 * These determine when code passes quality gates.
 */
export const DEFAULT_QUALITY_THRESHOLDS = {
  /** Minimum security score (0-100) */
  security_min: 85,
  /** Minimum code quality score (0-100) */
  quality_min: 80,
  /** Minimum performance score (0-100) */
  performance_min: 80,
  /** Minimum weighted overall score (0-100) */
  overall_min: 80,
  /** Maximum allowed Critical issues (hard veto) */
  max_critical_issues: 0,
  /** Maximum allowed High issues */
  max_high_issues: 2,
  /** Maximum iterations before FAIL_MAX_ITERATIONS */
  max_iterations: 5,
  /** Score improvement threshold for stall detection */
  stall_threshold: 5,
  /** Consecutive rounds with low improvement to trigger STALLED */
  stall_rounds: 2,
} as const;

/**
 * Default dimension weights for overall score calculation.
 * Formula: overall = security * w.security + quality * w.quality + performance * w.performance
 * Must sum to 1.0.
 */
export const DEFAULT_WEIGHTS = {
  /** Security dimension weight (40%) */
  security: 0.4,
  /** Code quality dimension weight (35%) */
  quality: 0.35,
  /** Performance dimension weight (25%) */
  performance: 0.25,
} as const;

/**
 * Stall detection thresholds (configurable via quality_thresholds)
 */
export const STALL_DETECTION = {
  /** Score oscillation range to detect STALLED_OSCILLATING */
  oscillation_range: 6,
  /** Rounds to check for oscillation pattern */
  oscillation_rounds: 3,
  /** Score drop threshold to detect STALLED_REGRESSION */
  regression_threshold: 10,
  /** Rounds of persistent Critical issues to trigger STALLED_CRITICAL */
  critical_persist_rounds: 3,
} as const;

/**
 * Type definitions derived from constants
 */
export type QualityThresholdKeys = keyof typeof DEFAULT_QUALITY_THRESHOLDS;
export type WeightKeys = keyof typeof DEFAULT_WEIGHTS;
export type StallDetectionKeys = keyof typeof STALL_DETECTION;

/**
 * Validate that weights sum to 1.0
 */
export function validateWeightsSum(weights: {
  security: number;
  quality: number;
  performance: number;
}): boolean {
  const sum = weights.security + weights.quality + weights.performance;
  return Math.abs(sum - 1.0) < 0.001;
}

/**
 * Generate markdown documentation for constants.
 * Used to keep template documentation in sync.
 */
export function generateThresholdsMarkdownTable(): string {
  const rows = [
    '| 维度 | 配置项 | 默认值 |',
    '|------|--------|--------|',
    `| Critical 问题上限 | \`max_critical_issues\` | ${DEFAULT_QUALITY_THRESHOLDS.max_critical_issues} |`,
    `| High 问题上限 | \`max_high_issues\` | ${DEFAULT_QUALITY_THRESHOLDS.max_high_issues} |`,
    `| 安全评分最低 | \`security_min\` | ${DEFAULT_QUALITY_THRESHOLDS.security_min} |`,
    `| 质量评分最低 | \`quality_min\` | ${DEFAULT_QUALITY_THRESHOLDS.quality_min} |`,
    `| 性能评分最低 | \`performance_min\` | ${DEFAULT_QUALITY_THRESHOLDS.performance_min} |`,
    `| 综合评分最低 | \`overall_min\` | ${DEFAULT_QUALITY_THRESHOLDS.overall_min} |`,
    `| 安全权重 | \`weights.security\` | ${DEFAULT_WEIGHTS.security} |`,
    `| 质量权重 | \`weights.quality\` | ${DEFAULT_WEIGHTS.quality} |`,
    `| 性能权重 | \`weights.performance\` | ${DEFAULT_WEIGHTS.performance} |`,
  ];
  return rows.join('\n');
}

/**
 * Generate Python-style constants for template documentation
 */
export function generatePythonStyleDefaults(): string {
  return `DEFAULT_THRESHOLDS = {
    "security_min": ${DEFAULT_QUALITY_THRESHOLDS.security_min},
    "quality_min": ${DEFAULT_QUALITY_THRESHOLDS.quality_min},
    "performance_min": ${DEFAULT_QUALITY_THRESHOLDS.performance_min},
    "overall_min": ${DEFAULT_QUALITY_THRESHOLDS.overall_min},
    "max_critical_issues": ${DEFAULT_QUALITY_THRESHOLDS.max_critical_issues},
    "max_high_issues": ${DEFAULT_QUALITY_THRESHOLDS.max_high_issues},
    "max_iterations": ${DEFAULT_QUALITY_THRESHOLDS.max_iterations},
    "stall_threshold": ${DEFAULT_QUALITY_THRESHOLDS.stall_threshold},
    "stall_rounds": ${DEFAULT_QUALITY_THRESHOLDS.stall_rounds}
}

DEFAULT_WEIGHTS = {
    "security": ${DEFAULT_WEIGHTS.security},
    "quality": ${DEFAULT_WEIGHTS.quality},
    "performance": ${DEFAULT_WEIGHTS.performance}
}`;
}
