/**
 * Execution tracing system for iterative workflows
 * Provides distributed tracing capabilities for debugging and monitoring
 */
import { randomUUID } from 'crypto';
import fs from 'fs-extra';
import path from 'path';

export interface SpanEvent {
  timestamp: number;
  name: string;
  attributes?: Record<string, unknown>;
}

export interface Span {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'success' | 'error';
  attributes: Record<string, unknown>;
  events: SpanEvent[];
}

export interface IterationScores {
  security: number;
  quality: number;
  performance: number;
  overall: number;
}

export interface IterationIssueCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface IterationTrace {
  iteration: number;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  spans: Span[];
  scores: IterationScores;
  issueCount: IterationIssueCounts;
  recommendation: string;
}

export interface ExecutionTrace {
  traceId: string;
  sessionId: string;
  requirement: string;
  startTime: number;
  endTime?: number;
  iterations: IterationTrace[];
  finalResult?: 'PASS' | 'FAIL_MAX_ITERATIONS' | 'STALLED';
  totalDurationMs?: number;
}

/**
 * Configuration for trace persistence
 */
export interface TracerConfig {
  /** Enable persistence of traces to disk */
  persist?: boolean;
  /** Directory to save traces (relative to target directory) */
  persistDir?: string;
  /** Target directory (defaults to cwd) */
  targetDir?: string;
  /** Maximum number of trace files to keep */
  maxTraceFiles?: number;
}

const DEFAULT_TRACER_CONFIG: TracerConfig = {
  persist: false,
  persistDir: '.claude/traces',
  targetDir: process.cwd(),
  maxTraceFiles: 20,
};

class Tracer {
  private currentTrace: ExecutionTrace | null = null;
  private currentIteration: IterationTrace | null = null;
  private spanStack: Span[] = [];
  private config: TracerConfig = { ...DEFAULT_TRACER_CONFIG };

  /**
   * Configure the tracer
   */
  configure(config: Partial<TracerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): TracerConfig {
    return { ...this.config };
  }

  /**
   * Start a new execution trace
   */
  startTrace(requirement: string): string {
    const traceId = randomUUID();
    this.currentTrace = {
      traceId,
      sessionId: randomUUID(),
      requirement,
      startTime: Date.now(),
      iterations: [],
    };
    return traceId;
  }

  /**
   * Start a new iteration within the current trace
   */
  startIteration(iteration: number): void {
    if (!this.currentTrace) {
      throw new Error('No active trace. Call startTrace first.');
    }

    this.currentIteration = {
      iteration,
      startTime: Date.now(),
      spans: [],
      scores: { security: 0, quality: 0, performance: 0, overall: 0 },
      issueCount: { critical: 0, high: 0, medium: 0, low: 0 },
      recommendation: '',
    };
  }

  /**
   * Start a new span (represents an operation)
   */
  startSpan(
    operationName: string,
    attributes: Record<string, unknown> = {}
  ): Span {
    const span: Span = {
      spanId: randomUUID(),
      traceId: this.currentTrace?.traceId ?? 'unknown',
      parentSpanId:
        this.spanStack.length > 0
          ? this.spanStack[this.spanStack.length - 1].spanId
          : undefined,
      operationName,
      startTime: Date.now(),
      status: 'running',
      attributes,
      events: [],
    };

    this.spanStack.push(span);
    return span;
  }

  /**
   * Add an event to the current span
   */
  addSpanEvent(name: string, attributes?: Record<string, unknown>): void {
    const currentSpan = this.spanStack[this.spanStack.length - 1];
    if (currentSpan) {
      currentSpan.events.push({
        timestamp: Date.now(),
        name,
        attributes,
      });
    }
  }

  /**
   * End the current span
   */
  endSpan(
    status: 'success' | 'error' = 'success',
    attributes: Record<string, unknown> = {}
  ): Span | null {
    const span = this.spanStack.pop();
    if (!span) return null;

    span.endTime = Date.now();
    span.status = status;
    span.attributes = { ...span.attributes, ...attributes };

    if (this.currentIteration) {
      this.currentIteration.spans.push(span);
    }

    return span;
  }

  /**
   * Record iteration result
   */
  recordIterationResult(result: {
    scores: IterationScores;
    issueCount: IterationIssueCounts;
    recommendation: string;
  }): void {
    if (!this.currentIteration) return;

    this.currentIteration.scores = result.scores;
    this.currentIteration.issueCount = result.issueCount;
    this.currentIteration.recommendation = result.recommendation;
    this.currentIteration.endTime = Date.now();
    this.currentIteration.durationMs =
      this.currentIteration.endTime - this.currentIteration.startTime;

    this.currentTrace?.iterations.push(this.currentIteration);
    this.currentIteration = null;
  }

  /**
   * End the trace and return complete data
   * If persistence is enabled, saves the trace to disk
   */
  async endTrace(
    finalResult: ExecutionTrace['finalResult']
  ): Promise<ExecutionTrace | null> {
    if (!this.currentTrace) return null;

    this.currentTrace.endTime = Date.now();
    this.currentTrace.finalResult = finalResult;
    this.currentTrace.totalDurationMs =
      this.currentTrace.endTime - this.currentTrace.startTime;

    const trace = this.currentTrace;
    this.currentTrace = null;
    this.currentIteration = null;
    this.spanStack = [];

    // Persist trace if enabled
    if (this.config.persist) {
      await this.persistTrace(trace);
    }

    return trace;
  }

  /**
   * Persist trace to disk
   */
  private async persistTrace(trace: ExecutionTrace): Promise<void> {
    try {
      const traceDir = path.join(
        this.config.targetDir || process.cwd(),
        this.config.persistDir || '.claude/traces'
      );

      await fs.ensureDir(traceDir);

      const filename = `${trace.traceId}.json`;
      const filepath = path.join(traceDir, filename);

      await fs.writeJson(filepath, trace, { spaces: 2 });

      // Clean up old traces if needed
      await this.cleanupOldTraces(traceDir);
    } catch (error) {
      // Don't throw - persistence failure shouldn't break the workflow
      console.warn('Failed to persist trace:', error instanceof Error ? error.message : error);
    }
  }

  /**
   * Clean up old trace files, keeping only the most recent N
   */
  private async cleanupOldTraces(traceDir: string): Promise<void> {
    const maxFiles = this.config.maxTraceFiles || 20;

    try {
      const files = await fs.readdir(traceDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      if (jsonFiles.length <= maxFiles) {
        return;
      }

      // Sort by modification time
      const stats = await Promise.all(
        jsonFiles.map(async f => ({
          file: f,
          mtime: (await fs.stat(path.join(traceDir, f))).mtime.getTime(),
        }))
      );

      stats.sort((a, b) => b.mtime - a.mtime);

      // Remove oldest files
      const toDelete = stats.slice(maxFiles);
      for (const { file } of toDelete) {
        await fs.remove(path.join(traceDir, file));
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Load a trace from disk by ID
   */
  async loadTrace(traceId: string): Promise<ExecutionTrace | null> {
    const traceDir = path.join(
      this.config.targetDir || process.cwd(),
      this.config.persistDir || '.claude/traces'
    );

    const filepath = path.join(traceDir, `${traceId}.json`);

    if (!(await fs.pathExists(filepath))) {
      return null;
    }

    try {
      return await fs.readJson(filepath);
    } catch {
      return null;
    }
  }

  /**
   * List all persisted traces
   */
  async listTraces(): Promise<Array<{
    traceId: string;
    requirement: string;
    finalResult?: string;
    startTime: number;
    totalDurationMs?: number;
  }>> {
    const traceDir = path.join(
      this.config.targetDir || process.cwd(),
      this.config.persistDir || '.claude/traces'
    );

    if (!(await fs.pathExists(traceDir))) {
      return [];
    }

    const files = await fs.readdir(traceDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const traces = await Promise.all(
      jsonFiles.map(async f => {
        try {
          const data = await fs.readJson(path.join(traceDir, f));
          return {
            traceId: data.traceId,
            requirement: data.requirement?.slice(0, 100) ?? '',
            finalResult: data.finalResult,
            startTime: data.startTime,
            totalDurationMs: data.totalDurationMs,
          };
        } catch {
          return null;
        }
      })
    );

    return traces
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Get current trace ID
   */
  getTraceId(): string | null {
    return this.currentTrace?.traceId ?? null;
  }

  /**
   * Get current iteration number
   */
  getCurrentIteration(): number | null {
    return this.currentIteration?.iteration ?? null;
  }

  /**
   * Check if there's an active trace
   */
  hasActiveTrace(): boolean {
    return this.currentTrace !== null;
  }

  /**
   * Get a snapshot of current trace (for debugging)
   */
  getTraceSnapshot(): ExecutionTrace | null {
    if (!this.currentTrace) return null;
    return { ...this.currentTrace };
  }
}

// Global singleton instance
export const tracer = new Tracer();

// Factory function for creating isolated tracers (useful for testing)
export function createTracer(): Tracer {
  return new Tracer();
}
