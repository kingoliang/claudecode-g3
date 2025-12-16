/**
 * Execution tracing system for iterative workflows
 * Provides distributed tracing capabilities for debugging and monitoring
 */
import { randomUUID } from 'crypto';

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

class Tracer {
  private currentTrace: ExecutionTrace | null = null;
  private currentIteration: IterationTrace | null = null;
  private spanStack: Span[] = [];

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
   */
  endTrace(
    finalResult: ExecutionTrace['finalResult']
  ): ExecutionTrace | null {
    if (!this.currentTrace) return null;

    this.currentTrace.endTime = Date.now();
    this.currentTrace.finalResult = finalResult;
    this.currentTrace.totalDurationMs =
      this.currentTrace.endTime - this.currentTrace.startTime;

    const trace = this.currentTrace;
    this.currentTrace = null;
    this.currentIteration = null;
    this.spanStack = [];

    return trace;
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
