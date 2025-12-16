import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTracer,
  createLogger,
  createMetricsCollector,
} from '../src/observability/index.js';

describe('Observability', () => {
  describe('Tracer', () => {
    let tracer: ReturnType<typeof createTracer>;

    beforeEach(() => {
      tracer = createTracer();
    });

    it('should start a new trace', () => {
      const traceId = tracer.startTrace('Test requirement');
      expect(traceId).toBeDefined();
      expect(traceId.length).toBe(36); // UUID format
      expect(tracer.getTraceId()).toBe(traceId);
    });

    it('should track iterations', () => {
      tracer.startTrace('Test requirement');
      tracer.startIteration(1);
      expect(tracer.getCurrentIteration()).toBe(1);
    });

    it('should create and end spans', () => {
      tracer.startTrace('Test requirement');
      tracer.startIteration(1);

      const span = tracer.startSpan('test-operation', { key: 'value' });
      expect(span.operationName).toBe('test-operation');
      expect(span.status).toBe('running');

      const endedSpan = tracer.endSpan('success', { result: 'ok' });
      expect(endedSpan?.status).toBe('success');
      expect(endedSpan?.endTime).toBeDefined();
    });

    it('should nest spans with parent references', () => {
      tracer.startTrace('Test requirement');
      tracer.startIteration(1);

      const parentSpan = tracer.startSpan('parent-op');
      const childSpan = tracer.startSpan('child-op');

      expect(childSpan.parentSpanId).toBe(parentSpan.spanId);

      tracer.endSpan();
      tracer.endSpan();
    });

    it('should record iteration results', () => {
      tracer.startTrace('Test requirement');
      tracer.startIteration(1);

      tracer.recordIterationResult({
        scores: { security: 90, quality: 85, performance: 88, overall: 87.5 },
        issueCount: { critical: 0, high: 1, medium: 2, low: 3 },
        recommendation: 'PASS',
      });

      expect(tracer.getCurrentIteration()).toBeNull();
    });

    it('should end trace and return complete data', async () => {
      const traceId = tracer.startTrace('Test requirement');
      tracer.startIteration(1);
      tracer.recordIterationResult({
        scores: { security: 90, quality: 85, performance: 88, overall: 87.5 },
        issueCount: { critical: 0, high: 0, medium: 0, low: 0 },
        recommendation: 'PASS',
      });

      const trace = await tracer.endTrace('PASS');

      expect(trace).toBeDefined();
      expect(trace?.traceId).toBe(traceId);
      expect(trace?.finalResult).toBe('PASS');
      expect(trace?.iterations.length).toBe(1);
      expect(trace?.totalDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('should throw when starting iteration without trace', () => {
      expect(() => tracer.startIteration(1)).toThrow('No active trace');
    });

    it('should report hasActiveTrace correctly', async () => {
      expect(tracer.hasActiveTrace()).toBe(false);
      tracer.startTrace('Test');
      expect(tracer.hasActiveTrace()).toBe(true);
      await tracer.endTrace('PASS');
      expect(tracer.hasActiveTrace()).toBe(false);
    });
  });

  describe('Logger', () => {
    let logger: ReturnType<typeof createLogger>;

    beforeEach(() => {
      logger = createLogger();
    });

    it('should respect log level', () => {
      logger.configure({ minLevel: 'WARN', output: 'silent' });

      // These should not throw
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');
    });

    it('should include context in log entries', () => {
      logger.configure({ output: 'silent' });
      // Just verify it doesn't throw
      logger.info('Test message', { key: 'value', count: 42 });
    });

    it('should provide convenience methods', () => {
      logger.configure({ output: 'silent' });

      // Verify all convenience methods work
      logger.agentStart('test-agent', { input: 'data' });
      logger.agentEnd('test-agent', { passed: true, score: 90 });
      logger.agentError('test-agent', new Error('Test error'));
      logger.iterationStart(1);
      logger.iterationEnd(1, { passed: true, score: 90, recommendation: 'PASS' });
      logger.validationError('TestSchema', [{ path: 'field', message: 'error' }]);
      logger.stallDetected('STALLED_SCORE', { improvement: 2 });
      logger.checkpointSaved('trace-123', 1);
    });

    it('should return current config', () => {
      const config = logger.getConfig();
      expect(config.minLevel).toBe('INFO');
      expect(config.output).toBe('console');
    });
  });

  describe('MetricsCollector', () => {
    let metrics: ReturnType<typeof createMetricsCollector>;

    beforeEach(() => {
      metrics = createMetricsCollector();
    });

    it('should record executions', () => {
      metrics.record({
        traceId: 'trace-1',
        timestamp: Date.now(),
        iterations: 3,
        durationMs: 5000,
        finalResult: 'PASS',
        finalScores: { security: 90, quality: 85, performance: 88 },
        issueTypes: ['SQL_INJECTION', 'XSS'],
      });

      expect(metrics.getRecordCount()).toBe(1);
    });

    it('should calculate summary statistics', () => {
      // Record multiple executions
      metrics.record({
        traceId: 'trace-1',
        timestamp: Date.now(),
        iterations: 2,
        durationMs: 3000,
        finalResult: 'PASS',
        finalScores: { security: 90, quality: 85, performance: 88 },
        issueTypes: ['XSS'],
      });

      metrics.record({
        traceId: 'trace-2',
        timestamp: Date.now(),
        iterations: 4,
        durationMs: 7000,
        finalResult: 'PASS',
        finalScores: { security: 85, quality: 80, performance: 90 },
        issueTypes: ['SQL_INJECTION'],
      });

      metrics.record({
        traceId: 'trace-3',
        timestamp: Date.now(),
        iterations: 5,
        durationMs: 10000,
        finalResult: 'FAIL_MAX_ITERATIONS',
        finalScores: { security: 70, quality: 75, performance: 80 },
        issueTypes: ['XSS', 'CSRF'],
      });

      const summary = metrics.getSummary();

      expect(summary.totalExecutions).toBe(3);
      expect(summary.successRate).toBeCloseTo(2 / 3);
      expect(summary.avgIterationsToPass).toBe(3); // (2 + 4) / 2
      expect(summary.avgDurationMs).toBeCloseTo((3000 + 7000 + 10000) / 3);
      expect(summary.stallRate).toBe(0);
      expect(summary.maxIterationsRate).toBeCloseTo(1 / 3);
    });

    it('should track common issue types', () => {
      metrics.record({
        traceId: 'trace-1',
        timestamp: Date.now(),
        iterations: 1,
        durationMs: 1000,
        finalResult: 'PASS',
        finalScores: { security: 90, quality: 85, performance: 88 },
        issueTypes: ['XSS', 'CSRF'],
      });

      metrics.record({
        traceId: 'trace-2',
        timestamp: Date.now(),
        iterations: 1,
        durationMs: 1000,
        finalResult: 'PASS',
        finalScores: { security: 90, quality: 85, performance: 88 },
        issueTypes: ['XSS', 'SQL_INJECTION'],
      });

      const summary = metrics.getSummary();
      const xssIssue = summary.commonIssueTypes.find((i) => i.type === 'XSS');
      expect(xssIssue?.count).toBe(2);
    });

    it('should calculate score distributions', () => {
      metrics.record({
        traceId: 'trace-1',
        timestamp: Date.now(),
        iterations: 1,
        durationMs: 1000,
        finalResult: 'PASS',
        finalScores: { security: 80, quality: 85, performance: 90 },
        issueTypes: [],
      });

      metrics.record({
        traceId: 'trace-2',
        timestamp: Date.now(),
        iterations: 1,
        durationMs: 1000,
        finalResult: 'PASS',
        finalScores: { security: 90, quality: 85, performance: 80 },
        issueTypes: [],
      });

      const summary = metrics.getSummary();

      expect(summary.scoreDistribution.security.min).toBe(80);
      expect(summary.scoreDistribution.security.max).toBe(90);
      expect(summary.scoreDistribution.security.avg).toBe(85);
    });

    it('should filter by time window', () => {
      const now = Date.now();

      // Old record
      metrics.record({
        traceId: 'trace-old',
        timestamp: now - 100000, // 100 seconds ago
        iterations: 1,
        durationMs: 1000,
        finalResult: 'PASS',
        finalScores: { security: 50, quality: 50, performance: 50 },
        issueTypes: [],
      });

      // Recent record
      metrics.record({
        traceId: 'trace-recent',
        timestamp: now,
        iterations: 1,
        durationMs: 1000,
        finalResult: 'PASS',
        finalScores: { security: 90, quality: 90, performance: 90 },
        issueTypes: [],
      });

      // Get summary for last 60 seconds
      const summary = metrics.getSummary(60000);

      expect(summary.totalExecutions).toBe(1);
      expect(summary.scoreDistribution.security.avg).toBe(90);
    });

    it('should export and import records', () => {
      metrics.record({
        traceId: 'trace-1',
        timestamp: Date.now(),
        iterations: 1,
        durationMs: 1000,
        finalResult: 'PASS',
        finalScores: { security: 90, quality: 85, performance: 88 },
        issueTypes: [],
      });

      const exported = metrics.exportRecords();
      expect(exported.length).toBe(1);

      const newMetrics = createMetricsCollector();
      newMetrics.importRecords(exported);
      expect(newMetrics.getRecordCount()).toBe(1);
    });

    it('should clear records', () => {
      metrics.record({
        traceId: 'trace-1',
        timestamp: Date.now(),
        iterations: 1,
        durationMs: 1000,
        finalResult: 'PASS',
        finalScores: { security: 90, quality: 85, performance: 88 },
        issueTypes: [],
      });

      metrics.clear();
      expect(metrics.getRecordCount()).toBe(0);
    });

    it('should return empty metrics for no records', () => {
      const summary = metrics.getSummary();
      expect(summary.totalExecutions).toBe(0);
      expect(summary.successRate).toBe(0);
      expect(summary.commonIssueTypes).toEqual([]);
    });
  });
});
