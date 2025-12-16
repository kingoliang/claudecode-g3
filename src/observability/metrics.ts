/**
 * Metrics collection system for iterative workflows
 * Tracks execution statistics and performance data
 */

export interface ScoreDistribution {
  min: number;
  max: number;
  avg: number;
}

export interface MetricsSummary {
  totalExecutions: number;
  successRate: number;
  avgIterationsToPass: number;
  avgDurationMs: number;
  scoreDistribution: {
    security: ScoreDistribution;
    quality: ScoreDistribution;
    performance: ScoreDistribution;
  };
  commonIssueTypes: Array<{ type: string; count: number }>;
  stallRate: number;
  maxIterationsRate: number;
}

export interface ExecutionRecord {
  traceId: string;
  timestamp: number;
  iterations: number;
  durationMs: number;
  finalResult: 'PASS' | 'FAIL_MAX_ITERATIONS' | 'STALLED';
  finalScores: {
    security: number;
    quality: number;
    performance: number;
  };
  issueTypes: string[];
}

class MetricsCollector {
  private records: ExecutionRecord[] = [];
  private maxRecords = 1000;

  /**
   * Record an execution
   */
  record(execution: ExecutionRecord): void {
    this.records.push(execution);

    // Keep sliding window
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }
  }

  /**
   * Get metrics summary
   * @param timeWindowMs Optional time window in milliseconds
   */
  getSummary(timeWindowMs?: number): MetricsSummary {
    let filtered = this.records;

    if (timeWindowMs) {
      const cutoff = Date.now() - timeWindowMs;
      filtered = this.records.filter((r) => r.timestamp >= cutoff);
    }

    if (filtered.length === 0) {
      return this.emptyMetrics();
    }

    const passed = filtered.filter((r) => r.finalResult === 'PASS');
    const stalled = filtered.filter((r) => r.finalResult === 'STALLED');
    const maxIterations = filtered.filter(
      (r) => r.finalResult === 'FAIL_MAX_ITERATIONS'
    );

    // Calculate score distributions
    const scoreDistribution = {
      security: this.calcDistribution(
        filtered.map((r) => r.finalScores.security)
      ),
      quality: this.calcDistribution(
        filtered.map((r) => r.finalScores.quality)
      ),
      performance: this.calcDistribution(
        filtered.map((r) => r.finalScores.performance)
      ),
    };

    // Count common issue types
    const issueCount: Record<string, number> = {};
    filtered.forEach((r) => {
      r.issueTypes.forEach((type) => {
        issueCount[type] = (issueCount[type] || 0) + 1;
      });
    });
    const commonIssueTypes = Object.entries(issueCount)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalExecutions: filtered.length,
      successRate: passed.length / filtered.length,
      avgIterationsToPass:
        passed.length > 0
          ? passed.reduce((sum, r) => sum + r.iterations, 0) / passed.length
          : 0,
      avgDurationMs:
        filtered.reduce((sum, r) => sum + r.durationMs, 0) / filtered.length,
      scoreDistribution,
      commonIssueTypes,
      stallRate: stalled.length / filtered.length,
      maxIterationsRate: maxIterations.length / filtered.length,
    };
  }

  /**
   * Get record count
   */
  getRecordCount(): number {
    return this.records.length;
  }

  /**
   * Clear all records
   */
  clear(): void {
    this.records = [];
  }

  /**
   * Export records for persistence
   */
  exportRecords(): ExecutionRecord[] {
    return [...this.records];
  }

  /**
   * Import records from persistence
   */
  importRecords(records: ExecutionRecord[]): void {
    this.records = records.slice(-this.maxRecords);
  }

  /**
   * Set maximum records to keep
   */
  setMaxRecords(max: number): void {
    this.maxRecords = max;
    if (this.records.length > max) {
      this.records = this.records.slice(-max);
    }
  }

  private calcDistribution(values: number[]): ScoreDistribution {
    if (values.length === 0) return { min: 0, max: 0, avg: 0 };
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    };
  }

  private emptyMetrics(): MetricsSummary {
    return {
      totalExecutions: 0,
      successRate: 0,
      avgIterationsToPass: 0,
      avgDurationMs: 0,
      scoreDistribution: {
        security: { min: 0, max: 0, avg: 0 },
        quality: { min: 0, max: 0, avg: 0 },
        performance: { min: 0, max: 0, avg: 0 },
      },
      commonIssueTypes: [],
      stallRate: 0,
      maxIterationsRate: 0,
    };
  }
}

// Global singleton instance
export const metrics = new MetricsCollector();

// Factory function for creating isolated collectors (useful for testing)
export function createMetricsCollector(): MetricsCollector {
  return new MetricsCollector();
}
