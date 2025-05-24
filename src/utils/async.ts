/**
 * Async utility functions for common patterns
 */

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exponential backoff configuration
 */
export interface BackoffConfig {
  baseDelay: number;
  maxDelay: number;
  factor: number;
  jitter: boolean;
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(
  attempt: number,
  config: Partial<BackoffConfig> = {}
): number {
  const {
    baseDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    jitter = true
  } = config;

  const exponentialDelay = Math.min(
    baseDelay * Math.pow(factor, attempt - 1),
    maxDelay
  );

  if (jitter) {
    // Add 0-10% jitter to prevent thundering herd
    const jitterAmount = exponentialDelay * 0.1 * Math.random();
    return Math.floor(exponentialDelay + jitterAmount);
  }

  return exponentialDelay;
}

/**
 * Retry configuration
 */
export interface RetryConfig<T> extends Partial<BackoffConfig> {
  maxAttempts: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig<T>
): Promise<T> {
  const { maxAttempts, shouldRetry, onRetry, ...backoffConfig } = config;
  
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        throw error;
      }

      if (shouldRetry && !shouldRetry(error, attempt)) {
        throw error;
      }

      const delay = calculateBackoffDelay(attempt, backoffConfig);
      
      if (onRetry) {
        onRetry(error, attempt, delay);
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Timeout configuration
 */
export interface TimeoutConfig {
  timeoutMs: number;
  timeoutError?: Error | (() => Error);
}

/**
 * Execute a function with timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  config: TimeoutConfig
): Promise<T> {
  const { timeoutMs, timeoutError } = config;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      const error = timeoutError instanceof Function
        ? timeoutError()
        : timeoutError || new Error(`Operation timed out after ${timeoutMs}ms`);
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}

/**
 * Execute multiple promises with concurrency limit
 */
export async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const [index, task] of tasks.entries()) {
    const promise = task().then(result => {
      results[index] = result;
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }

  await Promise.all(executing);
  return results;
}