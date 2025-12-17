/**
 * Aggregator output validation and sanity checking
 * Provides a second-opinion mechanism for result verification
 *
 * Uses shared constants from constants.ts for default values.
 * This ensures consistency with:
 * - schemas/index.ts (Zod schema defaults)
 * - templates/agents/result-aggregator.md (agent instructions)
 */
import {
  AggregatorOutput,
  AggregatorOutputSchema,
  QualityThresholds,
  Weights,
} from '../schemas/index.js';
import { safeValidate } from './validation.js';
import {
  DEFAULT_QUALITY_THRESHOLDS,
  DEFAULT_WEIGHTS,
} from '../constants.js';

export interface SanityCheckResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  correctedOutput?: AggregatorOutput;
}

/**
 * Perform sanity check on aggregator output
 */
export function sanityCheckAggregatorOutput(output: unknown): SanityCheckResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Schema validation
  const validation = safeValidate(AggregatorOutputSchema, output);
  if (!validation.success) {
    return {
      valid: false,
      warnings,
      errors:
        validation.errors?.map((e) => `${e.path}: ${e.message}`) ?? [
          'Unknown validation error',
        ],
    };
  }

  const data = validation.data!;

  // 2. Logical consistency checks

  // 2.1 Score and pass status consistency
  // Use shared constants for default weights
  const weights = {
    security: data.weights_used?.security ?? DEFAULT_WEIGHTS.security,
    quality: data.weights_used?.quality ?? DEFAULT_WEIGHTS.quality,
    performance: data.weights_used?.performance ?? DEFAULT_WEIGHTS.performance,
  };
  const calculatedOverall =
    data.scores.security * weights.security +
    data.scores.quality * weights.quality +
    data.scores.performance * weights.performance;

  if (Math.abs(calculatedOverall - data.overall_score) > 1) {
    warnings.push(
      `Overall score mismatch: reported ${data.overall_score}, calculated ${calculatedOverall.toFixed(1)}`
    );
  }

  // 2.2 passed and recommendation consistency
  if (data.passed && data.recommendation !== 'PASS') {
    errors.push(
      `Inconsistent: passed=true but recommendation=${data.recommendation}`
    );
  }
  if (!data.passed && data.recommendation === 'PASS') {
    errors.push(`Inconsistent: passed=false but recommendation=PASS`);
  }

  // 2.3 Critical issues and PASS contradiction
  if (data.issue_counts.critical > 0 && data.recommendation === 'PASS') {
    errors.push(
      `Cannot PASS with ${data.issue_counts.critical} critical issues`
    );
  }

  // 2.4 must_fix not empty but recommendation is PASS
  if (
    data.feedback_for_code_writer.must_fix.length > 0 &&
    data.recommendation === 'PASS'
  ) {
    warnings.push('PASS recommended but must_fix is not empty');
  }

  // 2.5 Score range check
  for (const [key, value] of Object.entries(data.scores)) {
    if (value < 0 || value > 100) {
      errors.push(`${key} score out of range: ${value}`);
    }
  }

  // 2.6 Issue counts match actual issues
  if (data.issues) {
    const actualCounts = {
      critical: data.issues.critical?.length ?? 0,
      high: data.issues.high?.length ?? 0,
      medium: data.issues.medium?.length ?? 0,
      low: data.issues.low?.length ?? 0,
    };

    for (const [severity, count] of Object.entries(data.issue_counts)) {
      const actual = actualCounts[severity as keyof typeof actualCounts];
      if (count !== actual) {
        warnings.push(
          `Issue count mismatch for ${severity}: reported ${count}, actual ${actual}`
        );
      }
    }
  }

  // 3. Attempt auto-correction
  let correctedOutput: AggregatorOutput | undefined;
  if (errors.length > 0) {
    correctedOutput = attemptAutoCorrection(data, errors);
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
    correctedOutput,
  };
}

/**
 * Attempt to auto-correct obvious logical errors
 */
function attemptAutoCorrection(
  output: AggregatorOutput,
  _errors: string[]
): AggregatorOutput {
  const corrected: AggregatorOutput = {
    ...output,
    recommendation: output.recommendation,
  };

  // Fix Critical issues and PASS contradiction
  if (
    corrected.issue_counts.critical > 0 &&
    corrected.recommendation === 'PASS'
  ) {
    corrected.recommendation = 'ITERATE';
    corrected.passed = false;
  }

  // Fix passed and recommendation inconsistency
  if (corrected.recommendation === 'PASS') {
    corrected.passed = true;
  } else {
    corrected.passed = false;
  }

  return corrected;
}

/**
 * Second opinion scoring mechanism
 * Provides an independent score calculation for verification
 */
export function secondOpinionScore(
  securityScore: number,
  qualityScore: number,
  performanceScore: number,
  criticalCount: number,
  highCount: number,
  thresholds?: Partial<QualityThresholds>,
  weights?: Partial<Weights>
): {
  shouldPass: boolean;
  calculatedScore: number;
  reason: string;
  details: {
    securityCheck: boolean;
    qualityCheck: boolean;
    performanceCheck: boolean;
    overallCheck: boolean;
    criticalCheck: boolean;
    highCheck: boolean;
  };
} {
  // Use shared constants for default thresholds
  const t = {
    security_min: thresholds?.security_min ?? DEFAULT_QUALITY_THRESHOLDS.security_min,
    quality_min: thresholds?.quality_min ?? DEFAULT_QUALITY_THRESHOLDS.quality_min,
    performance_min: thresholds?.performance_min ?? DEFAULT_QUALITY_THRESHOLDS.performance_min,
    overall_min: thresholds?.overall_min ?? DEFAULT_QUALITY_THRESHOLDS.overall_min,
    max_critical_issues: thresholds?.max_critical_issues ?? DEFAULT_QUALITY_THRESHOLDS.max_critical_issues,
    max_high_issues: thresholds?.max_high_issues ?? DEFAULT_QUALITY_THRESHOLDS.max_high_issues,
  };

  // Use shared constants for default weights
  const w = {
    security: weights?.security ?? DEFAULT_WEIGHTS.security,
    quality: weights?.quality ?? DEFAULT_WEIGHTS.quality,
    performance: weights?.performance ?? DEFAULT_WEIGHTS.performance,
  };

  // Hard veto conditions
  const criticalCheck = criticalCount <= t.max_critical_issues;
  if (!criticalCheck) {
    return {
      shouldPass: false,
      calculatedScore: Math.min(securityScore, qualityScore, performanceScore),
      reason: `Vetoed: ${criticalCount} critical issue(s), max allowed: ${t.max_critical_issues}`,
      details: {
        securityCheck: securityScore >= t.security_min,
        qualityCheck: qualityScore >= t.quality_min,
        performanceCheck: performanceScore >= t.performance_min,
        overallCheck: false,
        criticalCheck: false,
        highCheck: highCount <= t.max_high_issues,
      },
    };
  }

  const highCheck = highCount <= t.max_high_issues;
  if (!highCheck) {
    return {
      shouldPass: false,
      calculatedScore: Math.min(securityScore, qualityScore, performanceScore),
      reason: `Vetoed: ${highCount} high issues, max allowed: ${t.max_high_issues}`,
      details: {
        securityCheck: securityScore >= t.security_min,
        qualityCheck: qualityScore >= t.quality_min,
        performanceCheck: performanceScore >= t.performance_min,
        overallCheck: false,
        criticalCheck: true,
        highCheck: false,
      },
    };
  }

  // Weighted score
  const overall =
    securityScore * w.security +
    qualityScore * w.quality +
    performanceScore * w.performance;

  // Individual threshold checks
  const securityCheck = securityScore >= t.security_min;
  const qualityCheck = qualityScore >= t.quality_min;
  const performanceCheck = performanceScore >= t.performance_min;
  const overallCheck = overall >= t.overall_min;

  const thresholdsMet =
    securityCheck && qualityCheck && performanceCheck && overallCheck;

  const details = {
    securityCheck,
    qualityCheck,
    performanceCheck,
    overallCheck,
    criticalCheck,
    highCheck,
  };

  if (thresholdsMet) {
    return {
      shouldPass: true,
      calculatedScore: overall,
      reason: 'All thresholds met',
      details,
    };
  }

  // Build failure reason
  const failures: string[] = [];
  if (!securityCheck) failures.push(`security ${securityScore} < ${t.security_min}`);
  if (!qualityCheck) failures.push(`quality ${qualityScore} < ${t.quality_min}`);
  if (!performanceCheck) failures.push(`performance ${performanceScore} < ${t.performance_min}`);
  if (!overallCheck) failures.push(`overall ${overall.toFixed(1)} < ${t.overall_min}`);

  return {
    shouldPass: false,
    calculatedScore: overall,
    reason: `Threshold not met: ${failures.join(', ')}`,
    details,
  };
}

/**
 * Compare aggregator result with second opinion
 * Returns discrepancies if any
 */
export function compareWithSecondOpinion(
  aggregatorOutput: AggregatorOutput,
  thresholds?: Partial<QualityThresholds>,
  weights?: Partial<Weights>
): {
  match: boolean;
  aggregatorDecision: string;
  secondOpinionDecision: string;
  discrepancies: string[];
} {
  const secondOpinion = secondOpinionScore(
    aggregatorOutput.scores.security,
    aggregatorOutput.scores.quality,
    aggregatorOutput.scores.performance,
    aggregatorOutput.issue_counts.critical,
    aggregatorOutput.issue_counts.high,
    thresholds,
    weights
  );

  const aggregatorDecision = aggregatorOutput.recommendation;
  const secondOpinionDecision = secondOpinion.shouldPass ? 'PASS' : 'ITERATE';

  const discrepancies: string[] = [];

  // Check if decisions match (PASS vs non-PASS)
  const aggregatorPassed = aggregatorDecision === 'PASS';
  if (aggregatorPassed !== secondOpinion.shouldPass) {
    discrepancies.push(
      `Decision mismatch: aggregator=${aggregatorDecision}, second_opinion=${secondOpinionDecision}`
    );
    discrepancies.push(`Second opinion reason: ${secondOpinion.reason}`);
  }

  // Check score calculation
  const scoreDiff = Math.abs(
    aggregatorOutput.overall_score - secondOpinion.calculatedScore
  );
  if (scoreDiff > 1) {
    discrepancies.push(
      `Score mismatch: aggregator=${aggregatorOutput.overall_score}, second_opinion=${secondOpinion.calculatedScore.toFixed(1)}`
    );
  }

  return {
    match: discrepancies.length === 0,
    aggregatorDecision,
    secondOpinionDecision,
    discrepancies,
  };
}
