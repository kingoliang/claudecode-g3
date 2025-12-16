/**
 * Error recovery utilities for resilient execution
 * Provides retry, fallback, and timeout mechanisms
 */
import { logger } from '../observability/logger.js';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryOn?: (error: Error) => boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

export type RetryableOperation<T> = () => Promise<T>;

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute operation with exponential backoff retry
 */
export async function withRetry<T>(
  operation: RetryableOperation<T>,
  operationName: string,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  let delay = cfg.baseDelayMs;

  for (let attempt = 1; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry this error
      if (cfg.retryOn && !cfg.retryOn(lastError)) {
        logger.error(`${operationName} failed with non-retryable error`, {
          error: lastError.message,
          attempt,
        });
        throw lastError;
      }

      logger.warn(
        `${operationName} failed (attempt ${attempt}/${cfg.maxRetries})`,
        {
          error: lastError.message,
          nextRetryMs: attempt < cfg.maxRetries ? delay : null,
        }
      );

      if (attempt < cfg.maxRetries) {
        await sleep(delay);
        delay = Math.min(delay * cfg.backoffMultiplier, cfg.maxDelayMs);
      }
    }
  }

  logger.error(`${operationName} failed after ${cfg.maxRetries} attempts`, {
    error: lastError?.message,
  });

  throw lastError;
}

/**
 * Fallback configuration
 */
export interface FallbackConfig<T> {
  primary: () => Promise<T>;
  fallback: () => Promise<T>;
  shouldFallback?: (error: Error) => boolean;
}

/**
 * Execute operation with fallback strategy
 */
export async function withFallback<T>(
  config: FallbackConfig<T>
): Promise<{ result: T; usedFallback: boolean }> {
  const shouldFallback = config.shouldFallback ?? (() => true);

  try {
    const result = await config.primary();
    return { result, usedFallback: false };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    if (shouldFallback(err)) {
      logger.warn('Primary operation failed, using fallback', {
        error: err.message,
      });
      const result = await config.fallback();
      return { result, usedFallback: true };
    }

    throw error;
  }
}

/**
 * Execute operation with timeout
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([operation, timeoutPromise]);
}

/**
 * Circuit breaker state
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts: number;
}

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenMaxAttempts: 3,
};

/**
 * Circuit breaker for preventing cascade failures
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    this.checkStateTransition();
    return this.state;
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    this.checkStateTransition();

    if (this.state === 'open') {
      throw new Error(
        `Circuit breaker is open for ${operationName}. Try again later.`
      );
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check and perform state transitions
   */
  private checkStateTransition(): void {
    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.resetTimeoutMs) {
        this.state = 'half-open';
        this.halfOpenAttempts = 0;
        logger.info('Circuit breaker transitioning to half-open');
      }
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        this.state = 'closed';
        this.failureCount = 0;
        logger.info('Circuit breaker closed after successful half-open attempts');
      }
    } else {
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.state = 'open';
      logger.warn('Circuit breaker opened from half-open state');
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      logger.warn('Circuit breaker opened due to failure threshold');
    }
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.halfOpenAttempts = 0;
  }
}

/**
 * Graceful degradation helper
 * Returns default value on error instead of throwing
 */
export async function withGracefulDegradation<T>(
  operation: () => Promise<T>,
  defaultValue: T,
  operationName: string
): Promise<{ result: T; degraded: boolean }> {
  try {
    const result = await operation();
    return { result, degraded: false };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn(`${operationName} failed, using default value`, {
      error: err.message,
    });
    return { result: defaultValue, degraded: true };
  }
}
