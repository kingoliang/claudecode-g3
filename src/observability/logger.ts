/**
 * Structured logging system for iterative workflows
 * Provides contextual logging with trace correlation
 */
import { tracer } from './tracer.js';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  traceId: string | null;
  iteration?: number;
  agent?: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  output: 'console' | 'json' | 'silent';
  includeTimestamp: boolean;
  includeTraceId: boolean;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: '\x1b[36m', // Cyan
  INFO: '\x1b[32m', // Green
  WARN: '\x1b[33m', // Yellow
  ERROR: '\x1b[31m', // Red
};

const RESET = '\x1b[0m';

class Logger {
  private config: LoggerConfig = {
    minLevel: 'INFO',
    output: 'console',
    includeTimestamp: true,
    includeTraceId: true,
  };

  /**
   * Configure the logger
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.config.minLevel];
  }

  private formatEntry(entry: LogEntry): string {
    if (this.config.output === 'json') {
      return JSON.stringify(entry);
    }

    const parts: string[] = [];

    if (this.config.includeTimestamp) {
      parts.push(`${entry.timestamp}`);
    }

    const color = LEVEL_COLORS[entry.level];
    parts.push(`${color}${entry.level.padEnd(5)}${RESET}`);

    if (this.config.includeTraceId && entry.traceId) {
      parts.push(`[${entry.traceId.slice(0, 8)}]`);
    }

    if (entry.iteration !== undefined) {
      parts.push(`[iter:${entry.iteration}]`);
    }

    if (entry.agent) {
      parts.push(`[${entry.agent}]`);
    }

    parts.push(entry.message);

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(JSON.stringify(entry.context));
    }

    return parts.join(' ');
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(level)) return;
    if (this.config.output === 'silent') return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      traceId: tracer.getTraceId(),
      iteration: tracer.getCurrentIteration() ?? undefined,
      message,
      context,
    };

    const formatted = this.formatEntry(entry);

    switch (level) {
      case 'ERROR':
        console.error(formatted);
        break;
      case 'WARN':
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('DEBUG', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('INFO', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('WARN', message, context);
  }

  /**
   * Log error message
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log('ERROR', message, context);
  }

  // ============ Convenience Methods ============

  /**
   * Log agent start
   */
  agentStart(agent: string, input?: Record<string, unknown>): void {
    this.info(`Agent started: ${agent}`, {
      agent,
      inputKeys: input ? Object.keys(input) : [],
    });
  }

  /**
   * Log agent end
   */
  agentEnd(
    agent: string,
    result: { passed?: boolean; score?: number; durationMs?: number }
  ): void {
    this.info(`Agent completed: ${agent}`, { agent, ...result });
  }

  /**
   * Log agent error
   */
  agentError(agent: string, error: Error | string): void {
    this.error(`Agent failed: ${agent}`, {
      agent,
      error: error instanceof Error ? error.message : error,
    });
  }

  /**
   * Log iteration start
   */
  iterationStart(iteration: number, context?: Record<string, unknown>): void {
    this.info(`Iteration ${iteration} started`, { iteration, ...context });
  }

  /**
   * Log iteration end
   */
  iterationEnd(
    iteration: number,
    result: { passed: boolean; score: number; recommendation: string }
  ): void {
    this.info(`Iteration ${iteration} completed`, { iteration, ...result });
  }

  /**
   * Log validation error
   */
  validationError(schemaName: string, errors: unknown[]): void {
    this.error(`Validation failed for ${schemaName}`, {
      schemaName,
      errorCount: errors.length,
      errors,
    });
  }

  /**
   * Log stall detection
   */
  stallDetected(stallType: string, details: Record<string, unknown>): void {
    this.warn(`Stall detected: ${stallType}`, { stallType, ...details });
  }

  /**
   * Log checkpoint saved
   */
  checkpointSaved(traceId: string, iteration: number): void {
    this.debug(`Checkpoint saved`, { traceId, iteration });
  }
}

// Global singleton instance
export const logger = new Logger();

// Factory function for creating isolated loggers (useful for testing)
export function createLogger(): Logger {
  return new Logger();
}
