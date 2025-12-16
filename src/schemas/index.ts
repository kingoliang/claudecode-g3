/**
 * Schema definitions for type-safe agent communication
 * Uses Zod for runtime validation
 */
import { z } from 'zod';

// ============ Base Types ============

export const SeveritySchema = z.enum(['Critical', 'High', 'Medium', 'Low']);
export type Severity = z.infer<typeof SeveritySchema>;

export const IssueSchema = z.object({
  id: z.string(),
  source: z.enum(['security-reviewer', 'quality-checker', 'performance-analyzer']),
  severity: SeveritySchema,
  type: z.string(),
  file: z.string(),
  line: z.number().optional(),
  description: z.string(),
  suggestion: z.string(),
  techStackHint: z.string().optional(),
});
export type Issue = z.infer<typeof IssueSchema>;

// ============ Tech Stack ============

// Schema with defaults for input validation
export const QualityThresholdsSchema = z.object({
  security_min: z.number().min(0).max(100).default(85),
  quality_min: z.number().min(0).max(100).default(80),
  performance_min: z.number().min(0).max(100).default(80),
  overall_min: z.number().min(0).max(100).default(80),
  max_critical_issues: z.number().min(0).default(0),
  max_high_issues: z.number().min(0).default(2),
  max_iterations: z.number().min(1).max(10).default(5),
  stall_threshold: z.number().min(1).default(5),
  stall_rounds: z.number().min(1).default(2),
});
export type QualityThresholds = z.infer<typeof QualityThresholdsSchema>;

// Schema without defaults for output types (already validated data)
export const QualityThresholdsOutputSchema = z.object({
  security_min: z.number().min(0).max(100),
  quality_min: z.number().min(0).max(100),
  performance_min: z.number().min(0).max(100),
  overall_min: z.number().min(0).max(100),
  max_critical_issues: z.number().min(0),
  max_high_issues: z.number().min(0),
  max_iterations: z.number().min(1).max(10),
  stall_threshold: z.number().min(1),
  stall_rounds: z.number().min(1),
});

export const WeightsSchema = z
  .object({
    security: z.number().min(0).max(1).default(0.4),
    quality: z.number().min(0).max(1).default(0.35),
    performance: z.number().min(0).max(1).default(0.25),
  })
  .refine(
    (data) => {
      const sum = data.security + data.quality + data.performance;
      return Math.abs(sum - 1.0) < 0.001;
    },
    { message: 'Weights must sum to 1.0' }
  );
export type Weights = z.infer<typeof WeightsSchema>;

// Schema without defaults for output types (already validated data)
export const WeightsOutputSchema = z
  .object({
    security: z.number().min(0).max(1),
    quality: z.number().min(0).max(1),
    performance: z.number().min(0).max(1),
  })
  .refine(
    (data) => {
      const sum = data.security + data.quality + data.performance;
      return Math.abs(sum - 1.0) < 0.001;
    },
    { message: 'Weights must sum to 1.0' }
  );

export const TechStackSchema = z.object({
  language: z.string(),
  language_version: z.string().optional(),
  framework: z.string().optional(),
  framework_version: z.string().optional(),
  build_tool: z.string().optional(),
  test_framework: z.string().optional(),
  code_style: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  project_type: z.enum(['single', 'multi-language', 'monorepo']).optional(),
  quality_thresholds: QualityThresholdsSchema.optional(),
  weights: WeightsSchema.optional(),
});
export type TechStack = z.infer<typeof TechStackSchema>;

// ============ Reviewer Results ============

export const ReviewResultSchema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(100),
  issues: z.array(IssueSchema),
  summary: z.string().optional(),
});
export type ReviewResult = z.infer<typeof ReviewResultSchema>;

// ============ Aggregator Input ============

export const AggregatorInputSchema = z.object({
  iteration: z.number().min(1),
  tech_stack: TechStackSchema,
  security_result: ReviewResultSchema,
  quality_result: ReviewResultSchema,
  performance_result: ReviewResultSchema,
  previous_scores: z.array(z.number()).optional(),
});
export type AggregatorInput = z.infer<typeof AggregatorInputSchema>;

// ============ Aggregator Output ============

export const RecommendationSchema = z.enum([
  'PASS',
  'ITERATE',
  'FAIL_MAX_ITERATIONS',
  'STALLED',
]);
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const StallTypeSchema = z.enum([
  'STALLED_SCORE',
  'STALLED_CRITICAL',
  'STALLED_OSCILLATING',
  'STALLED_REGRESSION',
]);
export type StallType = z.infer<typeof StallTypeSchema>;

export const ProgressSchema = z.object({
  previous_score: z.number(),
  current_score: z.number(),
  improvement: z.number(),
  trend: z.enum(['improving', 'slow_improvement', 'stalled', 'regressing']),
  stall_warning: z.boolean(),
  stall_type: StallTypeSchema.optional(),
  persistent_issues: z.array(z.string()).optional(),
  oscillation_detected: z.boolean().optional(),
});
export type Progress = z.infer<typeof ProgressSchema>;

export const FeedbackForCodeWriterSchema = z.object({
  summary: z.string(),
  priority_order: z.array(z.string()),
  must_fix: z.array(IssueSchema),
  should_fix: z.array(IssueSchema),
  optional_fix: z.array(IssueSchema),
  iteration_budget: z
    .object({
      current: z.number(),
      max: z.number(),
      remaining: z.number(),
    })
    .optional(),
  score_gap: z
    .object({
      security: z.number(),
      quality: z.number(),
      performance: z.number(),
      overall: z.number(),
    })
    .optional(),
});
export type FeedbackForCodeWriter = z.infer<typeof FeedbackForCodeWriterSchema>;

export const AggregatorOutputSchema = z.object({
  iteration: z.number(),
  passed: z.boolean(),
  overall_score: z.number(),
  scores: z.object({
    security: z.number(),
    quality: z.number(),
    performance: z.number(),
  }),
  thresholds_used: QualityThresholdsOutputSchema.optional(),
  weights_used: WeightsOutputSchema.optional(),
  issue_counts: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),
  issues: z
    .object({
      critical: z.array(IssueSchema),
      high: z.array(IssueSchema),
      medium: z.array(IssueSchema),
      low: z.array(IssueSchema),
    })
    .optional(),
  feedback_for_code_writer: FeedbackForCodeWriterSchema,
  recommendation: RecommendationSchema,
  progress: ProgressSchema.optional(),
  next_action: z.string(),
});
export type AggregatorOutput = z.infer<typeof AggregatorOutputSchema>;

// ============ Code Writer Input/Output ============

export const CodeWriterInputSchema = z.object({
  requirement: z.string(),
  tech_stack: TechStackSchema,
  target_files: z.array(z.string()).optional(),
  project_context: z.string().optional(),
  spec: z.string().optional(),
  design: z.string().optional(),
  // For iteration calls
  previous_code: z.string().optional(),
  feedback: z.string().optional(),
  issues: z.array(IssueSchema).optional(),
});
export type CodeWriterInput = z.infer<typeof CodeWriterInputSchema>;

export const CodeWriterOutputSchema = z.object({
  code: z.string(),
  files_modified: z.array(z.string()),
  changes_made: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
  tech_stacks_used: z.record(z.string()).optional(),
  cross_language_notes: z.string().optional(),
});
export type CodeWriterOutput = z.infer<typeof CodeWriterOutputSchema>;
