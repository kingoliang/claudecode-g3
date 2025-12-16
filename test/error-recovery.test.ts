import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  withRetry,
  withFallback,
  withTimeout,
  withGracefulDegradation,
  CircuitBreaker,
} from '../src/utils/error-recovery.js';

describe('Error Recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const result = await withRetry(operation, 'test-op');
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const promise = withRetry(operation, 'test-op', {
        baseDelayMs: 100,
        maxRetries: 3,
      });

      // Advance through retries
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);

      const result = await promise;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('always fails'));

      const promise = withRetry(operation, 'test-op', {
        maxRetries: 2,
        baseDelayMs: 100,
      });

      // Catch the promise early to prevent unhandled rejection
      const catchPromise = promise.catch((e) => e);

      // Advance time and wait for the promise to settle
      await vi.advanceTimersByTimeAsync(200);

      const error = await catchPromise;
      expect(error.message).toBe('always fails');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect retryOn filter', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('not retryable'));

      const promise = withRetry(operation, 'test-op', {
        maxRetries: 3,
        retryOn: (err) => err.message !== 'not retryable',
      });

      await expect(promise).rejects.toThrow('not retryable');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const promise = withRetry(operation, 'test-op', {
        baseDelayMs: 100,
        backoffMultiplier: 2,
        maxRetries: 3,
      });

      // First retry after 100ms
      await vi.advanceTimersByTimeAsync(100);
      expect(operation).toHaveBeenCalledTimes(2);

      // Second retry after 200ms (100 * 2)
      await vi.advanceTimersByTimeAsync(200);
      expect(operation).toHaveBeenCalledTimes(3);

      await expect(promise).resolves.toBe('success');
    });
  });

  describe('withFallback', () => {
    it('should use primary when successful', async () => {
      const result = await withFallback({
        primary: async () => 'primary result',
        fallback: async () => 'fallback result',
      });

      expect(result.result).toBe('primary result');
      expect(result.usedFallback).toBe(false);
    });

    it('should use fallback when primary fails', async () => {
      const result = await withFallback({
        primary: async () => {
          throw new Error('primary failed');
        },
        fallback: async () => 'fallback result',
      });

      expect(result.result).toBe('fallback result');
      expect(result.usedFallback).toBe(true);
    });

    it('should respect shouldFallback filter', async () => {
      await expect(
        withFallback({
          primary: async () => {
            throw new Error('critical error');
          },
          fallback: async () => 'fallback',
          shouldFallback: (err) => !err.message.includes('critical'),
        })
      ).rejects.toThrow('critical error');
    });
  });

  describe('withTimeout', () => {
    it('should return result if operation completes in time', async () => {
      const operation = new Promise<string>((resolve) => {
        setTimeout(() => resolve('done'), 100);
      });

      const promise = withTimeout(operation, 500, 'test-op');
      await vi.advanceTimersByTimeAsync(100);

      await expect(promise).resolves.toBe('done');
    });

    it('should throw if operation times out', async () => {
      const operation = new Promise<string>((resolve) => {
        setTimeout(() => resolve('done'), 1000);
      });

      const promise = withTimeout(operation, 500, 'test-op');

      // Catch the promise early to prevent unhandled rejection
      const catchPromise = promise.catch((e) => e);

      await vi.advanceTimersByTimeAsync(500);

      const error = await catchPromise;
      expect(error.message).toBe('test-op timed out after 500ms');

      // Clean up: advance time to let the original timeout complete
      await vi.advanceTimersByTimeAsync(500);
    });
  });

  describe('withGracefulDegradation', () => {
    it('should return result when successful', async () => {
      const result = await withGracefulDegradation(
        async () => 'real result',
        'default',
        'test-op'
      );

      expect(result.result).toBe('real result');
      expect(result.degraded).toBe(false);
    });

    it('should return default when operation fails', async () => {
      const result = await withGracefulDegradation(
        async () => {
          throw new Error('failed');
        },
        'default value',
        'test-op'
      );

      expect(result.result).toBe('default value');
      expect(result.degraded).toBe(true);
    });
  });

  describe('CircuitBreaker', () => {
    it('should start in closed state', () => {
      const breaker = new CircuitBreaker();
      expect(breaker.getState()).toBe('closed');
    });

    it('should execute operations when closed', async () => {
      const breaker = new CircuitBreaker();
      const result = await breaker.execute(async () => 'success', 'test-op');
      expect(result).toBe('success');
    });

    it('should open after failure threshold', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });

      // First failure
      await expect(
        breaker.execute(async () => {
          throw new Error('fail');
        }, 'test-op')
      ).rejects.toThrow();

      expect(breaker.getState()).toBe('closed');

      // Second failure - should open
      await expect(
        breaker.execute(async () => {
          throw new Error('fail');
        }, 'test-op')
      ).rejects.toThrow();

      expect(breaker.getState()).toBe('open');
    });

    it('should reject operations when open', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1 });

      // Trip the breaker
      await expect(
        breaker.execute(async () => {
          throw new Error('fail');
        }, 'test-op')
      ).rejects.toThrow();

      // Should reject immediately
      await expect(
        breaker.execute(async () => 'success', 'test-op')
      ).rejects.toThrow('Circuit breaker is open');
    });

    it('should transition to half-open after reset timeout', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeoutMs: 1000,
      });

      // Trip the breaker
      await expect(
        breaker.execute(async () => {
          throw new Error('fail');
        }, 'test-op')
      ).rejects.toThrow();

      expect(breaker.getState()).toBe('open');

      // Advance time past reset timeout
      await vi.advanceTimersByTimeAsync(1000);

      expect(breaker.getState()).toBe('half-open');
    });

    it('should close after successful half-open attempts', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeoutMs: 1000,
        halfOpenMaxAttempts: 2,
      });

      // Trip the breaker
      await expect(
        breaker.execute(async () => {
          throw new Error('fail');
        }, 'test-op')
      ).rejects.toThrow();

      // Advance to half-open
      await vi.advanceTimersByTimeAsync(1000);
      expect(breaker.getState()).toBe('half-open');

      // Successful attempts
      await breaker.execute(async () => 'success', 'test-op');
      await breaker.execute(async () => 'success', 'test-op');

      expect(breaker.getState()).toBe('closed');
    });

    it('should re-open on failure in half-open state', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeoutMs: 1000,
      });

      // Trip the breaker
      await expect(
        breaker.execute(async () => {
          throw new Error('fail');
        }, 'test-op')
      ).rejects.toThrow();

      // Advance to half-open
      await vi.advanceTimersByTimeAsync(1000);
      expect(breaker.getState()).toBe('half-open');

      // Fail in half-open
      await expect(
        breaker.execute(async () => {
          throw new Error('fail again');
        }, 'test-op')
      ).rejects.toThrow();

      expect(breaker.getState()).toBe('open');
    });

    it('should reset to closed state', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1 });

      // Trip the breaker
      await expect(
        breaker.execute(async () => {
          throw new Error('fail');
        }, 'test-op')
      ).rejects.toThrow();

      expect(breaker.getState()).toBe('open');

      breaker.reset();
      expect(breaker.getState()).toBe('closed');
    });
  });
});
