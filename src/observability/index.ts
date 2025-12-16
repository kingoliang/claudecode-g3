/**
 * Observability module - exports all observability components
 */

export {
  tracer,
  createTracer,
  type Span,
  type SpanEvent,
  type ExecutionTrace,
  type IterationTrace,
  type IterationScores,
  type IterationIssueCounts,
} from './tracer.js';

export {
  logger,
  createLogger,
  type LogLevel,
  type LogEntry,
  type LoggerConfig,
} from './logger.js';

export {
  metrics,
  createMetricsCollector,
  type MetricsSummary,
  type ExecutionRecord,
  type ScoreDistribution,
} from './metrics.js';
